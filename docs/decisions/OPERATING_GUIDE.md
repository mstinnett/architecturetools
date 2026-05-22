# Operating Guide — Autonomous Work & Decision System

This system works through the repo's backlog and contracts your
involvement to two things: **reviewing PRs** and **making genuine
product/values decisions**. Everything else it handles.

It is built on two ideas. The **escalation ladder** matches process rigor
to decision weight. **Active surfacing** pushes decisions that need you
into every session, instead of leaving them in a file to rot.

---

## Daily use — three commands

| Command | What it does |
|---|---|
| `/work-next` | Take the next backlog item through the ladder: scout → (fit-check) → implement → review → commit. Optionally pass an ad-hoc item: `/work-next fix the footer year`. |
| `/rfc-run` | Run the adversarial RFC pipeline over the next queued fork. Ends with a spec ready to implement, or a values question routed to you. |
| `/status` | Read-only briefing: backlog, queue, state doc, RFCs in flight. |

Commits accumulate on one long-running branch (batched-PR model). The
system never pushes, opens a PR, or merges — **you** do that.

---

## The escalation ladder

Every item is classified — **mechanically, by checklist, not by vibe**.

- **Rung 0 — gates (every commit, every rung).** `bash .claude/gate/run.sh`
  passes, and the `reviewer` agent returns APPROVE.
- **Rung 1 — trivial.** One clear conceptual change, obvious home, no
  design decision. `implementer` does it; `reviewer` gates it.
- **Rung 2 — non-trivial.** Has a design dimension settle-able against the
  codebase. `architect` fit-check (FIT / FIT-WITH-CAVEAT / RECONSIDER) plus
  a quick **Codex** cross-check. Agreement → proceed; concrete issue → fold
  it in; material disagreement → escalate.
- **Rung 3 — genuine fork.** Two-plus defensible answers with consequences.
  Full adversarial RFC: independent A (Claude) and B (Codex) drafts →
  cross-critique → a **fresh** referee → an implementor spec. Values calls
  are surfaced to you, never decided by the system.

**Escalate to Rung 3 if ANY one holds:** values-flavored · precedent-setting
· touches a documented contract · genuinely competitive options.
**When in doubt, escalate** — bounded process cost beats unbounded bad-call
risk.

---

## The decision queue and the briefing

`docs/decisions/queue.md` holds everything needing you: **Awaiting your
decision**, **Queued** forks, **Deferred** notes, **Resolved**. The
SessionStart hook (`.claude/hooks/session-start.sh`) prints a "needs your
attention" block at the start of every session — but only when there is
something to say. You never poll the file; the system pushes its state to
you.

`docs/decisions/state.md` is the architect's long-running memory — the live
architectural picture, recent decisions, active concerns.

---

## Prerequisites (run locally)

This system is designed to run on a **local Claude Code CLI** instance.

1. **Codex CLI** — the independent second-opinion agent for Rungs 2 and 3.
   Install and authenticate it; the system calls
   `codex exec --sandbox read-only < scratch/<file>`. Without it, Rung 2
   degrades to single-model reasoning (flagged as a caveat) and Rung 3
   cannot run — its adversarial independence depends on a genuinely
   different model reading the code itself.
2. **The gate** — `.claude/gate/` is a dependency carve-out (npm: htmlhint,
   stylelint). It is **not** part of the published site. On first run,
   `run.sh` installs the dependencies automatically (`npm` required;
   installs cleanly on openSUSE). `node_modules/` is git-ignored.
3. **Git** — work happens on a branch off `main`. Never commit to `main`,
   never auto-merge, never bypass gates or hooks.

---

## Setup decisions (recorded)

The brief's "Decisions you must make", as resolved for this repo:

1. **Work source** — an in-repo backlog doc, `docs/decisions/backlog.md`,
   seeded from `docs/PROJECT.md`'s "Current priorities" plus ad-hoc
   operator asks. One version-controlled source, no GitHub dependency.
2. **Second-opinion agent** — the Codex CLI, headless and sandboxed
   read-only. A genuinely different model reading the code independently —
   that independence is what makes Rung 3 adversarial.
3. **Branch / PR model** — batched: commits accumulate on one long-running
   branch under a single PR. (Switch to one-PR-per-item if review load
   ever demands it.)
4. **State doc / queue locations** — `docs/decisions/state.md` and
   `docs/decisions/queue.md`. Stable paths; the hook depends on them.
5. **Reviewer strictness** — REVISE for a fixable, concrete issue (one
   fixup attempt, then surface); BLOCK for anything that breaks a gate or a
   documented contract.
6. **Rung 0 gate (repo adaptation)** — this site has no build/test/lint by
   design. The gate is htmlhint + stylelint + an internal-link check,
   isolated as a dependency carve-out under `.claude/gate/` so the site
   itself stays free of build tooling. Verified passing on a clean
   checkout before bootstrap.

The optional **watcher** agent and **batched-vs-per-item** PR split are
left as documented future options; not adopted at bootstrap to avoid scope
creep.

---

## File map

```
.claude/
  agents/      implementer, architect, reviewer, rfc-author, rfc-referee
  commands/    work-next, rfc-run, status
  hooks/       session-start.sh        (the active briefing)
  gate/        run.sh + htmlhint/stylelint/link-check  (dependency carve-out)
  settings.json                        (wires the SessionStart hook)
docs/decisions/
  backlog.md        the work source
  queue.md          the decision queue (active surface)
  state.md          the architect's long-running memory
  OPERATING_GUIDE.md  this file
  rfc/              RFC drafts, decision logs, implementor specs
scratch/            transient prompt files for Codex (git-ignored)
```
