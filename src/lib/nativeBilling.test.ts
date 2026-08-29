import { describe, expect, it } from 'vitest';
import { normalizePlaySubscriptionPurchase } from './nativeBilling';

describe('native billing purchase boundary', () => {
  it('accepts a structurally valid Play purchase record without treating it as entitlement', () => {
    expect(
      normalizePlaySubscriptionPurchase({
        purchaseToken: 'token-123',
        products: ['scrollshield_plus'],
        purchaseState: 'purchased',
        acknowledged: false,
        autoRenewing: true,
        purchaseTimeMs: 2_000_000_000_000,
      }),
    ).toEqual({
      purchaseToken: 'token-123',
      products: ['scrollshield_plus'],
      purchaseState: 'purchased',
      acknowledged: false,
      autoRenewing: true,
      purchaseTimeMs: 2_000_000_000_000,
    });
  });

  it('retains pending state so callers cannot confuse pending payment with paid entitlement', () => {
    const result = normalizePlaySubscriptionPurchase({
      purchaseToken: 'pending-token',
      products: ['scrollshield_max'],
      purchaseState: 'pending',
      acknowledged: false,
      autoRenewing: false,
      purchaseTimeMs: 2_000_000_000_000,
    });

    expect(result?.purchaseState).toBe('pending');
  });

  it('rejects malformed records instead of manufacturing a usable purchase token', () => {
    expect(
      normalizePlaySubscriptionPurchase({
        purchaseToken: '',
        products: ['scrollshield_plus'],
        purchaseState: 'purchased',
        acknowledged: false,
        autoRenewing: true,
        purchaseTimeMs: 2_000_000_000_000,
      }),
    ).toBeNull();

    expect(
      normalizePlaySubscriptionPurchase({
        purchaseToken: 'token-123',
        products: [],
        purchaseState: 'active',
        acknowledged: false,
        autoRenewing: true,
        purchaseTimeMs: Number.NaN,
      }),
    ).toBeNull();
  });

  it('deduplicates product identifiers without changing purchase state', () => {
    expect(
      normalizePlaySubscriptionPurchase({
        purchaseToken: 'token-123',
        products: ['scrollshield_plus', 'scrollshield_plus'],
        purchaseState: 'purchased',
        acknowledged: true,
        autoRenewing: true,
        purchaseTimeMs: 2_000_000_000_000,
      })?.products,
    ).toEqual(['scrollshield_plus']);
  });
});
