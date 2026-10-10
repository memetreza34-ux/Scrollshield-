import { describe, expect, it } from 'vitest';
import {
  describeBillingPeriod,
  describeOffer,
  describePurchaseOverview,
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
