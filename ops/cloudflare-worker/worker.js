/**
 * Cloudflare Worker — Accept-header content negotiation for marand-print.ro.
 *
 * The site is a static component on DigitalOcean App Platform. Static
 * components serve files from object storage, so there is no origin process
 * that can read a request header and pick a representation. This Worker adds
 * that layer at the edge without changing the site.
 *
 * Behaviour:
 *   GET /produse/   Accept: text/markdown   -> body of /produse/index.md,
 *                                              Content-Type: text/markdown,
 *                                              Vary: Accept, Accept-Encoding
 *   GET /produse/   (anything else)         -> the HTML, unchanged,
 *                                              Vary: Accept, Accept-Encoding
 *
 * Vary goes on BOTH representations. That is the whole point of the exercise:
 * a cache that stores the HTML without it will serve that HTML to a client
 * that asked for markdown, because nothing told the cache the two responses
 * differ by request header.
 *
 * The negotiation rules are identical to backend/forms-api/negotiate.js and
 * are covered by the same test cases in worker.test.js — a browser's
 * `text/html,...,*​/*;q=0.8` must never receive markdown.
 *
 * Deploy: see ops/cloudflare-worker/README.md. Do NOT deploy this before
 * reading ops/CLOUDFLARE-MIGRATION.md — the DNS move is the risky part, not
 * this file.
 */

const MARKDOWN = ["text/markdown", "text/x-markdown"];
const OTHER = ["text/html", "application/json", "application/xhtml+xml", "*/*"];

/** Parses an Accept header into { type, q }, dropping q=0 and unparseable q. */
export function parseAccept(header) {
  if (!header) return [];
  return header
    .split(",")
    .map((part) => {
      const [type, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { type: type.trim().toLowerCase(), q: q ? Number(q.slice(2)) : 1 };
    })
    .filter((e) => e.type && Number.isFinite(e.q) && e.q > 0);
}

/**
 * True only when markdown is asked for AND preferred over the alternatives.
 * The strict `>` is load-bearing: a browser sends `*​/*;q=0.8`, and a "does the
 * header mention markdown" check would hand markdown to every browser.
 */
export function wantsMarkdown(acceptHeader) {
  const pref = parseAccept(acceptHeader);
  const best = (types) =>
    pref.filter((e) => types.includes(e.type)).reduce((m, e) => Math.max(m, e.q), 0);
  const md = best(MARKDOWN);
  return md > 0 && md > best(OTHER);
}

/**
 * Maps a page URL to its markdown twin.
 *   /            -> /index.md
 *   /produse/    -> /produse/index.md
 * Returns null for anything that is not a page: assets, existing .md files,
 * the API, and the machine-readable files that are already plain text.
 */
export function markdownPathFor(pathname) {
  if (pathname.startsWith("/api/") || pathname === "/api") return null;
  if (/\.[a-z0-9]+$/i.test(pathname)) return null; // has an extension already
  if (pathname === "/") return "/index.md";
  if (pathname.endsWith("/")) return `${pathname}index.md`;
  return `${pathname}/index.md`;
}

const withVary = (response) => {
  const r = new Response(response.body, response);
  r.headers.set("Vary", "Accept, Accept-Encoding");
  return r;
};

export default {
  async fetch(request) {
    // Negotiation applies to safe reads only. A POST to /api/oferta must pass
    // through untouched.
    if (request.method !== "GET" && request.method !== "HEAD") {
      return fetch(request);
    }

    const url = new URL(request.url);

    if (!wantsMarkdown(request.headers.get("accept"))) {
      return withVary(await fetch(request));
    }

    const mdPath = markdownPathFor(url.pathname);
    if (!mdPath) return withVary(await fetch(request));

    const mdUrl = new URL(url);
    mdUrl.pathname = mdPath;
    mdUrl.search = "";

    const md = await fetch(mdUrl.toString(), {
      headers: { "Accept-Encoding": request.headers.get("accept-encoding") || "" },
      cf: { cacheEverything: true },
    });

    // No markdown twin for this path — serve the HTML rather than a 404. The
    // client asked for a preference, not a precondition.
    if (!md.ok) return withVary(await fetch(request));

    const out = new Response(md.body, md);
    out.headers.set("Content-Type", "text/markdown; charset=utf-8");
    out.headers.set("Vary", "Accept, Accept-Encoding");
    out.headers.set("Link", `<${url.origin}${url.pathname}>; rel="canonical"`);
    out.headers.delete("ETag"); // the HTML variant's ETag would be wrong here
    return out;
  },
};
