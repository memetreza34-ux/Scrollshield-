import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateKeyPairSync, sign, verify } from 'node:crypto';
import { issueSignedProEntitlement, parseEntitlementForTestingOnly } from './signed-entitlement.mjs';

const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
const now = Date.parse('2026-10-11T12:00:00Z');
const until = Date.parse('2026-11-11T12:00:00Z');
const signMessage = async (message) => sign('RSA-SHA256', message, keys.privateKey);
const active = { active: true, expiryEpochMs: until };

test('issues an RSA-signed grant with no private key or purchase token in payload', async () => {
  const token = await issueSignedProEntitlement({ uid: 'user-123', verified: active, nowMillis: now, signMessage });
  assert.ok(token.startsWith('SS1.'));
  const [prefix, body, signature] = token.split('.');
  assert.equal(prefix, 'SS1');
  assert.equal(verify('RSA-SHA256', Buffer.from(prefix + '.' + body), keys.publicKey,
    Buffer.from(signature, 'base64url')), true);
  const claims = parseEntitlementForTestingOnly(token);
  assert.equal(claims.aud, 'app.scrollshield.mobile');
  assert.equal(claims.plan, 'pro');
  assert.equal(claims.pro, true);
  assert.equal(claims.v, 1);
  assert.equal(claims.exp - claims.iat, 600);
  assert.match(claims.sub, /^[a-f0-9]{64}$/);
  assert.equal(token.includes('user-123'), false);
  assert.equal(token.includes('purchase'), false);
});

test('never issues a grant when Play says pending, expired or inactive', async () => {
  for (const invalid of [
    { active: false, expiryEpochMs: until },
    { active: true, expiryEpochMs: now - 1 },
    { active: true, expiryEpochMs: null },
  ]) {
    assert.equal(await issueSignedProEntitlement({
      uid: 'user-123', verified: invalid, nowMillis: now, signMessage,
    }), null);
  }
});

test('expiration never exceeds the actual verified Google Play expiry', async () => {
  const exp = now + 20_000;
  const token = await issueSignedProEntitlement({
    uid: 'user-123', verified: { active: true, expiryEpochMs: exp }, nowMillis: now, signMessage,
  });
  assert.equal(parseEntitlementForTestingOnly(token).exp, Math.floor(exp / 1000));
});

test('rejects invalid identities and unavailable KMS signing', async () => {
  assert.equal(await issueSignedProEntitlement({
    uid: '', verified: active, nowMillis: now, signMessage,
  }), null);
  await assert.rejects(
    issueSignedProEntitlement({
      uid: 'user-123', verified: active, nowMillis: now,
      signMessage: async () => Buffer.alloc(1),
    }),
    /KMS signature unavailable/,
  );
});

test('signature cannot be transferred to modified claims', async () => {
  const token = await issueSignedProEntitlement({ uid: 'user-123', verified: active, nowMillis: now, signMessage });
  const [prefix, body, signature] = token.split('.');
  const claims = parseEntitlementForTestingOnly(token);
  const tampered = Buffer.from(JSON.stringify({ ...claims, exp: claims.exp + 900 })).toString('base64url');
  assert.equal(verify('RSA-SHA256', Buffer.from(prefix + '.' + tampered), keys.publicKey,
    Buffer.from(signature, 'base64url')), false);
  assert.notEqual(body, tampered);
});
