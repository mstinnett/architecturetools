---
description: Run the Rung 3 adversarial RFC pipeline over a queued fork.
argument-hint: [optional queue item title]
---

You are running the **Rung 3 adversarial RFC pipeline** for ONE genuine
fork. The independence of the two drafts is the whole point — protect it.

## Phase 0 — pick the fork
If `$ARGUMENTS` names a queue item, use it. Otherwise read
`docs/decisions/queue.md` and take the topmost item under `## Queued`. If
there is none, stop and say so.

Pick a short slug for the item (e.g. `c0-cover-layout`). All artifacts go
under `docs/decisions/rfc/<slug>-*.md`.

## Phase 1 — two independent drafts
1. **RFC-A.** Invoke the `rfc-author` agent (Stage 1) → it writes
   `docs/decisions/rfc/<slug>-A.md`.
2. **RFC-B.** Write the problem statement + context to
   `scratch/codex-rfc-<slug>.md`, instructing Codex to draft a full
   independent RFC (problem, context with file refs, proposal,
   alternatives, evidence, open questions). Run:
   `codex exec --sandbox read-only < scratch/codex-rfc-<slug>.md`
   Save its output to `docs/decisions/rfc/<slug>-B.md`.
   **Codex must not see RFC-A.** If `codex` is unavailable, STOP: a Rung 3
   fork cannot be resolved adversarially without a genuinely independent
   second agent. Surface to the queue that this fork needs Codex (or an
   equivalent independent model) and tell the operator.

## Phase 2 — cross-critique (no self-critique)
3. **A critiques B.** Invoke `rfc-author` (Stage 2) with RFC-B → it writes
   `docs/decisions/rfc/<slug>-crit-A-on-B.md`.
4. **B critiques A.** Write RFC-A plus a critique instruction to
   `scratch/codex-crit-<slug>.md`; run
   `codex exec --sandbox read-only < scratch/codex-crit-<slug>.md`; save to
   `docs/decisions/rfc/<slug>-crit-B-on-A.md`.

## Phase 3 — fresh referee
5. Invoke the `rfc-referee` agent — a FRESH instance — with RFC-A, RFC-B,
   and both critiques. It writes `docs/decisions/rfc/<slug>-decision.md`,
   classifying every contested point (factual / taste / values) and
   resolving or surfacing each.

## Phase 4 — route the outcome
- If the decision log has a **"For the human"** section (values calls, or a
  whether-to-act flag): move the queue item to `## Awaiting your decision`
  in `docs/decisions/queue.md` with the tradeoff stated plainly and the
  default-if-no-decision. Then STOP — do not synthesize past a values
  boundary.
- Otherwise: invoke `rfc-author` (Stage 3) with the decision log → it
  writes the self-contained implementor spec to
  `docs/decisions/rfc/<slug>-spec.md`. Add a high-priority item to the TOP
  of the Open section in `docs/decisions/backlog.md`: "Implement RFC spec:
  <slug> — see docs/decisions/rfc/<slug>-spec.md". Move the queue item to
  `## Resolved`.

## Phase 5 — close out
Report: the fork, where it landed (awaiting human / spec ready), and the
artifact paths. Delete this slug's files from `scratch/`.
