# Furniture Fit — field scan & dimension provenance

_Research pass 2026-07-19 (multi-agent sweep + adversarial verification; ~30
tool/vendor sources, dimensions.com layout pages fetched directly, every
load-bearing dimension cross-checked against an independent source). This doc
records why the Furniture Fit tool (`l/furniture.html`) is worth building,
what the field looks like, and where every number in `l/lib/catalog.js` comes
from._

## The rule applied: popular paid and niche paid tools are strong signal

Paid density in space-layout software concentrates wherever layout is welded
to a **transaction or a professional deliverable**:

| Segment | Evidence (verified pricing) | What it proves |
|---|---|---|
| Contract furniture spec | **CET (Configura)** $1,075/yr + per-manufacturer extension fees; ~$25M revenue, 200+ manufacturer libraries, de facto mandatory at office furniture dealers. **2020 CAP** $1,995–2,495/user/yr, $15–45k implementations. | Parametric furniture objects with rules and snap logic **is a business** — but Windows-only, four-figure, catalog-locked, weeks to learn. |
| Kitchen & bath | **2020 Design / Winner (Cyncly)** ~$1.2–2.6k/yr, 13k+ K&B clients; **ProKitchen** at roughly half. | Parametric cabinetry tied to ordering retains for decades. NKBA clearance guidance is *taught with* these tools but not enforced as live geometry. |
| Test-fit / feasibility | **TestFit** $100/mo–$8k+/yr. | "Parametric primitives + live constraint feedback instead of drafting" is a fundable thesis — it stops at the building shell. |
| Event / venue | **Social Tables** (~$100M exit to Cvent 2018; Pro ~$150–199/mo), **Prismm/AllSeated** (second Cvent exit, 2025), **Merri** $150/mo niche. | To-scale layout with **spacing as a parameter** (tables regenerate when you change the gap between them) is proven revenue — the best mainstream clearance-as-parameter example, but events-only. |
| Prosumer design SaaS | Coohom $25–29/mo, Foyr $49–199/mo, Cedreo $119–129/mo, HomeByMe $29–72/mo. | A stable $25–130/mo willingness-to-pay band for speed, on fixed-block catalogs. |
| Consumer touch | **Room Planner** ~$7/week top-grossing; **Planner 5D** 120M+ users; **magicplan** per-project $25–40 (10-project monthly minimum). | People pay recurring money for room layout **on touch devices**, even when dimensional precision is bad. |
| Retail planogram | Enterprise: Blue Yonder/RELEX ($100k+/yr). Middle: DotActiv $800–4.5k/yr, Quant $1.3–4.4k/yr. Floor: Nexgen ~$400–700/yr, then SmartDraw templates at $9/mo. | Dimension-true, constraint-checked drag-and-drop (facings, squeeze, overhang) is **paid for at every price level** — and every planogram tool models the fixture while ignoring the floor. |

## The gap (why this tool, why now)

No shipping tool found combines the four properties the Fit tool is built on:

1. **Parametric primitives** — true parametrics exist only in CET and kitchen
   software (SKU-parametric, catalog-locked, desktop). Every consumer tool is
   a fixed-block library. A catalog-independent parametric bed/table/gondola
   primitive does not exist in any tool surveyed.
2. **Clearance-first** — no tool at any price attaches clearance zones to
   furniture as first-class geometry with violation feedback. The near-misses
   prove latent demand: NKBA guidelines drawn in 2020 Design but not enforced;
   Social Tables' banquet spacing parameters; COVID-era 6-foot overlays in
   OfficeSpace/SpaceIQ (since abandoned). Clearance intelligence today lives
   in PDFs (NKBA, Panero/Zelnik, ADA) applied by hand.
3. **Exact dimensions** — consumer tools are dimension-sloppy; exact tools are
   heavy and desktop-bound. Architects doing test-fits still push dumb CAD
   blocks around.
4. **Touch** — precision and touch never overlap today. SketchUp for iPad is
   the lone credible pro-touch precedent and has zero furniture intelligence.

The retail note specifically: fixture + circulation in one lightweight,
tablet-friendly tool at sub-$1k/yr is essentially unserved between SmartDraw
and DotActiv — which is why the gondola run (sections × 48″ module, shelf
depth, facings-per-density) is a first-class block in the first draft, not an
afterthought.

## What dimensions.com's layout pages taught the block design

Fetched directly (bedroom/dining/living/conference/office/restaurant/retail
layout collections + clearance elements):

- **Layouts are parametrized by the anchor object** — bedroom layouts are one
  element per bed size; dining is a (shape × formality × size) matrix mapping
  seat count to a room envelope. Matches the catalog's variant-first design.
- **Clearances are named, additive zones with tiered ranges** — dining
  edge-to-wall 36–60″ decomposed as *sitting* 18–24″ + *circulation* 18–36″;
  office chairs get *static* (18–30″) vs *dynamic* (36–42″) space; open-plan
  rows sit on a 78–96″ pitch containing a 24–36″ passage. Every value is a
  range with tier semantics: **minimum / comfortable / accessible**.
- **The two-drawing convention** — each layout ships a *clearance diagram*
  (footprint + labeled zone bands, dual units) separate from *furnished plan*
  variants. The Fit tool's toggleable hatched zones are this convention made
  live.
- **Arrangement rules stated as guidance** — circulation from bed to door and
  closet; bed not in direct sightline from public space; seating oriented to
  a focal point; TV at 7′6″–14′6″. The wall rules in `catalog.js` (chairs
  step aside, sofa faces away, gondola collapses to single-sided) are the
  first, mechanical members of this family.
- **Retail is their thin spot** — pattern-level guidance only (free-flow,
  counterclockwise travel, eye-level placement); no aisle-width tables. Hard
  numbers come from ADA/trade sources instead, which the catalog does.

## Dimension provenance (what `catalog.js` encodes)

Every load-bearing value was cross-checked against an independent source in
this pass. Highlights (full source list below):

| Value in the catalog | Status |
|---|---|
| Mattresses: twin 38×75 · twin XL 38×80 · full 54×75 · queen 60×80 · king 76×80 · cal king 72×84 | **verified** (Amerisleep/Casper charts; split-king consistency check) |
| Bed walkways: sides 30″ (24″ tight), foot 36″ (30″ tight) | **verified** (dimensions.com 30″ min / 36″ comfortable around non-wall sides) |
| Dining: 6-seat = 72×36; 24″ of table edge per diner; pullout 36″ min / 42″ drawn | **verified** (multiple independent guides converge) |
| Conference: 30″/person; 48″ walk-behind zone, 42″ sit-only, 36″ floor | **verified**; 44″ min for a walked path aligns with IBC corridor logic |
| Cubicles 6×6 / 6×8 / 8×8; panels 42–66″ (53/65 are equivalent manufacturer classes) | **verified** |
| Bench desk 60×30 module (48×24 dense – 72×30 generous); 42″ chair + pass | **verified** |
| Kitchen work aisle 42″ one cook / 48″ two — drawn 48″ | **verified against the NKBA guidelines PDF** |
| Gondola: 48″ sections; base decks 13/16/19/22; heights 54–78; aisle drawn 48″, 36″ ADA floor, groceries 60–84″ | **verified** (Lozier catalog values via DGS Retail; ADA 403.5.1) |
| Facings / linear feet vocabulary | trade-standard planogram terms (facing = one visible unit; linear feet = run × shelves × sides) |

The catalog's rule, matching the suite's: **draw the comfortable tier, state
the minimum in the info line, and never blend the two.**

## What the first draft ships vs what the research suggests next

Shipped (`l/furniture.html` + `l/lib/catalog.js` + `l/lib/fitmath.js`):
parametric objects with size variants and custom dims, clearances as included
snap-and-warn geometry, wall-aware reconfiguration (chair suppression, sofa
orientation, gondola single-siding, dresser warning), gondola density math,
conflicts surfaced not blocked, touch-first canvas.

Next, in research-priority order:
1. **Tiered ranges as the core numeric type** — {min, comfortable,
   accessible} per clearance with a global comfort setting; validation
   reports *which tier* a layout meets instead of pass/fail. (This single
   abstraction reproduces most of dimensions.com's guidance.)
2. **Layout templates** — whole-room blocks (queen bedroom with side/front
   closet variants; sofa-facing-sofa; conference small/medium) assembled from
   catalog objects, matching their classification > collection > element
   hierarchy.
3. **Room-envelope feedback** — live ft² against the published minimum area
   for the placed program (queen set ≈ 106 ft² bed-only, 128–131 ft² with
   closet + desk).
4. **Restaurant/bar blocks** — banquette pitch tiers (12–14″ min / 24″
   privacy), ft²-per-seat by service type.
5. **Door/window objects** on the room boundary, so swing zones join the
   conflict sweep and the bed-sightline rule becomes checkable.

## Sources

Market scan (verified where load-bearing): configura.com, 2020spaces.com /
cyncly.com, testfit.io, socialtables.com, prismm.com, merri.com, coohom.com,
foyr.com, cedreo.com, home.by.me, planner5d.com, roomsketcher.com,
floorplanner.com, magicplan.app, sketchup.trimble.com, ikea.com (Kreativ),
eptura.com, officespacesoftware.com, robinpowered.com, dotactiv.com,
nexgenpog.com, quantretail.com, smartdraw.com, prokitchensoftware.com, G2 /
Capterra / Vendr pricing pages.

Dimensions: dimensions.com (bedroom/dining/living/meeting/office/restaurant/
bar/retail layout collections and clearance elements — full URL list in the
research transcript), amerisleep.com + casper.com (mattresses), cabinfield /
homebaa / hernest (dining), perfectfitliving / lumber2love (clearances),
cubiclebydesign / rochoff / panelsystemsunlimited (cubicles), vision-furniture
/ carlsbadofficefurniture / vari.com (desks), lozier.com catalog + dgsretail
(gondola), corada.com + access-board.gov (ADA 403.5.1), media.nkba.org
(kitchen planning guidelines), wzrack / displayconn (retail aisles),
usmadesupply / buildingcodetrainer (IBC corridor widths).
