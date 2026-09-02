/**
 * ScrollShield Native Bridge – TypeScript Interface
 * ══════════════════════════════════════════════════
 * Wraps the Capacitor ScrollShieldBridgePlugin for use in React components.
 * On web/non-Android platforms all calls return graceful fallbacks.
 *
 * Usage:
 *   import { ScrollShieldBridge } from '@/lib/nativeBridge';
 *
 *   // Check permissions
 *   const perms = await ScrollShieldBridge.getPermissionStatus();
 *   if (!perms.usageStats) {
 *     await ScrollShieldBridge.requestUsageStatsPermission();
 *   }
 *
 *   // Sync blocked apps from React state
 *   await ScrollShieldBridge.syncBlockedApps({
 *     packages: ['com.instagram.android', 'com.zhiliaoapp.musically'],
 *     monitoringEnabled: true,
 *   });
 *
 *   // Start / stop the background monitor
 *   await ScrollShieldBridge.startMonitoring();
 *   await ScrollShieldBridge.stopMonitoring();
 */

import { registerPlugin } from '@capacitor/core';

// ── Type definitions ──────────────────────────────────────────────────────────

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

export interface SyncBlockedAppsOptions {
  /** List of Android package names to monitor & block */
  packages: string[];
  /** Master switch – if false the service won't intervene */
  monitoringEnabled: boolean;
}

export interface SyncResult {
  synced: boolean;
  packageCount: number;
}

export interface OpenedResult {
  opened: boolean;
}

export interface StartedResult {
  started: boolean;
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

const ScrollShieldBridgeNative = registerPlugin<ScrollShieldBridgePlugin>(
  'ScrollShieldBridge',
  {
    // Web fallback – returns safe defaults when running in the browser / iOS simulator
    web: {
      getPermissionStatus: async (): Promise<PermissionStatus> => ({
        usageStats: false,
        overlay: false,
        notifications: Notification.permission === 'granted',
        monitoringActive: false,
      }),
      requestUsageStatsPermission: async () => ({ opened: false }),
      requestOverlayPermission: async () => ({ opened: false }),
      getForegroundApp: async () => ({ packageName: null, hasPermission: false }),
      syncBlockedApps: async (opts) => ({ synced: false, packageCount: opts.packages.length }),
      startMonitoring: async () => ({ started: false }),
      stopMonitoring: async () => ({ stopped: false }),
    },
  }
);

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

/**
 * Syncs the current active-app config from the React AppState to the native
 * monitoring service. Call this whenever appsConfig changes.
 *
 * @param appsConfig  - The appsConfig slice from AppState
 * @param allPlatforms - All known PlatformDefinitions (for package resolution)
 */
export async function syncNativeBlockList(
  appsConfig: Record<string, { active: boolean }>,
  allPlatforms: Array<{ id: string; androidPackages: string[] }>
): Promise<void> {
  const packages: string[] = [];
  for (const platform of allPlatforms) {
    const cfg = appsConfig[platform.id];
    if (cfg?.active) {
      packages.push(...platform.androidPackages);
    }
  }

  const monitoringEnabled = packages.length > 0;

  try {
    await ScrollShieldBridgeNative.syncBlockedApps({ packages, monitoringEnabled });
    if (monitoringEnabled) {
      await ScrollShieldBridgeNative.startMonitoring();
    } else {
      await ScrollShieldBridgeNative.stopMonitoring();
    }
  } catch {
    // Graceful no-op on web
  }
}

export { ScrollShieldBridgeNative as ScrollShieldBridge };
