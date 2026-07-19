# CAD Basis — the exact kernel (`cad/lib/`)

_First draft 2026-07-19, alongside a research pass over exact-geometry
practice (CGAL, Shewchuk, snap rounding, Clipper2, CATIA templates). The
kernel is four pure modules + a live demo page (`cad/index.html`). 102 inline
tests. This doc records the architecture, how the research validates it, and
the deliberate deviations + roadmap._

## What it is

The calculator engine holds one number exactly and shows the residual when
it rounds. The CAD basis lifts that contract to geometry:

| Module | Contract | Tests |
|---|---|---|
| `rat.js` | exact rationals (BigInt n/d) over the engine lattice; `toLattice(x, grid, dir)` returns the snapped integer **and the exact remainder** — `x = units + rem` is an identity, `exact` is a fact. Rounding policy parity with `snap.js` proven by test, not presumed. | 29 |
| `plane.js` | exact points + affine transforms. Rotation = **rational half-angle tangent** t (cos = (1−t²)/(1+t²), sin = 2t/(1+t²)): every rational t is an exact rotation, t=1 is exactly 90°, t=1/3 is the 3-4-5 rotation. Arbitrary angles are captured **once** as a rational t (continued-fraction, denominator ≤10⁶ → error <3·10⁻⁵ deg) and exact forever after — the 2D twin of parse-length's parse-time quantization. 100 composed transforms invert to bit-identical. | 19 |
| `geom2.js` | exact predicates & constructions: `orient` is a true sign, `segseg` returns the exact intersection (substitute it back: orientation is 0, not 1e−13), point-in-polygon has a real `edge` answer, `bboxLattice` rounds outward with remainders kept. | 27 |
| `model.js` | the drafting operations as **parametric nodes**: `insert` (the powercopy: template with declared inputs), `array` (exact per-instance parameter **tweens**), `fitArray` (the tile module generalized to rationals — same count identity and same `item-exceeds-run` reason code as `partition.js`, proven equal in tests), `hatch` (scanline family clipped exactly; every endpoint **exactly on** the boundary; partial edge bands reported as residuals). | 27 |

`cad/index.html` demos all three node families live with parse-length input
and a live watertightness check (n/n endpoints exactly on the boundary).

## How the research validates the design

The exact-geometry sweep landed on the same architecture from the literature:

- **Hybrid representation is the recommendation** — integer lattice as the
  authoritative store, rationals only for derived values (intersections,
  tween values, rotated images), snap-with-remainder as the only way back.
  CGAL's EPICK/lazy-EPECK split, Clipper2's int64 core, and snap rounding
  all point here. That is exactly the split: `calculators/lib` + catalog/
  fitmath stay pure integer; `cad/lib` holds the rationals; `toLattice`
  is the bridge.
- **Snap rounding (Hobby; Guibas–Marimont) is the formal backbone of "late
  conversion with held remainders"** — round exact arrangements to a lattice,
  topology preserved, no point moves more than half a unit, and the residual
  is precisely what we keep. Clipper2 rounds intersections immediately and
  *discards* the residual — the documented reason its output degrades and
  needs cleanup passes. Ours is "Clipper2 plus a conscience."
- **Niven's theorem draws the rotation line** — only quarter-turns have both
  sin and cos rational among nice angles; rational points are dense on the
  circle via the half-angle parametrization. Store rotations as exact
  rationals, never as radians. Mainstream CAD doesn't try: AutoCAD's own
  guidance admits every ROTATE/OFFSET/MIRROR bakes in a micro-gap, and its
  fuzz knobs (HPGAPTOL, PEDIT fuzz) exist to paper over it. **No tolerance
  settings exist in this kernel because none are needed.**
- **Predicates are cheap, constructions are the cost** — orientation on
  lattice input is exact by construction (degree-2 integer polynomial);
  cascaded constructions grow bits. The EGC literature's answer is a depth
  policy, not faster arithmetic (below).
- **CATIA's two template semantics** — PowerCopy (white-box: recipe copied,
  editable, no link) vs UDF (black-box: one typed node, published params
  only). `model.js`'s `insert` is the shared core: declared inputs, checked
  at instantiation. Per-instance parameter **tweens** across arrays are our
  extension — CATIA has no graded instantiation; Grasshopper's per-index
  data mapping is the nearest prior art. Exactness makes tweens
  reproducible: p_i = from + (to−from)·i/(n−1) is an exact rational, so
  regenerating with a different N never drifts.

## Deliberate deviations & their limits (recorded, not hidden)

- **Eager normalization.** `rat()` reduces by gcd on every construction.
  The research recommends lazy normalization (reduce on compare/serialize/
  threshold) plus cached float64 mirrors for hot paths, because V8 BigInt is
  ~10–30× slower than Number and allocation-heavy. Right call at production
  scale; at first-draft scale correctness-first wins. The switch is internal
  to `rat.js` — no caller changes.
- **Float in two sanctioned places.** `toNumber()` for rendering (documented
  display-only exit), and `halfTanForDegrees()` at the input boundary (the
  one-time quantization). `dining-round`'s chair angles in the catalog also
  use float for *placement of whole chairs* — positions are quantized to
  integers immediately; nothing downstream computes on them.
- **No lazy-DAG constructions yet.** Intersections return materialized
  rationals; a construction-of-constructions chain grows bits. Fine at
  draft scale; the depth policy below is the planned guard.
- **jsdom/browser parity**: modules are UMD and identical headless/browser,
  same as the calculator engine.

## Roadmap — the Autodesk set as nodes

Ordering follows the research's dependency analysis:

1. **Interval-on-curve** — the piece that makes the graph re-evaluable:
   TRIM/EXTEND/FILLET/BREAK all reduce to "curve + exact parameter
   subinterval bounded by intersection events," so the parent curve survives
   and the trim re-evaluates when cutters move. Build before any of the four
   commands it unlocks.
2. **Depth policy in the type system** — LatticePoint vs RatPoint as
   distinct types; RatPoint→LatticePoint only via snap-with-remainder. Makes
   bit growth structurally impossible instead of monitored.
3. **OFFSET node** — lattice-parallel offsets stay on-lattice; general
   offsets produce rational feet held as remainders.
4. **MIRROR about rational-direction lines** (always exact), **polar/path
   arrays** on the tween machinery, **dimension nodes** that read exact
   geometry and format through the engine's residual-exposing rounding — a
   dimension can honestly render "≈ 25.400 (+1/960 held)".
5. **Blocks = sealed templates** (the UDF semantics next to insert's
   powercopy semantics), with auto-binding by port name for one-tap
   instantiation over a selection.
6. **Snap-rounded export** — DXF/SVG output runs `toLattice` at the
   requested precision and sums |remainders| into a per-export exactness
   report: the feature no other CAD can print.
7. **Static float filter** — with document extents bounded (range check per
   document, not per call), degree-2 predicates are provably exact in
   float64 below 2^26; add the fast path when profiling says so.
8. **Touch front end** — the interaction language is specced in
   `touch-cad-ui.md`; the keypad and marking menu land on the demo page
   first.

## Relationship to the engine contracts

`calculators/lib` is untouched. The kernel is a **new lineage** beside it:
same conventions (UMD, pure, fail-loud on programmer error, stable reason
codes on flagged domain states, inline tests), one documented extension —
BigInt, because exact transforms overflow any fixed range in intermediates.
The two lineages meet only at `toLattice`, whose policy parity with
`snap.js` is enforced by the parity test in `rat.js` (`node rat.js` fails if
they ever diverge).

## Sources

CGAL manual (exact kernels, Filtered_kernel, Lazy_exact_nt; Pion & Fabri
2011) · Shewchuk, Adaptive Precision FP Arithmetic & Fast Robust Predicates
(CMU-CS-96-140); mourner/robust-predicates · Hobby; Guibas & Marimont (snap
rounding); Halperin & Packer (iterated); Hershberger (stable; SoCG 2025
cautionary tale); Devillers et al. (inner/outer rounding) · Niven's theorem;
arXiv:1707.08549 (rational points on the circle) · Clipper2 docs (int64
core, 62-bit rule, degradation note) · Autodesk: large-coordinates guide,
HPGAPTOL/PEDIT fuzz docs, associative arrays; LibreCAD #1524, QCAD #2685 ·
CATIA PowerCopy/UDF methodology docs · V8 BigInt blog; tc39 proposal-bigint
#117 · Chen Li NYU thesis (EGC); Funke et al. SoCG'98 (cascaded
computation).
