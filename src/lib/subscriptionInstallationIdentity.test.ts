import { describe, expect, it } from 'vitest';
import { buildSubscriptionChallengeStatement } from './subscriptionInstallationIdentity';

describe('subscription installation identity', () => {
  it('builds one canonical statement from the backend challenge id and nonce', () => {
    expect(buildSubscriptionChallengeStatement('challenge_1234567890', 'AbCdEfGhIjKlMnOpQrStUv')).toBe(
      'scrollshield-subscription-v1:challenge_1234567890:AbCdEfGhIjKlMnOpQrStUv',
    );
  });

  it('rejects malformed challenge ids and nonces before native signing', () => {
    expect(() => buildSubscriptionChallengeStatement('short', 'AbCdEfGhIjKlMnOpQrStUv')).toThrow();
    expect(() => buildSubscriptionChallengeStatement('challenge_1234567890', 'nonce+with/padding=')).toThrow();
  });
});
