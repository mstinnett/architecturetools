# Voice & glossary

The recommendation copy speaks to one architect, mid-purchase, choosing a machine
for their work. Not to an audience, about architects.

## Who's talking

A practicing architect who uses these apps every day. That is the site's whole
standing, so say it where trust gets decided: the about page, the methodology
page, and the opening of an editorial page. Say it once, plainly, as a fact
about where the picks come from, not as a badge ("built by an architect" in a
corner, "our experts" anywhere).

- Site copy speaks as **we** for the site's judgments ("we recommend").
  First person **I** belongs to signed writing: the about page, posts and
  emails under the architect's name.
- Cover sheets and plates stay descriptive (see `SITE_FRAMEWORK.md`). The
  credential doesn't go there.

## Tone

Four traits. Every surface has all four, and the recommendation cells show
them most quietly.

- **Practitioner.** Examples come from the office, not the spec sheet: a Revit
  model of one building, a deadline-week render, a consultant on a different
  version. Name the app, the file, the number.
- **Candid.** Say where the evidence stops. When two options are close, say
  they're close. "We don't know yet" is allowed. A range beats a falsely
  precise point (the calculator rule holds everywhere).
- **On the reader's side.** The goal is the right machine, and that is often
  the cheaper one. Say "you don't need this" when it's true. If the site earns
  anything from a link, say so in one sentence on the page that has the link.
- **Plain and calm.** Short sentences, periods. Warm through usefulness, not
  cheerleading: no exclamation points, no hype words (game-changing,
  powerhouse, beast, next-level), no urgency that isn't real.

## Figurative language

Three tiers. When unsure which tier a phrase is in, write the literal version.

- **Analogies: allowed.** An explicit comparison that explains a mechanism by
  pointing at something the reader already knows ("Like a plotter queue,
  production rendering takes whatever cores you give it and finishes sooner").
  Draw them from the architect's own world: drawing sets, consultants, site
  work, the plotter. It has to do the explaining. If the literal sentence is as
  clear, use the literal sentence. One per piece is plenty.
- **Metaphors: sparingly.** An implied comparison ("the GPU draws the scene
  while the CPU waits") earns a place only when it is clearer than the literal
  phrasing and not one of the stock phrases below. In recommendation notes and
  calculator mechanism copy, state the mechanism instead: those surfaces keep
  their own bans (Rules below, and Calculator pages above).
- **Worn-out phrases: never, on any surface.** Banned: sweet spot, sky's the
  limit, earns its place, it shows, heavy lifting, workhorse, beast,
  powerhouse, future-proof, game-changer, take it to the next level, punches
  above its weight, a no-brainer, bang for your buck. Add to this list when
  one slips through.

## Where the rules apply

The rules below were written for recommendation cells and are strictest there.
Other surfaces take the tone and the figurative tiers above, plus:

- **Recommendation cells:** The shape, Rules, and Glossary below, in full.
- **Calculator pages:** the next section, plus Rules where they fit.
- **Cover sheets and plates:** descriptive only. What the tool takes in and
  gives back. No thesis, no claims of worth.
- **A-series editorial:** the most room. Judgment in first person plural,
  decision logic shown, analogies welcome. Still lead with the answer.
- **About and methodology:** who's talking and how picks are made. Here the
  process is the content, so "No process leaks" does not apply.
- **Feedback form, errors, empty states:** one sentence on what happened, one
  on what to do. No apology theater.
- **Off the site (email, posts, replies):** same tone, signed in first person.
  Lead with the specific fact, and point to the page that has the rest.

## Calculator pages (operator rulings, 2026-07)

The calculator voice extends the rules below; these came out of the
scale/slope/tile redesigns and are the standard for every tool page.

- **Open with the question the tool answers,** in the reader's words, then the
  mechanism. ("What dimension does this wall want to be so the tile runs
  uncut?") A tool named for its subject ("Tile"), not its trick ("Precision
  Window") — the name is the door.
- **Answer with the thing the reader would set** — a dimension, a range — not
  an internal quantity. "Set it anywhere 5'-9/16″ to 5'-1 11/16″" leads; the
  tile count follows.
- **No metaphor in mechanism copy.** Banned from this family: *holds*, *backs
  / can't back*, *floor* (except the walking surface), *spec floor*, *what the
  setter can hold*, *disappears into*. Say the mechanism: **sheet resolution**,
  *is not recorded*, **false precision** (the named enemy — use it).
- **Tolerances are ranges, not points.** A cut, a band, a residual gets both
  ends ("4 5/16″–5 7/16″"), never a single false-precise number.
- **Show, don't judge.** References are located, never ruled on; no pass/fail,
  no compliance color. A recommendation-shaped answer is allowed only as a
  menu of stated options ("set it A or B").
- **Assumptions live in the echo's assumption lines** (dash-prefixed), one
  fact each, including every fixed amount and every fallback the tool took.
- **Metric is first-class.** Choosing metric flips prefills, presets, worked
  examples, and display formatting — everything, not just the output units.
- Imperial real-world values read as **native ft-in fractions**, not survey
  decimals; exact integers live in the engine note.

## The shape

- **Frame** (the priority line) carries what's true for the *whole workload* —
  stated once, in plain language.
- **Component notes** each either **decide** (rule on a choice) or **locate**
  (tell the reader whether it's them). A note never restates the frame and never
  only describes. If it would only describe, it repeats the frame — cut it.
- The unit is the *single recommendation*, not the sequence. A reader sets their
  apps and budget and sees one cell plus the frame, never the other cells. So
  notes may repeat across cells; each must stand alone.

## Rules

- **Speak to the buyer.** "You primarily work on documents," not "the work is
  document-primary."
- **State the mechanism.** No metaphor in notes or frames, and none of the
  worn-out phrases (Figurative language, above). Also banned here, because
  they hide what the part does: heavy, heaviest, load, idle, covers. A short
  analogy is allowed only when it decides or locates in fewer words than the
  literal version.
- **No empty intensifiers.** real, actually, genuinely, only-for-emphasis.
- **Plain over jargon.** Say what a term means in words an architect owns:
  "one operation at a time," not "single-threaded." Keep terms met at work or
  checkout (VRAM, Revit, Enscape); drop renderer/motherboard internals
  (UDIMs, out-of-core, PCIe lanes).
- **One decision per note.** Don't borrow an adjacent decision to land a line.
- **No cross-tier references.** A note describes its own cell's part, not another
  tier's.
- **Don't repeat the title.** The cell shows the chip, GPU, RAM, and price beside
  the note. Don't restate them ("the M4 Max," "64 GB"). Name a chip only to steer
  between options ("skip the Ultra").
- **No comparatives to unseen tiers.** "More cores" than what? The reader sees one
  cell, not the others. Describe what the part does, or compare only to the
  workload's needs ("more than documents need").
- **No process leaks.** Describe what the buyer gets, not how we tiered it.
  Not "stays an X3D," not "RAM tracks model size."
- **When the frame states the rule, the cell states the stakes,** not the rule
  again. (Frame: get a dedicated GPU. Cheapest cell: integrated will be
  unreliable.)
- **Recommendations take a verb.** "Get a dedicated GPU," not "a dedicated GPU."
- **Ration semicolons and em-dashes.** Both read as LLM tells in bulk. None in
  frames. In notes, reach for a period or comma first.
- **Don't invert.** Lead with the answer ("32 GB is enough for a single
  building"), not the condition.
- **Relevance is the reader's decision, not the topic's completeness.** Cut what
  is true but useful to no one who would read this.

## Glossary — use the same term every time

- **GPU** — never "card."
- **CPU core** — on first mention in a workload; "core" after.
- **VRAM** — a Windows GPU's dedicated graphics memory.
- **unified memory** — Apple Silicon's shared RAM + VRAM pool.
- **GPU cores** — Apple Silicon's graphics units (an Apple-specific term; fine
  to use because it is labeled).
- **integrated graphics** — the CPU's built-in GPU.
- **dedicated GPU** — a discrete GPU.
- **visualization** — never "viz."
  - **Real-time visualization** — Enscape, Lumion, D5, Twinmotion. Drawn live on
    the GPU.
  - **Final / production rendering** — V-Ray, Corona. Runs on CPU cores.
- **regeneration** — Revit / CAD recompute.
- **App names verbatim:** Revit, Rhino, SketchUp, ArchiCAD, Vectorworks, Enscape,
  Lumion, D5, Twinmotion, V-Ray, Corona.

## Per-workload truths (what each frame asserts)

- **Documents / drafting** — almost any machine handles it; the monitor matters
  more than the computer.
- **Modeling** — one operation at a time; a fast CPU core, not many; a modest
  dedicated GPU for the viewport. The X3D leads in Revit, with the 270K Plus
  a few percent behind; the 16-core Ryzen 9s are rendering chips and belong
  in modeling+visualization, not here.
- **Real-time visualization** — runs on the GPU; VRAM sets scene size; the CPU
  only loads scenes.
- **Production rendering** — uses every CPU core; core count sets render times.
- **Mac** — Revit is Windows-only; Lumion and D5 are Windows-only; unified
  memory is both RAM and VRAM; the Mac is the weakest at final rendering.
