import { describe, expect, it } from 'vitest';
import {
  SUBSCRIPTION_ENTITLEMENT_AUDIENCE,
  SUBSCRIPTION_ENTITLEMENT_ISSUER,
  SUBSCRIPTION_EXPECTED_PACKAGE_NAME,
  type SubscriptionEntitlementVerificationKey,
} from '../config/subscriptionTrust';
import { verifySubscriptionEntitlementAssertion } from './subscriptionEntitlementSignature';

const encoder = new TextEncoder();

const base64Url = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return globalThis
    .btoa(binary)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

const encodeJson = (value: unknown): string => base64Url(encoder.encode(JSON.stringify(value)));

const createSigningFixture = async () => {
  const pair = (await globalThis.crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  )) as CryptoKeyPair;
  const publicJwk = await globalThis.crypto.subtle.exportKey('jwk', pair.publicKey);
  const kid = 'release_key_1234567890';
  const trustedKeys: readonly SubscriptionEntitlementVerificationKey[] = [
    { kid, algorithm: 'ES256', publicJwk },
  ];

  const sign = async (payload: Record<string, unknown>) => {
    const header = encodeJson({ alg: 'ES256', typ: 'scrollshield-entitlement+jwt', kid });
    const body = encodeJson(payload);
    const signingInput = `${header}.${body}`;
    const signature = new Uint8Array(
      await globalThis.crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        pair.privateKey,
        encoder.encode(signingInput),
      ),
    );
    return `${signingInput}.${base64Url(signature)}`;
  };

  return { kid, trustedKeys, sign };
};

const validPayload = (nowMs: number, installationKeyId: string) => ({
  schemaVersion: 1,
  assertionId: 'assertion_1234567890',
  issuer: SUBSCRIPTION_ENTITLEMENT_ISSUER,
  audience: SUBSCRIPTION_ENTITLEMENT_AUDIENCE,
  packageName: SUBSCRIPTION_EXPECTED_PACKAGE_NAME,
  installationKeyId,
  plan: 'plus',
  lifecycleState: 'active',
  issuedAtMs: nowMs - 60_000,
  validUntilMs: nowMs + 60 * 60 * 1000,
});

describe('signed subscription entitlement assertion', () => {
  it('grants paid entitlement only after ES256 verification and exact installation binding', async () => {
    const nowMs = 2_000_000_000_000;
    const installationKeyId = 'installation_key_1234567890123456';
    const fixture = await createSigningFixture();
    const assertion = await fixture.sign(validPayload(nowMs, installationKeyId));

    const result = await verifySubscriptionEntitlementAssertion(
      assertion,
      installationKeyId,
      nowMs,
      fixture.trustedKeys,
    );

    expect(result.verified).toBe(true);
    expect(result.entitlement.plan).toBe('plus');
    expect(result.reason).toBe('verified');
    expect(result.kid).toBe(fixture.kid);
  });

  it('fails closed when the assertion is valid but bound to another installation key', async () => {
    const nowMs = 2_000_000_000_000;
    const fixture = await createSigningFixture();
    const assertion = await fixture.sign(
      validPayload(nowMs, 'installation_key_aaaaaaaaaaaaaaaa'),
    );

    const result = await verifySubscriptionEntitlementAssertion(
      assertion,
      'installation_key_bbbbbbbbbbbbbbbb',
      nowMs,
      fixture.trustedKeys,
    );

    expect(result.verified).toBe(false);
    expect(result.entitlement.plan).toBe('free');
    expect(result.reason).toBe('wrong-installation');
  });

  it('fails closed for tampered payloads and unknown signing keys', async () => {
    const nowMs = 2_000_000_000_000;
    const installationKeyId = 'installation_key_1234567890123456';
    const fixture = await createSigningFixture();
    const assertion = await fixture.sign(validPayload(nowMs, installationKeyId));
    const [header, body, signature] = assertion.split('.');
    const tamperedBody = encodeJson({
      ...validPayload(nowMs, installationKeyId),
      plan: 'max',
    });

    const tampered = await verifySubscriptionEntitlementAssertion(
      `${header}.${tamperedBody}.${signature}`,
      installationKeyId,
      nowMs,
      fixture.trustedKeys,
    );
    expect(tampered.verified).toBe(false);
    expect(tampered.reason).toBe('invalid-signature');

    const unknownKey = await verifySubscriptionEntitlementAssertion(
      `${header}.${body}.${signature}`,
      installationKeyId,
      nowMs,
      [],
    );
    expect(unknownKey.verified).toBe(false);
    expect(unknownKey.reason).toBe('unknown-key');
  });

  it('keeps the production trust configuration fail-closed while no backend public key is released', async () => {
    const result = await verifySubscriptionEntitlementAssertion(
      'a.b.c',
      'installation_key_1234567890123456',
      2_000_000_000_000,
    );
    expect(result.verified).toBe(false);
    expect(result.entitlement.plan).toBe('free');
  });
});
