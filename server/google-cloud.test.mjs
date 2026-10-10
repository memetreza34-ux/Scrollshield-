import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  fingerprintPurchaseToken, GoogleCloudStore, PurchaseOwnedError, UpstreamError,
} from './google-cloud.mjs';

const token = 'example_fake_purchase_0123456789';
const expectedHash = 'sample-hash';

function makeStore(handler) {
  const urls = [];
  const store = new GoogleCloudStore({
    projectId: 'test-project',
    fetchImpl: async (url, options) => {
      urls.push({ url, ...options });
      if (url.includes('metadata.google.internal')) {
        return new Response(JSON.stringify({ access_token: 'mock-gcp-access', expires_in: 300 }),
          { status: 200 });
      }
      return handler(url, options);
    },
  });
  return { store, urls };
}

test('hashes purchase token, never uses raw token as Firestore document ID', () => {
  const hash = fingerprintPurchaseToken(token);
  assert.equal(hash.length, 64);
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.equal(hash.includes(token), false);
});

test('requests subscription v2 using the Cloud Run identity', async () => {
  const { store, urls } = makeStore(async () => new Response(JSON.stringify({
    subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE', lineItems: [],
  }), { status: 200 }));
  const purchase = await store.queryPlay(token);
  assert.equal(purchase.subscriptionState, 'SUBSCRIPTION_STATE_ACTIVE');
  assert.equal(urls.length, 2);
  assert.equal(urls[1].headers.Authorization, 'Bearer mock-gcp-access');
  assert.match(urls[1].url, /purchases\/subscriptionsv2\/tokens\//);
});

test('rejects invalid subscription data and Play errors', async () => {
  const failed = makeStore(async () => new Response('{}', { status: 403 }));
  await assert.rejects(failed.store.queryPlay(token), UpstreamError);
  const invalid = makeStore(async () => new Response('{}', { status: 200 }));
  await assert.rejects(invalid.store.queryPlay(token), UpstreamError);
});

test('Firestore claim uses atomic createDocument with deterministic token hash', async () => {
  const { store, urls } = makeStore(async () => new Response('{}', { status: 201 }));
  await store.claimPurchase(expectedHash, 'uid-123');
  const request = urls.at(-1);
  assert.equal(request.method, 'POST');
  assert.equal(new URL(request.url).searchParams.get('documentId'), expectedHash);
  const doc = JSON.parse(request.body);
  assert.equal(doc.fields.ownerUid.stringValue, 'uid-123');
  assert.equal(doc.fields.productId.stringValue, 'scrollshield_pro');
  assert.equal(JSON.stringify(doc).includes(token), false);
});

test('existing claim is accepted only for identical identity', async () => {
  let calls = 0;
  const { store } = makeStore(async (url) => {
    calls++;
    if (url.includes('documentId=')) return new Response('{}', { status: 409 });
    return new Response(JSON.stringify({ fields: {
      ownerUid: { stringValue: 'same-owner' },
      productId: { stringValue: 'scrollshield_pro' },
    } }), { status: 200 });
  });
  await store.claimPurchase(expectedHash, 'same-owner');
  assert.equal(calls, 2);
  await assert.rejects(store.claimPurchase(expectedHash, 'different-owner'), PurchaseOwnedError);
});

test('status updates do not overwrite token owner', async () => {
  const { store, urls } = makeStore(async () => new Response('{}', { status: 200 }));
  await store.updateVerifiedStatus(expectedHash, {
    active: false, state: 'SUBSCRIPTION_STATE_EXPIRED', expiryEpochMs: null,
  });
  const req = urls.at(-1);
  assert.equal(req.method, 'PATCH');
  const updateMask = new URL(req.url).searchParams.getAll('updateMask.fieldPaths');
  assert.equal(updateMask.includes('ownerUid'), false);
  assert.equal(JSON.parse(req.body).fields.active.booleanValue, false);
});

test('metadata credential failure cannot fall back to an untrusted token', async () => {
  const store = new GoogleCloudStore({
    projectId: 'test-project',
    fetchImpl: async () => new Response('{}', { status: 404 }),
  });
  await assert.rejects(store.queryPlay(token), UpstreamError);
});
