# Hardware data — source files

These files are the **source of truth** for the picker. They compile into
`assets/data/hardware-data.json`, which the site loads at runtime.

**Do not edit `assets/data/hardware-data.json` directly — it is generated.**
Edit the files here instead.

## Files

| File | What it holds |
|------|----------------|
| `catalog.csv` | Every CPU / GPU / Mac chip — its `key`, `name`, and standard `note` — defined **once**. |
| `specs-win.csv` | Windows spec matrix: one row per `profile / scale / tier` cell. |
| `specs-mac.csv` | Mac spec matrix: one row per cell. |
| `priorities.csv` | The per-profile "where the money matters" note. |
| `extras.json` | Everything that isn't a table (apps, prebuilts, monitors, laptops, labels). |

## Editing in Numbers

1. Open the `.csv` in Numbers (double-click, or File → Open). It imports as a grid.
2. Edit. Keep the header row and the columns as they are.
3. **File → Export To → CSV…**, and save *over* the same file in `data/`.
4. Commit the changed `.csv`.

Any spreadsheet works (Excel, LibreOffice), and you can also edit the `.csv` as
plain text. Numbers may wrap some fields in quotes on export (e.g. prices and
notes that contain commas) — that's expected and the build handles it.

## How a spec cell works

A cell names a CPU/GPU/chip by its **catalog key** (e.g. `rtx5090`), not the full
model name. Change a name or a shared note once in `catalog.csv` and every spec
that references it updates.

The `cpuNote` / `gpuNote` columns control the note shown for that cell:

| Cell value | Result |
|------------|--------|
| *(blank)* | use the component's standard note from `catalog.csv` |
| `plain text` | replace the note for this cell only |
| `+ text` | add this line on top of the component's standard note |

So the RTX 5090's `$2,900+` street-price caveat lives once in `catalog.csv`, and
each cell adds its own flavor with `+ maximum viz`, `+ no scene too large`, etc.

## Publishing

- **Commit a CSV** and a GitHub Action rebuilds `hardware-data.json` — the live
  picker updates, you don't run anything.
- **Optional, on a computer:** `node tools/build-data.mjs` rebuilds it locally so
  you can preview before committing. No dependencies to install.

If a CSV has a typo — an unknown catalog key, a missing cell, a duplicate — the
build fails with a message pointing at the file and line, so it never ships.
