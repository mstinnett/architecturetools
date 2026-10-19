# architecture.tools — Project Summary

## What this is

A static site for architects that combines three modes of content:

1. **Live recommendation pages** — current hardware and component picks
2. **Sheet sets** — diagram-led editorial pages organized like drawing sets
3. **Utility/reference sets** — calculators now, libraries later

The site uses a minimal, high-contrast design language. No framework, no build tools, and no backend beyond the feedback form's two routes in the site's Cloudflare Worker (`docs/FEEDBACK.md`). Vanilla HTML/CSS/JS served as static files by Cloudflare (`docs/HOSTING.md`). The aesthetic is architectural: precise, monochrome, monospaced labels, restrained diagrams, and generous whitespace.

---

## Branches: live vs. workbench

This file records actual repo and shipping state, and that now differs by branch:

- **`main` — the live site: the AT-0 cover, the picker and the Precise Unit
  Converter.** `index.html` is the cover sheet; the picker is back at
  `picker.html`; the only published calculator is the converter
  (`calculators/convert.html` + `lib/`). `components.html`, `site-screen.html`,
  and the rest of `calculators/` were trimmed off `main` in `f01b200`.
- **`dev` — the workbench (this branch; `new-layout` was merged in and deleted 2026-10-16).** Carries the stack-of-lists cover, Stairs, Slope, Roof, Ramp, Drain, Tile Layout, Scale Resolution, Common Sizes, the PDF list and the BIM history, none of them published yet. The full site below **plus** the
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
├── feedback.html                   # The feedback form; notes go to D1, read at /inbox (docs/FEEDBACK.md)
├── privacy.html                    # Privacy & analytics statement, linked from every footer
├── picker.html                     # The picker (Computer Chooser) — flagship live page
├── components.html                 # Flagship live component recommendation page
├── site-screen.html                # Flagship live site feasibility page
├── a/
│   └── index.html                  # A-0 architecture/editorial cover (future)
├── c/
│   └── index.html                  # C-0 calculators cover/index (future or alias)
├── l/
│   ├── index.html                  # L-0 library/reference cover (future — deferred until a second L item)
│   ├── furniture.html              # Furniture Fit — parametric furniture w/ clearances, first draft (dev, noindexed)
│   └── lib/
│       ├── catalog.js              # Parametric furniture makers (params → parts + clearance zones + wall rules)
│       ├── fitmath.js              # Placement math: world boxes, wall sides, snapping, conflicts, slot + market fit
│       ├── marketbar.js            # Market distribution figure (converter hatch convention on a population)
│       └── market-data.js          # GENERATED from data/market/*.csv — do not hand-edit
├── cad/
│   ├── index.html                  # CAD Basis — exact-kernel demo page (dev, noindexed)
│   └── lib/                        # The EXACT kernel (BigInt rationals; see docs/In Progress/cad-basis.md)
│       ├── rat.js                  # Exact rationals over the lattice; toLattice = snap + held remainder
│       ├── plane.js                # Exact points/transforms; rational half-angle-tangent rotations
│       ├── geom2.js                # Exact predicates + intersections; outward lattice bbox
│       └── model.js                # Parametric nodes: insert (powercopy) / array+tweens / fitArray / hatch
├── assets/
│   ├── css/
│   │   ├── global.css              # Shared theme + components (imports tokens.css)
│   │   └── tokens.css              # Canonical color palette (family accents + grounds)
│   ├── fonts/
│   │   ├── league-spartan-400.woff2  # --font-mark, the wordmark face (display only)
│   │   ├── LICENSE-league-spartan.txt # SIL OFL
│   │   ├── jost-latin.woff2          # --font-body, Jost variable (also -latin-ext, -cyrillic)
│   │   └── LICENSE-jost.txt          # SIL OFL
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
│   ├── README.md                   # The authoritative data-pipeline contract
│   └── market/                     # Market dimension seed — real SKU footprints (see its README.md)
│       ├── sofas.csv               # sofa-3 + loveseat rows
│       ├── dining-tables.csv       # dining-rect rows (fixed / closed / extended states)
│       ├── beds.csv                # bed-frame rows by mattress size
│       └── README.md               # Column contract, tiers, provenance, honesty rules
├── tools/
│   ├── build-data.mjs              # Compiles data/ → assets/data/hardware-data.json
│   ├── test-feedback.mjs           # node tools/test-feedback.mjs — the feedback collector + inbox
│   ├── test-hosting.mjs            # node tools/test-hosting.mjs — the router + what gets published
│   ├── build-market.mjs            # Compiles data/market/ → l/lib/market-data.js
│   └── make2d.py, solve.py, …      # Desk-image render pipeline (see make2d_pipeline.md)
├── calculators/                    # convert.html + the 3 lib modules it uses are LIVE on main; the rest is dev-only
│   ├── index.html                  # C-0 — the calculators set cover (dev, noindexed)
│   ├── convert.html                # Precise Unit Converter — engine-powered, LIVE
│   ├── run.html                    # Run Solver — partition tool page (dev, noindexed)
│   ├── scale.html                  # Scale Resolution — the range a scaled dimension knows (dev, noindexed)
│   ├── slope.html                  # Slope — rise/run/slope (dev, noindexed)
│   ├── tile.html                   # Tile — Size The Wall / Lay Out The Wall (dev, noindexed)
│   ├── area.html                   # Material Coverage — takeoff ÷ unit/rate, waste unbundled (dev, noindexed)
│   ├── stairs.html                 # Stairs — risers + IRC/IBC citations (dev, noindexed)
│   ├── occupant-load.html          # Occupant Load — takeoff ÷ Table 1004.5 (dev, noindexed)
│   ├── egress-width.html           # Egress Width — load×factor ↔ capacity (dev, noindexed)
│   ├── ramp.html                   # Ramp — rise → runs + landings, §405 (dev, noindexed)
│   ├── roof.html                   # Roof — drag a true-scale section for heights from wall line, drip edge or ridge (dev)
│   ├── taper.html                  # Roof Taper — flat plan, drains placed, four-way taper heights (dev, noindexed)
│   ├── exits.html                  # Exits — count thresholds + half-diagonal (dev, noindexed)
│   ├── fixture-calc.html           # Plumbing Fixtures — banded ratios, draft-tagged data (dev)
│   ├── sheet-sizes.html            # Sheet Sizes — ARCH/ANSI fit reference, on the theme (dev)
│   ├── codes.html                  # Codes & Standards — what applies when + the library (dev)
│   ├── programming.html            # Homeowner Questionnaire — programming kickoff (dev)
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
├── worker/                         # The Cloudflare Worker — the site's only server code (docs/HOSTING.md)
│   ├── index.js                    # Router: /api/feedback and /inbox; everything else is static files
│   ├── feedback.js                 # POST /api/feedback — saves a note to D1 (FEEDBACK_DB)
│   ├── inbox.js                    # /inbox — the owner's password-protected reading view
│   └── feedback-store.js           # Shared table definition + same-site check
├── wrangler.jsonc                  # Worker config: assets = repo root, D1 binding, logging off
├── .assetsignore                   # What the Worker never publishes (docs/, tools/, data/, …)
├── .github/workflows/
│   └── build-data.yml              # Rebuilds hardware-data.json on push, commits it back
├── CNAME                           # GitHub Pages leftover — delete after the move (docs/HOSTING.md)
├── .nojekyll                       # GitHub Pages leftover — delete after the move
└── docs/
    ├── PROJECT.md                  # This file — actual repo & shipping state
    ├── SITE_FRAMEWORK.md           # The structural/editorial roadmap
    ├── HANDOFF.md                  # Calculator-engine charter, build plan, provenance
    ├── HOSTING.md                  # Cloudflare Worker hosting, deploys, the move from GitHub Pages
    ├── FEEDBACK.md                 # The feedback form and its private inbox
    ├── REFERENCES.md               # Citation ledger — every code/standard cited, with status
    ├── voice.md                    # Recommendation-copy voice & glossary
    └── decisions/                  # Autonomous work system (state, backlog, queue, guide)
```

Notes:
- `/a/`, `/c/`, and `/l/` are the long-term structural homes (not created yet).
- `calculators/index.html` is the built C-0 cover (from `dev`, noindexed);
  the long-term `/c/` home can alias it later.
- On `main` the live pages are the cover, the picker and the converter.
  `dev` carries the cover redesign and the staged calculators and choosers
  (`new-layout` merged in and deleted 2026-10-16). Unpromoted pages keep their noindex.

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
- On `dev`, noindexed, awaiting the operator's taste pass then one-at-a-time
  promotion. Drafting family: `run.html` (Run Solver — the partition tool),
  `scale.html` (**Scale Resolution**, rebuilt 2026-07 on the crossing model),
  `slope.html` (coherence-passed 2026-07), `area.html` (**Material Coverage**,
  2026-07), `tile.html` (**Tile** — Size The Wall / Lay Out The Wall, 2026-07),
  `stairs.html`. Egress family: `occupant-load.html`, `egress-width.html`,
  `exits.html`, `fixture-calc.html` (chained: area → occupant load → width /
  exits / fixtures). Accessibility family: `ramp.html`. Plus the **C-0 cover**
  `calculators/index.html`. Every engine tool carries the shared recents
  component (`assets/js/ui.js`). Governing frame (2026-07-09, suite map):
  **design tools, not construction tools** — pick the dimension so the module
  lands clean; a field calculator's design inverse is our tool.

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

What shipped was a **picker-only launch** on `main`, and the site has since
grown a cover over it. The pages below all exist on `dev`; the MVP is to
promote them as each is ready, not to land them all at once.

### Live now (`main`)
- `index.html` — **AT-0**, the master cover sheet (landed 2026-08-04). Centred
  title bar (no crumb, no sheet stamp — it is the top of the set) carrying the
  wordmark in `--font-mark` as a box that fits it and nothing else, lifted on
  its own shadow and **overlaid** above the page rather than banded inside it;
  it settles from a large title into a mini title once the field scrolls under
  it, and stays. The cover runs on **one content surface** — the sheet's
  background, border and shadow are switched off here, and cards are drawn on
  that surface with hairlines rather than lifted off it. Below the bar, a
  **stack of lists**, one per set (2026-10-13): each list is a title on a
  hairline rule over its own sideways shelf of plates (a tool's drawing over
  its name and one line), with keys at the end of the rule while the shelf
  overflows. The calculators lead, opening on a **featured plate** for the
  Precise Unit Converter at full width — its real figure beside the name, the
  line and three worked inputs that open the converter on them — over a shelf
  of Stairs, Slope, Tile and Scale Resolution, each plate carrying its page's
  own figure. The second list, **What tool to buy or use**, holds the Computer
  Chooser and the three software choosers. Below 820px (2026-10-14) the
  shelves unroll into two-column grids read top to bottom, and a sticky
  category bar with one tab per list does the moving between lists. Adding a tool is one `.cover-card`
  on its list's shelf; a new set is a `.cover-list`.
- `picker.html` — the picker, listed as the **Computer Chooser**.
- `calculators/convert.html` — the Precise Unit Converter (promoted 2026-06-09).
- `calculators/stairs.html`, `slope.html`, `tile.html`, `scale.html` — Stairs,
  Slope, Tile and Scale Resolution, promoted from `dev` 2026-10-13 at the
  operator's ask to show calculators on the cover, with the figure modules
  they load (`stairfig.js`, `slopefig.js`, `partition.js`). Promoted the way
  the converter was: noindex off; Plausible, the light/dark key, and Privacy
  and Feedback in the footer on; **recent readings left out** (`UI.recents`
  stays on `dev`), since `privacy.html#storage` promises the scheme key is the
  only thing a page writes to the browser — bringing recents means rewording
  that section first. Links to pages not yet live are cut: Stairs' crumb
  "Calculators" is a label, and Scale's cross-link to Sheet Sizes waits in a
  comment.
- **Software choosers** (landed 2026-10-08, merged to the lists cover
  2026-10-13), three named live pages in the picker's register, indexed on
  the cover in the **What tool to buy or use** list:
  `pdf-markup.html` (PDF Markup & Review) is filter controls over static
  `<article class="tool">` cards (readable without JS, indexable), then
  short answers and context, with one behaviour, `assets/js/chooser.js`
  (its header is the data-* contract), and one style block, global.css
  "CHOOSER". `bim.html` (2026-10-16, operator: "not a quiz — the only quiz
  is the computer chooser") is information, not a chooser: a timeline of
  product introductions (each year sourced in `data-src`, unpinned years
  marked "c."), a table of the tools today (year, platforms, drawings,
  IFC, Revit files, shared model, price), and a dated, hand-curated space
  to watch. It replaced `bim-platforms.html` and `bim-emerging.html`,
  which are now redirect stubs.
  Platforms are native apps plus "web" as its own platform; web never
  stands in for Windows/Mac/Linux. "Most used"/"Most established" ranks are
  editorial and labelled so. Adequate Design Review is listed on the PDF
  page with a disclosure. Prices are rounded from third-party sources —
  re-check vendor facts when updating.
- Navigation, interim (see SITE_FRAMEWORK "Hierarchy"): every title block
  opens with a crumb — site title linking home, then the set trail as a
  label ("Calculators → Precise Unit Converter"); the cover indexes each live
  tool; each tool's back-link returns to the cover. C-0 was deferred until
  the set had a second shipped tool; it now has five, so C-0 is due (backlog).
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

1. Ship the cover set on `dev`: Slope (base + linker), Drain, Ramp, Roof,
   Tile Layout, the PDF list and the BIM history — see the backlog's
   "product direction" section
2. Operator taste pass over the other `dev` tools + C-0, then promote one at
   a time
3. Replace the draft-tagged code-table values (fixtures ratios; exits'
   single-exit/travel tables) from checked copies — `docs/REFERENCES.md` is
   the ledger and must agree with the page tags
4. Close the provenance loose ends (a neutral preview host)
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
