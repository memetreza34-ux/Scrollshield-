import {
  AppConfig,
  AppState,
  DEFAULT_APP_CONFIG,
  DEFAULT_PROFILES,
  DEFAULT_STATE,
  Profile,
  SUPPORTED_APPS,
} from '../types';

type AppConfigPatch = Partial<
  Omit<AppConfig, 'reelsProtection' | 'singleContent' | 'emergencyUnlock' | 'timeWindows' | 'antiBinge'>
> & {
  reelsProtection?: Partial<AppConfig['reelsProtection']>;
  singleContent?: Partial<AppConfig['singleContent']>;
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
  singleContent: {
    ...DEFAULT_APP_CONFIG.singleContent,
    ...config?.singleContent,
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

export const normalizeAppState = (saved: Partial<AppState> | null | undefined): AppState => {
  if (!saved) return DEFAULT_STATE;

  const savedSchedules = Array.isArray(saved.focusSchedules) ? saved.focusSchedules : [];
  const focusSchedules = DEFAULT_STATE.focusSchedules.map((defaultSchedule) => {
    const savedSchedule = savedSchedules.find((schedule) => schedule?.id === defaultSchedule.id);
    const validTime = (value: unknown) => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
    const days = Array.isArray(savedSchedule?.days)
      ? [...new Set(savedSchedule.days.filter((day): day is number => Number.isInteger(day) && day >= 0 && day <= 6))]
      : defaultSchedule.days;
    const validStart = validTime(savedSchedule?.startTime);
    const validEnd = validTime(savedSchedule?.endTime);
    const startTime = validStart ? savedSchedule.startTime : defaultSchedule.startTime;
    const endTime = validEnd ? savedSchedule.endTime : defaultSchedule.endTime;
    return {
      ...defaultSchedule,
      days,
      startTime,
      endTime,
      active: savedSchedule?.active === true && validStart && validEnd && days.length > 0 && startTime !== endTime,
      lastStartedOn: typeof savedSchedule?.lastStartedOn === 'string' ? savedSchedule.lastStartedOn : undefined,
    };
  });
  const focusSessions = Array.isArray(saved.focusSessions) ? saved.focusSessions : DEFAULT_STATE.focusSessions;
  const pendingFocusResultId =
    typeof saved.pendingFocusResultId === 'string' &&
    focusSessions.some((session) => session.id === saved.pendingFocusResultId && session.endTime !== null)
      ? saved.pendingFocusResultId
      : null;

  return {
    ...DEFAULT_STATE,
    ...saved,
    focusSchedules,
    focusSessions,
    pendingFocusResultId,
    appsConfig: normalizeAppsConfig(saved.appsConfig),
    profiles: normalizeProfiles(saved.profiles),
    activeProfileId: saved.activeProfileId || DEFAULT_STATE.activeProfileId,
    permissions: {
      ...DEFAULT_STATE.permissions,
      ...saved.permissions,
    },
    settings: {
      ...DEFAULT_STATE.settings,
      ...saved.settings,
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
