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

interface PlayBillingBridge {
  getCatalog(): Promise<PlayCatalog>;
  getPurchaseOverview(): Promise<PlayPurchaseOverview>;
}

const bridge = registerPlugin<PlayBillingBridge>('ScrollShieldBilling');

export const isNativePlayBilling = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

export const getPlayCatalog = async (): Promise<PlayCatalog> =>
  isNativePlayBilling() ? bridge.getCatalog() : { available: false, plans: [] };

export const getPlayPurchaseOverview = async (): Promise<PlayPurchaseOverview> =>
  isNativePlayBilling() ? bridge.getPurchaseOverview() : { available: false, purchases: [] };

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
