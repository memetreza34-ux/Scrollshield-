import type { AppConfig, Profile } from '../types';
import { DEFAULT_APP_CONFIG } from '../types';
import { normalizeProtectionConfig } from './protectionConfig';

export interface ReleaseProfilePresentation {
  name: string;
  description: string;
}

const NORMAL_TIME_WINDOWS: AppConfig['timeWindows'] = {
  morningRules: 'normal',
  workRules: 'normal',
  eveningRules: 'normal',
  nightRules: 'normal',
  weekendRules: 'normal',
};

const DEFAULT_PRESENTATION: Record<string, ReleaseProfilePresentation> = {
  gentle: {
    name: 'Sanft',
    description:
      '5 Sekunden bewusste Pause, 90 Minuten Tageslimit und 30 Minuten pro freigegebener Sitzung. Kein Wochenplan und Anti-Binge zunächst aus.',
  },
  balance: {
    name: 'Balance',
    description:
      '15 Sekunden Grundpause, 45 Minuten Tageslimit, 15-Minuten-Sitzungen und adaptive Anti-Binge-Reibung bei häufigem Wiederöffnen. Kein Wochenplan.',
  },
  strict: {
    name: 'Streng',
    description:
      'Die geschützte App ist grundsätzlich strikt gesperrt. Das Preset enthält standardmäßig keinen Notfallzugang.',
  },
  noscroll: {
    name: 'Konsequent',
    description:
      'Strikte Ganz-App-Sperre mit begrenztem Notfallweg, Countdown und Begründung statt einer normalen Freigabe.',
  },
};

const sameTimeWindows = (left: AppConfig['timeWindows'], right: AppConfig['timeWindows']) =>
  left.morningRules === right.morningRules &&
  left.workRules === right.workRules &&
  left.eveningRules === right.eveningRules &&
  left.nightRules === right.nightRules &&
  left.weekendRules === right.weekendRules;

const sameAntiBinge = (left: AppConfig['antiBinge'], right: AppConfig['antiBinge']) =>
  left.enabled === right.enabled &&
  left.warningThreshold === right.warningThreshold &&
  left.warningTimeframe === right.warningTimeframe &&
  left.blockThreshold === right.blockThreshold &&
  left.blockTimeframe === right.blockTimeframe;

const sameEmergency = (left: AppConfig['emergencyUnlock'], right: AppConfig['emergencyUnlock']) =>
  left.enabled === right.enabled &&
  left.durationMinutes === right.durationMinutes &&
  left.requireCountdown === right.requireCountdown &&
  left.requireReason === right.requireReason &&
  left.maxPerDay === right.maxPerDay;

export const getReleaseProfilePresentation = (profile: Profile): ReleaseProfilePresentation =>
  DEFAULT_PRESENTATION[profile.id] ?? {
    name: profile.name,
    description: profile.description,
  };

export const getReleaseSafeProfileConfig = (config: AppConfig): AppConfig =>
  normalizeProtectionConfig({
    ...config,
    reelsProtection: {
      ...config.reelsProtection,
      enabled: false,
      mode: 'allow',
      warnOnEndlessScroll: false,
      hardInterrupt: false,
    },
    singleContent: {
      ...config.singleContent,
      allowSharedLinks: false,
      allowOnlyOne: false,
    },
  });

/** Neutral configuration for a newly activated app in the release UI. */
export const createReleaseDefaultAppConfig = (appId: string, active = false): AppConfig =>
  getReleaseSafeProfileConfig({
    id: appId,
    ...DEFAULT_APP_CONFIG,
    active,
    mode: 'standard',
    timeWindows: { ...NORMAL_TIME_WINDOWS },
    antiBinge: {
      ...DEFAULT_APP_CONFIG.antiBinge,
      enabled: false,
    },
  });

/**
 * The old demo state eagerly created this exact inactive configuration for every
 * supported app. Only this untouched shape is safe to replace automatically.
 */
export const isLegacyUntouchedDefaultConfig = (config: AppConfig): boolean =>
  !config.active &&
  config.updatedAt === undefined &&
  config.mode === DEFAULT_APP_CONFIG.mode &&
  config.openDelay === DEFAULT_APP_CONFIG.openDelay &&
  config.dailyLimit === DEFAULT_APP_CONFIG.dailyLimit &&
  (config.sessionLimit ?? DEFAULT_APP_CONFIG.sessionLimit) === DEFAULT_APP_CONFIG.sessionLimit &&
  config.blockHours === DEFAULT_APP_CONFIG.blockHours &&
  config.focusModeBehavior === DEFAULT_APP_CONFIG.focusModeBehavior &&
  sameTimeWindows(config.timeWindows, DEFAULT_APP_CONFIG.timeWindows) &&
  sameAntiBinge(config.antiBinge, DEFAULT_APP_CONFIG.antiBinge) &&
  sameEmergency(config.emergencyUnlock, DEFAULT_APP_CONFIG.emergencyUnlock);

/**
 * Built-in profiles created by the old demo inherited hidden weekly rules. For
 * an untouched built-in preset, translate it into explicit release semantics.
 * Once a config has an updatedAt marker, its user-edited rules are preserved.
 */
export const getReleaseProfileConfig = (profileId: string, config: AppConfig): AppConfig => {
  const safe = getReleaseSafeProfileConfig(config);
  if (safe.updatedAt !== undefined) return safe;

  switch (profileId) {
    case 'gentle':
      return normalizeProtectionConfig({
        ...safe,
        mode: 'standard',
        openDelay: 5,
        dailyLimit: 90,
        sessionLimit: 30,
        timeWindows: { ...NORMAL_TIME_WINDOWS },
        antiBinge: { ...safe.antiBinge, enabled: false },
      });
    case 'balance':
      return normalizeProtectionConfig({
        ...safe,
        mode: 'standard',
        openDelay: 15,
        dailyLimit: 45,
        sessionLimit: 15,
        timeWindows: { ...NORMAL_TIME_WINDOWS },
        antiBinge: {
          ...safe.antiBinge,
          enabled: true,
          warningThreshold: 3,
          warningTimeframe: 10,
          blockThreshold: 5,
          blockTimeframe: 20,
        },
      });
    case 'strict':
      return normalizeProtectionConfig({
        ...safe,
        mode: 'strict',
        openDelay: 30,
        dailyLimit: 20,
        sessionLimit: 5,
        timeWindows: { ...NORMAL_TIME_WINDOWS },
        antiBinge: { ...safe.antiBinge, enabled: false },
        emergencyUnlock: { ...safe.emergencyUnlock, enabled: false },
      });
    case 'noscroll':
      return normalizeProtectionConfig({
        ...safe,
        mode: 'strict',
        openDelay: 10,
        dailyLimit: 45,
        sessionLimit: 10,
        timeWindows: { ...NORMAL_TIME_WINDOWS },
        antiBinge: { ...safe.antiBinge, enabled: false },
        emergencyUnlock: {
          ...safe.emergencyUnlock,
          enabled: true,
          requireCountdown: true,
          requireReason: true,
          maxPerDay: Math.max(1, safe.emergencyUnlock.maxPerDay),
        },
      });
    default:
      return safe;
  }
};

export const summarizeReleaseProfile = (profile: Profile) => {
  const configs = Object.values(profile.appsConfig).map((config) => getReleaseProfileConfig(profile.id, config));
  const protectedApps = configs.filter((config) => config.active).length;
  const strictApps = configs.filter((config) => config.active && config.mode === 'strict').length;
  return { protectedApps, strictApps };
};
