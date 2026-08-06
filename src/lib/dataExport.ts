import type { AppState } from '../types';

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
