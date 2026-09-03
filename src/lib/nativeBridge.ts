/**
 * ScrollShield Native Bridge – TypeScript Interface
 * ══════════════════════════════════════════════════
 * Wraps the Capacitor ScrollShieldBridgePlugin for use in React components.
 * On web/non-Android platforms all calls return graceful fallbacks.
 *
 * The native layer only ever sees the resulting per-app rule (mode + delay).
 * Daily limits, anti-binge windows and emergency unlocks stay in the web
 * layer; see src/lib/protectionRules.ts.
 *
 * Usage:
 *   import { ScrollShieldBridge } from '@/lib/nativeBridge';
 *
 *   const perms = await ScrollShieldBridge.getPermissionStatus();
 *   if (!perms.usageStats) {
 *     await ScrollShieldBridge.requestUsageStatsPermission();
 *   }
 */

import { registerPlugin } from '@capacitor/core';

// ── Type definitions ──────────────────────────────────────────────────────────

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
}

export interface ForegroundAppResult {
  /** Package name of the current foreground app, or null */
  packageName: string | null;
  /** False if Usage Access permission is missing */
  hasPermission: boolean;
}

export interface NativeProtectionRule {
  /** Android package name to watch */
  packageName: string;
  /** How the native overlay should behave for this package */
  mode: NativeProtectionMode;
  /** Countdown length before the app may be opened (standard mode) */
  delaySeconds: number;
}

export interface SyncBlockedAppsOptions {
  /** One entry per protected Android package */
  rules: NativeProtectionRule[];
  /** Master switch – if false the service won't intervene */
  monitoringEnabled: boolean;
}

export interface SyncResult {
  synced: boolean;
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

// ── Plugin interface ──────────────────────────────────────────────────────────

export interface ScrollShieldBridgePlugin {
  getPermissionStatus(): Promise<PermissionStatus>;
  requestUsageStatsPermission(): Promise<OpenedResult>;
  requestOverlayPermission(): Promise<OpenedResult>;
  getForegroundApp(): Promise<ForegroundAppResult>;
  syncBlockedApps(options: SyncBlockedAppsOptions): Promise<SyncResult>;
  startMonitoring(): Promise<StartedResult>;
  stopMonitoring(): Promise<StoppedResult>;
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
    }),
    requestUsageStatsPermission: async () => ({ opened: false }),
    requestOverlayPermission: async () => ({ opened: false }),
    getForegroundApp: async () => ({ packageName: null, hasPermission: false }),
    syncBlockedApps: async (options: SyncBlockedAppsOptions) => ({
      synced: false,
      ruleCount: options.rules.length,
    }),
    startMonitoring: async () => ({ started: false, overlayGranted: false }),
    stopMonitoring: async () => ({ stopped: false }),
  },
});

// ── High-level helper API ─────────────────────────────────────────────────────

/**
 * Checks which permissions are still missing for full native protection.
 * Returns an array of human-readable permission names that need to be granted.
 */
export async function getMissingPermissions(): Promise<string[]> {
  const missing: string[] = [];
  try {
    const status = await ScrollShieldBridgeNative.getPermissionStatus();
    if (!status.usageStats) missing.push('Nutzungsdaten-Zugriff');
    if (!status.overlay) missing.push('Über anderen Apps einblenden');
    if (!status.notifications) missing.push('Benachrichtigungen');
  } catch {
    // Running on web – all "missing"
    missing.push('Nutzungsdaten-Zugriff', 'Über anderen Apps einblenden');
  }
  return missing;
}

type AppConfigSlice = {
  active: boolean;
  mode: NativeProtectionMode;
  openDelay: number;
  focusModeBehavior?: 'allow' | 'warn' | 'block';
};

type PlatformSlice = { id: string; androidPackages: string[] };

/**
 * Translates the web-side app configuration into the flat rule list the
 * native monitor understands. One entry per Android package, so alternative
 * package names (lite/go builds) are covered too.
 *
 * Focus mode is folded in here: an app configured to be blocked during focus
 * sessions is handed down as `strict` while a session is running.
 */
export function buildNativeProtectionRules(
  appsConfig: Record<string, AppConfigSlice | undefined>,
  platforms: PlatformSlice[],
  options: { isFocusModeActive?: boolean } = {},
): NativeProtectionRule[] {
  const rules: NativeProtectionRule[] = [];
  const seen = new Set<string>();

  for (const platform of platforms) {
    const config = appsConfig[platform.id];
    if (!config?.active) continue;

    const mode: NativeProtectionMode =
      options.isFocusModeActive && config.focusModeBehavior === 'block' ? 'strict' : config.mode;

    for (const packageName of platform.androidPackages) {
      if (seen.has(packageName)) continue;
      seen.add(packageName);
      rules.push({
        packageName,
        mode,
        delaySeconds: Math.max(0, Math.round(config.openDelay ?? 0)),
      });
    }
  }

  return rules;
}

/**
 * Syncs the current app configuration to the native monitoring service.
 * Call this whenever appsConfig or the focus session state changes.
 */
export async function syncNativeBlockList(
  appsConfig: Record<string, AppConfigSlice | undefined>,
  allPlatforms: PlatformSlice[],
  options: { isFocusModeActive?: boolean } = {},
): Promise<void> {
  const rules = buildNativeProtectionRules(appsConfig, allPlatforms, options);
  const monitoringEnabled = rules.length > 0;

  try {
    await ScrollShieldBridgeNative.syncBlockedApps({ rules, monitoringEnabled });
    if (monitoringEnabled) {
      await ScrollShieldBridgeNative.startMonitoring();
    } else {
      await ScrollShieldBridgeNative.stopMonitoring();
    }
  } catch {
    // Graceful no-op on web and whenever a permission is still missing.
  }
}

export { ScrollShieldBridgeNative as ScrollShieldBridge };
