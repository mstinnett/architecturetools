# pdf-bench — how fast is each PDF app on a heavy drawing set?

A harness for timing construction-PDF apps (PolyPDF, Bluebeam Revu, Drawboard,
Acrobat, PDF Expert, Preview, browser viewers) on one complex sheet and on a
large set, on **Windows, macOS and iPadOS**. Results from every device land
in one CSV format and pool into one table.

It answers two questions per platform:

1. **How fast can it be?** The engine floor. An app is never faster than the
   PDF engine it draws with. `engines.py` times PDFium, MuPDF and Poppler
   headless. `pdfkit/` times Apple's PDFKit, the engine under Preview, Safari
   and most iPad PDF apps, on the Mac and on the iPad itself.
2. **How fast is it for a user?** Input to *fully sharp*, measured from the
   screen, so any app can be timed, including closed iPad apps. `drive.py`
   drives desktop apps and watches live. `settle.py` reads a screen recording
   from any device.

Comparing the two layers tells you where the time goes. If PolyPDF on an iPad
takes about as long as bare PDFKit on that iPad, the engine is the ceiling, and
an app on a faster engine would beat it on the same hardware. If PolyPDF takes
several times longer, the app is adding the delay (for example layer
processing, thumbnails, or its line detection if that runs on open).

```
make_set.py ──► complex-sheet.pdf / drawing-set.pdf  (+ .json manifest, same bytes everywhere)
                    │
     ┌──────────────┼───────────────────────────────┐
 engines.py     pdfkit/ (Mac CLI, iPad app)     drive.py (Win/Mac, live)   settle.py (any recording)
     └──────────────┴──────────────┬────────────────┴──────────────────────┘
                               results.csv  ──►  report.py  ──►  one table per test file
```

## 1. The test file

```sh
python3 make_set.py --preset sheet     # complex-sheet.pdf: 1 sheet, ~13 MB
python3 make_set.py --preset set       # drawing-set.pdf: 120 sheets, ~75 MB, ~12M path segments
```

Standard library only, deterministic from `--seed`. Sheets are ARCH E1 (42×30
in). Each one carries the features that make real CD sets slow:

- hatch exported as loose segments (wall poché, brick, earth, stipple dots);
- fill patterns drawn through clip paths, including even-odd holes;
- CAD text both as exploded strokes and as a Type 3 stroke font;
- Helvetica schedules, so search has work to do;
- 25 AutoCAD-style optional-content layers;
- reused Form XObject blocks: title block, furniture, light fixtures, trees;
- a 3600×2400 aerial underlay and an indexed-colour rendering;
- alpha shadows and an axial shading;
- dashed linetypes and hairlines;
- Bluebeam-style markups with appearance streams (clouds, callouts, arrows, ink, rectangles);
- sheet-to-sheet links, bookmarks by discipline, and page labels (`A-101`…).

The set mixes cover, site, plans, elevations, sections, details, schedules and
RCP/MEP plans, and about one sheet in twelve is "heavy". `--sheets` and `--density`
scale it up.

**Generate once and copy the same file to every device.** The `.json` manifest
records the SHA-256, a content fingerprint, per-sheet counts, the test sheet
(the heaviest), the zoom focus point and the search target (`HW-SET 47B`).
Every result row carries the fingerprint, so mismatched files can't be pooled
by accident. On the iPad, copy the manifest across too: the PDFKit app reads it.

## 2. What is measured

| step | engines (`engines.py`, PDFKit) | apps (`drive.py`, `settle.py`) |
|---|---|---|
| `open` | parse + page count | launch/open until the first sheet is fully drawn |
| `jump` | — | go to the test sheet (bookmark, thumbnail or page box) |
| `fit` | render the test sheet to fit a 2560×1600 view | fit the sheet; input to fully sharp |
| `zoom` | render a 2560×1600 view at 400% of fit, on the dense area | zoom to 400% of fit; input to fully sharp |
| `pan` | — | drag across the zoomed sheet: frames per second while moving, then time to sharp after the drag stops |
| `flip` | render every sheet at fit, one at a time | next sheet; time per sheet |
| `thumbs` | every sheet at 256 px | — |
| `search` | find the target across the set | type the target; time to land on it |

For apps, two times are recorded per input: **response** (the first frame that
changed) and **settle** (the last frame that changed before the screen went
still, i.e. fully sharp). Settle is the headline number because progressive
renderers show a blurry sheet early and sharpen later. Engine numbers are
single-threaded renders. Apps that tile across cores can beat them, so
compare engines with engines and apps with apps.

**Zoom must mean the same thing everywhere.** "400%" in an app's zoom box is
400% of actual size, which on an E1 sheet is about 16× fit. The protocol zooms
to 4× the app's own fit percentage. Fit the sheet, read the zoom box (say
24%), and zoom to 96%. `drive.py --fit-pct 24` does the arithmetic.

## 3. Setup

```sh
pip install numpy pillow pypdfium2 pymupdf      # engines + analysis, all platforms
pip install mss pyautogui                        # drive.py (Windows, macOS)
# ffmpeg 5.1+ on PATH for settle.py; poppler (pdftoppm) optional
python3 test_bench.py                            # checks the harness itself
```

## 4. Per platform

### Windows

```sh
python engines.py drawing-set.pdf --device "ThinkPad P1 G7"
python engines.py complex-sheet.pdf --device "ThinkPad P1 G7" --save renders   # check the PNGs
python drive.py --list
python drive.py --profile acrobat-win --file drawing-set.pdf \
    --steps open,jump,fit,zoom,pan,fit,flip*10,search --reps 5 --fit-pct 24 --shots shots
```

Profiles in `apps.json` are key recipes per app. Only `chromium-linux` has been
checked (see §7). The Windows and Mac entries are best guesses marked
`"verified": false`, and Bluebeam and Drawboard still need their keys filled
in. Watch one rep with `--shots` and fix the recipe before trusting the
numbers. For any app without a reliable recipe, record the screen with OBS
(display capture + mic) and use `settle.py` as for the iPad.

### macOS

```sh
python3 engines.py drawing-set.pdf --device "MacBook Pro M4 Pro"
swiftc -O pdfkit/PDFKitBench.swift pdfkit/main.swift -o pdfkit-bench
./pdfkit-bench drawing-set.pdf --out results.csv --device "MacBook Pro M4 Pro"
python3 drive.py --profile preview-mac --file drawing-set.pdf --steps jump,fit,zoom,pan,fit,flip*10 --fit-pct 24
```

Allow Terminal under Privacy & Security → Accessibility and → Screen Recording.
Many iPad apps also run on Apple-silicon Macs ("Designed for iPad"). That gives a
quick driver-based number but says nothing about iPad hardware.

### iPadOS

**Engine floor, on the iPad:** in Swift Playgrounds, create an App, replace its
files with `pdfkit/PDFKitBench.swift` + `pdfkit/iPadApp.swift`, and run it. Pick
the PDF and its `.json` together, wait, then share the CSV back.

**Apps, by screen recording:** nothing can drive an iPad app from outside, so
the input marks come from the recording's microphone.

1. Copy the PDF to the iPad and import it into each app. Use Do Not Disturb,
   keep the iPad plugged in, turn Low Power Mode off, and close other apps.
   Settings → Sounds → Keyboard Clicks on, so typing is audible.
2. Control Center → long-press Screen Recording → **Microphone On** → record.
3. Do each step as one input, then wait until the sheet is fully sharp **and
   three more seconds**:
   - `open`: tap the file in the app's library;
   - `jump`: tap the test sheet's thumbnail or bookmark;
   - `fit` / `zoom`: double-tap, or tap the app's zoom control;
   - `pan`: tap the bezel with a fingernail, then swipe;
   - `flip`: tap next page;
   - `search`: type the target.

   Make every touch a firm fingernail tap on the glass. The tap is the clock
   start. Two taps under 0.5 s apart (a double-tap) count as one input. Don't
   talk.
4. AirDrop the video to a computer:

```sh
python3 settle.py polypdf.mov --steps open,jump,fit,zoom,pan,fit,flip*10,search \
    --tool PolyPDF --tool-version 2.1 --device "iPad Pro 13 M4" --platform iPadOS \
    --file drawing-set.pdf --roi 0,0.07,1,0.93 --plot polypdf.png --frames polypdf-frames
```

`--roi` is the drawing canvas as `x,y,w,h` fractions from the top-left. Exclude
the status bar clock and any spinner. Open the `--plot` timeline: blue lines
are inputs, green are "fully sharp", and orange means the screen was still
changing when the next input came (that number is a lower bound, so redo the
step and wait longer). If a mark is wrong (a bump, a cough), edit
`polypdf.marks.csv` and rerun with `--marks polypdf.marks.csv`. `--frames`
saves the response and settle frames for each step. Look at them: "settled"
should mean sharp.

## 5. Protocol (keep it fair)

- **Same bytes:** check the fingerprint column. **Same sheet, same view:**
  maximised window, single-page mode, markups and all layers visible, iPad in
  landscape.
- **Five reps per step.** Report the median and the 90th percentile. A cold
  `open` (app quit first; on iPad, swipe it away) is reported separately from
  warm runs.
- **Power and heat:** plugged in, best-performance power mode, Low Power Mode
  off. Pause between apps so the device cools; long iPad runs throttle.
- **Record app versions and settings** (hardware acceleration, render
  quality, PolyPDF's line detection). If a setting could plausibly matter,
  measure both ways.
- **Desktop recordings work too:** OBS or QuickTime with the mic on (a
  mechanical keyboard helps). `drive.py` is the easy path; a recording is the
  check on it.

## 6. Results

```sh
python3 report.py results.csv ipad-*.csv --md report.md
```

There is one table per test file. Rows are tool · method · device, columns are
steps, and each cell is the median (90th percentile). For app rows it also
lists who is fastest per step and how many times slower the slowest is. `†`
marks a cell that includes a lower bound.

The CSV is long format, one measurement per row: `run_id, date, platform,
os_version, device, cpu, ram_gb, method, tool, tool_version, file, fingerprint,
step, page, rep, metric, value, unit, notes`. `method` is `engine`, `live` or
`video`. `metric` is `time`, `total`, `response`, `settle`, `fps`,
`sharp_after_stop` or `peak_rss`.

## 7. What has and hasn't been verified

- **Checked in a Linux container:**
  - `make_set.py` is deterministic, and PDFium, MuPDF and Poppler all render
    its output with the same content.
  - `engines.py` runs on all three engines.
  - `settle.py` recovers known timings within one frame from synthetic
    constant- and variable-frame-rate recordings (`test_bench.py`, 65 checks).
    Those recordings include encoder noise, a frozen app, a cut-off step and a
    double-tap.
  - `drive.py` ran end to end against Chromium's PDF viewer under Xvfb.
- **Not run here:**
  - the Swift PDFKit bench (no Apple toolchain in the container);
  - `drive.py` on Windows or macOS;
  - the Windows and Mac app recipes in `apps.json`;
  - a real iPad recording.

  Do a short shakedown run on each before collecting numbers.
- **Accuracy:**
  - Recordings resolve to one frame, about 17 ms at 60 fps. Audio/video
    alignment adds a few tens of ms.
  - Live capture resolves to one capture interval, about 20–50 ms.
  - Both are small next to multi-second renders, but don't read meaning into
    differences under ~100 ms.
  - Live capture caps the pan frame rate at the capture rate. Use a 60 fps
    recording for smoothness.
  - Engines differ in drawing style (PDFium draws hairlines heavier). Use
    `engines.py --save` to confirm content parity.

## Files

| file | what |
|---|---|
| `make_set.py` | the test sheet / set generator (stdlib only) |
| `engines.py` | PDFium / MuPDF / Poppler timings |
| `pdfkit/PDFKitBench.swift` | PDFKit timings, shared by the Mac CLI (`main.swift`) and the iPad app (`iPadApp.swift`) |
| `drive.py` + `apps.json` | live desktop driver and per-app input recipes |
| `settle.py` | timings from a screen recording (any platform) |
| `common.py` | steps, view geometry, device info, the results format |
| `report.py` | pools CSVs into the comparison table |
| `test_bench.py` | the harness's own checks |
