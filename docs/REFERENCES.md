# References — the document bibliography

One ledger of every external document the calculators cite, what they take
from it, and how far each value has been checked. The suite's rule is that a
tool **surfaces information with its source attached and never rules on it**
— this file is where those sources live as a list, so a stale citation or an
unverified number is findable in one place instead of eleven.

**Maintenance rule:** a new citation in any page lands here in the same
commit. A value's status here must match the tag it renders on the page.

This is the **internal** ledger (per-value verification status). The
**public-facing** reference sheet — which codes apply when, plus the library
of standards behind the tools with editions, access, and source links — is
`calculators/codes.html`; keep the two in step when a standard is added.

## Status vocabulary

- **verified** — checked against ICC/source material during a session, with
  the means recorded (these searches return the code's own wording or a
  published ICC worked example).
- **cross-checked** — agrees with an independent in-repo source (e.g. the
  pre-engine page's table) but has not been read against the document itself
  this cycle.
- **memory** — standard, widely-cited values written from training knowledge;
  high confidence, but read your copy before anything rides on them. Pages
  rendering these values as data carry a visible draft tag.

---

## IBC 2021 — International Building Code

| Provision | What the suite takes from it | Cited by | Status |
|---|---|---|---|
| Table 1004.5 | occupant load factors (curated set: assembly, business, educational, mercantile/storage, institutional/residential, industrial) | occupant-load | **cross-checked** against the pre-engine page's table; mercantile corrected to the flat 60 gross the 2015 edition moved to. Not read against the table itself this cycle. |
| §1004.5 | "not less than" area ÷ factor — the round-up's actual basis | occupant-load | **memory** of the wording; the page quotes the effect, not the sentence |
| §1004.5.1 | building official may approve an actual lower number | occupant-load (citation line) | memory |
| §1004.6 | fixed seating counts seats, not area | occupant-load (citation line) | memory |
| §1005.3.1 / §1005.3.2 | egress width factors — stairs 0.3″/occupant, other components 0.2″; exceptions 0.2″/0.15″ with sprinklers per 903.3.1.1 **and** emergency voice/alarm; not in Groups H, I-2 | egress-width | **cross-checked** (pre-engine page carried the same four factors); exception conditions from memory |
| §1005.5 | losing one of multiple exits can't halve capacity | egress-width (citation line) | memory |
| §1010.1.1 | door clear width 32″ min | egress-width | memory |
| §1011.2 | stair width 44″ min; 36″ serving fewer than 50 | egress-width | memory |
| §1011.5.2 | riser 4″ min / 7″ max; tread 11″ min | stairs (IBC pill) | memory |
| §1020 | corridor width minimums | egress-width (cited at section level deliberately — subsection numbering moved between editions) | memory |
| §1006.2.1.1 / §1006.3 | 3 exits at 501–1,000 occupants, 4 above 1,000 | exits | **verified** 2026-06-10 — search returned the provision's wording ([codes.iccsafe.org](https://codes.iccsafe.org/content/IBC2024P1/chapter-10-means-of-egress) result set) |
| Table 1006.2.1 | single-exit allowances (per-occupancy OL + common-path caps) | exits — **as a pointer only**, draft-tagged; no rows shipped | not shipped as data |
| §1007.1.1 (+ exception) | exit separation ≥ 1/2 the max overall diagonal; 1/3 sprinklered per 903.3.1.1; measured straight-line, to doorway width / closest riser / ramp start | exits | **verified** 2026-06-10 — search returned the rule and measurement points ([up.codes §1007](https://up.codes/s/exit-and-exit-access-doorway-configuration) result set) |
| §1012 | ramps — named as mirroring the §405 figures | ramp (citation line) | memory |
| 903.3.1.1 | the sprinkler system the width/separation exceptions key off | egress-width, exits | memory (named, not characterized) |

## IRC 2021 — International Residential Code

| Provision | What the suite takes from it | Cited by | Status |
|---|---|---|---|
| R311.7.5.1 | riser height max 7 3/4″ | stairs (IRC pill, default) | memory — standard value, unchanged across recent editions |
| R311.7.5.2 | tread depth min 10″ | stairs | memory |

## IPC 2021 — International Plumbing Code

| Provision | What the suite takes from it | Cited by | Status |
|---|---|---|---|
| §403.1.1 | occupant load divided in half per sex, ratios applied per sex | fixture-calc | **verified** 2026-06-10 — search returned the provision's wording |
| Table 403.1 — Business WC | 1 per 25 for the first 50, 1 per 50 for the remainder | fixture-calc | **verified** 2026-06-10 — ICC 2021 Significant Changes worked example ([iccsafe.org PDF](https://www.iccsafe.org/wp-content/uploads/2021_SigChanges_IPC_403.1.1.pdf) result) |
| Table 403.1 — Business lavatories | 1 per 40 for the first 80, 1 per 80 for the remainder | fixture-calc | **verified** 2026-06-10 — same source |
| Table 403.1 — A-1 water closets | male 1:125, female 1:65 | fixture-calc | **verified** 2026-06-10 — search returned the ratios with their 1,000-occupant worked example |
| Table 403.1 — all other ratios (A-2, A-3, E, F, M, S, R-2, drinking fountains, service sinks) | the page's remaining defaults | fixture-calc | **memory** — every one renders a `draft — check the table` tag until replaced from a checked copy (backlog records the procedure) |
| §403.2 | separate facilities + small-occupancy exceptions | fixture-calc (citation line, named only) | memory |

## ADA 2010 Standards / ICC A117.1 — §405 Ramps

| Provision | What the suite takes from it | Cited by | Status |
|---|---|---|---|
| 405.2 (+ Exception) | running slope max 1:12; alterations only: 1:10 ≤ 6″ rise, 1:8 ≤ 3″ rise | ramp | memory — standard values; the exception is cited, never auto-applied |
| 405.3 | cross slope max 1:48 | ramp (citation line) | memory |
| 405.6 | rise per run max 30″ | ramp — drives the run segmentation | memory |
| 405.7 | landings 60″ long min, top/bottom/between, 60″×60″ at turns | ramp | memory |
| 405.8 | handrails on rises over 6″ | ramp (fact row) | memory |

## Other standards

| Document | What the suite takes from it | Cited by | Status |
|---|---|---|---|
| ANSI A108.02 | named as the spec-check pointer for tile joint-width variation — **no values quoted** | run (tiles mode, joint-relaxation note) | pointer only, by design |
| ANSI/ASME Y14.1 sheet series | ANSI A–E sheet dimensions (8.5×11 … 34×44) | sheet-sizes | memory — standard published sizes; ARCH series is customary practice, no single standard cited |

## Deliberately uncited — named figures without a pinned section

These are places the suite states a number while *telling the user to source
it*, because pinning a section would overstate what's been checked or stamp a
judgment the user owns:

- **run.html, balusters** — "common guardrail references give 4″ (102 mm)";
  the 4″-sphere lineage is real but edition- and occupancy-dependent, so the
  max gap stays the user's input.
- **slope.html, common call-outs** — 1:48 cross slope/drainage, 1:20
  walkway/ramp boundary, 1:12 ramp, 2:12 low-slope shingle: located against
  the user's slope as "call-outs", with the page saying the governing figure
  depends on edition, occupancy, and exceptions.
- **stairs.html, comfort rules** — 2R+T 24–26, R+T 17–18, R×T 70–75:
  labelled "rules of thumb, not code"; they have no document to cite.
- **sheet-sizes.html, title-block strips** — stated on the page as this
  page's assumption, not a standard.
- **area.html / occupant-load.html, gross vs net glosses** — plain-language
  descriptions of the two bases; the table's own definitions govern.
