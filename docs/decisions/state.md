# Architecture State Doc

The autonomous work system's long-running memory. The `architect` agent
boots from this file every run and updates it after each Rung 2 fit-check.
Keep it lean — a live picture, not a log.

_Last updated: 2026-05-29 (picker-only launch revision)_

## Live architectural picture

- **What this is:** `architecture.tools` — a static site for architects.
  Vanilla HTML/CSS/JS. No framework, no build step, no backend
  (`docs/PROJECT.md`).
- **Structure:** a "set of sets" — AT-0 master cover, A-series (editorial),
  C-series (calculators), L-series (library). See `docs/SITE_FRAMEWORK.md`.
- **Shared assets:** `assets/css/global.css` (design tokens + reusable
  components); `assets/data/hardware-data.json` (recommendation data, the
  single source of truth for hardware picks).
- **Flagship live pages:** `picker.html`, `components.html`,
  `site-screen.html` — stay named, not numbered, for now.
- **Verification gate:** `.claude/gate/run.sh` — htmlhint + stylelint +
  internal-link check. A dependency carve-out under `.claude/gate/`; not
  shipped with the site.

## Documented contracts (touching any of these forces Rung 3)

- `docs/PROJECT.md` — actual repo/shipping state; the page-classification
  rule (AT / A / C / L / named live page).
- `docs/SITE_FRAMEWORK.md` — the canonical structural and editorial roadmap.
- The "no build tools / no framework / no backend" rule for the site itself.
- The `assets/css/global.css` token and component vocabulary.
- `assets/data/hardware-data.json` as the single source of hardware data
  (edited in Pages CMS via `.pages.yml`; the picker fetches it at runtime).

## Recent decisions

- 2026-05-29 — Picker-only launch revision (operator-directed). The picker is
  now the site home page (`index.html`; `picker.html` redirects to `/`). Live
  pricing was removed from the picker UI (price data retained, unrendered).
  Hardware data moved from `hardware-data.js` to `hardware-data.json`, loaded
  via `fetch` and editable in Pages CMS (`.pages.yml`). Other pages
  (components, site-screen, calculators) still exist but are not linked at launch.
- 2026-05-22 — Autonomous work system bootstrapped. Setup choices recorded
  in `docs/decisions/OPERATING_GUIDE.md`.

## Active concerns

- `index.html` now exists as the picker (the launch home page), so `href="/"`
  has a target. The richer AT-0 master cover (a multi-set index) is deferred
  behind the picker-only launch — tracked in the backlog.
- Deployment/DNS lives outside this repo (no workflow or CNAME here). Actually
  replacing the live landing page requires pointing the domain at this site.
