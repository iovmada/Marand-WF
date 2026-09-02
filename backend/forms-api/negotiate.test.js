/**
 * Unit tests for Accept negotiation.  Run:  node --test backend/forms-api/
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAccept, wantsMarkdown, setVary } from './negotiate.js';

test('parseAccept: splits types and quality values', () => {
  assert.deepEqual(parseAccept('text/markdown'), [{ type: 'text/markdown', q: 1 }]);
  assert.deepEqual(parseAccept('text/html;q=0.9, text/markdown;q=1.0'), [
    { type: 'text/html', q: 0.9 },
    { type: 'text/markdown', q: 1 },
  ]);
});

test('parseAccept: drops q=0 refusals and junk', () => {
  assert.deepEqual(parseAccept('text/html;q=0, text/markdown'), [
    { type: 'text/markdown', q: 1 },
  ]);
  assert.deepEqual(parseAccept('text/markdown;q=banana'), []);
  assert.deepEqual(parseAccept(''), []);
  assert.deepEqual(parseAccept(undefined), []);
});

test('wantsMarkdown: true for an explicit markdown request', () => {
  assert.equal(wantsMarkdown('text/markdown'), true);
  assert.equal(wantsMarkdown('text/x-markdown'), true);
  assert.equal(wantsMarkdown('text/markdown, text/html;q=0.5'), true);
  assert.equal(wantsMarkdown('text/markdown;q=0.9, text/html;q=0.8'), true);
});

test('wantsMarkdown: false when the client did not ask for it', () => {
  assert.equal(wantsMarkdown(undefined), false);
  assert.equal(wantsMarkdown(''), false);
  assert.equal(wantsMarkdown('application/json'), false);
  assert.equal(wantsMarkdown('text/html'), false);
});

test('wantsMarkdown: a browser must never be handed markdown', () => {
  // Chrome's real Accept header. It mentions no markdown at all, but the
  // wildcard means a sloppy check ("does anything match?") would say yes.
  const chrome =
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8';
  assert.equal(wantsMarkdown(chrome), false);
});

test('wantsMarkdown: a wildcard alone is not a markdown request', () => {
  assert.equal(wantsMarkdown('*/*'), false);
});

test('wantsMarkdown: loses a tie against an equally-preferred HTML', () => {
  // Ambiguous intent — serve the safe default rather than guess.
  assert.equal(wantsMarkdown('text/markdown, text/html'), false);
  assert.equal(wantsMarkdown('text/markdown;q=0.8, application/json;q=0.8'), false);
});

test('wantsMarkdown: wins when HTML is explicitly refused', () => {
  assert.equal(wantsMarkdown('text/markdown, text/html;q=0'), true);
});

test('setVary: adds Accept and Accept-Encoding', () => {
  const headers = {};
  const res = {
    vary(name) {
      headers[name] = true;
    },
  };
  setVary(res);
  assert.deepEqual(Object.keys(headers).sort(), ['Accept', 'Accept-Encoding']);
});
