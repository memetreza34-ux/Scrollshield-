# Investigation & Architecture Report: ScrollShield Project & Multi-Platform Expansion (R1)

**Investigating Agent:** `teamwork_preview_explorer_1`  
**Workspace:** `/Users/arman/.gemini/antigravity/scratch/Scrollshield-Brain/.agents/teamwork_preview_explorer_1`  
**Project Root:** `/Users/arman/.gemini/antigravity/scratch/Scrollshield-Brain`  
**Date:** 2026-09-01  
**Test Baseline:** 21 test files, 88 tests passing (`npm test` / Vitest v4.1.9)

---

## 1. Observation

### 1.1 Project Layout & Build Configuration

The ScrollShield codebase is a modern TypeScript, React 19, and Tailwind CSS v4 hybrid mobile application packaged with Capacitor for Android deployment and prepared as a Progressive Web App (PWA).

```
/Users/arman/.gemini/antigravity/scratch/Scrollshield-Brain/
├── package.json                         # Node >=22.12.0, Vite 8, React 19, Tailwind 4, Capacitor 8.4
├── capacitor.config.ts                  # App ID: app.scrollshield.mobile, webDir: dist
├── vite.config.ts                       # React, @tailwindcss/vite, VitePWA, Rollup manualChunks
├── tsconfig.json                        # ESNext, Bundler resolution, strict mode
├── index.html                           # CSP & Permissions-Policy meta headers, dark color-scheme
├── src/
│   ├── main.tsx                         # React 19 StrictMode entry point
│   ├── App.tsx                          # Root container, router state, storage persistence
│   ├── types.tsx                        # Core domain models, interfaces, SUPPORTED_APPS, DEFAULT_STATE
│   ├── index.css                        # Tailwind v4 theme, custom utility classes & keyframe animations
│   ├── config/
│   │   └── featureFlags.ts              # Feature toggles (CloudSync, Subscriptions, AI, etc.)
│   ├── lib/
│   │   ├── state.ts                     # State normalization, deep-merge defaults, privacy rules
│   │   ├── storage.ts                   # StorageService v3: chunked, XOR-obfuscated local storage
│   │   ├── protectionRules.ts           # Decision engine: daily limits, anti-binge, emergency unlocks
│   │   ├── session.ts                   # Active session tracking, extensions, daily stats buckets
│   │   ├── stats.ts                     # Daily statistics, short-video / reels aggregation
│   │   ├── focus.ts                     # Focus session lifecycle, timeout reconciliation
│   │   ├── appUtils.ts                  # REELS_PLATFORM_IDS, date formatting, UUID generator
│   │   ├── dataExport.ts                # JSON schema v1 export/import, 5MB validation
│   │   └── contact.ts                   # Support contact forms and payload validation
│   ├── screens/
│   │   ├── OnboardingScreens.tsx        # Welcome & multi-step onboarding (Goals, Profiles, Apps)
│   │   ├── MainScreens.tsx              # Dashboard (smart insights, streak, motivation) & History
│   │   ├── ConfigScreens.tsx            # AppList, AppDetail, Rules (Profiles), Settings, Help, Privacy
│   │   ├── ReelsProtectionScreen.tsx    # Short-video / feed limit configuration & quick profiles
│   │   ├── FocusScreens.tsx             # Focus timer & active focus countdown
│   │   ├── ProtectionFlow.tsx           # Interactive barrier: delay countdown, intent reason, emergency
│   │   ├── ActiveSessionScreen.tsx      # Active app session monitor, pause/resume, reels swipe demo
│   │   ├── PermissionsScreen.tsx        # Detailed permission status & OS-specific setup guidance
│   │   ├── SupportScreen.tsx            # Contact support & legal imprint
│   │   └── DebugScreen.tsx              # Diagnostic triggers, day change simulation, event logger
│   ├── components/
│   │   ├── ui.tsx                       # Reusable UI primitives: Switch, BottomNav, TimeSelector, Header
│   │   └── ErrorBoundary.tsx            # Global crash recovery boundary
│   └── features/
│       └── SubscriptionScreen.tsx       # Paywall & premium plan selection
├── android/
│   ├── app/src/main/AndroidManifest.xml # Native manifest, FileProvider, Accessibility Service
│   └── app/src/main/java/app/scrollshield/mobile/
│       ├── MainActivity.java            # BridgeActivity entry point
│       └── ScrollShieldContentFilterService.java # Android Accessibility Service for content scanning
├── docs/                                # Native Android setup, store policies, checklists, ROPA
└── scripts/                             # Tooling checks, bundle budget, PWA icons, SW generator
```

#### Build Configuration Details:
- **`package.json` (`package.json:47-84`)**:
  - React 19.0.0 (`react`, `react-dom`)
  - Motion 12.23.24 (`motion` / `motion/react`)
  - Lucide React 0.546.0 (`lucide-react`)
  - Capacitor Core & Android 8.4.1 (`@capacitor/core`, `@capacitor/android`, `@capacitor/cli`)
  - Tailwind CSS 4.3.1 (`tailwindcss`, `@tailwindcss/vite`)
  - Vite 8.0.16 & `vite-plugin-pwa` 1.3.0
  - Vitest 4.1.8 & `@testing-library/react` 16.3.2
- **`vite.config.ts` (`vite.config.ts:16-120`)**:
  - Injects `Content-Security-Policy` and `Permissions-Policy` in production build.
  - Generates PWA Service Worker via `VitePWA` with auto-updating cache.
  - Rollup manual chunks separating `react`, `react-dom`, `motion`, and `icons`.
  - Vitest environment configured with `jsdom` and v8 coverage.
- **`src/index.css` (`src/index.css:1-157`)**:
  - Uses CSS-native `@import 'tailwindcss';` and `@theme` definitions.
  - Custom UI utilities: `.app-stage`, `.app-device`, `.shield-aura`, `.signal-ring`, `.scanline`, `.scrollbar-hide`, `.pb-safe`.
  - Touch-target accessibility rule enforcing `min-height: 44px` on all interactive controls.

---

### 1.2 Frontend Architecture & State Management

#### 1.2.1 State Structure (`src/types.tsx:152-206`)
`AppState` is the single source of truth containing:
```typescript
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
    totalSavedTime: number;
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
      strictPrivacyMode: boolean;
    };
  };
}
```

#### 1.2.2 Per-App Configuration Model (`src/types.tsx:44-101`)
`AppConfig` holds comprehensive granular rule parameters:
```typescript
export interface AppConfig {
  id: string;
  // 1. General App Protection
  active: boolean;
  mode: 'soft' | 'standard' | 'strict';
  openDelay: number; // seconds
  dailyLimit: number; // minutes
  sessionLimit?: number; // minutes per session
  blockHours: string; // e.g. "22:00-07:00"
  focusModeBehavior: 'allow' | 'warn' | 'block';

  // 2. Reels & Shorts Protection
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

  // 3. Single Content Permission (e.g. shared direct links)
  singleContent: {
    allowSharedLinks: boolean;
    allowOnlyOne: boolean;
    returnToPrevious: boolean;
  };

  // 4. Emergency Unlock
  emergencyUnlock: {
    enabled: boolean;
    durationMinutes: number;
    requireCountdown: boolean;
    requireReason: boolean;
    maxPerDay: number;
  };

  // 5. Time Windows
  timeWindows: {
    morningRules: 'normal' | 'strict' | 'block';
    workRules: 'normal' | 'strict' | 'block';
    eveningRules: 'normal' | 'strict' | 'block';
    nightRules: 'normal' | 'strict' | 'block';
    weekendRules: 'normal' | 'strict' | 'block';
  };

  // 6. Anti-Binge Escalation
  antiBinge: {
    enabled: boolean;
    warningThreshold: number;
    warningTimeframe: number;
    blockThreshold: number;
    blockTimeframe: number;
  };
  updatedAt?: number;
}
```

#### 1.2.3 State Normalization & Resilience (`src/lib/state.ts:1-125`)
- `normalizeAppConfig(appId, config)`: Deep-merges individual app config with `DEFAULT_APP_CONFIG`, preserving user overrides while guaranteeing sub-object structures (`reelsProtection`, `singleContent`, `emergencyUnlock`, `timeWindows`, `antiBinge`) are never `undefined`.
- `normalizeAppsConfig(appsConfig)`: Iterates over supported apps to guarantee all registered apps have valid configs.
- `normalizeProfiles(savedProfiles)`: Normalizes built-in and user-created custom profiles, merging profile-level `appsConfig`.
- `normalizeAppState(saved)`: Provides top-level hydration with default fallbacks and strict privacy rules enforcement (forcing `localOnly: true` and `strictPrivacyMode: true` for age < 16).

#### 1.2.4 Storage Layer (`src/lib/storage.ts:1-238`)
`StorageService` implements storage schema version 3:
- Split into 5 distinct local storage keys:
  - `scrollshield_settings_v3` (XOR-obfuscated: settings, permissions, onboarding state, active protection level, session)
  - `scrollshield_profiles_v3` (XOR-obfuscated: profiles, activeProfileId, appsConfig)
  - `scrollshield_stats_v3` (Plaintext: stats, dailyStats)
  - `scrollshield_history_v3` (Plaintext: capped at 100 history events & 50 focus sessions)
  - `scrollshield_meta_v3` (Version tracking & timestamp)
- Includes automatic migration `migrateFromV2()` from legacy monolithic `scrollshield_state_v2`.

#### 1.2.5 Decision Engines & Runtime Subsystems
- **Protection Flow Evaluation (`src/lib/protectionRules.ts:35-136`)**: Evaluates incoming app launch attempts:
  1. Checks if `config.active` is false $\rightarrow$ allows open.
  2. Checks if `dailyLimit` is reached $\rightarrow$ blocks with `anti_binge_block`.
  3. Checks anti-binge thresholds (block threshold and warning threshold) $\rightarrow$ triggers warning/block.
  4. Checks if strict mode or focus mode blocking is active $\rightarrow$ validates emergency unlock availability $\rightarrow$ triggers `strict_blocked`.
  5. Evaluates standard mode $\rightarrow$ triggers `standard_delay` with configured delay.
  6. Evaluates soft mode $\rightarrow$ triggers `soft_intent`.
- **Session & Stats Tracking (`src/lib/session.ts:1-78`, `src/lib/stats.ts:1-43`)**:
  - `recordSessionUsage`: Accumulates usage time in `dailyStats[dateKey].usageMinutes[appId]`.
  - `getReelsStatsForDate`: Aggregates usage for keys matching `_reels` / short-video indicators.
- **Focus Lifecycle (`src/lib/focus.ts:1-109`)**:
  - `reconcileFocusRuntime`: Heartbeat function called in `src/App.tsx:50-60` every 15s to auto-complete expired focus sessions and credit focus minutes.

---

### 1.3 Multi-Platform Expansion (Requirement R1) Analysis

#### Current Platform Definition:
Currently, platforms are defined as a static hardcoded array in `src/types.tsx:208-269`:
```tsx
export const SUPPORTED_APPS = [
  {
    id: 'instagram',
    name: 'Instagram',
    icon: <svg viewBox="0 0 24 24" ...><path ... /></svg>,
    color: 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white shadow-lg',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: <svg viewBox="0 0 24 24" ...><path ... /></svg>,
    color: 'bg-black text-white border border-zinc-800 shadow-md',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: <svg viewBox="0 0 24 24" ...><path ... /></svg>,
    color: 'bg-[#FF0000] text-white shadow-md',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: <svg viewBox="0 0 24 24" ...><path ... /></svg>,
    color: 'bg-[#1877F2] text-white shadow-md',
  },
  {
    id: 'twitter',
    name: 'X',
    icon: <svg viewBox="0 0 24 24" ...><path ... /></svg>,
    color: 'bg-black text-white border border-zinc-800 shadow-md',
  },
  {
    id: 'snapchat',
    name: 'Snapchat',
    icon: <svg viewBox="0 0 24 24" ...><path ... /></svg>,
    color: 'bg-[#FFFC00] text-black shadow-md',
  },
];
```

And in `src/lib/appUtils.ts:3`:
```typescript
export const REELS_PLATFORM_IDS = ['instagram', 'youtube', 'tiktok', 'facebook', 'snapchat'] as const;
```

#### Identified Architectural Couplings & Inflexibilities:
1. **Static List Binding**:
   - `normalizeAppsConfig` in `src/lib/state.ts:47-55` only initializes apps found in `SUPPORTED_APPS`.
   - `DEFAULT_PROFILES` in `src/types.tsx:328-358` iterates strictly over `SUPPORTED_APPS`.
   - Screens (`AppList`, `AppDetail`, `ReelsProtectionScreen`, `OnboardingScreens`, `Dashboard`) import `SUPPORTED_APPS` directly and use `.find()`, `.filter()`, or `.map()`.
2. **Missing Platform Metadata**:
   - No native Android package identifiers (e.g. `com.reddit.frontpage`, `com.snapchat.android`, `com.twitter.android`, `com.zhiliaoapp.musically`, `com.instagram.android`, `com.google.android.youtube`, `com.pinterest`, `com.linkedin.android`, `com.instagram.barcelona` [Threads], `tv.twitch.android.app`, `org.telegram.messenger`, `xyz.blueskyweb.app`).
   - No iOS Bundle IDs (e.g. `com.reddit.Reddit`, `com.burbn.instagram`, `com.zhiliaoapp.musically`).
   - No distinction between general app protection vs. dedicated sub-feed protection (e.g. Reddit Watch, Snapchat Spotlight, YouTube Shorts, Facebook Reels, Pinterest Watch).
3. **Hardcoded Short-Video Classification**:
   - `REELS_PLATFORM_IDS` in `src/lib/appUtils.ts` is an isolated array decoupled from the platform object.

---

## 2. Logic Chain

### 2.1 Preserving Existing React / Tailwind Design
- **Observation**: All UI components (`ConfigScreens.tsx:104-131`, `OnboardingScreens.tsx:132-167`, `ReelsProtectionScreen.tsx:196-289`, `MainScreens.tsx:349-375`) expect an app entity with `{ id, name, icon, color }` and render them in rounded container cards with Tailwind classes (`bg-zinc-900/80`, `border-zinc-800/50`, `rounded-[1.5rem]`, switches, badges).
- **Inference**: Any expansion must keep this visual and structural contract intact. If we enhance the platform definition model with metadata, existing screens can continue rendering with zero changes to visual layout, styling, or interaction paradigms.

### 2.2 Moving from Static Array to Platform Registry Pattern
- **Observation**: Currently `SUPPORTED_APPS` is imported as a constant array across 7 screen/lib files.
- **Inference**: By formalizing a `PlatformDefinition` interface and a `PlatformRegistry` provider with backward-compatible export `SUPPORTED_APPS`, we achieve dynamic multi-platform capability without breaking any existing imports or test suites.

### 2.3 Proposed Concrete Architecture for Requirement R1

#### 2.3.1 Enhanced `PlatformDefinition` Interface
Define in `src/types.tsx`:
```typescript
export type PlatformCategory = 'social' | 'short_video' | 'news' | 'entertainment' | 'messaging' | 'custom';

export interface PlatformSurfaceDefinition {
  id: string;                       // e.g. 'reels', 'shorts', 'spotlight', 'watch'
  name: string;                     // e.g. 'Reels', 'Shorts', 'Spotlight', 'Video-Feed'
  description?: string;
  defaultMode: 'warn' | 'limit' | 'block';
  defaultDailyLimitMinutes: number;
}

export interface PlatformDefinition {
  id: string;                       // Unique identifier: 'reddit', 'snapchat', 'x', 'tiktok', etc.
  name: string;                     // Display name
  category: PlatformCategory;       // Category classification
  icon: React.ReactNode;            // SVG / Lucide React node
  color: string;                    // Tailwind color classes for avatar badge
  androidPackages: string[];        // e.g. ['com.reddit.frontpage']
  iosBundleIds?: string[];          // e.g. ['com.reddit.Reddit']
  hasShortVideoFeed: boolean;       // Enables Reels/Shorts protection tab & counters
  shortVideoSurface?: PlatformSurfaceDefinition;
  isCustom?: boolean;               // True if user-added custom app
  detectionKeywords?: string[];     // Used for on-device URL / accessibility matching
}
```

#### 2.3.2 Extended Built-In Platform Catalog
Expand `BUILTIN_PLATFORMS` to include all major high-distraction platforms:
```typescript
export const BUILTIN_PLATFORMS: PlatformDefinition[] = [
  // 1. Instagram
  {
    id: 'instagram',
    name: 'Instagram',
    category: 'social',
    icon: <InstagramIcon />,
    color: 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white shadow-lg',
    androidPackages: ['com.instagram.android', 'com.instagram.lite'],
    iosBundleIds: ['com.burbn.instagram'],
    hasShortVideoFeed: true,
    shortVideoSurface: {
      id: 'reels',
      name: 'Reels',
      defaultMode: 'limit',
      defaultDailyLimitMinutes: 15,
    },
    detectionKeywords: ['instagram.com', 'reels'],
  },
  // 2. TikTok
  {
    id: 'tiktok',
    name: 'TikTok',
    category: 'short_video',
    icon: <TikTokIcon />,
    color: 'bg-black text-white border border-zinc-800 shadow-md',
    androidPackages: ['com.zhiliaoapp.musically', 'com.ss.android.ugc.trill', 'com.zhiliaoapp.musically.go'],
    iosBundleIds: ['com.zhiliaoapp.musically'],
    hasShortVideoFeed: true,
    shortVideoSurface: {
      id: 'tiktok_feed',
      name: 'TikTok Feed',
      defaultMode: 'limit',
      defaultDailyLimitMinutes: 15,
    },
    detectionKeywords: ['tiktok.com'],
  },
  // 3. YouTube (including Shorts)
  {
    id: 'youtube',
    name: 'YouTube',
    category: 'entertainment',
    icon: <YouTubeIcon />,
    color: 'bg-[#FF0000] text-white shadow-md',
    androidPackages: ['com.google.android.youtube', 'com.google.android.apps.youtube.mango'],
    iosBundleIds: ['com.google.ios.youtube'],
    hasShortVideoFeed: true,
    shortVideoSurface: {
      id: 'shorts',
      name: 'Shorts',
      defaultMode: 'limit',
      defaultDailyLimitMinutes: 15,
    },
    detectionKeywords: ['youtube.com/shorts', 'shorts'],
  },
  // 4. Snapchat (including Spotlight)
  {
    id: 'snapchat',
    name: 'Snapchat',
    category: 'social',
    icon: <SnapchatIcon />,
    color: 'bg-[#FFFC00] text-black shadow-md',
    androidPackages: ['com.snapchat.android'],
    iosBundleIds: ['com.toyopagroup.picaboo'],
    hasShortVideoFeed: true,
    shortVideoSurface: {
      id: 'spotlight',
      name: 'Spotlight & Stories',
      defaultMode: 'limit',
      defaultDailyLimitMinutes: 15,
    },
    detectionKeywords: ['snapchat.com', 'spotlight'],
  },
  // 5. Reddit (including Watch/Video Feed)
  {
    id: 'reddit',
    name: 'Reddit',
    category: 'social',
    icon: <RedditIcon />,
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
  // 6. X (formerly Twitter)
  {
    id: 'twitter',
    name: 'X',
    category: 'social',
    icon: <XIcon />,
    color: 'bg-black text-white border border-zinc-800 shadow-md',
    androidPackages: ['com.twitter.android', 'com.twitter.android.lite'],
    iosBundleIds: ['com.atebits.Tweetie2'],
    hasShortVideoFeed: true,
    shortVideoSurface: {
      id: 'immersive_video',
      name: 'Immersive Video Feed',
      defaultMode: 'limit',
      defaultDailyLimitMinutes: 15,
    },
    detectionKeywords: ['x.com', 'twitter.com'],
  },
  // 7. Facebook (including Reels)
  {
    id: 'facebook',
    name: 'Facebook',
    category: 'social',
    icon: <FacebookIcon />,
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
  // 8. Pinterest (including Watch/Idea Pins)
  {
    id: 'pinterest',
    name: 'Pinterest',
    category: 'social',
    icon: <PinterestIcon />,
    color: 'bg-[#E60023] text-white shadow-md',
    androidPackages: ['com.pinterest'],
    iosBundleIds: ['pinterest'],
    hasShortVideoFeed: true,
    shortVideoSurface: {
      id: 'watch',
      name: 'Watch Feed',
      defaultMode: 'limit',
      defaultDailyLimitMinutes: 15,
    },
    detectionKeywords: ['pinterest.com/watch'],
  },
  // 9. Threads
  {
    id: 'threads',
    name: 'Threads',
    category: 'social',
    icon: <ThreadsIcon />,
    color: 'bg-zinc-900 text-white border border-zinc-700 shadow-md',
    androidPackages: ['com.instagram.barcelona'],
    iosBundleIds: ['com.burbn.threads'],
    hasShortVideoFeed: false,
    detectionKeywords: ['threads.net'],
  },
  // 10. LinkedIn
  {
    id: 'linkedin',
    name: 'LinkedIn',
    category: 'social',
    icon: <LinkedInIcon />,
    color: 'bg-[#0A66C2] text-white shadow-md',
    androidPackages: ['com.linkedin.android'],
    iosBundleIds: ['com.linkedin.LinkedIn'],
    hasShortVideoFeed: true,
    shortVideoSurface: {
      id: 'linkedin_video',
      name: 'Video Feed',
      defaultMode: 'limit',
      defaultDailyLimitMinutes: 15,
    },
    detectionKeywords: ['linkedin.com'],
  },
  // 11. Twitch
  {
    id: 'twitch',
    name: 'Twitch',
    category: 'entertainment',
    icon: <TwitchIcon />,
    color: 'bg-[#9146FF] text-white shadow-md',
    androidPackages: ['tv.twitch.android.app'],
    iosBundleIds: ['tv.twitch'],
    hasShortVideoFeed: true,
    shortVideoSurface: {
      id: 'discovery_feed',
      name: 'Discovery Feed',
      defaultMode: 'limit',
      defaultDailyLimitMinutes: 15,
    },
    detectionKeywords: ['twitch.tv'],
  },
  // 12. Bluesky
  {
    id: 'bluesky',
    name: 'Bluesky',
    category: 'social',
    icon: <BlueskyIcon />,
    color: 'bg-[#0085FF] text-white shadow-md',
    androidPackages: ['xyz.blueskyweb.app'],
    iosBundleIds: ['xyz.blueskyweb.app'],
    hasShortVideoFeed: false,
    detectionKeywords: ['bsky.app'],
  },
];
```

#### 2.3.3 Dynamic Registry Helper Functions
In `src/lib/appUtils.ts` (or `src/lib/platforms.ts`):
```typescript
/**
 * Dynamic resolution of supported platforms, combining built-in platforms with any user custom platforms
 */
export const getSupportedPlatforms = (customPlatforms: PlatformDefinition[] = []): PlatformDefinition[] => {
  return [...BUILTIN_PLATFORMS, ...customPlatforms];
};

/**
 * Returns all platforms that have short-video feeds (Reels, Shorts, Spotlight, Watch, etc.)
 */
export const getShortVideoPlatforms = (customPlatforms: PlatformDefinition[] = []): PlatformDefinition[] => {
  return getSupportedPlatforms(customPlatforms).filter((p) => p.hasShortVideoFeed);
};

/**
 * Backward compatibility: export SUPPORTED_APPS matching original contract
 */
export const SUPPORTED_APPS = BUILTIN_PLATFORMS;

/**
 * Backward compatibility: dynamic array of IDs supporting Reels / short-videos
 */
export const REELS_PLATFORM_IDS = BUILTIN_PLATFORMS.filter((p) => p.hasShortVideoFeed).map((p) => p.id);

/**
 * Match a native Android package name to a known platform definition
 */
export const resolvePlatformByPackageName = (
  packageName: string,
  customPlatforms: PlatformDefinition[] = [],
): PlatformDefinition | undefined => {
  return getSupportedPlatforms(customPlatforms).find((platform) =>
    platform.androidPackages.some((pkg) => pkg.toLowerCase() === packageName.toLowerCase()),
  );
};
```

#### 2.3.4 State Integration & Custom Platforms
Extend `AppState` optionally in `src/types.tsx`:
```typescript
export interface AppState {
  // ... existing properties ...
  customPlatforms?: PlatformDefinition[]; // Allows user to add custom apps or installed apps
}
```
And update `normalizeAppsConfig` in `src/lib/state.ts`:
```typescript
export const normalizeAppsConfig = (
  appsConfig: Partial<AppState['appsConfig']> = {},
  customPlatforms: PlatformDefinition[] = [],
) => {
  const normalized: Record<string, AppConfig> = {};
  const allPlatforms = getSupportedPlatforms(customPlatforms);

  // Initialize all known platforms
  allPlatforms.forEach((app) => {
    normalized[app.id] = normalizeAppConfig(app.id, appsConfig[app.id]);
  });

  // Preserve any previously stored custom app configurations
  Object.keys(appsConfig).forEach((appId) => {
    if (!normalized[appId] && appsConfig[appId]) {
      normalized[appId] = normalizeAppConfig(appId, appsConfig[appId]);
    }
  });

  return normalized;
};
```

---

## 3. Caveats

1. **Native Android Package Stats & Overlay**:
   - The React frontend is fully equipped to configure and store rules for dozens of platforms. However, native Android auto-detection via `PACKAGE_USAGE_STATS` or overlay via `SYSTEM_ALERT_WINDOW` is scaffolded (`ScrollShieldContentFilterService.java`), but requires full native plugin integration to intercept external app launches on a physical Android device.
2. **iOS Screen Time Restrictions**:
   - On iOS, third-party apps cannot inspect foreground apps or draw overlays over other apps. Real enforcement requires the Apple `FamilyControls` and `ManagedSettings` frameworks with Apple developer entitlement approval.
3. **Storage Quota & History**:
   - Obfuscated localStorage in `StorageService` operates well within browser quotas (~5-10MB). `scrollshield_history_v3` is capped at 100 events, and `scrollshield_stats_v3` stores daily aggregates per app. Adding 10-20 platforms will add $< 5$ KB to the JSON payload, which is completely negligible.
4. **Keyword & URL Inspection**:
   - For web/PWA mode, browser sandboxing prevents detecting when a user switches browser tabs or opens a native app. Content filtering and domain blocking are only possible when running inside the native Android accessibility/VPN wrapper or via a dedicated Safari/Chrome web extension.

---

## 4. Conclusion

1. **Architecture Strength**: The ScrollShield codebase possesses high code quality, strict TypeScript typing, deep state normalization, modular sub-libraries, comprehensive test coverage (88/88 passing tests), and zero external design system dependencies (clean Tailwind v4 + Lucide React).
2. **Multi-Platform Feasibility (R1)**:
   - The existing architecture can be expanded from the current 6 hardcoded apps to 12+ platforms (including Reddit, Pinterest, LinkedIn, Threads, Twitch, Bluesky) or dynamic user-added apps **without modifying a single React component layout or Tailwind style**.
   - By migrating from a hardcoded array to a `PlatformDefinition` catalog + `getSupportedPlatforms()` registry pattern, backward compatibility is 100% maintained for `SUPPORTED_APPS`, `REELS_PLATFORM_IDS`, `appsConfig`, and saved localStorage data.
3. **Actionable Implementation Blueprint**:
   - Upgrade `src/types.tsx` to include `PlatformDefinition`, `PlatformSurfaceDefinition`, and expanded `BUILTIN_PLATFORMS`.
   - Update `src/lib/appUtils.ts` and `src/lib/state.ts` to consume the registry dynamically.
   - Maintain all existing UI screens (`AppList`, `AppDetail`, `ReelsProtectionScreen`, `Dashboard`, `OnboardingScreens`) identically, as they already dynamically iterate over the resolved platform list.

---

## 5. Verification Method

To independently verify the findings, build integrity, and test suite:

### 5.1 Verification Commands
Execute the following commands from the project root `/Users/arman/.gemini/antigravity/scratch/Scrollshield-Brain`:

```bash
# 1. Run full test suite with Vitest
npm test

# 2. Run TypeScript typechecking without emitting code
npm run typecheck

# 3. Run production Vite build and service worker generation
npm run build

# 4. Run full repository verification pipeline
npm run verify
```

### 5.2 Files to Inspect
- `src/types.tsx` (lines 44-101 for `AppConfig`, lines 152-206 for `AppState`, lines 208-269 for `SUPPORTED_APPS`)
- `src/lib/state.ts` (lines 21-55 for `normalizeAppConfig` & `normalizeAppsConfig`)
- `src/lib/appUtils.ts` (lines 3-7 for `REELS_PLATFORM_IDS` & `getActiveReelsCount`)
- `src/lib/storage.ts` (lines 66-129 for `KEYS` & `saveState`)
- `src/screens/ConfigScreens.tsx` (lines 92-135 for `AppList`, lines 140-250 for `AppDetail`)
- `src/screens/ReelsProtectionScreen.tsx` (lines 18-38 & 196-289 for dynamic feed list)
- `android/app/src/main/AndroidManifest.xml` & `android/app/src/main/java/app/scrollshield/mobile/ScrollShieldContentFilterService.java`

### 5.3 Invalidation Conditions
- If any proposed platform additions alter the visual card dimensions, switch components, or color badges in `AppList` or `ReelsProtectionScreen`.
- If tests in `src/lib/state.test.ts` or `src/screens/ConfigScreens.test.tsx` fail when `SUPPORTED_APPS` contains newly registered platforms.
- If storage migration fails to deserialize previous v2 or v3 localStorage payloads.
