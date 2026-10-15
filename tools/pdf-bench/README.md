# pdf-bench — page-load times, PolyPDF vs Drawboard vs the rest

A harness for comparing construction-PDF apps the way users experience them:
**how long from my tap until the sheet is fully sharp?** It works on PolyPDF,
Drawboard, Bluebeam Revu, Acrobat, PDF Expert, Preview and browser viewers, on
**iPadOS, Windows and macOS**.

Every app is treated as a black box. Each one has its own engine, caching,
prefetching, tiling and progressive rendering, so nothing inside the app is
measured. The harness only watches the screen. The clock starts at the input
(a tap, click or key) and stops when the screen stops changing, which is when
the last sharp tile has landed. The result is the whole app, the time a user
actually waits.

```
make_set.py ──► drawing-set.pdf (+ manifest)        same bytes on every device
runcard.py  ──► the steps a tester follows           same sheets, same order, every app
        record the screen (mic on) ─► settle.py ┐
        or, on a desktop:          drive.py    ├─► results.csv ─► report.py
                                                ┘   apps ranked per device
```

## What is measured

| measure | what the tester does | what it shows |
|---|---|---|
| **open** | tap the file, app freshly launched | time to first sheet fully sharp, including launch and parse |
| **first open** | the same, the first time the app sees the file | any indexing or thumbnailing the app does up front |
| **next sheet** | ten times, sheet by sheet | sequential paging (prefetching apps get credit for it, as they should) |
| **jump** | to five far-apart sheets the app hasn't shown yet | **raw page load**: nothing can have been prefetched |
| **revisit** | back to three of those sheets | caching: does a seen sheet come back instantly? |
| zoom, pan, search | optional | re-render after zoom; sharpness after a drag; find across the set |

Each cell in the report is a median (with p90 and sample count) over five
recordings. Apps are ranked only against other apps **on the same device**,
as a multiple of the fastest.

## 1. Make the test file and the run card

```sh
python3 make_set.py --preset set       # drawing-set.pdf: 120 sheets, 75 MB, ~12M vector segments
python3 runcard.py drawing-set.pdf     # the tester's step list (add --desktop for click/key wording)
```

The set is ARCH E1 sheets with the things that make real CD sets slow:

- exploded hatch, clipped fills and CAD-style text;
- 25 layers and reused blocks;
- an aerial underlay and transparency;
- markups with appearance streams;
- bookmarks, page labels and sheet links.

It mixes cover, site, plans, elevations, sections, details, schedules and
RCP/MEP sheets, and about one in twelve is heavy. It is deterministic. Generate
it once and copy the same file to every device; results carry a fingerprint,
so different files never get pooled.

The run card names the exact sheets. A tester opens the file, flips through
the first ten sheets, jumps to five far-off ones (M-110, A-302, A-703, A-112,
A-513), then revisits three of them. `--steps` changes the sequence (e.g.
`open,flip*20,jump*5,revisit*5`).

Your own drawing sets work too: `settle.py` doesn't need a manifest. Write the
step list by hand and pass it with `--steps`. A real project set next to the
synthetic one is worth having.

## 2. iPad (PolyPDF, Drawboard, Bluebeam, PDF Expert…)

Nothing can drive an iPad app from outside, so record the screen. The
recording's microphone hears each tap, and those taps are the clock starts.

1. Copy the PDF to the iPad (AirDrop → Files) and import it into each app.
2. Turn on Do Not Disturb, plug in, turn Low Power Mode off, and close other
   apps. Settings → Sounds → Keyboard Clicks on. Use landscape.
3. Force-quit the app. Control Center → long-press Screen Recording →
   **Microphone On** → start.
4. Follow the run card: **one firm fingernail tap per step**. Do anything else
   you touch along the way (scrolling thumbnails, opening the bookmark panel)
   quietly, with the pad of a finger. After each step, wait until the sheet is
   fully sharp, then count three more seconds. Don't talk.
5. Stop. Make five recordings per app. Recording 1 is the first time the app
   sees the file.
6. AirDrop the videos to a computer with ffmpeg and run the command the card
   prints:

```sh
python3 settle.py polypdf-1.mov --steps open,flip*10,jump*5,revisit*3 --rep 1 \
    --tool PolyPDF --tool-version 2.1 --device "iPad Pro 13 M4" --platform iPadOS \
    --file drawing-set.pdf --roi 0,0.07,1,0.93 --plot polypdf-1.png
```

`--roi` is the drawing canvas as `x,y,w,h` fractions from the top-left. Leave
out the status-bar clock and any spinner, or the screen never looks still.
Check the plot: one blue line per tap and a green line where the sheet went
sharp. Orange means it was still changing at the next tap; that number is a
lower bound, so redo that step with a longer wait. A stray mark (a bump, a
cough)? Edit `polypdf-1.marks.csv` and rerun with `--marks polypdf-1.marks.csv`.
`--frames DIR` saves the frame at each response and settle point, so you can
confirm "settled" means sharp.

## 3. Windows and macOS (Drawboard, Bluebeam, Acrobat, Preview…)

**Either** record exactly as on the iPad. Use OBS, QuickTime or Win+Alt+R with
the mic on: a mechanical keyboard's clicks make good marks. Use
`runcard.py --desktop` and `settle.py --platform Windows`.

**Or** let `drive.py` do the inputs and watch the screen live. It is the same
detector and the same numbers, with five reps and no human timing:

```sh
pip install numpy pillow mss pyautogui
python3 drive.py --list
python3 drive.py --profile acrobat-win --file drawing-set.pdf --device "ThinkPad P1 G7" --shots shots
```

The default steps are the page-load run. Jump and revisit type the target into
the app's page box. Each app needs a recipe in `apps.json` (its next-page key,
its go-to-page keys).

- **Unverified:** the Acrobat, Edge and Preview recipes are best guesses.
- **Still to fill in:** Bluebeam and Drawboard.

Run one rep with `--shots` and look at the screenshots before trusting the
numbers. On macOS, allow Terminal under Privacy & Security → Accessibility
and → Screen Recording.

## 4. The comparison

```sh
python3 report.py ipad-*.csv windows.csv mac.csv --md report.md
```

You get one table per test file and device: each app's open / next sheet /
jump / revisit, then each app as a multiple of the fastest on that device.
For example, "PolyPDF: jump 3.4×, revisit 1.2×" means PolyPDF loads unseen
sheets slowly but caches well. `†` marks a cell that includes a lower bound.

The CSV has one measurement per row: `run_id, date, platform, os_version,
device, cpu, ram_gb, method, tool, tool_version, file, fingerprint, step,
page, rep, metric, value, unit, notes`. `page` is the sheet the step landed
on, so slow sheets can be picked out.

## 5. Keeping it fair

- **Same file and same sheets everywhere.** Check the fingerprint column.
  Same view settings in every app: single page, all layers and markups on.
- **Same device for any app-vs-app claim.** Cross-device numbers describe the
  device as much as the app.
- **App settings recorded.** Note hardware acceleration and render quality.
  If PolyPDF's line detection runs on open, measure it on and off. Any setting
  that could plausibly matter gets measured both ways, and the version goes in
  `--tool-version`.
- **Reps 2–5 may be helped by the app's disk cache** (thumbnails, render
  caches) even after a force-quit. That's real behaviour, but the report
  shows the first open separately so it isn't hidden in the median.
- **Heat.** Pause between apps; a hot iPad throttles.

## 6. Accuracy and what's been verified

- **Resolution:**
  - A recording resolves to one frame, about 17 ms at 60 fps.
  - Tap-to-video alignment adds a few tens of ms.
  - Live capture resolves to one capture interval, about 20–50 ms.
  - Differences under ~100 ms aren't meaningful. Page loads on heavy sheets
    are measured in seconds.
- **Encoder noise is ignored.** Keyframes and quality top-ups in screen
  recordings don't register as change: the comparison uses blocks, not
  pixels.
- **A frozen app counts.** An app that shows nothing for two seconds and then
  paints is timed from the tap.
- **Panning** is detected by phase correlation, so sharpening in place isn't
  mistaken for movement.
- **Checked here** (`python3 test_bench.py`, 76 checks): the harness recovers
  known timings from synthetic recordings, both constant-frame-rate and
  variable-frame-rate. `drive.py` ran end to end against Chromium's PDF viewer
  on Linux.
- **Not yet run:** a real iPad recording, and `drive.py` on Windows or macOS.
  Do a short shakedown on each first.

## Appendix: engine timings (optional)

`engines.py` (PDFium, MuPDF, Poppler) and `pdfkit/` (Apple's PDFKit, as a Mac
command-line tool or a Swift Playgrounds app on the iPad) time the rendering
libraries headless. They **don't predict app page loads**, because each app
wraps its engine differently, and the report keeps them in a separate
section. They're only useful for diagnosis, for example to see whether an
app is slower than the engine it probably uses.

## Files

| file | what |
|---|---|
| `make_set.py` | the test set generator (standard library only) |
| `runcard.py` | the tester's step list and the analysis command |
| `settle.py` | times any app from a screen recording (iPad, Windows, macOS) |
| `drive.py` + `apps.json` | drives desktop apps and times them live |
| `report.py` | the per-device app comparison |
| `common.py` | the protocol (steps, which sheet each lands on), device info, results format |
| `test_bench.py` | the harness's own checks |
| `engines.py`, `pdfkit/` | optional engine diagnostics |
