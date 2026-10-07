/**
 * ScrollShield Native Bridge – TypeScript Interface
 * ══════════════════════════════════════════════════
 * Wraps the Capacitor ScrollShieldBridgePlugin for use in React components.
 * On web/non-Android platforms all calls return graceful fallbacks.
 *
 * The native layer sees the per-app rule (mode, delay, daily limit,
 * anti-binge), the time-window schedule and the short-video rule, and
 * evaluates them itself when an app is opened. Emergency unlocks stay in the
 * web layer; see src/lib/protectionRules.ts.
 *
 * Usage:
 *   import { ScrollShieldBridge } from '@/lib/nativeBridge';
 *
 *   const perms = await ScrollShieldBridge.getPermissionStatus();
 *   if (!perms.usageStats) {
 *     await ScrollShieldBridge.requestUsageStatsPermission();
 *   }
 */

import { Capacitor, PluginListenerHandle, registerPlugin } from '@capacitor/core';
import { FEATURE_FLAGS } from '../config/featureFlags';
import type { Schedule } from '../types';
import { getShortVideoSignature } from './shortVideoSignatures';
import { isShortVideoFeedBlockedByConfig } from './stats';
import { TimeWindowRule } from './schedules';

// ── Type definitions ──────────────────────────────────────────────────────────

export const NATIVE_PROTECTION_CONTRACT_VERSION = 1 as const;

export type NativeProtectionMode = 'soft' | 'standard' | 'strict';

export interface PermissionStatus {
  /** Whether PACKAGE_USAGE_STATS (Usage Access) is granted */
  usageStats: boolean;
  /** Whether SYSTEM_ALERT_WINDOW (overlay) is granted */
  overlay: boolean;
  /** Whether POST_NOTIFICATIONS is granted (Android 13+) */
  notifications: boolean;
  /** Whether the AppMonitorService is currently running */
  monitoringActive: boolean;
  /** Whether the user enabled ScrollShield's accessibility service */
  accessibility: boolean;
  /** Whether Android exempted ScrollShield from battery optimisation */
  batteryOptimizationIgnored?: boolean;
}

export interface ForegroundAppResult {
  /** Package name of the current foreground app, or null */
  packageName: string | null;
  /** False if Usage Access permission is missing */
  hasPermission: boolean;
}

export type ShortVideoMode = 'allow' | 'warn' | 'limit' | 'block';

export interface NativeShortVideoRule {
  /** Surface id from the platform definition, e.g. "reels" */
  surfaceId: string;
  mode: ShortVideoMode;
  /**
   * Minutes of short-video time allowed per day (0 = no limit). A web-side
   * limit of 0 means "blocked" and arrives here as mode `block` instead.
   */
  dailyLimitMinutes: number;
  /** Minutes allowed in one uninterrupted feed session (0 = no limit, see above) */
  sessionLimitMinutes: number;
  /** Interrupt after this many swipes (0 = never) */
  stopAfterSwipes: number;
  /** Whether the interruption blocks or only warns */
  hardInterrupt: boolean;
  /** View-id fragments that identify the short-video surface */
  viewIdHints: string[];
  /** Class-name fragments that identify the short-video surface */
  classNameHints: string[];
  /** True when the whole app is a short-video feed (TikTok) */
  alwaysShortVideo: boolean;
}

export interface NativeTimeWindow {
  /** Inclusive start hour, local time */
  startHour: number;
  /** Exclusive end hour; smaller than startHour for a window past midnight */
  endHour: number;
  rule: Exclude<TimeWindowRule, 'normal'>;
}

/**
 * Time-window rules, evaluated on the device at the moment the app is opened.
 * The web layer cannot re-sync at every window boundary – it may not be
 * running at 22:00 – so the schedule itself goes down, not today's result.
 * The windows come from the user's schedules (src/lib/schedules.ts).
 */
export interface NativeTimeWindows {
  windows: NativeTimeWindow[];
  /** Applies on Saturday and Sunday when stricter than the time of day */
  weekendRule: TimeWindowRule;
}

export interface NativeAntiBinge {
  warningThreshold: number;
  /** Minutes */
  warningTimeframe: number;
  blockThreshold: number;
  /** Minutes */
  blockTimeframe: number;
  /**
   * Seconds the opening pause grows with every opening inside
   * warningTimeframe: the reopen protection. 0 or absent keeps it flat.
   */
  escalationSeconds?: number;
}

export interface NativeEmergencyUnlock {
  maxPerDay: number;
  /** How long the app stays free after an emergency unlock */
  durationMinutes: number;
}

export interface NativeProtectionRule {
  /** Android package name to watch */
  packageName: string;
  /** Platform id; the packages of one app share daily limit and anti-binge */
  appId: string;
  /** How the native overlay should behave for this package */
  mode: NativeProtectionMode;
  /** Countdown length before the app may be opened (standard mode) */
  delaySeconds: number;
  /** Minutes per day across the app's packages; absent when there is no limit */
  dailyLimitMinutes?: number;
  /** Absent when anti-binge is switched off */
  antiBinge?: NativeAntiBinge;
  /** Stricter schedule; absent when time windows are off or all 'normal' */
  timeWindows?: NativeTimeWindows;
  /** Short-video surface rule; absent when the app has no protected feed */
  shortVideo?: NativeShortVideoRule;
  /** Locked by a focus or rescue session until this time (epoch ms) */
  focusUntil?: number;
  /** Interrupt after this many minutes in the app without a break; absent when off */
  sessionLimitMinutes?: number;
  /** Emergency unlock on a lock screen; absent when switched off */
  emergencyUnlock?: NativeEmergencyUnlock;
  /** No emergency unlock before this time: self-commitment or strict focus (epoch ms) */
  emergencyLockedUntil?: number;
}

export interface ShortVideoUsageEntry {
  packageName: string;
  surfaceId: string;
  /** Minutes spent in the short-video surface today */
  minutesToday: number;
  /** Scroll events counted in the current feed session */
  swipesInSession: number;
  /** Timestamp of the last observed short-video activity */
  lastSeenAt: number;
}

export interface ShortVideoUsageResult {
  entries: ShortVideoUsageEntry[];
  /** False when the accessibility service is not running */
  available: boolean;
  /** Local day (YYYY-MM-DD) the entries belong to */
  date?: string;
}

/** One interruption shown by the Android overlay; see InterruptionLog.kt. */
export interface NativeInterruptionEvent {
  id: string;
  timestamp: number;
  packageName: string;
  kind: 'app' | 'short_video';
  /** blocked: locked · warned: soft interruption shown · stopped: user went home · continued: user opened the app */
  outcome: 'blocked' | 'warned' | 'stopped' | 'continued' | 'emergency';
  /** STRICT, TIME_WINDOW, SOFT, STANDARD, or for feeds SWIPES, SESSION_LIMIT, DAILY_LIMIT, BLOCKED */
  reason: string;
  swipes: number;
}

export interface InterruptionEventsResult {
  events: NativeInterruptionEvent[];
}

export interface AppUsageResult {
  /** Minutes each protected package was in the foreground today */
  entries: { packageName: string; minutesToday: number }[];
  /** False without Usage Access, and on web */
  available: boolean;
  /** Local day (YYYY-MM-DD) the minutes belong to */
  date?: string;
}

export interface ScreenTimeResult {
  /** False without Usage Access, and on web */
  available: boolean;
  /** Local day (YYYY-MM-DD) "today" refers to */
  date?: string;
  todayMinutes?: number;
  yesterdayMinutes?: number;
}

export interface AppIconsResult {
  /** One entry per requested package that is installed; others are left out */
  icons: { packageName: string; dataUrl: string }[];
}

export interface CalibrationSample {
  packageName: string;
  viewIds: string[];
  classNames: string[];
  matchedPlatformId: string | null;
  observedAt: number;
}

export interface CalibrationResult {
  samples: CalibrationSample[];
  available: boolean;
}

export interface SyncBlockedAppsOptions {
  /** Explicit schema version so Android can reject incompatible payloads safely. */
  contractVersion: typeof NATIVE_PROTECTION_CONTRACT_VERSION;
  /** When this contract snapshot was generated (epoch ms). */
  generatedAt: number;
  /** One entry per protected Android package */
  rules: NativeProtectionRule[];
  /** Master switch – if false the service won't intervene */
  monitoringEnabled: boolean;
}

export interface SyncResult {
  synced: boolean;
  contractVersion: number;
  ruleCount: number;
}

export interface OpenedResult {
  opened: boolean;
}

export interface StartedResult {
  started: boolean;
  /** False when the service runs but may not draw its interruption overlay */
  overlayGranted?: boolean;
}

export interface StoppedResult {
  stopped: boolean;
}

export interface SaveTextFileOptions {
  filename: string;
  content: string;
  mimeType?: string;
}

// ── Plugin interface ──────────────────────────────────────────────────────────

export interface ScrollShieldBridgePlugin {
  getPermissionStatus(): Promise<PermissionStatus>;
  requestUsageStatsPermission(): Promise<OpenedResult>;
  requestOverlayPermission(): Promise<OpenedResult>;
  getForegroundApp(): Promise<ForegroundAppResult>;
  syncBlockedApps(options: SyncBlockedAppsOptions): Promise<SyncResult>;
  startMonitoring(): Promise<StartedResult>;
  stopMonitoring(): Promise<StoppedResult>;
  openAccessibilitySettings(): Promise<OpenedResult>;
  getShortVideoUsage(): Promise<ShortVideoUsageResult>;
  getCalibrationSamples(): Promise<CalibrationResult>;
  getInterruptionEvents(): Promise<InterruptionEventsResult>;
  getAppUsage(): Promise<AppUsageResult>;
  getAppIcons(options: { packageNames: string[] }): Promise<AppIconsResult>;
  getScreenTime(): Promise<ScreenTimeResult>;
  acknowledgeInterruptionEvents(options: { ids: string[] }): Promise<void>;
  openBatteryOptimizationSettings(): Promise<OpenedResult>;
  clearNativeData(): Promise<{ cleared: boolean }>;
  saveTextFile(options: SaveTextFileOptions): Promise<{ saved: boolean }>;
  minimizeApp(): Promise<void>;
  addListener(eventName: 'backButton', listenerFunc: () => void): Promise<PluginListenerHandle>;
}

// ── Capacitor plugin registration ─────────────────────────────────────────────

const ScrollShieldBridgeNative = registerPlugin<ScrollShieldBridgePlugin>('ScrollShieldBridge', {
  // Web fallback – returns safe defaults when running in the browser / iOS simulator
  web: {
    getPermissionStatus: async (): Promise<PermissionStatus> => ({
      usageStats: false,
      overlay: false,
      notifications: typeof Notification !== 'undefined' && Notification.permission === 'granted',
      monitoringActive: false,
      accessibility: false,
    }),
    requestUsageStatsPermission: async () => ({ opened: false }),
    requestOverlayPermission: async () => ({ opened: false }),
    getForegroundApp: async () => ({ packageName: null, hasPermission: false }),
    syncBlockedApps: async (options: SyncBlockedAppsOptions) => ({
      synced: false,
      contractVersion: options.contractVersion,
      ruleCount: options.rules.length,
    }),
    startMonitoring: async () => ({ started: false, overlayGranted: false }),
    stopMonitoring: async () => ({ stopped: false }),
    openAccessibilitySettings: async () => ({ opened: false }),
    getShortVideoUsage: async () => ({ entries: [], available: false }),
    getCalibrationSamples: async () => ({ samples: [], available: false }),
    getInterruptionEvents: async () => ({ events: [] }),
    getAppUsage: async () => ({ entries: [], available: false }),
    getAppIcons: async () => ({ icons: [] }),
    getScreenTime: async () => ({ available: false }),
    acknowledgeInterruptionEvents: async () => undefined,
    openBatteryOptimizationSettings: async () => ({ opened: false }),
    clearNativeData: async () => ({ cleared: false }),
    saveTextFile: async () => ({ saved: false }),
    minimizeApp: async () => undefined,
  },
});

// ── High-level helper API ─────────────────────────────────────────────────────

/**
 * Checks which permissions are still missing for full native protection.
 * Returns an array of human-readable permission names that need to be granted.
 */
export async function getMissingPermissions(options: { needsShortVideoProtection?: boolean } = {}): Promise<string[]> {
  const missing: string[] = [];
  try {
    const status = await ScrollShieldBridgeNative.getPermissionStatus();
    if (!status.usageStats) missing.push('Nutzungsdaten-Zugriff');
    if (!status.overlay) missing.push('Über anderen Apps einblenden');
    if (!status.notifications) missing.push('Benachrichtigungen');
    if (options.needsShortVideoProtection && !status.accessibility) {
      missing.push('Bedienungshilfe (Kurzvideo-Erkennung)');
    }
  } catch {
    // Running on web – all "missing"
    missing.push('Nutzungsdaten-Zugriff', 'Über anderen Apps einblenden');
  }
  return missing;
}

type ShortVideoConfigSlice = {
  enabled: boolean;
  mode: ShortVideoMode;
  dailyLimitMinutes?: number;
  sessionLimitMinutes?: number;
  stopAfterSwipes?: number;
  hardInterrupt?: boolean;
};

type AppConfigSlice = {
  active: boolean;
  mode: NativeProtectionMode;
  openDelay: number;
  dailyLimit?: number;
  sessionLimit?: number;
  antiBinge?: NativeAntiBinge & { enabled: boolean };
  focusModeBehavior?: 'allow' | 'warn' | 'block';
  reelsProtection?: ShortVideoConfigSlice;
  emergencyUnlock?: { enabled: boolean; maxPerDay: number; durationMinutes: number };
};

type PlatformSlice = {
  id: string;
  androidPackages: string[];
  shortVideoSurface?: { id: string };
};

const nonNegativeInt = (value: number | undefined) => Math.max(0, Math.round(value ?? 0));

export interface NativeProtectionOptions {
  isFocusModeActive?: boolean;
  /**
   * The apps the running focus or rescue session locks. Without it, the older
   * per-app `focusModeBehavior` decides.
   */
  focusBlockedAppIds?: string[];
  schedules?: Schedule[];
  /**
   * End of the running focus or rescue session. With it, the phone unlocks
   * the apps on time by itself; without it, focus is folded into the mode
   * and lasts until the next sync.
   */
  focusUntil?: number;
  /** Strict focus or rescue: no emergency unlock while it runs. */
  focusStrict?: boolean;
  /** End of a self-commitment: no emergency unlock before it. */
  commitmentUntil?: number;
  now?: number;
}

const isBlockedByFocus = (appId: string, config: AppConfigSlice, options: NativeProtectionOptions) => {
  if (!options.isFocusModeActive) return false;
  return options.focusBlockedAppIds ? options.focusBlockedAppIds.includes(appId) : config.focusModeBehavior === 'block';
};

/**
 * Builds the short-video half of a rule. Returns undefined when the platform
 * has no protected feed, when the user disabled the feed protection, or when
 * the mode is `allow` — in all three cases the accessibility service has
 * nothing to do for this package and should not waste cycles on it.
 */
function buildShortVideoRule(
  platform: PlatformSlice,
  config: AppConfigSlice,
  focusBlocked: boolean,
): NativeShortVideoRule | undefined {
  if (!FEATURE_FLAGS.enableShortVideoResearch) return undefined;
  const surface = platform.shortVideoSurface;
  const feed = config.reelsProtection;
  if (!surface || !feed?.enabled) return undefined;

  const signature = getShortVideoSignature(platform.id);
  const alwaysShortVideo = signature?.alwaysShortVideo ?? false;

  // Without a signature there is no way to recognise the surface, unless the
  // whole app already is one.
  if (!signature) return undefined;

  // A focus session that blocks the app blocks its feed too, and so does a
  // limit set to 0 ("Blockiert").
  const mode: ShortVideoMode = focusBlocked || isShortVideoFeedBlockedByConfig(feed) ? 'block' : feed.mode;

  if (mode === 'allow') return undefined;

  return {
    surfaceId: surface.id,
    mode,
    dailyLimitMinutes: nonNegativeInt(feed.dailyLimitMinutes),
    sessionLimitMinutes: nonNegativeInt(feed.sessionLimitMinutes),
    stopAfterSwipes: nonNegativeInt(feed.stopAfterSwipes),
    // A blocked feed that offers "continue" is not blocked.
    hardInterrupt: mode === 'block' || (feed.hardInterrupt ?? false),
    viewIdHints: signature.viewIdHints,
    classNameHints: signature.classNameHints,
    alwaysShortVideo,
  };
}

/**
 * The schedule half of a rule: every active schedule that names this app
 * locks it between its hours. Returns undefined when no schedule does.
 */
function buildTimeWindows(appId: string, schedules: Schedule[]): NativeTimeWindows | undefined {
  const windows: NativeTimeWindow[] = schedules
    .filter((schedule) => schedule.active && schedule.appIds.includes(appId) && schedule.startHour !== schedule.endHour)
    .map((schedule) => ({ startHour: schedule.startHour, endHour: schedule.endHour, rule: 'block' }));
  return windows.length > 0 ? { windows, weekendRule: 'normal' } : undefined;
}

/**
 * Translates the web-side app configuration into the flat rule list the
 * native monitor understands. One entry per Android package, so alternative
 * package names (lite/go builds) are covered too.
 *
 * Focus mode is folded in here: an app configured to be blocked during focus
 * sessions is handed down as `strict` (and its feed as `block`) while a
 * session is running.
 */
export function buildNativeProtectionRules(
  appsConfig: Record<string, AppConfigSlice | undefined>,
  platforms: PlatformSlice[],
  options: NativeProtectionOptions = {},
): NativeProtectionRule[] {
  const rules: NativeProtectionRule[] = [];
  const seen = new Set<string>();

  for (const platform of platforms) {
    const config = appsConfig[platform.id];
    if (!config?.active) continue;

    const focusBlocked = isBlockedByFocus(platform.id, config, options);
    const focusUntil = focusBlocked ? options.focusUntil : undefined;
    // Without an end time the phone cannot unlock by itself: fold focus into the mode.
    const mode: NativeProtectionMode = focusBlocked && focusUntil === undefined ? 'strict' : config.mode;
    const now = options.now ?? Date.now();
    const emergencyLockedUntil = Math.max(
      options.commitmentUntil ?? 0,
      focusBlocked && options.focusStrict ? (options.focusUntil ?? 0) : 0,
    );
    const emergencyUnlock = config.emergencyUnlock?.enabled
      ? {
          maxPerDay: nonNegativeInt(config.emergencyUnlock.maxPerDay),
          durationMinutes: nonNegativeInt(config.emergencyUnlock.durationMinutes),
        }
      : undefined;
    const sessionLimitMinutes = nonNegativeInt(config.sessionLimit);
    const shortVideo = buildShortVideoRule(platform, config, focusBlocked);
    const timeWindows = buildTimeWindows(platform.id, options.schedules ?? []);
    const dailyLimitMinutes = nonNegativeInt(config.dailyLimit);
    const antiBinge = config.antiBinge?.enabled
      ? {
          warningThreshold: nonNegativeInt(config.antiBinge.warningThreshold),
          warningTimeframe: nonNegativeInt(config.antiBinge.warningTimeframe),
          blockThreshold: nonNegativeInt(config.antiBinge.blockThreshold),
          blockTimeframe: nonNegativeInt(config.antiBinge.blockTimeframe),
          ...(config.antiBinge.escalationSeconds
            ? { escalationSeconds: nonNegativeInt(config.antiBinge.escalationSeconds) }
            : {}),
        }
      : undefined;

    for (const packageName of platform.androidPackages) {
      if (seen.has(packageName)) continue;
      seen.add(packageName);
      rules.push({
        packageName,
        appId: platform.id,
        mode,
        delaySeconds: nonNegativeInt(config.openDelay),
        ...(dailyLimitMinutes > 0 ? { dailyLimitMinutes } : {}),
        ...(antiBinge ? { antiBinge } : {}),
        ...(timeWindows ? { timeWindows } : {}),
        ...(shortVideo ? { shortVideo } : {}),
        ...(focusUntil !== undefined ? { focusUntil } : {}),
        ...(sessionLimitMinutes > 0 ? { sessionLimitMinutes } : {}),
        ...(emergencyUnlock && emergencyUnlock.maxPerDay > 0 ? { emergencyUnlock } : {}),
        ...(emergencyLockedUntil > now ? { emergencyLockedUntil } : {}),
      });
    }
  }

  return rules;
}

/** True when at least one rule needs the accessibility service to work. */
export function requiresAccessibilityService(rules: NativeProtectionRule[]): boolean {
  return rules.some((rule) => rule.shortVideo !== undefined);
}

/**
 * Syncs the current app configuration to the native monitoring service.
 * Call this whenever appsConfig or the focus session state changes.
 */
export async function syncNativeBlockList(
  appsConfig: Record<string, AppConfigSlice | undefined>,
  allPlatforms: PlatformSlice[],
  options: NativeProtectionOptions = {},
): Promise<void> {
  const rules = buildNativeProtectionRules(appsConfig, allPlatforms, options);
  const monitoringEnabled = rules.length > 0;

  try {
    await ScrollShieldBridgeNative.syncBlockedApps({
      contractVersion: NATIVE_PROTECTION_CONTRACT_VERSION,
      generatedAt: Date.now(),
      rules,
      monitoringEnabled,
    });
    if (monitoringEnabled) {
      await ScrollShieldBridgeNative.startMonitoring();
    } else {
      await ScrollShieldBridgeNative.stopMonitoring();
    }
  } catch {
    // Graceful no-op on web and whenever a permission is still missing.
  }
}

/**
 * Reads the short-video usage the accessibility service recorded on the device.
 * Returns `available: false` on web and whenever the service is not enabled, so
 * callers can distinguish "no usage" from "cannot measure".
 */
export async function readShortVideoUsage(): Promise<ShortVideoUsageResult> {
  try {
    return await ScrollShieldBridgeNative.getShortVideoUsage();
  } catch {
    return { entries: [], available: false };
  }
}

/** Reads today's foreground minutes of the protected apps from the device. */
export async function readAppUsage(): Promise<AppUsageResult> {
  try {
    return await ScrollShieldBridgeNative.getAppUsage();
  } catch {
    return { entries: [], available: false };
  }
}

/** Reads today's and yesterday's total screen time from the device. */
export async function readScreenTime(): Promise<ScreenTimeResult> {
  try {
    return await ScrollShieldBridgeNative.getScreenTime();
  } catch {
    return { available: false };
  }
}

/**
 * Reads the launcher icons of the given packages from the device, as PNG data
 * URLs keyed by package. Empty on web and for packages that are not installed.
 */
export async function readAppIcons(packageNames: string[]): Promise<Map<string, string>> {
  try {
    const { icons } = await ScrollShieldBridgeNative.getAppIcons({ packageNames });
    return new Map((icons ?? []).map((icon) => [icon.packageName, icon.dataUrl]));
  } catch {
    return new Map();
  }
}

/**
 * Reads the interruptions the Android overlay recorded. Empty on web and when
 * the plugin is unavailable.
 */
export async function readInterruptionEvents(): Promise<NativeInterruptionEvent[]> {
  try {
    return (await ScrollShieldBridgeNative.getInterruptionEvents()).events ?? [];
  } catch {
    return [];
  }
}

/** Lets the native side drop interruptions that are now in the history. */
export async function acknowledgeInterruptionEvents(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  try {
    await ScrollShieldBridgeNative.acknowledgeInterruptionEvents({ ids });
  } catch {
    // Kept on the device; the next pull finds them already imported.
  }
}

/**
 * Deletes what the Android side stored (rules, usage, interruptions,
 * calibration samples). Part of the app reset; a no-op on web.
 */
export async function clearNativeData(): Promise<void> {
  try {
    await ScrollShieldBridgeNative.clearNativeData();
  } catch {
    // Nothing stored natively.
  }
}

/**
 * Saves a text file through Android's "save as" dialog. Resolves false when
 * the user cancelled; throws when writing failed. Only for the native app –
 * the browser downloads files itself.
 */
export async function saveTextFileNatively(options: SaveTextFileOptions): Promise<boolean> {
  return (await ScrollShieldBridgeNative.saveTextFile(options)).saved;
}

/**
 * Hands Android's back button to `handler` while it is registered. Returns
 * the unsubscribe function; does nothing outside the native app.
 */
export function onHardwareBack(handler: () => void): () => void {
  if (!Capacitor.isNativePlatform()) return () => undefined;

  const registration = ScrollShieldBridgeNative.addListener('backButton', handler);
  return () => {
    void registration.then((handle) => handle.remove()).catch(() => undefined);
  };
}

/** Sends the app to the background, as back on the start screen does elsewhere. */
export async function minimizeApp(): Promise<void> {
  try {
    await ScrollShieldBridgeNative.minimizeApp();
  } catch {
    // Web: nothing to minimise.
  }
}

export { ScrollShieldBridgeNative as ScrollShieldBridge };
