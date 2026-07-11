# Pattern surface — the editor toolset, cataloged not guessed

*2026-07-09. Answers the operator's question: can we enumerate the standard 2D
editing vocabulary systematically instead of discovering tools one by one?
Yes — three closed, documented lists cover it. Companion prototypes in
`calculators/proto/`.*

---

## How to catalog without guessing

1. **Autodesk's command reference is a complete, official index** (help.autodesk
   .com lists every command A–Z per release). The full set is ~1,000 commands,
   but the 2D core is a small curated subset with an authoritative curation
   already done: **the classic Draw / Modify / Object Snap toolbars** — those
   toolbar sets are Autodesk's own answer to "which of these matter daily."
2. **The Drafting Settings dialog enumerates the precision aids as closed
   lists** — object snap modes, polar tracking angles, grid/snap. Nothing to
   discover; the dialog *is* the catalog.
3. **The hatch-pattern definition format (.PAT) is the documented prior art**
   for pattern *data* — worth reading precisely so we can reject it (below).

So the method: take the Draw and Modify toolbar sets + the Drafting Settings
enumerations, map each entry to adopt / adapt / skip for our domain. That's the
whole space; anything else is niche.

## The catalog, mapped to the pattern surface

### Precision aids (Drafting Settings — closed lists)

| Standard tool | What it is | Ours |
|---|---|---|
| Grid + Snap | cursor locks to a spacing | **ADOPT** — snap to a dimension grid (1", 1/2"…) |
| Object snap: **Endpoint** | lock to corners | **ADOPT** — tile corners |
| Object snap: **Midpoint** | lock to edge midpoints | **ADOPT** — tile edge midpoints |
| Object snap: **Intersection** | lock to crossings | ADAPT — cell-edge crossings |
| Object snap: **Extension** | track along an edge's extension | **ADOPT** — course lines continue |
| Object snap: **Perpendicular / Parallel** | constrained directions | ADAPT — we're orthogonal + 45°, so this collapses into polar tracking |
| Object snap: Center / Geometric Center / Node / Quadrant / Tangent / Nearest / Insertion / Apparent | circle/curve/3D aids | SKIP — no curves in a tile field (v1) |
| Polar tracking | lock movement to set angles | ADAPT — 0/90/45 only |
| Object snap **tracking** | align to a snap point in one axis | **ADOPT** — this is "line it up with that course" and it's the one that makes an editor feel right |
| Construction lines (XLINE) / **guides** | infinite reference lines | **ADOPT** — draggable H/V guides |
| Ortho | constrain to H/V | ADOPT (drag behavior) |
| Dynamic input / coordinate readout | numbers at the cursor | ADOPT — live offset readout in real units |

**The domain twist that no CAD has:** our snap offset is not zero — adjacency
means *tile edge + joint*. "Snap to that tile" places the new tile one JOINT
away. The joint is the kerf of this editor; every snap mode above gets a
joint-aware variant. That one idea is most of the editor's intelligence.

### Draw toolbar (the classic set)

LINE, PLINE, CIRCLE, ARC, RECTANG, POLYGON, HATCH, …
→ We draw exactly one thing: **a rectangle of a cataloged tile size** (plus a
cut region for bands). SKIP everything else. The palette replaces the Draw
toolbar.

### Modify toolbar (the classic set)

| Standard | Ours |
|---|---|
| MOVE | **ADOPT** — drag with snaps |
| **COPY** | **ADOPT** — duplicate, joint-aware |
| **OFFSET** | ADAPT — becomes "next course" (offset by tile + joint) |
| **ARRAY** (rectangular / path / polar) | **ADOPT** rectangular with joint spacing — this is "lay a course / fill a row"; SKIP polar & path (v1) |
| **MIRROR** | **ADOPT** — herringbone's other hand |
| ROTATE | ADAPT — 90° / 45° steps only |
| ERASE | ADOPT |
| TRIM / EXTEND | SKIP in the editor (tiles aren't trimmed in a pattern *definition*) — trimming is the **layout** engine's job (cuts at boundaries and bands), computed not drawn |
| SCALE / STRETCH | SKIP — tile sizes are cataloged, not sculpted |
| FILLET / CHAMFER / BREAK / JOIN | SKIP — no curves, no sculpting |
| UNDO / REDO | ADOPT (table stakes) |

### What the catalog says about scope

The adopted set is small and closed: **grid snap · corner/midpoint/extension
snaps (joint-aware) · snap tracking · guides · polar 0/90/45 · move / copy /
array / mirror / rotate-90 / erase · undo**. That's a buildable editor. The
sophistication the operator sensed is real but bounded — it's these ~12
behaviors done well, not an open-ended CAD.

---

## Beyond AutoCAD — the reuse/parametric layer (operator catch, 2026-07-09)

AutoCAD's toolbars catalog *direct-manipulation drafting*. CATIA and NX
formalize a second layer above it — templates, parameters, and instance
control — and a pattern editor lives mostly in THAT layer. Same method
applies: each is a closed, documented feature set in the vendor's own docs
(CATIA's Product Knowledge Template guide; NX's Pattern Feature options page).

| Construct | What it actually is | Ours |
|---|---|---|
| **CATIA PowerCopy** | white-box template: geometry + literals + formulas + constraints, instantiated against *declared inputs*, editable after | **ADOPT the declared-inputs idea** — see "parametric definitions" below |
| **CATIA UserFeature (UDF)** | the same as a black box: only author-exposed parameters visible | ADAPT — our *presets* are sealed UDFs; an editor-made definition is a PowerCopy |
| CATIA catalogs / NX Reuse Library | the template library mechanism | ADOPT eventually — the pattern library page |
| **NX Pattern Feature** | layouts (linear/circular/polygon/spiral/along/**boundary fill**) with per-instance **clocking, suppression, variance**, increments by expression, spreadsheet-driven points | **This is our layout engine's formal spec.** Boundary fill = the field; per-instance suppression = the niche/outlet cut-out; variance = the accent tile swapped into the field; clocking = one rotated instance |
| **NX Expressions** | a named-parameter table driving all geometry | **ADOPT** — one parameter set (tile L, S, joint J) the whole definition references |
| NX suppression expressions | conditional existence by formula | SKIP v1 — per-instance suppression covers the real cases |
| Sketch constraints (ACAD parametric / SolidWorks) | *persistent* relationships (aligned, equal, symmetric) vs our *transient* snaps | ADAPT lightly — see open question 4; a full solver is overkill |
| **Wallpaper groups (mathematics)** | the closed catalog of 2D periodic symmetry — exactly 17 | **ADOPT as a symmetry mode** — place one tile, the group places its mirrors/rotations; pinwheel and herringbone become one-tile definitions |
| Illustrator pattern editor | grid/brick/hex tile modes, overlap rules, edit-in-context preview | UX prior art for the editor (our ghost tiling = its edit-in-context) |
| Revit curtain grids / repeat detail | a grid system driving panelization | rhymes with the layout engine; nothing new to import |

### Nodes vs templates (operator question, 2026-07-09)

PowerCopy/UDF are **not** node-based — they're history-tree captures, the
dataflow hidden inside the feature tree. That hiding is where their
overcomplication lives (reference re-binding, "use identical name" hacks,
black-box instantiation failures). Both vendors later shipped genuine
Grasshopper-style node systems (CATIA Visual Scripting / xGenerative Design;
NX Algorithmic Modeling) — the industry conceding that the graph should be
visible. But a node canvas earns its complexity only when the graph
**topology varies per problem** (Grasshopper's domain). Ours is fixed:
params → placements-as-expressions → cell → boundary fill → exceptions →
counts. **Decision: present the fixed graph as a form + layer list**
(Photoshop's move), keep the dataflow honesty in the data (declared inputs,
expressions), adopt neither history capture nor a node canvas. The
definition JSON is already a graph serialization, so a node view remains a
possible later layer for power users without a model change.

**Refinement (operator, 2026-07-09): the cluster lesson.** Grasshopper's
groups/clusters dissolve the spaghetti objection — collapse for
cleanliness, enter or explode for control, lossless both ways. So
spaghetti is NOT the load-bearing argument against a node canvas; fixed
topology is. What clusters add is a REQUIREMENT on our model: a
**disclosure ladder, lossless in both directions** —
chip ("herringbone 3×6") ⇄ form (declared parameters) ⇄ placement list
(the exploded cell, editable) — every rung opens into the one below and
re-seals into a named definition above. CATIA's UDF gets this wrong
(one-way, license-gated sealing); clusters get it right. The editor
prototype already walks the ladder crudely (seed → edit → JSON → load);
the real build treats round-tripping as a contract, and EXPLODE joins the
adopted vocabulary.

**The two imports that change the architecture:**

1. **Parametric definitions (the PowerCopy lesson).** The prototype's JSON
   bakes inches; a definition should *declare inputs* (tile L × S, joint J)
   and store placements as expressions of them — then one "herringbone"
   instantiates for any tile, and changing the joint re-flows the cell. The
   layout prototype's generators already work this way (they take `g`); the
   editor's output doesn't yet. That's the v2 data model.
2. **Instance-level exceptions over the procedural field (the NX Pattern
   Feature lesson).** The field is generated, but real walls have a niche,
   an outlet, a feature strip: suppress this tile, swap that one, rotate
   one. The layout tool needs a per-instance override list on top of the
   generator — that's the difference between a pattern picture and a layout
   document.

---

## Architecture: two tools, one data model

**Editor and layout are separate pages** (operator call, confirmed by the
catalog: the editor needs interaction machinery; the layout needs clipping and
counting — almost no overlap).

1. **Pattern editor** — define a *repeat cell*: cell size + tile placements
   (size, position, rotation), joints implied by spacing. Output: a pattern
   definition (JSON).
2. **Pattern layout** — a surface (wall/floor) + a field pattern + optional
   **band regions that cut through** (each with its own pattern). The engine
   tiles the plane from the definition, clips to regions, and counts: whole
   tiles, cut tiles, and the two honest buy-count bounds (perfect offcut reuse
   = area bound; no reuse = wholes + one tile per cut).

### The data model — and why not .PAT

AutoCAD/Revit hatch patterns are **line-family** definitions (angle, origin,
offset, dash arrays): perfect for drawing stripes, useless for counting tiles —
a line family doesn't know what a "tile" is. Our unit must stay the tile, so
the model is a **translational repeat cell**:

```json
{ "name": "herringbone-3x6",
  "cell": { "w": 9, "h": 9 },
  "joint": { "min": 0.0625, "nom": 0.125, "max": 0.1875 },
  "tiles": [ { "w": 6, "h": 3, "x": 0, "y": 0, "rot": 0 },
             { "w": 6, "h": 3, "x": 4.5, "y": 3.125, "rot": 90 } ] }
```

Tiles may cross the cell boundary (they wrap — the cell is a torus); the
joint carries the min/nom/max range so the tolerance thesis survives into 2D.

**Units (decided 2026-07-09, refined per the operator's rectilinear-ints
idea): the engine's 1/960 mm exact integers, with transforms stored
SYMBOLICALLY.** Shapes are axis-aligned integer rectangles in their own
frame, always; a placement's transform is metadata — translation as ints,
rotation as the tag 0/90/180/270, a field-level 45 where the layout rotates.
No √2 is ever stored or computed:

- Cell, joint, tile, placement values: integer units. Orthogonal layouts
  clip on axis-aligned edges → whole/cut classification and cut widths are
  **exact integer ranges** (tile.html's arithmetic in 2D, no epsilon).
- **45° is exact too.** Keep √2 symbolic and the rotation that matters is
  the integer matrix [[1,1],[−1,1]] (world ints → ints in the √2-scaled
  field frame). Every incidence test compares a vs b√2, both ints — decided
  exactly via a² vs 2b². Formally, coordinates live in **Z[√2]**: a value is
  the int pair (a, b) meaning a + b√2 units — a ring, closed under add and
  multiply, exact sign tests. Orthogonal work keeps b = 0 and *is* today's
  integer engine; only 45° fields populate b. (Hex/30-60 would be Z[√3],
  same pattern — out of scope.)
- Floats survive only at the **display boundary** (printing k√2 costs one
  multiplication at format time — the NumberLine precedent) and in dividing
  placement expressions (u/3 quantizes to the nearest unit and is REPORTED,
  the scale-page precedent).

The prototypes deliberately run float inches for speed and say so on-page;
the real build does not. This supersedes the earlier note that 45°
classification would be honest float — it doesn't have to be.
Overlap of two *placements* is a validation error the editor shows, not
prevents (show, don't judge).

### Prototypes (calculators/proto/, noindexed, unlinked)

- `pattern-editor.html` — the repeat cell with ghost tiling, palette, joint-
  aware snaps, guides, array/mirror, live JSON.
- `pattern-layout.html` — presets (stack, running bond 1/2 & 1/3, herringbone,
  basketweave) over a surface, draggable origin, an accent band cutting
  through, whole/cut counts with the two buy bounds.

Open questions for the operator after playing with the protos:
1. Does the editor earn its complexity, or do cataloged presets + parameters
   (offset %, orientation) cover real work?
2. Band model: horizontal bands only (v1) or arbitrary rectangles/borders?
3. Where does offcut reuse live — layout page or Material Coverage?
4. Constraints vs snaps: is the parametric re-flow (change J, the cell
   re-solves) worth placements-as-expressions, or is module-unit storage
   (positions in multiples of tile+joint) the right 80%?
5. Symmetry mode: worth building the wallpaper-group operations, or do the
   seeded patterns cover what architects actually spec?
