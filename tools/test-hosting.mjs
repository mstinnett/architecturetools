#!/usr/bin/env node
// Checks the Cloudflare Worker's router (worker/index.js) and what
// .assetsignore keeps off the published site. Run: node tools/test-hosting.mjs
// The feedback handlers themselves: tools/test-feedback.mjs.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import worker from '../worker/index.js';

const SITE = 'https://architecture.tools';
let checks = 0;
async function check(name, fn) { await fn(); checks++; console.log('PASS ' + name); }

// ---- the router ----
const assets = () => {
  const seen = [];
  return { seen, fetch: async (req) => { seen.push(new URL(req.url).pathname); return new Response('asset'); } };
};

await check('POST /api/feedback reaches the collector', async () => {
  const req = new Request(SITE + '/api/feedback', {
    method: 'POST', headers: { Origin: SITE, Accept: 'application/json' }, body: new URLSearchParams({ message: 'x' }),
  });
  const ASSETS = assets();
  const res = await worker.fetch(req, { ASSETS });
  // No database bound, so the collector itself answers "unavailable".
  assert.deepEqual(await res.json(), { ok: false, error: 'unavailable' });
  assert.equal(ASSETS.seen.length, 0);
});
await check('other methods on /api/feedback are refused', async () => {
  const res = await worker.fetch(new Request(SITE + '/api/feedback'), { ASSETS: assets() });
  assert.equal(res.status, 405);
  assert.equal(res.headers.get('Allow'), 'POST');
});
await check('/inbox reaches the inbox', async () => {
  const res = await worker.fetch(new Request(SITE + '/inbox'), { ASSETS: assets(), INBOX_PASSWORD: 'pw', FEEDBACK_DB: {} });
  assert.equal(res.status, 401);
  assert.match(res.headers.get('WWW-Authenticate'), /^Basic /);
});
await check('everything else is left to the static files', async () => {
  const ASSETS = assets();
  for (const path of ['/', '/picker.html', '/api/other', '/inbox/', '/no-such-page']) {
    assert.equal(await (await worker.fetch(new Request(SITE + path), { ASSETS })).text(), 'asset');
  }
  assert.deepEqual(ASSETS.seen, ['/', '/picker.html', '/api/other', '/inbox/', '/no-such-page']);
});

// ---- what gets published ----
// .assetsignore uses gitignore syntax. It is kept to two simple forms so this
// check can read it exactly: "/name" (that path at the repo root) and "name"
// (a file or folder of that name anywhere).
const patterns = readFileSync(new URL('../.assetsignore', import.meta.url), 'utf8')
  .split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
const tracked = execFileSync('git', ['ls-files'], { cwd: new URL('..', import.meta.url), encoding: 'utf8' })
  .split('\n').filter(Boolean);
const hidden = (file) => patterns.some((p) => p.startsWith('/')
  ? file === p.slice(1) || file.startsWith(p.slice(1) + '/')
  : file.split('/').includes(p));

await check('.assetsignore uses only the forms this check understands', async () => {
  for (const p of patterns) assert.match(p, /^\/?[\w.-]+$/, `unsupported pattern: ${p}`);
});
await check('every page and everything under assets/ and calculators/ is published', async () => {
  const site = tracked.filter((f) => /^[^/]+\.html$/.test(f) || f.startsWith('assets/') || f.startsWith('calculators/'));
  assert.ok(site.includes('assets/data/hardware-data.json'));
  assert.deepEqual(site.filter(hidden), []);
});
await check('repo machinery, the Worker source, notes and tooling are not', async () => {
  for (const f of ['.git/config', '.github/workflows/build-data.yml', '.claude/settings.json', 'wrangler.jsonc',
    '.assetsignore', 'worker/index.js', 'docs/PROJECT.md', 'tools/build-data.mjs', 'data/cpus.csv', 'scratch/.gitkeep', 'CNAME']) {
    assert.ok(hidden(f), `published but should not be: ${f}`);
  }
});

console.log(`\n${checks} checks passed`);
