import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  describeBillingPeriod,
  describeOffer,
  describePurchaseOverview,
  withBillingReadTimeout,
  getPlayBackendReadiness,
  verifyOwnedPlayPurchases,
  getVerifiedPlayAccountBinding,
  prepareVerifiedPlayCheckout,
} from './billing';
import type { PlaySubscriptionOffer } from './billing';

const offer: PlaySubscriptionOffer = {
  productId: 'scrollshield_pro',
  basePlanId: 'annual',
  title: 'ScrollShield Pro',
  description: 'Jährliches Abonnement',
  phases: [
    { formattedPrice: '0,00 €', billingPeriod: 'P7D', billingCycleCount: 1, recurrenceMode: 2, isFree: true },
    { formattedPrice: '24,99 €', billingPeriod: 'P1Y', billingCycleCount: 0, recurrenceMode: 1, isFree: false },
  ],
};

describe('Google Play Billing display only', () => {
  it('formats only store-returned prices and free trial phases', () => {
    expect(describeOffer(offer)).toBe('Kostenlos / 7 Tage → 24,99 € / Jahr');
  });

  it('never invents a price when the store returns no phases', () => {
    expect(describeOffer({ ...offer, phases: [] })).toBe('');
  });

  it('describes multi-cycle offers without assuming their final price', () => {
    const periodic = {
      ...offer,
      phases: [
        { formattedPrice: '1,99 €', billingPeriod: 'P1M', billingCycleCount: 3, recurrenceMode: 2, isFree: false },
      ],
    };
    expect(describeOffer(periodic)).toBe('1,99 € / Monat × 3');
  });

  it('preserves unknown billing periods instead of inventing units', () => {
    expect(describeBillingPeriod('P2M')).toBe('P2M');
    expect(describeBillingPeriod('P1W')).toBe('Woche');
  });
});

describe('unverified purchases never imply entitlement', () => {
  it('handles absent Play service', () => {
    expect(describePurchaseOverview({ available: false, purchases: [] })).toContain('nicht verfügbar');
  });

  it('does not mistake no purchases for an active subscription', () => {
    expect(describePurchaseOverview({ available: true, purchases: [] })).toContain('kein vorhandenes');
  });

  it('does not unlock Pro when Google Play reports PURCHASED without backend verification', () => {
    const text = describePurchaseOverview({
      available: true,
      purchases: [{ state: 'purchased_unverified', acknowledged: true }],
    });
    expect(text).toContain('nicht freigeschaltet');
  });

  it('handles pending subscription payments separately', () => {
    expect(
      describePurchaseOverview({
        available: true,
        purchases: [{ state: 'pending', acknowledged: false }],
      }),
    ).toContain('noch ausstehend');
  });

  it('handles suspended subscriptions without claiming they are active', () => {
    expect(
      describePurchaseOverview({
        available: true,
        purchases: [{ state: 'suspended', acknowledged: true }],
      }),
    ).toContain('pausiert');
  });

  it('does not promote unknown purchase states', () => {
    expect(
      describePurchaseOverview({
        available: true,
        purchases: [{ state: 'unknown', acknowledged: false }],
      }),
    ).toContain('nicht als aktives Abo bestätigt');
  });
});

afterEach(() => vi.useRealTimers());

describe('Play Billing read timeout', () => {
  it('does not hang the paywall when the Play service never responds', async () => {
    vi.useFakeTimers();
    const result = withBillingReadTimeout(new Promise<string>(() => undefined), 100);
    const assertion = expect(result).rejects.toThrow('PLAY_BILLING_READ_TIMEOUT');
    await vi.advanceTimersByTimeAsync(101);
    await assertion;
  });

  it('clears the timeout when the Play service responds promptly', async () => {
    vi.useFakeTimers();
    await expect(withBillingReadTimeout(Promise.resolve('ready'), 500)).resolves.toBe('ready');
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('native verified billing bridge fails closed in a browser', () => {
  it('reports no verification backend when Android native billing is absent', async () => {
    await expect(getPlayBackendReadiness()).resolves.toEqual({ configured: false });
  });

  it('never treats browser purchase restoration as paid', async () => {
    await expect(verifyOwnedPlayPurchases('not-a-real-token')).resolves.toEqual({
      available: false,
      verifiedActiveObservations: 0,
      verifiedInactiveObservations: 0,
      pendingPurchases: 0,
      verificationFailures: 0,
      proActivated: false,
    });
  });

  it('cannot prepare Play checkout or obtain a binding outside Android', async () => {
    await expect(getVerifiedPlayAccountBinding('fake-jwt')).rejects.toThrow('PLAY_BILLING_ANDROID_ONLY');
    await expect(prepareVerifiedPlayCheckout('fake-jwt', 'monthly')).rejects.toThrow('PLAY_BILLING_ANDROID_ONLY');
  });
});
