# Coverage · Layout · Tolerance — first-pass design

*Claude's synthesis from the 2026-07-09 exploration with the operator. **A first
pass, built to be cut against — not a decision.** Sibling to
`calculator-suite-map.md`; where they disagree, the suite map and the operator
win. Records the thread that started as "what should the area tool be" and ended
at a tolerance-stack engine.*

---

## The spine (first pass)

The suite's real subject isn't conversion, or coverage, or counting. It's
**accumulated tolerance and the ± it produces — the band every nominal tool
rounds away.** Each existing tool is one instance:

| Tool | The chain | The ± it surfaces |
|------|-----------|-------------------|
| Converter | one snap to a grid | the rounding residual (the atomic case) |
| Scale | tape reads across a run | vs. what the drawing holds |
| Coverage / layout | joints across a run / field | ± caliber, ± warpage, ± lippage, cut/offcut |

**Show, don't judge** is the through-line: surface the residual and the band
vividly; withhold the verdict. The converter's rounding display is the model.

### Value proposition (operator, 2026-07-09)
Prior art is **not** disqualifying. "The $40 calculator you bought once — now
free here, and thoughtful" is the pitch. Prior art proves demand; the
differentiation is care plus the show-the-residual honesty, not being first.
Stop treating "someone already does this" as a reason not to build.

---

## The frame — design tools, not construction tools (operator, 2026-07-09)

**This is the organizing principle for the whole suite** (the suite map should
adopt it too). Construction tools like Construction Master Pro **fit a module to
a given dimension and cut the leftover.** We make **design tools: pick the
dimension so the module lands clean.** Same math, opposite direction, different
person and moment:

- **Field (CM Pro):** "I'm at the wall, it's 8'-3½". What do I cut?"
- **Desk (us):** "I'm drawing the wall. What length do I make it so the field
  never has to cut — or cuts comfortably?"

Two consequences that correct earlier notes:
- **We already meet their dimensional arithmetic** — feet-inch-fractions, mixed
  units, expressions, exact-integer math — in `parse-length.js`, as free text
  instead of hardware keys. Arithmetic is table stakes we *already* hold, not a
  battle. The edge is the layout a keypad can't render: arbitrary tile/module
  sizes, arbitrary patterns and combinations, exact cut counts **with blade
  kerf**, the grout tolerance band **drawn**.
- **Every strong field calc has a design inverse — the inverse is our tool.**

### Working backwards — field strength → design inverse

| CM Pro is strong at (field) | The design inverse (our desk tool) |
|---|---|
| Tile / board run — cut to fill a wall | **What wall length gives an uncut run, with slack?** + terminations (bullnose, metal edge, cut-and-lapped end ≈1 tile thick, corner lap). *(L4 below)* |
| Blocks / masonry — count CMU, footings | **What wall length + opening heights are whole-course masonry** (8″ module) so nothing's cut? Horizontal + vertical coursing. *(strong new candidate — architects are taught to design to the block; no free tool inverts it)* |
| Stairs — cut stringers to a measured rise | **What floor-to-floor makes equal risers land in code with a clean run?** *(inverse of the stairs page)* |
| Rafters / roof — cut common/hip/valley/jack | **What pitch + plate height lands a clean ridge and overhang** and keeps sheathing whole? |
| Drywall / paneling — count sheets for an area | **What room / wainscot dimensions land joints on framing and minimize cut sheets?** *(aesthetic panel coursing — the live version of the parked structural thread)* |

They are one principle: **design to the module.** The tile precision-window
solver (L4) and **masonry coursing** are the two strongest, and they sit side by
side.

---

## Waste, unbundled (operator question, 2026-07-09)

There is **no per-cut failure standard.** The industry's 10 % rule (TCNA: 10 %
straight, 15–20 % diagonal/herringbone) **fuses three unlike things into one
fudge.** The honest tool separates them:

1. **Cut waste** — the offcuts that can't be reused. Purely **geometric** — a
   function of the actual layout and pattern. *We compute this exactly* (with
   kerf, with/without offcut reuse) instead of guessing. This is the edge.
2. **Breakage** — a material-brittleness rate, not a cut model: TCNA ~2–5 %
   (1–2 % standard ceramic, 3–4 % porcelain/stone). Applied as a *named* rate,
   cited — never smeared into "waste."
3. **Attic stock** — future-repair reserve, +5–10 %. Not waste at all; a
   **policy choice** the architect sets explicitly.

One clean number becomes three honest ones. Show-don't-judge applied to the
waste line itself — no one else does this. (TCNA Handbook; breakage 2–5 %.)

---

## Coverage and layout are ONE tool that deepens

The old "Area & Coverage" wasn't slack — it was the *shallow end* of a tool that
earns complexity by depth (suite-map rule 1). One node, revealed as you engage.
Proposed rename: **Material Coverage** (reserves "area" as the family's shared
input; egress = area→occupants, FAR = area→zoning, both elsewhere).

**Depth ladder**
- **L0 — Area.** Type a room (chained, L/U, subtract openings) → area in every
  register. The quiet utility. Carries into occupant load (`?d=`).
- **L1 — Coverage count.** ÷ a unit (sheet, tile, box) or a **rate** (paint
  ft²/gal, currently rejected — a real gap) → count, leftover, shortfall, and
  the **unbundled waste** (cut waste computed · breakage cited · attic stock
  chosen — see "Waste, unbundled"), never one 10% fudge.
- **L2 — Linear run.** Tile / plank / carpet run: flush / centered / slide the
  start; the actual cuts, offcut reuse, and the **box delta** (does centering
  cost a box? usually no — two `r/2` end cuts come from one tile if `r ≤ T`).
- **L3 — 2-D pattern surface.** Running bond, herringbone, basketweave,
  pinwheel; **accent banding** (a Greek-key or soldier band cutting through a
  herringbone field); **exact tile counts including and not-including offcut
  reuse.** This is "the $40 tool," done honest and visual.
- **L4 — Precision-window solver (the inverse).** The one the operator would
  have used in practice. Given tile + joint *tolerance range*, solve for the
  **wall dimensions that give an uncut run, with margin.** "Find me a good wall
  size." See below.

Carpet folds in at L2/L3: roll widths (6/12/13/15 ft), seam placement, nap
direction as a layout constraint (offcut can't reverse across the nap).

---

## L4 — the precision-window solver (detail)

The forward tools ([bezruchuk], [Herron], TilePlan) treat the joint as a fixed
nominal and ask "given my wall, where do cuts land?" **Invert it.**

For a clear run `W`, tile face `T`, joint adjustable in `[Jmin, Jmax]`:
- A run of `N` whole tiles spans `L(N,J) = N·T + joints·J`. Sweep `J` and `L`
  sweeps a **window** `[L(N,Jmin), L(N,Jmax)]`.
- March `N`: the windows are **buildable bands** on a ruler of `W`; the spaces
  between are **forced-cut gaps**. Gaps open when the tile is big and the joint
  range tight; small tile / wide joint range → windows overlap (always a
  solution).
- For a target `W`: which `N` lands it in a band, the joint that needs, and —
  the whole point — **how far it sits from the band edges = robustness.** Fat
  middle = the setter absorbs field variation in the joints and never cuts.
  Near an edge = fragile (only works at minimum joint the whole way). In a gap
  = move the wall; show the nearest buildable `W`.

Output is a **ruler of `W`**: uncut bands drawn (fat = forgiving), forced-cut
gaps hatched — slide the shower/wall dimension to a fat band. It steers toward
*slack*, not toward the minimum-joint or maximum-grout solution. Reuses scale's
`renderRun` figure almost directly (the tile chain = grout joints).

### The assembly stack (rough → clear is its own tolerance)
`W` is not the framed dimension. Each edge layer eats the opening and carries a
±: substrate (OSB/ply) → **membrane** (Schluter Ditra / backer) → setting bed →
tile, plus termination and corner conditions. So there are **two stacked
tolerances**: assembly gives `W_clear ± …` from the rough opening, then the tile
run needs `W_clear` in a band. The assembly's ± **eats the robustness margin**
before the first tile. Spec-anchored (ANSI, Schluter data) → citation family.

---

## Tile solver — the edge cases (encode all of these)

The grout joint is not a nominal you set — it's a **tolerance-absorption
device**, and the industry rules say so.

- **Tiles aren't their nominal size.** ANSI A137.1 "caliber" = facial-dimension
  variation. Rectified porcelain < 1/16″; calibrated (pressed) > 5/32″.
- **Joint sized to the variation.** Grout joint ≥ **3× the actual facial
  variation**, plus edge **warpage** (1/32″ warp → 1/8″ joint becomes 5/32″).
  Over-15″ tile: min avg joint 1/8″ rectified, 3/16″ calibrated.
- **Lippage = the vertical ±.** Max 1/32″; **offset capped at 33%** for >15″
  tile (a 50% running bond aligns each tile's center-warp with its neighbor's
  end-warp → lippage). "Mortar base ±" lives here.
- **Kerf.** Each cut eats ~1–3 mm; two cuts from one tile can fall just short —
  the thing that flips a "no extra box" into "one more box."
- **Directional / patterned tile.** The reversed offcut faces the wrong way →
  **no reuse.** Toggles all the offcut math.
- **Pattern waste is real, not a flat %.** Herringbone / diagonal waste 20 %+
  because every course meets the wall at 45° and the triangular offcuts fit
  nowhere; straight lay under 5 %. The tool computes it per pattern, both with
  and without offcut reuse — it does not apply a blanket factor.
- **Box counting.** tiles/box → `ceil(needed_net_of_reuse / per_box)`; show
  whether the layout choice changed the box count (usually not for a single
  run; can for non-reusable patterns).

### Termination & corner conditions (each changes the run length and the edge)
- **Bullnose / finished edge** — a full finished piece consumes its face at the
  end; changes the effective `W` for the field.
- **Metal edge / Schluter profile** — a trim reveal consumes a small, fixed
  dimension (with its own ±) at the termination.
- **Cut-and-lapped end** — the field tile is cut and turns the corner lapping
  the adjacent plane; **cantilever/overlap ≈ one tile thickness** past the
  substrate corner. Offsets the adjacent wall's start by that thickness.
- **Inside/outside corner lap** — one wall's tile laps the other's edge, pushing
  the lapping run off the substrate plane and stealing from the neighbor's `W`.

---

## Structural panel thread — ENCODED, then PARKED

*Operator 2026-07-09: "Let's not make the structural thread." Recorded here so
the thinking isn't lost; **not planned.**_

Same `panelize` engine, a *structural* constraint pack instead of an aesthetic
one. OSB/plywood sheathing on joists/rafters:
- **Strong axis ⊥ supports** — the 8′ dimension spans across the framing; the
  span rating assumes it. Orientation is structural, not free.
- **Joints land on framing, staggered** ≥ 4′ (≥ 2 bays). This *changes the sheet
  count* vs. a pure-area estimate — the thing every plywood calculator misses.
- **Unsupported edge / cantilever** → blocking, T&G, or H-clips. Cited IRC
  R503.2.1.1 (floor) / R803.2.1.1 (roof).
- **Expansion gaps** (1/8″) accumulate across the field.

Prior art here is only `area × 1.10 ÷ 32` calculators — a genuine gap, and
code-anchored — but it's out of scope by operator direction. Leave parked.

---

## Shared component — Recents / history (applies to ALL tools)

Not per-tool bespoke. Build once in `assets/js/ui.js`.
- **A recent = a saved URL/state.** Every tool already serializes to the URL
  (`?d=…&g=…`); restoring a recent restores the whole reading, figure and all.
- **Storage** — localStorage, keyed per tool.
- **UI** — a field-anchored dropdown opened on a ▾ affordance (not on focus,
  which already select-alls). Pinned items on top (cap 5–10), the rest
  scrollable; each row shows the entry and its result.
- Prior art to beat: Construction Master Pro's "paperless tape, last 20
  entries." Ours is pinnable and restores full state, not just a scroll.

---

## Room-dimension hub — candidate calculators

Room dimensions are a hub (the "area is a hub" idea, widened). Good
free-and-thoughtful candidates, filtered by the inclusion test:

| Use | Calc | On-thesis fit | Call |
|-----|------|---------------|------|
| Flooring / carpet | area → count, layout, waste, seams | show real cuts, not 10% | **the merged tool** |
| Lighting count | area × target fc ÷ fixture lumens (lumen method) | show the range + rounding both ways | **strong** |
| Lighting power budget | area × LPD allowance (energy code) | code-cited | good, small |
| Daylight depth | window head height → daylit-zone depth vs. room depth | draw the lit zone, name the rule | **nice, visual** |
| Light & vent minimums | area → required glazing (8 % light / 4 % vent, IBC/IRC) | code-cited, ties to area | good, small |
| Proportion / room feel | plan dims vs. ceiling height → ratios vs. named references | show ratios, cite, no verdict | **delightful** |
| HVAC BTU/ft² | rough load | rule-of-thumb only; real answer is Manual J | **skip** |

Verify the daylight and lumen rules-of-thumb against current sources before
leaning on them.

---

## Prior art / positioning — Construction Master Pro & the Calculated Industries line

**Construction Master Pro** (Calculated Industries, 40 yrs, ~1.1 M app
downloads) owns the *nominal dimensional-math* space:
- feet-inch-fraction ↔ decimal ↔ metric, area/volume, fractions 1/2–1/64;
- right-angle / rafter / pitch (rise·run·diagonal, cheek/level/plumb cuts,
  compound miter, full trig on the Trig model);
- roofing (common/hip/valley/jack rafters, area, squares, bundles, 4×8
  sheathing);
- stairs (risers, treads, stringer, well opening, headroom, angle);
- **materials/coverage = area ÷ sheet (drywall/siding/paneling 4×8/9/12),
  blocks, footings, columns/cones, circular;**
- cost-per-unit, M+ and 3 stores, **paperless tape (last 20 entries)**.

**Material Estimator (4019)** is their tile/flooring-facing sibling: built-in
tile sizes (1–24″) and flooring rolls (6/12/13/15 ft) + sheets → material + cost
with waste. Line also: ElectriCalc Pro, Pipe Trades Pro, HeavyCalc, ProjectCalc.

**What they own (don't compete):** hardware-key speed for repetitive jobsite
feet-inch math, rafter cutting angles, compound miter. These are *field* moves.

**Parity, not deficit, on arithmetic:** `parse-length.js` already matches their
feet-inch-fraction / mixed-unit / expression / exact-integer math — as free
text, not keys. So arithmetic is table stakes we hold, not their moat.

**What they entirely lack (our lane):** they hand you *one nominal number*.
None of them
- show the rounding residual (they round for you),
- treat grout/joint/caliber as a **tolerance** or accumulate it across a run,
- do layout / pattern / offcut / box optimization (coverage = area ÷ sheet),
- unbundle waste (cut waste vs. breakage vs. attic stock),
- invert to "**what dimension builds clean**,"
- show the **trust band** on a scaled read.

Positioning: we are its **mirror image** — not a worse construction calculator,
but the **design tool** that decides the dimensions their field tool executes,
with the layout rendered and the waste told honestly in three parts.

---

## Open questions — resolutions as of 2026-07-09
1. ~~Merge or split~~ — RESOLVED: `tile.html` ("Tile") is its own page with
   verb-named tasks (Size The Wall · Lay Out The Wall); L4 lives there, L3
   (pattern surface) stays split until it earns folding in. Material Coverage
   stays the counting tool.
2. ~~Solver name~~ — RESOLVED: the page is **Tile**; the solver is its
   **Size The Wall** task. ("Precision Window" retired — too narrow a door.)
3. ~~Recents placement~~ — RESOLVED: field-anchored dropdown, shipped on every
   engine tool (`UI.recents`).
4. Which room-dimension calcs make the first cut (lumen · daylight ·
   proportion)? — OPEN; rules need verification first.
5. ~~Rate divisor~~ — RESOLVED: shipped in Material Coverage.
6. **Masonry / module coursing** — OPEN. Its own "design to the module" tool,
   or a preset of the tile/run engine? Strong candidate, no free tool inverts it.
7. ~~Adopt the frame~~ — RESOLVED: design-vs-construction is now the suite
   map's top-level frame.

[bezruchuk]: https://bezruchuk.com/shower-tile-layout-tool/
[Herron]: https://herron.app/tools/tile-layout-planner
