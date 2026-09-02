#!/usr/bin/env node
/**
 * Local static server that behaves like the production host, so
 * verify-agent-readiness.mjs means something before a deploy.
 *
 * Matches DigitalOcean App Platform's static component in the ways that
 * matter to the agent checks:
 *   - directory URLs serve index.html
 *   - unknown paths serve /404.html with a real 404 status (App Platform's
 *     `error_document`, which defaults to 404.html)
 *   - /api/* is proxied to the forms API, as the App Platform ingress does
 *
 * `python3 -m http.server` does none of this — it returns its own 469-byte
 * error page — which is why a plain static server is not good enough here.
 *
 * Usage:
 *   node scripts/serve-local.mjs [port]        # default 8080
 *   API_ORIGIN=http://127.0.0.1:4000 node scripts/serve-local.mjs
 */

import { createServer } from "http";
import { readFile, stat } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, extname, join, normalize, resolve } from "path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.argv[2] || 8080);
const API_ORIGIN = process.env.API_ORIGIN || "http://127.0.0.1:4000";

const types = {
  ".html": "text/html; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const readIfFile = async (path) => {
  try {
    const info = await stat(path);
    if (!info.isFile()) return null;
    return await readFile(path);
  } catch {
    return null;
  }
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let pathname = decodeURIComponent(url.pathname);

  /* ---- /api/* -> forms API, as the App Platform ingress rule does ---- */
  if (pathname === "/api" || pathname.startsWith("/api/")) {
    try {
      const upstream = await fetch(`${API_ORIGIN}${pathname}${url.search}`, {
        method: req.method,
        headers: { ...req.headers, host: new URL(API_ORIGIN).host },
      });
      const body = Buffer.from(await upstream.arrayBuffer());
      const headers = Object.fromEntries(upstream.headers.entries());
      delete headers["content-encoding"];
      delete headers["content-length"];
      res.writeHead(upstream.status, headers);
      return res.end(body);
    } catch {
      res.writeHead(502, { "content-type": "application/json" });
      return res.end(
        JSON.stringify({ error: `forms API not reachable at ${API_ORIGIN}` })
      );
    }
  }

  /* ---- static ---- */
  // normalize() collapses ".." before it can escape ROOT.
  const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const candidates = safe.endsWith("/")
    ? [join(ROOT, safe, "index.html")]
    : [join(ROOT, safe), join(ROOT, safe, "index.html")];

  for (const candidate of candidates) {
    if (!candidate.startsWith(ROOT)) continue;
    const body = await readIfFile(candidate);
    if (body) {
      res.writeHead(200, {
        "content-type": types[extname(candidate).toLowerCase()] || "application/octet-stream",
      });
      return res.end(body);
    }
  }

  /* ---- error_document ---- */
  const notFound = await readIfFile(join(ROOT, "404.html"));
  res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
  return res.end(notFound ?? "404 Not Found");
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Marand static site  http://127.0.0.1:${PORT}`);
  console.log(`  /api/* -> ${API_ORIGIN}`);
  console.log(`  unknown paths -> 404.html with status 404`);
});
