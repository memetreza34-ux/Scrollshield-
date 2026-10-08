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
  | 'strict_focus';

/** The paywall's first sentence for each feature. */
export const PRO_REASONS: Record<ProFeature, string> = {
  third_app: `In der kostenlosen Version schützt ScrollShield ${FREE_LIMITS.protectedApps} Apps. Für weitere brauchst du Pro.`,
  preset_stark: 'Die Voreinstellung „Stark“ gehört zu Pro.',
  preset_eigene: 'Eigene Regeln gehören zu Pro.',
  session_guard: 'Der Sitzungs-Wächter gehört zu Pro.',
  daily_budget: 'Das Tagesbudget gehört zu Pro.',
  second_schedule: `In der kostenlosen Version gibt es ${FREE_LIMITS.schedules} Zeitplan. Für weitere brauchst du Pro.`,
  rescue: 'Rescue gehört zu Pro.',
  commitment: 'Die Selbstverpflichtung gehört zu Pro.',
  insights_week: 'Wochenansicht und Trends gehören zu Pro.',
  custom_focus: 'Eine eigene Fokus-Dauer gehört zu Pro.',
  strict_focus: 'Strenger Fokus gehört zu Pro.',
};

export const PRO_BENEFITS = [
  'Unbegrenzt viele Apps schützen',
  'Voreinstellung „Stark“ und eigene Regeln',
  'Sitzungs-Wächter und Tagesbudget',
  'Unbegrenzt viele Zeitpläne',
  'Rescue und Selbstverpflichtung',
  'Eigene Fokus-Dauer und strenger Fokus',
  'Woche, Wiederöffnungs-Muster und App-Trends',
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
  paywallReason: PRO_REASONS[feature],
});
