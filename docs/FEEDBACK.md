# Feedback

Readers send notes from `feedback.html`, linked in every live page's footer.
Each note goes straight to a Cloudflare D1 database in the site's own
Cloudflare account. The owner reads them at **https://architecture.tools/inbox**,
behind a password. Nothing depends on the reader's email app, and no third
party beyond Cloudflare, which already hosts the site, is involved.

This is the site's one piece of server code, in the Worker that serves the
site (`docs/HOSTING.md`). Page views never run it.

## Files

| File | What it does |
|---|---|
| `feedback.html` | The form. Sends in place with script; without script it is a plain form post that comes back to `#sent` or `#not-sent`. Sends the page the reader came from (this site only). |
| `worker/feedback.js` | `POST /api/feedback`. Checks the post came from this site, drops bots (a hidden `website` field), enforces the length limits, and saves the note. Keeps the note, the optional reply address, the page, and the time. Never the IP address or browser details. |
| `worker/inbox.js` | `/inbox`. Lists the newest 500 notes. Each has a Delete button that only works from the inbox's own page. Answers 404 until both the database and the password below are set up. |
| `worker/feedback-store.js` | The table definition and the same-site check, shared by both. |
| `worker/index.js` | Routes the two paths to the code above (`docs/HOSTING.md`). |
| `tools/test-feedback.mjs` | `node tools/test-feedback.mjs`: the collector and inbox against a real SQLite database. |

The table creates itself on the first note.

## Cloudflare setup

The feedback form is set up as part of the site's Worker: `docs/HOSTING.md`,
"Moving from GitHub Pages", steps 2 to 4. In short:

- **The database** is declared in `wrangler.jsonc` as `FEEDBACK_DB`, named
  `architecturetools-feedback`. The first deploy creates it, or connects to an
  existing database of that name. No ID to copy, and nothing to add under the
  dashboard's Bindings (a deploy replaces dashboard bindings with the config's).
- **The inbox password** is a Worker secret, **`INBOX_PASSWORD`**: the Worker >
  Settings > Variables and Secrets > Add, type Secret. Use a long random one
  from a password manager (20+ characters). Nothing else limits how many
  guesses someone can make, so length is the protection.

Until both exist the form says "Your note wasn't sent" and `/inbox` is 404.
Nothing breaks.

## Reading and clearing notes

**The privacy statement promises every note is deleted after it is read, or
after the reply if the reader asked for an answer** (`privacy.html#feedback`).
Nothing deletes notes automatically, so that promise is kept by pressing
Delete: read a note, answer it if it has a reply address, then delete it.

- `/inbox` works on a phone. The browser can save the password.
- Delete is per note: open "Delete", then press "Delete this note".
- To clear many at once, use the D1 console (Storage & Databases > D1 > the
  database > Console), e.g. `DELETE FROM feedback WHERE created_at < '2027-01-01';`
- A reader who asks for their note to be deleted is owed that
  (`privacy.html#rights`). Find it by its text or reply address.

## Cost and limits

On Cloudflare's free plan this costs nothing. Only form posts and inbox visits
run the Worker, not page views. The free allowances are 100,000 Worker
requests a day, 100,000 database rows written a day, and 5 GB stored. Past a
daily limit, sends fail until midnight UTC. The free plan never bills.

## If spam starts

Bots that run no script are already dropped, as are posts from other sites.
If spam still gets through, Cloudflare has two free fixes:

- **Rate limiting** (dashboard only): Security > WAF > Rate limiting rules, a
  rule on the path `/api/feedback`, e.g. 5 requests per 10 seconds per IP,
  then block.
- **Turnstile** (a small code change): Cloudflare's bot check. Needs a widget
  on `feedback.html` and a token check in `worker/feedback.js`.

## Test locally

```sh
node tools/test-feedback.mjs          # handlers + SQL, no Cloudflare tooling needed

# The real Worker with a local database (state goes in .wrangler/):
npx wrangler dev --var INBOX_PASSWORD:test
# then open http://localhost:8787/feedback.html and http://localhost:8787/inbox
```

## When this changes

- **A new page** gets the form by linking it from its footer:
  `<a href="feedback.html">Feedback</a>`. The page it came from is picked up
  automatically.
- **A new field, or keeping anything else** (IP, user agent, a cookie) changes
  what `privacy.html#feedback` promises. Update it, and its date, in the same
  commit. See `docs/ANALYTICS.md` "Compliance statement".
