#!/usr/bin/env node
// Checks the feedback collector (functions/api/feedback.js) and the owner's
// inbox (functions/inbox.js) against a real SQLite database standing in for
// Cloudflare D1. Run: node tools/test-feedback.mjs
// End-to-end on Cloudflare's own runtime: docs/FEEDBACK.md "Test locally".
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { onRequestPost as send } from '../functions/api/feedback.js';
import { onRequest as inbox } from '../functions/inbox.js';

const SITE = 'https://architecture.tools';
const PASSWORD = 'correct horse battery staple';
let checks = 0;
async function check(name, fn) { await fn(); checks++; console.log('PASS ' + name); }

// The slice of the D1 API the functions use: prepare, bind, batch.
function d1() {
  const sqlite = new DatabaseSync(':memory:');
  const stmt = (sql, args = []) => ({ sql, args, bind: (...a) => stmt(sql, a) });
  return {
    sqlite,
    prepare: (sql) => stmt(sql),
    async batch(list) {
      sqlite.exec('BEGIN');
      try {
        const out = list.map(({ sql, args }) => {
          const st = sqlite.prepare(sql);
          if (/^\s*select/i.test(sql)) return { results: st.all(...args) };
          st.run(...args);
          return { results: [] };
        });
        sqlite.exec('COMMIT');
        return out;
      } catch (err) { sqlite.exec('ROLLBACK'); throw err; }
    },
  };
}
const rows = (db) => { try { return db.sqlite.prepare('SELECT * FROM feedback ORDER BY id').all(); } catch { return []; } };

function post(path, fields, { origin = SITE, json = true, headers = {} } = {}) {
  const h = new Headers(headers);
  if (origin) h.set('Origin', origin);
  if (json) h.set('Accept', 'application/json');
  return new Request(SITE + path, { method: 'POST', headers: h, body: new URLSearchParams(fields) });
}
function get(path, { user = 'me', password = PASSWORD } = {}) {
  const h = new Headers();
  if (password !== null) h.set('Authorization', 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64'));
  return new Request(SITE + path, { headers: h });
}
const env = (db) => ({ FEEDBACK_DB: db, INBOX_PASSWORD: PASSWORD });

// ---- the collector ----
await check('a note is stored, trimmed, with its page and time', async () => {
  const db = d1();
  const res = await send({ request: post('/api/feedback', { message: '  Typo on the picker.  ', contact: ' a@b.co ', page: '/picker' }), env: env(db) });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  const [row] = rows(db);
  assert.equal(row.message, 'Typo on the picker.');
  assert.equal(row.contact, 'a@b.co');
  assert.equal(row.page, '/picker');
  assert.ok(Math.abs(Date.parse(row.created_at) - Date.now()) < 60000);
});
await check('nothing about the sender is stored beyond the form fields', async () => {
  const db = d1();
  await send({ request: post('/api/feedback', { message: 'x' }, { headers: { 'CF-Connecting-IP': '203.0.113.9', 'User-Agent': 'UA' } }), env: env(db) });
  assert.deepEqual(Object.keys(rows(db)[0]).sort(), ['contact', 'created_at', 'id', 'message', 'page']);
});
await check('a plain form post returns to the page (#sent / #not-sent)', async () => {
  const db = d1();
  let res = await send({ request: post('/api/feedback', { message: 'no script' }, { json: false }), env: env(db) });
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('Location'), SITE + '/feedback.html#sent');
  res = await send({ request: post('/api/feedback', { message: '' }, { json: false }), env: env(db) });
  assert.equal(res.headers.get('Location'), SITE + '/feedback.html#not-sent');
});
await check('the honeypot answers like success and stores nothing', async () => {
  const db = d1();
  const res = await send({ request: post('/api/feedback', { message: 'buy now', website: 'http://spam' }), env: env(db) });
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(rows(db).length, 0);
});
await check('posts from another site, or with no origin, are refused', async () => {
  const db = d1();
  for (const origin of ['https://evil.example', null]) {
    const res = await send({ request: post('/api/feedback', { message: 'x' }, { origin }), env: env(db) });
    assert.equal(res.status, 403);
  }
  assert.equal(rows(db).length, 0);
});
await check('empty and over-length notes are refused; 4000 characters fit', async () => {
  const db = d1();
  const status = async (fields, opts) => (await send({ request: post('/api/feedback', fields, opts), env: env(db) })).status;
  assert.equal(await status({ message: '   ' }), 400);
  assert.equal(await status({ message: 'a'.repeat(4001) }), 400);
  assert.equal(await status({ message: 'x', contact: 'c'.repeat(201) }), 400);
  assert.equal(await status({ message: 'x', page: '/' + 'p'.repeat(200) }), 400);
  assert.equal(await status({ message: 'x' }, { headers: { 'Content-Length': String(64 * 1024 + 1) } }), 413);
  assert.equal(await status({ message: '建'.repeat(4000) }), 200);
  assert.equal(rows(db).length, 1);
});
await check('with no database bound the form reports unavailable', async () => {
  const res = await send({ request: post('/api/feedback', { message: 'x' }), env: {} });
  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { ok: false, error: 'unavailable' });
});

// ---- the inbox ----
await check('with no password or no database the inbox does not exist', async () => {
  assert.equal((await inbox({ request: get('/inbox'), env: { FEEDBACK_DB: d1() } })).status, 404);
  assert.equal((await inbox({ request: get('/inbox'), env: { INBOX_PASSWORD: PASSWORD } })).status, 404);
});
await check('the inbox asks for the password and refuses a wrong one', async () => {
  const db = d1();
  let res = await inbox({ request: get('/inbox', { password: null }), env: env(db) });
  assert.equal(res.status, 401);
  assert.match(res.headers.get('WWW-Authenticate'), /^Basic /);
  res = await inbox({ request: get('/inbox', { password: 'wrong' }), env: env(db) });
  assert.equal(res.status, 401);
  res = await inbox({ request: get('/inbox', { user: 'anyone-at-all' }), env: env(db) });
  assert.equal(res.status, 200);
});
await check('a non-ASCII password works', async () => {
  const pw = 'pässwörd-建筑';
  const h = new Headers({ Authorization: 'Basic ' + Buffer.from('me:' + pw, 'utf8').toString('base64') });
  const res = await inbox({ request: new Request(SITE + '/inbox', { headers: h }), env: { FEEDBACK_DB: d1(), INBOX_PASSWORD: pw } });
  assert.equal(res.status, 200);
});
await check('notes are listed newest first, escaped, under a strict policy', async () => {
  const db = d1();
  await send({ request: post('/api/feedback', { message: 'older' }), env: env(db) });
  await send({ request: post('/api/feedback', { message: '<script>alert(1)</script> & "q"', contact: '<b>x</b>', page: '/"><img src=x>' }), env: env(db) });
  const res = await inbox({ request: get('/inbox'), env: env(db) });
  const html = await res.text();
  assert.ok(html.indexOf('&lt;script&gt;alert(1)') < html.indexOf('older'));
  assert.ok(!html.includes('<script>alert') && !html.includes('<b>x</b>') && !html.includes('<img src=x>'));
  assert.match(html, /2 notes, newest first/);
  const csp = res.headers.get('Content-Security-Policy');
  const nonce = /'nonce-([0-9a-f]+)'/.exec(csp)[1];
  assert.ok(html.includes(`<script nonce="${nonce}">`));
  assert.match(csp, /default-src 'none'/);
  assert.equal(res.headers.get('Cache-Control'), 'no-store');
  // The delete form relies on the browser sending this site's Origin, which
  // "no-referrer" would turn into "null".
  assert.notEqual(res.headers.get('Referrer-Policy'), 'no-referrer');
});
await check('delete needs the password and a form from this site', async () => {
  const db = d1();
  await send({ request: post('/api/feedback', { message: 'keep' }), env: env(db) });
  await send({ request: post('/api/feedback', { message: 'remove' }), env: env(db) });
  const id = rows(db).find((r) => r.message === 'remove').id;
  const auth = { Authorization: 'Basic ' + Buffer.from('me:' + PASSWORD).toString('base64') };
  let res = await inbox({ request: post('/inbox', { id }, { json: false }), env: env(db) });
  assert.equal(res.status, 401);
  res = await inbox({ request: post('/inbox', { id }, { json: false, origin: 'https://evil.example', headers: auth }), env: env(db) });
  assert.equal(res.status, 403);
  res = await inbox({ request: post('/inbox', { id: '1 OR 1=1' }, { json: false, headers: auth }), env: env(db) });
  assert.equal(rows(db).length, 2);
  res = await inbox({ request: post('/inbox', { id }, { json: false, headers: auth }), env: env(db) });
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('Location'), SITE + '/inbox');
  assert.deepEqual(rows(db).map((r) => r.message), ['keep']);
});

console.log(`\n${checks} checks passed`);
