// iPadApp.swift - run PDFKitBench on the iPad itself, via Swift Playgrounds.
//
// In Swift Playgrounds on the iPad: New App, delete the template's
// MyApp.swift / ContentView.swift, add this file and PDFKitBench.swift,
// then run. Copy the PDF and its .json manifest to the iPad (AirDrop or
// Files), tap "Choose files", select both, and wait. Share the CSV back to
// the Mac and append it to results.csv (report.py reads it as-is).
//
// Keep the iPad plugged in and on its own screen while it runs; the app
// holds off auto-lock, and a backgrounded app is throttled.

import SwiftUI
import UIKit
import UniformTypeIdentifiers

@main
struct PDFBenchApp: App {
    var body: some Scene {
        WindowGroup { ContentView() }
    }
}

final class Runner: ObservableObject, @unchecked Sendable {
    @Published var log = "Choose the PDF and its .json manifest (select both).\n"
    @Published var csv = ""
    @Published var running = false

    func start(_ urls: [URL], reps: Int) {
        guard let picked = urls.first(where: { $0.pathExtension.lowercased() == "pdf" }) else {
            log = "No PDF in the selection.\n"
            return
        }
        let pickedManifest = urls.first(where: { $0.pathExtension.lowercased() == "json" })
        running = true
        csv = ""
        log = "Copying \(picked.lastPathComponent)...\n"
        UIApplication.shared.isIdleTimerDisabled = true
        DispatchQueue.global(qos: .userInitiated).async {
            // Work on a local copy, so file coordination isn't in the timings.
            let dir = FileManager.default.temporaryDirectory
            func local(_ url: URL) -> URL? {
                let ok = url.startAccessingSecurityScopedResource()
                defer { if ok { url.stopAccessingSecurityScopedResource() } }
                let dest = dir.appendingPathComponent(url.lastPathComponent)
                try? FileManager.default.removeItem(at: dest)
                return (try? FileManager.default.copyItem(at: url, to: dest)) != nil ? dest : nil
            }
            guard let pdf = local(picked) else {
                self.finish("Could not copy the PDF.\n", csv: "")
                return
            }
            let manifest = pickedManifest.flatMap(local)
            var options = BenchOptions()
            options.reps = reps
            let bench = PDFKitBench(pdf: pdf, manifest: manifest, options: options)
            self.append(manifest == nil ? "No manifest: using page 1 and the page centre.\n" : "Running...\n")
            bench.run { line in self.append(line + "\n") }
            self.finish(bench.summary() + "\n", csv: bench.csv(header: true))
        }
    }

    func append(_ text: String) {
        DispatchQueue.main.async { self.log += text }
    }

    func finish(_ text: String, csv: String) {
        DispatchQueue.main.async {
            self.log += text
            self.csv = csv
            self.running = false
            UIApplication.shared.isIdleTimerDisabled = false
        }
    }
}

struct ContentView: View {
    @StateObject private var runner = Runner()
    @State private var picking = false
    @State private var reps = 5

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 16) {
                HStack(spacing: 20) {
                    Button("Choose files") { picking = true }
                        .buttonStyle(.borderedProminent)
                        .disabled(runner.running)
                    Stepper("Reps: \(reps)", value: $reps, in: 1...20)
                        .frame(maxWidth: 200)
                    Spacer()
                    if !runner.csv.isEmpty {
                        ShareLink(item: runner.csv, preview: SharePreview("pdfkit-results.csv"))
                    }
                }
                ScrollView {
                    Text(runner.log + (runner.csv.isEmpty ? "" : "\n" + runner.csv))
                        .font(.system(.footnote, design: .monospaced))
                        .textSelection(.enabled)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            .padding()
            .navigationTitle("PDFKit bench")
        }
        .fileImporter(isPresented: $picking, allowedContentTypes: [.pdf, .json],
                      allowsMultipleSelection: true) { result in
            if case .success(let urls) = result { runner.start(urls, reps: reps) }
        }
    }
}
