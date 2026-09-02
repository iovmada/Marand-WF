#!/usr/bin/env node
/**
 * Compares live DNS against ops/dns-snapshot.json.
 *
 *   node scripts/verify-dns.mjs            # check against the snapshot
 *   node scripts/verify-dns.mjs --snapshot # re-capture the snapshot
 *
 * Run it BEFORE a nameserver change to capture the baseline, and AFTER to
 * confirm nothing was lost in the move. The records that matter most are the
 * ones nobody notices are gone: MX, SPF and DKIM. The site failing is
 * obvious within minutes; email silently not arriving is not, and every quote
 * request on this domain arrives by email.
 *
 * Exits non-zero on any drift in an email-critical record.
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SNAPSHOT = join(ROOT, "ops/dns-snapshot.json");
const DOMAIN = "marand-print.ro";

const dig = (type, name) => {
  try {
    return execSync(`dig +short ${type} ${name}`, { encoding: "utf8" })
      .trim()
      .split("\n")
      .filter(Boolean)
      .sort();
  } catch {
    return [];
  }
};

const capture = () => ({
  capturedAt: new Date().toISOString(),
  domain: DOMAIN,
  nameservers: dig("NS", DOMAIN),
  records: {
    "apex A": dig("A", DOMAIN),
    "www CNAME": dig("CNAME", `www.${DOMAIN}`),
    MX: dig("MX", DOMAIN),
    "apex TXT": dig("TXT", DOMAIN),
    "zoho._domainkey TXT": dig("TXT", `zoho._domainkey.${DOMAIN}`),
    "_dmarc TXT": dig("TXT", `_dmarc.${DOMAIN}`),
  },
});

if (process.argv.includes("--snapshot")) {
  const snap = capture();
  writeFileSync(SNAPSHOT, JSON.stringify(snap, null, 2) + "\n");
  console.log(`Snapshot written to ops/dns-snapshot.json at ${snap.capturedAt}`);
  process.exit(0);
}

const baseline = JSON.parse(readFileSync(SNAPSHOT, "utf8"));
const now = capture();

// Losing any of these breaks mail delivery or mail authentication.
const CRITICAL = new Set(["MX", "apex TXT", "zoho._domainkey TXT"]);

let failures = 0;
let warnings = 0;

console.log(`DNS check — ${DOMAIN}`);
console.log(`baseline captured ${baseline.capturedAt}`);
console.log("─".repeat(72));

const nsChanged = JSON.stringify(baseline.nameservers) !== JSON.stringify(now.nameservers);
console.log(`${nsChanged ? "MOVED" : "same "}  nameservers  ${now.nameservers.join(", ")}`);
if (nsChanged) {
  console.log(`         was: ${baseline.nameservers.join(", ")}`);
}

for (const [label, before] of Object.entries(baseline.records)) {
  const after = now.records[label] || [];
  const critical = CRITICAL.has(label);
  const same = JSON.stringify(before) === JSON.stringify(after);

  if (same) {
    console.log(`same   ${label.padEnd(22)} ${after.length} record(s)`);
    continue;
  }

  // The apex A records are EXPECTED to change in a Cloudflare migration.
  const expectedToMove = label === "apex A" || label === "www CNAME";
  if (!critical && expectedToMove) {
    console.log(`moved  ${label.padEnd(22)} ${after.join(", ") || "(none)"}`);
    console.log(`         was: ${before.join(", ") || "(none)"}`);
    continue;
  }

  if (after.length === 0 && before.length > 0) {
    console.log(`LOST   ${label.padEnd(22)} record disappeared — was: ${before.join(", ")}`);
    critical ? failures++ : warnings++;
    continue;
  }

  console.log(`DIFF   ${label.padEnd(22)} ${after.join(", ")}`);
  console.log(`         was: ${before.join(", ")}`);
  critical ? failures++ : warnings++;
}

/* --- things that should exist regardless of any migration --------------- */

if (now.records["_dmarc TXT"].length === 0) {
  console.log("\nMISSING  _dmarc — no DMARC record on this domain.");
  console.log("         Not caused by any migration; it has never been set.");
  console.log("         Suggested starting point (monitor only, safe):");
  console.log("           _dmarc  TXT  v=DMARC1; p=none; rua=mailto:office@marand-print.ro");
  warnings++;
}

const mxOk = now.records.MX.some((r) => /zoho\.eu\.?$/.test(r));
if (!mxOk) {
  console.log("\nCRITICAL  MX no longer points at Zoho EU. Inbound mail is broken.");
  failures++;
}

const spfOk = now.records["apex TXT"].some((r) => r.includes("v=spf1"));
if (!spfOk) {
  console.log("\nCRITICAL  No SPF record. Outbound mail will start failing authentication.");
  failures++;
}

console.log("─".repeat(72));
console.log(
  failures
    ? `${failures} CRITICAL problem(s), ${warnings} warning(s)`
    : `no critical drift${warnings ? `, ${warnings} warning(s)` : ""}`
);

process.exit(failures ? 1 : 0);
