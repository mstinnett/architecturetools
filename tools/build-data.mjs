#!/usr/bin/env node
// Build assets/data/hardware-data.json from the hand-edited tables in data/.
//
//   Sources (edit these — they open as a grid in Numbers / any spreadsheet):
//     data/cpus.csv        CPU recs — each an Intel + AMD option, defined once
//     data/gpus.csv        GPU recs — name + standard note, defined once
//     data/chips.csv       Mac chips — name, defined once
//     data/specs-win.csv   Windows spec matrix, one row per cell
//     data/specs-mac.csv   Mac spec matrix, one row per cell
//     data/priorities.csv  the per-profile "where the money matters" note
//     data/extras.json     everything not tabular (apps, prebuilts, monitors...)
//
//   Output (generated — do not hand-edit):
//     assets/data/hardware-data.json
//
// Workflow: edit a CSV in Numbers, "Export To → CSV", commit. CI rebuilds the
// JSON (or run `node tools/build-data.mjs` locally). Spec cells reference catalog
// entries by key (e.g. gpu = "rtx5090"); a cell's cpuNote/gpuNote is blank to
// inherit the catalog note, plain text to replace it, or "+ text" to add a line
// on top of it — resolved in the browser by hydrateSpecs() in index.html.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROFILES = ['review', 'drafting', 'modeling', 'viz', 'modeling_viz', 'production'];
const SCALES = ['small', 'large'];
const TIERS = ['cheapest', 'value', 'best'];

const problems = [];
const fail = (msg) => problems.push(msg);

// RFC-4180-ish parser: handles quoted fields, doubled "" escapes, and embedded
// commas (Numbers quotes those). Auto-detects comma vs tab from the header.
function parseDelimited(text) {
  const head = text.slice(0, (text.indexOf('\n') + 1 || text.length + 1) - 1);
  const delim = head.includes('\t') && !head.includes(',') ? '\t' : ',';
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === delim) { row.push(field); field = ''; }
    else if (ch === '\r') { /* skip */ }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function readTable(rel) {
  // strip a leading BOM — some spreadsheet CSV exports (Excel "CSV UTF-8") add one
  const rows = parseDelimited(readFileSync(join(ROOT, rel), 'utf8').replace(/^\uFEFF/, ''));
  const header = (rows.shift() || []).map((h) => h.trim());
  const out = [];
  rows.forEach((cells, i) => {
    if (!cells.some((c) => c.trim() !== '')) return; // skip blank lines
    const o = { __line: i + 2 };
    header.forEach((h, c) => { o[h] = (cells[c] ?? '').trim(); });
    out.push(o);
  });
  return out;
}

// ---- catalogs (each in its own sheet) ----
const CPUs = {}, GPUs = {}, Chips = {};
for (const r of readTable('data/cpus.csv')) {
  if (!r.key) { fail(`cpus.csv line ${r.__line}: missing key`); continue; }
  if (CPUs[r.key]) fail(`cpus.csv line ${r.__line}: duplicate cpu key "${r.key}"`);
  if (!r.intel && !r.amd) fail(`cpus.csv line ${r.__line}: "${r.key}" has neither an intel nor an amd option`);
  CPUs[r.key] = { intel: r.intel || '', amd: r.amd || '', note: r.note || '' };
}
for (const r of readTable('data/gpus.csv')) {
  if (!r.key) { fail(`gpus.csv line ${r.__line}: missing key`); continue; }
  if (GPUs[r.key]) fail(`gpus.csv line ${r.__line}: duplicate gpu key "${r.key}"`);
  GPUs[r.key] = { name: r.name, note: r.note || '' };
}
for (const r of readTable('data/chips.csv')) {
  if (!r.key) { fail(`chips.csv line ${r.__line}: missing key`); continue; }
  if (Chips[r.key]) fail(`chips.csv line ${r.__line}: duplicate chip key "${r.key}"`);
  Chips[r.key] = { name: r.name };
}

const checkRef = (cat, key, where, label, file) => { if (!cat[key]) fail(`${where}: unknown ${label} "${key}" (not in ${file})`); };

// ---- spec matrices ----
function buildSpecs(rel, makeCell) {
  const byProfile = {};
  const seen = new Set();
  for (const r of readTable(rel)) {
    const where = `${rel} line ${r.__line}`;
    if (!PROFILES.includes(r.profile)) fail(`${where}: bad profile "${r.profile}"`);
    if (!SCALES.includes(r.scale)) fail(`${where}: bad scale "${r.scale}"`);
    if (!TIERS.includes(r.tier)) fail(`${where}: bad tier "${r.tier}"`);
    const coord = `${r.profile}/${r.scale}/${r.tier}`;
    if (seen.has(coord)) fail(`${where}: duplicate cell ${coord}`);
    seen.add(coord);
    ((byProfile[r.profile] ??= {})[r.scale] ??= {})[r.tier] = makeCell(r, where);
  }
  for (const p of PROFILES) for (const s of SCALES) for (const t of TIERS) {
    if (!byProfile[p]?.[s]?.[t]) fail(`${rel}: missing cell ${p}/${s}/${t}`);
  }
  return byProfile;
}

const winByProfile = buildSpecs('data/specs-win.csv', (r, where) => {
  checkRef(CPUs, r.cpu, where, 'cpu', 'cpus.csv');
  checkRef(GPUs, r.gpu, where, 'gpu', 'gpus.csv');
  const cell = { cpu: r.cpu, cpuNote: r.cpuNote, gpu: r.gpu };
  if (r.gpuNote) cell.gpuNote = r.gpuNote; // blank = inherit the GPU's catalog note
  cell.ram = r.ram; cell.ramNote = r.ramNote; cell.storage = r.storage; cell.priceRange = r.price;
  return cell;
});

const macByProfile = buildSpecs('data/specs-mac.csv', (r, where) => {
  checkRef(Chips, r.chip, where, 'chip', 'chips.csv');
  return { chip: r.chip, cpuNote: r.cpuNote, memory: r.memory, memoryNote: r.memoryNote, storage: r.storage, price: r.price };
});

// ---- priorities ----
for (const r of readTable('data/priorities.csv')) {
  const where = `data/priorities.csv line ${r.__line}`;
  const target = r.platform === 'win' ? winByProfile : r.platform === 'mac' ? macByProfile : null;
  if (!target) { fail(`${where}: bad platform "${r.platform}"`); continue; }
  if (!PROFILES.includes(r.profile)) { fail(`${where}: bad profile "${r.profile}"`); continue; }
  if (target[r.profile]) target[r.profile].priority = r.priority;
}
for (const [plat, t] of [['win', winByProfile], ['mac', macByProfile]])
  for (const p of PROFILES) if (t[p] && !('priority' in t[p])) fail(`priorities.csv: missing ${plat}/${p}`);

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

const data = {
  _comment: 'GENERATED -- do not edit by hand. Source: data/*.csv (+ data/extras.json). '
    + 'Edit in Numbers, export CSV, commit; CI rebuilds. Local: node tools/build-data.mjs. See data/README.md.',
  CPUs, GPUs, Chips,
  Apps: extras.Apps,
  PickerOptions: extras.PickerOptions,
  WindowsSpecs: assembleSpecs(winByProfile),
  MacSpecs: assembleSpecs(macByProfile),
  Prebuilts: extras.Prebuilts,
  PrebuiltTypeLabels: extras.PrebuiltTypeLabels,
  PrebuiltTypeNotes: extras.PrebuiltTypeNotes,
  Monitors: extras.Monitors,
  MonitorConfigs: extras.MonitorConfigs,
  Laptops: extras.Laptops,
  LaptopCategoryLabels: extras.LaptopCategoryLabels,
  Glossary: extras.Glossary,
};

// Compact JSON: scalar-only objects/arrays on one line, else block-indented.
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
console.log(`build-data: wrote assets/data/hardware-data.json (${Object.keys(CPUs).length} CPUs, ${Object.keys(GPUs).length} GPUs, ${Object.keys(Chips).length} Chips, 72 spec cells)`);
