#!/usr/bin/env node
/* build-pdf-markup.mjs — compiles data/pdf-markup.json → the matrix rows in
   pdf-markup.html (between the matrix:start / matrix:end comments).
   =========================================================================
   The JSON is the source of truth for every tool: its group, whether it is
   its tier ("leader" for a current market leader, "new" for a newcomer, "" for neither), one cell per column, price, notes.

   A cell is [value, label, evidence]:
     value     yes | part | no
     label     1–3 words shown under the mark ("" for none)
     evidence  the page that proves it, ideally a #:~:text= deep link to the
               sentence. The mark becomes a plain link to it — no underline,
               no footnote — so a reader who wonders can click through.
   Every yes or part cell should carry evidence; the build lists the ones
   that do not, so the gaps stay visible.

   Rows render as static HTML, so the page reads in full without
   JavaScript. Run: node tools/build-pdf-markup.mjs
   ========================================================================= */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'data', 'pdf-markup.json');
const PAGE = join(ROOT, 'pdf-markup.html');

const COLS = [
  ['win', 'Windows'], ['mac', 'Mac'], ['linux', 'Linux'], ['ipad', 'iPad'], ['web', 'Web'],
  ['measure', 'Scaled measurement'], ['team', 'Team review'], ['compare', 'Compare revisions'], ['checklist', 'Checklist review'],
];
const PLATS = COLS.slice(0, 5).map(c => c[0]);
const CAPS = COLS.slice(5).map(c => c[0]);
const MARK = { yes: '&#9679;', part: '&#9680;', no: '&ndash;' };
const SAY = { yes: 'yes', part: 'partly', no: 'no' };
const NCOL = COLS.length + 2;

const attr = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const fail = msg => { console.error('build-pdf-markup: ' + msg); process.exit(1); };

const { groups, tools } = JSON.parse(readFileSync(DATA, 'utf8'));
const missing = [];
const ids = new Set();

function cell(tool, key, label, i) {
  const c = tool.cells[key];
  if (!c || c.length !== 3) fail(`${tool.id}: cell ${key} must be [value, label, evidence]`);
  const [v, t, ev] = c;
  if (!MARK[v]) fail(`${tool.id}: cell ${key} has unknown value "${v}"`);
  if (v !== 'no' && !ev) missing.push(`${tool.id}.${key}`);
  const cls = 'm-' + v + (i === 5 ? ' m-cap1' : '');
  let inner = `<span class="m" aria-hidden="true">${MARK[v]}</span><span class="vh">${label}: ${SAY[v]}${t ? ', ' + t : ''}</span>${t ? `<span class="m-txt">${t}</span>` : ''}`;
  if (ev) inner = `<a class="m-ev" href="${attr(ev)}" rel="noopener">${inner}</a>`;
  return `<td class="${cls}">${inner}</td>`;
}

let out = '';
for (const g of groups) {
  const rows = tools.filter(t => t.group === g.key);
  if (!rows.length) continue;
  out += `          <tr class="m-group" data-group="${g.key}"><th colspan="${NCOL}" scope="colgroup" id="${g.key}"><span class="m-group-name">${g.name}</span> <span class="m-group-sub">${g.sub}</span></th></tr>\n`;
  for (const t of rows.sort((a, b) => a.name.localeCompare(b.name))) {
    if (ids.has(t.id)) fail('duplicate id ' + t.id);
    ids.add(t.id);
    const plat = PLATS.filter(k => t.cells[k][0] !== 'no').join(' ');
    const caps = CAPS.filter(k => t.cells[k][0] !== 'no').join(' ');
    const TIER = { leader: 'market leader', new: 'newcomer' };
    if (t.tier && !TIER[t.tier]) fail(t.id + ': unknown tier ' + t.tier);
    const maker = t.maker + (t.tier ? ` &middot; <span class="m-tier m-tier-${t.tier}">${TIER[t.tier]}</span>` : '');
    out += `          <tr class="m-row" id="${t.id}" data-group="${g.key}" data-plat="${plat}" data-cap="${caps}"${t.tier ? ` data-tier="${t.tier}"` : ''}>\n`;
    out += `            <th scope="row" class="m-name"><button type="button" class="m-open" aria-expanded="true" aria-controls="${t.id}-d"><span class="m-tool">${t.name}</span><span class="m-maker">${maker}</span></button></th>\n`;
    out += '            ' + COLS.map(([k, label], i) => cell(t, k, label, i)).join('') + `<td class="m-price">${t.price}</td>\n`;
    out += '          </tr>\n';
    const body = t.notes.map(p => `<p>${p}</p>`).join('') +
      (t.disclosure ? `<p class="d-disclosure">${t.disclosure}</p>` : '') +
      `<p class="d-meta">${t.meta}</p>`;
    out += `          <tr class="m-detail" id="${t.id}-d" data-group="${g.key}">\n            <td colspan="${NCOL}"><div class="d-body">${body}</div></td>\n          </tr>\n`;
  }
}

const page = readFileSync(PAGE, 'utf8').replace(/\r\n/g, '\n');
const re = /(<!-- matrix:start[^>]*-->\n)[\s\S]*?(\s*<!-- matrix:end -->)/;
if (!re.test(page)) fail('matrix markers not found in pdf-markup.html');
let next = page.replace(re, (m, a, b) => a + out.replace(/\n$/, '') + b);
next = next.replace(/(<span id="resultCount"[^>]*>)\d+ tools/, `$1${tools.length} tools`);
writeFileSync(PAGE, next);
console.log(`build-pdf-markup: ${tools.length} tools written`);
if (missing.length) console.log(`  ${missing.length} marked cells without evidence: ${missing.join(', ')}`);
