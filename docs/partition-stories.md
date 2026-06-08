# Even Layout — user stories

User stories for the partition / layout tool (`calculators/partition.html`).
Seeded from the operator's own workflow (2026-06-08): _"I usually go the other
way around — I find the partition length or material-transition location that
gives me whole tiles."_ The shipped tool only does the **forward** direction;
this doc captures the **inverse** and adjacent uses so they can be built and
prioritized.

## The reframe

Every mode rests on one identity:

    run = count·item + gaps·gap + residual

The shipped tool **fixes everything and reports the residual** (the cut, the
slack, the drift). That is one question. But the architect usually has the
opposite one: _the residual is the constraint (zero, or "no sliver"), and some
other term is the free variable I get to choose._ Invert the identity and free a
different unknown:

| Free variable | The move it models | Question it answers |
|---|---|---|
| **run** | move a non-structural wall | what length lays out in whole tiles? |
| **transition position** | place a threshold / expansion joint / finish change inside a fixed total | where does the seam go so the field is whole? |
| **module (item)** | pick the product size | which available tile/panel width divides cleanly? |
| **gap (joint)** | open or tighten the grout line | what joint, within tolerance, lands whole? |
| **start offset** | choose where the field begins | center it, or hide the cut at one end |

Because the engine is **exact integer math on the 1/960 mm lattice**, the inverse
isn't a numeric solve — it's a cheap, exact lattice search. Whole-tile runs are
literally `run_k = k·(tile + joint) − joint` for integer `k`; the tool can list
the candidates around any target and say exactly how far each is from it. The
existing **balanced-ends** output for tiles is already the first step down this
road.

---

## A. Solve for the boundary — the operator's primary workflow

**A1 — Find the run that gives whole tiles ("move the wall").**
As a designer placing a non-structural partition, I want the nearest run lengths
above and below my target that lay out in whole tiles, so I can nudge the wall a
few inches and lose the sliver cut at the edge.
_Free: run. Constraint: residual = 0. Output: the whole-module runs bracketing
the target, the tile count at each, and the distance to move (e.g. "117 1/4" — 2
3/4" shorter — gives 9 whole tiles")._

**A2 — Escape the sliver (the half-tile rule).**
As a tile setter, I want to know when my fixed run forces an edge cut smaller
than half a tile, and the smallest wall move (or start-line shift) that escapes
it, so the perimeter never shows a thin, fragile sliver.
_Free: run or start offset. Constraint: cut ≥ ½ tile. Output: the balanced cut, a
"sliver" flag, and the nudge needed to clear it._

**A3 — Place a transition inside a fixed total ("where does the seam go").**
As a designer who can't move the outer walls, I want to position a threshold,
expansion joint, or material change so the primary zone is whole tiles and the
cut is absorbed at the transition, and I want to see the secondary zone's cut.
_Free: transition position. Output: the position(s) that make the primary zone
whole; flag the position (if any) that makes **both** sides whole._

**A4 — Break a long run into whole-tile zones.**
As a designer detailing a long floor, I want to place expansion joints at no more
than a max spacing **and** on the tile module, so every field between joints is
whole and the joints disappear into the grid.
_Free: number and position of joints. Constraint: each zone whole, spacing ≤ max._

## B. Solve for the module — "pick the size that fits"

**B1 — Which stock size lays out cleanest.**
As a designer choosing a product, I want, for my fixed run, which sizes from a
set (or a min–max range) divide with no cut — or the smallest cut — so I can
specify the size that lays out best instead of fighting the one I picked first.
_Free: module. Output: each candidate size → count and cut, ranked._

**B2 — Open the joint to absorb the cut.**
As a tile setter whose tile and run are both fixed, I want the grout joint, kept
within its allowable range (say 1/8"–3/16"), that lands whole tiles or shrinks
the cut most.
_Free: gap. Constraint: joint ∈ allowed range. Output: the joint width + cut._

## C. Anchor and hide — "where does the layout start"

**C1 — Center the field on a datum.**
As a designer, I want the field centered on the room centerline (or a window, a
door, a fireplace) with equal cuts at both ends, and the cut size, so the layout
reads symmetrically about the feature.
_Free: start offset (centered). Output: the two equal end cuts._

**C2 — Choose which end carries the cut.**
As a designer, I want to compare starting flush at the left, the right, or
centered, so I can put the cut at the least-visible wall or under the casework.
_Output: the cut for each starting choice, side by side._

## D. Coordinate two grids — "make the framing and the sheet line up"

**D1 — Studs under the panel joints.**
As a framer, I want stud/joist spacing at no more than 16"/600 o.c. that also
falls on the 4'/1200 sheet module, so every panel edge lands on a stud and I'm
not adding blocking.
_Free: run or count. Constraint: spacing ≤ max **and** sheet module / spacing is
a whole number._

**D2 — Symmetric balusters.**
As a railing fabricator, I want the rail length (or end-gap treatment) that makes
balusters symmetric about center with a gap ≤ code max, so both end gaps match.
_Free: run or end treatment. Constraint: gap ≤ max, symmetric._

## E. Quantity and ordering — the estimator

**E1 — Count, waste, and boxes.**
As an estimator, I want the piece count including cut pieces, plus a waste %, and
the box/bundle count (tiles come 10/box), so the layout turns straight into an
order.
_Output: pieces, +waste, boxes/bundles._

## F. Tolerance — the field measurement

**F1 — How sensitive is this layout.**
As a designer, I want to see whether a ±1/4" error in the measured run changes
the count or pushes me into a sliver, so I know how tightly to hold the
dimension on the drawings.
_Output: the count/cut across a ± band around the entered run._

---

## Priority (proposed)

1. **A1 + A2 + A3** — the operator's actual workflow; the clear next thing to
   build. One "solve" companion to the forward tool: enter a target (or a fixed
   total) and a tile + joint, get the whole-tile runs / seam positions and the
   move to each. The engine already makes this exact.
2. **C1 / C2** — cheap, high-value, and partly seeded by the existing
   balanced-ends output.
3. **B1 / B2** — needs a notion of "a set or range of sizes."
4. **D, E, F** — real, but a step out (two-grid coordination, ordering, tolerance).

## Open design questions

- **One page or two?** A "Given a run, lay it out" ⇄ "Find the run / seam for
  whole tiles" toggle on `partition.html`, or a sibling page. Leaning toggle —
  same inputs, inverted question.
- **How to present candidates.** A short ranked list of runs/positions with the
  distance-to-target, or a slider that snaps to whole-tile runs. The number line
  / layout strip can mark the whole-tile runs as ticks around the target.
- **Where do product sizes come from** (B1)? A free min–max range is enough to
  start; a curated stock-size set is a later refinement.
- **Scope of the "sliver" rule.** Half a tile is the common convention; make the
  threshold editable rather than hard-coded.
