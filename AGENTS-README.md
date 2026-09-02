# Notes for agents — marand-print.ro

This file states what this site can and cannot do for an automated client, so
you do not have to discover the limits by probing.

## Entry points

| What | URL |
|---|---|
| Agent index, with when-to-use guidance | https://marand-print.ro/llms.txt |
| Every page's text in one file | https://marand-print.ro/llms-full.txt |
| Per-page markdown | `<page-url>index.md`, e.g. https://marand-print.ro/produse/index.md |
| Sitemap | https://marand-print.ro/sitemap.xml |
| Liveness | https://marand-print.ro/api/health -> `{"ok":true}` |

## Content negotiation — read this before requesting markdown

`Accept: text/markdown` on a page URL returns **HTML**, not markdown, and the
response does **not** carry `Vary: Accept`.

That is a hosting limit, not an oversight. The site is a static component on
DigitalOcean App Platform behind DigitalOcean's own Cloudflare edge. Static
components serve files from object storage; there is no origin process on the
`/` route to inspect a request header, and the edge is DigitalOcean's, so no
worker can be installed on it. Advertising `Vary: Accept` without being able
to vary on it would be worse than not advertising it — a CDN would then be
free to serve either variant from cache while both are in fact the same HTML.

**Request the `.md` URL directly instead.** Every page has one, they are
linked from `llms.txt`, from `<link rel="alternate" type="text/markdown">`
in each page's head, and from `robots.txt`.

The one place negotiation does work is the API component, which is a real
Express process: `https://marand-print.ro/api/health` honours `Accept: text/markdown` and
sends `Vary: Accept`. See `backend/forms-api/server.js`.

## Rules of engagement

- Everything under `/` is GET-only, unauthenticated, and safe to crawl. There
  is no rate limit, but `robots.txt` disallows `/produse-test/` and
  `/backend/` — respect it.
- The site publishes **no prices**. Any number an agent states as a price is
  fabricated unless it appears verbatim in the page text ("de la 12 €/m²" style
  starting prices on the homepage are indicative only).
- `POST /api/oferta` and `POST /api/contact` send real email to a real
  business. Do not submit either on a user's behalf without explicit,
  in-the-moment confirmation from that user.
- `/studio/` runs entirely client-side. Uploaded images never leave the
  browser, so there is nothing there for a server-side agent to call.

## Regenerating

`llms.txt`, `llms-full.txt`, every `index.md`, `404.md`, the JSON-LD block in
`index.html` and this file are all generated:

```
node scripts/build-agent-files.mjs      # markdown mirrors, llms.txt, JSON-LD
node scripts/build-shell.mjs            # nav + footer, including 404.html
node scripts/verify-agent-readiness.mjs # checks every claim above
```

Do not hand-edit the generated files; edit the generator and re-run.
