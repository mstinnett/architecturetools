# Architecture State Doc

The autonomous work system's long-running memory. The `architect` agent
boots from this file every run and updates it after each Rung 2 fit-check.
Keep it lean — a live picture, not a log.

_Last updated: 2026-10-13 (hosting moves from GitHub Pages to a Cloudflare Worker with static assets; feedback form over D1; Jost self-hosted)_

## Live architectural picture

- **What this is:** `architecture.tools` — a static site for architects.
  Vanilla HTML/CSS/JS. No framework, no build step, and no backend except
  the feedback form's two routes (`worker/`, `docs/FEEDBACK.md`)
  (`docs/PROJECT.md`). Served by a Cloudflare Worker with static assets,
  deployed from `main` by Workers Builds (`wrangler.jsonc`,
  `docs/HOSTING.md`); `.assetsignore` keeps everything but the site
  unpublished. Previously GitHub Pages, until the operator completes the
  move-over steps in `docs/HOSTING.md`.
- **Two branches (read `docs/HANDOFF.md` first):**
  - **`main` — the live site: the AT-0 cover (`index.html`, home) + the picker
    (`picker.html`) + the Precise Unit Converter** (`calculators/convert.html`
    + the three lib modules it loads — promoted 2026-06-09) **+ Stairs, Slope,
    Tile and Scale Resolution** (promoted 2026-10-13) **+ the three software
    choosers** (`pdf-markup.html`, `bim-platforms.html`, `bim-emerging.html`).
    Plus `assets/`,
    `data/`, `tools/`, `docs/`, the `build-data` workflow, `CNAME`,
    `.nojekyll`. Interim nav (SITE_FRAMEWORK "Hierarchy"): title-block crumb
    (site title home link + set-trail label) on every page; the **cover** is
    the index of live tools — a stack of lists, one per set, each a titled
    shelf of plates; the calculators lead, opening on the converter as a
    full-width featured plate over a shelf of the other four, then **What tool
    to buy or use**. Each tool back-links to the cover. Nothing
    links a deferred page, so nothing 404s. Publishing a tool = adding its
    `.cover-card` to its list's shelf.
  - **`dev` — the workbench (this branch).** The full prior site
    (`components.html`, `site-screen.html`, `calculators/`) **plus** the new
    calculator engine and converter. All work-in-progress lives here.
  - **Promotion model:** build on `dev` → preview on a neutral host → move one
    finished page (and any new `lib/` module) to `main` in a small commit. Live
    the moment it's on `main`.
- **Calculator engine (`calculators/lib/`):** the spine of the calculator
  family. Model: **parse a dimension expression → resolve it against a discrete
  constraint → show the residual.** Modules: `parse-length.js` (never throws),
  `snap.js` (fails loud, floor/nearest/ceil to a grid), `numberline.js` (pure
  SVG string), and `partition.js` (fails loud; divides a run into a whole number
  of equal parts — sections, tiles, on-center, balusters — and exposes the
  residual; reuses snap's integer division). On `main` five tool pages run on
  the engine: `convert.html` (the Precise Unit Converter, **shipped and
  frozen**) and, promoted from `dev` 2026-10-13, `stairs.html`, `slope.html`,
  `tile.html` and `scale.html`, with the figure modules `stairfig.js` and
  `slopefig.js`; `partition.js` is loaded by Stairs. The rest of `dev`'s
  engine tools await promotion.
- **Structure:** a "set of sets" — AT-0 master cover, A-series (editorial),
  C-series (calculators), L-series (library). Roadmap in `docs/SITE_FRAMEWORK.md`.
- **Shared assets:** `assets/css/global.css` — THE shared stylesheet (the
  warm sheet theme; imports `assets/css/tokens.css`, the canonical color
  palette; owns the per-family accent system selected via `data-family` on
  `<html>`, the one shared dark scheme, and the two type tokens —
  `--font-body` for reading, `--font-mark` for the wordmark; both faces are
  self-hosted from `assets/fonts/`, so no page load contacts a font
  service). The picker and converter use it
  fully; `components.html` and `dimension-converter.html` link it and inherit
  the theme (the old cool-neutral sheet of the same name was replaced —
  same class/token vocabulary, re-valued). `assets/js/ui.js` — the shared page
  glue: `esc()`, `press()`, and the light/dark key (it wires every
  `.scheme-toggle`, persists the choice, and fires `schemechange` for anything
  a page drew in JS). Each page still needs the tiny pre-paint head script that
  resolves the scheme before first paint — that can't be deferred to a
  `<script src>`. `assets/data/hardware-data.json` (the picker's runtime data,
  generated from the `data/` CSV tables — see the pipeline contract below).
- **Verification gate:** `.claude/gate/run.sh` — htmlhint + stylelint +
  internal-link check. A dependency carve-out under `.claude/gate/`; not
  shipped with the site.

## Documented contracts (touching any of these forces Rung 3)

- `docs/PROJECT.md` — actual repo/shipping state; the page-classification
  rule (AT / A / C / L / named live page).
- `docs/SITE_FRAMEWORK.md` — the canonical structural and editorial roadmap.
- `docs/HANDOFF.md` — the calculator-engine charter: the engine model, the
  build plan, and the provenance rule.
- The "no build tools / no framework / no backend" rule for the site itself.
  One operator-approved exception: `worker/` (the feedback collector and
  its inbox, plus the router that hands every other path to the static
  files). Static pages never call into it except `feedback.html`'s post,
  and a new server feature is a new exception, not a precedent.
- The shared-CSS vocabulary: `assets/css/tokens.css` (canonical palette;
  the only definer of `--paper` and the other ground anchors) +
  `assets/css/global.css` (theme + components, family accents via
  `data-family`).
- The hardware-data pipeline: the CSV tables under `data/` (`cpus.csv`,
  `gpus.csv`, `chips.csv`, `specs-win.csv`, `specs-mac.csv`, `priorities.csv`,
  `extras.json`) are the single source of truth. `tools/build-data.mjs`
  compiles them to `assets/data/hardware-data.json` (generated — never
  hand-edited); the picker fetches that JSON at runtime, and a GitHub Action
  rebuilds it on push. Full contract in `data/README.md`.
- The engine conventions (`calculators/lib/`): UMD wrapper (browser + node),
  pure functions, an inline test block per module, **relative asset paths
  only**, **one source of truth per primitive** (the rounding kernel lives only
  in `snap.js`; others delegate), shared modules **validate their own public
  inputs**, and unresolved/infeasible states carry a **stable `reason` code**.
  New tools follow them (`docs/HANDOFF.md` §3).
- The provenance rule: never serve WIP on `architecture.tools` or a subdomain
  of it; preview only on a neutral, noindexed host (`docs/HANDOFF.md` §4).

## Recent decisions

- 2026-10-14 — **Chooser contrast passes AA; the PDF page becomes a
  software sheet** (operator: "the text contrast is too low ... I'm not sure
  the quiz / result filter format makes as much sense for this information.
  It's typically a listicle ... each of these pages should have something to
  say"). Contrast: `--ink-3` was 3.7:1 (light) / 4.0:1 (dark), failing AA on
  every 11px label; it is now `#736a5a` / `#8F8B83` (5.1:1 on the sheet,
  4.6:1 on `--card-2`, still under `--ink-2`). In the CHOOSER block nothing
  is weight 300 below `--text-base` or set in `--ink-3`, and card notes are
  `--ink`; a computed audit of the three choosers went from ~100 failing
  text elements per page to 0, both schemes. Format: the filters' two axes
  (platform, need) were a matrix behind buttons, and the cards ranked
  unlike things in one list. `pdf-markup.html` now states its claim (no
  subscription to mark up, measure or check a set; a subscription buys
  review with others, and then you use what your consultants use) and draws
  it as a devices × needs matrix with the paid column behind a heavy rule,
  then notes, then a schedule of all 17 tools (old card ids kept as row
  anchors). Cell picks restate the old page's own claims; none is new
  vendor fact. Built on `claude/determined-bardeen-etpcp6` off
  `new-layout`, where the choosers live (`dev` has none). The BIM pages keep
  the chooser until the operator rules on the pattern and their claims.

- 2026-10-13 — **Scale Resolution's range labels no longer collide**
  (operator: "improve the scale resolution label"). `rangeFig` in
  `calculators/scale.html` centred all three labels under the band on one
  baseline, so below ~360px screens (and for long values wider) the end values
  ran into the ±. Now the ± stays centred and each end value hangs outward
  from its edge; where an end would reach the ± or the figure's edge (by
  numberline.js's 0.62 em/char estimate), both ends drop to a second row,
  clamped inside, and the figure grows 14px. End values take `--ink-2` (the
  shared axis-label ink) instead of the faint `--nl-axis`. A sweep of 14
  readings (both tasks, imperial and metric, long values) × 9 widths from 300
  to 1280 finds no overlap or clipping (the old figure failed 32 of the 126).
  The cover's Scale plate was recaptured and has its end values back.

- 2026-10-13 — **Four calculators promoted; the software choosers join the
  cover** (operator: "show a few calculators on it and show the PDF and BIM
  pages on the computer chooser row — calculators and what tool to buy/use").
  Stairs, Slope, Tile and Scale Resolution came from `dev` (the suite map's
  exemplars plus Stairs), promoted the way the converter was, and **without
  recent readings**: `privacy.html#storage` says the scheme key is the only
  thing written to the browser, so `UI.recents` stays on `dev` until that
  section is reworded. Links to unpromoted pages were cut (Stairs' crumb,
  Scale → Sheet Sizes). `claude/gracious-tesla-akyt3w` was merged for the PDF
  and BIM choosers; their footers gained the Feedback link. On the cover the
  calculators list keeps the converter feature and gains a shelf beneath it
  with its own untitled rule and keys (keys belong to the head directly above
  a shelf); each calculator plate is its page's own figure captured at phone
  width and cropped to 5:4 (Tile's key line dropped, as the converter plate
  drops its bound labels). The second list is
  **What tool to buy or use**: Chooser, PDF, BIM, Emerging BIM. The privacy
  page's tools line now covers every tool. Verified: gate green; promoted and
  chooser pages pass in both schemes at 1280 and 390 (no errors, no missing
  files, key flips the scheme, no overflow); a cover pass checks every plate's
  labels for overlaps, clipping and erased text at four widths, both shelves'
  keys, every card's target, and tab order.

- 2026-10-13 — **The cover becomes a stack of lists, and features the
  converter** (operator: "instead of one list with sections I want the
  calculators to be more featured — like multiple lists. I want to feature the
  unit converter more"). The single sideways band with its category
  nav-as-scrollbar (and, below 820px, the edge rail) is gone. Each set is now
  its own `.cover-list`: a title on a hairline rule over a `.cover-shelf` that
  scrolls sideways on its own, with its two keys at the end of the rule while
  it overflows (disabled, not hidden, at an end, so neither jumps). The
  calculators lead and open on a **featured plate** for the Precise Unit
  Converter at the list's full width: its real figure — `numberline.js`'s own
  output for 1 m at 1/8", drawn at 560 wide and inlined, nearest mark in the
  accent as on the plate — beside the name, the line, and three worked inputs
  that open the converter on that input through its `?d=` link state. Links
  can't nest, so the feature is a box whose name link stretches over it, with
  the inputs above the stretch. It stacks below 960px; below 600px it swaps to
  the reduced figure the plate was first drawn with, since the full one would
  print its labels at a few pixels. The Computer Chooser is the second list.
  Below 820px the keys go (touch scrolls a shelf) and a plate takes 82% of the
  column so the next one shows; one alone takes the column. The mark and its
  mini-title behaviour are unchanged. Verified: gate green, 25-check browser
  pass (inputs land in the converter, stretched link, tab order, focus ring,
  shelf keys with an overflowing shelf, figure swap at 600/601 and 960/961,
  no horizontal scroll), both schemes at 1280, 900 and 390.

- 2026-10-13 — **Hosting moves from GitHub Pages to a Cloudflare Worker**
  (operator-directed; Cloudflare Pages is being wound down in favour of
  Workers). `wrangler.jsonc` makes the repo root the Worker's static assets,
  with `run_worker_first` limited to `/api/*` and `/inbox`, so page views
  never run code. The Pages Functions in `functions/` became plain handlers
  in `worker/` behind `worker/index.js`. `.assetsignore` publishes only the
  site; its root-only names are anchored with `/` (an unanchored `data` hid
  `assets/data/` and broke the picker in a local run; `tools/test-hosting.mjs`
  now guards that). The D1 database is bound by name, so the first deploy
  creates or connects it. Worker logging is off to keep
  `privacy.html#hosting` true. `.html` addresses now redirect to clean ones
  (`/picker.html` -> `/picker`), Cloudflare's default; both keep working.
  The move itself is operator steps in the dashboard (`docs/HOSTING.md`).

- 2026-10-13 — **Jost self-hosted; Google Fonts import removed.** `global.css`
  loaded Jost from fonts.googleapis.com on every page, contradicting
  `privacy.html#hosting` ("no other third party is contacted when a page
  loads"). It now serves Google's own Jost 3.710 variable files (latin,
  latin-ext, cyrillic; ~54KB total, usually only latin's 26KB is fetched)
  from `assets/fonts/` with Google's unicode-ranges, declared for weights
  300–500 as before. Every live page rendered pixel-identical before and
  after, light and dark.

- 2026-10-13 — **Feedback form, collected on Cloudflare** (operator-directed).
  Readers send notes from `feedback.html` (linked in every live footer); a
  Pages Function saves them to a D1 database in the site's Cloudflare account,
  and the owner reads them at `/inbox` behind an `INBOX_PASSWORD` secret
  (HTTP Basic auth, chosen over Cloudflare Access to avoid a Zero Trust
  signup). The operator rejected email (it depends on the reader's mail app)
  and GitHub Issues, and chose this over a Google Form, which would add a
  third party to the privacy page and cannot confirm delivery. This relaxes the
  "no backend" contract for that code only (now `worker/`, see the hosting
  move above). `privacy.html` gained a
  `#feedback` section. Needs one-time dashboard setup before it works
  (`docs/FEEDBACK.md`).

- 2026-08-04 — **AT-0 cover landed on `main`** (operator-directed, worked
  directly on the live branch). `index.html` is now the master cover sheet:
  centred title block over a **card band** (operator's call, after two
  iterations — a portrait index, then a landscape title/index split). Each
  live tool is a plate — its own drawing over a name and one line — grouped by
  set. The band is **the picker's software selector at cover scale**: same
  strip, chevrons, and category nav-as-scrollbar, `cover-*` in place of `sw-*`.
  Below 820px the field turns vertical and the nav becomes the rail down the
  left edge; one scrubber reads its axis from the layout, so there is no second
  implementation. The picker moved back to `picker.html` (where its redirect
  stub had been, so old links still land on it; canonical + og:url retargeted).
  The cover lists only what is live: Computer Chooser and Precise Unit
  Converter. Its copy is **descriptive only** — no thesis line, no "more
  coming", no independence claim; the operator struck all three as
  editorializing, and SITE_FRAMEWORK's "one-line thesis" bullet went with them.
  Adding a tool is one `.cover-card`; a category is a `.cover-group` plus its
  nav item. The cover carries no crumb or sheet stamp — it is the top of the
  set — and the picker's category is the question it answers rather than a
  filing term. The picker's footer tool list became a
  back-link, since indexing is the cover's job now. Also graduated the sun/moon
  **light/dark key** out of the picker: `.scheme-toggle` into `global.css`,
  its wiring into `assets/js/ui.js`, and the button onto the converter and the
  cover — so the scheme choice is now available and consistent on every page.
  Verified: gate green, 37-check browser pass (both schemes, 1280 + 390).
- 2026-06-09 — Interim nav revised after operator review: every title block
  opens with a breadcrumb (site title linking home + the set trail as a
  label — "Calculators → Precise Unit Converter"), in place of routing the
  two live pages through a C-0 cover. C-0 deferred until the set has a
  second shipped tool (a one-item index is less deliberate than a labeled
  trail); footer cross-links kept. Rule in SITE_FRAMEWORK "Hierarchy".
- 2026-06-09 — UI review pass (operator-directed, "act on all of them"), then
  the converter promoted to `main`. One base font size site-wide (18px, the
  picker's iterated scale, set once in global.css). The calculator shell
  graduated into global.css ("CALCULATOR SHELL": input well, echo, constraint
  dial, debossed answer card, snap rows, figure text classes, mathnote) with
  the slots labeled in convert.html and the convention recorded in HANDOFF §3.
  All interactive pills on both pages are now real `<button>`s with
  `aria-pressed` (synced via the new shared `assets/js/ui.js`, which also owns
  `esc()`), one focus-visible ring, and coarse-pointer hit-height bumps; the
  picker's markup order now matches its visual order (CSS `order` removed) and
  ~10 dead inline CSS classes from earlier iterations were trimmed. Converter
  gained a shareable URL (`?d=&t=&g=`) and an echo assumption line announcing
  the auto-flipped target; the picker footer date now derives from
  `Meta.dataUpdated` (build-data stamps the last data/ commit date). Interim
  nav nailed down in SITE_FRAMEWORK and wired (footer link ↔ back-link).
- 2026-06-09 — Shared CSS consolidated to one sheet (operator-directed).
  `global2.css` renamed over `assets/css/global.css`, replacing the old
  cool-neutral sheet (same class/token vocabulary, so its two consumers —
  `components.html`, `dimension-converter.html` — re-theme without edits).
  The `--paper` repetition resolved: tokens.css is its only definer (the
  brand's warm-white anchor, like `--lightbox` for dark); the theme's grounds
  are `--card` (the sheet) and `--gray-100` (the field behind it), and the
  unused `--page-bg` alias was dropped. Picker + converter verified
  computed-style identical in both schemes.
- 2026-06-09 — Shared CSS refactor (operator-directed). The canonical palette
  graduated from `docs/In Progress/tokens.css` to `assets/css/tokens.css`;
  `global2.css` imports it and now owns the family-accent system (pages
  declare `<html data-family="picker|drafting|…">`) plus the single shared
  dark scheme that `index.html` and `convert.html` had each been carrying
  inline. Both pages' duplicated `:root` mirrors and dark blocks were
  deleted; rendering verified pixel-identical (computed-style diff, both
  schemes). Future tool pages adopt the look with one link + one attribute.
- 2026-06-07 — `partition.js` shipped: the layout primitive (sibling to
  `snap.js`) that divides a run into a whole number of equal parts and exposes
  the residual, unifying four tools (sections / tiles / on-center / balusters)
  behind one module. Pure integer math, fails loud, 35 inline `node` tests
  passing. No tool page consumes it yet — that is the next build.
- 2026-06-07 — Engine hardened after a review of `convert.html` + the lib:
  `numberline.js` and `partition.js` now **delegate** the floor/nearest/ceil
  kernel to `snap.js` (one source of truth, no duplicated `snapTriple`/`pick`);
  `numberline()` validates its public inputs; `partition` infeasibility carries
  stable `reason` codes; the `Number`-range bound is documented. Conventions
  updated in `docs/HANDOFF.md` §3. Also fixed the flagged convert.html UI bugs
  (mobile-CSS selector, area out-of-range guard, Min/Max row wording). Open
  follow-ups in the backlog: parser `reason` codes, and convert.html
  pending-span policy + area/ratio polish.
- 2026-06-07 — `noindex` added to all 11 `dev` WIP pages (provenance §4).
- 2026-06-07 — Precise Unit Converter shipped (frozen), and the calculator
  **engine** (`calculators/lib/`) established as the spine for the family. Build
  plan and provenance rule captured in `docs/HANDOFF.md`. These agent docs
  (`state.md`, `backlog.md`) were reconciled to match — they previously omitted
  the engine entirely and still listed removed pages as live.
- 2026-06-07 — `main` trimmed to picker-only (`f01b200`): `components.html`,
  `site-screen.html`, and `calculators/` removed from the live branch and kept
  on `dev`. The two-branch promotion model (above) is the working arrangement.
- 2026-06-05 — Deployment moved in-repo. `CNAME` points the custom domain
  (architecture.tools) at the site; `.github/workflows/build-data.yml`
  recompiles `hardware-data.json` on push and commits it back. With `.nojekyll`
  this is a GitHub Pages setup serving `main`, not an external pipeline.
- 2026-06-03 — Hardware data split into per-table CSVs. The single `catalog.csv`
  became `cpus.csv` + `gpus.csv` + `chips.csv`; the spec matrices reference
  catalog keys, compiled by `tools/build-data.mjs`. `data/README.md` is
  authoritative. (Supersedes the earlier Pages-CMS / `.pages.yml` idea, which
  never shipped.)
- 2026-05-29 — Picker-only launch revision (operator-directed). The picker
  became the site home page; live pricing was removed from the picker UI (price
  data retained, unrendered).
- 2026-05-22 — Autonomous work system bootstrapped. Setup choices recorded
  in `docs/decisions/OPERATING_GUIDE.md`.

## Active concerns

- **Next build:** a **tool page** on `partition.js` — a convert.html-style page
  (figure + parsed input + residual) exposing tile cuts / n-sections / on-center
  / balusters. The primitive is done; this is the UI layer. Then slope,
  area+coverage, scale. See `docs/HANDOFF.md` §5 and the backlog.
- **Provenance loose end:** `noindex` is now on all 11 `dev` WIP pages
  (`components`, `site-screen`, every `calculators/*.html`) — remove on
  promotion. Still open: no neutral preview host is configured, so WIP can only
  be viewed locally until one is stood up.
- **Legacy calculators are off-engine.** `slope`, `stair`, `sheet-sizes` get
  rebuilt onto the engine; `dimension-converter.html` is superseded by
  `convert.html` and should be retired, not ported. The code-compliance
  calculators (`occupant-load`, `egress-width`, `fixture-calc`, `parking-ratio`)
  are a different lineage (table lookups) — out of scope for the engine thread.
- AT-0 is built, but thin by design: a featured plate and one plate, in two
  lists. It fills out as pages promote — a new tool is one `.cover-card` on
  its list's shelf (the calculators list has no shelf yet; its first
  non-featured calculator adds one, and the head's two keys with it). The set
  covers (A-0 / C-0 / L-0) are still deferred, so the cover links tools
  directly. No shelf overflows yet, so no keys show.
- **A plate needs a drawing, and it must be the tool's own.** The picker's is
  its desk line art; the converter's is its actual figure — the 1 m worked
  example drawn to `numberline.js`'s anatomy, in the shared `.nl-*` classes and
  tokens. It is hand-drawn SVG rather than the module's output: the engine is
  built for a 680px figure and reserves margins for its labels, so at plate
  width it would be nearly all margin. That means the plate can drift from the
  engine if the figure's anatomy changes — browser checks assert the two
  scales, the hatched cell and the labels, so drift shows up as a failure
  rather than silently. The converter's **featured** plate has the room the
  small plate lacked, so above 600px it shows the engine's actual output,
  inlined (the reduced drawing stays for phones); if the figure's anatomy
  changes, redraw it from the engine. There is no house placeholder, so
  promoting a tool onto the cover means deciding what it draws.
- **The cover is ONE surface with one thing floating on it** (operator, after
  seeing paper → sheet → card stacked: "too many layers"). A single content
  ground runs edge to edge; the mark is the only object lifted off it. Cards
  are drawn **on** the surface — hairline outline, no fill, no resting shadow —
  and keep the lift only for hover, where it means "this is a link" rather than
  being a permanent layer. One consequence worth carrying forward: **a shadow
  cannot lift anything on a dark ground** — black on near-black is invisible,
  and the mark read as a flat hairline rectangle until its fill stepped up to
  the palette's raised surface (`--card-2`) under `data-scheme="dark"`. Dark
  expresses height as light, not as shadow. The sheet's own background/border/shadow are
  switched off on the cover, not in `global.css`, which the picker and the
  converter still use as it stands.
- **The cover's title is an overlaid bar, not a header in the sheet.** A box
  that fits the wordmark and nothing else, on its own drop shadow. The bar
  behind it has **no fill and no rule at all** — it is only a positioner, and
  it passes pointer events through to whatever is beneath. So the field slides
  *behind the box* on its shadow, rather than being masked by a band the width
  of the window. It behaves like a native large title: full size at the top,
  shrinking as the field moves under it and then **staying**, never absent, at
  either size.
  Two things about it are load-bearing, not styling:
  - It is `position: fixed` with a spacer holding its place. An in-flow bar
    that shrinks **shortens the document**, which on a short page hands back
    the very scroll that collapsed it — so it uncollapses, grows, and
    flickers. Overlaid, the document height never moves and the field never
    lurches when the title lands. A check asserts `scrollHeight` is identical
    either side of the collapse.
  - The trigger has a dead zone (enter at 56px, leave at 20px) rather than one
    threshold, so the state cannot chatter on a stray pixel.
  **THE PAGE is the vertical scroller**, never a box inside it — that is what
  makes the title shrink as you scroll. (The phone's edge rail that indexed the
  single band went with the band, 2026-10-13; the lists' own titles do that
  job now.) **It only engages where the page scrolls.** On a 1280×900
  window the cover does not scroll at all, so the title stays large — the right
  answer, there being nothing to have scrolled past. If it is wanted somewhere
  it always reads, the picker is the page that scrolls, and the parts would
  move to global.css + ui.js unchanged.
- **Two faces now: one to read, one to mark.** `--font-body` (Jost) for
  everything, `--font-mark` (League Spartan, self-hosted, 13KB, SIL OFL) for
  the cover wordmark and nothing else. The split came out of a real finding,
  not taste: Jost's double-storey `a` reads un-geometric in a face otherwise
  built from circles and triangles, and Jost carries no single-storey
  alternate (its only GSUB feature is `tnum`). League Spartan's `a` is a
  circle and a stem, which fixes the mark **and** is why it can't have the
  body — measured on the picker at the same px it renders smaller (shorter
  x-height) and wider per character, so copy reads greyer and runs longer, and
  matching Jost's reading size would mean raising the one 18px base the whole
  rem scale rides on. Display face, display use.
  Tracking on the mark opens to +0.02em. Below 820px the light/dark key sits
  above the mark rather than beside it — at 320 they don't both fit — and a
  browser sweep from 320 to 1280 holds the mark to one line, clear of the key.
  A check asserts the woff2 actually loaded, since a 404 would fall back to
  Jost and look merely slightly wrong rather than broken.
- **Category names are copy, and they can be long.** The picker's category is
  the question it answers ("What computer should I buy for architecture"), set
  by the operator over the earlier "Live recommendations". As a list title it
  shares a line with the rule (and the shelf's keys, when they show) and wraps
  onto a second line on a phone, so a future list should be added with that
  in view rather than assumed short.
