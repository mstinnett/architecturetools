# Architecture State Doc

The autonomous work system's long-running memory. The `architect` agent
boots from this file every run and updates it after each Rung 2 fit-check.
Keep it lean — a live picture, not a log.

_Last updated: 2026-05-22 (system bootstrap)_

## Live architectural picture

- **What this is:** `architecture.tools` — a static site for architects.
  Vanilla HTML/CSS/JS. No framework, no build step, no backend
  (`docs/PROJECT.md`).
- **Structure:** a "set of sets" — AT-0 master cover, A-series (editorial),
  C-series (calculators), L-series (library). See `docs/SITE_FRAMEWORK.md`.
- **Shared assets:** `assets/css/global.css` (design tokens + reusable
  components); `assets/data/hardware-data.js` (recommendation data, the
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
- `assets/data/hardware-data.js` as the single source of hardware data.

## Recent decisions

- 2026-05-22 — Autonomous work system bootstrapped. Setup choices recorded
  in `docs/decisions/OPERATING_GUIDE.md`.

## Active concerns

- `index.html` (AT-0) does not exist yet. Until it is authored, `href="/"`
  links (in `components.html`) have no homepage target on the deployed
  site. Tracked as an open backlog item, not a gate failure.
