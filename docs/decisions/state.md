# Architecture State Doc

The autonomous work system's long-running memory. The `architect` agent
boots from this file every run and updates it after each Rung 2 fit-check.
Keep it lean — a live picture, not a log.

_Last updated: 2026-06-07 (dev reconciliation — engine + converter folded in)_

## Live architectural picture

- **What this is:** `architecture.tools` — a static site for architects.
  Vanilla HTML/CSS/JS. No framework, no build step, no backend
  (`docs/PROJECT.md`).
- **Two branches (read `docs/HANDOFF.md` first):**
  - **`main` — the live site, picker-only.** `index.html` is the picker (the
    home page); `picker.html` redirects to `/`. Plus `assets/`, `data/`,
    `tools/`, `docs/`, the `build-data` workflow, `CNAME`, `.nojekyll`. Trimmed
    to this in commit `f01b200` (removed `components.html`, `site-screen.html`,
    and `calculators/`). The picker links to no deferred page, so nothing 404s.
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
- **Shared assets:** `assets/css/global.css` (design tokens + reusable
  components); `assets/data/hardware-data.json` (the picker's runtime data,
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
- The `assets/css/global.css` token and component vocabulary.
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
  updated in `docs/HANDOFF.md` §3. Open follow-ups recorded in the backlog
  (parser `reason` codes; convert.html UI: area-range guard, mobile-CSS
  selector, Min/Max wording).
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
- The richer AT-0 master cover (a multi-set index) is deferred behind the
  picker-only launch — tracked in the backlog.
