// POST /api/feedback (routed by index.js), where feedback.html sends a note.
// Each note becomes one row in the D1 database bound as FEEDBACK_DB, read at
// /inbox. Kept: what the reader typed, the page they came from, and the time.
// Not kept: their IP address, browser details, or any cookie
// (privacy.html#feedback).
import { schema, sameOrigin } from './feedback-store.js';

// Character limits, matched by the maxlength attributes in feedback.html.
const MAX = { message: 4000, contact: 200, page: 200 };
// Bytes. A full-length note survives URL encoding in any script.
const MAX_BODY = 64 * 1024;

export async function handleFeedback(request, env) {
  // The page's script asks for JSON. A plain form post (no script) is sent
  // back to the page, where :target shows the outcome.
  const json = (request.headers.get('Accept') || '').includes('application/json');
  const done = (status, error) => json
    ? Response.json(error ? { ok: false, error } : { ok: true },
        { status, headers: { 'Cache-Control': 'no-store' } })
    : Response.redirect(new URL(error ? '/feedback.html#not-sent' : '/feedback.html#sent', request.url), 303);

  if (!sameOrigin(request)) return done(403, 'origin');
  if (Number(request.headers.get('Content-Length')) > MAX_BODY) return done(413, 'too-long');

  let form;
  try { form = await request.formData(); } catch { return done(400, 'format'); }
  // A plain form post sends each line break as \r\n, two characters toward
  // the limit. Count and store them as one, the same as the script path.
  const field = (name) => String(form.get(name) ?? '').replace(/\r\n?/g, '\n').trim();

  // The "website" field is hidden from people, so only bots fill it in. They
  // get the same answer a person does and learn nothing from it.
  if (field('website')) return done(200);

  const note = { message: field('message'), contact: field('contact'), page: field('page') };
  if (!note.message) return done(400, 'empty');
  if (Object.keys(MAX).some((k) => note[k].length > MAX[k])) return done(400, 'too-long');

  const db = env.FEEDBACK_DB;
  if (!db) return done(503, 'unavailable');
  try {
    await db.batch([
      schema(db),
      db.prepare('INSERT INTO feedback (created_at, page, message, contact) VALUES (?1, ?2, ?3, ?4)')
        .bind(new Date().toISOString(), note.page, note.message, note.contact),
    ]);
  } catch (err) {
    console.error('feedback: insert failed', err);
    return done(500, 'unavailable');
  }
  return done(200);
}
