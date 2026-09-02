/**
 * Accept-header content negotiation, per acceptmarkdown.com.
 *
 * Lives in its own module so it can be unit-tested without booting the
 * server (server.js calls app.listen at import time). Tests: negotiate.test.js
 */

/**
 * Parses an Accept header into { type, q } entries, dropping anything with
 * q=0 (an explicit refusal) or an unparseable q.
 */
export const parseAccept = (header) => {
  if (!header) return [];
  return header
    .split(',')
    .map((part) => {
      const [type, ...params] = part.trim().split(';');
      const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
      return { type: type.trim().toLowerCase(), q: q ? Number(q.slice(2)) : 1 };
    })
    .filter((entry) => entry.type && Number.isFinite(entry.q) && entry.q > 0);
};

const MARKDOWN = ['text/markdown', 'text/x-markdown'];
const OTHER = ['text/html', 'application/json', 'application/xhtml+xml', '*/*'];

/**
 * True when the client asked for markdown AND preferred it over the
 * alternatives. The strict `>` matters: a browser sends
 * `text/html,...,*\/*;q=0.8`, and a naive "does the header mention markdown"
 * check would hand markdown to anything sending `*\/*`.
 */
export const wantsMarkdown = (acceptHeader) => {
  const preference = parseAccept(acceptHeader);
  const best = (types) =>
    preference
      .filter((entry) => types.includes(entry.type))
      .reduce((max, entry) => Math.max(max, entry.q), 0);

  const markdown = best(MARKDOWN);
  if (!markdown) return false;
  return markdown > best(OTHER);
};

/**
 * Marks a response as varying on Accept.
 *
 * Set on EVERY negotiated response, not just the markdown one: a shared cache
 * that stores the JSON variant without this header will serve that JSON to a
 * client that asked for markdown, because nothing told it the two responses
 * differ by request header.
 */
export const setVary = (res) => {
  res.vary('Accept');
  res.vary('Accept-Encoding');
};
