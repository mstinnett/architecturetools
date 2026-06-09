# Project Kickoff Tools — for the young architect

*The senior's opening move, encoded. Two instruments, one lane: your client says "I want X," and you need to walk in knowing what a principal would know cold. One orients the **regulatory surface**, one orients the **program**. Both answer the same question — "where do I start?" — and both route into the rest of the suite.*

Voice note: these are written for the architect, not the owner. Not "you might need a permit" — that's hand-holding a homeowner. This is "here's your code study and the threads that bite in review." And throughout: **surface leads, don't adjudicate.** The tool says "this applies, verify here," never "you're compliant."

---

## Part 1 — Code-study wayfinder
### "My client wants to add a bathroom"

**Three forks decide everything — answer these before anything else:**

1. **Residential or commercial?** Residential → IRC. Commercial/tenant → IBC + IPC, and accessibility (ADA / ICC A117.1) can quietly become the biggest scope driver in the room.
2. **Within existing space, or new footprint?** Inside the existing envelope → mostly building/plumbing code. New footprint → you've added a zoning problem (setback, coverage, FAR) and a foundation/structural one.
3. **Sewer or septic?** On septic, adding a fixture (and especially anything read as a bedroom) can exceed the system's design capacity and pull in the health department. This is the single most common late-stage surprise on additions — ask it first.

**The code-study spine (residential / IRC baseline).** What gets pulled in, with where to look:

| Thread | Section | What it governs | Where |
|--------|---------|-----------------|-------|
| Ventilation | IRC **R303.3** | Mechanical exhaust (per M1507.3, rates per Table M1507.4) *or* operable glazing | [up.codes/s/toilet-and-bathing-facilities-ventilation](https://up.codes/s/toilet-and-bathing-facilities-ventilation) |
| Fixture spaces | IRC **R307** | Layout per Figure R307.1; nonabsorbent shower walls to 6&#39; AFF | [up.codes/s/toilet-bath-and-shower-spaces](https://up.codes/s/toilet-bath-and-shower-spaces) |
| Fixture clearances | IRC **P2705.1** | The enforceable numbers: WC 15&quot; centerline to any obstruction, 21&quot; clear in front; lav 15&quot; centerline | search "P2705.1" on UpCodes |
| Shower size | Fig. **R307.1** | Min 30&quot;×30&quot; shower, 24&quot; clear in front | (same as R307) |
| Anti-scald | IRC **P2708.4** | Shower valves must be pressure-balance or thermostatic | search "P2708.4" |
| Shower receptor | IRC **P2709** / IPC 417 | Pan slope to drain (¼&quot;/ft) — *routes to your slope calc* | search "shower receptor" |
| Waterproofing/tile | ANSI **A118.10**, TCNA | Membrane + setting standards — *routes to your tile calcs* | [tcnatile.com](https://tcnatile.com/resource-center/ansi-standards/) |
| Ceiling height | IRC **R305** | 7&#39; min over required area | search "R305" |

**Commercial fork adds:** IPC **Table 403.1** / IBC **2902** (does the new fixture change required counts?), and ADA / ICC **A117.1** — accessible water closet clearances, 60&quot; turning space, grab-bar blocking. An accessible toilet room is far larger than a client pictures; this is a scope/cost conversation, not a detail.

**Threads that bite in plan review (the senior knowledge):**
- **IEBC.** A bathroom is an *alteration* — which alteration level (1/2/3) governs, and does it trigger anything in the existing-building code you haven't opened? Search "IEBC alteration level" on UpCodes.
- **Joist notching.** Running the drain means cutting framing — IRC **R502.8** limits notches/bores. A drain dropped through the wrong joist is a structural callback.
- **Vent termination.** Where does the plumbing vent penetrate the roof, and does the routing actually work in this wall? Cheap to verify now, expensive to discover framed.
- **No supply register required** (IRC R303.10) — a bathroom isn't habitable space, so don't over-spec HVAC, but confirm the exhaust path.

**Flag to the client before you draw a line:**
- Moving the plumbing stack vs. staying near existing drainage is *the* cost driver — locate it first.
- Footprint addition vs. within existing space changes the whole permit (zoning + foundation). Name which one this is.
- If on septic: capacity check early — it can kill or balloon the project.
- If commercial: accessibility may set the room size before the client's wishlist does.

**Routes into your suite:** slope-to-drain calc (receptor), tile run + waterproofing (shower surround), area takeoff + clearance check (the room layout), and — commercial only — plumbing fixture count. (A bath-exhaust sizing calc isn't in the graph yet; this surfaces it as a candidate lead.)

---

## Part 2 — Programming kickoff quiz
### "My client wants to build a thing — where do we start?"

This is the instrument you run *with* the client in the first real working session. The junior failure mode is a meeting that collects a wishlist, misses the budget reality and the hidden decision-maker, and has to be redone. The senior move is encoded below: **pin the box before the dreams, and surface the conflicts on purpose.**

**Module 0 — Frame &amp; stakeholders** *(five minutes, but it saves the project)*
- What is this, in one sentence, in the client's words?
- Why now? (The driver shapes priorities more than the brief does.)
- Who signs off — and who *else* has a real say? (Spouse, partner, board, the relative funding it. Find the hidden approver before you design for the wrong one.)

**Module 1 — Constraints (the box everything fits in)** — *do this before the wishlist*
- Real budget number — and does the client know construction contingency is real, not optional?
- Hard dates? (Selling, a birth, a lease ending.)
- Site/existing givens: own the land? existing building? survey in hand? known zoning limits, HOA, easements?
- → *Once the project type is clear, hand off to the Part 1 wayfinder for the regulatory box.*

**Module 2 — Program (spaces &amp; activities)**
- What activities happen here, and who does them? (Program by *verb*, not room name — "we host 12 for dinner" tells you more than "big dining room.")
- How many people, peak and typical?
- Required adjacencies — what must be next to what, what must be apart?

**Module 3 — Want / Need / Dream + conflict surfacing** *(the heart of it)*
- Sort every item into **Need** (project fails without it), **Want** (real, tradeable), **Dream** (if budget allows).
- Then force the collision: lay the Needs against the budget and the box. Where two Needs can't both fit — big kitchen *and* keep the footprint *and* hold the budget — that's the conversation to have now, with the client, not later in CDs alone. Make them choose while it's cheap.

**Module 4 — Performance &amp; character**
- Energy / comfort ambitions; aging-in-place or accessibility needs (cheaper to plan than retrofit); maintenance tolerance.
- Three reference images they love and one they hate — faster and truer than adjectives.

**Module 5 — Unknowns &amp; homework**
- What does the client need to confirm before next session (budget sign-off, survey, deed/HOA docs)?
- What do *you* need to verify (the Part 1 wayfinder output, zoning, existing drawings)?

---

*The two are one product: "client wants X → structured starting move." Part 2 orients the brief and ends by handing the constraints to Part 1, which orients the code. Neither adjudicates; both encode the checklist a young architect doesn't have yet — the apprenticeship the desk-next-to-a-principal used to provide.*
