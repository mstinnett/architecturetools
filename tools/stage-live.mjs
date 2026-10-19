#!/usr/bin/env node
/* stage-live.mjs — make pages ready for main (the live site)
   =========================================================================
   dev carries every tool; main carries only the promoted ones. A page that
   links to a tool still on dev marks that link (or the card, sentence or
   key around it) with data-stage="dev". Promoting copies the page to main
   and runs this over it:

     git checkout main
     git checkout dev -- index.html calculators/slope.html calculators/lib/slope.js …
     node tools/stage-live.mjs index.html calculators/slope.html …

   For each HTML file given, in place:
     - removes every element carrying data-stage="dev", with its contents
     - sets data-stage="live" on <html>, so page scripts drop their dev-only
       entries too (Slope's onward keys read it)
     - removes the robots noindex meta (docs/HANDOFF.md §3: it comes off on
       promotion)
   Then it checks every relative href and script src left in those files
   resolves to a file in the working tree, and fails (exit 1) naming the
   ones that don't, so main never links to a page it doesn't have.

   --check runs the link check only, without changing anything.
   ========================================================================= */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';

const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const files = args.filter(a => !a.startsWith('--'));
if (!files.length) { console.error('usage: node tools/stage-live.mjs [--check] <page.html> …'); process.exit(2); }

// remove each element whose opening tag carries data-stage="dev", counting
// nested tags of the same name to find its close
function stripDev(html) {
  let count = 0;
  for (;;) {
    const m = /<([a-zA-Z][\w-]*)\b[^>]*\sdata-stage="dev"[^>]*>/.exec(html);
    if (!m) break;
    const tag = m[1].toLowerCase(), start = m.index;
    const re = new RegExp('<(/?)' + tag + '\\b[^>]*>', 'gi');
    re.lastIndex = start + m[0].length;
    let depth = 1, end = -1, t;
    while ((t = re.exec(html))) {
      if (t[0].endsWith('/>')) continue;
      depth += t[1] ? -1 : 1;
      if (depth === 0) { end = re.lastIndex; break; }
    }
    if (end < 0) throw new Error('unclosed <' + tag + ' data-stage="dev"> at ' + start);
    // take the line's leading indent and trailing newline with it
    let s = start; while (s > 0 && (html[s - 1] === ' ' || html[s - 1] === '\t')) s--;
    let e = end; if (html[e] === '\r') e++; if (html[e] === '\n' && (s === 0 || html[s - 1] === '\n')) e++;
    html = html.slice(0, s) + html.slice(e);
    count++;
  }
  return { html, count };
}

let bad = [];
for (const f of files) {
  if (!f.endsWith('.html')) continue;
  let html = readFileSync(f, 'utf8');
  if (!checkOnly) {
    const r = stripDev(html);
    html = r.html.replace(/<html\b([^>]*?)(\sdata-stage="[^"]*")?>/, (m, attrs) => '<html' + attrs + ' data-stage="live">');
    html = html.replace(/[ \t]*<meta name="robots" content="noindex[^"]*">\r?\n?/g, '');
    writeFileSync(f, html);
    console.log(`stage-live: ${f}: ${r.count} dev-only element${r.count === 1 ? '' : 's'} removed`);
  }
  // every relative link and script left must resolve here
  const dir = dirname(f);
  for (const m of html.matchAll(/(?:href|src)="([^"#?:]+)(?:[#?][^"]*)?"/g)) {
    const ref = m[1];
    // skip absolute paths and hrefs a script builds (quotes, spaces, +)
    if (!ref || /^(mailto|tel|data|javascript)$/i.test(ref) || ref.startsWith('/') || /['\s+]/.test(ref)) continue;
    const target = normalize(join(dir, ref));
    if (!existsSync(target)) bad.push(`${f} → ${ref}`);
  }
}
if (bad.length) {
  console.error('stage-live: links to files not in this tree:\n  ' + [...new Set(bad)].join('\n  '));
  process.exit(1);
}
console.log('stage-live: every relative link resolves');
