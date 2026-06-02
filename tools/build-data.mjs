#!/usr/bin/env node
// Build assets/data/hardware-data.json from the hand-edited sources in data/.
//
//   Sources (edit these):
//     data/catalog.tsv     CPUs / GPUs / Chips -- each model name + note, once
//     data/specs-win.tsv   Windows spec matrix, one row per cell
//     data/specs-mac.tsv   Mac spec matrix, one row per cell
//     data/priorities.tsv  the per-profile "where the money matters" note
//     data/extras.json     everything not tabular (apps, prebuilts, monitors...)
//
//   Output (generated -- do not hand-edit):
//     assets/data/hardware-data.json
//
// Spec cells reference catalog entries by key (e.g. gpu = "rtx5090"). A cell's
// cpuNote/gpuNote is blank to inherit the catalog note, plain text to replace
// it, or "+ text" to add a line on top of it -- resolved in the browser by
// hydrateSpecs() in index.html. Run: node tools/build-data.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROFILES = ['review', 'drafting', 'modeling', 'viz', 'modeling_viz', 'production'];
const SCALES = ['small', 'large'];
const TIERS = ['cheapest', 'value', 'best'];

const problems = [];
const fail = (msg) => problems.push(msg);

function readTSV(rel) {
  const text = readFileSync(join(ROOT, rel), 'utf8');
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  const header = lines.shift().split('\t');
  return lines.map((line, i) => {
    const cells = line.split('\t');
    const row = {};
    header.forEach((h, c) => { row[h] = (cells[c] ?? '').trim(); });
    row.__line = i + 2; // 1-based, +1 for header
    return row;
  });
}

// ---- catalogs ----
const CPUs = {}, GPUs = {}, Chips = {};
const catalogFor = { cpu: CPUs, gpu: GPUs, chip: Chips };
for (const r of readTSV('data/catalog.tsv')) {
  const target = catalogFor[r.kind];
  if (!target) { fail(`catalog.tsv line ${r.__line}: unknown kind "${r.kind}"`); continue; }
  if (!r.key) { fail(`catalog.tsv line ${r.__line}: missing key`); continue; }
  if (target[r.key]) fail(`catalog.tsv line ${r.__line}: duplicate ${r.kind} key "${r.key}"`);
  // GPUs carry a note (VRAM / price caveat); CPUs and Chips are name-only.
  target[r.key] = r.kind === 'gpu' ? { name: r.name, note: r.note || '' } : { name: r.name };
}

function checkRef(catalog, key, where, label) {
  if (!catalog[key]) fail(`${where}: unknown ${label} "${key}" (not in catalog.tsv)`);
}

// ---- spec matrices ----
function buildSpecs(rel, label, makeCell) {
  const byProfile = {};
  const seen = new Set();
  for (const r of readTSV(rel)) {
    const where = `${rel} line ${r.__line}`;
    if (!PROFILES.includes(r.profile)) fail(`${where}: bad profile "${r.profile}"`);
    if (!SCALES.includes(r.scale)) fail(`${where}: bad scale "${r.scale}"`);
    if (!TIERS.includes(r.tier)) fail(`${where}: bad tier "${r.tier}"`);
    const coord = `${r.profile}/${r.scale}/${r.tier}`;
    if (seen.has(coord)) fail(`${where}: duplicate cell ${coord}`);
    seen.add(coord);
    (byProfile[r.profile] ??= {})[r.scale] ??= {};
    byProfile[r.profile][r.scale][r.tier] = makeCell(r, where);
  }
  // every cell present?
  for (const p of PROFILES) for (const s of SCALES) for (const t of TIERS) {
    if (!byProfile[p]?.[s]?.[t]) fail(`${rel}: missing cell ${p}/${s}/${t}`);
  }
  return byProfile;
}

const winByProfile = buildSpecs('data/specs-win.tsv', 'win', (r, where) => {
  checkRef(CPUs, r.cpu, where, 'cpu');
  checkRef(GPUs, r.gpu, where, 'gpu');
  const cell = { cpu: r.cpu, cpuNote: r.cpuNote, gpu: r.gpu };
  if (r.gpuNote) cell.gpuNote = r.gpuNote; // blank = inherit the GPU's catalog note
  cell.ram = r.ram; cell.ramNote = r.ramNote; cell.storage = r.storage; cell.priceRange = r.price;
  return cell;
});

const macByProfile = buildSpecs('data/specs-mac.tsv', 'mac', (r, where) => {
  checkRef(Chips, r.chip, where, 'chip');
  return { chip: r.chip, cpuNote: r.cpuNote, memory: r.memory, storage: r.storage, price: r.price };
});

// ---- priorities ----
for (const r of readTSV('data/priorities.tsv')) {
  const where = `data/priorities.tsv line ${r.__line}`;
  const target = r.platform === 'win' ? winByProfile : r.platform === 'mac' ? macByProfile : null;
  if (!target) { fail(`${where}: bad platform "${r.platform}"`); continue; }
  if (!PROFILES.includes(r.profile)) { fail(`${where}: bad profile "${r.profile}"`); continue; }
  if (target[r.profile]) target[r.profile].priority = r.priority;
}
for (const [plat, t] of [['win', winByProfile], ['mac', macByProfile]]) {
  for (const p of PROFILES) if (t[p] && !('priority' in t[p])) fail(`priorities.tsv: missing ${plat}/${p}`);
}

function assembleSpecs(byProfile) {
  const out = {};
  for (const p of PROFILES) {
    out[p] = {};
    for (const s of SCALES) { out[p][s] = {}; for (const t of TIERS) out[p][s][t] = byProfile[p][s][t]; }
    out[p].priority = byProfile[p].priority;
  }
  return out;
}

const extras = JSON.parse(readFileSync(join(ROOT, 'data/extras.json'), 'utf8'));

if (problems.length) {
  console.error(`build-data: ${problems.length} problem(s):`);
  for (const m of problems) console.error('  - ' + m);
  process.exit(1);
}

// ---- assemble in the picker's expected key order ----
const data = {
  _comment: 'GENERATED -- do not edit by hand. Source: data/*.tsv (+ data/extras.json). '
    + 'Rebuild: node tools/build-data.mjs (CI rebuilds on push). See data/README.md.',
  CPUs, GPUs, Chips,
  Apps: extras.Apps,
  PickerOptions: extras.PickerOptions,
  WindowsSpecs: assembleSpecs(winByProfile),
  MacSpecs: assembleSpecs(macByProfile),
  Prebuilts: extras.Prebuilts,
  PrebuiltTypeLabels: extras.PrebuiltTypeLabels,
  PrebuiltTypeNotes: extras.PrebuiltTypeNotes,
  Monitors: extras.Monitors,
  Laptops: extras.Laptops,
  LaptopCategoryLabels: extras.LaptopCategoryLabels,
};

// Compact JSON: scalar-only objects/arrays on one line (one line per spec cell),
// everything else block-indented -- readable diffs, tidy if anyone glances at it.
const isScalar = (v) => v === null || ['string', 'number', 'boolean'].includes(typeof v);
function fmt(v, indent = 0) {
  const pad = '  '.repeat(indent), pad1 = '  '.repeat(indent + 1);
  if (Array.isArray(v)) {
    if (v.length === 0) return '[]';
    if (v.every(isScalar)) return '[ ' + v.map((x) => JSON.stringify(x)).join(', ') + ' ]';
    return '[\n' + v.map((x) => pad1 + fmt(x, indent + 1)).join(',\n') + '\n' + pad + ']';
  }
  if (v && typeof v === 'object') {
    const keys = Object.keys(v);
    if (keys.length === 0) return '{}';
    if (keys.every((k) => isScalar(v[k]))) return '{ ' + keys.map((k) => JSON.stringify(k) + ': ' + JSON.stringify(v[k])).join(', ') + ' }';
    return '{\n' + keys.map((k) => pad1 + JSON.stringify(k) + ': ' + fmt(v[k], indent + 1)).join(',\n') + '\n' + pad + '}';
  }
  return JSON.stringify(v);
}

writeFileSync(join(ROOT, 'assets/data/hardware-data.json'), fmt(data) + '\n');
console.log('build-data: wrote assets/data/hardware-data.json'
  + ` (${Object.keys(CPUs).length} CPUs, ${Object.keys(GPUs).length} GPUs, ${Object.keys(Chips).length} Chips, 72 spec cells)`);
