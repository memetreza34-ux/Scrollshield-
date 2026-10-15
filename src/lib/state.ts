import {
  AppConfig,
  AppState,
  DEFAULT_APP_CONFIG,
  DEFAULT_PROFILES,
  DEFAULT_STATE,
  Profile,
  Schedule,
  SUPPORTED_APPS,
} from '../types';
import { createEventId } from './appUtils';

type AppConfigPatch = Partial<Omit<AppConfig, 'reelsProtection' | 'emergencyUnlock' | 'timeWindows' | 'antiBinge'>> & {
  reelsProtection?: Partial<AppConfig['reelsProtection']>;
  emergencyUnlock?: Partial<AppConfig['emergencyUnlock']>;
  timeWindows?: Partial<AppConfig['timeWindows']>;
  antiBinge?: Partial<AppConfig['antiBinge']>;
};

export const normalizeAppConfig = (appId: string, config?: AppConfigPatch): AppConfig => ({
  ...DEFAULT_APP_CONFIG,
  ...config,
  id: appId,
  reelsProtection: {
    ...DEFAULT_APP_CONFIG.reelsProtection,
    ...config?.reelsProtection,
  },
  emergencyUnlock: {
    ...DEFAULT_APP_CONFIG.emergencyUnlock,
    ...config?.emergencyUnlock,
  },
  timeWindows: {
    ...DEFAULT_APP_CONFIG.timeWindows,
    ...config?.timeWindows,
  },
  antiBinge: {
    ...DEFAULT_APP_CONFIG.antiBinge,
    ...config?.antiBinge,
  },
});

export const normalizeAppsConfig = (appsConfig: Partial<AppState['appsConfig']> = {}) => {
  const normalized: Record<string, AppConfig> = {};

  // 1. Initialize all registered platforms
  SUPPORTED_APPS.forEach((app) => {
    normalized[app.id] = normalizeAppConfig(app.id, appsConfig[app.id]);
  });

  // 2. Preserve any user-created custom app configurations stored previously
  Object.keys(appsConfig).forEach((appId) => {
    if (!normalized[appId] && appsConfig[appId]) {
      normalized[appId] = normalizeAppConfig(appId, appsConfig[appId]);
    }
  });

  return normalized;
};

/**
 * The app configuration after switching to a profile. A profile brings its
 * rules; which apps are protected stays the user's choice. The built-in
 * profiles list every app as inactive, so taking their `active` flags over
 * switched the whole protection off without a word.
 */
export const applyProfileConfig = (
  profileAppsConfig: Partial<AppState['appsConfig']> | undefined,
  currentAppsConfig: AppState['appsConfig'],
): AppState['appsConfig'] => {
  const appIds = new Set([
    ...SUPPORTED_APPS.map((app) => app.id),
    ...Object.keys(currentAppsConfig),
    ...Object.keys(profileAppsConfig ?? {}),
  ]);

  const merged: AppState['appsConfig'] = {};
  appIds.forEach((appId) => {
    const current = currentAppsConfig[appId];
    const rules = profileAppsConfig?.[appId] ?? current;
    merged[appId] = normalizeAppConfig(appId, { ...rules, active: current?.active ?? false });
  });
  return merged;
};

const normalizeProfiles = (savedProfiles: Profile[] | undefined) => {
  const savedById = new Map(savedProfiles?.map((profile) => [profile.id, profile]) ?? []);
  const defaultIds = new Set(DEFAULT_PROFILES.map((profile) => profile.id));

  const defaultProfiles = DEFAULT_PROFILES.map((defaultProfile) => {
    const savedProfile = savedById.get(defaultProfile.id);
    return {
      ...defaultProfile,
      ...savedProfile,
      appsConfig: normalizeAppsConfig(savedProfile?.appsConfig ?? defaultProfile.appsConfig),
    };
  });

  const customProfiles =
    savedProfiles
      ?.filter((profile) => !defaultIds.has(profile.id))
      .map((profile) => ({
        ...profile,
        appsConfig: normalizeAppsConfig(profile.appsConfig),
      })) ?? [];

  return [...defaultProfiles, ...customProfiles];
};

export const normalizePrivacySettings = (
  savedPrivacy: Partial<AppState['settings']['privacy']> | null | undefined,
): AppState['settings']['privacy'] => {
  const privacy = {
    ...DEFAULT_STATE.settings.privacy,
    ...savedPrivacy,
    localOnly: true,
  };

  if (privacy.ageGroup !== '16_plus') {
    privacy.strictPrivacyMode = true;
  }

  return privacy;
};

/**
 * Session ends used to be stored as a second 'open' event, which made
 * anti-binge count every session twice. They are recognisable by their text.
 */
const LEGACY_SESSION_END_PREFIX = 'Sitzung beendet';

export const normalizeHistory = (history: AppState['history'] | undefined): AppState['history'] => {
  if (!Array.isArray(history)) return DEFAULT_STATE.history;
  return history.map((event) =>
    event.type === 'open' && event.desc?.startsWith(LEGACY_SESSION_END_PREFIX)
      ? { ...event, type: 'session_end' }
      : event,
  );
};

/**
 * The four fixed time windows became schedules. A window set to 'strict' or
 * 'block' locked the app in both cases, so each becomes one schedule for the
 * apps that had it switched on. Only run when no schedules were stored yet.
 */
const LEGACY_WINDOWS = [
  { key: 'morningRules', name: 'Morgen', startHour: 6, endHour: 9 },
  { key: 'workRules', name: 'Arbeitszeit', startHour: 9, endHour: 18 },
  { key: 'eveningRules', name: 'Abend', startHour: 18, endHour: 22 },
  { key: 'nightRules', name: 'Nacht', startHour: 22, endHour: 6 },
] as const;

export const migrateTimeWindowsToSchedules = (appsConfig: Partial<AppState['appsConfig']> = {}): Schedule[] =>
  LEGACY_WINDOWS.flatMap((window) => {
    const appIds = Object.values(appsConfig)
      .filter((config) => config?.active && config.timeWindows?.enabled && config.timeWindows[window.key] !== 'normal')
      .map((config) => config!.id);
    if (appIds.length === 0) return [];
    return [
      {
        id: createEventId(),
        name: window.name,
        startHour: window.startHour,
        endHour: window.endHour,
        appIds,
        active: true,
      },
    ];
  });

const OLD_START_SCREENS = new Set(['dashboard', 'apps', 'rules', 'history', 'reels_protection']);

export const normalizeAppState = (saved: Partial<AppState> | null | undefined): AppState => {
  if (!saved) return DEFAULT_STATE;

  return {
    ...DEFAULT_STATE,
    ...saved,
    history: normalizeHistory(saved.history),
    appsConfig: normalizeAppsConfig(saved.appsConfig),
    profiles: normalizeProfiles(saved.profiles),
    activeProfileId: saved.activeProfileId || DEFAULT_STATE.activeProfileId,
    schedules: Array.isArray(saved.schedules) ? saved.schedules : migrateTimeWindowsToSchedules(saved.appsConfig),
    selectedScheduleId: null,
    pro: { active: saved.pro?.active === true },
    commitment: saved.commitment && Number.isFinite(saved.commitment.until) ? saved.commitment : null,
    paywallReason: null,
    dismissedSuggestions:
      saved.dismissedSuggestions && typeof saved.dismissedSuggestions === 'object' ? saved.dismissedSuggestions : {},
    permissions: {
      ...DEFAULT_STATE.permissions,
      ...saved.permissions,
    },
    settings: {
      ...DEFAULT_STATE.settings,
      ...saved.settings,
      // Anything unknown follows the phone's language.
      language: (['system', 'de', 'en'] as const).find((language) => language === saved.settings?.language) ?? 'system',
      startScreen: OLD_START_SCREENS.has(saved.settings?.startScreen ?? '')
        ? DEFAULT_STATE.settings.startScreen
        : (saved.settings?.startScreen ?? DEFAULT_STATE.settings.startScreen),
      notifications: {
        ...DEFAULT_STATE.settings.notifications,
        ...saved.settings?.notifications,
      },
      privacy: normalizePrivacySettings(saved.settings?.privacy),
    },
    stats: {
      ...DEFAULT_STATE.stats,
      ...saved.stats,
    },
  };
};
