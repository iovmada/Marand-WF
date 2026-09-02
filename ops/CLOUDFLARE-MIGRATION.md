# Cloudflare migration — runbook

Goal: put a Cloudflare zone **we control** in front of marand-print.ro, so a
Worker can do `Accept: text/markdown` negotiation with a correct `Vary` header.
That is the one agent-readiness item the current hosting cannot satisfy.

**Read this whole file before touching DNS.** The Worker is the easy part and
is already written and tested. The DNS move is the part that can break things,
and the thing it can break is email.

---

## The actual risk

Every quote and contact form on this site delivers by email to
`office@marand-print.ro`, hosted on **Zoho's EU data centre**. Moving
nameservers means recreating every record by hand in Cloudflare. If an MX,
SPF or DKIM record is missed:

- the **site keeps working**, so nothing looks wrong
- **inbound mail stops** or **outbound mail starts failing authentication**
- nobody notices until a customer says "I sent you a request last week"

That asymmetry is the whole reason for `scripts/verify-dns.mjs`.

## Records that must exist in Cloudflare before the cutover

Captured from live DNS on 2026-09-02 — the machine-readable copy is
`ops/dns-snapshot.json`.

| Type | Name | Value | Proxy |
|---|---|---|---|
| MX | `@` | `mx.zoho.eu` priority **10** | DNS only |
| MX | `@` | `mx2.zoho.eu` priority **20** | DNS only |
| MX | `@` | `mx3.zoho.eu` priority **30** | DNS only |
| TXT | `@` | `v=spf1 include:zohomail.eu ~all` | — |
| TXT | `@` | `zoho-verification=zb00054782.zmverify.zoho.eu` | — |
| TXT | `zoho._domainkey` | the DKIM value in `dns-snapshot.json` — copy it whole, it is long and gets truncated by most terminals | — |
| CNAME | `@` | `lobster-app-8rjea.ondigitalocean.app` | **Proxied** |
| CNAME | `www` | `lobster-app-8rjea.ondigitalocean.app` | **Proxied** |

Notes that matter:

- **MX and TXT records are never proxied.** If a mail record shows an orange
  cloud, mail breaks. Cloudflare will not let you proxy MX, but it will let
  you proxy a hostname an MX points at — do not.
- The apex currently resolves to `162.159.140.98` / `172.66.0.96`. Those are
  **DigitalOcean's own Cloudflare edge**, not ours. Do not copy them into the
  new zone as A records — point at the app hostname and let Cloudflare's
  CNAME flattening handle the apex.
- This puts our Cloudflare in front of DigitalOcean's Cloudflare. That works,
  but it is two proxy hops. Expect a small latency cost and set SSL mode to
  **Full (strict)**.

## Sequence

**Do not skip step 1.** Everything else is reversible within a TTL; a lost
DKIM value is not, without regenerating it in Zoho.

1. **Baseline.** `node scripts/verify-dns.mjs --snapshot` — already done, but
   re-run if any DNS changed since. Commit the snapshot.
2. **Lower TTLs at romarg to 300s** and wait for the old TTL to expire
   (usually up to 24h). This makes a rollback fast instead of day-long.
3. **Add DMARC while still at romarg** — see below. Do it here so that if
   mail authentication regresses later, you know it was not the migration.
4. **Create the Cloudflare zone.** Cloudflare will import what it can detect;
   it does **not** reliably detect every TXT. Compare its import against the
   table above line by line, and add what is missing before proceeding.
5. **Verify the zone before switching nameservers** — query Cloudflare's
   assigned nameservers directly, so you see the new zone's answers while
   live traffic is still on romarg:
   ```
   dig @<assigned-ns>.ns.cloudflare.com MX  marand-print.ro
   dig @<assigned-ns>.ns.cloudflare.com TXT marand-print.ro
   dig @<assigned-ns>.ns.cloudflare.com TXT zoho._domainkey.marand-print.ro
   ```
   All three must match the table. **If any does not, stop.**
6. **Change nameservers at romarg** to the Cloudflare pair.
7. **Immediately after propagation:**
   ```
   node scripts/verify-dns.mjs                       # must exit 0
   node scripts/verify-agent-readiness.mjs https://marand-print.ro
   ```
8. **Send a real test email** to `office@marand-print.ro` from an outside
   address, and send one **from** it to an outside address. Automated checks
   confirm records exist; only a real message confirms delivery.
9. **Deploy the Worker** — `ops/cloudflare-worker/README.md`. Only now.
10. Re-run `verify-agent-readiness.mjs`. The two `[host]` lines should flip
    to PASS.

## Rollback

Point the nameservers back at romarg. With TTLs at 300s from step 2 this
takes minutes. The Worker and the Cloudflare zone can stay in place; they do
nothing while the domain resolves elsewhere.

## DMARC — do this regardless

The domain has **no DMARC record**, and never has. That is unrelated to this
migration and worth fixing on its own: without it, nothing tells receiving
mail servers what to do with mail that fails SPF or DKIM, and a business
whose orders arrive by email wants those signals working.

Start in monitor-only mode, which cannot cause rejections:

```
_dmarc   TXT   v=DMARC1; p=none; rua=mailto:office@marand-print.ro
```

Leave it at `p=none` for a few weeks, read the aggregate reports, and only
then consider `p=quarantine`.

## If you decide not to migrate

Nothing here is wasted or load-bearing. `ops/` is documentation and an
unattached Worker; the live site does not reference any of it. The markdown
mirrors, `llms.txt` and `AGENTS-README.md` already give agents what they need
by a different route, and `AGENTS-README.md` explains why negotiation is
absent. Delete `ops/` if the answer is no.
