# architecture.tools — Calculator Suite Map
*Working draft. Built to be cut against, not committed to.*

---

## Two rules that govern the whole graph

**1. A node is a page with a shared input model.**
Breadth = a genuinely new input model (a new node). Depth = more output squeezed from inputs you already collect (same node, richer). Boxes-on-the-tile-page is depth. A separate occupant-load page is breadth.

**2. Inclusion test — a calc earns a place only if it either:**
- (a) serves a real personal / professional need, **or**
- (b) introduces a *primitive* that is load-bearing for the technical destination.

Anything that's only topic-adjacent with no primitive payoff gets cut. This is what keeps "comprehensive" from sliding back into 25-calc sprawl.

---

## The primitive layer (infrastructure, not calculators)

The trunk. Calcs are leaves that consume these. Each node below is tagged by what it **consumes** and **introduces**. Architecturally this mirrors your two-file instinct: shared primitive modules + one data file per page.

| ID | Primitive | Born from | Consumed by |
|----|-----------|-----------|-------------|
| P1 | Parser (mixed units + math expressions) | Converter ✅ | everything |
| P2 | Exact integer engine (1/960 mm) | Converter ✅ | everything dimensional |
| P3 | Snap / fraction module | Converter ✅ | run solver, stairs, scale |
| P4 | Min/max display (round up + down at a glance) | Converter ✅ | run solver (sliver), egress, stairs |
| P5 | Module-run fit (repeating module into a span → count + remainder) | Run solver | tile, studs, balusters, grid, pavers |
| P6 | Constraint-division (split span into equal parts each within [min,max]) | Stairs | stairs, egress sizing rhymes with it |
| P7 | Ratio / scale | Scale calc | ramp, pitch |
| P8 | Angle / slope | Slope calc | ramp, roof pitch, grade |
| P9 | **Area takeoff** (chained rooms, L/U shapes, subtract openings) | Takeoff calc | occupant load, FAR, all quantity, envelope WWR |
| P10 | Code-citation / edition-pill pattern (lookup + cite + version) | Stairs | every code calc |
| P11 | Material data layer (identity-keyed dimensional + property schema) | Material layer | run solver, assembly R/U, eventual CAD |

**Two keystones:** P9 (area takeoff) feeds three products — the calc suite, material quantity, and the eventual CAD pricing. P11 (material identity) is the one decision that keeps the CAD product un-foreclosed. Build both early and well.

---

## The families (nodes)

Status key: ✅ done · ▶ first pass · ◷ later depth · ⊘ deferred · ✕ out of "complete"

### 1 · Geometry & drafting primitives (~6–7 pages)
*Bounded math, daily use, and where the reusable engine lives.*

| Node | One-line scope | Consumes | Introduces | Status |
|------|----------------|----------|------------|--------|
| Converter | Exact unit conversion w/ min/max + snap | — | P1–P4 | ✅ |
| **Run / module solver** | Fit a repeating module into a span → full count, remainder, edge cut, sliver flag. Presets: **tile (flagship)**, studs, balusters, ceiling grid, pavers | P1–P4 | P5 | ▶ |
| Scale & drawing | Drawing scale ↔ real dim, measure-at-scale | P1,P2 | P7 | next |
| Slope / pitch / grade | Rise·run·%·°·ratio, roof pitch | P1,P2 | P8 | next |
| **Stairs** | Equal risers within code limits, 2R+T, IBC/IRC. *The bridge node.* | P1,P2,P6 | P6,P10 | ▶ |
| **Area takeoff** | Chained / L / U rooms, subtract openings → area + perimeter. *Keystone.* | P1,P2 | P9 | early |
| Triangle / squaring | 3-4-5, diagonal check, area-from-sides | P1,P2 | — | open |

### 2 · Egress & life safety (~4–5 pages)
*All consume area + the cite pattern; mostly content once those exist.*

| Node | Scope | Consumes | Status |
|------|-------|----------|--------|
| Occupant load | Area ÷ OLF table. *First real code calc.* | P9,P10 | after takeoff |
| Egress capacity & width | Required width = OL × factor; doors vs stairs | OL,P10 | ⊘→ |
| Exits & arrangement | # exits, separation, travel, common-path, dead-end (likely one page) | OL,P10 | ⊘→ |
| Plumbing fixtures | Fixture counts by occupancy (IBC 2902 / IPC) | OL,P10 | ⊘→ |

### 3 · Building size & type (~2–3 pages)
| Node | Scope | Consumes | Status |
|------|-------|----------|--------|
| Construction type + allowable area | Type I–V; frontage + sprinkler stacking | P9,P10 | ⊘ |
| Allowable height & stories | Often merges with above | P10 | ⊘ |
| Fire separation distance | FSD → allowable openings / rating | P10 | ⊘ |

### 4 · Accessibility (~2–3 pages)
| Node | Scope | Consumes | Status |
|------|-------|----------|--------|
| Ramp & slope | ADA running/cross slope, length, landings. *Nearly free after slope.* | P8 | cheap |
| Clearances & turning | Turning circle, T-turn, clear floor space | P1 | ⊘ |
| Accessible counts | Accessible parking / units / fixtures | P10 | ⊘ |

### 5 · Envelope & energy (~2–3 pages, partial scope)
| Node | Scope | Consumes | Status |
|------|-------|----------|--------|
| Assembly R / U | Layered buildup → R/U value | P1,P11 | ⊘ |
| Window-wall ratio | WWR | P9 | cheap |
| Prescriptive compliance | IECC climate-zone checks (heavy) | P10 | ⊘ |

### 6 · Material (data layer + quantity depth) (~2–4 pages)
| Node | Scope | Consumes / Introduces | Status |
|------|-------|------------------------|--------|
| **Material data layer** | Identity-keyed dimensional + property schema. *brickdims, generalized. Labor out, pricing deferred to CAD.* | introduces P11 | foundational |
| Quantity calcs (concrete, paint, drywall, flooring, framing) | Area/volume → quantity + waste + boxes | P9,P11 | open / mostly ✕ |

> **Tile is not a node here.** It lives in Family 1 as the run-solver flagship. Its material depth — pieces-per-box, coverage area, eventual layout/cutting view — is **depth on that node**, not a new page. (See depth ladder below.)

### 7 · Zoning (~0–4 pages) — danger zone
FAR · coverage · setback · height · density · parking. Jurisdiction-by-jurisdiction, no single national code, brutal verification, primitives don't transfer. **Default ✕ — out of the "complete" definition.** Any zoning calc is a bonus, never a gap.

---

## Depth ladders (the ◷ later-layers, logged not built)

**Tile node**
1. ▶ Run + sliver alert + **grout-relaxation-to-whole-tile** (with the 3× lot-variance / ANSI A108.02 spec check — the part the layout tools don't do)
2. ◷ Boxes / coverage / waste (cheap material-layer add)
3. ◷ Layout + cutting view (heavy rendering, much later)

**Area takeoff node**
1. ▶ Single rectangle
2. ◷ Chained + L/U shapes
3. ◷ Subtract openings

---

## Build sequence (momentum + track-laying)

1. **Tile run** — now. Personal need, tests the calc shell. It's a *leaf* (high reuse, zero new leverage) — ship it, don't expand it into 25 tile calcs.
2. **Stairs** — the bridge. Drafting-calc on the surface; secretly your first technical calc. Introduces constraint-division **and** the code-citation/edition-pill pattern on low-stakes, settled math.
3. **Scale + slope/pitch** — cheap, high-use; introduce ratio + angle. Ramp & roof pitch then come nearly free.
4. **Area takeoff** — the keystone primitive.
5. **Occupant load** — first "real" code calc, now just area ÷ table.
6. **Egress width + plumbing fixtures** — consume occupant load → content, not engineering.

FAR / setback held for last (or never).

---

## Scope boundaries — the explicit cuts

- **The line is material vs. labor**, not estimating vs. not. Quantity, boxes, waste, material cost → **in**. Installation labor, crew time, productivity, means-and-methods → **out** (GC territory).
- **Material is in as a data layer** — identity-keyed, sized to current consumers (run solver, takeoff, envelope), prototyped by brickdims. Pricing is **deferred** to the CAD product; the only forward-compatible decision now is stable material identity.
- **Zoning is out** of "complete." Bonus only.
- **Most quantity calcs are off-brand** (DIY/GC flavor). Tile earns its place by personal need; the rest are case-by-case, not assumed.

---

## Size of the completed graph

| Definition | Pages |
|------------|-------|
| Core (families 1–4) — the on-brand spine | ~14–18 |
| + Envelope + material layer | ~20–25 |
| + Zoning / full estimating | ~35 |

**~20–25 is the target.** It's the size of a drawing set — bounded, finishable, on-metaphor. Small enough that "comprehensive coverage" becomes something you can actually *fill*, not just assert. The single biggest lever on this number is **how hard you generalize primitives** (run solver = 6 topic-calcs collapsed into one node), not how many topics you add.

---

## Color identity

**The system is a family, not a single identity.** The picker (ink) and converter (blueprint) are both resolved and *can't be bridged* — and that's the finding, not a problem. They don't sit on one scale because they're different **tool genres**: the converter is a dimensional/computational tool, the picker is a recommendation tool. A color trying to live between them would just be muddy. So the top-level axis is **orientation to tool type through color** — discrete family accents, not a gradient.

**Color does two jobs. Never a third.**
1. **Identity** — which family/genre of tool you're in (the accents below).
2. **Interaction state** — what the tool is doing *right now*: live/recalculating, provisional/mid-edit (the CAD "sketch magenta" idea), unparseable input. This is about the tool and the input, never about the user's data.
3. **Not compliance.** A calc guides decisions; it doesn't render verdicts. It can't — it doesn't know the user's jurisdiction, amendments, or actual conditions. Coloring a result red/green to mean "(non)compliant" claims an authority the tool can't back and quietly steals the architect's decision (the exact unverifiable-LLM failure mode the suite is built against). **Surface the information vividly; withhold the verdict.** The converter's rounding-error display is the model: it shows the residual, it doesn't say you rounded wrong.

**Blueprint blue — settled on the value axis.** True cyanotype Prussian (#003153) and ISA cobalt share a hue (~205–212°); they separate by *lightness*, not temperature. So keep blueprint deep-Prussian and let brightness do the work — earlier "push it greener to dodge ISA" was wrong. Likely working value is the screen-lifted Rhino layer **#004C80** (true #003153 is near-black on screen).

**Family accents — SHIPPED.** Canonical tokens live in `assets/css/tokens.css` (imported by `assets/css/global.css`; pages select a family with `data-family` on `<html>`); visual reference in `palette-shipped.html`. The system: family tier **anchored to Prussian's own lightness (OKLCH L 0.41)** with per-hue chroma — a serious, rich, high-contrast (AAA on paper) set rather than a light muted one. Two documented exceptions: **Ink** (achromatic anchor) and **ochre/building** (lifted to L 0.55, because yellow can't be both dark and vivid in sRGB — a gamut fact, not a tuning choice). Hover/tint/dark-mode variants are *derived* (hover = L−0.06; tint = L 0.94 low-chroma; dark = lifted L), so the whole UI ramps from these anchors.

| Family / genre | Token | Hex | OKLCH | On paper |
|----------------|-------|-----|-------|----------|
| Drafting / geometry *(anchor)* | `--drafting` | #004C80 | 0.41 / 0.108 / 248 | 8.6:1 AAA |
| Hardware picker *(anchor)* | `--picker` | #211E18 | 0.24 / 0.012 / 85 | 15.9:1 |
| Life safety / egress | `--egress` | #732C52 | 0.41 / 0.110 / 350 | 9.1:1 AAA |
| Building size & type *(lifted exc.)* | `--building` | #9A6500 | 0.55 / 0.130 / 78 | 4.8:1 AA |
| Envelope & energy | `--envelope` | #00592F | 0.41 / 0.105 / 155 | 8.1:1 AAA |
| Accessibility | `--accessibility` | #005564 | 0.41 / 0.090 / 210 | 8.1:1 AAA |
| Material | `--material` | #7C2C03 | 0.41 / 0.120 / 42 | 9.1:1 AAA |

DocCheck marks run a hotter tier (L ~0.52, higher chroma) so consequence reads louder than identity: `--correction` #AF3D34, `--query` #166DAF, `--provisional` #7652AC, `--working` #AC4785, `--highlighter` #DEC358. Egress resolved to a muted **mulberry** (no codified claim — dodges the signal-red/ISO-egress collision); accessibility resolved to **teal** over ISA blue (Q7 closed). The "serious not approachable" read is intentional and on-brand for the audience and the verification thesis.

**Canonical-color collisions to design around.** The building world has codified color systems whose meanings an architect reads fluently — they're *verdict-and-hazard* systems (they adjudicate), so they're reference-to-avoid-clashing-with, not a well to mine for accents. Three matter:
- **Safety (ANSI Z535 / OSHA / ISO 7010):** red = danger/fire, green = safety + *egress routes*, blue = notice, orange = warning, yellow = caution. This inverts "red for egress" — in codified semantics **green is the egress color** (ISO running-man); red-for-exit is only the US legacy EXIT-sign lineage. Reason to drop signal-red for the life-safety family: it's the loudest verdict color, it semantically inverts ISO egress, and it carries redline/danger baggage. Prefer a muted hue with no codified claim.
- **Energy-green is triple-claimed:** sustainability (LEED) vs. safety-green (egress) vs. utility-green (sewer). Not disqualifying, but it's not a "free" signal — keep it muted and lean on context.
- **Utility (APWA / 811):** red = electric, yellow = gas, orange = comms, blue = potable water, green = sewer, purple = reclaimed, pink = survey, white = proposed excavation. **Flag on the site-feasibility tool specifically** — coloring water green or sewer blue there reads as *wrong* to anyone who reads site plans.

**Mute and desaturate the whole set for legibility.** The starting hues above are still too saturated for a paper-like surface and for text. Accents will mostly appear as small marks, rules, pills, and label text — all of which need contrast against off-white *and* must not vibrate. Pull every family toward the drawing-set register: lower chroma, control value for AA text contrast where the color carries text, and reserve any near-saturated version for tiny non-text marks only. The muted version is the real palette; the hues above are just the seed.

**On the CAD affordance colors:** the *vocabulary* (magenta = working/provisional, etc.) is worth borrowing; the *chroma* is not — those are super-primaries tuned to read over a black modeling void, jarring on a paper-like surface. Desaturate hard toward the muted register; the conventions are reference, not swatches to lift. The one safe, data-agnostic borrow is **magenta-as-working-state** (live/provisional/mid-edit), not the red/green compliance traffic light.

---

## Open questions for you to settle

1. **Tile: own URL, or a preset view of the general run solver?** Real fork — affects the run-solver page design and your sitemap.
2. **Run-solver presets — which ship beyond tile in v1?** (studs / balusters / grid / pavers)
3. **Does triangle/squaring earn a page,** or is it a converter sidecar?
4. **Envelope depth — how far into energy code** before it stops being worth the verification burden?
5. **Any quantity calc besides tile in first pass?** Default answer: no.
6. **Sheet-series mapping** — how do these 6 in-scope families map onto your AT/A/C/L sheet logic? (Your call — I didn't assume an assignment.)
7. **Accessibility: teal vs. true ISA blue?** Teal avoids the blueprint collision and is a defensible civic nod; ISA blue is the recognized standard but forces blueprint cooler and may collide. Cleanest may be teal + untouched blueprint, dropping the ISA-standard claim.
