# Voice & glossary

The recommendation copy speaks to one architect, mid-purchase, choosing a machine
for their work. Not to an audience, about architects.

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
- **No metaphors.** State the mechanism or the fact. Banned: heavy, heaviest,
  load, it shows, earns its place, idle, covers, sweet spot, sky's the limit.
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
  dedicated GPU for the viewport. The X3D leads in Revit; the 285K is a
  rendering chip and belongs in modeling+visualization, not here.
- **Real-time visualization** — runs on the GPU; VRAM sets scene size; the CPU
  only loads scenes.
- **Production rendering** — uses every CPU core; core count sets render times.
- **Mac** — Revit is Windows-only; Lumion and D5 are Windows-only; unified
  memory is both RAM and VRAM; the Mac is the weakest at final rendering.
