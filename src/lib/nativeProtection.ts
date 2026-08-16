import { Capacitor, registerPlugin } from '@capacitor/core';
import { DEFAULT_APP_CONFIG } from '../types';
import type { AppConfig } from '../types';
import { normalizeProtectionConfig } from './protectionConfig';

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
  batchId: string;
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
  drainProtectionEvents(): Promise<{ batchId: string; eventsJson: string; usageJson: string }>;
  acknowledgeProtectionEvents(options: { batchId: string }): Promise<{ acknowledged: boolean }>;
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
const NATIVE_BATCH_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

const normalizeNativeBatchId = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  const normalized = value.trim();
  return NATIVE_BATCH_ID_PATTERN.test(normalized) ? normalized.toLowerCase() : '';
};

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
    const rawConfig = appsConfig[appId] ?? { id: appId, ...DEFAULT_APP_CONFIG };
    const appConfig = normalizeProtectionConfig(rawConfig);
    return {
      id: appId,
      name: APP_NAMES[appId] ?? appId,
      packages,
      active: appConfig.active,
      mode: appConfig.mode,
      delaySeconds: appConfig.openDelay,
      dailyLimitMinutes: appConfig.dailyLimit,
      sessionMinutes: appConfig.sessionLimit,
      blockHours: appConfig.blockHours.trim(),
      focusModeBehavior: appConfig.focusModeBehavior,
      timeWindows: appConfig.timeWindows,
      antiBinge: {
        enabled: appConfig.antiBinge.enabled,
        warningThreshold: appConfig.antiBinge.warningThreshold,
        warningWindowMinutes: appConfig.antiBinge.warningTimeframe,
        blockThreshold: appConfig.antiBinge.blockThreshold,
        blockWindowMinutes: appConfig.antiBinge.blockTimeframe,
      },
      emergencyUnlock: {
        enabled: appConfig.emergencyUnlock.enabled,
        durationMinutes: appConfig.emergencyUnlock.durationMinutes,
        maxPerDay: appConfig.emergencyUnlock.maxPerDay,
        requireCountdown: appConfig.emergencyUnlock.requireCountdown,
        requireReason: appConfig.emergencyUnlock.requireReason,
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
    if (!this.isAvailable()) return { batchId: '', events: [], usage: [] };
    const result = await AndroidProtection.drainProtectionEvents();
    const events = parseArray(result.eventsJson, isNativeProtectionEvent);
    const usage = parseArray(result.usageJson, isNativeUsageSample);
    const batchId = normalizeNativeBatchId(result.batchId);

    if ((events.length > 0 || usage.length > 0) && !batchId) {
      throw new Error('Android returned protection data without a valid drain batch id');
    }
    return { batchId, events, usage };
  },

  async acknowledgeDrain(batchId: string): Promise<void> {
    if (!this.isAvailable()) return;
    const normalizedBatchId = normalizeNativeBatchId(batchId);
    if (!normalizedBatchId) throw new Error('Invalid native drain batch id');
    const result = await AndroidProtection.acknowledgeProtectionEvents({ batchId: normalizedBatchId });
    if (result.acknowledged !== true) throw new Error('Android did not acknowledge the native drain batch');
  },
};
