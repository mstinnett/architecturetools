# Hardware data — source files

These files are the **source of truth** for the picker. They compile into
`assets/data/hardware-data.json`, which the site loads at runtime.

**Do not edit `assets/data/hardware-data.json` directly — it is generated.**
Edit the files here instead.

## Files

| File | What it holds |
|------|----------------|
| `catalog.tsv` | Every CPU / GPU / Mac chip — its `key`, `name`, and standard `note` — defined **once**. |
| `specs-win.tsv` | Windows spec matrix: one row per `profile / scale / tier` cell. |
| `specs-mac.tsv` | Mac spec matrix: one row per cell. |
| `priorities.tsv` | The per-profile "where the money matters" note. |
| `extras.json` | Everything that isn't a table (apps, prebuilts, monitors, laptops, labels). |

The `.tsv` files are tab-separated, so they open as a clean grid in any
spreadsheet app — Numbers, Excel, Google Sheets — on desktop or mobile. You can
also edit them as plain text. Keep the header row; keep columns tab-separated.

## How a spec cell works

A cell names a CPU/GPU/chip by its **catalog key** (e.g. `rtx5090`), not the
full model name. Change a name or a shared note once in `catalog.tsv` and every
spec that references it updates.

The `cpuNote` / `gpuNote` columns control the note shown for that cell:

| Cell value | Result |
|------------|--------|
| *(blank)* | use the component's standard note from `catalog.tsv` |
| `plain text` | replace the note for this cell only |
| `+ text` | add this line on top of the component's standard note |

So the RTX 5090's `$2,900+` street-price caveat lives once in `catalog.tsv`, and
each cell adds its own flavor with `+ maximum viz`, `+ no scene too large`, etc.

## Publishing

- **On a phone or the web:** edit a file, commit it. A GitHub Action rebuilds
  `hardware-data.json` and the live picker updates — you don't run anything.
- **On a computer (optional):** `node tools/build-data.mjs` rebuilds it locally
  so you can preview before committing. No dependencies to install.

If a TSV has a typo — an unknown catalog key, a missing cell, a duplicate — the
build fails with a message pointing at the file and line, so it never ships.
