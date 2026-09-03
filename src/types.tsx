import React from 'react';

export type Screen =
  | 'welcome'
  | 'onboarding'
  | 'dashboard'
  | 'apps'
  | 'app_detail'
  | 'rules'
  | 'focus'
  | 'history'
  | 'settings'
  | 'help'
  | 'protection_flow'
  | 'permissions'
  | 'debug'
  | 'diagnostics'
  | 'active_session'
  | 'privacy'
  | 'support'
  | 'reels_protection'
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
  // 0. System-Integration
  connected?: boolean; // whether the app's native accessibility hook is established

  // 1. Allgemeiner App-Schutz
  active: boolean;
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
}

export interface DailyStats {
  date: string; // YYYY-MM-DD
  usageMinutes: Record<string, number>; // appId -> minutes
  blockedOpens: number;
  savedTimeMinutes: number;
  emergencyUnlocks: number;
  focusMinutes: number;
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
    totalSavedTime: number; // in minutes
    focusStreak: number;
    cleanDaysStreak: number;
  };
  profiles?: Profile[];
  activeProfileId?: string;
  operatingSystem: 'ios' | 'android';
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

export const BUILTIN_PLATFORMS: PlatformDefinition[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    category: 'social',
    icon: (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
        <path d="M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077" />
      </svg>
    ),
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
    icon: (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
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
    icon: (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
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
    icon: (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
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
    icon: (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
        <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
      </svg>
    ),
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
    icon: (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
        <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.54 0-.958.089-1.272.149-.211.043-.391.074-.54.074-.374 0-.523-.224-.583-.42-.061-.192-.09-.389-.135-.567-.046-.181-.105-.494-.166-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.15-.055-.225-.015-.243.165-.465.42-.509 3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.658-1.332-.809-.121-.029-.24-.074-.346-.119-1.107-.435-1.257-.93-1.197-1.273.09-.479.674-.793 1.168-.793.146 0 .27.029.383.074.42.194.789.3 1.104.3.234 0 .384-.06.465-.105l-.046-.569c-.098-1.626-.225-3.651.307-4.837C7.392 1.077 10.739.807 11.727.807l.419-.015h.06z" />
      </svg>
    ),
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
    icon: (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .883.175 1.19.46 1.204-.863 2.878-1.432 4.722-1.503l.872-4.088a.22.22 0 0 1 .267-.17l3.056.643a1.248 1.248 0 0 1 1.121-.844zm-5.006 12.337c-1.854 0-3.351-.832-3.351-.832a.22.22 0 0 1 .306-.316s1.393.743 3.045.743c1.652 0 3.045-.743 3.045-.743a.22.22 0 1 1 .306.316s-1.497.832-3.351.832zm-2.416-2.502a1.353 1.353 0 1 1 0-2.705 1.353 1.353 0 0 1 0 2.705zm4.832 0a1.353 1.353 0 1 1 0-2.705 1.353 1.353 0 0 1 0 2.705z" />
      </svg>
    ),
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
    icon: (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
        <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.951-7.252 4.195 0 7.458 2.99 7.458 6.98 0 4.172-2.632 7.531-6.284 7.531-1.226 0-2.381-.637-2.775-1.39l-.754 2.875c-.274 1.042-1.018 2.345-1.518 3.14 1.157.355 2.382.546 3.655.546 6.621 0 11.988-5.367 11.988-11.988C24.004 5.367 18.638 0 12.017 0z" />
      </svg>
    ),
    color: 'bg-[#E60023] text-white shadow-md',
    androidPackages: ['com.pinterest'],
    iosBundleIds: ['pinterest'],
    hasShortVideoFeed: true,
    shortVideoSurface: { id: 'watch', name: 'Pinterest Watch', defaultMode: 'limit', defaultDailyLimitMinutes: 15 },
    detectionKeywords: ['pinterest.com/watch'],
  },
];

export const SUPPORTED_APPS = BUILTIN_PLATFORMS;

export const DEFAULT_APP_CONFIG: Omit<AppConfig, 'id'> = {
  connected: false,
  active: false,
  mode: 'standard',
  openDelay: 5,
  dailyLimit: 60,
  sessionLimit: 15,
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
    warningThreshold: 3,
    warningTimeframe: 10,
    blockThreshold: 5,
    blockTimeframe: 20,
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
    description:
      'Sehr strenge Limits. Kurzvideos werden mit den verfügbaren Systemfunktionen auf max. 5 Min/Tag begrenzt.',
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
    appsConfig: createAppsConfig({
      mode: 'strict',
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
  operatingSystem: 'ios', // Defaulting to iOS for demonstration of fallbacks
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
    startScreen: 'dashboard',
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
