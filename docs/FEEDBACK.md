# Feedback

Readers send notes from `feedback.html`, linked in every live page's footer.
Each note goes straight to a Cloudflare D1 database in the site's own
Cloudflare account. The owner reads them at **https://architecture.tools/inbox**,
behind a password. Nothing depends on the reader's email app, and no third
party beyond Cloudflare, which already hosts the site, is involved.

This is the site's one piece of server code. Everything else is static, and
static requests never run it.

## Files

| File | What it does |
|---|---|
| `feedback.html` | The form. Sends in place with script; without script it is a plain form post that comes back to `#sent` or `#not-sent`. Sends the page the reader came from (this site only). |
| `functions/api/feedback.js` | `POST /api/feedback`. Checks the post came from this site, drops bots (a hidden `website` field), enforces the length limits, and saves the note. Keeps the note, the optional reply address, the page, and the time. Never the IP address or browser details. |
| `functions/inbox.js` | `/inbox`. Lists the newest 500 notes. Each has a Delete button that only works from the inbox's own page. Answers 404 until both the database and the password below are set up. |
| `functions/_lib/feedback-store.js` | The table definition and the same-site check, shared by both. Not a route. |
| `tools/test-feedback.mjs` | `node tools/test-feedback.mjs`: the collector and inbox against a real SQLite database. |

`functions/` is Cloudflare Pages' convention: each file is a route, deployed
with the site on every push. The table creates itself on the first note.

## Cloudflare setup (once, about 10 minutes)

Until this is done the form says "Your note wasn't sent" and `/inbox` is 404.
Nothing breaks.

1. **Create the database.** Dashboard > Storage & Databases > D1 > Create.
   Name it anything, e.g. `architecturetools-feedback`.
2. **Bind it to the site.** Workers & Pages > the site's Pages project >
   Settings > Bindings > Add > D1 database. Variable name **`FEEDBACK_DB`**,
   pick the database. Do this for Production. Preview deployments can share
   it or get their own.
3. **Set the inbox password.** Same project > Settings > Variables and
   Secrets > Add, type **Secret**, name **`INBOX_PASSWORD`**. Use a long
   random one from a password manager (20+ characters). Nothing else limits
   how many guesses someone can make, so length is the protection.
4. **Redeploy.** Bindings and secrets apply from the next deployment: push a
   commit, or Deployments > the latest > Retry deployment.
5. **Check it.** Send a note from `/feedback.html`, open `/inbox`, enter any
   user name and the password, then delete the test note.

If the project list shows the site as a **Worker** rather than a Pages
project, the `functions/` folder is not deployed. The form then fails safely
("wasn't sent") until the two routes are moved into the Worker's script.

## Reading and clearing notes

- `/inbox` works on a phone. The browser can save the password.
- Delete is per note: open "Delete", then press "Delete this note".
- To clear many at once, use the D1 console (Storage & Databases > D1 > the
  database > Console), e.g. `DELETE FROM feedback WHERE created_at < '2027-01-01';`
- A reader who asks for their note to be deleted is owed that
  (`privacy.html#rights`). Find it by its text or reply address.

## Cost and limits

On Cloudflare's free plan this costs nothing. Only form posts and inbox visits
run the functions, not page views. The free allowances are 100,000 function
runs a day, 100,000 database rows written a day, and 5 GB stored. Past a
daily limit, sends fail until midnight UTC. The free plan never bills.

## If spam starts

Bots that run no script are already dropped, as are posts from other sites.
If spam still gets through, Cloudflare has two free fixes:

- **Rate limiting** (dashboard only): Security > WAF > Rate limiting rules, a
  rule on the path `/api/feedback`, e.g. 5 requests per 10 seconds per IP,
  then block.
- **Turnstile** (a small code change): Cloudflare's bot check. Needs a widget
  on `feedback.html` and a token check in `functions/api/feedback.js`.

## Test locally

```sh
node tools/test-feedback.mjs          # handlers + SQL, no Cloudflare tooling needed

# Cloudflare's own runtime, with a local database (state goes in .wrangler/):
npx wrangler pages dev . --d1 FEEDBACK_DB=local-feedback --binding INBOX_PASSWORD=test
# then open http://localhost:8788/feedback.html and http://localhost:8788/inbox
```

## When this changes

- **A new page** gets the form by linking it from its footer:
  `<a href="feedback.html">Feedback</a>`. The page it came from is picked up
  automatically.
- **A new field, or keeping anything else** (IP, user agent, a cookie) changes
  what `privacy.html#feedback` promises. Update it, and its date, in the same
  commit. See `docs/ANALYTICS.md` "Compliance statement".
