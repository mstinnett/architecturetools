---
description: Read-only status report for the autonomous work system.
---

Produce a concise, READ-ONLY status briefing. Change nothing — no edits, no
commits.

1. **Backlog** — from `docs/decisions/backlog.md`: count of open (`- [ ]`)
   items; list the next 3 titles.
2. **Decision queue** — from `docs/decisions/queue.md`: count and titles
   under `## Awaiting your decision`; count under `## Queued`; count under
   `## Deferred / tracking notes`.
3. **State doc** — from `docs/decisions/state.md`: when it was last updated,
   and any open items under "Active concerns".
4. **RFCs in flight** — list any `docs/decisions/rfc/*-A.md` that has no
   matching `*-decision.md` or `*-spec.md`.
5. **Recent activity** — `git log --oneline -8`.

Present it as a short briefing. Lead with anything that needs the operator:
awaiting decisions first, then blocked items, then queued forks. If
everything is quiet, say so in one line.
