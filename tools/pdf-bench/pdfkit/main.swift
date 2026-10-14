// main.swift - the macOS command line for PDFKitBench.
//
//   cd tools/pdf-bench
//   swiftc -O pdfkit/PDFKitBench.swift pdfkit/main.swift -o pdfkit-bench
//   ./pdfkit-bench drawing-set.pdf --reps 5 --out results.csv
//
// Options mirror engines.py: --steps, --reps, --view WxH, --device, --out.
// The manifest (<file>.json) is picked up automatically when it sits beside
// the PDF.

import CoreGraphics
import Foundation

func fail(_ message: String) -> Never {
    FileHandle.standardError.write((message + "\n").data(using: .utf8)!)
    exit(2)
}

var options = BenchOptions()
var outPath = "results.csv"
var pdfPath: String?
var args = Array(CommandLine.arguments.dropFirst())
while !args.isEmpty {
    let arg = args.removeFirst()
    func value() -> String {
        guard !args.isEmpty else { fail("\(arg) needs a value") }
        return args.removeFirst()
    }
    switch arg {
    case "--reps": options.reps = Int(value()) ?? options.reps
    case "--steps": options.steps = Set(value().split(separator: ",").map(String.init))
    case "--view":
        let parts = value().lowercased().split(separator: "x").compactMap { Double($0) }
        guard parts.count == 2 else { fail("--view takes WIDTHxHEIGHT, e.g. 2560x1600") }
        options.view = CGSize(width: parts[0], height: parts[1])
    case "--device": options.device = value()
    case "--out": outPath = value()
    case "-h", "--help":
        print("usage: pdfkit-bench FILE.pdf [--steps open,fit,zoom,flip,thumbs,search] [--reps 5] "
              + "[--view 2560x1600] [--device LABEL] [--out results.csv]")
        exit(0)
    default:
        if arg.hasPrefix("-") { fail("unknown option \(arg)") }
        pdfPath = arg
    }
}
guard let pdfPath = pdfPath else { fail("usage: pdfkit-bench FILE.pdf [options]  (--help for more)") }

let pdf = URL(fileURLWithPath: pdfPath)
let manifestURL = URL(fileURLWithPath: pdfPath + ".json")
let hasManifest = FileManager.default.fileExists(atPath: manifestURL.path)
if !hasManifest { print("note: no \(manifestURL.lastPathComponent); using page 1 and the page centre") }

print("pdfkit-bench: \(pdf.lastPathComponent)")
let bench = PDFKitBench(pdf: pdf, manifest: hasManifest ? manifestURL : nil, options: options)
bench.run { print("  " + $0) }

let fm = FileManager.default
let needsHeader = !fm.fileExists(atPath: outPath) || ((try? fm.attributesOfItem(atPath: outPath)[.size] as? Int) ?? 0) == 0
let text = bench.csv(header: needsHeader)
if needsHeader {
    fm.createFile(atPath: outPath, contents: text.data(using: .utf8))
} else if let handle = FileHandle(forWritingAtPath: outPath) {
    handle.seekToEndOfFile()
    handle.write(text.data(using: .utf8)!)
    handle.closeFile()
}
print(bench.summary())
print("rows appended to \(outPath)")
