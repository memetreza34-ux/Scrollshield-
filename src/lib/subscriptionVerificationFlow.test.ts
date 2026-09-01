import { beforeEach, describe, expect, it, vi } from 'vitest';

const signChallenge = vi.fn();
const requestIntegrityToken = vi.fn();

vi.mock('./subscriptionInstallationIdentity', () => ({
  buildSubscriptionChallengeStatement: (challengeId: string, nonce: string) =>
    `scrollshield-subscription-v1:${challengeId}:${nonce}`,
  NativeSubscriptionIdentity: { signChallenge },
}));

vi.mock('./nativeIntegrity', () => ({
  isValidServerIntegrityNonce: (value: unknown) => typeof value === 'string' && /^[A-Za-z0-9_-]{22,500}$/.test(value),
  NativeIntegrity: { requestTokenForServerChallenge: requestIntegrityToken },
}));

import {
  MAX_SUBSCRIPTION_CHALLENGE_LIFETIME_MS,
  prepareSubscriptionVerificationProof,
  validateSubscriptionVerificationChallenge,
} from './subscriptionVerificationFlow';

const nowMs = 2_000_000_000_000;
const challenge = {
  challengeId: 'challenge_1234567890',
  nonce: 'AbCdEfGhIjKlMnOpQrStUv',
  issuedAtMs: nowMs - 1_000,
  expiresAtMs: nowMs + 60_000,
};
const purchased = {
  purchaseToken: 'play-purchase-token',
  products: ['scrollshield_plus'],
  purchaseState: 'purchased' as const,
  acknowledged: false,
  autoRenewing: true,
  suspended: false,
  purchaseTimeMs: nowMs - 5_000,
};

describe('subscription verification proof flow', () => {
  beforeEach(() => {
    signChallenge.mockReset();
    requestIntegrityToken.mockReset();
    signChallenge.mockResolvedValue({
      keyId: 'installation_key_1234567890123456',
      publicKeySpki: 'A'.repeat(96),
      algorithm: 'ES256',
      signature: 'B'.repeat(96),
    });
    requestIntegrityToken.mockResolvedValue('opaque-integrity-token-'.padEnd(96, 'x'));
  });

  it('accepts only a fresh bounded server challenge', () => {
    expect(validateSubscriptionVerificationChallenge(challenge, nowMs)).toBe(true);
    expect(
      validateSubscriptionVerificationChallenge(
        { ...challenge, expiresAtMs: challenge.issuedAtMs + MAX_SUBSCRIPTION_CHALLENGE_LIFETIME_MS + 1 },
        nowMs,
      ),
    ).toBe(false);
    expect(validateSubscriptionVerificationChallenge({ ...challenge, expiresAtMs: nowMs }, nowMs)).toBe(false);
  });

  it('builds a proof envelope with no client-authoritative plan or entitlement field', async () => {
    const proof = await prepareSubscriptionVerificationProof(challenge, purchased, nowMs);

    expect(signChallenge).toHaveBeenCalledWith(challenge.challengeId, challenge.nonce);
    expect(requestIntegrityToken).toHaveBeenCalledWith(challenge.nonce);
    expect(proof).toEqual({
      schemaVersion: 1,
      challengeId: challenge.challengeId,
      installationKeyId: 'installation_key_1234567890123456',
      publicKeySpki: 'A'.repeat(96),
      installationAlgorithm: 'ES256',
      installationSignature: 'B'.repeat(96),
      integrityToken: 'opaque-integrity-token-'.padEnd(96, 'x'),
      purchaseToken: 'play-purchase-token',
    });
    expect('plan' in proof).toBe(false);
    expect('entitlement' in proof).toBe(false);
    expect('products' in proof).toBe(false);
  });

  it('never sends pending or suspended purchase tokens for paid verification', async () => {
    await expect(
      prepareSubscriptionVerificationProof(challenge, { ...purchased, purchaseState: 'pending' }, nowMs),
    ).rejects.toThrow();

    await expect(
      prepareSubscriptionVerificationProof(challenge, { ...purchased, suspended: true }, nowMs),
    ).rejects.toThrow();
  });
});
