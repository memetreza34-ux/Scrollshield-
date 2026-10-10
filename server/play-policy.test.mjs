import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluatePlaySubscription, safePublicEntitlement, validPurchaseToken } from './play-policy.mjs';

const expiry = '2027-01-01T00:00:00Z';
const now = Date.parse('2026-10-10T12:00:00Z');
const purchase = (state, product = 'scrollshield_pro', until = expiry) => ({
  subscriptionState: state,
  lineItems: [{ productId: product, expiryTime: until }],
});

for (const state of [
  'SUBSCRIPTION_STATE_ACTIVE',
  'SUBSCRIPTION_STATE_IN_GRACE_PERIOD',
  'SUBSCRIPTION_STATE_CANCELED',
]) {
  test(`permits ${state} only until verified product expiry`, () => {
    const result = evaluatePlaySubscription(purchase(state), now);
    assert.equal(result.active, true);
    assert.equal(result.expiryEpochMs, Date.parse(expiry));
    assert.equal(evaluatePlaySubscription(purchase(state), Date.parse(expiry)).active, false);
  });
}

for (const state of [
  'SUBSCRIPTION_STATE_PENDING',
  'SUBSCRIPTION_STATE_PAUSED',
  'SUBSCRIPTION_STATE_ON_HOLD',
  'SUBSCRIPTION_STATE_EXPIRED',
  'SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED',
  'SUBSCRIPTION_STATE_UNSPECIFIED',
  'UNKNOWN',
]) {
  test(`denies ${state} despite any future expiry`, () => {
    assert.equal(evaluatePlaySubscription(purchase(state), now).active, false);
  });
}

test('rejects wrong product and missing line items', () => {
  assert.equal(evaluatePlaySubscription(purchase('SUBSCRIPTION_STATE_ACTIVE', 'another_product'), now).active, false);
  assert.equal(evaluatePlaySubscription({ subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE' }, now).active, false);
});

test('rejects invalid, missing and expired timestamps', () => {
  assert.equal(evaluatePlaySubscription(purchase('SUBSCRIPTION_STATE_ACTIVE', 'scrollshield_pro', ''), now).active, false);
  assert.equal(evaluatePlaySubscription(purchase('SUBSCRIPTION_STATE_ACTIVE', 'scrollshield_pro', '2020-01-01T00:00:00Z'), now).active, false);
});

test('uses latest future expiry among matching line items', () => {
  const raw = {
    subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE',
    lineItems: [
      { productId: 'scrollshield_pro', expiryTime: '2026-12-01T00:00:00Z' },
      { productId: 'other', expiryTime: '2030-01-01T00:00:00Z' },
      { productId: 'scrollshield_pro', expiryTime: expiry },
    ],
  };
  assert.equal(evaluatePlaySubscription(raw, now).expiryEpochMs, Date.parse(expiry));
});

test('public response contains no Google JSON, purchase token or account identifier', () => {
  const publicRecord = safePublicEntitlement(evaluatePlaySubscription(purchase('SUBSCRIPTION_STATE_ACTIVE'), now));
  assert.deepEqual(Object.keys(publicRecord).sort(), ['expiresAt', 'pro', 'source', 'state']);
  assert.equal(publicRecord.pro, true);
});

test('purchase tokens must be bounded and well formed', () => {
  assert.equal(validPurchaseToken('sample-token-1234567890'), true);
  assert.equal(validPurchaseToken(''), false);
  assert.equal(validPurchaseToken('x'.repeat(4097)), false);
  assert.equal(validPurchaseToken('token-with-spaces-999'), false);
  assert.equal(validPurchaseToken(null), false);
});
