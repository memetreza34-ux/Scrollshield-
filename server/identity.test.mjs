import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateKeyPairSync, sign } from 'node:crypto';
import { verifyFirebaseIdToken, verifyPubSubJwt, UnauthorizedError } from './identity.mjs';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = publicKey.export({ format: 'jwk' });
const now = Date.parse('2026-10-10T12:00:00Z');

function tokenFor(payload, overrides = {}) {
  const header = { alg: 'RS256', kid: 'unit-test', typ: 'JWT', ...overrides };
  const encoded = [header, payload].map((v) => Buffer.from(JSON.stringify(v)).toString('base64url'));
  const signature = sign('RSA-SHA256', Buffer.from(encoded.join('.')), privateKey).toString('base64url');
  return encoded.join('.') + '.' + signature;
}
const jwks = async () => new Response(JSON.stringify({
  keys: [{ ...jwk, kid: 'unit-test', use: 'sig', alg: 'RS256' }],
}), { status: 200 });

const firebasePayload = () => ({
  sub: 'fake_user_01', iss: 'https://securetoken.google.com/test-project', aud: 'test-project',
  exp: now / 1000 + 3600, iat: now / 1000 - 20, auth_time: now / 1000 - 20,
});

test('accepts a Google-signed Firebase account identity', async () => {
  const user = await verifyFirebaseIdToken(tokenFor(firebasePayload()), 'test-project',
    { now, fetchImpl: jwks });
  assert.deepEqual(user, { uid: 'fake_user_01' });
});

test('rejects tampered Firebase token despite valid-looking claims', async () => {
  const token = tokenFor(firebasePayload());
  const parts = token.split('.');
  const forged = { ...firebasePayload(), sub: 'attacker' };
  parts[1] = Buffer.from(JSON.stringify(forged)).toString('base64url');
  await assert.rejects(verifyFirebaseIdToken(parts.join('.'), 'test-project',
    { now, fetchImpl: jwks }), UnauthorizedError);
});

test('rejects expired, wrong-audience and alg=none tokens', async () => {
  const expired = { ...firebasePayload(), exp: now / 1000 - 1 };
  await assert.rejects(verifyFirebaseIdToken(tokenFor(expired), 'test-project',
    { now, fetchImpl: jwks }), UnauthorizedError);
  const wrong = { ...firebasePayload(), aud: 'other-project' };
  await assert.rejects(verifyFirebaseIdToken(tokenFor(wrong), 'test-project',
    { now, fetchImpl: jwks }), UnauthorizedError);
  await assert.rejects(verifyFirebaseIdToken(tokenFor(firebasePayload(), { alg: 'none' }),
    'test-project', { now, fetchImpl: jwks }), UnauthorizedError);
});

test('does not trust a service whose signing keys are unavailable', async () => {
  await assert.rejects(verifyFirebaseIdToken(tokenFor(firebasePayload()), 'test-project',
    { now, fetchImpl: async () => { throw new Error('offline'); } }), UnauthorizedError);
});

test('checks PubSub push email and exact audience in addition to signature', async () => {
  const claims = {
    sub: '123', iss: 'https://accounts.google.com', aud: 'https://service.example/rtdn',
    email: 'push@test-project.iam.gserviceaccount.com', email_verified: true,
    exp: now / 1000 + 300, iat: now / 1000 - 20,
  };
  const opts = { now, fetchImpl: jwks };
  const valid = tokenFor(claims);
  const verified = await verifyPubSubJwt(valid, claims.aud, claims.email, opts);
  assert.equal(verified.email, claims.email);
  await assert.rejects(verifyPubSubJwt(valid, claims.aud, 'wrong@project.iam.gserviceaccount.com', opts),
    UnauthorizedError);
  await assert.rejects(verifyPubSubJwt(valid, 'https://other.example/rtdn', claims.email, opts),
    UnauthorizedError);
  await assert.rejects(verifyPubSubJwt(tokenFor({ ...claims, email_verified: false }),
    claims.aud, claims.email, opts), UnauthorizedError);
});
