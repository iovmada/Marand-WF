#!/usr/bin/env node
/**
 * Verifies every agent-facing endpoint and machine-readable file.
 *
 * Usage:
 *   node scripts/verify-agent-readiness.mjs                       # live site
 *   node scripts/verify-agent-readiness.mjs http://127.0.0.1:8080 # local
 *
 * Exits non-zero if any check fails, so it can gate a deploy. Checks marked
 * [host] are known to be unsatisfiable on the current hosting (static
 * component behind DigitalOcean's Cloudflare, no edge worker); they report
 * their real state and explain, but do not fail the run. See AGENTS-README.md.
 *
 * Node 20+ (uses global fetch).
 */

const BASE = (process.argv[2] || "https://marand-print.ro").replace(/\/$/, "");

const results = [];
let failures = 0;

const record = (name, ok, detail, soft = false) => {
  results.push({ name, ok, detail, soft });
  if (!ok && !soft) failures += 1;
};

const get = async (path, headers = {}) => {
  const res = await fetch(`${BASE}${path}`, { headers, redirect: "manual" });
  const body = await res.text();
  return { status: res.status, headers: res.headers, body };
};

const check = async (name, fn, soft = false) => {
  try {
    const detail = await fn();
    record(name, true, detail, soft);
  } catch (err) {
    record(name, false, err.message, soft);
  }
};

const must = (cond, message) => {
  if (!cond) throw new Error(message);
};

/* ---------------------------------------------------------------- 1. 404 */

await check("404: nonexistent path returns HTTP 404", async () => {
  const { status } = await get("/some-path-that-does-not-exist");
  must(status === 404, `expected 404, got ${status}`);
  return "404";
});

await check("404: body carries recovery links, not a bare error", async () => {
  const { body } = await get("/some-path-that-does-not-exist");
  must(body.length > 1200, `body is only ${body.length} bytes — likely the host default page`);
  for (const needle of ["/llms.txt", "/sitemap.xml", "/produse/", "/contact/"]) {
    must(body.includes(needle), `recovery body is missing a pointer to ${needle}`);
  }
  return `${body.length} bytes, all pointers present`;
});

await check("404: recovery markdown is visible, not collapsed", async () => {
  const { body } = await get("/some-path-that-does-not-exist");
  must(!/<details/i.test(body), "the recovery block is inside <details> — a parser may treat it as hidden");
  must(/<pre>[\s\S]*# 404[\s\S]*<\/pre>/.test(body), "no literal markdown block in the 404 body");
  must(/rel="alternate" type="text\/markdown"/.test(body), "404 does not advertise its .md twin");
  return "visible <pre> markdown + rel=alternate";
});

await check("404: markdown recovery document exists", async () => {
  const { status, body } = await get("/404.md");
  must(status === 200, `expected 200, got ${status}`);
  must(body.includes("# 404"), "404.md is missing its heading");
  must(body.includes("/llms.txt"), "404.md does not point at llms.txt");
  return `${body.length} bytes`;
});

/* ------------------------------------------- 2. markdown content negotiation */

await check(
  "[host] negotiation: Accept: text/markdown on / returns markdown",
  async () => {
    const { headers } = await get("/", { Accept: "text/markdown" });
    const type = headers.get("content-type") || "none";
    must(
      /text\/markdown/.test(type),
      `static host cannot negotiate — got ${type}. Markdown is at /index.md; see /AGENTS-README.md`
    );
    return type;
  },
  true
);

await check(
  "[host] negotiation: / sends Vary: Accept",
  async () => {
    const { headers } = await get("/", { Accept: "text/markdown" });
    const vary = headers.get("vary") || "none";
    must(
      /accept/i.test(vary),
      `Vary is "${vary}" — not set, and must not be claimed while the host cannot actually vary`
    );
    return vary;
  },
  true
);

await check("negotiation: API component honours Accept and sends Vary", async () => {
  const md = await get("/api/agent", { Accept: "text/markdown" });
  const json = await get("/api/agent", { Accept: "application/json" });
  must(md.status === 200, `markdown request returned ${md.status}`);
  must(
    /text\/markdown/.test(md.headers.get("content-type") || ""),
    `expected text/markdown, got ${md.headers.get("content-type")}`
  );
  must(
    /accept/i.test(md.headers.get("vary") || ""),
    `markdown variant is missing Vary: Accept (got "${md.headers.get("vary")}")`
  );
  must(
    /accept/i.test(json.headers.get("vary") || ""),
    `JSON variant is missing Vary: Accept (got "${json.headers.get("vary")}") — a cache would serve it to markdown clients`
  );
  must(
    /application\/json/.test(json.headers.get("content-type") || ""),
    "JSON request did not get JSON back"
  );
  return "both variants negotiated, Vary present on each";
});

/* ------------------------------------------------- 4. JSON-LD structured data */

await check("json-ld: homepage carries parseable structured data", async () => {
  const { body } = await get("/");
  const match = body.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  must(match, "no application/ld+json block on the homepage");
  const data = JSON.parse(match[1]);
  const nodes = data["@graph"] || [data];
  const types = nodes.flatMap((n) => [].concat(n["@type"]));
  must(types.includes("LocalBusiness"), `expected a LocalBusiness node, got ${types.join(", ")}`);
  const biz = nodes.find((n) => [].concat(n["@type"]).includes("LocalBusiness"));
  for (const field of ["name", "url", "description", "telephone", "address"]) {
    must(biz[field], `LocalBusiness node is missing "${field}"`);
  }
  must(biz.address.postalCode === "320003", "address postalCode does not match /contact/");
  must(biz.openingHoursSpecification?.length >= 1, "no opening hours in the JSON-LD");

  // Organization completeness: contactPoint AND address, both required.
  const points = [].concat(biz.contactPoint || []);
  must(points.length >= 1, "LocalBusiness node has no contactPoint");
  for (const cp of points) {
    must(cp["@type"] === "ContactPoint", `contactPoint has @type ${cp["@type"]}`);
    must(cp.contactType, "a contactPoint is missing contactType");
    must(cp.telephone || cp.email, `contactPoint "${cp.contactType}" has neither telephone nor email`);
  }
  must(biz.address["@type"] === "PostalAddress", "address is not a PostalAddress");

  return `${types.join(" + ")}, ${points.length} contactPoint(s), ${biz.openingHoursSpecification.length} hour specs`;
});

/* --------------------------------------------- 5. agent instructions / llms.txt */

await check("llms.txt: exists and carries when-to-use guidance", async () => {
  const { status, body } = await get("/llms.txt");
  must(status === 200, `expected 200, got ${status}`);
  must(/^#\s/m.test(body), "llms.txt has no H1");
  must(/##\s*When to use/i.test(body), "llms.txt has no 'When to use' section");
  must(/##\s*How to call it/i.test(body), "llms.txt does not say how to call the site");
  must(body.includes("134 cm"), "when-to-use is generic — no concrete capability limit stated");
  must(/Do \*\*not\*\* use this site for/.test(body), "llms.txt never states what it is NOT for");
  return `${body.length} bytes`;
});

await check("llms-full.txt: exists and contains every page", async () => {
  const { status, body } = await get("/llms-full.txt");
  must(status === 200, `expected 200, got ${status}`);
  for (const url of ["/produse/", "/materiale/", "/studio/", "/contact/"]) {
    must(body.includes(url), `llms-full.txt is missing ${url}`);
  }
  return `${body.length} bytes`;
});

await check("AGENTS-README.md: states the negotiation limit honestly", async () => {
  const { status, body } = await get("/AGENTS-README.md");
  must(status === 200, `expected 200, got ${status}`);
  must(/Accept: text\/markdown/.test(body), "does not mention Accept negotiation");
  must(/`?\.md`? URL/.test(body), "does not tell agents to request the .md URL instead");
  return `${body.length} bytes`;
});

/* ------------------------------------------------------- markdown mirrors */

const mirrors = [
  "/index.md",
  "/produse/index.md",
  "/materiale/index.md",
  "/studio/index.md",
  "/echipamente/index.md",
  "/productie/index.md",
  "/oferta/index.md",
  "/contact/index.md",
  "/despre/index.md",
  "/confidentialitate/index.md",
  "/comunicat-de-presa/index.md",
];

await check("mirrors: every page has a reachable markdown twin", async () => {
  const bad = [];
  for (const path of mirrors) {
    const { status, body } = await get(path);
    if (status !== 200) bad.push(`${path} -> ${status}`);
    else if (!/\*\*When to use this page\*\*/.test(body)) bad.push(`${path} -> no when-to-use block`);
  }
  must(bad.length === 0, bad.join("; "));
  return `${mirrors.length}/${mirrors.length} present`;
});

await check("mirrors: each HTML page links its markdown twin", async () => {
  const bad = [];
  for (const path of ["/", "/produse/", "/materiale/", "/studio/", "/contact/"]) {
    const { body } = await get(path);
    if (!/<link rel="alternate" type="text\/markdown"/.test(body)) bad.push(path);
  }
  must(bad.length === 0, `missing <link rel="alternate">: ${bad.join(", ")}`);
  return "rel=alternate present";
});

await check(
  "[host] mirrors: .md is served as text/markdown",
  async () => {
    const { headers } = await get("/index.md");
    const type = headers.get("content-type") || "none";
    must(
      /text\/markdown/.test(type),
      `served as ${type} — the host's extension map decides this; agents still parse it, but the type is wrong`
    );
    return type;
  },
  true
);

/* ------------------------------------------------------- trust anchor pages */

// The audit's bar is 500 characters of real content. Measured on text, not
// markup, so a page padded with divs cannot pass.
const textLength = (html) => {
  const main = html.slice(html.indexOf("<main"), html.lastIndexOf("</main>"));
  return (main || html)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim().length;
};

for (const [label, path] of [
  ["about (/despre/)", "/despre/"],
  ["privacy (/confidentialitate/)", "/confidentialitate/"],
  ["contact", "/contact/"],
]) {
  await check(`trust page: ${label} is real content`, async () => {
    const { status, body } = await get(path);
    must(status === 200, `expected 200, got ${status}`);
    const chars = textLength(body);
    must(chars >= 500, `only ${chars} characters of text — the bar is 500`);
    return `${chars.toLocaleString()} chars`;
  });
}

await check("trust page: /about/ and /privacy/ aliases resolve", async () => {
  const bad = [];
  for (const [alias, canonical] of [
    ["/about/", "https://marand-print.ro/despre/"],
    ["/privacy/", "https://marand-print.ro/confidentialitate/"],
  ]) {
    const { status, body } = await get(alias);
    if (status !== 200) { bad.push(`${alias} -> ${status}`); continue; }
    if (textLength(body) < 500) bad.push(`${alias} -> thin content`);
    // The alias must not compete with the canonical Romanian URL.
    const m = body.match(/<link rel="canonical" href="([^"]+)"/);
    if (!m || m[1] !== canonical) bad.push(`${alias} -> canonical is ${m?.[1] ?? "missing"}, expected ${canonical}`);
    if (!/name="robots" content="noindex/.test(body)) bad.push(`${alias} -> alias is not noindex`);
  }
  must(bad.length === 0, bad.join("; "));
  return "both aliases 200, canonical + noindex correct";
});

await check("trust pages: reachable from the footer on every page", async () => {
  const bad = [];
  for (const path of ["/", "/produse/", "/contact/"]) {
    const { body } = await get(path);
    if (!/href="[^"]*despre\/"/.test(body)) bad.push(`${path}: no link to /despre/`);
    if (!/href="[^"]*confidentialitate\/"/.test(body)) bad.push(`${path}: no link to /confidentialitate/`);
  }
  must(bad.length === 0, bad.join("; "));
  return "About + Privacy linked sitewide";
});

/* --------------------------------------------------------- robots + sitemap */

await check("robots.txt: points agents at the markdown mirrors", async () => {
  const { status, body } = await get("/robots.txt");
  must(status === 200, `expected 200, got ${status}`);
  must(body.includes("Sitemap:"), "no Sitemap directive");
  must(body.includes("llms.txt"), "robots.txt does not mention llms.txt");
  return "ok";
});

await check("sitemap.xml: parses and every URL resolves", async () => {
  const { status, body } = await get("/sitemap.xml");
  must(status === 200, `expected 200, got ${status}`);
  const locs = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  must(locs.length > 0, "sitemap has no <loc> entries");
  const bad = [];
  for (const loc of locs) {
    const path = new URL(loc).pathname;
    const { status: s } = await get(path);
    if (s !== 200) bad.push(`${path} -> ${s}`);
  }
  must(bad.length === 0, bad.join("; "));
  return `${locs.length} URLs, all 200`;
});

/* ------------------------------------------------------------------ report */

const pad = Math.max(...results.map((r) => r.name.length));
console.log(`\nAgent readiness — ${BASE}\n${"─".repeat(pad + 12)}`);
for (const r of results) {
  const mark = r.ok ? "PASS" : r.soft ? "HOST" : "FAIL";
  console.log(`${mark}  ${r.name.padEnd(pad)}  ${r.detail}`);
}

const soft = results.filter((r) => !r.ok && r.soft).length;
const passed = results.filter((r) => r.ok).length;
console.log(
  `${"─".repeat(pad + 12)}\n${passed}/${results.length} passed` +
    (soft ? `, ${soft} blocked by hosting (see AGENTS-README.md)` : "") +
    (failures ? `, ${failures} FAILED` : "")
);

process.exit(failures ? 1 : 0);
