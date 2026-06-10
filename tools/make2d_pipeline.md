# Make2D batch pipeline

The solve is split from everything downstream and cached, so nudging one
machine re-solves one config instead of the whole batch, and every PNG shares
one scale + one canvas (no more per-image fit-to-content cropping).

```
solve.py   (in Rhino)         render.py   (plain CPython + PIL)
  HLD per config          ->    scale / canvas / crop / montage
  -> cache on disk              placement predicates
                               -> uniform PNGs + labeled montage
```

Three files:

- `make2d_layout.py` — shared, runtime-agnostic layout math (the config matrix
  and where every component lands). Imported by *both* sides so they can't
  drift. ASCII-only, no Rhino/PIL import. **Edit machines/monitors/positions
  here.**
- `solve.py` — runs in Rhino (`_RunPythonScript`). The only expensive step.
- `render.py` — runs anywhere with Python 3 + Pillow. No Rhino.

`make2d.py` is the original all-in-one in-Rhino script. It is now **wired to
`make2d_layout`** (it composes from `layout.resolve_placements`), so its
high-quality Make2D linework uses the exact placements you tune in the layout.
Use it for the final vector deliverable (PDF/PNG/SVG); use solve.py + render.py
for the fast iterate/preview loop.

## Final output (line quality)

When the placement is dialed in (via the preview/solve loop below), run
`make2d.py` in Rhino. It composes each config from the shared layout, solves
HiddenLineDrawing, and exports real vector linework per `EXPORT_EXTENSIONS`
(PNG + PDF by default; add `"svg"` for a scalable copy). Because it shares
`make2d_layout`, the composition matches what you previewed exactly. It also
force-reloads the layout each run (same Rhino module-cache guard as solve.py),
so edits always take effect.

## Iterate loop (the fast path)

1. Nudge a machine's position in `make2d_layout.py` (e.g. `TOWER_LEFTMOST_DISPLAY_GAP_MM`).
2. In Rhino, run `solve.py`. To re-solve only the config you touched, set
   `ONLY_CONFIGS = ["MacMini_2x32"]` near the top first. (solve.py force-reloads
   make2d_layout from disk each run, so your edits always take effect.)
3. In your **macOS terminal** (NOT Rhino), `python3 render.py` — regenerates
   uniform PNGs + `_montage.png`, and prints the placement predicate report.

### Which runtime runs what

- `solve.py` runs **inside Rhino** (`_RunPythonScript`). It is the only file
  that imports Rhino.
- `render.py` runs in your **terminal** (plain CPython 3 + Pillow). It never
  imports Rhino; running it inside Rhino fails with "No module named PIL".
- Gotcha: Rhino's Python session caches imported modules. After editing
  `make2d_layout.py`, a re-run of `solve.py` would reuse the stale module and
  silently re-solve with the OLD positions -- so solve.py evicts make2d_layout
  from sys.modules before importing it. If you ever see edits not taking, that
  was the cause; restarting Rhino's script editor also clears it.

Predicates alone, no Rhino and no solve needed (uses cached footprints):

```
python3 render.py --predicates
```

## What `solve.py` writes (under `cache/`)

- `<config>__iso.json` (and `__top.json` only if `EMIT_TOP_VIEW=True`): solved
  polylines (`segments`), `fiducials` (the four desk corners projected through
  the same HLD pass), and `content_bbox`.
- `footprints.json`: each component's local XY bbox, read once (memoized).
- `index.json`: the matrix, geometry signatures, and camera params.

The expensive `HiddenLineDrawing.Compute` is **deduplicated by geometry
signature**: the three laptop labels (Laptop/MBP/ProArt) currently resolve to
identical geometry, so they cost one solve, not three (36 configs -> 24 solves).
Point a machine row at a different `.3dm` in `make2d_layout.py` and it stops
being a duplicate automatically.

## Uniform output, via a shared datum

`render.py` does not fit each image to its own content. It:

1. Builds one canonical page frame analytically from the camera params
   (config-independent, so no single config can drag it).
2. Fits a per-config affine from the desk-corner fiducials into that frame —
   identity when the solve frame is already consistent, a correction when it
   drifts. (Verified: a config drifted by an arbitrary similarity re-aligns to
   0.0 px.)
3. Applies one global `PX_PER_MM` scale and pins the desk-center datum, sizing
   the canvas to the **union** of all configs' content + margin. Union-sizing
   is what kills cropping: the frame holds the largest member; smaller configs
   carry more whitespace.

## Placement predicates (triage, no rendering)

`render.py` checks each config as pure arithmetic over `footprints.json` +
`make2d_layout.py`:

- `off_desk` — a component's footprint leaves the 1500x750 desk rect
  (centered on the origin: x in [-750,750], y in [-375,375]).
- `hits_monitor` — the machine/extra footprint overlaps a monitor footprint.
- `hits_input_zone` — the machine/extra footprint overlaps the keyboard/mouse.

Overlap is footprint/XY-based, not page-based, so items at different depths
that overlap only in the iso projection are not falsely flagged. Rotated
components (laptops at 150 deg) use the axis-aligned bbox of their rotated
corners as a conservative footprint.

## Open-decision constants (defaults chosen; swap freely)

- Datum — `render.py` pins **desk-center** (absolute datum, so a drifting
  machine is unambiguous). For a clean deliverable set you could switch to
  cluster-center, but then the machine floats relative to the frame.
- Footprint source — **`.3dm` bbox**, read once into `footprints.json`. Swap to
  a hand-authored table only if a bbox read proves unreliable.
- `EMIT_TOP_VIEW` — off by default (top view is pure cost in the iterate loop;
  it is only the visual backstop). Turn on when you want it cached.
- `PX_PER_MM`, `MARGIN_MM`, colors, stroke widths — top of `render.py`.

## Dark-mode variants

The picker serves the desk art in both color schemes via `<picture>`: the
originals here in light, and `assets/desk-images-dark/` (same filenames,
lines recolored to the dark-page ink, alpha preserved) in dark. After
re-exporting desk images, regenerate the dark set:

    node tools/recolor-desk-dark.mjs   # needs playwright + chromium

