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

## Open — provenance / hosting (loose ends from HANDOFF §4)

- [ ] **Stand up a neutral preview host + `docs/staging.md`.** Source: HANDOFF.md §4. Recommended: Cloudflare Pages on its `*.pages.dev` URL (auto-noindexed; do not attach the custom domain). Never serve WIP under `architecture.tools` or a subdomain of it.

## Open — site structure (lower priority)

- [ ] **Richer AT-0 master cover (deferred behind picker-only launch).** On `main`, `index.html` *is* the picker. The fuller AT-0 cover — site thesis, a compact index of the sets, links to flagship pages — lands when more of the site is promoted.
- [ ] **Add / refine a calculator index as C-0.** Source: PROJECT.md. `calculators/index.html` as the calculators set cover: framing note, grouped links, a cover-sheet feel. Sensible once the engine-based tools settle.
- [ ] **Bring pages onto `assets/css/global.css`.** Source: PROJECT.md. The picker (`index.html`) uses inline styles; the calculators and `site-screen.html` do not yet import the shared stylesheet. Migrate as pages are touched.
- [ ] **Add thin A-series pages gradually (A-0, then A-1 … A-4).** Source: PROJECT.md / SITE_FRAMEWORK build order. A-1 Workstation Types, A-2 Monitors, A-3 Mobile First Setups, A-4 AI in Architecture.

## Done

- [x] **`partition()` engine module.** Source: HANDOFF.md §5. `calculators/lib/partition.js` — the layout primitive (sibling to `snap.js`, reuses its integer division). Four modes (sections / tiles / on-center / balusters) behind one dispatcher; pure, fails loud, 34 inline `node` tests passing. The four tool pages are now thin layers on it (tracked above).
- [x] **Add `noindex` to the `dev` WIP pages.** Source: HANDOFF.md §4. `<meta name="robots" content="noindex, nofollow">` (with a "remove on promotion" comment) added to all 11 pages not yet on `main`: `components.html`, `site-screen.html`, and every `calculators/*.html`.
- [x] **Precise Unit Converter + calculator engine.** Source: HANDOFF.md. `calculators/lib/` (`parse-length`, `snap`, `numberline`) plus `convert.html` — shipped and frozen on `dev`.
- [x] **Reconcile the agent docs with the engine thread.** Source: HANDOFF.md §6. `state.md` and `backlog.md` refreshed: engine + converter folded in, removed/deferred pages corrected, CNAME/workflow + CSV pipeline facts fixed.
- [x] **Repo hygiene: remove committed `.DS_Store` files and ignore them.** Source: ad-hoc (noticed at bootstrap). Run as the system's end-to-end dry-run — Rung 1, scout → implement → reviewer → commit.
