import { useCallback, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import type { AppPermissions, AppState } from '../types';
import { ScrollShieldBridge } from './nativeBridge';
import { requestNotificationPermission } from './notifications';

type UpdateState = (u: Partial<AppState> | ((previous: AppState) => Partial<AppState>)) => void;

/**
 * Asking Android for permissions and reading back what it actually granted,
 * shared by the onboarding and the settings. Android grants none of these
 * programmatically: the system settings screen opens, and the status shown
 * afterwards is what Android reports when the user comes back – never a local
 * switch, which used to claim "AKTIV" for a permission the system had not
 * granted. The accessibility service is not handled here: it needs the
 * disclosure first.
 */
export function usePermissionRequests(updateState: UpdateState) {
  const [isNative, setIsNative] = useState(false);
  // Whether the protection service runs; null until Android has answered (and in the browser).
  const [monitoringActive, setMonitoringActive] = useState<boolean | null>(null);

  const refreshNativeStatus = useCallback(async () => {
    // The web fallback reports everything as false; applying it would wipe the
    // switches of the browser demo on every tab change.
    if (!Capacitor.isNativePlatform()) return;

    try {
      const status = await ScrollShieldBridge.getPermissionStatus();
      setIsNative(true);
      setMonitoringActive(status.monitoringActive);

      // Merged into the latest state, not the one this callback was created
      // with: otherwise every return from a settings screen would reset the
      // switches that only exist in ScrollShield (e.g. background activity).
      updateState((previous) => ({
        permissions: {
          ...previous.permissions,
          usageAccess: status.usageStats,
          overlay: status.overlay,
          notifications: status.notifications,
          accessibility: status.accessibility,
          backgroundActivity: status.batteryOptimizationIgnored ?? previous.permissions.backgroundActivity,
          ignoreBatteryOptimization:
            status.batteryOptimizationIgnored ?? previous.permissions.ignoreBatteryOptimization,
        },
      }));
    } catch {
      // Plugin not available on this platform – keep the locally stored switches.
    }
  }, [updateState]);

  useEffect(() => {
    void refreshNativeStatus();
  }, [refreshNativeStatus]);

  // Android sends the user to a system settings screen; pick the result up when
  // they come back.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void refreshNativeStatus();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [refreshNativeStatus]);

  const requestPermission = useCallback(
    async (key: Exclude<keyof AppPermissions, 'accessibility'>) => {
      try {
        // Notifications are a browser-level permission, not a system settings screen.
        if (key === 'notifications') {
          const granted = await requestNotificationPermission();
          updateState((previous) => ({ permissions: { ...previous.permissions, notifications: granted } }));
          return;
        }

        if (key === 'usageAccess') await ScrollShieldBridge.requestUsageStatsPermission();
        else if (key === 'overlay') await ScrollShieldBridge.requestOverlayPermission();
        else if (key === 'backgroundActivity') await ScrollShieldBridge.openBatteryOptimizationSettings();
      } catch {
        // Plugin unavailable; the status stays as Android reports it.
      }
    },
    [updateState],
  );

  return { isNative, monitoringActive, refreshNativeStatus, requestPermission };
}
