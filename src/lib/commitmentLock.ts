import type { AppState } from '../types';

const STORAGE_KEY = 'scrollshield_commitment_lock_v1';

export const COMMITMENT_DURATION_MINUTES = [60, 8 * 60, 24 * 60] as const;

export type CommitmentDurationMinutes = (typeof COMMITMENT_DURATION_MINUTES)[number];

export interface CommitmentLock {
  startedAt: number;
  lockedUntil: number;
  durationMinutes: CommitmentDurationMinutes;
}

export type CommitmentStartAction = 'apps' | 'permissions';

export type CommitmentStartResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | 'already_active'
        | 'android_required'
        | 'active_app_required'
        | 'native_unavailable'
        | 'installed_app_required'
        | 'service_not_running'
        | 'service_inconsistent'
        | 'runtime_check_failed'
        | 'storage_failed';
      message: string;
      action?: CommitmentStartAction;
    };

export interface CommitmentRuntimeStatus {
  nativeAvailable: boolean;
  unavailableAppIds: readonly string[];
  running: boolean;
  enabled: boolean;
}

export const isCommitmentDuration = (minutes: number): minutes is CommitmentDurationMinutes =>
  (COMMITMENT_DURATION_MINUTES as readonly number[]).includes(minutes);

export const createCommitmentLock = (
  durationMinutes: CommitmentDurationMinutes,
  now = Date.now(),
): CommitmentLock => ({
  startedAt: now,
  lockedUntil: now + durationMinutes * 60_000,
  durationMinutes,
});

export const isCommitmentLockActive = (
  lock: CommitmentLock | null | undefined,
  now = Date.now(),
): lock is CommitmentLock =>
  !!lock &&
  Number.isFinite(lock.startedAt) &&
  Number.isFinite(lock.lockedUntil) &&
  Number.isFinite(lock.durationMinutes) &&
  lock.startedAt > 0 &&
  lock.lockedUntil > lock.startedAt &&
  isCommitmentDuration(lock.durationMinutes) &&
  lock.lockedUntil > now;

export const normalizeCommitmentLock = (
  lock: CommitmentLock | null | undefined,
  now = Date.now(),
): CommitmentLock | null => (isCommitmentLockActive(lock, now) ? lock : null);

export const loadCommitmentLock = (now = Date.now()): CommitmentLock | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CommitmentLock>;
    const candidate: CommitmentLock = {
      startedAt: Number(parsed.startedAt),
      lockedUntil: Number(parsed.lockedUntil),
      durationMinutes: Number(parsed.durationMinutes) as CommitmentDurationMinutes,
    };
    const normalized = normalizeCommitmentLock(candidate, now);
    if (!normalized) localStorage.removeItem(STORAGE_KEY);
    return normalized;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

export const saveCommitmentLock = (lock: CommitmentLock): boolean => {
  if (!isCommitmentLockActive(lock, lock.startedAt)) return false;
  try {
    const serialized = JSON.stringify(lock);
    localStorage.setItem(STORAGE_KEY, serialized);
    return localStorage.getItem(STORAGE_KEY) === serialized;
  } catch {
    return false;
  }
};

export const clearCommitmentLock = () => localStorage.removeItem(STORAGE_KEY);

export const getActiveCommitmentAppIds = (state: Pick<AppState, 'appsConfig'>): string[] =>
  Object.values(state.appsConfig)
    .filter((config) => config.active)
    .map((config) => config.id);

export const assessCommitmentStartReadiness = (
  state: Pick<AppState, 'operatingSystem' | 'appsConfig'>,
  runtime: CommitmentRuntimeStatus,
): CommitmentStartResult => {
  if (state.operatingSystem !== 'android') {
    return {
      ok: false,
      code: 'android_required',
      message: 'Commitment ist in Version 1 nur mit dem nativen Android-Schutz verfügbar.',
    };
  }

  const activeAppIds = getActiveCommitmentAppIds(state);
  if (activeAppIds.length === 0) {
    return {
      ok: false,
      code: 'active_app_required',
      message: 'Aktiviere zuerst mindestens eine App, bevor du ihre Schutzregeln verbindlich einfrierst.',
      action: 'apps',
    };
  }

  if (!runtime.nativeAvailable) {
    return {
      ok: false,
      code: 'native_unavailable',
      message: 'Der native Android-Schutz ist auf diesem Gerät nicht verfügbar.',
      action: 'permissions',
    };
  }

  const unavailable = new Set(runtime.unavailableAppIds);
  if (!activeAppIds.some((appId) => !unavailable.has(appId))) {
    return {
      ok: false,
      code: 'installed_app_required',
      message: 'Keine deiner aktuell geschützten Apps ist auf diesem Gerät verfügbar. Prüfe zuerst die App-Auswahl.',
      action: 'apps',
    };
  }

  if (runtime.running && !runtime.enabled) {
    return {
      ok: false,
      code: 'service_inconsistent',
      message: 'Der Android-Schutzdienst läuft in einem inkonsistenten Zustand. Behebe zuerst den Schutzstatus.',
      action: 'permissions',
    };
  }

  if (!runtime.running || !runtime.enabled) {
    return {
      ok: false,
      code: 'service_not_running',
      message: 'Starte zuerst den Android-Schutzdienst. Commitment wird erst aktiviert, wenn der Schutz wirklich läuft.',
      action: 'permissions',
    };
  }

  return { ok: true };
};

const hasOwn = <T extends object>(value: T, key: PropertyKey): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const looksLikeFullStateReplacement = (updates: Partial<AppState>): boolean =>
  hasOwn(updates, 'appsConfig') &&
  (hasOwn(updates, 'history') ||
    hasOwn(updates, 'dailyStats') ||
    hasOwn(updates, 'settings') ||
    hasOwn(updates, 'stats') ||
    hasOwn(updates, 'focusSessions'));

/**
 * While commitment is active, every protection-configuration write is frozen.
 * Non-protection state (history, statistics, focus runtime, permissions, etc.)
 * continues to update normally. A full state replacement such as backup import
 * is rejected atomically so it cannot become a misleading partial import.
 * A full app reset deliberately bypasses this helper so the user always retains
 * a destructive safety exit.
 */
export const applyCommitmentGuard = (
  previousState: AppState,
  updates: Partial<AppState>,
  lock: CommitmentLock | null | undefined,
  now = Date.now(),
): Partial<AppState> => {
  if (!isCommitmentLockActive(lock, now)) return updates;
  if (looksLikeFullStateReplacement(updates)) return {};

  const guarded: Partial<AppState> = { ...updates };
  if (hasOwn(updates, 'appsConfig')) guarded.appsConfig = previousState.appsConfig;
  if (hasOwn(updates, 'profiles')) guarded.profiles = previousState.profiles;
  if (hasOwn(updates, 'activeProfileId')) guarded.activeProfileId = previousState.activeProfileId;
  if (hasOwn(updates, 'activeProtectionLevel')) {
    guarded.activeProtectionLevel = previousState.activeProtectionLevel;
  }

  return guarded;
};
