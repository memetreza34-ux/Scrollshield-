import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { test } from 'node:test';
import { createHandler } from './http.mjs';
import { PurchaseOwnedError, UpstreamError } from './google-cloud.mjs';
import { UnauthorizedError } from './identity.mjs';
import { obfuscatedPlayAccountId } from './play-policy.mjs';

const ACCOUNT_KEY = 'this-is-a-fake-test-only-account-binding-secret-012345';

const TOKEN = 'test_valid_purchase_token_1234567890';
const VALID = {
  subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE',
  lineItems: [{ productId: 'scrollshield_pro', expiryTime: '2028-10-10T00:00:00Z' }],
  externalAccountIdentifiers: { obfuscatedExternalAccountId: obfuscatedPlayAccountId('test-uid', ACCOUNT_KEY) },
};

async function fixture(callback, opts = {}) {
  const recorded = { claims: [], updates: [], lookups: [] };
  const store = {
    productId: 'scrollshield_pro',
    packageName: 'app.scrollshield.mobile',
    queryPlay: async (token) => {
      recorded.lookups.push(token);
      return opts.play ?? VALID;
    },
    getClaim: async () => opts.priorClaim ?? null,
    claimPurchase: async (...args) => {
      recorded.claims.push(args);
      if (opts.conflict) throw new PurchaseOwnedError();
    },
    updateVerifiedStatus: async (...args) => recorded.updates.push(args),
    ...opts.store,
  };
  const server = createServer(createHandler({
    store,
    firebaseProjectId: 'test-project',
    accountHmacKey: ACCOUNT_KEY,
    kmsKeyVersion: 'projects/test/locations/global/keyRings/dev/cryptoKeys/sign/cryptoKeyVersions/1',
    signMessage: async () => Buffer.alloc(256, 42),
    pushAudience: 'https://example.test/v1/play/rtdn',
    pushEmail: 'push@example.test',
    authenticate: async (token) => {
      if (token !== 'valid-user-token') throw new UnauthorizedError();
      return { uid: 'test-uid' };
    },
    authenticatePush: async (token) => {
      if (token !== 'valid-push-token') throw new UnauthorizedError();
    },
    now: () => Date.parse('2026-10-10T12:00:00Z'),
  }));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  const endpoint = `http://127.0.0.1:${port}`;
  const post = (path, payload, bearer = 'valid-user-token') =>
    fetch(endpoint + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bearer}` },
      body: JSON.stringify(payload),
    });
  try {
    await callback({ post, recorded, store });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('successful purchase verification binds the token and returns a minimal response', async () => {
  await fixture(async ({ post, recorded }) => {
    const res = await post('/v1/play/verify', { purchaseToken: TOKEN });
    assert.equal(res.status, 200);
    const result = await res.json();
    assert.deepEqual(Object.keys(result).sort(), ['entitlementToken', 'expiresAt', 'pro', 'source', 'state']);
    assert.equal(result.pro, true);
    assert.ok(result.entitlementToken.startsWith('SS1.'));
    assert.equal(recorded.claims.length, 1);
    assert.equal(recorded.updates.length, 1);
  });
});

test('pending payment returns Free even with a future expiration', async () => {
  await fixture(async ({ post }) => {
    const res = await post('/v1/play/verify', { purchaseToken: TOKEN });
    assert.equal((await res.json()).pro, false);
  }, { play: { ...VALID, subscriptionState: 'SUBSCRIPTION_STATE_PENDING' } });
});

test('wrong product must never claim ownership', async () => {
  await fixture(async ({ post, recorded }) => {
    const res = await post('/v1/play/verify', { purchaseToken: TOKEN });
    assert.equal(res.status, 403);
    assert.equal(recorded.claims.length, 0);
  }, { play: { ...VALID, lineItems: [{ productId: 'other', expiryTime: '2030-01-01T00:00:00Z' }] } });
});

test('no JWT, invalid token and incorrect content type fail closed', async () => {
  await fixture(async ({ post, recorded }) => {
    assert.equal((await post('/v1/play/verify', { purchaseToken: TOKEN }, '')).status, 401);
    assert.equal((await post('/v1/play/verify', { purchaseToken: 'bad' })).status, 400);
    assert.equal(recorded.claims.length, 0);
  });
});

test('token linked to another owner is denied even when Play reports ACTIVE', async () => {
  await fixture(async ({ post }) => {
    const res = await post('/v1/play/verify', { purchaseToken: TOKEN });
    assert.equal(res.status, 409);
    assert.equal((await res.json()).error, 'PURCHASE_ALREADY_LINKED');
  }, { conflict: true });
});

test('new replacement token cannot take over previously linked purchase', async () => {
  await fixture(async ({ post, recorded }) => {
    const res = await post('/v1/play/verify', { purchaseToken: TOKEN });
    assert.equal(res.status, 409);
    assert.equal(recorded.claims.length, 0);
  }, { play: { ...VALID, linkedPurchaseToken: 'old_purchase_token_123456' },
       priorClaim: { ownerUid: 'different-user' } });
});

test('Google Play outage grants no Pro access', async () => {
  await fixture(async ({ post }) => {
    const res = await post('/v1/play/verify', { purchaseToken: TOKEN });
    assert.equal(res.status, 503);
    assert.equal((await res.json()).error, 'PLAY_VERIFICATION_UNAVAILABLE');
  }, { store: { queryPlay: async () => { throw new UpstreamError(); } } });
});

test('trusted PubSub notification re-queries Google but cannot create a claim', async () => {
  await fixture(async ({ post, recorded }) => {
    const notification = { packageName: 'app.scrollshield.mobile',
      subscriptionNotification: { purchaseToken: TOKEN, notificationType: 4 } };
    const wrapper = { message: { data: Buffer.from(JSON.stringify(notification)).toString('base64') } };
    const res = await post('/v1/play/rtdn', wrapper, 'valid-push-token');
    assert.equal(res.status, 204);
    assert.equal(recorded.lookups.length, 0);
  });
});

test('existing claim is refreshed after valid PubSub notification', async () => {
  await fixture(async ({ post, recorded }) => {
    const notification = { packageName: 'app.scrollshield.mobile',
      subscriptionNotification: { purchaseToken: TOKEN } };
    const res = await post('/v1/play/rtdn', { message: {
      data: Buffer.from(JSON.stringify(notification)).toString('base64'),
    } }, 'valid-push-token');
    assert.equal(res.status, 204);
    assert.equal(recorded.lookups.length, 1);
    assert.equal(recorded.updates.length, 1);
  }, { priorClaim: { ownerUid: 'test-uid', productId: 'scrollshield_pro' } });
});

test('server issues deterministic per-user account binding only to authorized callers', async () => {
  await fixture(async ({ post }) => {
    const good = await post('/v1/play/account-id', {});
    assert.equal(good.status, 200);
    assert.deepEqual(await good.json(), {
      obfuscatedAccountId: obfuscatedPlayAccountId('test-uid', ACCOUNT_KEY),
    });
    assert.equal((await post('/v1/play/account-id', {}, 'invalid')).status, 401);
  });
});

test('stolen purchase token with another Play account binding is rejected before Firestore claim', async () => {
  await fixture(async ({ post, recorded }) => {
    const res = await post('/v1/play/verify', { purchaseToken: TOKEN });
    assert.equal(res.status, 403);
    assert.equal((await res.json()).error, 'PURCHASE_ACCOUNT_MISMATCH');
    assert.equal(recorded.claims.length, 0);
  }, { play: { ...VALID, externalAccountIdentifiers: {
    obfuscatedExternalAccountId: obfuscatedPlayAccountId('another-uid', ACCOUNT_KEY),
  } } });
});

test('purchase without Play account-binding proof cannot be claimed', async () => {
  await fixture(async ({ post, recorded }) => {
    assert.equal((await post('/v1/play/verify', { purchaseToken: TOKEN })).status, 403);
    assert.equal(recorded.claims.length, 0);
  }, { play: { ...VALID, externalAccountIdentifiers: undefined } });
});
