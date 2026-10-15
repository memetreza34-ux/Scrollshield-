import { MessageKey, t } from '../i18n';
import type { AppState } from '../types';

/**
 * Free and Pro (docs/V1_MASTER_PLAN.md, section 10)
 * ═════════════════════════════════════════════════
 * Every feature check goes through here. Prices live in the store and never
 * appear in this file: the only question is "has Pro?".
 */

export const FREE_LIMITS = {
  protectedApps: 2,
  schedules: 1,
  focusDurations: [15, 30, 60],
} as const;

export type ProFeature =
  | 'third_app'
  | 'preset_stark'
  | 'preset_eigene'
  | 'session_guard'
  | 'daily_budget'
  | 'second_schedule'
  | 'rescue'
  | 'commitment'
  | 'insights_week'
  | 'custom_focus'
  | 'strict_focus'
  | 'feed_extras';

/** The paywall's first sentence for each feature, in the current language. */
const PRO_REASONS: Record<ProFeature, MessageKey> = {
  third_app: 'paywall.reason.third_app',
  preset_stark: 'paywall.reason.preset_stark',
  preset_eigene: 'paywall.reason.preset_eigene',
  session_guard: 'paywall.reason.session_guard',
  daily_budget: 'paywall.reason.daily_budget',
  second_schedule: 'paywall.reason.second_schedule',
  rescue: 'paywall.reason.rescue',
  commitment: 'paywall.reason.commitment',
  insights_week: 'paywall.reason.insights_week',
  custom_focus: 'paywall.reason.custom_focus',
  strict_focus: 'paywall.reason.strict_focus',
  feed_extras: 'paywall.reason.feed_extras',
};

export const PRO_BENEFITS: MessageKey[] = [
  'paywall.benefit.apps',
  'paywall.benefit.presets',
  'paywall.benefit.limits',
  'paywall.benefit.schedules',
  'paywall.benefit.rescue',
  'paywall.benefit.focus',
  'paywall.benefit.swipes',
  'paywall.benefit.insights',
];

export const hasPro = (state: Pick<AppState, 'pro'>) => state.pro?.active === true;

export const countProtectedApps = (state: Pick<AppState, 'appsConfig'>) =>
  Object.values(state.appsConfig).filter((config) => config.active).length;

/** Whether one more app may be switched on. */
export const canProtectAnotherApp = (state: Pick<AppState, 'appsConfig' | 'pro'>) =>
  hasPro(state) || countProtectedApps(state) < FREE_LIMITS.protectedApps;

export const canAddSchedule = (state: Pick<AppState, 'schedules' | 'pro'>) =>
  hasPro(state) || state.schedules.length < FREE_LIMITS.schedules;

/** The state change that opens the paywall for a feature; pair it with navigate('paywall'). */
export const paywallFor = (feature: ProFeature): Pick<AppState, 'paywallReason'> => ({
  paywallReason: t(PRO_REASONS[feature], {
    apps: FREE_LIMITS.protectedApps,
    schedules: FREE_LIMITS.schedules,
  }),
});
