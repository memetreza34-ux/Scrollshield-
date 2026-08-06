import { Capacitor, registerPlugin } from '@capacitor/core';

export interface NativeDiagnosticsSnapshot {
  capturedAt: number;
  manufacturer: string;
  brand: string;
  model: string;
  device: string;
  androidRelease: string;
  sdkInt: number;
  packageName: string;
  versionName: string;
  versionCode: number;
  locale: string;
  timeZone: string;
  usageAccess: boolean;
  overlay: boolean;
  appNotificationsEnabled: boolean;
  protectionChannelCreated: boolean;
  protectionChannelEnabled: boolean;
  notifications: boolean;
  batteryOptimizationExempt: boolean;
  protectionEnabled: boolean;
  serviceRunning: boolean;
  configuredInstalledApps: boolean;
  lastProtectionStartAt: number;
  lastProtectionStopAt: number;
  lastProtectionStopCode: string;
  lastProtectionStopMessage: string;
}

interface NativeDiagnosticsPlugin {
  getSnapshot(): Promise<NativeDiagnosticsSnapshot>;
}

const AndroidDiagnostics = registerPlugin<NativeDiagnosticsPlugin>('ScrollShieldDiagnostics');

export const NativeDiagnostics = {
  isAvailable(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  },

  async getSnapshot(): Promise<NativeDiagnosticsSnapshot | null> {
    if (!this.isAvailable()) return null;
    return AndroidDiagnostics.getSnapshot();
  },
};
