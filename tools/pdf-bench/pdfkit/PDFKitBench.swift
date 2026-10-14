// PDFKitBench.swift - engines.py's steps, run on Apple's PDFKit.
//
// PDFKit (drawing through Core Graphics) is the engine behind Preview,
// Safari and most iPad PDF apps that don't ship their own. Timing it on the
// iPad itself gives the floor under any PDFKit-based app there; timing it on
// a Mac lines it up against PDFium and MuPDF on the same hardware.
//
// Platform-neutral: the same file builds into the macOS command-line tool
// (main.swift) and the iPad app (iPadApp.swift, via Swift Playgrounds).
// Output rows match common.RESULT_FIELDS, so report.py pools them.

import CoreGraphics
import Foundation
import PDFKit

public struct BenchOptions {
    public var steps: Set<String> = ["open", "fit", "zoom", "flip", "thumbs", "search"]
    public var reps = 5
    public var view = CGSize(width: 2560, height: 1600)
    public var zoom: CGFloat = 4.0
    public var thumbWidth: CGFloat = 256
    public var device: String? = nil
    public init() {}
}

public struct BenchRow {
    public let step, metric: String
    public let value: Double
    public let unit, page, rep, notes: String
}

/// What make_set.py wrote next to the PDF: the test page, its zoom focus,
/// the search target and the content fingerprint.
struct Manifest {
    let fingerprint: String
    let labels: [String]
    let testPage: Int
    let focus: CGPoint
    let search: String

    init?(url: URL?) {
        guard let url = url, let data = try? Data(contentsOf: url),
              let root = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
              let pages = root["pages"] as? [[String: Any]] else { return nil }
        fingerprint = String(((root["content_fingerprint"] as? String) ?? "").prefix(16))
        labels = pages.map { ($0["label"] as? String) ?? "" }
        // The heaviest sheet: make_set.py records it; older manifests are
        // weighed the way common.test_page() weighs them.
        func weight(_ p: [String: Any]) -> Int {
            ((p["segments"] as? Int) ?? 0) + 20 * ((p["xobject_draws"] as? Int) ?? 0)
        }
        let heaviest = (root["test_page"] as? Int)
            ?? pages.indices.max { weight(pages[$0]) < weight(pages[$1]) } ?? 0
        testPage = heaviest
        let f = (pages[heaviest]["focus"] as? [Double]) ?? [0, 0]
        focus = CGPoint(x: f[0], y: f[1])
        search = ((root["search"] as? [String: Any])?["text"] as? String) ?? "HW-SET 47B"
    }
}

public final class PDFKitBench {
    let url: URL
    let options: BenchOptions
    let manifest: Manifest?
    public private(set) var rows: [BenchRow] = []

    public init(pdf: URL, manifest: URL?, options: BenchOptions) {
        self.url = pdf
        self.options = options
        self.manifest = Manifest(url: manifest)
    }

    static func now() -> Double { Double(DispatchTime.now().uptimeNanoseconds) / 1e6 }

    func timed(_ body: () -> Void) -> Double {
        let t = PDFKitBench.now()
        body()
        return PDFKitBench.now() - t
    }

    func emit(_ step: String, _ metric: String, _ value: Double, unit: String = "ms",
              page: String = "", rep: Int? = nil, notes: String = "") {
        rows.append(BenchRow(step: step, metric: metric, value: value, unit: unit, page: page,
                             rep: rep.map(String.init) ?? "", notes: notes))
    }

    /// Draw `rect` of the page (PDF points; nil = whole page) into a fresh
    /// RGBA bitmap at `scale` pixels per point. Synchronous, CPU, one thread.
    func render(_ page: PDFPage, scale: CGFloat, rect: CGRect?) {
        let box = page.bounds(for: .mediaBox)
        let area = rect ?? box
        let w = max(1, Int((area.width * scale).rounded())), h = max(1, Int((area.height * scale).rounded()))
        guard let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0,
                                  space: CGColorSpaceCreateDeviceRGB(),
                                  bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return }
        ctx.setFillColor(red: 1, green: 1, blue: 1, alpha: 1)
        ctx.fill(CGRect(x: 0, y: 0, width: w, height: h))
        ctx.scaleBy(x: scale, y: scale)
        ctx.translateBy(x: box.minX - area.minX, y: box.minY - area.minY)
        page.displaysAnnotations = true
        page.draw(with: .mediaBox, to: ctx)
        _ = ctx.makeImage()          // make sure nothing is left deferred
    }

    func fitScale(_ size: CGSize) -> CGFloat {
        min(options.view.width / size.width, options.view.height / size.height)
    }

    func label(_ i: Int) -> String {
        if let m = manifest, i < m.labels.count { return m.labels[i] }
        return String(i + 1)
    }

    /// Runs every requested step; `log` gets one line per finished step.
    public func run(log: (String) -> Void) {
        let o = options
        if o.steps.contains("open") {
            for rep in 0..<o.reps {
                var count = 0
                let ms = timed { count = PDFDocument(url: url)?.pageCount ?? 0 }
                emit("open", "time", ms, rep: rep, notes: "parse + page count (\(count))")
            }
            log("open done")
        }
        guard let doc = PDFDocument(url: url), doc.pageCount > 0 else { log("cannot open \(url.path)"); return }
        let n = doc.pageCount
        let pageIndex = min(manifest?.testPage ?? 0, n - 1)
        let size = doc.page(at: pageIndex)!.bounds(for: .mediaBox).size
        let fit = fitScale(size)

        if o.steps.contains("fit") {
            for rep in 0..<o.reps {
                // A fresh document each rep, so the page is parsed again.
                guard let page = PDFDocument(url: url)?.page(at: pageIndex) else { break }
                let ms = timed { render(page, scale: fit, rect: nil) }
                emit("fit", "time", ms, page: label(pageIndex), rep: rep,
                     notes: "\(Int(size.width * fit))x\(Int(size.height * fit)) px")
            }
            log("fit done")
        }
        if o.steps.contains("zoom") {
            // Same geometry as common.zoom_rect().
            let s = fit * o.zoom
            let w = o.view.width / s, h = o.view.height / s
            let focus = manifest?.focus ?? CGPoint(x: size.width / 2, y: size.height / 2)
            let x0 = min(max(focus.x - w / 2, 0), size.width - w)
            let y0 = min(max(focus.y - h / 2, 0), size.height - h)
            for rep in 0..<o.reps {
                guard let page = PDFDocument(url: url)?.page(at: pageIndex) else { break }
                let ms = timed { render(page, scale: s, rect: CGRect(x: x0, y: y0, width: w, height: h)) }
                emit("zoom", "time", ms, page: label(pageIndex), rep: rep,
                     notes: "\(Int(o.view.width))x\(Int(o.view.height)) px at \(Int(o.zoom * 100))% of fit")
            }
            log("zoom done")
        }
        if o.steps.contains("flip") && n > 1 {
            var total = 0.0
            for i in 0..<n {
                guard let page = doc.page(at: i) else { continue }
                let ms = timed { render(page, scale: fitScale(page.bounds(for: .mediaBox).size), rect: nil) }
                total += ms
                emit("flip", "time", ms, page: label(i))
            }
            emit("flip", "total", total, notes: "\(n) sheets at fit")
            log("flip done")
        }
        if o.steps.contains("thumbs") && n > 1 {
            let ms = timed {
                for i in 0..<n {
                    guard let page = doc.page(at: i) else { continue }
                    render(page, scale: o.thumbWidth / page.bounds(for: .mediaBox).width, rect: nil)
                }
            }
            emit("thumbs", "total", ms, notes: "\(n) sheets at \(Int(o.thumbWidth)) px wide")
            log("thumbs done")
        }
        if o.steps.contains("search") {
            let target = manifest?.search ?? "HW-SET 47B"
            var hits = 0
            let ms = timed { hits = doc.findString(target, withOptions: []).count }
            emit("search", "total", ms, notes: "\(hits) hit(s) for '\(target)'")
            log("search done")
        }
        if let mb = peakResidentMB() {
            emit("all", "peak_rss", mb, unit: "MB")
        }
    }

    // MARK: - results

    public static let fields = ["run_id", "date", "platform", "os_version", "device", "cpu", "ram_gb",
                                "method", "tool", "tool_version", "file", "fingerprint",
                                "step", "page", "rep", "metric", "value", "unit", "notes"]

    /// CSV text: a header (if asked) plus one line per row.
    public func csv(header: Bool) -> String {
        let info = DeviceInfo.current(label: options.device)
        let date: String = {
            let f = DateFormatter()
            f.dateFormat = "yyyy-MM-dd HH:mm"
            return f.string(from: Date())
        }()
        let runID = String(UUID().uuidString.lowercased().prefix(8))
        let base = [runID, date, info.platform, info.osVersion, info.device, info.cpu, info.ramGB,
                    "engine", "pdfkit", "PDFKit (\(info.osVersion))", url.lastPathComponent, manifest?.fingerprint ?? ""]
        var lines: [String] = header ? [PDFKitBench.fields.joined(separator: ",")] : []
        for r in rows {
            let cells = base + [r.step, r.page, r.rep, r.metric, String(format: "%.1f", r.value), r.unit, r.notes]
            lines.append(cells.map(csvEscape).joined(separator: ","))
        }
        return lines.joined(separator: "\n") + "\n"
    }

    public func summary() -> String {
        var byStep: [String: [Double]] = [:]
        var order: [String] = []
        for r in rows where r.metric != "peak_rss" {
            let key = r.metric == "total" ? "\(r.step) total" : r.step
            if byStep[key] == nil { order.append(key) }
            byStep[key, default: []].append(r.value)
        }
        var parts = order.map { key -> String in
            let v = byStep[key]!.sorted()
            return "\(key) \(String(format: "%.0f", v[v.count / 2])) ms"
        }
        if let mem = rows.first(where: { $0.metric == "peak_rss" }) {
            parts.append(String(format: "peak %.0f MB", mem.value))
        }
        return "pdfkit  " + parts.joined(separator: " | ")
    }
}

func csvEscape(_ s: String) -> String {
    s.contains(",") || s.contains("\"") || s.contains("\n") ? "\"" + s.replacingOccurrences(of: "\"", with: "\"\"") + "\"" : s
}

// MARK: - device and memory

struct DeviceInfo {
    let platform, osVersion, device, cpu, ramGB: String

    static func sysctl(_ name: String) -> String? {
        var size = 0
        guard sysctlbyname(name, nil, &size, nil, 0) == 0, size > 0 else { return nil }
        var buffer = [CChar](repeating: 0, count: size)
        guard sysctlbyname(name, &buffer, &size, nil, 0) == 0 else { return nil }
        return String(cString: buffer)
    }

    static func current(label: String?) -> DeviceInfo {
        let v = ProcessInfo.processInfo.operatingSystemVersion
        let version = "\(v.majorVersion).\(v.minorVersion).\(v.patchVersion)"
        let ram = String(format: "%.0f", Double(ProcessInfo.processInfo.physicalMemory) / 1_073_741_824)
        #if os(macOS)
        return DeviceInfo(platform: "macOS", osVersion: "macOS " + version,
                          device: label ?? sysctl("hw.model") ?? "Mac",
                          cpu: sysctl("machdep.cpu.brand_string") ?? "", ramGB: ram)
        #else
        // hw.machine is the model identifier, e.g. iPad16,6.
        return DeviceInfo(platform: "iPadOS", osVersion: "iPadOS " + version,
                          device: label ?? sysctl("hw.machine") ?? "iPad",
                          cpu: sysctl("hw.machine") ?? "", ramGB: ram)
        #endif
    }
}

/// Peak resident memory of this process, from the Mach task info.
func peakResidentMB() -> Double? {
    var info = mach_task_basic_info()
    var count = mach_msg_type_number_t(MemoryLayout<mach_task_basic_info>.size / MemoryLayout<natural_t>.size)
    let kr = withUnsafeMutablePointer(to: &info) {
        $0.withMemoryRebound(to: integer_t.self, capacity: Int(count)) {
            task_info(mach_task_self_, task_flavor_t(MACH_TASK_BASIC_INFO), $0, &count)
        }
    }
    return kr == KERN_SUCCESS ? Double(info.resident_size_max) / 1_048_576 : nil
}
