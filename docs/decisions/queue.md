# Decision Queue

The active surface of the autonomous work system. The SessionStart hook
reads this file and pushes a briefing into every Claude Code session, so
you never have to remember to check it.

Lifecycle: an item moves **Queued → (RFC pipeline) → Awaiting your decision
OR Resolved**. Deferred items are parked and not counted.

Every item is a `###` block in this shape:

    ### <short title>
    - **Source:** backlog item / scout / fit-check disagreement / reviewer BLOCK
    - **Blocks:** what work is waiting on this
    - **Options:** the bounded choices, if known
    - **Recommendation:** the obvious lean, if there is one
    - **Default if no decision:** what happens if you say nothing

---

## Awaiting your decision

_(none)_

## Queued

_(none)_

## Deferred / tracking notes

_(none)_

## Resolved

_(none)_
