// Shared by the feedback collector (feedback.js) and the owner's inbox
// (inbox.js). docs/FEEDBACK.md has the Cloudflare setup.

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
// carries that site's origin. A browser set to send no referrer reports
// "Origin: null" instead; then Sec-Fetch-Site decides, which the browser sets
// itself and no page can change. A post with neither came from a script
// rather than a reader's browser.
export function sameOrigin(request) {
  const origin = request.headers.get('Origin');
  if (origin && origin !== 'null') return origin === new URL(request.url).origin;
  return request.headers.get('Sec-Fetch-Site') === 'same-origin';
}
