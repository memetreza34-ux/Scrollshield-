import type { PlaySubscriptionPurchase } from './nativeBilling';
import { NativeIntegrity, isValidServerIntegrityNonce } from './nativeIntegrity';
import {
  NativeSubscriptionIdentity,
  buildSubscriptionChallengeStatement,
} from './subscriptionInstallationIdentity';

export interface SubscriptionVerificationChallenge {
  challengeId: string;
  nonce: string;
  issuedAtMs: number;
  expiresAtMs: number;
}

export interface SubscriptionVerificationProofEnvelope {
  schemaVersion: 1;
  challengeId: string;
  installationKeyId: string;
  publicKeySpki: string;
  installationAlgorithm: 'ES256';
  installationSignature: string;
  integrityToken: string;
  purchaseToken: string;
}

export const MAX_SUBSCRIPTION_CHALLENGE_LIFETIME_MS = 5 * 60 * 1000;
export const MAX_SUBSCRIPTION_CHALLENGE_CLOCK_SKEW_MS = 60 * 1000;

const CHALLENGE_ID_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

export const validateSubscriptionVerificationChallenge = (
  challenge: SubscriptionVerificationChallenge,
  nowMs = Date.now(),
): boolean =>
  CHALLENGE_ID_PATTERN.test(challenge.challengeId) &&
  isValidServerIntegrityNonce(challenge.nonce) &&
  Number.isFinite(challenge.issuedAtMs) &&
  Number.isFinite(challenge.expiresAtMs) &&
  challenge.issuedAtMs > 0 &&
  challenge.expiresAtMs > challenge.issuedAtMs &&
  challenge.issuedAtMs <= nowMs + MAX_SUBSCRIPTION_CHALLENGE_CLOCK_SKEW_MS &&
  challenge.expiresAtMs > nowMs &&
  challenge.expiresAtMs - challenge.issuedAtMs <= MAX_SUBSCRIPTION_CHALLENGE_LIFETIME_MS;

const isEligiblePurchaseTransport = (purchase: PlaySubscriptionPurchase): boolean =>
  purchase.purchaseState === 'purchased' && !purchase.suspended && purchase.purchaseToken.length > 0;

/**
 * Builds the proof envelope for the secure backend.
 *
 * Deliberately absent: `plan`, price, entitlement state, product authority or any local
 * verdict. The backend derives plan/lifecycle only from Google Play after consuming the
 * server challenge and verifying installation possession + Play Integrity.
 */
export const prepareSubscriptionVerificationProof = async (
  challenge: SubscriptionVerificationChallenge,
  purchase: PlaySubscriptionPurchase,
  nowMs = Date.now(),
): Promise<SubscriptionVerificationProofEnvelope> => {
  if (!validateSubscriptionVerificationChallenge(challenge, nowMs)) {
    throw new Error('Subscription verification challenge is invalid or expired');
  }
  if (!isEligiblePurchaseTransport(purchase)) {
    throw new Error('Only a non-suspended purchased subscription token may be sent for paid verification');
  }

  // Validate canonical shape before asking native code to perform expensive security operations.
  buildSubscriptionChallengeStatement(challenge.challengeId, challenge.nonce);

  const [signedChallenge, integrityToken] = await Promise.all([
    NativeSubscriptionIdentity.signChallenge(challenge.challengeId, challenge.nonce),
    NativeIntegrity.requestTokenForServerChallenge(challenge.nonce),
  ]);

  return {
    schemaVersion: 1,
    challengeId: challenge.challengeId,
    installationKeyId: signedChallenge.keyId,
    publicKeySpki: signedChallenge.publicKeySpki,
    installationAlgorithm: signedChallenge.algorithm,
    installationSignature: signedChallenge.signature,
    integrityToken,
    purchaseToken: purchase.purchaseToken,
  };
};
