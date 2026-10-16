import { registerPlugin } from '@capacitor/core';
import { t } from '../i18n';

/**
 * ScrollShield Pro over Google Play Billing
 * ════════════════════════════════════════
 * The native side is ProBillingPlugin.kt (Google's own billing library, no
 * third-party service). Prices come from Google Play in the user's currency
 * and never live in the code; the app only asks "is Pro active?".
 *
 * In the browser there is no Google Play: every call answers "unavailable"
 * and the paywall stays a preview.
 */

export const GOOGLE_PLAY_SUBSCRIPTIONS = 'https://play.google.com/store/account/subscriptions';

export interface ProPlan {
  /** Base plan in the Play Console: "yearly" or "monthly". */
  basePlanId: string;
  /** The recurring price as Google Play formats it, e.g. "19,99 €". */
  price: string;
  /** ISO 8601 period of the recurring price, e.g. "P1Y". */
  billingPeriod: string;
  /** ISO 8601 period of the free trial, only if this user may still get one. */
  freeTrialPeriod?: string;
}

export interface ProStatus {
  /** False when Google Play could not answer; the stored state then stays. */
  available: boolean;
  active: boolean;
}

export type PurchaseStatus = 'purchased' | 'pending' | 'cancelled' | 'unavailable' | 'error';

interface BillingPlugin {
  getStatus(): Promise<ProStatus>;
  getPlans(): Promise<{ plans: ProPlan[] }>;
  purchase(options: { basePlanId: string }): Promise<{ status: PurchaseStatus; code?: number }>;
  manage(): Promise<void>;
}

const Billing = registerPlugin<BillingPlugin>('ScrollShieldBilling', {
  web: {
    getStatus: async () => ({ available: false, active: false }),
    getPlans: async () => ({ plans: [] }),
    purchase: async () => ({ status: 'unavailable' as const }),
    manage: async () => {
      window.open(GOOGLE_PLAY_SUBSCRIPTIONS, '_blank', 'noopener,noreferrer');
    },
  },
});

export async function readProStatus(): Promise<ProStatus> {
  try {
    return await Billing.getStatus();
  } catch {
    return { available: false, active: false };
  }
}

export async function loadProPlans(): Promise<ProPlan[]> {
  try {
    return (await Billing.getPlans()).plans;
  } catch {
    return [];
  }
}

export async function purchasePro(basePlanId: string): Promise<PurchaseStatus> {
  try {
    return (await Billing.purchase({ basePlanId })).status;
  } catch {
    return 'error';
  }
}

export async function manageSubscription(): Promise<void> {
  try {
    await Billing.manage();
  } catch {
    window.open(GOOGLE_PLAY_SUBSCRIPTIONS, '_blank', 'noopener,noreferrer');
  }
}

/** Pro follows Google Play whenever it answers; without an answer what the app knew stays. */
export const proAfterStatus = (status: ProStatus, current: boolean): boolean =>
  status.available ? status.active : current;

/** An ISO 8601 period from Google Play ("P7D", "P1W", "P1M") in words; null for anything else. */
export function formatPeriod(iso: string | undefined): string | null {
  const match = iso ? /^P(\d+)([DWMY])$/.exec(iso) : null;
  if (!match) return null;
  const unit = match[2];
  const count = Number(match[1]) * (unit === 'W' ? 7 : 1);
  if (unit === 'M') return count === 1 ? t('period.month') : t('period.months', { count });
  if (unit === 'Y') return count === 1 ? t('period.year') : t('period.years', { count });
  return count === 1 ? t('period.day') : t('period.days', { count });
}
