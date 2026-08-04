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

- **`main` — the live site: the AT-0 cover, the picker, and the converter.**
  `index.html` is the cover sheet; the picker is back at `picker.html` and the
  Precise Unit Converter at `calculators/convert.html`, plus their support
  files. `components.html`, `site-screen.html`, and the rest of `calculators/`
  were trimmed off `main` in `f01b200`.
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
├── index.html                      # AT-0 — the master cover sheet; indexes every live tool
├── picker.html                     # The picker (Computer Chooser) — flagship live page
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
│   ├── convert.html                # Precise Unit Converter — engine-powered, LIVE
│   ├── lib/                        # The calculator ENGINE (see docs/HANDOFF.md §3)
│   │   ├── parse-length.js         # Dimension-expression evaluator (never throws)
│   │   ├── snap.js                 # Integer-exact snap to a grid (fails loud)
│   │   ├── numberline.js           # Pure SVG-string figure (no DOM)
│   │   ├── partition.js            # Run → whole-number layout + residual (fails loud)
│   │   └── parse-length.fixtures.js
│   ├── dimension-converter.html    # LEGACY standalone — superseded by convert.html, retire
│   ├── slope-calculator.html       # LEGACY standalone — rebuild onto the engine
│   ├── stair-calculator.html       # LEGACY standalone — rebuild onto the engine
│   ├── sheet-sizes.html            # LEGACY standalone — rebuild onto the engine
│   ├── occupant-load.html          # LEGACY — code-lookup lineage, out of engine scope
│   ├── parking-ratio.html          # LEGACY — code-lookup lineage, out of engine scope
│   ├── egress-width.html           # LEGACY — code-lookup lineage, out of engine scope
│   └── fixture-calc.html           # LEGACY — code-lookup lineage, out of engine scope
├── .github/workflows/
│   └── build-data.yml              # Rebuilds hardware-data.json on push, commits it back
├── CNAME                           # Custom domain: architecture.tools
├── .nojekyll                       # Serve files as-is on GitHub Pages
└── docs/
    ├── PROJECT.md                  # This file — actual repo & shipping state
    ├── SITE_FRAMEWORK.md           # The structural/editorial roadmap
    ├── HANDOFF.md                  # Calculator-engine charter, build plan, provenance
    ├── voice.md                    # Recommendation-copy voice & glossary
    └── decisions/                  # Autonomous work system (state, backlog, queue, guide)
```

Notes:
- `/a/`, `/c/`, and `/l/` are the long-term structural homes (not created yet).
- `calculators/index.html` (a C-0 cover) is not built yet; add it once the
  engine-based tools settle.
- On `main` the live pages are the cover, the picker, and the converter; the
  rest of this tree is `dev`-only until promoted.

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

**Status:** created but not yet applied everywhere. Continue migrating pages toward shared styles rather than inventing a larger system.

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
build adds its own flavor. `hydrateSpecs()` in `picker.html` resolves these
references at load into the flat `{ cpu, cpuNote, gpu, gpuNote, ... }` shape the
render code expects.

**Build & publish.** `node tools/build-data.mjs` rebuilds the JSON locally (no
dependencies). A GitHub Action (`.github/workflows/build-data.yml`) runs the same
compile on push, so editing a CSV and committing updates the live picker with no
local build. The compile fails loudly on an unknown catalog key, a missing cell,
or a duplicate, so typos never ship.

---

## Flagship pages

The picker is the center of gravity, and **the only flagship live on `main`**.
`components.html` and `site-screen.html` are full pages on `dev` but are not yet
promoted — they're documented here as the intended companions.

### picker.html — live
The main hardware recommendation page, listed on the cover as the **Computer
Chooser** (its short name in nav and index copy; the page keeps the question as
its title). It was the site home page during the picker-only launch and moved
back to `picker.html` when the AT-0 cover landed, so old links to it resolve.

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
discrete constraint → show the residual.** Modules: `parse-length.js`
(expression evaluator, never throws), `snap.js` (integer-exact snap to a grid,
fails loud), `numberline.js` (pure SVG-string figure), and `partition.js`
(divides a run into a whole number of equal parts — sections, tiles, on-center,
balusters — and exposes the residual; reuses snap's integer division, fails
loud). New tools follow the engine conventions: UMD wrapper, pure functions, an
inline test block, relative asset paths only.

### Engine-powered pages
- `calculators/convert.html` — **Precise Unit Converter. Shipped and frozen.**
  The first and currently only tool on the engine.

### Next on the engine (see HANDOFF §5)
The `partition.js` primitive is built (tile cuts, n-sections, on-center,
balusters); its **tool page** is the next build. Then slope, then area +
coverage, then a scale converter.

### Legacy standalone pages (not on the engine)
- Rebuild onto the engine, then retire the standalone:
  `dimension-converter.html` (superseded by `convert.html` — retire, don't port),
  `slope-calculator.html`, `stair-calculator.html`, `sheet-sizes.html`.
- A different lineage (code/table lookups, not the dimensional engine) — out of
  engine scope: `occupant-load.html`, `egress-width.html`, `fixture-calc.html`,
  `parking-ratio.html`.

### C-0 cover
A `calculators/index.html` that frames the set, explains what questions it
answers, and links each tool — still to build, once the engine-based tools
settle.

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

What shipped was a **picker-only launch** on `main`, and the site has since
grown a cover over it. The pages below all exist on `dev`; the MVP is to
promote them as each is ready, not to land them all at once.

### Live now (`main`)
- `index.html` — **AT-0**, the master cover sheet (landed 2026-08-04). Worked
  in landscape: the title block holds the left edge, a heavy division separates
  it, and the index of live tools runs down the field, grouped by set. It
  stacks to the usual portrait order below 820px. Adding a tool is one
  `.index-row` block; nothing else to wire.
- `picker.html` — the picker, listed as the **Computer Chooser**.
- `calculators/convert.html` — the Precise Unit Converter (promoted 2026-06-09).
- Navigation, interim (see SITE_FRAMEWORK "Hierarchy"): every title block
  opens with a crumb — site title linking home, then the set trail as a
  label ("Calculators → Precise Unit Converter"); the cover indexes each live
  tool; each tool's back-link returns to the cover. C-0 is deferred until
  the set has a second shipped tool.
- Every title block carries the light/dark key (`.scheme-toggle` in
  `global.css`, wired once in `assets/js/ui.js`); the choice persists in
  `localStorage` and follows the reader across pages.

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

1. Extend the calculator engine — `partition()`, then slope, area+coverage,
   scale — and retire the superseded `dimension-converter.html`
2. Close the provenance loose ends (noindex on dev WIP, a neutral preview host)
3. Grow the **AT-0** cover as sets fill in (it ships with the two live tools);
   add a **C-0** calculator index once the engine tools settle
4. Bring the remaining pages onto `global.css` as they're touched (the picker
   and converter are on it; the legacy calculators and `site-screen.html`
   still carry their own inline styles)
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
