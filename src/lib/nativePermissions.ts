import { Capacitor, registerPlugin } from '@capacitor/core';
import type { AppPermissions } from '../types';

type AndroidPermissionStatus = Pick<
  AppPermissions,
  'usageAccess' | 'overlay' | 'notifications' | 'ignoreBatteryOptimization' | 'backgroundActivity'
>;

type AndroidPermissionKey = keyof AndroidPermissionStatus;

interface ScrollShieldNativePlugin {
  getPermissionStatus(): Promise<AndroidPermissionStatus>;
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

  async openAndroidSettings(permission: AndroidPermissionKey): Promise<void> {
    if (!this.isAndroidNative()) return;
    await ScrollShieldNative.openPermissionSettings({ permission });
  },
};
