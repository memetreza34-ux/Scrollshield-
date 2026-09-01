import { Capacitor, registerPlugin } from '@capacitor/core';

export interface SubscriptionInstallationIdentity {
  keyId: string;
  publicKeySpki: string;
  algorithm: 'ES256';
}

export interface SignedSubscriptionChallenge extends SubscriptionInstallationIdentity {
  signature: string;
}

interface RawSubscriptionInstallationIdentity {
  keyId?: unknown;
  publicKeySpki?: unknown;
  algorithm?: unknown;
  signature?: unknown;
}

interface ScrollShieldSubscriptionIdentityPlugin {
  getIdentity(): Promise<RawSubscriptionInstallationIdentity>;
  signChallenge(options: { statement: string }): Promise<RawSubscriptionInstallationIdentity>;
}

const AndroidSubscriptionIdentity = registerPlugin<ScrollShieldSubscriptionIdentityPlugin>(
  'ScrollShieldSubscriptionIdentity',
);

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const CHALLENGE_PREFIX = 'scrollshield-subscription-v1:';
const ES256_P1363_BASE64URL_LENGTH = 86;

const normalizeIdentity = (raw: RawSubscriptionInstallationIdentity): SubscriptionInstallationIdentity | null => {
  if (
    typeof raw.keyId !== 'string' ||
    raw.keyId.length < 32 ||
    raw.keyId.length > 128 ||
    !BASE64URL_PATTERN.test(raw.keyId) ||
    typeof raw.publicKeySpki !== 'string' ||
    raw.publicKeySpki.length < 64 ||
    raw.publicKeySpki.length > 2048 ||
    !BASE64URL_PATTERN.test(raw.publicKeySpki) ||
    raw.algorithm !== 'ES256'
  ) {
    return null;
  }

  return {
    keyId: raw.keyId,
    publicKeySpki: raw.publicKeySpki,
    algorithm: 'ES256',
  };
};

export const buildSubscriptionChallengeStatement = (challengeId: string, nonce: string): string => {
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(challengeId)) {
    throw new Error('Invalid subscription challenge id');
  }
  if (!/^[A-Za-z0-9_-]{22,500}$/.test(nonce)) {
    throw new Error('Invalid subscription challenge nonce');
  }
  return `${CHALLENGE_PREFIX}${challengeId}:${nonce}`;
};

export const NativeSubscriptionIdentity = {
  isAvailable(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  },

  async getIdentity(): Promise<SubscriptionInstallationIdentity> {
    if (!this.isAvailable()) {
      throw new Error('Subscription installation identity is only available in the Android app');
    }

    const identity = normalizeIdentity(await AndroidSubscriptionIdentity.getIdentity());
    if (!identity) throw new Error('Android returned an invalid subscription installation identity');
    return identity;
  },

  async signChallenge(challengeId: string, nonce: string): Promise<SignedSubscriptionChallenge> {
    if (!this.isAvailable()) {
      throw new Error('Subscription installation identity is only available in the Android app');
    }

    const statement = buildSubscriptionChallengeStatement(challengeId, nonce);
    const raw = await AndroidSubscriptionIdentity.signChallenge({ statement });
    const identity = normalizeIdentity(raw);
    if (
      !identity ||
      typeof raw.signature !== 'string' ||
      raw.signature.length !== ES256_P1363_BASE64URL_LENGTH ||
      !BASE64URL_PATTERN.test(raw.signature)
    ) {
      throw new Error('Android returned an invalid ES256 P1363 subscription challenge signature');
    }

    return {
      ...identity,
      signature: raw.signature,
    };
  },
};
