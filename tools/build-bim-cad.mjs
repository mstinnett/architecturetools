#!/usr/bin/env node
/* build-bim-cad.mjs — compiles data/bim-cad.json → the matrix rows in
   bim-cad.html (between the matrix:start / matrix:end comments).
   =========================================================================
   The same shape as build-pdf-markup.mjs, with this page's columns. The JSON
   is the source of truth for every tool: its group, its tier ("leader" for
   an editorial shortlist pick, "new" for a newcomer, "" for neither), one
   cell per column, price, notes. Every tool in the "free" group, and any
   tool with "free": true (a free edition elsewhere in the table), carries
   data-free for the Free filter.

   A cell is [value, label, evidence]:
     value     yes | part | no | unk (the vendor does not say)
     label     1–3 words shown under the mark ("" for none)
     evidence  the page that proves it, ideally a #:~:text= deep link to the
               sentence. The mark becomes a plain link to it.
   Every yes or part cell should carry evidence; the build lists the ones
   that do not, so the gaps stay visible.

   A group with "webOnly": true (In the browser) runs on no platform but the
   web, so its rows carry only the web cell, for the Web filter, and the
   group gets a table of its own with no platform columns. In their place
   it has 3d and bim marks and a stage cell of [text, evidence]. Groups either
   side of it render as tables of their own too, so the page keeps the
   group order. The build writes every table, head included, between the
   matrix:start / matrix:end comments.

   Rows render as static HTML, so the page reads in full without
   JavaScript. Run: node tools/build-bim-cad.mjs
   ========================================================================= */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'data', 'bim-cad.json');
const PAGE = join(ROOT, 'bim-cad.html');

const COLS = [
  ['win', 'Windows'], ['mac', 'Mac'], ['linux', 'Linux'], ['ipad', 'iPad'], ['web', 'Web'],
  ['drawings', 'Drawings'], ['dwg', 'DWG'], ['ifc', 'IFC'], ['revit', 'Revit exchange'], ['team', 'Shared model'],
];
// the browser table's own columns, in place of the platforms: two marks and
// the design stage, a cell of [text, evidence]
const MODEL = [['3d', '3D model'], ['bim', 'BIM elements'], ['stage', 'Stage']];
const PLATS = COLS.slice(0, 5).map(c => c[0]);
const CAPS = COLS.slice(5).map(c => c[0]);
const MARK = { yes: '&#9679;', part: '&#9680;', no: '&ndash;', unk: '?' };
const SAY = { yes: 'yes', part: 'partly', no: 'no', unk: 'not stated' };

const attr = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const fail = msg => { console.error('build-bim-cad: ' + msg); process.exit(1); };

const { groups, tools } = JSON.parse(readFileSync(DATA, 'utf8'));
const missing = [];
const ids = new Set();

function cell(tool, key, label, i) {
  const c = tool.cells[key];
  if (key === 'stage') {
    if (!c || c.length !== 2 || !c[0]) fail(`${tool.id}: cell stage must be [text, evidence]`);
    if (!c[1]) missing.push(`${tool.id}.stage`);
    const txt = `<span class="vh">${label}: </span>${c[0]}`;
    return `<td class="m-stage">${c[1] ? `<a class="m-ev" href="${attr(c[1])}" rel="noopener">${txt}</a>` : txt}</td>`;
  }
  if (!c || c.length !== 3) fail(`${tool.id}: cell ${key} must be [value, label, evidence]`);
  const [v, t, ev] = c;
  if (!MARK[v]) fail(`${tool.id}: cell ${key} has unknown value "${v}"`);
  if ((v === 'yes' || v === 'part') && !ev) missing.push(`${tool.id}.${key}`);
  const cls = 'm-' + v + (i === 5 ? ' m-cap1' : '');
  let inner = `<span class="m" aria-hidden="true">${MARK[v]}</span><span class="vh">${label}: ${SAY[v]}${t ? ', ' + t : ''}</span>${t ? `<span class="m-txt">${t}</span>` : ''}`;
  if (ev) inner = `<a class="m-ev" href="${attr(ev)}" rel="noopener">${inner}</a>`;
  return `<td class="${cls}">${inner}</td>`;
}

// the heading row's titles, and the filter each heading toggles
const TITLE = { win: 'Windows', mac: 'Mac', linux: 'Linux', ipad: 'iPad', web: 'Web',
  drawings: '2D drawings and sheets', dwg: 'Opens and saves DWG', ifc: 'IFC import and export', revit: 'Revit exchange', team: 'Shared model',
  '3d': '3D model', bim: 'BIM elements: walls, slabs and doors as building objects', stage: 'The design stage it is built for' };
const SHORT = { win: 'Win', mac: 'Mac', linux: 'Linux', ipad: 'iPad', web: 'Web',
  drawings: 'Drawings', dwg: 'DWG', ifc: 'IFC', revit: 'Revit', team: 'Shared', '3d': '3D', bim: 'BIM', stage: 'Stage' };

function rowsFor(g, cols) {
  const ncol = cols.length + 2;
  let out = `          <tr class="m-group" data-group="${g.key}"><th colspan="${ncol}" scope="colgroup" id="${g.key}"><span class="m-group-label"><span class="m-group-name">${g.name}</span> <span class="m-group-sub">${g.sub}</span></span></th></tr>\n`;
  for (const t of tools.filter(t => t.group === g.key).sort((a, b) => a.name.localeCompare(b.name))) {
    if (ids.has(t.id)) fail('duplicate id ' + t.id);
    ids.add(t.id);
    for (const k of Object.keys(t.cells)) if (!COLS.concat(g.webOnly ? MODEL : []).some(c => c[0] === k)) fail(`${t.id}: unknown cell ${k}`);
    if (g.webOnly) {
      if (PLATS.some(k => k !== 'web' && t.cells[k])) fail(`${t.id}: a browser-only row takes no win/mac/linux/ipad cells`);
      if (!t.cells.web || t.cells.web[0] !== 'yes') fail(`${t.id}: a browser-only row needs a yes web cell`);
    }
    // a "?" platform is not a platform the tool runs on, and a "?" capability is not one it does
    const plat = PLATS.filter(k => t.cells[k] && ['yes', 'part'].includes(t.cells[k][0])).join(' ');
    const caps = CAPS.filter(k => t.cells[k] && ['yes', 'part'].includes(t.cells[k][0])).join(' ');
    const TIER = { leader: 'shortlist', new: 'newcomer' };
    if (t.tier && !TIER[t.tier]) fail(t.id + ': unknown tier ' + t.tier);
    const free = g.key === 'free' || t.free;
    const maker = t.maker + (t.status ? ` &middot; ${t.status}` : '') + (t.tier ? ` &middot; <span class="m-tier m-tier-${t.tier}">${TIER[t.tier]}</span>` : '');
    out += `          <tr class="m-row" id="${t.id}" data-group="${g.key}" data-plat="${plat}" data-cap="${caps}"${t.tier ? ` data-tier="${t.tier}"` : ''}${free ? ' data-free="1"' : ''}>\n`;
    out += `            <th scope="row" class="m-name"><button type="button" class="m-open" aria-expanded="true" aria-controls="${t.id}-d"><span class="m-tool">${t.name}</span><span class="m-maker">${maker}</span></button></th>\n`;
    out += '            ' + cols.map(([k, label]) => cell(t, k, label, k === 'drawings' ? 5 : 0)).join('') + `<td class="m-price">${t.price}</td>\n`;
    out += '          </tr>\n';
    const body = t.notes.map(p => `<p>${p}</p>`).join('') +
      (t.disclosure ? `<p class="d-disclosure">${t.disclosure}</p>` : '') +
      `<p class="d-meta">${t.meta}</p>`;
    out += `          <tr class="m-detail" id="${t.id}-d" data-group="${g.key}">\n            <td colspan="${ncol}"><div class="d-body">${body}</div></td>\n          </tr>\n`;
  }
  return out;
}

function table(gs, webOnly) {
  const cols = webOnly ? MODEL.concat(COLS.slice(5)) : COLS;
  // platform and capability headings double as filters; the model columns do not
  const key = (k) => MODEL.some(c => c[0] === k) ? '' : ` data-kind="${PLATS.includes(k) ? 'plat' : 'cap'}" data-key="${k}"`;
  const head = (k) => `<th scope="col"${k === 'drawings' ? ' class="m-cap1"' : ''}${key(k)}><abbr title="${TITLE[k]}">${SHORT[k]}</abbr></th>`;
  let out = `  <div class="m-wrap" tabindex="0" role="region" aria-label="${webOnly ? 'Browser tools, scroll sideways' : 'Feature matrix, scrolls sideways'}">\n`;
  out += `    <table class="matrix${webOnly ? ' m-noplat' : ''}">\n`;
  out += `      <colgroup><col class="c-name">${webOnly ? '<col class="c-plat"><col class="c-cap"><col class="c-stage">' : '<col class="c-plat" span="5">'}<col class="c-cap" span="5"><col class="c-price"></colgroup>\n`;
  out += '      <thead>\n';
  out += `        <tr class="m-band"><th scope="col"><span class="vh">Tool</span></th>${webOnly ? '<th colspan="3" scope="colgroup">The model</th>' : '<th colspan="5" scope="colgroup">Platforms</th>'}<th colspan="5" scope="colgroup" class="m-cap1">Drawings and file exchange</th><th scope="col"><span class="vh">Pricing model</span></th></tr>\n`;
  out += `        <tr><th scope="col">Tool</th>${cols.map(c => head(c[0])).join('')}<th scope="col">Pricing model</th></tr>\n`;
  out += '      </thead>\n      <tbody>\n';
  for (const g of gs) out += rowsFor(g, cols);
  out += '      </tbody>\n    </table>\n  </div>\n';
  out += '  <div class="m-hscroll" aria-hidden="true" hidden><div></div></div>\n';
  return out;
}

// consecutive groups share a table; a webOnly group starts and ends one
const runs = [];
for (const g of groups) {
  if (!tools.some(t => t.group === g.key)) continue;
  const last = runs[runs.length - 1];
  if (last && !!last.webOnly === !!g.webOnly && !g.webOnly) last.gs.push(g);
  else runs.push({ webOnly: !!g.webOnly, gs: [g] });
}
const out = runs.map(r => table(r.gs, r.webOnly)).join('');

const page = readFileSync(PAGE, 'utf8').replace(/\r\n/g, '\n');
const re = /(<!-- matrix:start[^>]*-->\n)[\s\S]*?(<!-- matrix:end -->)/;
if (!re.test(page)) fail('matrix markers not found in bim-cad.html');
let next = page.replace(re, (m, a, b) => a + out + '  ' + b);
next = next.replace(/(<span id="resultCount"[^>]*>)\d+ tools/, `$1${tools.length} tools`);
writeFileSync(PAGE, next);
console.log(`build-bim-cad: ${tools.length} tools written`);
if (missing.length) console.log(`  ${missing.length} marked cells without evidence: ${missing.join(', ')}`);
