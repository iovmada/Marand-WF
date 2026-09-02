/**
 * Tests for the Cloudflare Worker's negotiation and path mapping, plus an
 * end-to-end pass over the fetch handler with a stubbed origin.
 *
 * Run:  node --test ops/cloudflare-worker/
 *
 * These duplicate the backend's Accept cases on purpose. The two
 * implementations must agree, and the duplication is what catches it if one
 * drifts.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { parseAccept, wantsMarkdown, markdownPathFor } from './worker.js';

/* ------------------------------------------------------------ Accept parse */

test('parseAccept: types and quality values', () => {
  assert.deepEqual(parseAccept('text/markdown'), [{ type: 'text/markdown', q: 1 }]);
  assert.deepEqual(parseAccept('text/html;q=0.9, text/markdown'), [
    { type: 'text/html', q: 0.9 },
    { type: 'text/markdown', q: 1 },
  ]);
  assert.deepEqual(parseAccept('text/markdown;q=0'), []);
  assert.deepEqual(parseAccept(null), []);
});

test('wantsMarkdown: explicit requests win', () => {
  assert.equal(wantsMarkdown('text/markdown'), true);
  assert.equal(wantsMarkdown('text/x-markdown'), true);
  assert.equal(wantsMarkdown('text/markdown, text/html;q=0.5'), true);
  assert.equal(wantsMarkdown('text/markdown, text/html;q=0'), true);
});

test('wantsMarkdown: a real browser never gets markdown', () => {
  assert.equal(
    wantsMarkdown(
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
    ),
    false
  );
  assert.equal(wantsMarkdown('*/*'), false);
  assert.equal(wantsMarkdown(undefined), false);
});

test('wantsMarkdown: ties go to the safe default', () => {
  assert.equal(wantsMarkdown('text/markdown, text/html'), false);
});

/* --------------------------------------------------------- path mapping */

test('markdownPathFor: pages map to their twin', () => {
  assert.equal(markdownPathFor('/'), '/index.md');
  assert.equal(markdownPathFor('/produse/'), '/produse/index.md');
  assert.equal(markdownPathFor('/produse'), '/produse/index.md');
  assert.equal(markdownPathFor('/comunicat-de-presa/'), '/comunicat-de-presa/index.md');
});

test('markdownPathFor: non-pages are left alone', () => {
  assert.equal(markdownPathFor('/llms.txt'), null);
  assert.equal(markdownPathFor('/index.md'), null);
  assert.equal(markdownPathFor('/sitemap.xml'), null);
  assert.equal(markdownPathFor('/assets/brand/logo.svg'), null);
  assert.equal(markdownPathFor('/api/health'), null);
  assert.equal(markdownPathFor('/api'), null);
});

/* ------------------------------------------------------------ end to end */

/** Stubs the origin: HTML for pages, markdown for .md, 404 for one gap. */
const stubOrigin = (missing = []) => {
  const original = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    if (missing.includes(url.pathname)) return new Response('nope', { status: 404 });
    if (url.pathname.endsWith('.md')) {
      return new Response('# Produse\n\nreal markdown', {
        status: 200,
        headers: { 'Content-Type': 'text/plain', ETag: 'W/"md"' },
      });
    }
    return new Response('<!DOCTYPE html><title>page</title>', {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  };
  return () => {
    globalThis.fetch = original;
  };
};

const get = (path, accept, method = 'GET') =>
  worker.fetch(
    new Request(`https://marand-print.ro${path}`, {
      method,
      headers: accept ? { Accept: accept } : {},
    })
  );

test('e2e: markdown request gets the .md body and correct headers', async () => {
  const restore = stubOrigin();
  try {
    const res = await get('/produse/', 'text/markdown');
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/markdown/);
    assert.match(res.headers.get('vary'), /Accept/);
    assert.match(res.headers.get('link'), /rel="canonical"/);
    assert.equal(res.headers.get('etag'), null, 'HTML ETag must not leak onto the markdown variant');
    assert.match(await res.text(), /# Produse/);
  } finally {
    restore();
  }
});

test('e2e: HTML request is untouched but still carries Vary', async () => {
  const restore = stubOrigin();
  try {
    const res = await get('/produse/', 'text/html');
    assert.match(res.headers.get('content-type'), /text\/html/);
    assert.match(
      res.headers.get('vary'),
      /Accept/,
      'the HTML variant needs Vary too, or a cache serves it to markdown clients'
    );
    assert.match(await res.text(), /<!DOCTYPE html>/);
  } finally {
    restore();
  }
});

test('e2e: a page with no markdown twin falls back to HTML, not 404', async () => {
  const restore = stubOrigin(['/produse-test/index.md']);
  try {
    const res = await get('/produse-test/', 'text/markdown');
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/html/);
  } finally {
    restore();
  }
});

test('e2e: POST passes straight through, never negotiated', async () => {
  const restore = stubOrigin();
  try {
    const res = await get('/api/oferta', 'text/markdown', 'POST');
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('vary'), null, 'writes must not be rewritten by the Worker');
  } finally {
    restore();
  }
});
