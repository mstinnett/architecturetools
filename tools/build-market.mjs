#!/usr/bin/env node
/* build-market.mjs — compiles data/market/*.csv → l/lib/market-data.js
   =========================================================================
   The market catalog pipeline, same shape as build-data.mjs: CSV tables are
   the single source of truth (one row per real SKU, with retailer, tier,
   model, and the URL the numbers came from), compiled to a small GENERATED
   UMD data module the Furniture Fit page loads with a plain <script> tag
   (no fetch — file:// previews and jsdom smokes stay dependency-free).

   Source columns (see data/market/README.md):
     class,size,state,retailer,tier,model,w_in,d_in,url,note
   Compiled shape (integer engine units, 1 in = 24384; anonymized points):
     MarketData.classes[key] = { label, n, points: [[w, d, tier(, state)]…] }
   keys: sofa-3 · loveseat · dining-rect · bed-frame-<size>
   tier: 0 mass · 1 mid · 2 upper       state: 0 fixed · 1 closed · 2 extended

   Compilation quantizes inches to the lattice (round to nearest unit) —
   the same parse-time quantization contract as parse-length. Fails loudly
   on unknown classes/tiers/states, out-of-range dimensions, or missing
   URLs, so a bad row never ships silently.
   ========================================================================= */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'data', 'market');
const OUT = join(ROOT, 'l', 'lib', 'market-data.js');
const IN = 24384;

const TIERS = { mass: 0, mid: 1, upper: 2 };
const STATES = { '': 0, fixed: 0, closed: 1, extended: 2 };
const SIZES = ['twin', 'full', 'queen', 'king', 'calking'];

// sanity windows (inches) per class — a row outside these is a data error
const RANGES = {
  'sofa-3': { w: [66, 112], d: [28, 48] },
  'loveseat': { w: [44, 76], d: [28, 48] },
  'dining-rect': { w: [36, 152], d: [24, 60] },
  'bed-frame': { w: [38, 90], d: [74, 104] },
};

function parseCSV(text) {
  // minimal CSV: no embedded newlines; quoted fields may hold commas
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.startsWith('#')) continue;
    const cells = [];
    let cur = '', inQ = false;
    for (const ch of line) {
      if (inQ) { if (ch === '"') inQ = false; else cur += ch; }
      else if (ch === '"') inQ = true;
      else if (ch === ',') { cells.push(cur); cur = ''; }
      else cur += ch;
    }
    cells.push(cur);
    rows.push(cells.map(c => c.trim()));
  }
  return rows;
}

const classes = {};
function bucket(key, label) {
  if (!classes[key]) classes[key] = { label, points: [], seen: new Set() };
  return classes[key];
}

let total = 0, dropped = 0;
const files = readdirSync(SRC).filter(f => f.endsWith('.csv'));
if (!files.length) { console.error('build-market: no CSVs under data/market/'); process.exit(1); }

for (const file of files) {
  const rows = parseCSV(readFileSync(join(SRC, file), 'utf8'));
  const header = rows.shift();
  const col = Object.fromEntries(header.map((h, i) => [h, i]));
  for (const need of ['class', 'size', 'state', 'retailer', 'tier', 'model', 'w_in', 'd_in', 'url']) {
    if (!(need in col)) { console.error(`build-market: ${file} missing column "${need}"`); process.exit(1); }
  }
  for (const r of rows) {
    total++;
    const cls = r[col.class], size = r[col.size], state = r[col.state] || '';
    const tier = TIERS[r[col.tier]];
    const w = parseFloat(r[col.w_in]), d = parseFloat(r[col.d_in]);
    const fail = (why) => { console.error(`build-market: DROP ${file}: ${why}: ${r.join(',').slice(0, 90)}`); dropped++; };

    if (tier === undefined) { fail('bad tier'); continue; }
    if (!isFinite(w) || !isFinite(d)) { fail('bad dims'); continue; }
    if (!r[col.url]) { fail('missing url'); continue; }
    if (!(state in STATES)) { fail('bad state'); continue; }

    let key, label, range;
    if (cls === 'sofa-3') { key = 'sofa-3'; label = '3-seat sofas'; range = RANGES['sofa-3']; }
    else if (cls === 'loveseat') { key = 'loveseat'; label = 'loveseats'; range = RANGES['loveseat']; }
    else if (cls === 'dining-rect') { key = 'dining-rect'; label = 'rectangular dining tables'; range = RANGES['dining-rect']; }
    else if (cls === 'bed-frame') {
      if (!SIZES.includes(size)) { fail('bad bed size'); continue; }
      key = 'bed-frame-' + size; label = size + ' bed frames'; range = RANGES['bed-frame'];
    } else { fail('unknown class'); continue; }

    if (w < range.w[0] || w > range.w[1] || d < range.d[0] || d > range.d[1]) { fail('out of range'); continue; }

    const b = bucket(key, label);
    const dedupe = `${r[col.retailer]}|${r[col.model]}|${state}`.toLowerCase();
    if (b.seen.has(dedupe)) { fail('duplicate retailer+model+state'); continue; }
    b.seen.add(dedupe);

    const pt = [Math.round(w * IN), Math.round(d * IN), tier];
    if (cls === 'dining-rect') pt.push(STATES[state]);
    b.points.push(pt);
  }
}

const snapshot = new Date().toISOString().slice(0, 7);
const outClasses = {};
for (const [key, b] of Object.entries(classes)) {
  b.points.sort((a, z) => a[0] - z[0]);
  outClasses[key] = { label: b.label, n: b.points.length, points: b.points };
}

const body = JSON.stringify({ snapshot, classes: outClasses }, null, 0);
const js = `/* market-data.js — GENERATED by tools/build-market.mjs from data/market/*.csv
   Do not hand-edit; edit the CSVs and re-run \`node tools/build-market.mjs\`.
   Integer engine units (1 in = 24384). tier: 0 mass · 1 mid · 2 upper.
   dining points carry a 4th field — state: 0 fixed · 1 closed · 2 extended. */
(function (root, factory) {
  var mod = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = mod;
  else { root.MarketData = mod; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  return ${body};
});
`;
writeFileSync(OUT, js);

const counts = Object.entries(outClasses).map(([k, v]) => `${k} ${v.n}`).join(' · ');
console.log(`build-market: ${total} rows read, ${dropped} dropped → ${counts} (snapshot ${snapshot})`);
if (dropped > total * 0.2) { console.error('build-market: more than 20% of rows dropped — inspect the source data'); process.exit(1); }
