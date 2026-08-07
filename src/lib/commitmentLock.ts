import type { AppState, CommitmentLock } from '../types';

export const COMMITMENT_DURATION_MINUTES = [60, 8 * 60, 24 * 60] as const;

export type CommitmentDurationMinutes = (typeof COMMITMENT_DURATION_MINUTES)[number];

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

const hasOwn = <T extends object>(value: T, key: PropertyKey): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

/**
 * While commitment is active, every protection-configuration write is frozen.
 * Non-protection state (history, statistics, focus runtime, permissions, etc.)
 * continues to update normally. A full app reset deliberately bypasses this
 * helper so the user always retains a destructive safety exit.
 */
export const applyCommitmentGuard = (
  previousState: AppState,
  updates: Partial<AppState>,
  now = Date.now(),
): Partial<AppState> => {
  if (!isCommitmentLockActive(previousState.commitmentLock, now)) return updates;

  const guarded: Partial<AppState> = { ...updates };
  if (hasOwn(updates, 'appsConfig')) guarded.appsConfig = previousState.appsConfig;
  if (hasOwn(updates, 'profiles')) guarded.profiles = previousState.profiles;
  if (hasOwn(updates, 'activeProfileId')) guarded.activeProfileId = previousState.activeProfileId;
  if (hasOwn(updates, 'activeProtectionLevel')) {
    guarded.activeProtectionLevel = previousState.activeProtectionLevel;
  }
  if (hasOwn(updates, 'commitmentLock')) guarded.commitmentLock = previousState.commitmentLock;

  return guarded;
};
