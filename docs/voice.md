# Voice & glossary

The recommendation copy speaks to one architect, mid-purchase, choosing a machine
for their work. Not to an audience, about architects.

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
- **No process leaks.** Describe what the buyer gets, not how we tiered it.
  Not "stays an X3D," not "RAM tracks model size."
- **When the frame states the rule, the cell states the stakes** — not the rule
  again. (Frame: get a dedicated GPU. Cheapest cell: integrated will be
  unreliable.)
- **Recommendations take a verb.** "Get a dedicated GPU," not "a dedicated GPU."
- **Ration semicolons. Don't invert.** "32 GB is enough for a single building,"
  not "For a single building; …".
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
