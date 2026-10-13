// /inbox, the owner's private view of the notes sent from feedback.html
// (docs/FEEDBACK.md). The browser asks for a password, checked against the
// INBOX_PASSWORD secret; any user name is accepted. Until the secret and the
// FEEDBACK_DB database are both set up, the route answers 404, so a
// half-finished setup never shows the notes to anyone.
import { schema, sameOrigin } from './_lib/feedback-store.js';

const SHOW = 500;   // newest notes listed; older ones stay in the table

export async function onRequest({ request, env }) {
  if (!env.INBOX_PASSWORD || !env.FEEDBACK_DB) return new Response('Not found', { status: 404 });
  if (!(await authorized(request, env.INBOX_PASSWORD))) {
    return new Response('Enter the inbox password to read the feedback.', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="architecture.tools inbox", charset="UTF-8"',
        'Cache-Control': 'no-store',
      },
    });
  }
  if (request.method === 'POST') return remove(request, env.FEEDBACK_DB);
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, POST' } });
  }
  return list(env.FEEDBACK_DB);
}

async function authorized(request, secret) {
  const m = /^Basic\s+([A-Za-z0-9+/=]+)\s*$/i.exec(request.headers.get('Authorization') || '');
  if (!m) return false;
  let pair;
  try {
    pair = new TextDecoder().decode(Uint8Array.from(atob(m[1]), (c) => c.charCodeAt(0)));
  } catch { return false; }
  return samePassword(pair.slice(pair.indexOf(':') + 1), secret);
}

// Compare digests, not the strings, so the time taken says nothing about how
// much of a guess was right.
async function samePassword(given, secret) {
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([given, secret].map((s) => crypto.subtle.digest('SHA-256', enc.encode(s))));
  const x = new Uint8Array(a), y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

async function remove(request, db) {
  // Once signed in, the browser attaches the password to every request for
  // this site, including a post another site's page makes. Only a form served
  // from this site may delete.
  if (!sameOrigin(request)) return new Response('Forbidden', { status: 403 });
  let id = NaN;
  try { id = Number((await request.formData()).get('id')); } catch { /* falls through as NaN */ }
  if (Number.isSafeInteger(id) && id > 0) {
    await db.batch([schema(db), db.prepare('DELETE FROM feedback WHERE id = ?1').bind(id)]);
  }
  return Response.redirect(new URL('/inbox', request.url), 303);
}

async function list(db) {
  const [, count, rows] = await db.batch([
    schema(db),
    db.prepare('SELECT COUNT(*) AS n FROM feedback'),
    db.prepare('SELECT id, created_at, page, message, contact FROM feedback ORDER BY id DESC LIMIT ?1').bind(SHOW),
  ]);
  const nonce = crypto.randomUUID().replace(/-/g, '');
  return new Response(render(count.results[0].n, rows.results, nonce), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      // Not no-referrer: under that policy the browser sends "Origin: null"
      // with the delete form, leaving remove() only Sec-Fetch-Site to go on.
      'Referrer-Policy': 'same-origin',
      // Nothing a reader typed can run here: every value is escaped, and only
      // this response's own script and style may execute.
      'Content-Security-Policy': [
        "default-src 'none'",
        `script-src 'nonce-${nonce}'`,
        `style-src 'self' 'nonce-${nonce}'`,
        "font-src 'self'",
        'img-src data:',
        "form-action 'self'",
        "frame-ancestors 'none'",
        "base-uri 'none'",
      ].join('; '),
    },
  });
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function when(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return esc(iso);
  return esc(d.toLocaleString('en-GB', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' })) + ' UTC';
}

function render(total, notes, nonce) {
  const summary = total === 0 ? 'No feedback yet.'
    : total > notes.length ? `The newest ${notes.length} of ${total} notes.`
    : `${total} ${total === 1 ? 'note' : 'notes'}, newest first.`;
  const items = notes.map((n) => `
    <article class="note">
      <div class="note-meta">${when(n.created_at)}${n.page ? ` <span class="crumb-sep">&middot;</span> ${esc(n.page)}` : ''}</div>
      <p class="note-text">${esc(n.message)}</p>
      ${n.contact ? `<p class="note-reply">Reply to: ${esc(n.contact)}</p>` : ''}
      <details class="note-delete">
        <summary>Delete</summary>
        <form method="post" action="/inbox">
          <input type="hidden" name="id" value="${esc(n.id)}">
          <button type="submit" class="mini-pill">Delete this note</button>
        </form>
      </details>
    </article>`).join('');

  return `<!DOCTYPE html>
<html lang="en" data-family="drafting">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>Feedback inbox -- architecture.tools</title>
<script nonce="${nonce}">
(function(){
  var stored = null;
  try { stored = localStorage.getItem('scheme'); } catch (e) {}
  var dark = stored ? stored === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.scheme = dark ? 'dark' : 'light';
})();
</script>
<link rel="stylesheet" href="/assets/css/global.css">
<style nonce="${nonce}">
  .note { padding: var(--space-lg) 0; border-bottom: var(--border-light); }
  .note:first-child { padding-top: 0; }
  .note-meta { font-size: var(--text-xs); letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-3); margin-bottom: var(--space-sm); overflow-wrap: anywhere; }
  .note-text { font-size: var(--text-base); line-height: 1.65; white-space: pre-wrap; overflow-wrap: anywhere; }
  .note-reply { margin-top: var(--space-sm); font-size: var(--text-sm); color: var(--ink-2); overflow-wrap: anywhere; }
  .note-delete { margin-top: var(--space-sm); font-size: var(--text-xs); color: var(--ink-3); }
  .note-delete summary { cursor: pointer; width: max-content; }
  .note-delete form { margin-top: var(--space-sm); }
</style>
</head>
<body>
<div class="page">
  <div class="page-header">
    <nav class="page-crumb" aria-label="Breadcrumb">
      <a href="/index.html">architecture.tools</a> <span class="crumb-sep">&middot;</span> <span aria-current="page">Inbox</span>
    </nav>
    <h1>Feedback</h1>
    <p>${summary}</p>
  </div>
  <div class="notes">${items}
  </div>
</div>
</body>
</html>
`;
}
