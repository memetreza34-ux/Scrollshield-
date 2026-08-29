import { describe, expect, it } from 'vitest';
import {
  MAX_OFFLINE_ENTITLEMENT_WINDOW_MS,
  decideProtectedAppCapacity,
  resolveEffectiveSubscriptionEntitlement,
} from './subscriptionEntitlementPolicy';

const NOW = 2_000_000_000_000;

const verifiedCandidate = (overrides: Record<string, unknown> = {}) => ({
  schemaVersion: 1,
  plan: 'plus',
  lifecycleState: 'active',
  cryptographicallyVerified: true,
  issuedAtMs: NOW - 60_000,
  validUntilMs: NOW + 60_000,
  ...overrides,
});

describe('subscription entitlement policy', () => {
  it('fails closed when the candidate is missing, malformed, or not cryptographically verified', () => {
    expect(resolveEffectiveSubscriptionEntitlement(null, NOW).plan).toBe('free');
    expect(resolveEffectiveSubscriptionEntitlement({ schemaVersion: 2 }, NOW).plan).toBe('free');
    expect(
      resolveEffectiveSubscriptionEntitlement(
        verifiedCandidate({ cryptographicallyVerified: false, plan: 'max' }),
        NOW,
      ).plan,
    ).toBe('free');
  });

  it('never grants paid access for pending, expired, revoked, or unknown lifecycle states', () => {
    for (const lifecycleState of ['pending', 'expired', 'revoked', 'unknown']) {
      const result = resolveEffectiveSubscriptionEntitlement(
        verifiedCandidate({ lifecycleState, plan: 'max' }),
        NOW,
      );
      expect(result.plan).toBe('free');
      expect(result.reason).toBe('non-entitling-lifecycle');
    }
  });

  it('accepts active and grace access only inside a bounded verified time window', () => {
    expect(resolveEffectiveSubscriptionEntitlement(verifiedCandidate(), NOW).plan).toBe('plus');
    expect(
      resolveEffectiveSubscriptionEntitlement(
        verifiedCandidate({ plan: 'max', lifecycleState: 'grace' }),
        NOW,
      ).plan,
    ).toBe('max');

    expect(
      resolveEffectiveSubscriptionEntitlement(
        verifiedCandidate({ validUntilMs: NOW - 1 }),
        NOW,
      ).reason,
    ).toBe('expired-cache');

    expect(
      resolveEffectiveSubscriptionEntitlement(
        verifiedCandidate({
          issuedAtMs: NOW,
          validUntilMs: NOW + MAX_OFFLINE_ENTITLEMENT_WINDOW_MS + 1,
        }),
        NOW,
      ).reason,
    ).toBe('offline-window-too-long');
  });

  it('refuses to silently choose protected apps when a downgrade exceeds capacity', () => {
    const decision = decideProtectedAppCapacity(
      'free',
      ['instagram', 'tiktok', 'youtube'],
      ['instagram', 'tiktok', 'youtube'],
    );

    expect(decision.requiresUserChoice).toBe(true);
    expect(decision.selectedActiveAppIds).toEqual([]);
    expect(decision.pausedAppIds).toEqual([]);
    expect(decision.reason).toBe('selection-required');
  });

  it('applies only an explicit valid downgrade selection and preserves all other configs as paused', () => {
    const decision = decideProtectedAppCapacity(
      'free',
      ['instagram', 'tiktok', 'youtube'],
      ['instagram', 'tiktok', 'youtube'],
      ['youtube'],
    );

    expect(decision.requiresUserChoice).toBe(false);
    expect(decision.selectedActiveAppIds).toEqual(['youtube']);
    expect(decision.pausedAppIds).toEqual(['instagram', 'tiktok']);
    expect(decision.reason).toBe('explicit-selection-applied');
  });

  it('rejects an explicit selection that still exceeds the new plan limit', () => {
    const decision = decideProtectedAppCapacity(
      'plus',
      ['instagram', 'tiktok', 'youtube', 'reddit'],
      ['instagram', 'tiktok', 'youtube', 'reddit'],
      ['instagram', 'tiktok', 'youtube', 'reddit'],
    );

    expect(decision.requiresUserChoice).toBe(true);
    expect(decision.selectedActiveAppIds).toEqual([]);
    expect(decision.pausedAppIds).toEqual([]);
  });

  it('keeps Max capacity unrestricted while preserving the current active set', () => {
    const decision = decideProtectedAppCapacity(
      'max',
      ['instagram', 'tiktok', 'youtube', 'reddit'],
      ['instagram', 'youtube'],
    );

    expect(decision.limit).toBeNull();
    expect(decision.requiresUserChoice).toBe(false);
    expect(decision.selectedActiveAppIds).toEqual(['instagram', 'youtube']);
    expect(decision.pausedAppIds).toEqual(['tiktok', 'reddit']);
  });
});
