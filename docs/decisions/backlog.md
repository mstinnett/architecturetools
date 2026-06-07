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

- [ ] **`partition()` engine module — highest-leverage next build.** Source: HANDOFF.md §5. A sibling to `snap.js` reusing `snap` + `numberline`. One primitive unlocks four tools: tile run + joint (end cut), n sections + gaps (leftover), on-center spacing (studs/joists/pickets drift), baluster gap (smallest n with gap ≤ 4″). Follow the engine conventions (UMD wrapper, pure functions, inline test block, relative paths) and add `noindex` to any new WIP page.
- [ ] **Slope tool on the engine.** Source: HANDOFF.md §5. Uses the parser's `ratio` kind (rise vs run / vs code limit). Then fold the legacy standalone `slope-calculator.html` and `stair-calculator.html` onto the engine and retire the standalones.
- [ ] **Area + coverage tool on the engine.** Source: HANDOFF.md §5. Uses the parser's `area` kind (`makeArea`) — area, area ÷ coverage, sheet count. Then fold legacy `sheet-sizes.html` onto the engine.
- [ ] **Scale converter (quick win).** Source: HANDOFF.md §5. Pure parse, no snap — can land anytime.
- [ ] **Retire `dimension-converter.html`.** Superseded by `convert.html` (the engine-powered Precise Unit Converter). Remove rather than port.

## Open — provenance / hosting (loose ends from HANDOFF §4)

- [ ] **Add `noindex` to the `dev` WIP pages.** Source: HANDOFF.md §4. `convert.html` and the legacy calculators carry no `<meta name="robots" content="noindex, nofollow">`. Add it to anything not yet on `main`; remove on promotion.
- [ ] **Stand up a neutral preview host + `docs/staging.md`.** Source: HANDOFF.md §4. Recommended: Cloudflare Pages on its `*.pages.dev` URL (auto-noindexed; do not attach the custom domain). Never serve WIP under `architecture.tools` or a subdomain of it.

## Open — site structure (lower priority)

- [ ] **Richer AT-0 master cover (deferred behind picker-only launch).** On `main`, `index.html` *is* the picker. The fuller AT-0 cover — site thesis, a compact index of the sets, links to flagship pages — lands when more of the site is promoted.
- [ ] **Add / refine a calculator index as C-0.** Source: PROJECT.md. `calculators/index.html` as the calculators set cover: framing note, grouped links, a cover-sheet feel. Sensible once the engine-based tools settle.
- [ ] **Bring pages onto `assets/css/global.css`.** Source: PROJECT.md. The picker (`index.html`) uses inline styles; the calculators and `site-screen.html` do not yet import the shared stylesheet. Migrate as pages are touched.
- [ ] **Add thin A-series pages gradually (A-0, then A-1 … A-4).** Source: PROJECT.md / SITE_FRAMEWORK build order. A-1 Workstation Types, A-2 Monitors, A-3 Mobile First Setups, A-4 AI in Architecture.

## Done

- [x] **Precise Unit Converter + calculator engine.** Source: HANDOFF.md. `calculators/lib/` (`parse-length`, `snap`, `numberline`) plus `convert.html` — shipped and frozen on `dev`.
- [x] **Reconcile the agent docs with the engine thread.** Source: HANDOFF.md §6. `state.md` and `backlog.md` refreshed: engine + converter folded in, removed/deferred pages corrected, CNAME/workflow + CSV pipeline facts fixed.
- [x] **Repo hygiene: remove committed `.DS_Store` files and ignore them.** Source: ad-hoc (noticed at bootstrap). Run as the system's end-to-end dry-run — Rung 1, scout → implement → reviewer → commit.
