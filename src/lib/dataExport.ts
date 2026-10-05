import { AppState } from '../types';

export type ScrollShieldExport = {
  schemaVersion: 1;
  app: 'ScrollShield';
  exportedAt: string;
  appVersion: string;
  state: Pick<
    AppState,
    | 'appsConfig'
    | 'activeProtectionLevel'
    | 'goals'
    | 'history'
    | 'focusSessions'
    | 'focusSchedules'
    | 'dailyStats'
    | 'stats'
    | 'profiles'
    | 'activeProfileId'
    | 'operatingSystem'
    | 'permissions'
    | 'settings'
  >;
};

export const createScrollShieldExport = (
  state: AppState,
  options: { exportedAt?: Date; appVersion?: string } = {},
): ScrollShieldExport => ({
  schemaVersion: 1,
  app: 'ScrollShield',
  exportedAt: (options.exportedAt ?? new Date()).toISOString(),
  appVersion: options.appVersion ?? 'unknown',
  state: {
    appsConfig: state.appsConfig,
    activeProtectionLevel: state.activeProtectionLevel,
    goals: state.goals,
    history: state.history,
    focusSessions: state.focusSessions,
    focusSchedules: state.focusSchedules,
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

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

  return parsed as ScrollShieldExport;
};
