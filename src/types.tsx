import React from 'react';
import type { OperatingSystem } from './lib/platform';
import type { PresetId } from './lib/presets';
import { PlatformBadge } from './components/PlatformBadge';

export type Screen =
  | 'welcome'
  | 'onboarding'
  // Three persistent tabs; Focus is a full-screen action launched primarily from Heute.
  | 'today'
  | 'protect'
  | 'focus'
  | 'insights'
  // Reached from the tabs
  | 'app_detail'
  | 'schedule_edit'
  | 'commitment'
  | 'rescue'
  | 'paywall'
  | 'settings'
  | 'notifications'
  | 'help'
  | 'protection_flow'
  | 'permissions'
  | 'debug'
  | 'diagnostics'
  | 'active_session'
  | 'privacy'
  | 'support'
  | 'imprint';

export type SubscriptionPlanId = string;

export interface SubscriptionPlan {
  id: SubscriptionPlanId;
  name: string;
  description: string;
  features: string[];
  actionLabel: string;
  priceLabel?: string;
}

export interface AppPermissions {
  usageAccess: boolean;
  overlay: boolean;
  notifications: boolean;
  screenTime: boolean;
  ignoreBatteryOptimization: boolean;
  accessibility: boolean;
  backgroundActivity: boolean;
}

export interface AppConfig {
  id: string;
  /**
   * Legacy: set by a simulated "connect the app" animation that connected
   * nothing. No longer written or read; stored configurations may still carry it.
   */
  connected?: boolean;

  // 1. Allgemeiner App-Schutz
  active: boolean;
  /** Which preset the values below came from; 'eigene' once one was changed by hand. */
  preset?: PresetId;
  mode: 'soft' | 'standard' | 'strict';
  openDelay: number; // seconds
  dailyLimit: number; // minutes
  sessionLimit?: number; // minutes per session
  focusModeBehavior: 'allow' | 'warn' | 'block';

  // 2. Reels-/Shorts-Schutz
  reelsProtection: {
    enabled: boolean;
    mode: 'allow' | 'warn' | 'limit' | 'block';
    dailyLimitMinutes: number;
    sessionLimitMinutes: number;
    singleItemsAllowed?: number;
    autoStopAfterMinutes: number;
    stopAfterSwipes?: number;
    warnOnEndlessScroll: boolean;
    hardInterrupt: boolean;
  };

  // 4. Notfallfreigabe
  emergencyUnlock: {
    enabled: boolean;
    durationMinutes: number;
    requireCountdown: boolean;
    requireReason: boolean;
    maxPerDay: number;
  };

  // 5. Zeitfenster
  timeWindows: {
    /**
     * Opt-in switch. The rules below existed long before they were evaluated,
     * so stored configurations carry values (workRules: 'strict') that never
     * had an effect. Enabling them automatically would silently lock people
     * out of their apps on the next update.
     */
    enabled: boolean;
    morningRules: 'normal' | 'strict' | 'block';
    workRules: 'normal' | 'strict' | 'block';
    eveningRules: 'normal' | 'strict' | 'block';
    nightRules: 'normal' | 'strict' | 'block';
    weekendRules: 'normal' | 'strict' | 'block';
  };

  antiBinge: {
    enabled: boolean;
    warningThreshold: number; // opens
    warningTimeframe: number; // minutes
    blockThreshold: number; // opens
    blockTimeframe: number; // minutes
    /** Seconds the pause grows with every reopen inside warningTimeframe. */
    escalationSeconds?: number;
  };
  updatedAt?: number; // For future sync conflict resolution
}

export interface Profile {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  isCustom?: boolean;
  appsConfig: Record<string, AppConfig>;
  createdAt?: number;
}

export interface HistoryEvent {
  id: string;
  timestamp: number;
  type:
    | 'open'
    | 'session_end'
    | 'block'
    | 'focus'
    | 'focus_start'
    | 'focus_end'
    | 'emergency'
    | 'warning'
    | 'profile_change'
    | 'rule_change';
  appId?: string;
  desc: string;
  trigger?: string; // Rule or trigger that caused the event
  metadata?: Record<string, unknown>; // Additional info
}

export interface FocusSession {
  id: string;
  startTime: number;
  endTime: number | null;
  duration: number; // intended duration in minutes
  successful: boolean;
  protectedApps: string[]; // App IDs that were protected
  blocksTriggered: number;
  /** Rescue is an emergency brake: all protected apps, no early end. */
  kind?: 'focus' | 'rescue';
  /** Strict focus: cannot be ended early, no emergency unlock. */
  strict?: boolean;
}

/** A time range in which the chosen apps are locked, every day. */
export interface Schedule {
  id: string;
  name: string;
  /** Inclusive start hour, local time */
  startHour: number;
  /** Exclusive end hour; smaller than startHour for a range past midnight */
  endHour: number;
  appIds: string[];
  active: boolean;
}

export interface DailyStats {
  date: string; // YYYY-MM-DD
  usageMinutes: Record<string, number>; // appId -> minutes
  blockedOpens: number;
  /** @deprecated Legacy persisted field only. Never calculate or display estimated "saved time". */
  savedTimeMinutes: number;
  emergencyUnlocks: number;
  focusMinutes: number;
  /** Total screen time of the device that day, measured by Android; absent on web. */
  screenTimeMinutes?: number;
}

export interface AppState {
  hasCompletedOnboarding: boolean;
  appsConfig: Record<string, AppConfig>;
  activeProtectionLevel: 'soft' | 'standard' | 'strict';
  isFocusModeActive: boolean;
  focusTimeRemaining: number;
  goals: string[];
  selectedAppId: string | null;
  history: HistoryEvent[];
  focusSessions: FocusSession[];
  dailyStats: Record<string, DailyStats>;
  simulatedAppToOpen: string | null;
  activeSession: {
    appId: string;
    startTime: number;
    extensionCount: number;
    isPaused: boolean;
    pausedAt?: number;
    sessionLimitOverride?: number;
  } | null;
  stats: {
    currentStreak: number;
    bestStreak: number;
    /** @deprecated Legacy persisted field only; kept so old local state migrates without loss. */
    totalSavedTime: number;
    focusStreak: number;
    cleanDaysStreak: number;
  };
  profiles?: Profile[];
  activeProfileId?: string;
  schedules: Schedule[];
  selectedScheduleId: string | null;
  /**
   * Pro status. Until Google Play billing exists (roadmap phase 4) only the
   * development build can switch it on, as a preview.
   */
  pro: { active: boolean };
  /** Self-commitment: until this time, protection cannot be loosened. */
  commitment: { until: number } | null;
  /** The sentence the paywall opens with, set by whoever sent the user there. */
  paywallReason: string | null;
  /** Suggestions on Heute the user hid, by id, with the day they were hidden. */
  dismissedSuggestions: Record<string, string>;
  operatingSystem: OperatingSystem;
  permissions: AppPermissions;
  settings: {
    language: string;
    theme: 'dark' | 'light' | 'system';
    startScreen: Screen;
    internalAppName: string;
    defaultProtectionLevel: 'soft' | 'standard' | 'strict';
    defaultFocusDuration: number;
    defaultDelay: number;
    defaultEmergencyUnlock: number;
    focusPresets: number[];
    notifications: {
      focusReminders: boolean;
      eveningReminder: boolean;
      relapseWarning: boolean;
      dailySummary: boolean;
      weeklyReview: boolean;
    };
    privacy: {
      localOnly: boolean;
      ageGroup: 'unknown' | 'under_13' | '13_to_15' | '16_plus';
      strictPrivacyMode: boolean; // Enforced for minors, optional for adults
    };
  };
}

export type PlatformCategory =
  | 'social'
  | 'short_video'
  | 'news'
  | 'entertainment'
  | 'messaging'
  | 'productivity'
  | 'custom';

export interface PlatformSurfaceDefinition {
  id: string;
  name: string;
  description?: string;
  defaultMode: 'allow' | 'warn' | 'limit' | 'block';
  defaultDailyLimitMinutes: number;
}

export interface PlatformDefinition {
  id: string;
  name: string;
  category: PlatformCategory;
  icon: React.ReactNode;
  color: string;
  androidPackages: string[];
  iosBundleIds?: string[];
  hasShortVideoFeed: boolean;
  shortVideoSurface?: PlatformSurfaceDefinition;
  isCustom?: boolean;
  detectionKeywords?: string[];
}

/** A built-in platform as written below; `badge` holds the initials for its tile. */
type BuiltinPlatform = Omit<PlatformDefinition, 'icon'> & { badge: string };

/** Adds the tile icon: the installed app's launcher icon on Android, else the initials. */
const withIcon = ({ badge, ...platform }: BuiltinPlatform): PlatformDefinition => ({
  ...platform,
  icon: <PlatformBadge label={badge} packages={platform.androidPackages} />,
});

export const BUILTIN_PLATFORMS: PlatformDefinition[] = (
  [
    {
      id: 'instagram',
      name: 'Instagram',
      category: 'social',
      badge: 'IG',
      color: 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white shadow-lg',
      androidPackages: ['com.instagram.android', 'com.instagram.lite'],
      iosBundleIds: ['com.burbn.instagram'],
      hasShortVideoFeed: true,
      shortVideoSurface: { id: 'reels', name: 'Instagram Reels', defaultMode: 'limit', defaultDailyLimitMinutes: 15 },
      detectionKeywords: ['instagram.com', 'reels'],
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      category: 'short_video',
      badge: 'TT',
      color: 'bg-black text-white border border-zinc-800 shadow-md',
      androidPackages: ['com.zhiliaoapp.musically', 'com.ss.android.ugc.trill', 'com.zhiliaoapp.musically.go'],
      iosBundleIds: ['com.zhiliaoapp.musically'],
      hasShortVideoFeed: true,
      shortVideoSurface: { id: 'tiktok_feed', name: 'TikTok Feed', defaultMode: 'limit', defaultDailyLimitMinutes: 15 },
      detectionKeywords: ['tiktok.com'],
    },
    {
      id: 'youtube',
      name: 'YouTube',
      category: 'entertainment',
      badge: 'YT',
      color: 'bg-[#FF0000] text-white shadow-md',
      androidPackages: ['com.google.android.youtube', 'com.google.android.apps.youtube.mango'],
      iosBundleIds: ['com.google.ios.youtube'],
      hasShortVideoFeed: true,
      shortVideoSurface: { id: 'shorts', name: 'YouTube Shorts', defaultMode: 'limit', defaultDailyLimitMinutes: 15 },
      detectionKeywords: ['youtube.com/shorts', 'shorts'],
    },
    {
      id: 'facebook',
      name: 'Facebook',
      category: 'social',
      badge: 'FB',
      color: 'bg-[#1877F2] text-white shadow-md',
      androidPackages: ['com.facebook.katana', 'com.facebook.lite'],
      iosBundleIds: ['com.facebook.Facebook'],
      hasShortVideoFeed: true,
      shortVideoSurface: {
        id: 'facebook_reels',
        name: 'Facebook Reels',
        defaultMode: 'limit',
        defaultDailyLimitMinutes: 15,
      },
      detectionKeywords: ['facebook.com/reel'],
    },
    {
      id: 'twitter',
      name: 'X',
      category: 'social',
      badge: 'X',
      color: 'bg-black text-white border border-zinc-800 shadow-md',
      androidPackages: ['com.twitter.android', 'com.twitter.android.lite'],
      iosBundleIds: ['com.atebits.Tweetie2'],
      hasShortVideoFeed: true,
      shortVideoSurface: {
        id: 'immersive_video',
        name: 'Immersive Video',
        defaultMode: 'limit',
        defaultDailyLimitMinutes: 15,
      },
      detectionKeywords: ['x.com', 'twitter.com'],
    },
    {
      id: 'snapchat',
      name: 'Snapchat',
      category: 'social',
      badge: 'SC',
      color: 'bg-[#FFFC00] text-black shadow-md',
      androidPackages: ['com.snapchat.android'],
      iosBundleIds: ['com.toyopagroup.picaboo'],
      hasShortVideoFeed: true,
      shortVideoSurface: {
        id: 'spotlight',
        name: 'Snapchat Spotlight',
        defaultMode: 'limit',
        defaultDailyLimitMinutes: 15,
      },
      detectionKeywords: ['snapchat.com', 'spotlight'],
    },
    {
      id: 'reddit',
      name: 'Reddit',
      category: 'social',
      badge: 'R',
      color: 'bg-[#FF4500] text-white shadow-md',
      androidPackages: ['com.reddit.frontpage', 'com.reddit.frontpage.lite'],
      iosBundleIds: ['com.reddit.Reddit'],
      hasShortVideoFeed: true,
      shortVideoSurface: {
        id: 'reddit_watch',
        name: 'Reddit Video Feed',
        defaultMode: 'limit',
        defaultDailyLimitMinutes: 15,
      },
      detectionKeywords: ['reddit.com', 'v.redd.it'],
    },
    {
      id: 'pinterest',
      name: 'Pinterest',
      category: 'social',
      badge: 'P',
      color: 'bg-[#E60023] text-white shadow-md',
      androidPackages: ['com.pinterest'],
      iosBundleIds: ['pinterest'],
      hasShortVideoFeed: true,
      shortVideoSurface: { id: 'watch', name: 'Pinterest Watch', defaultMode: 'limit', defaultDailyLimitMinutes: 15 },
      detectionKeywords: ['pinterest.com/watch'],
    },
  ] satisfies BuiltinPlatform[]
).map(withIcon);

export const SUPPORTED_APPS = BUILTIN_PLATFORMS;

// The values of the "Ausgewogen" preset (src/lib/presets.ts), the default.
export const DEFAULT_APP_CONFIG: Omit<AppConfig, 'id'> = {
  active: false,
  preset: 'ausgewogen',
  mode: 'standard',
  openDelay: 5,
  dailyLimit: 0,
  sessionLimit: 0,
  focusModeBehavior: 'warn',
  reelsProtection: {
    enabled: true,
    mode: 'limit',
    dailyLimitMinutes: 15,
    sessionLimitMinutes: 5,
    singleItemsAllowed: 3,
    autoStopAfterMinutes: 5,
    stopAfterSwipes: 10,
    warnOnEndlessScroll: true,
    hardInterrupt: true,
  },
  emergencyUnlock: {
    enabled: true,
    durationMinutes: 5,
    requireCountdown: true,
    requireReason: true,
    maxPerDay: 2,
  },
  timeWindows: {
    enabled: false,
    morningRules: 'normal',
    workRules: 'strict',
    eveningRules: 'normal',
    nightRules: 'block',
    weekendRules: 'normal',
  },
  antiBinge: {
    enabled: true,
    warningThreshold: 1,
    warningTimeframe: 10,
    blockThreshold: 99,
    blockTimeframe: 30,
    escalationSeconds: 10,
  },
};

type AppConfigOverrides = Partial<
  Omit<AppConfig, 'id' | 'reelsProtection' | 'emergencyUnlock' | 'timeWindows' | 'antiBinge'>
> & {
  reelsProtection?: Partial<AppConfig['reelsProtection']>;
  emergencyUnlock?: Partial<AppConfig['emergencyUnlock']>;
  timeWindows?: Partial<AppConfig['timeWindows']>;
  antiBinge?: Partial<AppConfig['antiBinge']>;
};

const createAppsConfig = (overrides: AppConfigOverrides): Record<string, AppConfig> => {
  const config: Record<string, AppConfig> = {};
  SUPPORTED_APPS.forEach((app) => {
    config[app.id] = {
      ...DEFAULT_APP_CONFIG,
      id: app.id,
      ...overrides,
      reelsProtection: {
        ...DEFAULT_APP_CONFIG.reelsProtection,
        ...overrides.reelsProtection,
      },
      emergencyUnlock: {
        ...DEFAULT_APP_CONFIG.emergencyUnlock,
        ...overrides.emergencyUnlock,
      },
      timeWindows: {
        ...DEFAULT_APP_CONFIG.timeWindows,
        ...overrides.timeWindows,
      },
      antiBinge: {
        ...DEFAULT_APP_CONFIG.antiBinge,
        ...overrides.antiBinge,
      },
    };
  });
  return config;
};

export const DEFAULT_PROFILES: Profile[] = [
  {
    id: 'gentle',
    name: 'Sanft',
    description: 'Kurze Öffnungsverzögerung, moderates Tageslimit. Kurzvideos: Warnung nach 15 Min.',
    icon: 'Coffee',
    color: 'text-emerald-400',
    appsConfig: createAppsConfig({
      mode: 'soft',
      openDelay: 5,
      dailyLimit: 90,
      sessionLimit: 30,
      reelsProtection: {
        enabled: true,
        mode: 'warn',
        dailyLimitMinutes: 30,
        sessionLimitMinutes: 15,
      },
    }),
  },
  {
    id: 'balance',
    name: 'Balance',
    description: 'Dein Alltag in Balance. Normale App-Nutzung erlaubt, Kurzvideos auf 15 Min/Tag limitiert.',
    icon: 'Briefcase',
    color: 'text-blue-400',
    appsConfig: createAppsConfig({
      mode: 'standard',
      openDelay: 15,
      dailyLimit: 45,
      sessionLimit: 15,
      reelsProtection: {
        enabled: true,
        mode: 'limit',
        dailyLimitMinutes: 15,
        sessionLimitMinutes: 5,
      },
    }),
  },
  {
    id: 'strict',
    name: 'Streng',
    // mode 'strict' locks the app itself; only changing the rule opens it again.
    description: 'Geschützte Apps bleiben gesperrt, ohne Notfallfreigabe. Kurzvideo-Feeds werden blockiert.',
    icon: 'Shield',
    color: 'text-indigo-400',
    appsConfig: createAppsConfig({
      mode: 'strict',
      openDelay: 30,
      dailyLimit: 20,
      sessionLimit: 5,
      emergencyUnlock: {
        enabled: false,
        durationMinutes: 5,
        maxPerDay: 2,
        requireCountdown: true,
        requireReason: true,
      },
      reelsProtection: {
        enabled: true,
        mode: 'block',
        dailyLimitMinutes: 5,
        sessionLimitMinutes: 1,
        singleItemsAllowed: 0,
      },
    }),
  },
  {
    id: 'noscroll',
    name: 'Kein Endlos-Swipe',
    description: 'Fokus auf normale Nutzung. Endlos-Feeds erhalten die strengste verfügbare Unterbrechung.',
    icon: 'Target',
    color: 'text-red-500',
    // The apps stay usable after a short pause; only the feeds are locked. It
    // used to be 'strict', which locked the whole app.
    appsConfig: createAppsConfig({
      mode: 'standard',
      openDelay: 10,
      dailyLimit: 45,
      sessionLimit: 10,
      reelsProtection: {
        enabled: true,
        mode: 'block',
        dailyLimitMinutes: 0,
        sessionLimitMinutes: 0,
        singleItemsAllowed: 3,
        stopAfterSwipes: 1,
      },
    }),
  },
];

export const DEFAULT_STATE: AppState = {
  hasCompletedOnboarding: false,
  appsConfig: {},
  activeProtectionLevel: 'standard',
  isFocusModeActive: false,
  focusTimeRemaining: 0,
  goals: [],
  selectedAppId: null,
  history: [],
  focusSessions: [],
  dailyStats: {},
  simulatedAppToOpen: null,
  activeSession: null,
  stats: {
    currentStreak: 0,
    bestStreak: 0,
    totalSavedTime: 0,
    focusStreak: 0,
    cleanDaysStreak: 0,
  },
  profiles: DEFAULT_PROFILES,
  activeProfileId: 'gentle',
  schedules: [],
  selectedScheduleId: null,
  pro: { active: false },
  commitment: null,
  paywallReason: null,
  dismissedSuggestions: {},
  // Replaced at startup by detectOperatingSystem(); 'web' is the honest
  // default because a browser has neither Screen Time nor Usage Access.
  operatingSystem: 'web',
  permissions: {
    usageAccess: false,
    overlay: false,
    notifications: false,
    screenTime: false,
    ignoreBatteryOptimization: false,
    accessibility: false,
    backgroundActivity: false,
  },
  settings: {
    language: 'de',
    theme: 'dark',
    startScreen: 'today',
    internalAppName: 'ScrollShield',
    defaultProtectionLevel: 'standard',
    defaultFocusDuration: 25,
    defaultDelay: 5,
    defaultEmergencyUnlock: 5,
    focusPresets: [15, 30, 45, 60],
    notifications: {
      focusReminders: true,
      eveningReminder: true,
      relapseWarning: true,
      dailySummary: false,
      weeklyReview: true,
    },
    privacy: {
      localOnly: true,
      ageGroup: 'unknown',
      strictPrivacyMode: true, // Default to strict for safety
    },
  },
};
