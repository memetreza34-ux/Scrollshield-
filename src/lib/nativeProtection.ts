import { Capacitor, registerPlugin } from '@capacitor/core';
import type { AppConfig } from '../types';

export interface NativeProtectionEvent {
  timestamp: number;
  type: 'open' | 'block' | 'warning' | 'emergency';
  appId: string;
  desc: string;
}

interface NativeProtectionPlugin {
  syncProtectionConfig(options: { configJson: string }): Promise<void>;
  startProtectionService(): Promise<void>;
  stopProtectionService(): Promise<void>;
  getProtectionServiceStatus(): Promise<{ running: boolean }>;
  drainProtectionEvents(): Promise<{ eventsJson: string }>;
}

interface NativeProtectionConfig {
  focusMode: boolean;
  apps: Array<{
    id: string;
    name: string;
    packages: string[];
    active: boolean;
    mode: AppConfig['mode'];
    delaySeconds: number;
    sessionMinutes: number;
    focusModeBehavior: AppConfig['focusModeBehavior'];
  }>;
}

const AndroidProtection = registerPlugin<NativeProtectionPlugin>('ScrollShieldNative');

const ANDROID_PACKAGES: Record<string, string[]> = {
  instagram: ['com.instagram.android'],
  tiktok: ['com.zhiliaoapp.musically', 'com.ss.android.ugc.trill'],
  youtube: ['com.google.android.youtube'],
  facebook: ['com.facebook.katana'],
  twitter: ['com.twitter.android'],
  snapchat: ['com.snapchat.android'],
  reddit: ['com.reddit.frontpage'],
  linkedin: ['com.linkedin.android'],
  pinterest: ['com.pinterest'],
  threads: ['com.instagram.barcelona'],
  twitch: ['tv.twitch.android.app'],
  netflix: ['com.netflix.mediaclient'],
  discord: ['com.discord'],
};

const APP_NAMES: Record<string, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  facebook: 'Facebook',
  twitter: 'X',
  snapchat: 'Snapchat',
  reddit: 'Reddit',
  linkedin: 'LinkedIn',
  pinterest: 'Pinterest',
  threads: 'Threads',
  twitch: 'Twitch',
  netflix: 'Netflix',
  discord: 'Discord',
};

const EVENT_TYPES = new Set<NativeProtectionEvent['type']>(['open', 'block', 'warning', 'emergency']);

const isNativeProtectionEvent = (value: unknown): value is NativeProtectionEvent => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<NativeProtectionEvent>;
  return (
    typeof candidate.timestamp === 'number' &&
    typeof candidate.type === 'string' &&
    EVENT_TYPES.has(candidate.type as NativeProtectionEvent['type']) &&
    typeof candidate.appId === 'string' &&
    candidate.appId.length > 0 &&
    typeof candidate.desc === 'string'
  );
};

export const NativeProtection = {
  isAvailable(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  },

  async sync(appsConfig: Record<string, AppConfig>, focusMode: boolean): Promise<void> {
    if (!this.isAvailable()) return;

    const config: NativeProtectionConfig = {
      focusMode,
      apps: Object.entries(appsConfig)
        .filter(([appId, appConfig]) => appConfig.active && ANDROID_PACKAGES[appId]?.length)
        .map(([appId, appConfig]) => ({
          id: appId,
          name: APP_NAMES[appId] ?? appId,
          packages: ANDROID_PACKAGES[appId],
          active: appConfig.active,
          mode: appConfig.mode,
          delaySeconds: Math.max(0, appConfig.openDelay),
          sessionMinutes: Math.max(1, appConfig.sessionLimit ?? 5),
          focusModeBehavior: appConfig.focusModeBehavior,
        })),
    };

    await AndroidProtection.syncProtectionConfig({ configJson: JSON.stringify(config) });
  },

  async start(appsConfig: Record<string, AppConfig>, focusMode: boolean): Promise<void> {
    if (!this.isAvailable()) return;
    await this.sync(appsConfig, focusMode);
    await AndroidProtection.startProtectionService();
  },

  async stop(): Promise<void> {
    if (!this.isAvailable()) return;
    await AndroidProtection.stopProtectionService();
  },

  async getStatus(): Promise<{ running: boolean }> {
    if (!this.isAvailable()) return { running: false };
    return AndroidProtection.getProtectionServiceStatus();
  },

  async drainEvents(): Promise<NativeProtectionEvent[]> {
    if (!this.isAvailable()) return [];
    const result = await AndroidProtection.drainProtectionEvents();
    try {
      const parsed: unknown = JSON.parse(result.eventsJson);
      return Array.isArray(parsed) ? parsed.filter(isNativeProtectionEvent) : [];
    } catch {
      return [];
    }
  },
};
