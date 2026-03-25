# architecture.tools — Site Framework

## Concept

The site is a drawing set. Drawings do the work. Text supports them. Each page leads with a diagram and follows with opinionated notes — the way a detail sheet leads with the drawing and backs it up with a spec.

No wizards. No interactive tools. No quizzes. Architects use drawings.

The illustration style is consistent: isometric line drawings, minimal, black on white. This is already done — the visual identity exists.

---

## The Drawing Set

### A0 — Cover Sheet / Landing Page

**Drawing:** The current one-answer recommendation ("What computer should I buy for architecture?") stays as the entry point. Simple, opinionated, dated.

**Below the fold:** A thumbnail index of every sheet in the set — the way a cover sheet lists the drawing index. Each thumbnail links to its page. The full set is visible at a glance.

---

### A1 — Workstation Archetypes

**Drawing:** Eight isometric desk setups (updated from the old Type 0–5). Each is a recognizable configuration an architect can point to and say "that's me." Mobile-first setups are first class, not alternatives. Cloud/Remote Desktop gets a sidebar note.

- Solo Practice — one person, all roles, designs and documents and manages
- Project Architect — firm seat, primarily models and documents, IT decided by someone else
- Mobile Architect — field-primary, reviews more than creates, travels light
- One-Machine Architect — docked laptop as sole computer, the strategy that's growing fastest
- Viz Specialist — GPU-primary, lives in Enscape/Lumion/Unreal
- Mac Architect — ecosystem-committed, Rhino/ArchiCAD/SketchUp, not Revit
- Student — budget-constrained, needs to last through school
- Reviewer — document-primary, display-primary, CA/QA/code review

**Notes:** Short description of who sits at each desk. What their day looks like. What matters and what doesn't. What the budget range is. This is the framework — everything else on the site maps back to an archetype. See the full archetype descriptions on the companion page.

---

### A2 — Where the Money Matters

**Drawing:** The priority stack as a diagram. A visual hierarchy showing, for each type, where the next dollar has the most impact.

Something like a stacked bar or a ranked list per type:

| | Modeling (Type 1/3) | Viz (Type 4/5) | Mobile-primary | Review/CA |
|---|---|---|---|---|
| 1st | CPU single-core | GPU | Laptop display | Display quality |
| 2nd | RAM | VRAM | Battery / weight | CPU |
| 3rd | Display | CPU multi-core | Docking setup | RAM |
| 4th | Storage | RAM | CPU | Storage |
| 5th | GPU | Display | GPU | GPU |

**Notes:** The explanation of why. Modeling is single-thread CPU bound. Viz is GPU bound. Your monitor is the thing you stare at eight hours a day. The $183/hour billing rate math. The build-vs-buy calculation with real numbers. Eight hours at $200/hour is $1,600 in lost billing — net savings from building yourself narrows to under $1,500.

---

### A3 — The Standard Workflow

**Drawing:** The software ecosystem diagram (updated). Design → Document → Visualize → Render → Communicate. Revit at center, with Rhino/Grasshopper/SketchUp feeding in, Enscape/Lumion/Unreal branching off, V-Ray/Corona for production rendering, and the communication cluster (Word, Outlook, Bluebeam, Procore) on the right.

**Notes:** What each application actually demands from hardware. Which are CPU bound, which are GPU bound, which don't care. The performance bounds overlay goes here — the diagram you already have showing ST CPU Bound / MT CPU Bound / GPU Bound labels on each application.

---

### A4 — Performance Bounds

**Drawing:** The performance bounds overlay on the standard workflow — the existing diagram with colored circles showing which bottleneck governs each application.

**Notes:**
- Modeling (Revit, Rhino, SketchUp, Archicad, AutoCAD, 3ds Max): **Single-thread CPU bound.** RAM matters for model size. GPU is nearly invisible — a 4070 feels identical to a 4090.
- Interactive viz (Enscape, Lumion, Twinmotion): **GPU bound.** VRAM matters. This is where GPU money pays off.
- Production rendering (V-Ray, Corona): **Multi-thread CPU bound** (with GPU hybrid modes). Core count and clock speed both matter.
- Communication/management (Office, Bluebeam, Procore): **Doesn't matter.** Anything runs these.

---

### A5 — Rendering Software Matrix

**Drawing:** The existing rendering software chart (updated). GPU-based vs CPU-based renderers, which host programs they plug into, and NVIDIA vs AMD support for each.

**Notes:** Enscape is better than Lumion at current prices. Enscape does a fine job. V-Ray is fussy but great. Interactive ray-traced modeling is interesting but not worth buying for. If you don't render well, farm it out — that's an honest option most hardware guides won't say.

---

### A6 — Monitors

**Drawing:** The monitor DPI chart (updated). Two axes: sharpness (DPI) vs working space. Sweet spot box around 27" 5K and 32" 6K. Add the new entries: QD-OLED stripe, WOLED white pixel, RGB-stripe OLED as a sidebar diagram showing subpixel layouts and why they matter for text.

**Notes:**
- Default: dual 27" 5K IPS (~$800 each). 218 PPI. Dell UltraSharp 4Ks aren't much cheaper — the 5K is the value now.
- Single-monitor pick: Asus ProArt PA32QCV 6K at $1,300. Same 218 PPI in 32".
- Apple path: Studio Display $1,599 (27" 5K 60Hz) or Studio Display XDR $3,299 (27" 5K 120Hz HDR).
- LG 6K exists, costs more, reviews worse.
- OLED: not yet for desktop production. Subpixel layouts cause text fringing. RGB-stripe OLED coming but unproven. Fine on laptops where density masks the issue.
- 60Hz is enough. Ultrawides are polarizing for CAD — the curve bothers line-work people.

---

### A7 — Mobile Alternatives

**Drawing:** The existing mobile alternatives isometric (updated). Desk with tower + dual monitors vs desk with docked laptop + dual monitors. Add a third: laptop-only travel setup.

**Notes:** Mobile as first class. The ZBook G1a as the nearly-one-machine solution at 2/3 the weight of a P16. The X1 Carbon class for document review and travel. Legion/gaming-class for performance-per-dollar at a desk. The laptop strategy matrix:

- Ultraportable (X1 Nano class): documents, travel, not a workstation. Don't buy this for Revit.
- Mobile workstation (P1, ZBook Ultra, ProArt P16): dockable, capable, the one-machine strategy for SFR scale.
- Performance laptop (Legion, Razer Blade): incredible value, loud, has to be at a desk. The gaming hardware in a meeting problem.
- Desktop replacement (P16, ZBook Fury 16): actual workstation thermals and power, but you're carrying a brick.

---

### A8 — Office Configuration

**Drawing:** The existing office network diagram (updated). Workstations around a NAS with a dedicated rendering node or cloud rendering service.

**Notes:** NAS as the shared file server for a small firm. Rendering node economics (when to buy one vs cloud render). Backup strategy diagram (NAS → backup drive, NAS → cloud). Dropbox/cloud sync as the collaboration layer.

---

### A9 — Vendors

**Drawing:** None needed — this is a spec page, not a drawing.

**Notes:** The opinionated vendor list.
- Puget Systems / BOXX: worth the premium for prebuilt desktops.
- Lenovo: great support, ThinkPad and Legion lines both recommended.
- HP: ZBook line is solid. Consumer line is not the same.
- Asus: great hardware for the price, warranty less proven.
- Build your own: the math, the time, the honest tradeoffs.

---

### A10 — Software Notes

**Drawing:** The industry-standard rendering chart — host program vs interactive/GPU/CPU rendering options.

**Notes:** Platform-specific observations.
- Archicad runs worse on Mac at the same spec. Happier on PC overall.
- Rhino is good enough on Mac as of v8. Ecosystem still isn't equal. Core app is fine.
- V-Ray is fussy but great.
- Enscape > Lumion at current prices.
- Bluebeam is the document review standard. DocCheck is coming for checklist-based QA.

---

### A11 — Data Strategy

**Drawing:** The existing data strategy diagram — NAS + backup drive + cloud.

**Notes:** NAS setup for small firms. Backup philosophy. Cloud sync tradeoffs. Photo/document management.

---

### A12 — AI in Architecture

**Drawing:** A simple matrix. Rows are tasks architects actually do (ideation sketching, document production, code review, specification writing, rendering, project management, verification/QA). Columns are "Works today," "Promising but unreliable," and "Marketing, not reality." Most cells land in the second or third column. The drawing makes that visible at a glance.

**Notes:** Three sections.

**What works today.**
- Image generation for early design ideation (Stable Diffusion, Midjourney). Useful for client mood boards and massing exploration. Not useful for anything downstream — the output doesn't become a building.
- LLM-assisted writing — spec sections, email drafts, RFI responses. Saves time on first drafts. Still needs an architect's eye on every word.
- AI-assisted photo documentation and organization. Useful on jobsites.
- Copilot/Claude-style code assistance for architects who write scripts (Dynamo, Grasshopper, custom tools).

**What doesn't work yet.**
- AI-generated construction documents. The output looks confident and is subtly wrong — which is worse than obviously wrong. A dimension that's off by an inch doesn't announce itself. An AI-generated wall section that's missing a vapor barrier looks complete.
- Automated code review. Building codes are complex, jurisdictional, and full of exceptions that require judgment. AI can flag potential issues but can't replace the licensed professional who stakes their stamp on compliance.
- NPUs. The "AI" hardware in current laptops (the ZBook's NPU, Copilot+ PC branding) has no meaningful application in architectural workflows today. It's a spec sheet item, not a tool. Don't pay extra for it. When this changes, this sheet will say so.

**What it means for hardware.**
- You do not need an NPU for architectural work in 2026.
- If you use Stable Diffusion locally for ideation, a capable GPU (RTX 4070+) with sufficient VRAM matters. This is the same GPU that helps with Enscape/Lumion — it's not an additional expense.
- Cloud-based AI tools (ChatGPT, Claude, Midjourney) run in a browser. They don't care about your hardware.
- The priority stack on sheet A2 doesn't change because of AI. Not yet.

**The deeper argument.**
AI makes verification more important, not less. Brandolini's Law: generating plausible-looking output is cheap; verifying that it's correct is expensive and stays expensive. As AI makes it easier to produce documents, drawings, and specifications that look right, the value of systematic human review increases. The architect's role shifts toward verification, not away from it. This is not a threat to the profession — it's a restatement of what licensure means.

DocCheck exists because of this thesis. It keeps architects in the verification loop, generating evidence of systematic human review (ProofSets), not replacing it. AI doesn't make checklist-based QA obsolete — it makes it essential.

---

### A13 — Futures

**Drawing:** None yet — this section is text-first until the ideas are concrete enough to draw.

**Notes:** Where things are going beyond AI. BIM 3.0 / post-Revit / openBIM. Material-first approaches to building modeling — what if geometry were a byproduct of real component properties instead of the starting point? Construction sequencing as a richer framework than Revit's "hosting" concept. Whatever is being tracked that doesn't fit elsewhere.

This is where architecture.tools establishes that the author is thinking about the future of the profession, not just selling monitors. And it's where larger ideas can live publicly when they're ready.

---

## Structure

The site has one level of hierarchy: the drawing index. Every page is a sheet. Sheets are numbered. The landing page (A0) shows them all. There is no blog, no chronological feed, no categories.

Each sheet has:
1. The drawing (full width, the first thing you see)
2. A short opinionated summary (2–3 sentences)
3. Detailed notes (scrollable, below the drawing)
4. A "last updated" date

Sheets get updated when something changes, not on a schedule. The date tells the reader how current the information is.

---

## What Makes This Work

- **Drawings first.** An architect scanning the site gets the answer from the diagram before reading a word. This is how architects process information.
- **Opinionated.** Every sheet has a recommendation. "It depends" is not an answer. Where it genuinely depends, the drawing shows the decision tree.
- **Honest scope.** The author doesn't model in Revit anymore. The author does construction document review, software development, and hardware evaluation. Where the author lacks direct experience, the site says so and links to someone who has it (Corke at AEC Mag for viz benchmarks, Puget for component-level testing).
- **DocCheck lives here naturally.** It shows up in the software ecosystem diagram alongside Bluebeam. It shows up in checklist workflow notes. It's not the point of the site, but it's present.
- **Low maintenance.** Drawings don't go stale the way blog posts do. The type system holds even as specific products change. Product recommendations update when products change — a few times a year, not weekly.

---

## Build Order

Don't build the site. Build the drawings. The site is just a frame to hang them in.

1. Draw the eight archetype isometrics (A1) — Solo Practice, Project Architect, Mobile Architect, One-Machine Architect, Viz Specialist, Mac Architect, Student, Reviewer. Cloud/Remote Desktop gets a sidebar note, not its own drawing.
2. Draw the priority stack (A2) — this is the single most useful new diagram. Each archetype gets a ranked list of where the next dollar matters.
3. Update the monitor chart (A6) with 5K/6K entries and the OLED subpixel sidebar.
4. Update the software ecosystem / performance bounds overlays (A3, A4).
5. Write the AI sheet (A12) — the matrix of what works, what's promising, and what's marketing. This is the sheet that establishes the site's voice on the topic everyone else is getting wrong.
6. Write the notes for each sheet.
7. Put them on the site in order.

The illustration style, the voice, and most of the content already exist. The framework is the missing piece, and this is it.
