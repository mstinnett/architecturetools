# Touch UI for the CAD system — research notes

_Research pass 2026-07-19 (multi-agent sweep; Autodesk research papers, Buxton
archive, CHI papers, shipped-product documentation). This is the interaction
language for the 2D CAD (`cad/`) and, already in part, the Furniture Fit tool
(`l/furniture.html`). The organizing principle the user set: **mouse input you
trust the first click; touch you get a point, snap aggressively, and keep
coarse / fine / numerical adjustment available until the intent is captured.**
Everything below is a mechanism serving that principle._

## 1 · Placement is provisional: commit on lift

The one non-negotiable inversion from mouse CAD. AutoCAD mobile's shipped
snap flow: touch and hold → a loupe appears → slide, snap candidates
highlight as the finger flies over them → **release commits**. Onshape (1 in
8 sessions on phone/tablet) escalates conditionally: plain taps act directly
on unambiguous targets; press-and-hold spawns an offset crosshair for fine
work.

- Never commit geometry on touchstart.
- First contact selects and shows; dragging refines; the snap target is
  visible **before** the finger lifts.
- After the lift, the editing surface stays available: position fields,
  nudge steps, rotate — the intent capture continues until the user moves on.
  (Fit tool today: drag-snap-drop, then the Place section offers exact
  fields, 1″/1/8″ nudges, rotate — the "pushable placement" loop.)

## 2 · Precision mechanics (the fat finger is physics, not UX debt)

Numbers to build against: fingertip contact 8–10 mm; Apple HIG 44×44 pt;
Material 48 dp; ~9 mm is the empirical floor for fast low-error selection
(Parhi/Karlson/Bederson). FFitts law shows a fixed precision floor no
care can remove — sub-millimeter placement **must** route through an offset,
zoom, or numeric mechanism.

- **Shift technique (Vogel & Baudisch, CHI 2007)** — the canonical fix: on
  touchdown over small geometry, show a callout ~22 mm above the finger with
  a live copy of the occluded area and a crosshair of the true point; slide
  to correct; lift to commit. Escalate conditionally — big targets stay
  direct.
- **Snap-and-go (Baudisch, CHI 2005)** — snapping without warping: insert
  extra motor space at the aligned position so the object *sticks* there but
  continued dragging pushes through. Kills the need for a snap-off toggle —
  precious on touch, where there are no modifier keys. (Fit tool today:
  radius snapping; snap-and-go motor-space is the planned upgrade.)
- **Handles are rings, not dots** — grab zone an annulus outside the drawn
  point, so the finger holds the ring while the point stays visible;
  rotation grips are levers, not corner dots. ≥44 px hit areas regardless of
  visual size.
- **Relative nudge** — after selection, a drag started on empty canvas can
  move the selection relatively (finger away from the geometry, nothing
  occluded), with reduced gain when zoomed; on-screen nudge arrows step by
  the active increment for the last millimeter. (Fit tool ships the arrows;
  relative drag is open.)

## 3 · Snapping: wider nets, visible targets, exact arithmetic

- Touch snap aperture ≈ 2–3× mouse (20–30 CSS px, scaled by zoom); the Fit
  tool uses 14 px touch vs 8 px mouse today.
- Show **which** snap will happen before commit (marker + type glyph:
  square = endpoint, triangle = midpoint), inside the loupe when one is up.
- Dense candidates: ARES Touch's one-shot snap filter (force the next pick
  to endpoint-only etc.) instead of desktop TAB-cycling.
- Concepts' layered system separates **snap position** (grid/endpoint
  magnetism) from **snap direction** (axis/angle lock) as independent
  toggles; endpoint-autocomplete — magnetize a new endpoint to nearby open
  endpoints — is the single highest-value snap for wall drawing.
- Ours is exact: a snap is integer arithmetic on the 1/960 mm lattice, so
  "snapped" is a fact the UI can assert, not a tolerance it hopes for.

## 4 · Commands: marking menus, not toolbars

Kurtenbach & Buxton's marking menus are the only true muscle-memory
accelerator available on glass (no hover, no keyboard):

- Radial menu on press-and-hold (~300–350 ms); the same directional stroke
  without waiting fires the command with no menu drawn. Novice use literally
  rehearses expert use; in the CHI'94 CAD field study marks ran ~3.5× faster
  than the popped-up menu and took over >90% of selections within hours.
- **8 sectors max** (4 cardinals + 4 diagonals), **one level deep**; beyond
  that error rates climb. Need more commands → more *context-specific* 8-item
  menus (empty canvas / selected wall / selected furniture), not deeper ones.
- Shipped precedents: Maya's held-key marking menus + Hotbox; Fusion 360's
  right-click radial with gesture-through; SketchBook's corner "lagoon" for
  the non-dominant thumb, plus its "puck" (horizontal drag = one parameter,
  vertical = another) — the right pattern for wall thickness / snap grid.

## 5 · Modes: quasimodes over toggles (Raskin)

A mode held by muscle tension cannot be forgotten:

- press-and-hold at stroke end → shape/ortho snap (GoodNotes/Procreate
  QuickShape lineage);
- second finger down during a drag = the touch modifier key (constrain
  0/45/90°, or suspend snapping);
- press-and-hold on canvas → the marking menu (§4).
- Two-finger tap undo / three-finger redo is now a de facto standard
  (Procreate → Concepts → Fresco → iPadOS); users will try it before hunting
  a button.
- Sticky modes are reserved for the primary draw tool only.

## 6 · Two hands, and browser plumbing realities

Shapr3D's division of labor — pencil creates, fingers navigate, zero mode
switching — is why it beat desktop CAD ergonomics on iPad. In a browser:

- Pointer Events only: `pointerType` pen/touch/mouse, pressure, tilt. Apple
  Pencil double-tap/squeeze/hover **do not reach web apps** — don't design
  around them; recreate the function (corner tool-toggle, hold quasimodes).
- `touch-action: none` on the canvas or the browser steals the gesture mid-
  drag (`pointercancel`); capture pointers on drag start; treat
  `pointercancel` as abort-and-restore.
- Input arbiter: once a pen pointer is seen, route touch to navigation only
  for a decay window — that single rule delivers the two-hand model.
- Finger-only devices: one finger draws/moves, **two fingers always
  navigate** (the Fit tool ships this: one-finger drag/select, two-finger
  pinch-zoom, empty-canvas drag pans).

## 7 · Numbers at the geometry: the feet-inch keypad

Shapr3D's pattern: every dimension label is a live object — tap it, an
in-place numpad opens, type a value *or arithmetic*, the geometry drives to
it. The keypad to build (Construction Master / BuildCalc anatomy):

- keys: digits · **FT** · **IN** · fraction bar · one-tap **1/2 1/4 1/8
  1/16** · + − × ÷ · unit flip (mm/cm/m);
- entry reads like speech: `6 FT 2 IN 1/2` → 6′-2 1/2″; a bare numerator
  autocompletes to the active resolution (type `15/` at 1/16ths → 15/16);
- running math on dimensioned values (the parse-length engine already
  evaluates `3' 6" + 4 1/2"` exactly — the keypad is a thin skin over it);
- placed near, never over, the edited element; parsed echo lives on the
  geometry.

The Fit tool's Place/size fields already accept the full expression grammar;
the dedicated keypad is the CAD system's next interaction build.

## 8 · Traditional CAD concepts, translated not abandoned

- **Layers** — a shallow one-tap visibility list (big rows, one level), not
  a manager dialog. Morpholio Trace's fan-of-trace-paper metaphor is the
  touch-native framing; layer/object overrides surface as per-row chips, and
  bulk property edits go through selection, not dialogs.
- **Blocks** — a visual drag-out library whose instances carry metadata
  (product, dims, cost) for schedules — ArcSite ships this for contractors;
  the furniture catalog is exactly this pattern with parameters.
- **Arrays** — the canonical menus-on-menus failure (AutoCAD's ARRAY dialog)
  vs the shipped fixes: XD Repeat Grid's drag-out handles, Figma Smart
  Selection's spacing handles + Tidy Up, offset-memorizing duplicate. Ours
  goes further: the array is a **live node with exact tweens** (cad/lib
  model.js) — the repeat handle is just its `count` parameter made grabbable,
  with a count badge during the drag.
- **Hatch** — a region node with pattern parameters, not a dialog; Trace's
  Smart Hatch (live computed area) shows the touch-native form. The kernel's
  hatch node already computes watertight, exactly-clipped lines with the
  edge bands reported.
- **Instruments** — a draggable ruler/edge that strokes and objects snap
  against (Trace Super Ruler, Concepts guides): the drafting machine moved
  to glass, and a construction line without a "construction geometry"
  concept.

## 9 · What the Fit tool implements today (the running start)

commit-on-lift dragging with grab-offset (the piece never jumps under the
finger) · aggressive radius snapping to furniture, clearance zones, and
walls with guide flashes · wider touch apertures · double-tap rotate ·
two-finger pinch/pan · coarse/fine nudge + exact parse-length fields as the
persistent editing surface · panel pills at coarse-pointer hit heights ·
keyboard parity (arrows/R/Delete).

Open, in order: marking menu on press-and-hold; snap-and-go motor-space
snapping; Shift-style loupe for vertex grabs; the feet-inch keypad; snap-type
glyphs; two-finger-tap undo (needs an undo stack first).

## Sources

Autodesk Research (marking-menu design & evaluation PDF), billbuxton.com
(MMUserLearn, MMExpert, PieMenus), Kurtenbach & Buxton CHI'93/'94, Zhao &
Balakrishnan UIST 2004, Hotbox CHI'99, Fusion 360 + SketchBook + AutoCAD
mobile + AutoCAD Web help, onshape.com engineering blog, shapr3d.com support
+ DEVELOP3D/AEC Magazine reviews, Procreate handbook, concepts.app manual +
Pencil Pro notes, morpholioapps.com + ArchDaily (Smart Hatch), NNG touch
targets, Vogel & Baudisch CHI 2007 (Shift), Baudisch CHI 2005 (Snap-and-go),
Oh Snap INTERACT 2011, ARES Touch documentation, Raskin (The Humane
Interface), GoodNotes shape docs, MDN Pointer Events / touch-action, W3C
Pointer Events, Construction Master Pro manual, arcsite.com, Adobe XD Repeat
Grid / Figma Smart Selection docs, 9to5mac (trackpad mode).
