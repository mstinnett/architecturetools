# architecture.tools — Project Summary

## What this is

A static site for architects that combines three modes of content:

1. **Live recommendation pages** — current hardware and component picks
2. **Sheet sets** — diagram-led editorial pages organized like drawing sets
3. **Utility/reference sets** — calculators now, libraries later

The site uses a minimal, high-contrast design language. No framework, no build tools, no backend. Vanilla HTML/CSS/JS served as static files. The aesthetic is architectural: precise, monochrome, monospaced labels, restrained diagrams, and generous whitespace.

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
│   │   └── global.css              # Shared design tokens and component styles
│   └── data/
│       └── hardware-data.json      # GENERATED from data/*.tsv — do not hand-edit
├── data/                           # Hardware data source (edit these; see data/README.md)
│   ├── catalog.tsv                 # CPUs / GPUs / Chips — name + note, defined once
│   ├── specs-win.tsv               # Windows spec matrix (one row per cell)
│   ├── specs-mac.tsv               # Mac spec matrix (one row per cell)
│   ├── priorities.tsv              # Per-profile "where the money matters" note
│   └── extras.json                 # Non-tabular data (apps, prebuilts, monitors…)
├── tools/
│   └── build-data.mjs              # Compiles data/ → assets/data/hardware-data.json
├── calculators/
│   ├── index.html                  # Calculator index / C-0 candidate
│   ├── dimension-converter.html
│   ├── slope-calculator.html
│   ├── sheet-sizes.html
│   ├── occupant-load.html
│   ├── stair-calculator.html
│   ├── parking-ratio.html
│   ├── egress-width.html
│   └── fixture-calc.html
└── docs/
    ├── PROJECT.md
    └── SITE_FRAMEWORK.md
```

Notes:
- `/a/`, `/c/`, and `/l/` are the long-term structural homes.
- The existing root-level pages remain valid and should stay prominent.
- `calculators/index.html` can initially do the job of **C-0** even if `/c/index.html` is not added immediately.

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
as tab-separated tables under `data/` and compiled to
`assets/data/hardware-data.json` by a tiny, dependency-free Node script
(`tools/build-data.mjs`). This is a data compile, not a site build — the pages
are still static and load the JSON directly. It exists because the data is a
regular 72-row matrix that is far nicer to edit in a spreadsheet than as hand-
written JSON. A GitHub Action runs the compile on push, so editing stays
edit → commit → live (see `data/README.md`).

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
- design tokens (colors, type scale, spacing) in CSS custom properties
- reset
- layout classes: `.page` (720px), `.page-wide` (1080px), `.page-full`
- reusable components such as `.section-label`, `.input-group`, `.option-pill`, `.app-toggle`, `.result-row`, `.output-row`, `.field-row`, `.note-box`, `.priority-box`, `.card-link`, `.page-footer`, `.spec-block`, `.purchase-path`, `.pick`, `.ref-table`, `.scale-table`
- higher-contrast palette than the first iteration
- type scale from `--text-xs` through `--text-2xl`

**Status:** created but not yet applied everywhere. Continue migrating pages toward shared styles rather than inventing a larger system.

### Hardware data — `data/` (source) → `assets/data/hardware-data.json` (generated)
The picker fetches `assets/data/hardware-data.json` at runtime, but that file is
**generated — do not hand-edit it.** The source of truth is the tab-separated
tables under `data/`, compiled by `tools/build-data.mjs`. Full workflow is in
`data/README.md`; the short version:

- `data/catalog.tsv` — every CPU / GPU / Mac chip (key, name, standard note),
  defined **once**.
- `data/specs-win.tsv`, `data/specs-mac.tsv` — the spec matrices, one row per
  `profile / scale / tier` cell, naming components by their catalog key.
- `data/priorities.tsv` — the per-profile "where the money matters" note.
- `data/extras.json` — everything not tabular (apps, prebuilts, monitors,
  laptops, label maps).

The `.tsv` files open as a clean grid in any spreadsheet app (desktop or mobile),
which is the point: a 72-row matrix is far nicer to edit there than as JSON.

**No duplication.** A spec cell names a component by catalog key (`rtx5090`), not
the full model string. Its `cpuNote`/`gpuNote` cell is **blank** to inherit the
catalog note, **plain text** to replace it, or **`+ text`** to add a line on top
of it. So the RTX 5090's `$2,900+` caveat lives once in `catalog.tsv` and each
build adds its own flavor. `hydrateSpecs()` in `index.html` resolves these
references at load into the flat `{ cpu, cpuNote, gpu, gpuNote, ... }` shape the
render code expects.

**Build & publish.** `node tools/build-data.mjs` rebuilds the JSON locally (no
dependencies). A GitHub Action (`.github/workflows/build-data.yml`) runs the same
compile on push, so editing a TSV and committing — even from a phone — updates
the live picker with no local build. The compile fails loudly on an unknown
catalog key, a missing cell, or a duplicate, so typos never ship.

---

## Current flagship live pages

These are the center of gravity of the shipping site.

### picker.html
The main hardware recommendation page.

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

### components.html
The companion current-picks page.

Role:
- specific component recommendations
- build-vs-buy honesty
- detailed practical purchasing guidance

This is a live companion to the broader editorial sheets, not a subordinate appendix.

### site-screen.html
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

The calculators are already a coherent set and should be treated as such.

### Current role
A grouped library of quick-answer utility pages for architects.

### Structural role
This is the beginning of the **C-series**.

### Immediate implementation recommendation
Add or refine a calculator index page that functions as **C-0**.

That page should:
- frame calculators as a set
- explain what kinds of questions they answer
- link clearly to each calculator
- feel like a cover sheet, not just a utility list

### Current calculator pages
- `calculators/dimension-converter.html`
- `calculators/slope-calculator.html`
- `calculators/sheet-sizes.html`
- `calculators/occupant-load.html`
- `calculators/stair-calculator.html`
- `calculators/parking-ratio.html`
- `calculators/egress-width.html`
- `calculators/fixture-calc.html`

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

The shipping MVP should make the current site feel intentional immediately.

### Core pages
- `index.html` as **AT-0**
- `picker.html`
- `components.html`
- `site-screen.html`
- `calculators/index.html` as **C-0** or a practical stand-in for it
- the existing calculator pages

### Why this is the MVP
Because these pages already exist, already work, and already define the product better than a larger but emptier framework would.

The numbered set structure should grow around them.

---

## Current priorities

1. Add / refine `index.html` as **AT-0**
2. Add / refine a calculator index as **C-0**
3. Bring more pages onto `global.css`
4. Keep `picker.html`, `components.html`, and `site-screen.html` prominent
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
