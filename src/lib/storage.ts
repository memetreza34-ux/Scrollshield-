import type { AppState, HistoryEvent } from '../types';
import { DEFAULT_STATE } from '../types';
import { normalizeAppState } from './state';

const STORAGE_PREFIX = 'scrollshield_';
const VERSION = 3;
const PENDING_SUFFIX = '_pending';
const LEGACY_ARCHIVE_KEY = `${STORAGE_PREFIX}legacy_v07_archive_v1`;

const LEGACY_MONOLITHIC_KEYS = ['scrollshield_state_v2', 'scrollshield_state'] as const;
const LEGACY_V07_KEYS = [
  'scrollshield_brainState',
  'scrollshield_events',
  'scrollshield_rules',
  'scrollshield_game',
  'scrollshield_installed_at',
  'scrollshield_backup_v15',
] as const;

interface StorageKeys {
  SETTINGS: string;
  STATS: string;
  HISTORY: string;
  PROFILES: string;
  META: string;
}

const KEYS: StorageKeys = {
  SETTINGS: `${STORAGE_PREFIX}settings_v${VERSION}`,
  STATS: `${STORAGE_PREFIX}stats_v${VERSION}`,
  HISTORY: `${STORAGE_PREFIX}history_v${VERSION}`,
  PROFILES: `${STORAGE_PREFIX}profiles_v${VERSION}`,
  META: `${STORAGE_PREFIX}meta_v${VERSION}`,
};

const CURRENT_KEYS = [KEYS.SETTINGS, KEYS.PROFILES, KEYS.STATS, KEYS.HISTORY, KEYS.META] as const;

type LegacyArchiveSource = {
  source: string;
  capturedAt: string;
  rawEntries: Record<string, string>;
};

export type LegacyStorageArchive = {
  schemaVersion: 1;
  sources: LegacyArchiveSource[];
};

type LegacyImpulseEvent = {
  id?: unknown;
  appName?: unknown;
  timestamp?: unknown;
  delayDurationSeconds?: unknown;
  outcome?: unknown;
  reflectionResponse?: unknown;
  vulnerabilityScoreAtTime?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const obfuscate = (data: string): string => {
  try {
    const encoded = encodeURIComponent(data);
    let obfuscated = '';
    for (let index = 0; index < encoded.length; index += 1) {
      obfuscated += String.fromCharCode(encoded.charCodeAt(index) ^ 42);
    }
    return btoa(obfuscated);
  } catch (error) {
    console.error('Obfuscation failed', error);
    return btoa(encodeURIComponent(data));
  }
};

const deobfuscate = (data: string): string | null => {
  try {
    const decoded = atob(data);
    let deobfuscated = '';
    for (let index = 0; index < decoded.length; index += 1) {
      deobfuscated += String.fromCharCode(decoded.charCodeAt(index) ^ 42);
    }
    return decodeURIComponent(deobfuscated);
  } catch (error) {
    console.error('Deobfuscation failed', error);
    try {
      return decodeURIComponent(atob(data));
    } catch (fallbackError) {
      console.error('Fallback deobfuscation failed', fallbackError);
      return null;
    }
  }
};

const parseJson = <T>(raw: string | null): T | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const parseStoredChunk = <T>(raw: string | null, encoded = false): T | null => {
  if (!raw) return null;
  const decoded = encoded ? deobfuscate(raw) : raw;
  return decoded ? parseJson<T>(decoded) : null;
};

const pendingKey = (key: string) => `${key}${PENDING_SUFFIX}`;

const buildStateEntries = (state: AppState, migrationSource?: string): Array<[string, string]> => {
  const settingsData = {
    settings: state.settings,
    permissions: state.permissions,
    hasCompletedOnboarding: state.hasCompletedOnboarding,
    activeProtectionLevel: state.activeProtectionLevel,
    isFocusModeActive: state.isFocusModeActive,
    focusTimeRemaining: state.focusTimeRemaining,
    activeSession: state.activeSession,
  };
  const profilesData = {
    profiles: state.profiles,
    activeProfileId: state.activeProfileId,
    appsConfig: state.appsConfig,
  };
  const statsData = {
    stats: state.stats,
    dailyStats: state.dailyStats,
  };
  const historyData = {
    history: state.history.slice(0, 100),
    focusSessions: state.focusSessions.slice(0, 50),
  };
  const metaData = {
    version: VERSION,
    lastSaved: Date.now(),
    ...(migrationSource ? { migrationSource } : {}),
  };

  return [
    [KEYS.SETTINGS, obfuscate(JSON.stringify(settingsData))],
    [KEYS.PROFILES, obfuscate(JSON.stringify(profilesData))],
    [KEYS.STATS, JSON.stringify(statsData)],
    [KEYS.HISTORY, JSON.stringify(historyData)],
    [KEYS.META, JSON.stringify(metaData)],
  ];
};

const removePendingEntries = () => {
  for (const key of CURRENT_KEYS) localStorage.removeItem(pendingKey(key));
};

const recoverPendingTransaction = () => {
  const pending = CURRENT_KEYS.map((key) => [key, localStorage.getItem(pendingKey(key))] as const);
  const present = pending.filter(([, value]) => value !== null).length;
  if (present === 0) return;

  if (present !== pending.length) {
    removePendingEntries();
    return;
  }

  try {
    for (const [key, value] of pending) {
      localStorage.setItem(key, value as string);
      if (localStorage.getItem(key) !== value) throw new Error(`Could not recover ${key}`);
    }
    removePendingEntries();
  } catch (error) {
    console.error('Failed to recover pending storage transaction', error);
  }
};

const saveStateInternal = (state: AppState, migrationSource?: string): boolean => {
  try {
    const entries = buildStateEntries(state, migrationSource);
    removePendingEntries();

    for (const [key, value] of entries) {
      const stagedKey = pendingKey(key);
      localStorage.setItem(stagedKey, value);
      if (localStorage.getItem(stagedKey) !== value) throw new Error(`Could not stage ${key}`);
    }

    for (const [key, value] of entries) {
      localStorage.setItem(key, value);
      if (localStorage.getItem(key) !== value) throw new Error(`Could not commit ${key}`);
    }

    removePendingEntries();
    return true;
  } catch (error) {
    console.error('Failed to save state to local storage', error);
    return false;
  }
};

const loadCurrentState = (): Partial<AppState> | null => {
  let reconstructedState: Partial<AppState> = {};
  const chunks: Array<[string, boolean, string]> = [
    [KEYS.SETTINGS, true, 'settings'],
    [KEYS.PROFILES, true, 'profiles'],
    [KEYS.STATS, false, 'stats'],
    [KEYS.HISTORY, false, 'history'],
  ];

  for (const [key, encoded, label] of chunks) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    const parsed = parseStoredChunk<Partial<AppState>>(raw, encoded);
    if (parsed) reconstructedState = { ...reconstructedState, ...parsed };
    else console.error(`Corrupted ${label} data, falling back to defaults`);
  }

  return Object.keys(reconstructedState).length > 0 ? reconstructedState : null;
};

const archiveLegacyEntries = (source: string, rawEntries: Record<string, string>): boolean => {
  try {
    const existing = parseJson<LegacyStorageArchive>(localStorage.getItem(LEGACY_ARCHIVE_KEY));
    const archive: LegacyStorageArchive =
      existing?.schemaVersion === 1 && Array.isArray(existing.sources)
        ? existing
        : { schemaVersion: 1, sources: [] };
    const nextSource: LegacyArchiveSource = {
      source,
      capturedAt: new Date().toISOString(),
      rawEntries,
    };
    const nextArchive: LegacyStorageArchive = {
      schemaVersion: 1,
      sources: [...archive.sources.filter((entry) => entry.source !== source), nextSource],
    };
    const serialized = JSON.stringify(nextArchive);
    localStorage.setItem(LEGACY_ARCHIVE_KEY, serialized);
    return localStorage.getItem(LEGACY_ARCHIVE_KEY) === serialized;
  } catch (error) {
    console.error('Failed to archive legacy ScrollShield data', error);
    return false;
  }
};

const parseLegacyTimestamp = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (typeof value !== 'string') return fallback;

  const parsed = Date.parse(value);
  if (Number.isFinite(parsed)) return parsed;

  const timeMatch = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!timeMatch) return fallback;
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  if (hour > 23 || minute > 59) return fallback;
  const date = new Date(fallback);
  date.setHours(hour, minute, 0, 0);
  return date.getTime();
};

const getLocalDateKey = (timestamp: number): string => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const mapLegacyAppId = (appName: unknown): string | undefined => {
  if (typeof appName !== 'string') return undefined;
  const normalized = appName.trim().toLowerCase();
  if (normalized.includes('instagram')) return 'instagram';
  if (normalized.includes('tiktok')) return 'tiktok';
  if (normalized.includes('youtube')) return 'youtube';
  if (normalized.includes('facebook')) return 'facebook';
  if (normalized.includes('snapchat')) return 'snapchat';
  if (normalized === 'x' || normalized.includes('twitter')) return 'x';
  return undefined;
};

const mapLegacyEvent = (event: LegacyImpulseEvent, index: number, migratedAt: number): HistoryEvent => {
  const outcome = typeof event.outcome === 'string' ? event.outcome : 'unknown';
  const type: HistoryEvent['type'] =
    outcome === 'delayed_opened'
      ? 'open'
      : outcome === 'emergency_unlocked'
        ? 'emergency'
        : outcome === 'blocked' || outcome === 'reflection_canceled'
          ? 'block'
          : 'warning';
  const appName = typeof event.appName === 'string' ? event.appName : 'Legacy-App';
  const descriptions: Record<string, string> = {
    blocked: `${appName} wurde im früheren ScrollShield blockiert.`,
    delayed_opened: `${appName} wurde nach einer früheren Öffnungspause geöffnet.`,
    emergency_unlocked: `${appName} wurde über eine frühere Notfallfreigabe geöffnet.`,
    reflection_canceled: `${appName} wurde nach einer Reflexionspause nicht geöffnet.`,
  };

  return {
    id: typeof event.id === 'string' ? `legacy-${event.id}` : `legacy-v07-${migratedAt}-${index}`,
    timestamp: parseLegacyTimestamp(event.timestamp, migratedAt - index),
    type,
    appId: mapLegacyAppId(event.appName),
    desc: descriptions[outcome] ?? `Früheres ScrollShield-Ereignis für ${appName} wurde übernommen.`,
    trigger: 'V0.7-Datenmigration',
    metadata: {
      source: 'legacy_v07',
      original: event,
    },
  };
};

const readRawEntries = (keys: readonly string[]): Record<string, string> => {
  const entries: Record<string, string> = {};
  for (const key of keys) {
    const value = localStorage.getItem(key);
    if (value !== null) entries[key] = value;
  }
  return entries;
};

const migrateMonolithicState = (): Partial<AppState> | null => {
  for (const key of LEGACY_MONOLITHIC_KEYS) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    const parsed = parseJson<Partial<AppState>>(raw);
    if (!parsed || !isRecord(parsed)) {
      console.error(`Legacy state ${key} is corrupted and was retained unchanged`);
      continue;
    }

    const normalized = normalizeAppState(parsed);
    const archived = archiveLegacyEntries(key, { [key]: raw });
    if (!saveStateInternal(normalized, key)) return null;
    const verified = loadCurrentState();
    if (!verified) return null;
    if (archived) localStorage.removeItem(key);
    return normalized;
  }
  return null;
};

const migrateV07State = (): Partial<AppState> | null => {
  const rawEntries = readRawEntries(LEGACY_V07_KEYS);
  if (Object.keys(rawEntries).length === 0) return null;

  const migratedAt = Date.now();
  const brainState = parseJson<Record<string, unknown>>(rawEntries.scrollshield_brainState ?? null);
  const parsedEvents = parseJson<unknown>(rawEntries.scrollshield_events ?? null);
  const parsedRules = parseJson<unknown>(rawEntries.scrollshield_rules ?? null);
  const legacyEvents: LegacyImpulseEvent[] = Array.isArray(parsedEvents)
    ? parsedEvents.filter(isRecord).map((event) => event as LegacyImpulseEvent)
    : [];
  const legacyRules = Array.isArray(parsedRules) ? parsedRules : [];
  const history = legacyEvents.slice(0, 99).map((event, index) => mapLegacyEvent(event, index, migratedAt));
  history.unshift({
    id: `legacy-v07-migration-${migratedAt}`,
    timestamp: migratedAt,
    type: 'rule_change',
    desc: `${legacyEvents.length} frühere Ereignisse und ${legacyRules.length} frühere Regeln wurden archiviert. Alte Regeln wurden aus Sicherheitsgründen nicht automatisch aktiviert.`,
    trigger: 'V0.7-Datenmigration',
    metadata: { source: 'legacy_v07_migration' },
  });

  const savedTimeValue = brainState?.savedTimeMinutesToday;
  const savedTime =
    typeof savedTimeValue === 'number' && Number.isFinite(savedTimeValue) ? Math.max(0, savedTimeValue) : 0;
  const blockedOpens = legacyEvents.filter(
    (event) => event.outcome === 'blocked' || event.outcome === 'reflection_canceled',
  ).length;
  const dateKey = getLocalDateKey(migratedAt);
  const normalized = normalizeAppState({
    hasCompletedOnboarding: true,
    history,
    stats: {
      ...DEFAULT_STATE.stats,
      totalSavedTime: Math.max(DEFAULT_STATE.stats.totalSavedTime, savedTime),
    },
    dailyStats: {
      [dateKey]: {
        date: dateKey,
        usageMinutes: {},
        blockedOpens,
        savedTimeMinutes: savedTime,
        emergencyUnlocks: legacyEvents.filter((event) => event.outcome === 'emergency_unlocked').length,
        focusMinutes: 0,
      },
    },
  });

  const archived = archiveLegacyEntries('legacy_v07_pro', rawEntries);
  if (!saveStateInternal(normalized, 'legacy_v07_pro')) return null;
  const verified = loadCurrentState();
  if (!verified) return null;
  if (archived) {
    for (const key of Object.keys(rawEntries)) localStorage.removeItem(key);
  }
  return normalized;
};

export const StorageService = {
  saveState: (state: AppState): boolean => saveStateInternal(state),

  loadState: (): Partial<AppState> | null => {
    try {
      recoverPendingTransaction();
      const meta = parseJson<{ version?: number }>(localStorage.getItem(KEYS.META));
      if (meta?.version === VERSION) {
        const current = loadCurrentState();
        if (current) return current;
      }

      const migrated = migrateMonolithicState() ?? migrateV07State();
      if (migrated) return migrated;

      const orphaned = loadCurrentState();
      if (!orphaned) return null;
      const normalized = normalizeAppState(orphaned);
      saveStateInternal(normalized, 'orphaned_v3_recovery');
      return normalized;
    } catch (error) {
      console.error('Fatal error loading state from local storage', error);
      return null;
    }
  },

  clearState: () => {
    try {
      Object.keys(localStorage)
        .filter((key) => key.startsWith(STORAGE_PREFIX))
        .forEach((key) => localStorage.removeItem(key));
      for (const key of LEGACY_MONOLITHIC_KEYS) localStorage.removeItem(key);
      for (const key of LEGACY_V07_KEYS) localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to clear local storage', error);
    }
  },

  migrateFromV2: (): Partial<AppState> | null => migrateMonolithicState(),

  getLegacyArchive: (): LegacyStorageArchive | null =>
    parseJson<LegacyStorageArchive>(localStorage.getItem(LEGACY_ARCHIVE_KEY)),
};
