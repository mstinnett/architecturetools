# Hosting

architecture.tools is served by a **Cloudflare Worker with static assets**.
Cloudflare builds it from this repo on every push to `main`
(Workers Builds). The repo root is the site: every page, script, image and
font is served straight from Cloudflare's asset store. A small Worker
(`worker/`) runs only for the feedback form's two paths, `/api/feedback` and
`/inbox`.

Until October 2026 the site was on GitHub Pages. The move-over steps are
below; once they are done, delete this note and the "Moving from GitHub
Pages" section.

## Files

| File | What it does |
|---|---|
| `wrangler.jsonc` | The Worker's config: its name, the assets folder (the repo root), which paths run code, the D1 database binding, and logging switched off. |
| `.assetsignore` | What is never published: git, `.github/`, `.claude/`, `docs/`, `tools/`, `data/`, `scratch/`, the Worker source and config. Root-only names start with `/`, so `data` doesn't also hide `assets/data/`. |
| `worker/index.js` | The router. `/api/feedback` and `/inbox` go to the feedback code; anything else falls back to the static files (a 404 for a path with no file). |
| `worker/feedback.js`, `worker/inbox.js`, `worker/feedback-store.js` | The feedback collector and inbox (`docs/FEEDBACK.md`). |
| `tools/test-hosting.mjs` | `node tools/test-hosting.mjs`: the router, and that `.assetsignore` publishes every page and asset and nothing else. |

Page addresses: `/picker.html` redirects to `/picker`, and both work. Every
existing link and bookmark keeps working. `/` serves `index.html`.

## Moving from GitHub Pages (once)

Do these in order. Until step 5 the live site stays on GitHub Pages and
works as before; only the feedback form says "not sent".

1. **Merge this work into `main`.** GitHub Pages serves the new files as
   plain files (harmless: the repo is public) and nothing changes for
   visitors yet.
2. **Create the Worker from the repo.** Cloudflare dashboard > Workers & Pages >
   Create > Import a repository > GitHub > `mstinnett/architecturetools`.
   - Project name: **`architecturetools`** (must match `name` in `wrangler.jsonc`).
   - Production branch: `main`. Build command: leave empty.
     Deploy command: `npx wrangler deploy` (the default).
   - Check the first build log: with no `package.json`, the build picks its
     own wrangler version, and one too old for `wrangler.jsonc` fails loudly.
   - The first deploy creates the D1 database `architecturetools-feedback`.
     If you already made a database with exactly that name, it connects to it
     instead. A database you made under another name is unused: delete it, or
     put its name in `wrangler.jsonc`.
3. **Set the inbox password.** The Worker > Settings > Variables and Secrets >
   Add > type **Secret**, name **`INBOX_PASSWORD`**, a long random value from
   a password manager. Secrets survive every later deploy.
4. **Test on the workers.dev address** shown on the Worker's overview page
   (`architecturetools.<your-subdomain>.workers.dev`): open the cover, the
   picker and the converter, send a note from `/feedback`, read it at `/inbox`,
   delete it.
5. **Point the domain at the Worker.** The Worker > Settings > Domains & Routes >
   Add > Custom domain > `architecture.tools`.
   - The domain must be a zone in this Cloudflare account (Websites list). If
     it isn't, add it there first (Add a domain, then switch the nameservers
     at your registrar), and wait for it to go active.
   - If Cloudflare says the hostname already has DNS records, delete the ones
     that point at GitHub (A records `185.199.108.153` to `185.199.111.153`,
     AAAA `2606:50c0:8000::153` to `2606:50c0:8003::153`, or a CNAME to
     `mstinnett.github.io`) under the zone's DNS > Records, then add the custom
     domain again. HTTPS is set up automatically.
   - If `www.architecture.tools` is in use, keep it working with a redirect.
     A redirect rule only runs on a proxied (orange-cloud) record, so first
     replace any `www` record pointing at GitHub (usually a CNAME to
     `mstinnett.github.io`) with a proxied placeholder: type AAAA, name `www`,
     address `100::`. Then the zone > Rules > Redirect Rules > template
     "Redirect from WWW to root".
6. **Turn off GitHub Pages.** GitHub > the repo > Settings > Pages >
   Branch: None > Save, and clear the custom domain there. Then check the
   zone's DNS has **no record left pointing at GitHub** (any `185.199.*`
   address, `2606:50c0:*` address, or `github.io` CNAME, most often on `www`).
   Once Pages is off, a leftover record lets another GitHub user claim the
   name and serve their own site on it.
7. **Tidy the repo.** Delete `CNAME` and `.nojekyll` (they only served GitHub
   Pages) and set `"workers_dev": false` in `wrangler.jsonc`, so the site is no
   longer also public at the workers.dev address, with its own working form
   and inbox.

If something is wrong after step 5, the Worker's Deployments tab can roll
back to an earlier version. To go back to GitHub Pages instead: remove the
Worker's custom domain first (its managed DNS record blocks the old ones),
then re-add the GitHub records and turn GitHub Pages back on.

## Day to day

- A push to `main` deploys. The `build-data` workflow's own commit (the
  rebuilt `assets/data/hardware-data.json`) deploys the same way. That
  commit must not carry `[skip ci]`: Cloudflare's Git builds skip commits
  tagged that way, and the picker would never get the new data.
- Build logs: the Worker > Deployments, or Settings > Builds.
- **Logging is off** (`"observability": { "enabled": false }`), so Cloudflare
  keeps no per-request log of the Worker this site could read. That is what
  `privacy.html#hosting` promises. Turning it on, or adding Cloudflare Web
  Analytics, changes the statement.
- On the free plan this costs nothing: page views are static-file requests,
  which are free and unlimited. Only the feedback paths count toward the
  100,000 Worker requests a day.

## Run it locally

```sh
node tools/test-hosting.mjs && node tools/test-feedback.mjs

# The real Worker, static files and a local database:
npx wrangler dev --persist-to ../.wrangler-state --var INBOX_PASSWORD:test
# then open http://localhost:8787/
```

Keep `--persist-to` pointing outside the repo. The repo root is the assets
folder, and wrangler restarts whenever a file in it changes, so a local
database kept inside it (the default, `.wrangler/state`) makes it restart on
every write and never answer.
