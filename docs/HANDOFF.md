# Handoff — architecture.tools

_Written 2026-06-07; updated 2026-06-08. Hand-off point: the **Precise Unit
Converter is frozen ("done for now")**, the **engine has been hardened** (one
source of truth for the rounding kernel; modules validate their own inputs),
and the **`partition.js` layout primitive has shipped** — tested, but with **no
tool page yet**. This doc is for the next context picking up the calculator
work. It is self-contained; read it before touching `calculators/`._

**Progress since the original handoff (all on `dev`, see `state.md` for detail):**
- `partition.js` shipped — the layout primitive (sections / tiles / on-center /
  balusters), 35 inline tests. Its tool page is the next build.
- Engine hardened after a review: `numberline` + `partition` now delegate the
  rounding kernel to `snap.js`; `numberline()` validates its inputs; infeasible
  layouts carry stable `reason` codes.
- `convert.html` UI fixes (mobile-CSS selector, area out-of-range guard, Min/Max
  wording).
- `noindex` added to all 11 `dev` WIP pages; agent docs (`state.md`,
  `backlog.md`, `PROJECT.md`) reconciled with reality.

---

## 1. Where things stand (one paragraph)

`architecture.tools` is a public, no-build static site (vanilla HTML/CSS/JS).
The **live site is the picker only**. A shared calculation **engine**
(`calculators/lib/`) now exists; it powers one shipped tool — the converter —
and holds a second primitive, `partition.js`, that is built and tested but has
**no tool page yet**. Everything else in `calculators/` is older, standalone,
and does **not** use the engine. The next concrete step is the **partition tool
page** (a `convert.html`-style UI over `partition.js`); after that, slope /
area+coverage / scale. The converter itself needs no further work right now.

---

## 2. Repo & branch layout

- **`main` — the live site (picker only).** Trimmed in commit `f01b200`:
  removed `components.html`, `site-screen.html`, and all of `calculators/`.
  Keeps `index.html` (the picker = home), `picker.html` (redirects to `/`),
  `assets/`, `data/`, `tools/`, `docs/`, the `build-data` workflow, `CNAME`,
  dotfiles. The picker does **not** link to any deferred page, so nothing 404s.
- **`dev` — the workbench (this branch).** Full prior site **plus** the engine
  and converter. All work-in-progress happens here. Promote finished tools to
  `main` one at a time.
- **Promotion model:** build on `dev` → preview on a neutral host (§4) → when a
  tool is done, move that single page (and any new `lib/` module) to `main` in a
  small commit. Live the moment it's on `main`.

> **Stale-branch note:** the local `claude/build-this-L58m6` was deleted; the
> **remote** copy plus several other `claude/*` branches could **not** be deleted
> — this environment's git proxy silently rejects branch deletion (`git push
> --delete` returns "Everything up-to-date"). Delete them from the GitHub UI.
> Leave `claude/quirky-rubin-FZS99` and `claude/update-typography-borders-lTwou`
> — they were pushed very recently and may be active sessions.

---

## 3. The engine (`calculators/lib/`) — the thing that gets extended

The mental model for the whole family: **parse a dimension expression → resolve
it against a discrete constraint → show the residual on a number line.** The
converter's constraint is a continuous fabrication grid (1/8″, custom _n_, mm).
Every planned tool is the same operation with a different constraint.

| Module | What it is | Notes |
|---|---|---|
| `parse-length.js` | Expression evaluator over dimensioned quantities | kinds: `length`, `area`, `bare`, `scalar`, `ratio`. Handles feet-inches, fractions, metric, mixed units, `+` and `*`, unit inference. **Never throws.** |
| `snap.js` | Integer-exact snap of a length to a grid | `floor`/`ceil`/`nearest` = **Max ≤ / Min ≥ / Nearest**. **Fails loud** on programmer error. Has an inline test block at the bottom. |
| `numberline.js` | Pure SVG-string figure (no DOM) | true-value tick + 3 snaps + residual hatch bands + dual source/target scale. "The figure is the product." **Delegates the rounding kernel to `snap.js`** (see conventions). |
| `partition.js` | Run → whole-number layout + residual | one primitive, four modes (`sections`/`tiles`/`onCenter`/`balusters`). **Fails loud** on programmer error; **flags** infeasible layouts with a stable `reason` code. Delegates rounding to `snap.js`. Inline test block. |
| `parse-length.fixtures.js` | Parser test fixtures | — |

**Conventions any new module/tool must follow:**
- UMD-style wrapper (`(function(root,factory){…})`) so modules load in the
  browser **and** under node for tests.
- Pure functions. `numberline` returns a string; `snap` / `partition` fail loud
  on misuse; the parser never throws. Keep that split.
- **One source of truth per primitive.** The floor/nearest/ceil rounding policy
  lives ONLY in `snap.js`; `numberline` and `partition` call it rather than
  re-implement it (resolved lazily so page `<script>` order doesn't matter).
  Don't clone a kernel to dodge load order — delegate. (Hardened after review.)
- **Shared modules validate their own public inputs.** A module reused by more
  than one page can't assume a disciplined caller — `snap`, `partition`, and
  `numberline` all reject unsafe units / grids at the boundary.
- **Unresolved/infeasible states carry a stable `reason` code**, not just prose,
  so each tool page renders its own copy. (Converter's parser is the next place
  to extend this; see the review notes.)
- Ship an inline test block (`eq`/`threw` helpers) like `snap.js`.
- **Range:** `Number` integer math on the 1/960 mm lattice, exact within
  `MAX_SAFE_INTEGER` only. A precise engine within that bound, not an
  arbitrary-precision one; cap inputs at the UI as the converter does.
- **Relative asset paths only** (`../assets/...`, `lib/...`). Absolute `/...`
  paths break githack / pages.dev previews. (All current files comply.)
- Add `<meta name="robots" content="noindex, nofollow">` to any page not yet on
  `main`; remove it as part of promotion (see §4).

---

## 4. Hosting & provenance rule (decided this session)

The concern is **provenance**, not secrecy: a preview must never look like, resolve
as, or get indexed as part of `architecture.tools`.

- **Never serve WIP on `architecture.tools` or a subdomain of it.** A brand
  subdomain gets discovered via Certificate Transparency logs and indexed under
  your name — exactly how "unlisted" pages leak. Use a **neutral host**.
- **GitHub Pages serves only `main`**, so `dev` structurally cannot resolve under
  the domain. Good.
- **Recommended preview:** Cloudflare Pages on its `*.pages.dev` URL (do **not**
  attach the custom domain). Cloudflare auto-adds `X-Robots-Tag: noindex` to
  `pages.dev` deployments. Add Cloudflare Access only if true privacy is needed.
- **Quick look:** `raw.githack.com/mstinnett/architecturetools/dev/<path>` works
  (off-brand, relative paths resolve) but is **not** noindexed — fine for a
  glance, not a standing preview.

**Status:** `noindex` is now on all 11 `dev` WIP pages (`components.html`,
`site-screen.html`, every `calculators/*.html`) — remove on promotion. Still
open: no `docs/staging.md`, and no neutral preview host is configured, so WIP can
only be viewed locally for now.

---

## 5. Presumed route through (the build plan)

The calculator family, grouped by the engine primitive each reuses:

| Constraint | Residual shown | Tools |
|---|---|---|
| Continuous grid | snap error | **Converter** ✅ done |
| Finite module (size + gap) | the cut / leftover | `partition.js` ✅ primitive done (**tool page next**) — tile cuts, n sections with gaps, on-center layout, baluster spacing |
| Ratio of two lengths | rise vs run / vs code limit | **slope**, ramp & drainage, stair risers |
| Product of two lengths | area, area ÷ coverage | **area**, coverage/quantity, sheet count |
| (none — pure parse) | — | **scale converter** |

**What's nearly free:** the parser already has an `area` kind (`makeArea`) and a
`ratio` kind — so **area** and **slope** are thin layers, and **scale** needs no
snap at all.

**`partition.js` (shipped) — what each mode computes,** for the tool page that
will wrap it. Exports `partition(spec)` plus `sections` / `tiles` / `onCenter` /
`balusters`; every mode returns the same Layout shape (`count`, `item`, `gap`,
`used`, `residual`, `exact`, `positions`, `feasible`/`reason`):
- **n sections + gaps:** `section = (L − (n−1)·g) / n`, snapped; residual = what
  won't divide evenly.
- **tile run + joint:** module `m = tile + joint`; full count `= floor((L+j)/m)`;
  residual = end cut (the Layout also returns the balanced two-end split).
- **on-center (studs/joists/pickets):** intervals `k = ceil(L / s_max)`; actual
  spacing `= L/k`, snapped; residual = drift across the run.
- **baluster gap:** smallest _n_ where `gap = (R − n·w)/(n+1) ≤ maxGap`.

**Suggested order:**
1. ~~`partition()` primitive~~ ✅ **done** — `calculators/lib/partition.js`,
   35 inline tests. **Next: its tool page** (parse a run with `parse-length`,
   run `partition`, draw the layout + residual reusing `numberline`'s format
   helpers; add `noindex`; clearer Min/Max-style labels per the review).
2. **slope** (then fold legacy `slope`/`stair` onto the engine).
3. **area + coverage** (then fold legacy `sheet-sizes`).
4. **scale** — quick win anytime.

**Legacy pages** (`calculators/*.html`, all standalone, no engine):
`slope`, `stair`, `sheet-sizes` get **rebuilt onto** the engine per the order
above. `dimension-converter.html` is **superseded by `convert.html` — retire it**
rather than port. The code-compliance calculators (`occupant-load`,
`egress-width`, `fixture-calc`, `parking-ratio`) are a **different lineage**
(table lookups, not the dimensional engine) — out of scope for this thread.

---

## 6. Reconcile before relying on the agent docs

> **Done (2026-06-07).** `state.md` and `backlog.md` have been reconciled: the
> engine + converter are folded in, the removed/deferred pages and the
> CNAME/workflow/CSV-pipeline facts are corrected, and the backlog now leads
> with the engine build plan (§5). The notes below record what was fixed.

`docs/decisions/state.md` and `docs/decisions/backlog.md` (the autonomous-agent
system) were **out of date** as of this handoff:
- They still list `components.html` / `site-screen.html` as live "flagship"
  pages — they were removed from `main` (§2).
- They say no `CNAME`/workflow exists in the repo — both now exist.
- They do **not** mention the `lib/` engine or the converter at all — the
  calculator-engine thread is currently tracked **only here**.

Fold this thread into `backlog.md`, and refresh `state.md`, before driving work
through `/work-next` or the architect agent.
