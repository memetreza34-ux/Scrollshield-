import type { AppConfig, AppState, Schedule } from '../types';
import { applyPreset, getPresetId } from './presets';

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

/**
 * Until Google Play Billing and purchase verification are integrated, Pro is
 * available ONLY as a development preview. A saved, imported or edited local
 * `pro.active` flag is never proof of payment in a production build.
 */
export const hasPro = (state: Pick<AppState, 'pro'>): boolean =>
  !import.meta.env.PROD && state.pro?.active === true;

/**
 * The last trusted UI-to-native boundary while Billing remains disabled.
 *
 * Imported backups can contain more than two active apps or Pro-only rules.
 * Never let those stored settings silently become native paid protection.
 * Presets and schedules are reduced only for native enforcement; we preserve
 * the user's configuration so it can be restored after verified purchase.
 */
export function getEntitledNativeProtection(
  state: Pick<AppState, 'appsConfig' | 'schedules' | 'pro'>,
): { appsConfig: Record<string, AppConfig>; schedules: Schedule[] } {
  if (hasPro(state)) return { appsConfig: state.appsConfig, schedules: state.schedules };

  const allowed = new Set(
    Object.entries(state.appsConfig)
      .filter(([, config]) => config.active)
      .slice(0, FREE_LIMITS.protectedApps)
      .map(([appId]) => appId),
  );

  const appsConfig: Record<string, AppConfig> = {};
  for (const [appId, config] of Object.entries(state.appsConfig)) {
    const active = config.active && allowed.has(appId);
    if (!active) {
      appsConfig[appId] = { ...config, active: false };
      continue;
    }
    const freePreset = getPresetId(config) === 'sanft' ? 'sanft' : 'ausgewogen';
    appsConfig[appId] = applyPreset({ ...config, active: true }, freePreset);
  }

  const schedules = state.schedules
    .filter((schedule) => schedule.active)
    .slice(0, FREE_LIMITS.schedules)
    .map((schedule) => ({
      ...schedule,
      appIds: schedule.appIds.filter((appId) => allowed.has(appId)),
    }));

  return { appsConfig, schedules };
}

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
