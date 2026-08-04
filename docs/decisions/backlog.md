# Backlog — Work Source

The single source of work for the autonomous system. Seeded from the
"Current priorities" of `docs/PROJECT.md` and the build plan in
`docs/HANDOFF.md`; ad-hoc operator asks are added here too. `/work-next`
takes the topmost open item.

Mark items `- [ ]` (open) or `- [x]` (done). Keep the most important open
item on top. New findings are surfaced here or to the queue — never
silently appended elsewhere.

All build work happens on `dev`; finished tools promote to `main` one at a
time (see `docs/HANDOFF.md` §2).

## Open — calculator engine (the active thread)

- [ ] **Partition tool page (convert.html-style) on `partition.js`.** Source: HANDOFF.md §5. The primitive is built; this is the UI layer — a page that parses a run (via `parse-length`), runs `partition` in the chosen mode (tiles / sections / on-center / balusters), and draws the layout + residual the way `convert.html` draws the number line. Reuse `numberline`'s format helpers for the readouts. Add `noindex` to the new page.
- [ ] **Slope tool on the engine.** Source: HANDOFF.md §5. Uses the parser's `ratio` kind (rise vs run / vs code limit). Then fold the legacy standalone `slope-calculator.html` and `stair-calculator.html` onto the engine and retire the standalones.
- [ ] **Area + coverage tool on the engine.** Source: HANDOFF.md §5. Uses the parser's `area` kind (`makeArea`) — area, area ÷ coverage, sheet count. Then fold legacy `sheet-sizes.html` onto the engine.
- [ ] **Scale converter (quick win).** Source: HANDOFF.md §5. Pure parse, no snap — can land anytime.
- [ ] **Retire `dimension-converter.html`.** Superseded by `convert.html` (the engine-powered Precise Unit Converter). Remove rather than port.

## Open — engine/convert review follow-ups (lower priority)

These came out of the `convert.html` + lib review. The engine-level items
(single-source rounding kernel, public-input validation, infeasibility `reason`
codes, range docs) are **done**; what remains is the converter UI and a parser
extension. The converter is feature-frozen, so these are deliberate, not urgent.

- [ ] **Parser: stable `reason`/`errorCode` for unresolved states.** Source: review #4. Distinguish division-by-zero, conflicting adjacent units, missing operand, mixed area/length, etc., so the UI renders copy from a code (mirrors what `partition` now does for infeasible layouts). Touches the frozen parser — scope carefully.
- [ ] **convert.html: decide pending-span policy + area/ratio polish.** Source: review #3 / usability #5. Keep salvage-parse for the converter but make the "ignoring …" note prominent; consider a `strict` flag for future code/check calculators; either label area/ratio as bonus outputs or give them the length path's formatting.

## Open — provenance / hosting (loose ends from HANDOFF §4)

- [ ] **Stand up a neutral preview host + `docs/staging.md`.** Source: HANDOFF.md §4. Recommended: Cloudflare Pages on its `*.pages.dev` URL (auto-noindexed; do not attach the custom domain). Never serve WIP under `architecture.tools` or a subdomain of it.

## Open — site structure (lower priority)

- [ ] **Add / refine a calculator index as C-0.** Source: PROJECT.md. `calculators/index.html` as the calculators set cover: framing note, grouped links, a cover-sheet feel. Sensible once the engine-based tools settle.
- [ ] **Bring the remaining pages onto the shared stylesheet.** Source: PROJECT.md. The cover (`index.html`), the picker (`picker.html`) and the converter (`convert.html`) share `assets/css/global.css` + `assets/css/tokens.css` (family accents via `data-family`, one dark scheme — see Done below); `components.html` and `dimension-converter.html` link it and inherit the theme but haven't been reviewed against it. The legacy calculators and `site-screen.html` still carry their own inline styles. Migrate/review as pages are touched.
- [ ] **Add thin A-series pages gradually (A-0, then A-1 … A-4).** Source: PROJECT.md / SITE_FRAMEWORK build order. A-1 Workstation Types, A-2 Monitors, A-3 Mobile First Setups, A-4 AI in Architecture.

## Done

- [x] **AT-0 master cover + shared light/dark key.** Source: operator ("make the landing page A0, computer chooser and unit converter to start; add a dark/light switch on the unit converter"). Worked on `main` at the operator's direction. `index.html` is now the cover sheet, worked in landscape (title block on the left edge, heavy division, ruled index down the field, update date at the foot of the title block; stacks to portrait below 820px). Copy is descriptive only — the thesis line, the "more calculators coming" note and the independence claim were all struck as editorializing, and SITE_FRAMEWORK's "one-line thesis" bullet with them. The picker moved back to `picker.html` — replacing its own redirect stub, so old links still resolve — with canonical/og retargeted, a crumb linking home, and a footer back-link in place of the tool list. The sun/moon toggle graduated out of the picker into shared code: `.scheme-toggle` in `global.css` (hosted by `.page-header`, which now supplies position + right gutter), wiring in `assets/js/ui.js` (wires every `.scheme-toggle`, persists, fires `schemechange`), and the button added to the converter and the cover. Verified: gate green; 37-check headless-Chromium pass — both schemes, 1280 + 390, cross-page scheme persistence, picker desk art repaint, converter still computing, no horizontal overflow, no title/toggle collision.
- [x] **UI review pass + converter promotion.** Source: operator ("act on all of them"). One 18px base size site-wide; calculator shell graduated to global.css with labeled slots (HANDOFF §3); all pills became `<button>`s with `aria-pressed` + focus ring + coarse-pointer hit heights; picker DOM order = visual order, dead inline CSS trimmed; shared `assets/js/ui.js` (esc/press); converter URL state (`?d=&t=&g=`) + auto-flip echo note; footer date from `Meta.dataUpdated`; interim nav nailed (SITE_FRAMEWORK) and wired both ways; `convert.html` + lib promoted to `main` (noindex dropped). Verified: 22-check browser smoke (keyboard included), zero page errors, clip sweep still 0/9597, gate green.
- [x] **numberline: label clearance at narrow widths.** Source: operator report ("round down · nearest" clipped off the left in the 1 m imperial case on a phone). The bound blocks hug the hatch edges and extend outward; the side margins now reserve room for each block's widest line (conservative glyph estimate — the module is pure and can't measure), shrinking the magnified cell instead of losing text, with a per-label clamp as a final guarantee (true-value label included). Verified in-browser: 910 curated + 600 randomized figures, ~16k labels measured with getBBox, zero outside the viewBox (was 300). New inline regression test; all engine suites green (snap 19, numberline 13, partition 35).
- [x] **Consolidate to one global.css; single --paper definition.** Source: operator request. `global2.css` renamed over `assets/css/global.css` (the old cool-neutral sheet retired — the new sheet is a drop-in superset of its classes/tokens, so `components.html` and `dimension-converter.html` re-theme with zero edits). `--paper` is now defined only in `tokens.css` (the brand's warm-white anchor); the theme stopped re-declaring it light and dark, and the unused `--page-bg` alias was removed. Picker + converter verified computed-style identical in both schemes.
- [x] **Shared CSS for the picker + converter.** Source: operator request. `docs/In Progress/tokens.css` promoted to `assets/css/tokens.css` (the canonical palette); `global2.css` now imports it and owns the family-accent system (`<html data-family="…">` selects one of the seven family accents, light + dark) and the one shared dark scheme (surfaces / text / lines / shadows / number-line strokes). The duplicated `:root` mirrors and dark blocks were removed from `index.html` (family `picker`) and `convert.html` (family `drafting`). Verified pixel-identical in both schemes via headless-Chromium computed-style diff.
- [x] **convert.html UI fixes from the review.** Source: review usability #1/#3, #2. Fixed the mobile input-font selector (`.field-mono` → `#dimInput`); added an area out-of-range / non-finite guard parallel to the length guard (echo shows "area out of range", render skipped); reworded the Min/Max rows ("use for a max — won't exceed" / "use for a min — won't fall below") so "for a maximum" can't be read as "gives the maximum". Carry the clearer Min/Max labels into the partition tool page.
- [x] **Engine hardening from the convert.html review.** `numberline.js` + `partition.js` delegate the floor/nearest/ceil kernel to `snap.js` (one source of truth — removed the duplicated `snapTriple`/`pick`); `numberline()` validates its public inputs; `partition` infeasibility carries stable `reason` codes; range bound documented; conventions updated (HANDOFF §3). All three suites green (snap 19, numberline 12, partition 35).
- [x] **`partition()` engine module.** Source: HANDOFF.md §5. `calculators/lib/partition.js` — the layout primitive (sibling to `snap.js`, delegates its rounding kernel). Four modes (sections / tiles / on-center / balusters) behind one dispatcher; pure, fails loud, 35 inline `node` tests passing. The four tool pages are now thin layers on it (tracked above).
- [x] **Add `noindex` to the `dev` WIP pages.** Source: HANDOFF.md §4. `<meta name="robots" content="noindex, nofollow">` (with a "remove on promotion" comment) added to all 11 pages not yet on `main`: `components.html`, `site-screen.html`, and every `calculators/*.html`.
- [x] **Precise Unit Converter + calculator engine.** Source: HANDOFF.md. `calculators/lib/` (`parse-length`, `snap`, `numberline`) plus `convert.html` — shipped and frozen on `dev`.
- [x] **Reconcile the agent docs with the engine thread.** Source: HANDOFF.md §6. `state.md` and `backlog.md` refreshed: engine + converter folded in, removed/deferred pages corrected, CNAME/workflow + CSV pipeline facts fixed.
- [x] **Repo hygiene: remove committed `.DS_Store` files and ignore them.** Source: ad-hoc (noticed at bootstrap). Run as the system's end-to-end dry-run — Rung 1, scout → implement → reviewer → commit.
