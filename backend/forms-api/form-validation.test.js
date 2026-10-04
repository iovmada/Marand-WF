import test from 'node:test';
import assert from 'node:assert/strict';
import { validateFormPayload } from './form-validation.js';

const valid = { name: 'Client', email: 'client@example.com', details: 'Panou Bond 100 × 200 cm', category: 'panouri-rigide' };

test('contact accepts a usable request without company or phone', () => {
  assert.equal(validateFormPayload(valid), null);
});
test('contact rejects blank, whitespace-only and old placeholder required values', () => {
  for (const field of ['name', 'email', 'details']) {
    for (const value of ['', '  ', 'Nespecificat']) {
      assert.ok(validateFormPayload({ ...valid, [field]: value }));
    }
  }
});
test('quote requires a real category in addition to contact data', () => {
  assert.ok(validateFormPayload({ ...valid, category: '' }, { quote: true }));
  assert.ok(validateFormPayload({ ...valid, category: 'Nespecificat' }, { quote: true }));
  assert.equal(validateFormPayload(valid, { quote: true }), null);
});
test('malformed email is rejected before the mail transport is called', () => {
  for (const email of ['client', 'client@', 'client@@example.com', 'client @example.com', 'client@example']) {
    assert.equal(validateFormPayload({ ...valid, email }), 'Introdu o adresă de email validă.');
  }
  assert.equal(validateFormPayload({ ...valid, email: ' client+oferta@example.com ' }), null);
});
