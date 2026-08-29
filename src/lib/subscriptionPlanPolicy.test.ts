import { describe, expect, it } from 'vitest';
import {
  ALWAYS_FREE_SAFETY_FEATURES,
  SUBSCRIPTION_PLAN_POLICY,
  canProtectAdditionalApp,
  hasSubscriptionCapability,
  isSubscriptionPlanId,
} from './subscriptionPlanPolicy';

describe('subscription plan policy', () => {
  it('keeps the three planned protection limits at 1, 3, and unlimited', () => {
    expect(SUBSCRIPTION_PLAN_POLICY.free.protectedAppLimit).toBe(1);
    expect(SUBSCRIPTION_PLAN_POLICY.plus.protectedAppLimit).toBe(3);
    expect(SUBSCRIPTION_PLAN_POLICY.max.protectedAppLimit).toBeNull();
  });

  it('recognizes only the three supported plan identifiers', () => {
    expect(isSubscriptionPlanId('free')).toBe(true);
    expect(isSubscriptionPlanId('plus')).toBe(true);
    expect(isSubscriptionPlanId('max')).toBe(true);
    expect(isSubscriptionPlanId('pro')).toBe(false);
    expect(isSubscriptionPlanId('premium')).toBe(false);
    expect(isSubscriptionPlanId(undefined)).toBe(false);
  });

  it('enforces protected-app capacity without deleting existing data', () => {
    expect(canProtectAdditionalApp('free', 0)).toBe(true);
    expect(canProtectAdditionalApp('free', 1)).toBe(false);
    expect(canProtectAdditionalApp('plus', 2)).toBe(true);
    expect(canProtectAdditionalApp('plus', 3)).toBe(false);
    expect(canProtectAdditionalApp('max', 999)).toBe(true);
  });

  it('reserves advanced automation for higher tiers while keeping safety outside the capability gate', () => {
    expect(hasSubscriptionCapability('free', 'advancedSchedules')).toBe(false);
    expect(hasSubscriptionCapability('plus', 'advancedSchedules')).toBe(true);
    expect(hasSubscriptionCapability('plus', 'commitmentMode')).toBe(false);
    expect(hasSubscriptionCapability('max', 'commitmentMode')).toBe(true);
    expect(ALWAYS_FREE_SAFETY_FEATURES).toContain('bounded emergency path');
    expect(ALWAYS_FREE_SAFETY_FEATURES).toContain('data export/import');
    expect(ALWAYS_FREE_SAFETY_FEATURES).toContain('native service-health diagnostics');
  });
});
