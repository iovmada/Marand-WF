# Deploying the negotiation Worker

**Prerequisite:** marand-print.ro must already be on a Cloudflare zone you
control, and `node scripts/verify-dns.mjs` must exit 0. See
`../CLOUDFLARE-MIGRATION.md`. Deploying this Worker before the DNS move does
nothing — there is no zone for the route to attach to.

## Test first

```
node --test ops/cloudflare-worker/
```

10 tests: Accept parsing, page→markdown path mapping, and an end-to-end pass
over the fetch handler with a stubbed origin. They run in plain Node — no
wrangler, no account needed — so there is no excuse for deploying untested.

## Deploy

```
npx wrangler login
npx wrangler deploy --config ops/cloudflare-worker/wrangler.toml
```

`wrangler.toml` binds the Worker to `marand-print.ro/*`. It deliberately does
**not** match `www.marand-print.ro/*`: www serves the same content and
negotiation there would only duplicate cache entries.

## Verify

```
# markdown variant
curl -sD- -o /dev/null -H 'Accept: text/markdown' https://marand-print.ro/produse/ \
  | grep -iE 'HTTP|content-type|vary'
#   expect: 200, text/markdown, Vary: Accept, Accept-Encoding

# a browser must still get HTML — and still carry Vary
curl -sD- -o /dev/null \
  -H 'Accept: text/html,application/xhtml+xml,*/*;q=0.8' https://marand-print.ro/produse/ \
  | grep -iE 'HTTP|content-type|vary'
#   expect: 200, text/html, Vary: Accept, Accept-Encoding

node scripts/verify-agent-readiness.mjs https://marand-print.ro
#   the two [host] lines should now read PASS
```

## After it works

Two follow-ups, both easy to forget:

1. `AGENTS-README.md` and `llms.txt` currently tell agents that negotiation is
   **not** available and to request `.md` URLs directly. That becomes wrong
   the moment this deploys. Update the copy in
   `scripts/build-agent-files.mjs` and re-run it.
2. The `[host]` soft-fail markers in `scripts/verify-agent-readiness.mjs`
   should become hard checks, so a Worker regression fails the suite instead
   of being excused.

## Rolling back

```
npx wrangler delete --config ops/cloudflare-worker/wrangler.toml
```

Traffic returns to the origin unchanged. The site does not depend on the
Worker for anything except negotiation.

## Cost

Cloudflare's free plan covers 100,000 Worker requests/day. This site is
nowhere near that. Markdown responses are served from a subrequest to the
same origin, which Cloudflare caches — the Worker is not fetching twice per
page view in steady state.
