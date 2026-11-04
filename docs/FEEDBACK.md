# Feedback

Readers send notes from `feedback.html`, linked in every live page's footer.
Each note goes straight to a Cloudflare D1 database in the site's own
Cloudflare account. The owner reads them at **https://architecture.tools/inbox**,
behind a password. Nothing depends on the reader's email app, and no third
party beyond Cloudflare, which already hosts the site, is involved. An email
tells the owner a note has arrived. It carries none of the note.

This is the site's one piece of server code, in the Worker that serves the
site (`docs/HOSTING.md`). Page views never run it.

## Files

| File | What it does |
|---|---|
| `feedback.html` | The form. Sends in place with script; without script it is a plain form post that comes back to `#sent` or `#not-sent`. Sends the page the reader came from (this site only). |
| `worker/feedback.js` | `POST /api/feedback`. Checks the post came from this site, drops bots (a hidden `website` field), enforces the length limits, saves the note, and sends the email notice. Keeps the note, the optional reply address, the page, and the time. Never the IP address or browser details. |
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

## Email notice

Each saved note sends one email to the owner: a fixed subject and a link to
`/inbox`. It carries nothing the reader wrote, on purpose. Mail sits in a
mailbox that Delete on `/inbox` can't reach, so a copy of the note there would
break the promise in `privacy.html#feedback`, and the mailbox provider would
become a new party holding it. Putting the note in the email means updating
that section in the same commit.

Bots caught by the hidden field and notes that fail to save send nothing. A
failed send never fails the note.

It uses Cloudflare Email Service. Sends to a verified destination address are
free on every plan. The setup, in the dashboard:

1. **Email Routing** is on for `architecture.tools`, so the domain's MX records
   point at Cloudflare. No address at the domain receives mail unless a routing
   rule is added.
2. **The address is verified.** Compute > Email Service > Email Routing >
   Destination Addresses: enter it, then press the link in the email Cloudflare
   sends. An unverified address gets no notice.
3. **The secret.** The Worker > Settings > Variables and Secrets > Add, type
   Secret, name **`NOTIFY_TO`**, value the verified address, exactly. It is a
   secret to keep the address out of this public repo.

Without `NOTIFY_TO` the Worker sends nothing, and notes still save.

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

# The real Worker with a local database, kept outside the repo
# (docs/HOSTING.md "Run it locally" says why):
npx wrangler dev --persist-to ../.wrangler-state --var INBOX_PASSWORD:test
# then open http://localhost:8787/feedback.html and http://localhost:8787/inbox
```

## When this changes

- **A new page** gets the form by linking it from its footer:
  `<a href="feedback.html">Feedback</a>`. The page it came from is picked up
  automatically.
- **A new field, or keeping anything else** (IP, user agent, a cookie) changes
  what `privacy.html#feedback` promises. Update it, and its date, in the same
  commit. See `docs/ANALYTICS.md` "Compliance statement".
