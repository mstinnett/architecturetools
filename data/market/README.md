# Market dimension seed — source files

These CSVs are the **source of truth** for the market-fit gauge in the Furniture
Fit tool (`l/furniture.html`). Each row is one real furniture SKU, with its
retailer, price tier, model name, footprint in inches, and the URL the numbers
came from.

They compile into `l/lib/market-data.js`:

```
node tools/build-market.mjs
```

**`l/lib/market-data.js` is GENERATED. Do not hand-edit it.** Edit the CSVs here
and re-run the compiler. The compiled module holds only anonymized points
(width, depth, tier, and — for dining — extension state) in integer engine units;
retailer, model, note, and URL stay in the CSVs and are not shipped to the page.

## What the gauge does with this

The tool measures the open slot around a piece you place and reports how many
catalog SKUs of that class would fit it — for example, "62% of 3-seat sofas fit
this slot · 23 of 37". It is a count of what the market actually sells at those
dimensions, not a recommendation.

## Column contract

Header row, exactly:

```
class,size,state,retailer,tier,model,w_in,d_in,url,note
```

| Column | Meaning |
|--------|---------|
| `class` | One of `sofa-3`, `loveseat`, `dining-rect`, `bed-frame`. |
| `size` | Bed size for `bed-frame` rows (`twin`/`full`/`queen`/`king`/`calking`). Empty for every other class. |
| `state` | Extension state for `dining-rect` rows (`fixed`/`closed`/`extended`). Empty for every other class. A dining row with no state is treated as `fixed`. |
| `retailer` | The seller the row was read from (e.g. `IKEA`, `West Elm`, `Room & Board`). |
| `tier` | Price tier: `mass`, `mid`, or `upper`. |
| `model` | The product name as listed. Used for dedupe and provenance; not compiled into the shipped data. |
| `w_in` | Width in inches — see the per-family note below. |
| `d_in` | Depth in inches — see the per-family note below. |
| `url` | The product (or spec) page the dimensions came from. Required; a row without one is dropped. |
| `note` | Free text: source detail, conversions, and any flag on an unusual value. |

### What `w_in` and `d_in` mean per family

The axes are not the same across families. Each row records the **outer/overall
footprint**, not the usable or mattress dimension.

- **Sofas (`sofa-3`, `loveseat`)** — `w_in` is overall width, `d_in` is overall
  depth (front to back).
- **Dining tables (`dining-rect`)** — `w_in` is the **length** (the long axis),
  `d_in` is the **width** (the short axis). The gauge can rotate a table, so it
  measures the figure against the longer run of the slot.
- **Beds (`bed-frame`)** — `w_in` is the frame's overall width, `d_in` is the
  frame's overall length. This is the **frame footprint** that stands in the
  room, including headboard and any storage overhang — not the mattress size.

## Classes and compiled keys

| `class` | `size` / `state` | Compiled key(s) |
|---------|------------------|-----------------|
| `sofa-3` | — | `sofa-3` |
| `loveseat` | — | `loveseat` |
| `dining-rect` | `state`: `fixed` \| `closed` \| `extended` | `dining-rect` |
| `bed-frame` | `size`: `twin` \| `full` \| `queen` \| `king` \| `calking` | `bed-frame-<size>` |

An **extension table carries two rows** with the same model — one `closed` and
one `extended` — so the gauge can answer for either state. A fixed table is a
single `fixed` row. Beds split by size into separate compiled keys
(`bed-frame-queen`, `bed-frame-king`, and so on); a `calking` key is supported by
the compiler but not present in this snapshot.

## Tiers

Three price tiers, with the retailers that appear in this seed:

| Tier | Retailers present |
|------|-------------------|
| `mass` | Ashley, IKEA, Target, Wayfair, Zinus |
| `mid` | Article, Burrow, CB2, Castlery, Crate & Barrel, Floyd, Pottery Barn, Thuma, West Elm |
| `upper` | Arhaus, Design Within Reach, RH, Room & Board |

The gauge lets the reader filter to one tier or view all tiers together.

## Provenance and method

This seed was assembled on **2026-07-19** by web-research agents. It is honest
about how the numbers were obtained:

- The session's egress proxy **blocked direct fetches** of retailer product pages
  and of dimensions.com. Dimensions were therefore read from **search-result spec
  text that quotes those pages**, and the product URL is recorded per row so a
  number can be re-checked later against its source.
- Values were **cross-checked against known reference dimensions** where possible
  (standard mattress sizes, a model's other size variants, second listings of the
  same SKU). Metric source figures were converted to inches and the **cm-to-inch
  conversions were verified**.
- Rows whose value looked unusual but checked out are kept and **flagged in the
  `note`** (for example, an extra-deep sofa, a storage bed whose side drawers make
  the frame longer than the mattress, or a headboard wider than the mattress by
  design). One row (Arhaus Kensington) records that the exact per-SKU width could
  not be confirmed because the page was blocked; its note says so.

This is **one snapshot of the market, not a live feed.** Prices, sizes, and the
lineup change. To refresh it, edit the CSVs and re-run the compiler — nothing
fetches on its own.

## Honesty rules the gauge enforces

- **A percentage never travels without its count.** The gauge always shows
  "X% · fits of n", so a small sample can't read as a confident number.
- **A class with fewer than 8 SKUs shows no gauge.** In this snapshot
  `bed-frame-twin` (n=1) and `bed-frame-full` (n=4) are present in the data but
  fall below that floor, so the tool draws no gauge for them rather than quoting a
  percentage from a handful of rows.
- **The compiler drops a row rather than ship a bad one.** It drops rows that
  fall outside the per-class sanity ranges, that lack a URL, or that duplicate an
  existing `retailer` + `model` + `state`. It also fails the whole build loudly on
  an unknown class, tier, or bed size, and aborts if more than 20% of rows drop.

## Counts in this snapshot

Compiled from the CSVs as formatted here (149 rows, 0 dropped):

| Compiled key | n | Gauge renders? |
|--------------|---|----------------|
| `sofa-3` | 37 | yes |
| `loveseat` | 15 | yes |
| `dining-rect` | 55 | yes |
| `bed-frame-queen` | 24 | yes |
| `bed-frame-king` | 13 | yes |
| `bed-frame-full` | 4 | no — below the 8-SKU floor |
| `bed-frame-twin` | 1 | no — below the 8-SKU floor |

Files: `sofas.csv` (52 rows: `sofa-3` + `loveseat`), `dining-tables.csv`
(55 rows), `beds.csv` (42 rows).

## Adding rows

A good row:

- comes from the **retailer's own spec** for a real, currently sold SKU (an
  aggregator or dimensions.com listing is acceptable when the retailer page is
  unreachable — record which one in the `url`);
- uses the **overall / outer dimensions** on the correct axes for the family (see
  the `w_in` / `d_in` note above), not the seating or mattress size;
- carries the **URL** it was read from and, if any value is unusual, a `note`
  saying why it's still correct;
- puts a `size` on bed rows and a `state` on dining rows (two rows for an
  extension table), and leaves those columns empty otherwise.

**Dedupe rule:** a row is a duplicate if another row shares the same `retailer`,
`model`, and `state` (case-insensitive). That is why an extension table's two
rows coexist — they differ in `state` — and why two width variants of one line
must differ in their `model` text (e.g. include the size, `Anton … 72in` vs
`Anton … 86in`).

## CSV format notes

- One line per SKU; **no embedded newlines.**
- A field containing a comma (or a double-quote, such as an inch mark in a model
  name) is wrapped in double quotes, with any embedded quote doubled — standard
  CSV. The compiler's parser skips blank lines and lines beginning with `#`, so
  each file opens with a `#` comment banner.
- Numbers are kept as written; decimals are allowed.
