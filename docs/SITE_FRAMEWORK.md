# architecture.tools — Site Framework

## Core idea

architecture.tools should feel like a **drawing set for architectural judgment**.

The site is not a blog, not a content feed, and not a generic utilities site. It is a structured set of sheets and sheet-like pages that help architects make decisions quickly.

The visual and editorial rules remain:
- drawings lead
- text supports
- recommendations are explicit
- updates are dated
- the graphic language is minimal, black-and-white, precise, and architectural

What has changed is the structure:

The site is no longer one flat A-series. It is now a **set of sets**.

---

## Numbering system

### AT-0 — Master cover sheet
The site-level cover and index for architecture.tools.

This sits above the individual sets and introduces the whole site.

### A-series — Architecture/editorial sheets
Diagram-led editorial pages. Slower-changing, more durable, more opinionated.

### C-series — Calculators
Interactive, quick-answer utility pages.

### L-series — Library / reference
Reference collections and reusable materials: dimensions, blocks, families, standards, naming systems, and similar content.

### Important rule
Not every live page needs a sheet number immediately.

Some current pages can remain named pages until the structure around them is mature enough to absorb them naturally.

---

## What the site is now

The site consists of four content modes:

1. **Master cover** — the site-level entry and index
2. **Editorial sheets** — drawings and judgment
3. **Interactive tools** — calculators and live recommendation pages
4. **Reference libraries** — future browsable, reusable collections

This means the earlier “no interactive tools” rule is retired.

Interactive tools are allowed when they answer a concrete architectural question quickly and clearly. They should still inherit the visual language of the site.

---

## What makes a page feel like architecture.tools

### 1. Drawing first
An architect should be able to scan the page and get the main point from the diagram, matrix, decision tree, layout sketch, or structured comparison before reading the notes.

### 2. Opinionated notes
The notes should not read like a neutral encyclopedia. They should contain judgment.

### 3. Low word count, high density
The site should compress understanding, not expand into essays.

### 4. Honest scope
Where the author has direct knowledge, the page should speak directly. Where outside benchmarking or expertise is needed, say so.

### 5. Visible currency
Each sheet should show when it was last updated.

---

## Structural model

The site should be understood like this:

- **AT-0** — the whole set
- **A-0** — the editorial set cover
- **C-0** — the calculators set cover
- **L-0** — the library set cover

This creates room for the site to grow without abandoning the drawing-set metaphor.

---

## AT-series

### AT-0 — Cover Sheet

**Purpose:**
The master cover for architecture.tools. This is the page that explains the site at a glance and routes visitors to the major sets and flagship live pages.

**Should include:**
- the site title and one-line thesis
- a compact visual index of the sets
- direct access to flagship pages already worth visiting
- update date

**Primary destinations from AT-0:**
- **A-0** — Architecture
- **C-0** — Calculators
- **L-0** — Library
- `picker.html`
- `components.html`
- `site-screen.html`

AT-0 should make the site feel whole even if the numbered sets are still thin.

---

## A-series

The A-series is the durable editorial set.

These are not meant to duplicate live recommendation pages line for line. They should explain stable judgment, decision logic, and the larger conceptual model.

### A-0 — Architecture Set Cover

**Purpose:**
The cover and index for the editorial sheets.

**Should include:**
- sheet list
- short framing note
- diagram-led preview tiles or links

---

### A-1 — Workstation Types + What Matters

This is the key merged sheet.

It replaces the earlier separation between workstation archetypes and performance bounds.

**Purpose:**
Show the main architect workstation types, the kinds of work they actually do all day, and where the next dollar matters for each.

**Drawing:**
A set of workstation archetype diagrams paired with a simple ranked priority stack or bottleneck map.

**Notes should cover:**
- who each type is for
- where CPU, GPU, RAM, storage, or display quality matter most
- what to stop overspending on
- where current live pages should be consulted for actual picks

**Companion live pages:**
- `picker.html`
- `components.html`

---

### A-2 — Monitors

**Purpose:**
A stable editorial page about monitor choice for architects.

**Drawing:**
A DPI / workspace / format comparison chart, with special attention to 5K and 6K displays and text clarity.

**Notes should cover:**
- why 5K and 6K matter
- what is actually worth paying for
- why some OLED options remain questionable for production text work
- what a sensible default recommendation is

---

### A-3 — Mobile First Setups

**Purpose:**
Treat mobile computing as a first-class strategy rather than a compromise.

**Drawing:**
A comparison of desktop-plus-laptop, docked-one-machine, and travel-first setups.

**Notes should cover:**
- ultraportables vs mobile workstations vs gaming/performance laptops vs desktop replacements
- what works for document review, light CAD, heavy modeling, and rendering
- what tradeoffs matter in practice

---

### A-4 — AI in Architecture

**Purpose:**
A clear and skeptical sheet about what AI does and does not currently change for architects.

**Drawing:**
A matrix showing what works today, what is promising but unreliable, and what is mostly marketing.

**Notes should cover:**
- image generation for early ideation
- LLM-assisted writing and scripting
- the weakness of AI-generated construction documents
- why verification matters more, not less
- why current NPUs should not drive buying decisions

---

### Later A-series candidates

These are still valid topics, but they should not all be separate launch sheets.

#### Rendering + Software Notes
The old split between renderer matrix and software commentary should be treated as one topic.

#### Office Data + Backup
The old split between office configuration and data strategy should be treated as one topic.

#### Futures
Keep as a holding area for later thought, not a launch sheet. It risks becoming blog-like unless the ideas become drawable.

---

## C-series

The C-series is a set, not an afterthought.

These pages can be more interactive than the A-series, but they should still feel disciplined, diagram-led, and architecturally framed.

### C-0 — Calculators Cover

**Purpose:**
A set cover and index for the calculators.

**Should include:**
- a short framing note about quick code/math answers
- grouped links to current calculators
- a clear, non-app-store presentation
- optional embedded or previewed calculator modules

### Current C-series pages

- C-1 — Dimension Converter
- C-2 — Slope Calculator
- C-3 — Sheet Sizes
- C-4 — Occupant Load
- C-5 — Stair Calculator
- C-6 — Parking Ratio
- C-7 — Egress Width
- C-8 — Fixture Calculator

The exact file names do not have to change immediately. The numbering is the conceptual structure.

---

## L-series

The L-series is the long-term home for reference material.

### L-0 — Library Cover

**Purpose:**
A cover and index for reusable architectural references.

**Potential future contents:**
- dimensions and clearances
- blocks
- families
- file structures
- file naming
- sheet naming
- model organization standards

The L-series matters now because the site should be organized so these can be added later without rethinking the whole structure.

---

## Flagship named live pages

These remain important and should stay prominent even though they are not yet numbered.

### picker.html
The main live hardware recommendation page.

### components.html
The live current-picks companion page.

### site-screen.html
The site feasibility page.

These are already meaningful destinations. The framework should grow around them rather than forcing them into premature renaming.

---

## Hierarchy

The site no longer has a single flat hierarchy where every page is one numbered sheet in one sequence.

Instead, the hierarchy is:

1. **AT-0** — master cover
2. **A-0 / C-0 / L-0** — peer set covers
3. sheets, calculators, and future library items within those sets
4. named flagship live pages linked prominently from the cover structure

This is still simple. It is just no longer artificially flat.

---

## Build order

Do not attempt to fill every future slot before shipping.

### Immediate priorities
1. Make `index.html` function as **AT-0**
2. Make `calculators/index.html` function as **C-0**
3. Keep `picker.html`, `components.html`, and `site-screen.html` prominent
4. Add a thin **A-0** layer and then grow the A-series gradually
5. Leave room for **L-0** without trying to populate it yet

### First durable A-pages
1. **A-1 — Workstation Types + What Matters**
2. **A-2 — Monitors**
3. **A-3 — Mobile First Setups**
4. **A-4 — AI in Architecture**

That is enough to establish the site’s voice and structure.

---

## Editorial test

Before adding a page, ask:

- Is this durable enough to be a numbered sheet?
- Is it a live utility that should stay named for now?
- Is it reference material that belongs in the future L-series?

If the answer is unclear, prefer the lighter move.

The framework should reduce friction, not add ceremony.
