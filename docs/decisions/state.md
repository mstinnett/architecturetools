# Architecture State Doc

The autonomous work system's long-running memory. The `architect` agent
boots from this file every run and updates it after each Rung 2 fit-check.
Keep it lean — a live picture, not a log.

_Last updated: 2026-07-09 (Scale gained the design-side "Across The Scales" table + false-precision reveal ("floor" term retired for **sheet resolution**); shared **recents** component in ui.js; `area.html` renamed **Material Coverage** (rate divisor, waste unbundled); **`tile-run.html` ("Uncut Tile Run", renamed from precision-window)** first draft — the design inverse of a tile run, split from the 2-D pattern surface. All on branch `claude/calculator-converter-promotion-qcbhgv`, noindexed — operator moves to `main` manually. Design thinking captured in `docs/In Progress/coverage-layout-tolerance-firstpass.md`.)_

## Live architectural picture

- **What this is:** `architecture.tools` — a static site for architects.
  Vanilla HTML/CSS/JS. No framework, no build step, no backend
  (`docs/PROJECT.md`).
- **Two branches (read `docs/HANDOFF.md` first):**
  - **`main` — the live site: the picker (home) + the Precise Unit Converter**
    (`calculators/convert.html` + the three lib modules it loads — promoted
    2026-06-09). `picker.html` redirects to `/`. Plus `assets/`, `data/`,
    `tools/`, `docs/`, the `build-data` workflow, `CNAME`, `.nojekyll`.
    Interim nav (SITE_FRAMEWORK "Hierarchy"): title-block crumb (site title
    home link + set-trail label) on every page; picker footer links each live
    tool; each tool back-links home. Nothing links a deferred page, so
    nothing 404s.
  - **`dev` — the workbench (this branch).** The full prior site
    (`components.html`, `site-screen.html`, `calculators/`) **plus** the new
    calculator engine and converter. All work-in-progress lives here.
  - **Promotion model:** build on `dev` → preview on a neutral host → move one
    finished page (and any new `lib/` module) to `main` in a small commit. Live
    the moment it's on `main`.
- **Calculator engine (`calculators/lib/`):** the spine of the calculator
  family. Model: **parse a dimension expression → resolve it against a discrete
  constraint → show the residual.** Compute modules: `parse-length.js` (never
  throws), `snap.js` (fails loud, floor/nearest/ceil to a grid), `partition.js`
  (fails loud; divides a run into equal parts — sections, tiles, on-center,
  balusters — and exposes the residual). Figure modules (pure SVG strings,
  same conventions): `numberline.js`, `runbar.js` (a partition layout to scale,
  residual hatched, overruns drawn past the dimension line), `slopefig.js`
  (true-angle triangle, angular residual hatched as a wedge), `stairfig.js`
  (stair section, layout drift hatched at the floor line).
- **Twelve engine tool pages, three families.** `convert.html` (shipped on
  `main`, frozen) plus eleven on `dev` (2026-06-10, noindexed, awaiting the
  operator's taste pass then one-at-a-time promotion). Drafting family:
  `run.html` (the partition tool), `scale.html` (**"Scale Resolution"** — rebuilt
  2026-07-08 on the crossing model: a dimension crosses between sheet and world
  through an instrument, scale `n` converts sheet error to real error; see Recent
  decisions), `slope.html` (any-two-of-three; coherence-passed 2026-07-08,
  answer surface matched to the converter), `area.html` (**"Material
  Coverage"** — rate divisor, waste unbundled into breakage/attic-stock/
  cut-waste-is-the-layout's), `tile-run.html` ("Uncut Tile Run", renamed from precision-window) (**first draft** — the
  design inverse of a tile run: buildable windows drawn, forced-cut gaps
  hatched, bullnose/metal/lapped ends), `stairs.html` (introduces the edition pill + citation
  pattern), `sheet-sizes.html` (the fit reference, restyled onto the theme,
  ANSI added). Egress family: `occupant-load.html` (typed takeoff ÷ IBC Table
  1004.5, gross/net surfaced), `egress-width.html` (load×factor both
  directions, minimums located), `exits.html` (count thresholds + the
  half-diagonal separation, both verified), `fixture-calc.html` (banded
  ratios via `lib/bands.js`, per-value verified/draft provenance tags) —
  chained: area ?d=→ OL ?ol=→ egress width / exits / fixtures. Accessibility
  family: `ramp.html` (rise → runs + landings, §405 cited). `index.html` is
  the C-0 cover; tool crumbs route through it. Each page has a jsdom wiring
  smoke and a headless-Chromium render check (`/tmp/smoke` harness, not
  committed). Retired/rebuilt as superseded: `dimension-converter`,
  `slope-calculator`, `stair-calculator`, and the pre-engine
  `occupant-load`/`egress-width`/`fixture-calc` lookups. Still off-engine:
  `parking-ratio.html` (zoning-adjacent, default out).
- **Structure:** a "set of sets" — AT-0 master cover, A-series (editorial),
  C-series (calculators), L-series (library). Roadmap in `docs/SITE_FRAMEWORK.md`.
- **Shared assets:** `assets/css/global.css` — THE shared stylesheet (the
  warm sheet theme; imports `assets/css/tokens.css`, the canonical color
  palette; owns the per-family accent system selected via `data-family` on
  `<html>` and the one shared dark scheme). The picker and every
  `calculators/` page except `parking-ratio.html` use it fully;
  `components.html` links it and inherits the theme but hasn't been reviewed
  against it; `site-screen.html` still carries its own inline styles.
  `assets/data/hardware-data.json` (the picker's runtime data, generated from
  the `data/` CSV tables — see the pipeline contract below).
- **Verification gate:** `.claude/gate/run.sh` — htmlhint + stylelint +
  internal-link check. A dependency carve-out under `.claude/gate/`; not
  shipped with the site.

## Documented contracts (touching any of these forces Rung 3)

- `docs/PROJECT.md` — actual repo/shipping state; the page-classification
  rule (AT / A / C / L / named live page).
- `docs/SITE_FRAMEWORK.md` — the canonical structural and editorial roadmap.
- `docs/HANDOFF.md` — the calculator-engine charter: the engine model, the
  build plan, and the provenance rule.
- The "no build tools / no framework / no backend" rule for the site itself.
- The shared-CSS vocabulary: `assets/css/tokens.css` (canonical palette;
  the only definer of `--paper` and the other ground anchors) +
  `assets/css/global.css` (theme + components, family accents via
  `data-family`).
- The hardware-data pipeline: the CSV tables under `data/` (`cpus.csv`,
  `gpus.csv`, `chips.csv`, `specs-win.csv`, `specs-mac.csv`, `priorities.csv`,
  `extras.json`) are the single source of truth. `tools/build-data.mjs`
  compiles them to `assets/data/hardware-data.json` (generated — never
  hand-edited); the picker fetches that JSON at runtime, and a GitHub Action
  rebuilds it on push. Full contract in `data/README.md`.
- The engine conventions (`calculators/lib/`): UMD wrapper (browser + node),
  pure functions, an inline test block per module, **relative asset paths
  only**, **one source of truth per primitive** (the rounding kernel lives only
  in `snap.js`; others delegate), shared modules **validate their own public
  inputs**, and unresolved/infeasible states carry a **stable `reason` code**.
  New tools follow them (`docs/HANDOFF.md` §3).
- The provenance rule: never serve WIP on `architecture.tools` or a subdomain
  of it; preview only on a neutral, noindexed host (`docs/HANDOFF.md` §4).
- The citation ledger: every external code/standard a tool cites has a row in
  `docs/REFERENCES.md` with a per-value status (verified / cross-checked /
  memory); a new citation lands there in the same commit, and a page's
  draft tags must agree with the ledger.

## Recent decisions

- 2026-07-08 — **`scale.html` rebuilt on the crossing model; `slope.html`
  coherence pass; both answer surfaces matched to `convert.html`** (operator-
  directed, branch `claude/calculator-converter-promotion-qcbhgv`; not a
  promotion). The 2026-07-07 two-mode Scale Resolution ("Scaled Drawing Of
  Object" / "Physical Object") **stopped reading** and was rebuilt around one
  unifying idea: **a dimension crosses between sheet and world through an
  instrument; scale `n` converts sheet error to real error.** Five quantities —
  drawing scale `n`, sheet resolution `R` (source sheet-precision × `n`), read
  resolution `r`, tape resolution `t`, run accumulation. Two rules: reading →
  `value ± max(r, R)`; measuring to draw → known to ±(accumulated tape error),
  drawn off by `max(that, R)`. Page order is fixed: **scale → verb-named task
  toggle (Read A Drawing / Measure To Draw) → precisions → dimension → run.**
  The **sheet resolution is a knob** — a source-fidelity spectrum (Revit/CAD `snap`
  · PDF/Revu ≈0.3 mm · Print/Scale-rule ≈0.5 mm · Hand-drawn ≈0.8 mm) — so the
  resolution is set without a second length field. The run section now takes a
  **physical tape length** (12/25/50 ft, metric 5/10/30 m, custom); each lay
  covers one tape length, the table carries a Run column and highlights the lay
  where the worst-case chain first exceeds what the sheet holds (`N ≈ R/t`), with a marker
  on the stack-up figure. Imperial real-measurement displays read as native
  ft-in fractions, not survey decimals. **Slope**: any-two-of-three inputs; the
  three redundant sides collapsed to the solved ones; a rounding table
  (shallower-for-a-max / steeper-for-a-min) whose cells are selectable and drive
  the figure's hatch and comparison rays; regime-aware curation (pitch only when
  12s≥1, ratio only when s≤1); conflict validation on non-triangular inputs; a
  larger, more diagrammatic true-angle triangle with steep-tip label stacking.
  **Both** tools now use the converter's echo grammar — stated/inferred tokens,
  `tokens = result`, three registers (echo / figure / rows). **Show-don't-judge**
  held throughout. Standing takeaway (unchanged): a genuine promotion here is a
  **redesign**, not a noindex-drop.
- 2026-06-10 — **The calculator build-out** (operator-directed, three passes in
  one day; per-tool records live in backlog "Done"). Eleven tool pages + five
  engine/figure modules + the C-0 cover, all on the shell conventions; the
  superseded standalones retired or rebuilt in place. Governing principle,
  operator-stated: **surface information, don't decide for the user.** Two
  durable sub-decisions: (a) code TABLE values ship only with per-value
  provenance — verified / cross-checked / memory, rendered as visible tags
  (`docs/REFERENCES.md` is the ledger); fixtures was deferred for exactly this
  until the banded engine + tagged-draft approach made it shippable honestly.
  (b) A real-browser render sweep (Puppeteer/Chromium in the session sandbox)
  is now part of verification alongside the jsdom smokes and the gate.
- 2026-06-10 — `main` merged into `dev` (operator-directed: main's picker +
  converter are the approved versions). Main's side won every overlapping file
  — it had absorbed dev's palette work and moved past it. Dev kept its unique
  files; stale `global2.css` removed.
- 2026-06-09 — **UI/CSS consolidation + converter promotion** (operator-
  directed; full detail in backlog "Done" + HANDOFF §3). One 18px base size;
  the calculator shell graduated into `global.css`; `tokens.css` promoted as
  the canonical palette with the `data-family` accent system and one shared
  dark scheme; all pills real `<button>`s via shared `assets/js/ui.js`;
  interim nav nailed (title-block crumb, no C-0 until the set earned it);
  `convert.html` + lib promoted to `main`.
- 2026-06-07 — **Engine established.** Precise Unit Converter shipped
  (frozen); `calculators/lib/` set as the family's spine with its conventions
  (HANDOFF §3); then hardened after review — one rounding kernel in `snap.js`
  with others delegating, public-input validation, stable infeasibility
  `reason` codes. `partition.js` landed. `noindex` on all dev WIP pages.
- 2026-06-07 — `main` trimmed to picker-only (`f01b200`); the two-branch
  promotion model (above) is the working arrangement.
- 2026-06-05 — Deployment moved in-repo: `CNAME`, the `build-data` workflow,
  `.nojekyll` — GitHub Pages serving `main`, no external pipeline.
- 2026-06-03 — Hardware data split into per-table CSVs compiled by
  `tools/build-data.mjs`; `data/README.md` authoritative. (Supersedes the
  Pages-CMS idea, never shipped.)
- 2026-05-29 — Picker-only launch revision (operator-directed): picker became
  the home page; live pricing removed from the UI (data retained).
- 2026-05-22 — Autonomous work system bootstrapped
  (`docs/decisions/OPERATING_GUIDE.md`).

## Active concerns

- **Eleven new tools + C-0 await the operator's taste pass, then promotion.**
  Gate-green, 185 jsdom checks, and now RENDERED: a Puppeteer/headless-Chromium
  sweep (installed in the session sandbox via npm; harness in /tmp/smoke, not
  committed) covered all 14 pages × light/dark × desktop/phone — zero page
  errors, zero horizontal overflow, dark figures inverting. Remaining risk is
  taste and real-device behavior, not wiring. Promotion drops each page's
  `noindex`; the C-0 promotion also wires convert.html's crumb.
- **Two draft-data pointers carry visible tags until checked:** fixture ratios
  beyond the verified business/A-1 values, and exits' Table 1006.2.1 +
  travel-distance tables (left out entirely). Backlog records the
  replace-from-a-checked-copy procedure.
- **Provenance loose end:** `noindex` is on every `dev` WIP page — remove on
  promotion. Still open: no neutral preview host is configured, so WIP can only
  be viewed locally until one is stood up.
- **Next calc thread:** exits & arrangement (the last life-safety node besides
  fixtures), and plumbing fixtures once its IPC table is verified — both in
  the backlog with their preconditions. `sheet-sizes.html`'s home (C reference
  vs L-series) is an open backlog item.
- The richer AT-0 master cover (a multi-set index) is deferred behind the
  picker-only launch — tracked in the backlog.
