import { Capacitor, registerPlugin } from '@capacitor/core';
import type { AppConfig } from '../types';

export interface NativeProtectionEvent {
  timestamp: number;
  type: 'open' | 'block' | 'warning' | 'emergency';
  appId: string;
  desc: string;
}

export interface NativeUsageSample {
  date: string;
  appId: string;
  durationMs: number;
}

export interface NativeProtectionDrain {
  events: NativeProtectionEvent[];
  usage: NativeUsageSample[];
}

export type NativeProtectionHealth =
  | 'active'
  | 'running-without-activation'
  | 'stale-activation'
  | 'stopped-with-reason'
  | 'stopped-without-reason'
  | 'never-started';

export interface NativeProtectionStatus {
  running: boolean;
  enabled: boolean;
  unavailableAppIds: string[];
  lastStartAt: number;
  lastStopAt: number;
  lastStopCode: string;
  lastStopMessage: string;
  health: NativeProtectionHealth;
}

export interface NativeProtectionStopReason {
  code: string;
  message: string;
}

interface NativeProtectionPlugin {
  syncProtectionConfig(options: { configJson: string }): Promise<{ unavailableAppIdsJson: string }>;
  startProtectionService(): Promise<void>;
  stopProtectionService(options: { reasonCode: string; reasonMessage: string }): Promise<void>;
  getProtectionServiceStatus(): Promise<{
    running: boolean;
    enabled: boolean;
    unavailableAppIdsJson: string;
    lastStartAt: number;
    lastStopAt: number;
    lastStopCode: string;
    lastStopMessage: string;
  }>;
  drainProtectionEvents(): Promise<{ eventsJson: string; usageJson: string }>;
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
    dailyLimitMinutes: number;
    sessionMinutes: number;
    blockHours: string;
    focusModeBehavior: AppConfig['focusModeBehavior'];
    timeWindows: AppConfig['timeWindows'];
    antiBinge: {
      enabled: boolean;
      warningThreshold: number;
      warningWindowMinutes: number;
      blockThreshold: number;
      blockWindowMinutes: number;
    };
    emergencyUnlock: {
      enabled: boolean;
      durationMinutes: number;
      maxPerDay: number;
      requireCountdown: boolean;
      requireReason: boolean;
    };
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

const DEFAULT_TIME_WINDOWS: AppConfig['timeWindows'] = {
  morningRules: 'normal',
  workRules: 'normal',
  eveningRules: 'normal',
  nightRules: 'normal',
  weekendRules: 'normal',
};

const DEFAULT_STOP_REASON: NativeProtectionStopReason = {
  code: 'manual_app_stop',
  message: 'Der Android-Schutz wurde in ScrollShield manuell gestoppt',
};

const EMPTY_STATUS: NativeProtectionStatus = {
  running: false,
  enabled: false,
  unavailableAppIds: [],
  lastStartAt: 0,
  lastStopAt: 0,
  lastStopCode: '',
  lastStopMessage: '',
  health: 'never-started',
};

const EVENT_TYPES = new Set<NativeProtectionEvent['type']>(['open', 'block', 'warning', 'emergency']);
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isNativeProtectionEvent = (value: unknown): value is NativeProtectionEvent => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<NativeProtectionEvent>;
  return (
    typeof candidate.timestamp === 'number' &&
    Number.isFinite(candidate.timestamp) &&
    typeof candidate.type === 'string' &&
    EVENT_TYPES.has(candidate.type as NativeProtectionEvent['type']) &&
    typeof candidate.appId === 'string' &&
    candidate.appId.length > 0 &&
    typeof candidate.desc === 'string'
  );
};

const isNativeUsageSample = (value: unknown): value is NativeUsageSample => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<NativeUsageSample>;
  return (
    typeof candidate.date === 'string' &&
    DATE_KEY_PATTERN.test(candidate.date) &&
    typeof candidate.appId === 'string' &&
    candidate.appId.length > 0 &&
    typeof candidate.durationMs === 'number' &&
    Number.isFinite(candidate.durationMs) &&
    candidate.durationMs > 0
  );
};

const parseArray = <T>(raw: string, predicate: (value: unknown) => value is T): T[] => {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(predicate) : [];
  } catch {
    return [];
  }
};

const parseStringArray = (raw: string): string[] => {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? [...new Set(parsed.filter((value): value is string => typeof value === 'string' && value.length > 0))]
      : [];
  } catch {
    return [];
  }
};

const normalizeTimestamp = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;

const normalizeDiagnosticText = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

export const assessNativeProtectionHealth = (status: {
  running: boolean;
  enabled: boolean;
  lastStartAt: number;
  lastStopAt: number;
  lastStopCode: string;
  lastStopMessage: string;
}): NativeProtectionHealth => {
  if (status.running && status.enabled) return 'active';
  if (status.running && !status.enabled) return 'running-without-activation';
  if (!status.running && status.enabled) return 'stale-activation';
  if (status.lastStopAt > 0 && (status.lastStopCode.length > 0 || status.lastStopMessage.length > 0)) {
    return 'stopped-with-reason';
  }
  if (status.lastStartAt > 0) return 'stopped-without-reason';
  return 'never-started';
};

const buildConfig = (appsConfig: Record<string, AppConfig>, focusMode: boolean): NativeProtectionConfig => ({
  focusMode,
  apps: Object.entries(ANDROID_PACKAGES).map(([appId, packages]) => {
    const appConfig = appsConfig[appId];
    return {
      id: appId,
      name: APP_NAMES[appId] ?? appId,
      packages,
      active: appConfig?.active ?? false,
      mode: appConfig?.mode ?? 'standard',
      delaySeconds: Math.max(0, appConfig?.openDelay ?? 10),
      dailyLimitMinutes: Math.max(0, appConfig?.dailyLimit ?? 0),
      sessionMinutes: Math.max(1, appConfig?.sessionLimit ?? 5),
      blockHours: appConfig?.blockHours?.trim() ?? '',
      focusModeBehavior: appConfig?.focusModeBehavior ?? 'warn',
      timeWindows: {
        ...DEFAULT_TIME_WINDOWS,
        ...appConfig?.timeWindows,
      },
      antiBinge: {
        enabled: appConfig?.antiBinge.enabled ?? false,
        warningThreshold: Math.max(1, appConfig?.antiBinge.warningThreshold ?? 3),
        warningWindowMinutes: Math.max(1, appConfig?.antiBinge.warningTimeframe ?? 10),
        blockThreshold: Math.max(1, appConfig?.antiBinge.blockThreshold ?? 5),
        blockWindowMinutes: Math.max(1, appConfig?.antiBinge.blockTimeframe ?? 20),
      },
      emergencyUnlock: {
        enabled: appConfig?.emergencyUnlock.enabled ?? false,
        durationMinutes: Math.max(1, appConfig?.emergencyUnlock.durationMinutes ?? 5),
        maxPerDay: Math.max(0, appConfig?.emergencyUnlock.maxPerDay ?? 0),
        requireCountdown: appConfig?.emergencyUnlock.requireCountdown ?? true,
        requireReason: appConfig?.emergencyUnlock.requireReason ?? true,
      },
    };
  }),
});

export const NativeProtection = {
  isAvailable(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  },

  async sync(appsConfig: Record<string, AppConfig>, focusMode: boolean): Promise<string[]> {
    if (!this.isAvailable()) return [];
    const result = await AndroidProtection.syncProtectionConfig({
      configJson: JSON.stringify(buildConfig(appsConfig, focusMode)),
    });
    return parseStringArray(result.unavailableAppIdsJson);
  },

  async start(appsConfig: Record<string, AppConfig>, focusMode: boolean): Promise<void> {
    if (!this.isAvailable()) return;
    await this.sync(appsConfig, focusMode);
    await AndroidProtection.startProtectionService();
  },

  async stop(reason: NativeProtectionStopReason = DEFAULT_STOP_REASON): Promise<void> {
    if (!this.isAvailable()) return;
    await AndroidProtection.stopProtectionService({
      reasonCode: reason.code.trim() || DEFAULT_STOP_REASON.code,
      reasonMessage: reason.message.trim() || DEFAULT_STOP_REASON.message,
    });
  },

  async getStatus(): Promise<NativeProtectionStatus> {
    if (!this.isAvailable()) return { ...EMPTY_STATUS, unavailableAppIds: [] };
    const result = await AndroidProtection.getProtectionServiceStatus();
    const statusWithoutHealth = {
      running: result.running === true,
      enabled: result.enabled === true,
      unavailableAppIds: parseStringArray(result.unavailableAppIdsJson),
      lastStartAt: normalizeTimestamp(result.lastStartAt),
      lastStopAt: normalizeTimestamp(result.lastStopAt),
      lastStopCode: normalizeDiagnosticText(result.lastStopCode),
      lastStopMessage: normalizeDiagnosticText(result.lastStopMessage),
    };
    return {
      ...statusWithoutHealth,
      health: assessNativeProtectionHealth(statusWithoutHealth),
    };
  },

  async drain(): Promise<NativeProtectionDrain> {
    if (!this.isAvailable()) return { events: [], usage: [] };
    const result = await AndroidProtection.drainProtectionEvents();
    return {
      events: parseArray(result.eventsJson, isNativeProtectionEvent),
      usage: parseArray(result.usageJson, isNativeUsageSample),
    };
  },
};