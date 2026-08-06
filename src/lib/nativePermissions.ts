import { Capacitor, registerPlugin } from '@capacitor/core';
import type { AppPermissions } from '../types';

type AndroidPermissionStatus = Pick<
  AppPermissions,
  'usageAccess' | 'overlay' | 'notifications' | 'ignoreBatteryOptimization' | 'backgroundActivity'
>;

type AndroidPermissionKey = keyof AndroidPermissionStatus;

type NotificationPermissionResult = {
  granted: boolean;
};

interface ScrollShieldNativePlugin {
  getPermissionStatus(): Promise<AndroidPermissionStatus>;
  requestNotificationPermission(): Promise<NotificationPermissionResult>;
  openPermissionSettings(options: { permission: AndroidPermissionKey }): Promise<void>;
}

const ScrollShieldNative = registerPlugin<ScrollShieldNativePlugin>('ScrollShieldNative');

export const NativePermissions = {
  isAndroidNative(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  },

  async getAndroidStatus(): Promise<AndroidPermissionStatus | null> {
    if (!this.isAndroidNative()) return null;
    return ScrollShieldNative.getPermissionStatus();
  },

  async requestAndroidNotifications(): Promise<boolean> {
    if (!this.isAndroidNative()) return false;
    const result = await ScrollShieldNative.requestNotificationPermission();
    return result.granted;
  },

  async openAndroidSettings(permission: AndroidPermissionKey): Promise<void> {
    if (!this.isAndroidNative()) return;
    await ScrollShieldNative.openPermissionSettings({ permission });
  },
};
