#!/usr/bin/env node
/**
 * Generates the machine-readable mirror of the site: a markdown copy of every
 * public page, plus llms.txt / llms-full.txt.
 *
 * Why: the site is a static component on DigitalOcean App Platform sitting
 * behind DigitalOcean's own Cloudflare edge. There is no edge worker and no
 * origin server on the `/` route, so we cannot negotiate on the Accept header
 * (see AGENTS-README.md). What we CAN do is publish the markdown at stable,
 * discoverable URLs and point every agent at them from llms.txt, robots.txt
 * and a <link rel="alternate"> in each page's head.
 *
 * THIS FILE IS THE SINGLE SOURCE OF TRUTH FOR llms.txt AND THE .md MIRRORS.
 * After editing page content or anything below, run:
 *     node scripts/build-agent-files.mjs
 * and commit the regenerated files. Re-running is always safe (idempotent).
 *
 * Node 20+ (the repo's /usr/local/bin/node is v14; use
 * /usr/local/opt/node@20/bin/node).
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = "https://marand-print.ro";

/* ------------------------------------------------------------------ *
 * Business facts — the single source for the JSON-LD block, the llms.txt
 * "Business facts" section and the 404 page. Changing an address or an
 * opening hour here updates all three; do not edit them in the generated
 * files. Every value is taken from /contact/, not invented: there are no
 * geo coordinates below because the site does not publish any.
 * ------------------------------------------------------------------ */

const business = {
  name: "Marand Print Shop",
  legalName: "Marand Print Shop",
  street: "Strada Libertății A2",
  postalCode: "320003",
  city: "Reșița",
  region: "Caraș-Severin",
  countryCode: "RO",
  country: "Romania",
  phone: "+40725894569",
  phoneDisplay: "0725894569",
  email: "office@marand-print.ro",
  hours: [
    { days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], open: "09:00", close: "18:00" },
    { days: ["Saturday"], open: "10:00", close: "14:00" },
  ],
  hoursHuman: "Mon–Fri 09:00–18:00, Sat 10:00–14:00, Sun closed",
  sameAs: [
    "https://www.instagram.com/marandprint",
    "https://www.facebook.com/profile.php?id=61588679174224",
  ],
  languages: ["ro", "en"],
};

/* ------------------------------------------------------------------ *
 * Page inventory
 *
 * `whenToUse` is the part agents actually need: not marketing copy, but the
 * concrete jobs this page can answer. Keep it specific — "printing services"
 * is useless to a router; "roll-fed prints up to 134 cm wide" is not.
 * ------------------------------------------------------------------ */

const pages = [
  {
    file: "index.html",
    md: "index.md",
    url: "/",
    title: "Marand Print Shop",
    summary:
      "Print shop in Reșița, Romania: large format, banners, canvas, stickers, textiles and small format, produced in-house.",
    whenToUse: [
      "the user wants an overview of what Marand prints and at what scale",
      "you need the shop's location, opening hours or contact route",
      "you are deciding whether this supplier can cover a job at all",
    ],
  },
  {
    file: "produse/index.html",
    md: "produse/index.md",
    url: "/produse/",
    title: "Produse — product catalogue",
    summary:
      "Every product family Marand sells, with the substrate, finishing and typical use for each.",
    whenToUse: [
      "the user asks whether a specific printed product can be made (banner, canvas, sticker, T-shirt, sign, label)",
      "you need to map a described job onto a concrete product family",
      "you want the finishing options available for a product (hemming, eyelets, lamination, cutting)",
    ],
  },
  {
    file: "materiale/index.html",
    md: "materiale/index.md",
    url: "/materiale/",
    title: "Materiale — materials catalogue with technical specs",
    summary:
      "Stocked substrates by brand and grade — Avery Dennison, Oracal, Mirage, Star, Stadur, Visual, Artex — with weights, widths and finishes.",
    whenToUse: [
      "the user names a material, brand or grade and you need to confirm it is stocked",
      "you need technical specs: grammage, width, adhesive type, indoor vs outdoor rating, durability",
      "you are choosing between two substrates for a stated environment",
    ],
  },
  {
    file: "studio/index.html",
    md: "studio/index.md",
    url: "/studio/",
    title: "Studio — in-browser print preview",
    summary:
      "A browser tool that projects the user's artwork onto a room photograph in correct wall perspective, for canvas, poster, forex and wallpaper.",
    whenToUse: [
      "the user wants to see how a print will look on a wall before ordering",
      "the user asks about sizing a wall piece relative to furniture or a room",
      "you want to hand a visual, no-signup step to a user who is still deciding",
    ],
    note: "Runs entirely client-side: uploaded images stay in the browser and are never sent to a server.",
  },
  {
    file: "echipamente/index.html",
    md: "echipamente/index.md",
    url: "/echipamente/",
    title: "Echipamente — production equipment",
    summary:
      "The machines on the floor, with their real capability limits — the ceiling on what any quote can promise.",
    whenToUse: [
      "you need the maximum printable width or a hard production limit",
      "the user asks about a technique (eco-solvent, DTF, laser, plotter cutting, lamination)",
      "you are checking feasibility before quoting rather than after",
    ],
  },
  {
    file: "productie/index.html",
    md: "productie/index.md",
    url: "/productie/",
    title: "Producție — production and execution services",
    summary:
      "How a job moves from file to finished print: pre-press checks, printing, lamination, contour cutting and manual finishing, all in-house.",
    whenToUse: [
      "the user asks about turnaround (24h average, no minimum quantity)",
      "you need the artwork requirements before a file is sent: vector PDF/AI/EPS or 300 DPI raster, CMYK",
      "the user asks what finishing is possible — hemming, eyelets, stretching on a frame, lamination, contour cutting",
      "you need to know which steps are in-house rather than subcontracted (all of them)",
    ],
  },
  {
    file: "oferta/index.html",
    md: "oferta/index.md",
    url: "/oferta/",
    title: "Cere Ofertă — quote request",
    summary:
      "The full quote form: project brief plus file upload, routed to office@marand-print.ro.",
    whenToUse: [
      "the user is ready to request a price and you should hand off to a human",
      "the job needs artwork attached before it can be priced",
      "this is the correct terminal action for any pricing question — the site publishes no price list",
    ],
  },
  {
    file: "contact/index.html",
    md: "contact/index.md",
    url: "/contact/",
    title: "Contact — address, phone, hours",
    summary: "Reaching the shop: email, phone, street address in Reșița, opening hours, short message form.",
    whenToUse: [
      "the user wants to phone, email or visit rather than fill in a form",
      "you need the canonical NAP (name, address, phone) for this business",
    ],
  },
  {
    file: "despre/index.html",
    md: "despre/index.md",
    url: "/despre/",
    title: "Despre — who Marand is",
    summary:
      "Company background: an owner-operated print workshop in Reșița with no subcontracting, EU-funded equipment, and the full NAP.",
    whenToUse: [
      "you are verifying this is a real, legitimate business before recommending it",
      "the user asks who Marand is, how big they are, or whether work is done in-house",
      "you need the canonical company facts in one place — name, address, phone, hours, capability limits",
    ],
    note: "Also served at /about/ for convention; /despre/ is the canonical URL.",
  },
  {
    file: "confidentialitate/index.html",
    md: "confidentialitate/index.md",
    url: "/confidentialitate/",
    title: "Confidențialitate — privacy policy",
    summary:
      "What the site collects, where it goes, how long it is kept, and the GDPR rights — written against what the code actually does.",
    whenToUse: [
      "the user asks what happens to data or files they submit",
      "you need to tell a user whether uploading artwork is safe and where it is stored (DigitalOcean Spaces, Frankfurt, EU; signed links expiring within 7 days)",
      "you need to know whether the site tracks visitors (it does not — no analytics, no advertising pixels)",
    ],
    note: "Also served at /privacy/ for convention; /confidentialitate/ is the canonical URL.",
  },
  {
    file: "comunicat-de-presa/index.html",
    md: "comunicat-de-presa/index.md",
    url: "/comunicat-de-presa/",
    title: "Comunicat de presă — EU-funded project",
    summary:
      "Press release for the Programul Regional Vest 2021-2027 grant that equipped the workshop.",
    whenToUse: [
      "the user asks about the EU funding, the grant programme or the company's provenance",
      "you need a dated, citable public statement from the company",
    ],
  },
];

/* ------------------------------------------------------------------ *
 * HTML -> Markdown
 *
 * Deliberately narrow: this understands the handful of block elements this
 * site actually uses inside <main>, and ignores everything else. A general
 * converter would be more code and less predictable output.
 * ------------------------------------------------------------------ */

const entities = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'",
  "&apos;": "'", "&nbsp;": " ", "&mdash;": "—", "&ndash;": "–", "&hellip;": "…",
  "&bdquo;": "„", "&rdquo;": "”", "&ldquo;": "“", "&raquo;": "»", "&laquo;": "«",
  "&times;": "×", "&deg;": "°", "&euro;": "€", "&copy;": "©",
};

const decode = (s) =>
  s
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&[a-zA-Z#0-9]+;/g, (m) => entities[m] ?? m);

const text = (html) =>
  decode(html.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .replace(/\s*\{\{BR\}\}\s*/g, ", ")
    .replace(/,\s*,/g, ",")
    .trim();

/** Everything between <main ...> and </main>, with non-content stripped. */
const mainOf = (html) => {
  const open = html.search(/<main[\s>]/);
  const close = html.lastIndexOf("</main>");
  if (open === -1 || close === -1) return "";
  return html
    .slice(html.indexOf(">", open) + 1, close)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    // Line breaks inside a value carry meaning (street / postcode, two sets of
    // opening hours). Keep them as separators rather than losing them to
    // whitespace collapsing.
    .replace(/<br\s*\/?>/gi, "{{BR}}")
    // Label/value pairs — the contact card's address, phone and hours — are a
    // <span class="*-label"> next to a <p class="*-value">. Emitted bare, the
    // values arrive unlabelled and an agent cannot tell a phone from a
    // postcode, so fold each pair into one bolded line.
    .replace(
      /<span[^>]*class="[^"]*-label[^"]*"[^>]*>([\s\S]*?)<\/span>\s*<p[^>]*class="[^"]*-value[^"]*"[^>]*>([\s\S]*?)<\/p>/gi,
      (_, label, value) => `<p>**${label.replace(/<[^>]*>/g, "").trim()}:** ${value}</p>`
    );
};

/**
 * Walks the block-level tags in document order and emits markdown. Duplicate
 * consecutive lines are dropped: several modules repeat their heading in a
 * visually-hidden element for screen readers, and the mirror should not.
 */
const toMarkdown = (main) => {
  const blocks = [];
  const re =
    /<(h1|h2|h3|h4|p|li|figcaption|blockquote|dt|dd)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = re.exec(main)) !== null) {
    const tag = m[1].toLowerCase();
    const body = text(m[2]);
    if (!body) continue;
    if (tag === "h1") blocks.push({ kind: "h", depth: 2, body });
    else if (tag === "h2") blocks.push({ kind: "h", depth: 2, body });
    else if (tag === "h3") blocks.push({ kind: "h", depth: 3, body });
    else if (tag === "h4") blocks.push({ kind: "h", depth: 4, body });
    else if (tag === "li") blocks.push({ kind: "li", body });
    else if (tag === "dt") blocks.push({ kind: "li", body: `**${body}**` });
    else if (tag === "dd") blocks.push({ kind: "li", body });
    else blocks.push({ kind: "p", body });
  }

  const out = [];
  let last = "";
  for (const b of blocks) {
    if (b.body === last) continue;
    last = b.body;
    if (b.kind === "h") out.push("", `${"#".repeat(b.depth)} ${b.body}`, "");
    else if (b.kind === "li") out.push(`- ${b.body}`);
    else out.push("", b.body, "");
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
};

/* ------------------------------------------------------------------ *
 * Emit
 * ------------------------------------------------------------------ */

const frontMatter = (page) =>
  [
    `# ${page.title}`,
    "",
    `> ${page.summary}`,
    "",
    `Canonical HTML: ${ORIGIN}${page.url}`,
    `Markdown source: ${ORIGIN}${page.url === "/" ? "/index.md" : page.url + "index.md"}`,
    "",
    "**When to use this page**",
    ...page.whenToUse.map((w) => `- ${w}`),
    page.note ? `\n${page.note}` : "",
    "",
    "---",
    "",
  ].join("\n");

const written = [];
const bodies = new Map();

for (const page of pages) {
  const html = readFileSync(join(ROOT, page.file), "utf8");
  const body = toMarkdown(mainOf(html));
  if (!body) {
    console.error(`  FAIL  ${page.file} — no <main> content extracted`);
    process.exitCode = 1;
    continue;
  }
  bodies.set(page.url, body);
  const doc = `${frontMatter(page)}${body}\n`;
  writeFileSync(join(ROOT, page.md), doc, "utf8");
  written.push(page.md);
  console.log(`  ok    ${page.md}  (${doc.length.toLocaleString()} bytes)`);
}

/* ---- llms.txt ---------------------------------------------------- */

const llms = `# Marand Print Shop

> Print shop in Reșița, Romania. Large format, banners, canvas, stickers,
> textiles and small format, printed and finished in-house on eco-solvent,
> DTF and laser equipment. Site and staff language is Romanian; this file is
> in English for agent consumption.

## When to use this site

Reach for Marand when a task involves **physically printing something in
Romania** and you need to know whether it can be made, on what material, and
how to start the order. Concretely:

- Confirming a product is producible: banners and mesh, canvas stretched on a
  frame, stickers and cut vinyl, window film, rigid PVC/forex boards, wallpaper,
  posters, printed T-shirts and textiles, labels, small-format laser work.
- Checking a hard production limit before promising anything. The widest
  roll-fed print is **134 cm** (Mutoh XPJ-1341 SR PRO). Anything wider must be
  panelled — see /echipamente/.
- Looking up a stocked material by brand or grade: Avery Dennison, Oracal,
  Mirage, Star/Starflex, Stadur, Visual, Artex. Specs live on /materiale/.
- Showing a user how a wall piece will look before they commit: /studio/
  composites their own image into a room photo in correct perspective,
  entirely in the browser.
- Handing off a priced job. **There is no public price list.** Any pricing
  question ends at /oferta/ (brief + file upload) or a direct call.

Do **not** use this site for: online checkout or instant pricing (there is
neither — every order passes through a person), a published shipping-rate
table, or live stock levels.

Graphic design **is** available — Marand trades as a "design & print shop" and
will prepare or fix artwork — but it is arranged case by case through
/oferta/ or a call, not ordered from a page.

## How to call it

- Everything is a plain static page — GET, no auth, no rate limit, no API key.
- Every page has a markdown mirror at the same path plus \`index.md\`
  (\`/produse/\` → \`/produse/index.md\`). Fetch the markdown: it is the same
  content without the layout.
- \`Accept: text/markdown\` is **not** honoured on \`/\` — the static host cannot
  negotiate. Request the \`.md\` URL directly instead.
- The only write endpoint is the quote form at \`/oferta/\`, which posts to
  \`/api/oferta\`. It is for humans; do not submit on a user's behalf without
  explicit confirmation.
- \`/api/health\` returns \`{"ok":true}\` if you need a liveness check.

## Pages

${pages
  .map((p) => {
    const mdUrl = p.url === "/" ? "/index.md" : `${p.url}index.md`;
    return `- [${p.title}](${ORIGIN}${mdUrl}): ${p.summary}`;
  })
  .join("\n")}

## Business facts

- Legal/trading name: ${business.legalName}
- Address: ${business.street}, ${business.postalCode} ${business.city}, ${business.region}, ${business.country}
- Phone: ${business.phone}
- Email: ${business.email}
- Hours: ${business.hoursHuman}
- Languages: Romanian (primary), English
- Funding: equipped under Programul Regional Vest 2021-2027 — /comunicat-de-presa/

## Optional

- [Full text of every page in one file](${ORIGIN}/llms-full.txt)
- [Sitemap](${ORIGIN}/sitemap.xml)
- [Agent notes and known limits](${ORIGIN}/AGENTS-README.md)
`;

writeFileSync(join(ROOT, "llms.txt"), llms, "utf8");
written.push("llms.txt");
console.log(`  ok    llms.txt  (${llms.length.toLocaleString()} bytes)`);

/* ---- llms-full.txt ----------------------------------------------- */

const full = [
  llms.trimEnd(),
  "",
  "",
  "# Full page content",
  "",
  ...pages.flatMap((p) => [
    "",
    "=".repeat(72),
    `# ${p.title} — ${ORIGIN}${p.url}`,
    "=".repeat(72),
    "",
    bodies.get(p.url) ?? "",
    "",
  ]),
].join("\n");

writeFileSync(join(ROOT, "llms-full.txt"), `${full.trimEnd()}\n`, "utf8");
written.push("llms-full.txt");
console.log(`  ok    llms-full.txt  (${full.length.toLocaleString()} bytes)`);

/* ------------------------------------------------------------------ *
 * JSON-LD identity on the homepage
 *
 * LocalBusiness rather than Organization: this is a shop with a street
 * address, opening hours and walk-in trade, and that type carries the address
 * and hours fields an agent actually wants. The WebSite node is what makes
 * the markdown mirror discoverable from the structured data itself.
 *
 * Injected between markers so re-running never stacks duplicate blocks.
 * ------------------------------------------------------------------ */

const OPEN_MARK = "<!-- agent:jsonld:start -->";
const CLOSE_MARK = "<!-- agent:jsonld:end -->";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      // LocalBusiness only. schema.org has no "PrintShop" type, and an
      // invented one makes the node fail validation rather than enrich it.
      "@type": "LocalBusiness",
      "@id": `${ORIGIN}/#business`,
      name: business.name,
      legalName: business.legalName,
      url: `${ORIGIN}/`,
      description:
        "Print shop in Reșița, Romania producing large format prints, banners and mesh, canvas, stickers and cut vinyl, rigid boards, wallpaper, printed textiles and small format work in-house.",
      image: `${ORIGIN}/assets/social/marand-print-shop-print-digital-servicii-de-printate.jpg`,
      logo: `${ORIGIN}/assets/brand/logo.svg`,
      telephone: business.phone,
      email: business.email,
      address: {
        "@type": "PostalAddress",
        streetAddress: business.street,
        postalCode: business.postalCode,
        addressLocality: business.city,
        addressRegion: business.region,
        addressCountry: business.countryCode,
      },
      // contactPoint is what lets an agent answer "how do I reach them" without
      // scraping the page. Two entries because the sales route and the data
      // -protection route are the same inbox but different obligations.
      contactPoint: [
        {
          "@type": "ContactPoint",
          contactType: "sales",
          telephone: business.phone,
          email: business.email,
          areaServed: business.countryCode,
          availableLanguage: business.languages,
          hoursAvailable: business.hours.map((h) => ({
            "@type": "OpeningHoursSpecification",
            dayOfWeek: h.days,
            opens: h.open,
            closes: h.close,
          })),
        },
        {
          "@type": "ContactPoint",
          contactType: "customer support",
          telephone: business.phone,
          email: business.email,
          areaServed: business.countryCode,
          availableLanguage: business.languages,
        },
      ],
      openingHoursSpecification: business.hours.map((h) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: h.days,
        opens: h.open,
        closes: h.close,
      })),
      availableLanguage: business.languages,
      sameAs: business.sameAs,
      areaServed: { "@type": "Country", name: business.country },
      makesOffer: [
        "Printuri large format",
        "Bannere și mesh",
        "Printuri pe canvas",
        "Stickere și vinyl",
        "Tricouri și textile",
        "Small format",
      ].map((n) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: n } })),
    },
    {
      "@type": "WebSite",
      "@id": `${ORIGIN}/#website`,
      url: `${ORIGIN}/`,
      name: business.name,
      inLanguage: "ro-RO",
      publisher: { "@id": `${ORIGIN}/#business` },
    },
  ],
};

const block = [
  OPEN_MARK,
  '<script type="application/ld+json">',
  JSON.stringify(jsonLd, null, 2),
  "</script>",
  CLOSE_MARK,
].join("\n");

{
  const file = join(ROOT, "index.html");
  let html = readFileSync(file, "utf8");
  const start = html.indexOf(OPEN_MARK);
  if (start !== -1) {
    const end = html.indexOf(CLOSE_MARK, start) + CLOSE_MARK.length;
    html = html.slice(0, start) + block + html.slice(end);
  } else {
    html = html.replace("</head>", `${block}\n</head>`);
  }
  writeFileSync(file, html, "utf8");
  console.log(`  ok    index.html  (JSON-LD ${block.length.toLocaleString()} bytes)`);
  written.push("index.html (json-ld)");
}

/* ------------------------------------------------------------------ *
 * <link rel="alternate" type="text/markdown"> in every page head
 *
 * Accept negotiation is impossible on this host, so the markdown mirror has
 * to be discoverable some other way. This is the standards-track way to say
 * "the same document exists in another format, here".
 * ------------------------------------------------------------------ */

for (const page of pages) {
  const file = join(ROOT, page.file);
  let html = readFileSync(file, "utf8");
  const href = page.url === "/" ? "/index.md" : `${page.url}index.md`;
  const tag = `<link rel="alternate" type="text/markdown" href="${ORIGIN}${href}" title="Markdown version for agents" />`;
  const existing = /<link rel="alternate" type="text\/markdown"[^>]*>\n?/;
  html = existing.test(html)
    ? html.replace(existing, `${tag}\n`)
    : html.replace("</head>", `${tag}\n</head>`);
  writeFileSync(file, html, "utf8");
}
console.log(`  ok    ${pages.length} page heads carry <link rel="alternate" type="text/markdown">`);

/* ------------------------------------------------------------------ *
 * 404 recovery text
 *
 * The same body is used twice: as /404.md, and inlined into the <pre> in
 * 404.html between markers. A machine that lands on a dead URL gets a usable
 * site map either way, without having to make a second request first.
 *
 * ASCII only — this string is read by things that may not handle UTF-8
 * diacritics well, and every value in it also exists elsewhere in UTF-8.
 * ------------------------------------------------------------------ */

const recovery = `# 404 - Not Found

The requested path does not exist on marand-print.ro. This response carries
HTTP status 404; do not treat the path as valid.

## Where to look next

- Agent entry point: ${ORIGIN}/llms.txt
- Full site text in one file: ${ORIGIN}/llms-full.txt
- Sitemap: ${ORIGIN}/sitemap.xml
- Agent notes and known limits: ${ORIGIN}/AGENTS-README.md

## All pages (markdown mirrors)

${pages
  .map((p) => `- ${p.title.split(" — ")[0]}: ${ORIGIN}${p.url === "/" ? "/index.md" : p.url + "index.md"}`)
  .join("\n")}

## Contact

${business.name}, Strada Libertatii A2, ${business.postalCode} Resita, ${business.country}
Phone ${business.phone} - ${business.email} - ${business.hoursHuman}
`;

writeFileSync(join(ROOT, "404.md"), recovery, "utf8");
written.push("404.md");
console.log(`  ok    404.md  (${recovery.length.toLocaleString()} bytes)`);

{
  const file = join(ROOT, "404.html");
  let html = readFileSync(file, "utf8");
  const open404 = "<!-- agent:404md:start -->";
  const close404 = "<!-- agent:404md:end -->";
  const escaped = recovery
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const start = html.indexOf(open404);
  if (start === -1) {
    console.error("  FAIL  404.html is missing the agent:404md markers");
    process.exitCode = 1;
  } else {
    const end = html.indexOf(close404, start) + close404.length;
    html = html.slice(0, start) + `${open404}\n${escaped}${close404}` + html.slice(end);
    writeFileSync(file, html, "utf8");
    console.log("  ok    404.html  (recovery block synced)");
    written.push("404.html (recovery)");
  }
}

/* ------------------------------------------------------------------ *
 * AGENTS-README.md — the honest capability statement
 * ------------------------------------------------------------------ */

const agentsReadme = `# Notes for agents — marand-print.ro

This file states what this site can and cannot do for an automated client, so
you do not have to discover the limits by probing.

## Entry points

| What | URL |
|---|---|
| Agent index, with when-to-use guidance | ${ORIGIN}/llms.txt |
| Every page's text in one file | ${ORIGIN}/llms-full.txt |
| Per-page markdown | \`<page-url>index.md\`, e.g. ${ORIGIN}/produse/index.md |
| Sitemap | ${ORIGIN}/sitemap.xml |
| Liveness | ${ORIGIN}/api/health -> \`{"ok":true}\` |

## Content negotiation — read this before requesting markdown

\`Accept: text/markdown\` on a page URL returns **HTML**, not markdown, and the
response does **not** carry \`Vary: Accept\`.

That is a hosting limit, not an oversight. The site is a static component on
DigitalOcean App Platform behind DigitalOcean's own Cloudflare edge. Static
components serve files from object storage; there is no origin process on the
\`/\` route to inspect a request header, and the edge is DigitalOcean's, so no
worker can be installed on it. Advertising \`Vary: Accept\` without being able
to vary on it would be worse than not advertising it — a CDN would then be
free to serve either variant from cache while both are in fact the same HTML.

**Request the \`.md\` URL directly instead.** Every page has one, they are
linked from \`llms.txt\`, from \`<link rel="alternate" type="text/markdown">\`
in each page's head, and from \`robots.txt\`.

The one place negotiation does work is the API component, which is a real
Express process: \`${ORIGIN}/api/health\` honours \`Accept: text/markdown\` and
sends \`Vary: Accept\`. See \`backend/forms-api/server.js\`.

## Rules of engagement

- Everything under \`/\` is GET-only, unauthenticated, and safe to crawl. There
  is no rate limit, but \`robots.txt\` disallows \`/produse-test/\` and
  \`/backend/\` — respect it.
- The site publishes **no prices**. Any number an agent states as a price is
  fabricated unless it appears verbatim in the page text ("de la 12 €/m²" style
  starting prices on the homepage are indicative only).
- \`POST /api/oferta\` and \`POST /api/contact\` send real email to a real
  business. Do not submit either on a user's behalf without explicit,
  in-the-moment confirmation from that user.
- \`/studio/\` runs entirely client-side. Uploaded images never leave the
  browser, so there is nothing there for a server-side agent to call.

## Regenerating

\`llms.txt\`, \`llms-full.txt\`, every \`index.md\`, \`404.md\`, the JSON-LD block in
\`index.html\` and this file are all generated:

\`\`\`
node scripts/build-agent-files.mjs      # markdown mirrors, llms.txt, JSON-LD
node scripts/build-shell.mjs            # nav + footer, including 404.html
node scripts/verify-agent-readiness.mjs # checks every claim above
\`\`\`

Do not hand-edit the generated files; edit the generator and re-run.
`;

writeFileSync(join(ROOT, "AGENTS-README.md"), agentsReadme, "utf8");
written.push("AGENTS-README.md");
console.log(`  ok    AGENTS-README.md  (${agentsReadme.length.toLocaleString()} bytes)`);

console.log(`\n${written.length} file(s) written.`);
