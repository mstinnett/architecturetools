---
description: Run the next backlog item through the escalation ladder (scout, fit-check, implement, review).
argument-hint: [optional ad-hoc item description]
---

You are orchestrating ONE work item through the escalation ladder. Follow
these phases exactly. Do not skip the checklist; do not eyeball the rung.

## Phase 0 — pick the item
If `$ARGUMENTS` is non-empty, that text is an ad-hoc operator ask — use it
as the item. Otherwise read `docs/decisions/backlog.md` and take the
topmost open (`- [ ]`) item. If there is no item, stop and say so.

Restate the item in one sentence before continuing.

## Phase 1 — SCOUT (mechanical rung classification)
Run this checklist. It is mechanical — answer each question, do not vibe it.

**Escalate to Rung 3 if ANY ONE is true:**
- Values-flavored — the choice is about what to optimize for (speed vs.
  extensibility, simplicity vs. flexibility, ship-now vs. build-right).
- Precedent-setting — there is NO precedent for this pattern in the
  codebase, the docs, or `docs/decisions/state.md`.
- Touches a documented contract — a schema, an API boundary, a written
  architectural rule, any design doc carrying a status (`docs/PROJECT.md`,
  `docs/SITE_FRAMEWORK.md`, `docs/decisions/state.md`).
- Genuinely competitive options — two-plus viable options with real
  tradeoffs and no factual or convention default to break the tie.

If any is true → **Rung 3**. Go to Phase 3R.

**Otherwise separate Rung 1 from Rung 2:**
- **Rung 1** — mechanically obvious: a single clear edit (or a few edits
  that are one conceptual change), an unambiguous home, no design decision.
  Go to Phase 2.
- **Rung 2** — has a design dimension, but settle-able by shape-reasoning
  against the codebase (not values, not precedent-setting, not
  contract-touching). Go to Phase 3.

**When in doubt, escalate.** A bad architectural call is unbounded; the RFC
pipeline is bounded. State which rung you chose and why.

## Phase 2 — Rung 1: straight through
1. Invoke the `implementer` agent with the item.
2. Invoke the `reviewer` agent on the resulting commit.
3. Handle the verdict — see Phase 4.

## Phase 3 — Rung 2: fit-check + cross-check
1. Draft a short proposed approach (a few sentences: what to change, where).
2. Invoke the `architect` agent with the item + proposed approach → get
   FIT / FIT-WITH-CAVEAT / RECONSIDER.
3. **Codex cross-check.** Write the item + proposed approach to
   `scratch/codex-crosscheck.md`, instructing Codex: "sanity-check this
   approach against the codebase; flag anything wrong or a clearly better
   option — be brief." Then run:
   `codex exec --sandbox read-only < scratch/codex-crosscheck.md`
   If `codex` is not installed (`command -v codex` fails), skip this step,
   note that the second opinion is UNAVAILABLE and the cross-check degraded
   to single-model reasoning, and carry that forward as a caveat to surface.
4. **Reconcile:**
   - Architect FIT + Codex sane → proceed to implement (Phase 2 steps 1–3),
     passing any caveats to the implementer.
   - Codex raises a concrete, fixable issue → fold it in as a caveat,
     proceed.
   - They materially disagree on the approach → that disagreement IS the
     signal this is a genuine fork. Escalate: go to Phase 3R.

## Phase 3R — Rung 3: file the fork
Do NOT implement. File the item to `docs/decisions/queue.md` under
`## Queued` as a `### <title>` block with: Source, Blocks (what work this
gates), bounded Options if known, a Recommendation if there is an obvious
lean, and the Default if no decision is made. Then tell the operator to run
`/rfc-run`. Stop.

## Phase 4 — handle the reviewer verdict
- **APPROVE** — done. Mark the backlog item complete (`- [x]`, move it to
  the Done section). Note completion briefly.
- **REVISE** — give the `implementer` ONE fixup attempt with the reviewer's
  FIX, then re-review. If it now APPROVEs, done. If not, revert the commit
  and surface the item to the queue.
- **BLOCK** — revert the commit. File the item to `docs/decisions/queue.md`
  with the reviewer's SURFACE note. Do not retry.

## Phase 5 — close out
Report: the item, the rung and why, what happened, the commit hash if any,
and the next backlog item. Commits accumulate on the current working branch
(batched-PR model). Never push, never open a PR, never merge — the operator
does that.
