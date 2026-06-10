# architecture.tools — Project Summary

## What this is

A static site for architects that combines three modes of content:

1. **Live recommendation pages** — current hardware and component picks
2. **Sheet sets** — diagram-led editorial pages organized like drawing sets
3. **Utility/reference sets** — calculators now, libraries later

The site uses a minimal, high-contrast design language. No framework, no build tools, no backend. Vanilla HTML/CSS/JS served as static files. The aesthetic is architectural: precise, monochrome, monospaced labels, restrained diagrams, and generous whitespace.

---

## Branches: live vs. workbench

This file records actual repo and shipping state, and that now differs by branch:

- **`main` — the live site, picker-only.** `index.html` (the picker) plus its
  support files; `picker.html` redirects to `/`. `components.html`,
  `site-screen.html`, and `calculators/` were trimmed off `main` in `f01b200`.
- **`dev` — the workbench (this branch).** The full site below **plus** the
  calculator engine (`calculators/lib/`) and the shipped Precise Unit Converter
  (`calculators/convert.html`). Finished tools promote to `main` one at a time.

The file structure below describes the **`dev`** tree. See `docs/HANDOFF.md` for
the engine, the build plan, and the promotion/provenance rules.

---

## Structural model

The site is now organized as a **set of sets**.

- **AT-0** — the master cover sheet for architecture.tools
- **A-0** — the architecture/editorial set cover
- **C-0** — the calculators set cover
- **L-0** — the library/reference set cover

This reconciles the original drawing-set vision with the actual implementation.

### What each set means

**AT**
The umbrella layer. This is the site-level cover sheet and index.

**A**
The slower, more durable, diagram-led editorial pages.

**C**
Interactive calculators and similar quick-answer utilities.

**L**
Future reference/library content: dimensions, blocks, families, file standards, naming systems, and similar reusable material.

### Important implementation rule

Not every current live page needs a numbered sheet ID yet.

For now, these remain named flagship pages:
- `picker.html`
- `components.html`
- `site-screen.html`

They are part of the site structure, but they do not need premature renaming or renumbering.

---

## File Structure

```text
/
├── index.html                      # The picker — site home page and launch entry point
├── picker.html                     # Redirect to / (kept so old links resolve)
├── components.html                 # Flagship live component recommendation page
├── site-screen.html                # Flagship live site feasibility page
├── a/
│   └── index.html                  # A-0 architecture/editorial cover (future)
├── c/
│   └── index.html                  # C-0 calculators cover/index (future or alias)
├── l/
│   └── index.html                  # L-0 library/reference cover (future)
├── assets/
│   ├── css/
│   │   ├── global.css              # Shared theme + components (imports tokens.css)
│   │   └── tokens.css              # Canonical color palette (family accents + grounds)
│   └── data/
│       └── hardware-data.json      # GENERATED from data/*.csv — do not hand-edit
├── data/                           # Hardware data source (edit in Numbers; see data/README.md)
│   ├── cpus.csv                    # Each CPU rec — key, intel option, amd option, note
│   ├── gpus.csv                    # Each GPU rec — key, name, note
│   ├── chips.csv                   # Each Mac chip — key, name
│   ├── specs-win.csv               # Windows spec matrix (one row per cell)
│   ├── specs-mac.csv               # Mac spec matrix (one row per cell)
│   ├── priorities.csv              # Per-profile "where the money matters" note
│   ├── extras.json                 # Non-tabular data (apps, prebuilts, monitors…)
│   └── README.md                   # The authoritative data-pipeline contract
├── tools/
│   ├── build-data.mjs              # Compiles data/ → assets/data/hardware-data.json
│   └── make2d.py, solve.py, …      # Desk-image render pipeline (see make2d_pipeline.md)
├── calculators/                    # convert.html + the 3 lib modules it uses are LIVE on main; the rest is dev-only
│   ├── index.html                  # C-0 — the calculators set cover (dev, noindexed)
│   ├── convert.html                # Precise Unit Converter — engine-powered, LIVE
│   ├── run.html                    # Run Solver — partition tool page (dev, noindexed)
│   ├── scale.html                  # Scale Converter (dev, noindexed)
│   ├── slope.html                  # Slope — rise/run/slope (dev, noindexed)
│   ├── area.html                   # Area & Coverage takeoff (dev, noindexed)
│   ├── stairs.html                 # Stairs — risers + IRC/IBC citations (dev, noindexed)
│   ├── occupant-load.html          # Occupant Load — takeoff ÷ Table 1004.5 (dev, noindexed)
│   ├── egress-width.html           # Egress Width — load×factor ↔ capacity (dev, noindexed)
│   ├── ramp.html                   # Ramp — rise → runs + landings, §405 (dev, noindexed)
│   ├── exits.html                  # Exits — count thresholds + half-diagonal (dev, noindexed)
│   ├── fixture-calc.html           # Plumbing Fixtures — banded ratios, draft-tagged data (dev)
│   ├── sheet-sizes.html            # Sheet Sizes — ARCH/ANSI fit reference, on the theme (dev)
│   ├── lib/                        # The calculator ENGINE (see docs/HANDOFF.md §3)
│   │   ├── parse-length.js         # Dimension-expression evaluator (never throws)
│   │   ├── snap.js                 # Integer-exact snap to a grid (fails loud)
│   │   ├── partition.js            # Run → whole-number layout + residual (fails loud)
│   │   ├── numberline.js           # Pure SVG-string figure (no DOM)
│   │   ├── runbar.js               # Layout figure for partition results (no DOM)
│   │   ├── slopefig.js             # True-angle slope triangle figure (no DOM)
│   │   ├── stairfig.js             # Stair section figure (no DOM)
│   │   ├── bands.js                # Banded code-table ratios (1 per N to a cutoff…)
│   │   └── parse-length.fixtures.js
│   └── parking-ratio.html          # LEGACY — code-lookup lineage, zoning-adjacent, out of scope
├── .github/workflows/
│   └── build-data.yml              # Rebuilds hardware-data.json on push, commits it back
├── CNAME                           # Custom domain: architecture.tools
├── .nojekyll                       # Serve files as-is on GitHub Pages
└── docs/
    ├── PROJECT.md                  # This file — actual repo & shipping state
    ├── SITE_FRAMEWORK.md           # The structural/editorial roadmap
    ├── HANDOFF.md                  # Calculator-engine charter, build plan, provenance
    ├── REFERENCES.md               # Citation ledger — every code/standard cited, with status
    ├── voice.md                    # Recommendation-copy voice & glossary
    └── decisions/                  # Autonomous work system (state, backlog, queue, guide)
```

Notes:
- `/a/`, `/c/`, and `/l/` are the long-term structural homes (not created yet).
- `calculators/index.html` is the built C-0 cover (dev, noindexed); the
  long-term `/c/` home can alias it later.
- On `main` the picker is the only page; the rest of this tree is `dev`-only
  until promoted.

---

## Framework vs implementation

`docs/SITE_FRAMEWORK.md` is the canonical structural and editorial roadmap. It defines the numbered sets, the drawing-led approach, and the long-term sheet logic.

This `PROJECT.md` file records the **actual repo and shipping state**.

Key distinction:
- `SITE_FRAMEWORK.md` describes the intended architecture.
- `PROJECT.md` describes what exists now and how new pages should fit into that structure incrementally.

The site should grow toward the framework without requiring a rewrite or leaving the current site feeling empty.

---

## Design and implementation principles

### Drawings first, tools allowed
The site should still feel like a drawing set: diagrams first, notes second, opinionated conclusions, visible update dates.

But interactive tools are explicitly allowed. They are not exceptions to the framework; they are part of the product.

### Low friction over systems
Do not introduce a framework migration, site build step, or heavy templating
layer. The site itself stays plain HTML/CSS/JS, served static, no bundler.

The goal is low-friction publishing. Reuse small patterns, not infrastructure.

The one deliberate exception is **data**: the picker's hardware data is authored
as CSV tables under `data/` and compiled to `assets/data/hardware-data.json` by a
tiny, dependency-free Node script (`tools/build-data.mjs`). This is a data
compile, not a site build — the pages are still static and load the JSON
directly. It exists because the data is a regular 72-row matrix that is far nicer
to edit in a spreadsheet (Numbers) than as hand-written JSON. A GitHub Action
runs the compile on push, so editing stays edit → commit → live (see
`data/README.md`).

### A few reusable page habits, not a template engine
A page can be assembled from simple recurring parts:
- title / sheet label / update date
- lead drawing or lead tool
- short notes
- related links
- optional comparison table or reference list

That is enough.

---

## Shared assets

### assets/css/global.css
Shared stylesheet. Root-level pages should import it via:

```html
<link rel="stylesheet" href="assets/css/global.css">
```

Pages inside `calculators/` should import it via:

```html
<link rel="stylesheet" href="../assets/css/global.css">
```

Contains:
- the warm sheet theme: design tokens (type scale, spacing, surfaces, shadows)
  in CSS custom properties, plus the one shared dark scheme
  (`prefers-color-scheme`)
- an `@import` of `assets/css/tokens.css` — the canonical color palette (the
  seven family accents and the fixed grounds, e.g. `--paper`, `--lightbox`).
  Pages pick their accent family with `data-family` on `<html>`
  (e.g. `data-family="drafting"`); a page that declares nothing gets drafting
- reset
- layout classes: `.page` (720px), `.page-wide` (1080px), `.page-full`
- reusable components such as `.section-label`, `.input-group`, `.option-pill`, `.app-toggle`, `.result-row`, `.output-row`, `.field-row`, `.note-box`, `.priority-box`, `.answer-card`, `.card-link`, `.page-footer`, `.spec-block`, `.purchase-path`, `.pick`, `.ref-table`, `.scale-table`
- type scale from `--text-xs` through `--text-2xl`

**Status:** applied across the picker and every `calculators/` page except `parking-ratio.html`. Remaining: `site-screen.html` (own inline styles), a review pass of `components.html` (linked, unreviewed). Continue reusing the shell rather than inventing a larger system.

### Hardware data — `data/` (source) → `assets/data/hardware-data.json` (generated)
The picker fetches `assets/data/hardware-data.json` at runtime, but that file is
**generated — do not hand-edit it.** The source of truth is the CSV tables under
`data/`, compiled by `tools/build-data.mjs`. Full workflow is in
`data/README.md`; the short version:

- `data/cpus.csv`, `data/gpus.csv`, `data/chips.csv` — the catalog: every CPU,
  GPU, and Mac chip (key, name(s), standard note), each defined **once**.
- `data/specs-win.csv`, `data/specs-mac.csv` — the spec matrices, one row per
  `profile / scale / tier` cell, naming components by their catalog key.
- `data/priorities.csv` — the per-profile "where the money matters" note.
- `data/extras.json` — everything not tabular (apps, prebuilts, monitors,
  laptops, label maps).

The CSVs open as a clean grid in Numbers (or any spreadsheet) — the point of the
format, since a 72-row matrix is far nicer to edit there than as JSON.

**No duplication.** A spec cell names a component by catalog key (`rtx5090`), not
the full model string. Its `cpuNote`/`gpuNote` cell is **blank** to inherit the
catalog note, **plain text** to replace it, or **`+ text`** to add a line on top
of it. So the RTX 5090's `$2,900+` caveat lives once in `gpus.csv` and each
build adds its own flavor. `hydrateSpecs()` in `index.html` resolves these
references at load into the flat `{ cpu, cpuNote, gpu, gpuNote, ... }` shape the
render code expects.

**Build & publish.** `node tools/build-data.mjs` rebuilds the JSON locally (no
dependencies). A GitHub Action (`.github/workflows/build-data.yml`) runs the same
compile on push, so editing a CSV and committing updates the live picker with no
local build. The compile fails loudly on an unknown catalog key, a missing cell,
or a duplicate, so typos never ship.

---

## Flagship pages

The picker is the center of gravity, and **the only one live on `main`**.
`components.html` and `site-screen.html` are full pages on `dev` but are not yet
promoted — they're documented here as the intended companions.

### picker.html — live (as `index.html`)
The main hardware recommendation page, and the site home page. `picker.html`
remains only as a redirect to `/`.

User flow:
1. Select software used
2. Select project scale
3. Select budget level
4. Get desktop/mobile recommendations by platform

Why it matters:
- apps are the input, not abstract workload categories
- platform emerges from app selection
- data is explicit rather than auto-generated
- the page is immediately useful and should remain highly visible from AT-0

### components.html — on dev, not yet promoted
The companion current-picks page.

Role:
- specific component recommendations
- build-vs-buy honesty
- detailed practical purchasing guidance

This is a live companion to the broader editorial sheets, not a subordinate appendix.

### site-screen.html — on dev, not yet promoted
A distinct interactive feasibility tool.

Role:
- lot geometry sketching
- setbacks / buildable area
- zoning / FAR / lot coverage
- parking / efficiency / cost assumptions
- residual land value

This is broader than the workstation/hardware material and should remain a separate flagship live page.

---

## Calculators

The calculators are the **C-series**, and they are mid-transition from a set of
standalone pages to a family built on a **shared engine**. They live on `dev`
(deferred off `main`); finished tools promote to `main` one at a time. The full
charter — engine model, build plan, conventions — is `docs/HANDOFF.md`.

### The engine (`calculators/lib/`)
The spine of the family: **parse a dimension expression → resolve it against a
discrete constraint → show the residual.** Compute modules: `parse-length.js`
(expression evaluator, never throws), `snap.js` (integer-exact snap to a grid,
fails loud), `partition.js` (divides a run into a whole number of equal parts
and exposes the residual; fails loud). Figure modules (pure SVG strings):
`numberline.js`, `runbar.js`, `slopefig.js`, `stairfig.js`. New tools follow
the engine conventions: UMD wrapper, pure functions, an inline test block,
relative asset paths only.

### Engine-powered pages
- `calculators/convert.html` — **Precise Unit Converter. Shipped and frozen.**
  Live on `main`.
- On `dev`, built 2026-06-10, noindexed, awaiting browser review then
  one-at-a-time promotion. Drafting family: `run.html` (Run Solver — the
  partition tool), `scale.html`, `slope.html`, `area.html`, `stairs.html`.
  Egress family: `occupant-load.html`, `egress-width.html` (chained:
  area → occupant load → egress width). Accessibility family: `ramp.html`.
  Plus the **C-0 cover** `calculators/index.html`.

### Next on the engine
Promotions (after the operator's taste pass), then data completion: replace
the fixtures page's draft-tagged ratios and add exits' single-exit/travel
tables from checked copies — the backlog records the per-value provenance
procedure. New nodes after that: WWR, triangle/squaring, the material layer
(suite map families 5–6).

### Standalone pages (not on the engine)
- `parking-ratio.html` — code/table-lookup lineage, zoning-adjacent (the suite
  map's default-out family).
- Retired 2026-06-10 (superseded by engine tools): `dimension-converter.html`,
  `slope-calculator.html`, `stair-calculator.html`, and the pre-engine
  `occupant-load.html` / `egress-width.html` / `fixture-calc.html` lookups
  (rebuilt in place). `sheet-sizes.html` restyled onto the theme and kept as
  the set's fit reference.

---

## Editorial / A-series direction

The A-series is now the durable editorial set, not the whole site.

### Recommended near-term A-series
- **A-0** — architecture/editorial cover
- **A-1** — Workstation Types + What Matters
- **A-2** — Monitors
- **A-3** — Mobile First Setups
- **A-4** — AI in Architecture

### Important merge decision
The earlier distinction between workstation archetypes and performance bounds should be merged.

Use one stronger sheet:
- **A-1 — Workstation Types + What Matters**

That sheet should identify the archetypes, explain the bottlenecks, and route users to the live recommendation pages.

### Companion relationship
Use the A-series to explain stable judgment.
Use live pages to carry current picks.

Example:
- **A-1** explains the model
- `picker.html` and `components.html` supply current recommendations

---

## Future L-series direction

The L-series does not need implementation now, but it should be accounted for structurally.

Potential future categories:
- dimensions / clearances
- blocks
- families
- file structures
- file naming
- sheet naming
- model organization standards

The goal is to leave room for these without re-architecting later.

---

## Shipping MVP

What actually shipped is a **picker-only launch** on `main`. The pages below
all exist on `dev`; the MVP is to promote them as each is ready, not to land
them all at once.

### Live now (`main`)
- `index.html` — the picker, doubling as the home page (a fuller **AT-0** cover
  is deferred behind the picker-only launch).
- `calculators/convert.html` — the Precise Unit Converter (promoted 2026-06-09).
- Navigation, interim (see SITE_FRAMEWORK "Hierarchy"): every title block
  opens with a crumb — site title linking home, then the set trail as a
  label ("Calculators → Precise Unit Converter"); the picker footer links
  each live tool; each tool's back-link returns home. C-0 is deferred until
  the set has a second shipped tool.

### Promote from `dev` as ready
- `components.html`, `site-screen.html`
- the next engine-based calculators (HANDOFF §5)
- a `calculators/index.html` as **C-0**

### Why this is the path
These pages already exist and work; promoting them one at a time keeps `main`
intentional while the numbered set structure grows around them.

---

## Current priorities

These seed `docs/decisions/backlog.md` (the work source); keep the two in step.
The backlog leads with the calculator-engine thread (HANDOFF §5).

1. Operator taste pass over the eleven new tools + C-0 (wiring risk already
   retired by the Chromium render sweep), then promote to `main` one at a time
2. Replace the draft-tagged code-table values (fixtures ratios; exits'
   single-exit/travel tables) from checked copies — `docs/REFERENCES.md` is
   the ledger and must agree with the page tags
3. Close the provenance loose ends (noindex on dev WIP, a neutral preview host)
4. Grow `index.html` toward a fuller **AT-0** cover as more of the site ships
5. Add thin A-series pages gradually rather than waiting for a complete set

---

## Working rule for future additions

When adding a new page, decide which of these it is:

- **AT** — site-level framing
- **A** — editorial architecture sheet
- **C** — calculator / quick-answer utility
- **L** — library / reference material
- **named live page** — still important, but not worth numbering yet

If a page is fast-changing and highly practical, keep it named.
If it is durable, diagram-led, and explanatory, consider giving it a sheet ID.
