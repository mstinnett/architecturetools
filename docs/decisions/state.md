# Architecture State Doc

The autonomous work system's long-running memory. The `architect` agent
boots from this file every run and updates it after each Rung 2 fit-check.
Keep it lean — a live picture, not a log.

_Last updated: 2026-08-04 (AT-0 cover landed on main; the picker moved back to picker.html; the light/dark key is now shared on every page)_

## Live architectural picture

- **What this is:** `architecture.tools` — a static site for architects.
  Vanilla HTML/CSS/JS. No framework, no build step, no backend
  (`docs/PROJECT.md`).
- **Two branches (read `docs/HANDOFF.md` first):**
  - **`main` — the live site: the AT-0 cover (`index.html`, home) + the picker
    (`picker.html`) + the Precise Unit Converter** (`calculators/convert.html`
    + the three lib modules it loads — promoted 2026-06-09). Plus `assets/`,
    `data/`, `tools/`, `docs/`, the `build-data` workflow, `CNAME`,
    `.nojekyll`. Interim nav (SITE_FRAMEWORK "Hierarchy"): title-block crumb
    (site title home link + set-trail label) on every page; the **cover** is
    the index of live tools, one ruled row each, grouped by set; each tool
    back-links to the cover. Nothing links a deferred page, so nothing 404s.
    Publishing a tool = adding its `.index-row` to the cover.
  - **`dev` — the workbench (this branch).** The full prior site
    (`components.html`, `site-screen.html`, `calculators/`) **plus** the new
    calculator engine and converter. All work-in-progress lives here.
  - **Promotion model:** build on `dev` → preview on a neutral host → move one
    finished page (and any new `lib/` module) to `main` in a small commit. Live
    the moment it's on `main`.
- **Calculator engine (`calculators/lib/`):** the spine of the calculator
  family. Model: **parse a dimension expression → resolve it against a discrete
  constraint → show the residual.** Modules: `parse-length.js` (never throws),
  `snap.js` (fails loud, floor/nearest/ceil to a grid), `numberline.js` (pure
  SVG string), and `partition.js` (fails loud; divides a run into a whole number
  of equal parts — sections, tiles, on-center, balusters — and exposes the
  residual; reuses snap's integer division). `convert.html`, the Precise Unit
  Converter, is the only **tool page** yet built on the engine — **shipped and
  frozen**; it uses parse/snap/numberline. `partition.js` is landed and tested
  but has no tool page yet. Every other `calculators/*.html` is older,
  standalone, and does **not** use the engine.
- **Structure:** a "set of sets" — AT-0 master cover, A-series (editorial),
  C-series (calculators), L-series (library). Roadmap in `docs/SITE_FRAMEWORK.md`.
- **Shared assets:** `assets/css/global.css` — THE shared stylesheet (the
  warm sheet theme; imports `assets/css/tokens.css`, the canonical color
  palette; owns the per-family accent system selected via `data-family` on
  `<html>` and the one shared dark scheme). The picker and converter use it
  fully; `components.html` and `dimension-converter.html` link it and inherit
  the theme (the old cool-neutral sheet of the same name was replaced —
  same class/token vocabulary, re-valued). `assets/js/ui.js` — the shared page
  glue: `esc()`, `press()`, and the light/dark key (it wires every
  `.scheme-toggle`, persists the choice, and fires `schemechange` for anything
  a page drew in JS). Each page still needs the tiny pre-paint head script that
  resolves the scheme before first paint — that can't be deferred to a
  `<script src>`. `assets/data/hardware-data.json` (the picker's runtime data,
  generated from the `data/` CSV tables — see the pipeline contract below).
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

- 2026-08-04 — **AT-0 cover landed on `main`** (operator-directed, worked
  directly on the live branch). `index.html` is now the master cover sheet —
  title block, one-line thesis, and a ruled index of the live tools grouped by
  set — and the picker moved back to `picker.html` (where its redirect stub had
  been, so old links still land on it; canonical + og:url retargeted). The
  cover lists only what is live: Computer Chooser and Precise Unit Converter,
  with a note that more calculators are coming. Adding a tool is one
  `.index-row` block and nothing else. The picker's footer tool list became a
  back-link, since indexing is the cover's job now. Also graduated the sun/moon
  **light/dark key** out of the picker: `.scheme-toggle` into `global.css`,
  its wiring into `assets/js/ui.js`, and the button onto the converter and the
  cover — so the scheme choice is now available and consistent on every page.
  Verified: gate green, 37-check browser pass (both schemes, 1280 + 390).
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

- **Next build:** a **tool page** on `partition.js` — a convert.html-style page
  (figure + parsed input + residual) exposing tile cuts / n-sections / on-center
  / balusters. The primitive is done; this is the UI layer. Then slope,
  area+coverage, scale. See `docs/HANDOFF.md` §5 and the backlog.
- **Provenance loose end:** `noindex` is now on all 11 `dev` WIP pages
  (`components`, `site-screen`, every `calculators/*.html`) — remove on
  promotion. Still open: no neutral preview host is configured, so WIP can only
  be viewed locally until one is stood up.
- **Legacy calculators are off-engine.** `slope`, `stair`, `sheet-sizes` get
  rebuilt onto the engine; `dimension-converter.html` is superseded by
  `convert.html` and should be retired, not ported. The code-compliance
  calculators (`occupant-load`, `egress-width`, `fixture-calc`, `parking-ratio`)
  are a different lineage (table lookups) — out of scope for the engine thread.
- AT-0 is built, but thin by design: it indexes the two live tools. It fills
  out as pages promote — a new tool is one `.index-row`. The set covers
  (A-0 / C-0 / L-0) are still deferred, so the cover links tools directly.
