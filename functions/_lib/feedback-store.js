// Shared by the feedback collector (api/feedback.js) and the owner's inbox
// (inbox.js). Not a route: it exports no onRequest handler. docs/FEEDBACK.md
// has the Cloudflare setup.

// One table in the D1 database bound as FEEDBACK_DB. It is created on first
// use, so setup needs no trip to the SQL console. Run this statement first in
// any batch that touches the table.
const SCHEMA = `CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  page TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  contact TEXT NOT NULL DEFAULT ''
)`;

export function schema(db) {
  return db.prepare(SCHEMA);
}

// Browsers send Origin on every POST, so a post from another site's page
// carries that site's origin, and one with none came from a script rather
// than a reader's browser.
export function sameOrigin(request) {
  return request.headers.get('Origin') === new URL(request.url).origin;
}
