# Architecture State Doc

The autonomous work system's long-running memory. The `architect` agent
boots from this file every run and updates it after each Rung 2 fit-check.
Keep it lean — a live picture, not a log.

_Last updated: 2026-06-10 (second build pass: occupant load + egress width rebuilt on the engine, ramp added — three tool families now in use; eight new tools + C-0 on dev awaiting browser review)_

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
- **Nine engine tool pages, three families.** `convert.html` (shipped on
  `main`, frozen) plus eight on `dev` (2026-06-10, noindexed, awaiting operator
  browser review then one-at-a-time promotion). Drafting family: `run.html`
  (the partition tool), `scale.html`, `slope.html` (incl. projected lengths),
  `area.html`, `stairs.html` (introduces the edition pill + citation pattern).
  Egress family: `occupant-load.html` (typed takeoff ÷ IBC Table 1004.5,
  gross/net surfaced) and `egress-width.html` (load×factor both directions,
  minimums located) — chained: area ?d=→ OL ?ol=→ egress width. Accessibility
  family: `ramp.html` (rise → runs + landings, §405 cited). `index.html` is
  the C-0 cover; tool crumbs route through it. Each page has a jsdom wiring
  smoke (`/tmp` harness, not committed). Retired as superseded:
  `dimension-converter`, `slope-calculator`, `stair-calculator`, and the
  pre-engine `occupant-load`/`egress-width` lookups (rebuilt in place). Still
  off-engine: `sheet-sizes.html` (reference table — home undecided),
  `fixture-calc.html` (deferred until its IPC table is verified — see
  backlog), `parking-ratio.html`.
- **Structure:** a "set of sets" — AT-0 master cover, A-series (editorial),
  C-series (calculators), L-series (library). Roadmap in `docs/SITE_FRAMEWORK.md`.
- **Shared assets:** `assets/css/global.css` — THE shared stylesheet (the
  warm sheet theme; imports `assets/css/tokens.css`, the canonical color
  palette; owns the per-family accent system selected via `data-family` on
  `<html>` and the one shared dark scheme). The picker and converter use it
  fully; `components.html` and `dimension-converter.html` link it and inherit
  the theme (the old cool-neutral sheet of the same name was replaced —
  same class/token vocabulary, re-valued). `assets/data/hardware-data.json`
  (the picker's runtime data, generated from the `data/` CSV tables — see the
  pipeline contract below).
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

## Recent decisions

- 2026-06-10 (second pass) — The life-safety thread opened: occupant load and
  egress width rebuilt on the engine in place of their pre-engine lookups, ramp
  added; the egress and accessibility family accents are now in use. Two
  notable calls: code TABLE values only ship cross-checked (the legacy
  mercantile 30/60 split was silently outdated — corrected to the post-2015
  flat 60 gross), and **plumbing fixtures was deliberately deferred** because
  its banded IPC ratios couldn't be verified here — a misquoted table is the
  exact failure the suite is built against (backlog item records the
  precondition).
- 2026-06-10 — Calculator build-out on `dev` (operator-directed: "get through
  as many as possible in the style of convert.html"). Five tool pages + three
  figure modules + the C-0 index, all on the shell/engine conventions, each
  gate-checked and jsdom-smoke-tested. The governing principle stated by the
  operator and applied everywhere: **surface information, don't decide for the
  user** — floor/nearest/ceil all get rows, alternatives are equal cards,
  limits and call-outs are located with citations rather than colored as
  verdicts, assumptions are echoed until the user replaces them.
- 2026-06-10 — `main` merged into `dev` (operator-directed: main's picker +
  converter are the approved versions). Main's side won every overlapping file
  — it had absorbed dev's palette work and moved past it (promotion, css
  consolidation, numberline clearance fix, research-pass data). Dev kept its
  unique files (partition.js, fixtures, HANDOFF.md, In Progress docs, the
  deferred pages). Stale `global2.css` removed. dev pushed; calculator work
  continued on `claude/calculator-implementations-ov885q` from that merge.
- 2026-06-09 — Interim nav revised after operator review: every title block
  opens with a breadcrumb (site title linking home + the set trail as a
  label — "Calculators → Precise Unit Converter"), in place of routing the
  two live pages through a C-0 cover. C-0 deferred until the set has a
  second shipped tool (a one-item index is less deliberate than a labeled
  trail); footer cross-links kept. Rule in SITE_FRAMEWORK "Hierarchy".
- 2026-06-09 — UI review pass (operator-directed, "act on all of them"), then
  the converter promoted to `main`. One base font size site-wide (18px, the
  picker's iterated scale, set once in global.css). The calculator shell
  graduated into global.css ("CALCULATOR SHELL": input well, echo, constraint
  dial, debossed answer card, snap rows, figure text classes, mathnote) with
  the slots labeled in convert.html and the convention recorded in HANDOFF §3.
  All interactive pills on both pages are now real `<button>`s with
  `aria-pressed` (synced via the new shared `assets/js/ui.js`, which also owns
  `esc()`), one focus-visible ring, and coarse-pointer hit-height bumps; the
  picker's markup order now matches its visual order (CSS `order` removed) and
  ~10 dead inline CSS classes from earlier iterations were trimmed. Converter
  gained a shareable URL (`?d=&t=&g=`) and an echo assumption line announcing
  the auto-flipped target; the picker footer date now derives from
  `Meta.dataUpdated` (build-data stamps the last data/ commit date). Interim
  nav nailed down in SITE_FRAMEWORK and wired (footer link ↔ back-link).
- 2026-06-09 — Shared CSS consolidated to one sheet (operator-directed).
  `global2.css` renamed over `assets/css/global.css`, replacing the old
  cool-neutral sheet (same class/token vocabulary, so its two consumers —
  `components.html`, `dimension-converter.html` — re-theme without edits).
  The `--paper` repetition resolved: tokens.css is its only definer (the
  brand's warm-white anchor, like `--lightbox` for dark); the theme's grounds
  are `--card` (the sheet) and `--gray-100` (the field behind it), and the
  unused `--page-bg` alias was dropped. Picker + converter verified
  computed-style identical in both schemes.
- 2026-06-09 — Shared CSS refactor (operator-directed). The canonical palette
  graduated from `docs/In Progress/tokens.css` to `assets/css/tokens.css`;
  `global2.css` imports it and now owns the family-accent system (pages
  declare `<html data-family="picker|drafting|…">`) plus the single shared
  dark scheme that `index.html` and `convert.html` had each been carrying
  inline. Both pages' duplicated `:root` mirrors and dark blocks were
  deleted; rendering verified pixel-identical (computed-style diff, both
  schemes). Future tool pages adopt the look with one link + one attribute.
- 2026-06-07 — `partition.js` shipped: the layout primitive (sibling to
  `snap.js`) that divides a run into a whole number of equal parts and exposes
  the residual, unifying four tools (sections / tiles / on-center / balusters)
  behind one module. Pure integer math, fails loud, 35 inline `node` tests
  passing. No tool page consumes it yet — that is the next build.
- 2026-06-07 — Engine hardened after a review of `convert.html` + the lib:
  `numberline.js` and `partition.js` now **delegate** the floor/nearest/ceil
  kernel to `snap.js` (one source of truth, no duplicated `snapTriple`/`pick`);
  `numberline()` validates its public inputs; `partition` infeasibility carries
  stable `reason` codes; the `Number`-range bound is documented. Conventions
  updated in `docs/HANDOFF.md` §3. Also fixed the flagged convert.html UI bugs
  (mobile-CSS selector, area out-of-range guard, Min/Max row wording). Open
  follow-ups in the backlog: parser `reason` codes, and convert.html
  pending-span policy + area/ratio polish.
- 2026-06-07 — `noindex` added to all 11 `dev` WIP pages (provenance §4).
- 2026-06-07 — Precise Unit Converter shipped (frozen), and the calculator
  **engine** (`calculators/lib/`) established as the spine for the family. Build
  plan and provenance rule captured in `docs/HANDOFF.md`. These agent docs
  (`state.md`, `backlog.md`) were reconciled to match — they previously omitted
  the engine entirely and still listed removed pages as live.
- 2026-06-07 — `main` trimmed to picker-only (`f01b200`): `components.html`,
  `site-screen.html`, and `calculators/` removed from the live branch and kept
  on `dev`. The two-branch promotion model (above) is the working arrangement.
- 2026-06-05 — Deployment moved in-repo. `CNAME` points the custom domain
  (architecture.tools) at the site; `.github/workflows/build-data.yml`
  recompiles `hardware-data.json` on push and commits it back. With `.nojekyll`
  this is a GitHub Pages setup serving `main`, not an external pipeline.
- 2026-06-03 — Hardware data split into per-table CSVs. The single `catalog.csv`
  became `cpus.csv` + `gpus.csv` + `chips.csv`; the spec matrices reference
  catalog keys, compiled by `tools/build-data.mjs`. `data/README.md` is
  authoritative. (Supersedes the earlier Pages-CMS / `.pages.yml` idea, which
  never shipped.)
- 2026-05-29 — Picker-only launch revision (operator-directed). The picker
  became the site home page; live pricing was removed from the picker UI (price
  data retained, unrendered).
- 2026-05-22 — Autonomous work system bootstrapped. Setup choices recorded
  in `docs/decisions/OPERATING_GUIDE.md`.

## Active concerns

- **The eight new tools + C-0 await operator browser review, then promotion.**
  They are gate-green and jsdom-smoke-tested, but no real browser has rendered
  them (this environment has none) — figures, dark scheme, and phone widths
  need eyes before any page moves to `main`. Promotion drops each page's
  `noindex`; the C-0 promotion also wires convert.html's crumb (convert stays
  frozen until then).
- **Provenance loose end:** `noindex` is on every `dev` WIP page — remove on
  promotion. Still open: no neutral preview host is configured, so WIP can only
  be viewed locally until one is stood up.
- **Next calc thread:** exits & arrangement (the last life-safety node besides
  fixtures), and plumbing fixtures once its IPC table is verified — both in
  the backlog with their preconditions. `sheet-sizes.html`'s home (C reference
  vs L-series) is an open backlog item.
- The richer AT-0 master cover (a multi-set index) is deferred behind the
  picker-only launch — tracked in the backlog.
