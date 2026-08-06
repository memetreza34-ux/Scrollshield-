import type { AppState, HistoryEvent } from '../types';
import { DEFAULT_STATE } from '../types';

const LEGACY_ARCHIVE_KEY = 'scrollshield_legacy_v07_archive_v1';

export type LegacyStorageArchive = {
  schemaVersion: 1;
  sources: Array<{
    source: string;
    capturedAt: string;
    rawEntries: Record<string, string>;
  }>;
};

export type ScrollShieldExport = {
  schemaVersion: 1;
  app: 'ScrollShield';
  exportedAt: string;
  appVersion: string;
  legacyArchive?: LegacyStorageArchive;
  state: Pick<
    AppState,
    | 'appsConfig'
    | 'activeProtectionLevel'
    | 'goals'
    | 'history'
    | 'focusSessions'
    | 'dailyStats'
    | 'stats'
    | 'profiles'
    | 'activeProfileId'
    | 'operatingSystem'
    | 'permissions'
    | 'settings'
  >;
};

type LegacyV07ImpulseEvent = {
  id?: unknown;
  appName?: unknown;
  timestamp?: unknown;
  outcome?: unknown;
};

type LegacyV07Backup = {
  appVersion?: unknown;
  schemaVersion: number;
  exportedAt?: unknown;
  brainState?: unknown;
  impulseEvents: unknown[];
  aiRules: unknown[];
  userGamification?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isLegacyArchive = (value: unknown): value is LegacyStorageArchive => {
  if (!isRecord(value) || value.schemaVersion !== 1 || !Array.isArray(value.sources)) return false;
  return value.sources.every(
    (source) =>
      isRecord(source) &&
      typeof source.source === 'string' &&
      typeof source.capturedAt === 'string' &&
      isRecord(source.rawEntries) &&
      Object.values(source.rawEntries).every((entry) => typeof entry === 'string'),
  );
};

const isLegacyV07Backup = (value: unknown): value is LegacyV07Backup =>
  isRecord(value) &&
  typeof value.schemaVersion === 'number' &&
  Number.isFinite(value.schemaVersion) &&
  value.schemaVersion >= 1 &&
  Array.isArray(value.impulseEvents) &&
  Array.isArray(value.aiRules) &&
  (value.brainState === undefined || value.brainState === null || isRecord(value.brainState)) &&
  (value.userGamification === undefined || value.userGamification === null || isRecord(value.userGamification));

const readLegacyArchive = (): LegacyStorageArchive | undefined => {
  const raw = localStorage.getItem(LEGACY_ARCHIVE_KEY);
  if (!raw) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isLegacyArchive(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

const restoreLegacyArchive = (archive: LegacyStorageArchive) => {
  const serialized = JSON.stringify(archive);
  localStorage.setItem(LEGACY_ARCHIVE_KEY, serialized);
  if (localStorage.getItem(LEGACY_ARCHIVE_KEY) !== serialized) {
    throw new Error('Das frühere V0.7-Datenarchiv konnte nicht lokal wiederhergestellt werden.');
  }
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

const parseLegacyTimestamp = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (typeof value !== 'string') return fallback;
  const parsed = Date.parse(value);
  if (Number.isFinite(parsed)) return parsed;
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return fallback;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return fallback;
  const date = new Date(fallback);
  date.setHours(hour, minute, 0, 0);
  return date.getTime();
};

const mapLegacyBackupEvent = (
  event: LegacyV07ImpulseEvent,
  index: number,
  importedAt: number,
): HistoryEvent => {
  const outcome = typeof event.outcome === 'string' ? event.outcome : 'unknown';
  const appName = typeof event.appName === 'string' ? event.appName : 'Legacy-App';
  const type: HistoryEvent['type'] =
    outcome === 'delayed_opened'
      ? 'open'
      : outcome === 'emergency_unlocked'
        ? 'emergency'
        : outcome === 'blocked' || outcome === 'reflection_canceled'
          ? 'block'
          : 'warning';
  const descriptions: Record<string, string> = {
    blocked: `${appName} wurde im früheren ScrollShield blockiert.`,
    delayed_opened: `${appName} wurde nach einer früheren Öffnungspause geöffnet.`,
    emergency_unlocked: `${appName} wurde über eine frühere Notfallfreigabe geöffnet.`,
    reflection_canceled: `${appName} wurde nach einer Reflexionspause nicht geöffnet.`,
  };
  return {
    id: typeof event.id === 'string' ? `legacy-file-${event.id}` : `legacy-file-${importedAt}-${index}`,
    timestamp: parseLegacyTimestamp(event.timestamp, importedAt - index),
    type,
    appId: mapLegacyAppId(event.appName),
    desc: descriptions[outcome] ?? `Früheres ScrollShield-Ereignis für ${appName} wurde importiert.`,
    trigger: 'V0.7-Backupimport',
    metadata: { source: 'legacy_v07_backup_file', original: event },
  };
};

const convertLegacyV07Backup = (backup: LegacyV07Backup, raw: string): ScrollShieldExport => {
  const importedAt = Date.now();
  const events = backup.impulseEvents.filter(isRecord) as LegacyV07ImpulseEvent[];
  const history = events.slice(0, 99).map((event, index) => mapLegacyBackupEvent(event, index, importedAt));
  history.unshift({
    id: `legacy-file-import-${importedAt}`,
    timestamp: importedAt,
    type: 'rule_change',
    desc: `${events.length} frühere Ereignisse und ${backup.aiRules.length} frühere Regeln wurden aus einem V0.7-Backup übernommen. Alte Regeln wurden aus Sicherheitsgründen nicht automatisch aktiviert.`,
    trigger: 'V0.7-Backupimport',
    metadata: { source: 'legacy_v07_backup_file_import' },
  });

  const brainState = isRecord(backup.brainState) ? backup.brainState : undefined;
  const savedTimeValue = brainState?.savedTimeMinutesToday;
  const savedTime =
    typeof savedTimeValue === 'number' && Number.isFinite(savedTimeValue) ? Math.max(0, savedTimeValue) : 0;
  const dateKey = getLocalDateKey(importedAt);
  const convertedState: AppState = {
    ...DEFAULT_STATE,
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
        blockedOpens: events.filter(
          (event) => event.outcome === 'blocked' || event.outcome === 'reflection_canceled',
        ).length,
        savedTimeMinutes: savedTime,
        emergencyUnlocks: events.filter((event) => event.outcome === 'emergency_unlocked').length,
        focusMinutes: 0,
      },
    },
  };
  const converted = createScrollShieldExport(convertedState, {
    exportedAt:
      typeof backup.exportedAt === 'string' && Number.isFinite(Date.parse(backup.exportedAt))
        ? new Date(backup.exportedAt)
        : new Date(importedAt),
    appVersion: typeof backup.appVersion === 'string' ? backup.appVersion : 'legacy-v0.7',
  });
  converted.legacyArchive = {
    schemaVersion: 1,
    sources: [
      {
        source: 'legacy_v07_backup_file',
        capturedAt: new Date(importedAt).toISOString(),
        rawEntries: { scrollshield_backup_v15_file: raw },
      },
    ],
  };
  return converted;
};

export const createScrollShieldExport = (
  state: AppState,
  options: { exportedAt?: Date; appVersion?: string } = {},
): ScrollShieldExport => ({
  schemaVersion: 1,
  app: 'ScrollShield',
  exportedAt: (options.exportedAt ?? new Date()).toISOString(),
  appVersion: options.appVersion ?? 'unknown',
  legacyArchive: readLegacyArchive(),
  state: {
    appsConfig: state.appsConfig,
    activeProtectionLevel: state.activeProtectionLevel,
    goals: state.goals,
    history: state.history,
    focusSessions: state.focusSessions,
    dailyStats: state.dailyStats,
    stats: state.stats,
    profiles: state.profiles,
    activeProfileId: state.activeProfileId,
    operatingSystem: state.operatingSystem,
    permissions: state.permissions,
    settings: state.settings,
  },
});

export const createExportFilename = (date = new Date()) => {
  const stamp = date.toISOString().slice(0, 10);
  return `scrollshield-export-${stamp}.json`;
};

export const serializeScrollShieldExport = (data: ScrollShieldExport) => JSON.stringify(data, null, 2);

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export const parseScrollShieldExport = (raw: string): ScrollShieldExport => {
  if (new Blob([raw]).size > MAX_IMPORT_BYTES) {
    throw new Error('Die Importdatei ist größer als 5 MB.');
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Die Datei enthält kein gültiges JSON.');
  }

  if (isLegacyV07Backup(parsed)) {
    const converted = convertLegacyV07Backup(parsed, raw);
    restoreLegacyArchive(converted.legacyArchive as LegacyStorageArchive);
    return converted;
  }

  if (!isRecord(parsed) || parsed.app !== 'ScrollShield' || parsed.schemaVersion !== 1 || !isRecord(parsed.state)) {
    throw new Error('Die Datei ist kein unterstützter ScrollShield-Export.');
  }

  const state = parsed.state;
  const requiredObjects = ['appsConfig', 'dailyStats', 'stats', 'settings'] as const;
  const requiredArrays = ['goals', 'history', 'focusSessions', 'profiles'] as const;

  if (
    requiredObjects.some((key) => !isRecord(state[key])) ||
    requiredArrays.some((key) => !Array.isArray(state[key]))
  ) {
    throw new Error('Der ScrollShield-Export ist unvollständig oder beschädigt.');
  }

  if (parsed.legacyArchive !== undefined && !isLegacyArchive(parsed.legacyArchive)) {
    throw new Error('Das enthaltene V0.7-Datenarchiv ist beschädigt.');
  }

  const supported = parsed as ScrollShieldExport;
  if (supported.legacyArchive) restoreLegacyArchive(supported.legacyArchive);
  return supported;
};
