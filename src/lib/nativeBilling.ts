import { Capacitor, registerPlugin } from '@capacitor/core';

export type PlayPurchaseState = 'purchased' | 'pending' | 'unspecified';

export interface PlaySubscriptionPurchase {
  purchaseToken: string;
  products: string[];
  purchaseState: PlayPurchaseState;
  acknowledged: boolean;
  autoRenewing: boolean;
  purchaseTimeMs: number;
}

interface RawPlaySubscriptionPurchase {
  purchaseToken?: unknown;
  products?: unknown;
  purchaseState?: unknown;
  acknowledged?: unknown;
  autoRenewing?: unknown;
  purchaseTimeMs?: unknown;
}

interface ScrollShieldBillingPlugin {
  getConnectionStatus(): Promise<{ ready: boolean; connectionState: number }>;
  querySubscriptionPurchases(): Promise<{
    purchases: RawPlaySubscriptionPurchase[];
    responseCode: number;
  }>;
}

const AndroidBilling = registerPlugin<ScrollShieldBillingPlugin>('ScrollShieldBilling');

const PURCHASE_STATES = new Set<PlayPurchaseState>(['purchased', 'pending', 'unspecified']);

export const normalizePlaySubscriptionPurchase = (
  raw: RawPlaySubscriptionPurchase,
): PlaySubscriptionPurchase | null => {
  if (
    typeof raw.purchaseToken !== 'string' ||
    raw.purchaseToken.length === 0 ||
    !Array.isArray(raw.products) ||
    !raw.products.every((product) => typeof product === 'string' && product.length > 0) ||
    !PURCHASE_STATES.has(raw.purchaseState as PlayPurchaseState) ||
    typeof raw.acknowledged !== 'boolean' ||
    typeof raw.autoRenewing !== 'boolean' ||
    typeof raw.purchaseTimeMs !== 'number' ||
    !Number.isFinite(raw.purchaseTimeMs) ||
    raw.purchaseTimeMs <= 0
  ) {
    return null;
  }

  return {
    purchaseToken: raw.purchaseToken,
    products: Array.from(new Set(raw.products)),
    purchaseState: raw.purchaseState as PlayPurchaseState,
    acknowledged: raw.acknowledged,
    autoRenewing: raw.autoRenewing,
    purchaseTimeMs: raw.purchaseTimeMs,
  };
};

export const NativeBilling = {
  isAvailable(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  },

  async getConnectionStatus(): Promise<{ ready: boolean; connectionState: number } | null> {
    if (!this.isAvailable()) return null;
    return AndroidBilling.getConnectionStatus();
  },

  /**
   * Returns Play purchase records only. These records are NOT entitlements.
   *
   * Callers must send `purchaseToken` to the secure backend verifier and must never
   * persist `purchaseState === "purchased"` as local Plus/Max authorization.
   */
  async querySubscriptionPurchases(): Promise<PlaySubscriptionPurchase[]> {
    if (!this.isAvailable()) return [];

    const result = await AndroidBilling.querySubscriptionPurchases();
    if (result.responseCode !== 0 || !Array.isArray(result.purchases)) return [];

    return result.purchases
      .map(normalizePlaySubscriptionPurchase)
      .filter((purchase): purchase is PlaySubscriptionPurchase => purchase !== null);
  },
};
