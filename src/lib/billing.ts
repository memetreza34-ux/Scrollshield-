import { Capacitor, registerPlugin } from '@capacitor/core';

/**
 * READ ONLY Google Play Billing 9.1 bridge.
 * Display prices directly from Play; never unlock Pro based on these values.
 * Verified subscription entitlements require a separate authenticated backend
 * that checks purchase tokens with the Google Play Developer API.
 */
export interface PlayPricingPhase {
  formattedPrice: string;
  billingPeriod: string;
  billingCycleCount: number;
  recurrenceMode: number;
  isFree: boolean;
}

export interface PlaySubscriptionOffer {
  productId: string;
  basePlanId: 'monthly' | 'annual';
  offerId?: string;
  title: string;
  description: string;
  phases: PlayPricingPhase[];
}

export type ObservedPurchaseState = 'purchased_unverified' | 'pending' | 'suspended' | 'unknown';

export interface ObservedPlayPurchase {
  state: ObservedPurchaseState;
  acknowledged: boolean;
}

export interface PlayCatalog {
  available: boolean;
  plans: PlaySubscriptionOffer[];
}

export interface PlayPurchaseOverview {
  available: boolean;
  purchases: ObservedPlayPurchase[];
}

/**
 * Verified purchase observations, NOT an entitlement or automatic Pro grant.
 * No purchase tokens or original Play receipts are ever returned to React.
 */
export interface VerifiedPlayRestore {
  available: boolean;
  verifiedActiveObservations: number;
  verifiedInactiveObservations: number;
  pendingPurchases: number;
  verificationFailures: number;
  proActivated: false;
}

export interface PlayBackendReadiness {
  configured: boolean;
}

interface PlayBillingBridge {
  getCatalog(): Promise<PlayCatalog>;
  getPurchaseOverview(): Promise<PlayPurchaseOverview>;
  getVerificationReadiness(): Promise<PlayBackendReadiness>;
  getVerifiedAccountBinding(options: { firebaseIdToken: string }): Promise<{ obfuscatedAccountId: string }>;
  verifyExistingPurchases(options: { firebaseIdToken: string }): Promise<VerifiedPlayRestore>;
  prepareVerifiedCheckout(options: {
    firebaseIdToken: string;
    basePlanId: 'monthly' | 'annual';
    offerId?: string;
  }): Promise<{ readyForFutureCheckout: boolean; checkoutEnabled: false; basePlanId: string }>;
}

const bridge = registerPlugin<PlayBillingBridge>('ScrollShieldBilling');

// A missing/blocked Play Store must not leave the purchase screen spinning forever.
const BILLING_READ_TIMEOUT_MS = 12_000;

export async function withBillingReadTimeout<T>(operation: Promise<T>, timeoutMs = BILLING_READ_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error('PLAY_BILLING_READ_TIMEOUT')), timeoutMs);
    });
    return await Promise.race([operation, timeout]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export const isNativePlayBilling = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

export const getPlayCatalog = async (): Promise<PlayCatalog> =>
  isNativePlayBilling() ? withBillingReadTimeout(bridge.getCatalog()) : { available: false, plans: [] };

export const getPlayPurchaseOverview = async (): Promise<PlayPurchaseOverview> =>
  isNativePlayBilling() ? withBillingReadTimeout(bridge.getPurchaseOverview()) : { available: false, purchases: [] };

/** No server URL built into the APK means all paid verification stays disabled. */
export const getPlayBackendReadiness = async (): Promise<PlayBackendReadiness> =>
  isNativePlayBilling() ? withBillingReadTimeout(bridge.getVerificationReadiness()) : { configured: false };

/**
 * Prepared for a future authenticated native purchase flow. Firebase ID
 * tokens must be short-lived and obtained through verified user sign-in.
 * These are not persisted by ScrollShield.
 */
export async function getVerifiedPlayAccountBinding(firebaseIdToken: string): Promise<string> {
  if (!isNativePlayBilling()) throw new Error('PLAY_BILLING_ANDROID_ONLY');
  const response = await withBillingReadTimeout(bridge.getVerifiedAccountBinding({ firebaseIdToken }), 18_000);
  if (!/^[a-f0-9]{64}$/.test(response.obfuscatedAccountId)) throw new Error('INVALID_PLAY_ACCOUNT_BINDING');
  return response.obfuscatedAccountId;
}

/**
 * Authentication + fresh Google Play offer eligibility preflight.
 * Launching an actual purchase remains disabled in native Android.
 */
export async function prepareVerifiedPlayCheckout(
  firebaseIdToken: string,
  basePlanId: 'monthly' | 'annual',
  offerId?: string,
): Promise<{ readyForFutureCheckout: boolean; checkoutEnabled: false; basePlanId: string }> {
  if (!isNativePlayBilling()) throw new Error('PLAY_BILLING_ANDROID_ONLY');
  return withBillingReadTimeout(
    bridge.prepareVerifiedCheckout({ firebaseIdToken, basePlanId, offerId }),
    24_000,
  );
}

/** Restore is diagnostic-only until native signed entitlement enforcement ships. */
export const verifyOwnedPlayPurchases = async (firebaseIdToken: string): Promise<VerifiedPlayRestore> =>
  isNativePlayBilling()
    ? withBillingReadTimeout(bridge.verifyExistingPurchases({ firebaseIdToken }), 120_000)
    : {
        available: false,
        verifiedActiveObservations: 0,
        verifiedInactiveObservations: 0,
        pendingPurchases: 0,
        verificationFailures: 0,
        proActivated: false,
      };

/** Play supplies the price; this only translates its ISO-8601 billing period. */
export function describeBillingPeriod(period: string): string {
  switch (period) {
    case 'P1M':
      return 'Monat';
    case 'P1Y':
      return 'Jahr';
    case 'P1W':
      return 'Woche';
    case 'P7D':
      return '7 Tage';
    case 'P1D':
      return 'Tag';
    default:
      return period;
  }
}

export function describeOffer(offer: PlaySubscriptionOffer): string {
  return offer.phases
    .map((phase) => {
      const period = describeBillingPeriod(phase.billingPeriod);
      const cycles = phase.billingCycleCount > 1 ? ` × ${phase.billingCycleCount}` : '';
      return `${phase.isFree ? 'Kostenlos' : phase.formattedPrice} / ${period}${cycles}`;
    })
    .join(' → ');
}

export function describePurchaseOverview(overview: PlayPurchaseOverview): string {
  if (!overview.available) return 'Google Play ist auf diesem Gerät nicht verfügbar.';
  if (overview.purchases.length === 0) return 'Google Play hat kein vorhandenes ScrollShield-Abo gefunden.';
  if (overview.purchases.some((entry) => entry.state === 'pending')) {
    return 'Eine Zahlung ist noch ausstehend. Pro wird erst nach Abschluss und Verifikation freigeschaltet.';
  }
  if (overview.purchases.some((entry) => entry.state === 'suspended')) {
    return 'Ein Abo ist pausiert oder die Zahlung konnte nicht abgeschlossen werden. Bitte prüfe Google Play.';
  }
  if (overview.purchases.some((entry) => entry.state === 'purchased_unverified')) {
    return 'Google Play meldet einen Kauf. Die erforderliche serverseitige Prüfung ist noch nicht eingerichtet – Pro wurde nicht freigeschaltet.';
  }
  return 'Ein Kaufstatus wurde gefunden, konnte aber nicht als aktives Abo bestätigt werden.';
}
