import { describe, expect, it } from 'vitest';
import { DEFAULT_APP_CONFIG, DEFAULT_STATE } from '../types';
import {
  applyCommitmentGuard,
  createCommitmentLock,
  isCommitmentLockActive,
  normalizeCommitmentLock,
} from './commitmentLock';

describe('commitment lock', () => {
  const now = new Date(2030, 0, 1, 12).getTime();

  it('creates only a bounded future lock and expires automatically', () => {
    const lock = createCommitmentLock(60, now);
    expect(lock).toEqual({
      startedAt: now,
      lockedUntil: now + 60 * 60_000,
      durationMinutes: 60,
    });
    expect(isCommitmentLockActive(lock, now + 59 * 60_000)).toBe(true);
    expect(isCommitmentLockActive(lock, now + 60 * 60_000)).toBe(false);
    expect(normalizeCommitmentLock(lock, now + 60 * 60_000)).toBeNull();
  });

  it('freezes protection configuration but permits unrelated runtime updates', () => {
    const previous = {
      ...DEFAULT_STATE,
      commitmentLock: createCommitmentLock(480, now),
      appsConfig: {
        instagram: {
          id: 'instagram',
          ...DEFAULT_APP_CONFIG,
          active: true,
        },
      },
    };
    const nextAppsConfig = {
      instagram: {
        ...previous.appsConfig.instagram,
        active: false,
      },
    };

    const guarded = applyCommitmentGuard(
      previous,
      {
        appsConfig: nextAppsConfig,
        profiles: [],
        activeProfileId: 'strict',
        activeProtectionLevel: 'strict',
        commitmentLock: null,
        isFocusModeActive: true,
        focusTimeRemaining: 25,
      },
      now + 1_000,
    );

    expect(guarded.appsConfig).toBe(previous.appsConfig);
    expect(guarded.profiles).toBe(previous.profiles);
    expect(guarded.activeProfileId).toBe(previous.activeProfileId);
    expect(guarded.activeProtectionLevel).toBe(previous.activeProtectionLevel);
    expect(guarded.commitmentLock).toBe(previous.commitmentLock);
    expect(guarded.isFocusModeActive).toBe(true);
    expect(guarded.focusTimeRemaining).toBe(25);
  });

  it('stops guarding configuration after the deadline', () => {
    const previous = {
      ...DEFAULT_STATE,
      commitmentLock: createCommitmentLock(60, now),
    };
    const replacement = { youtube: { id: 'youtube', ...DEFAULT_APP_CONFIG, active: true } };

    const guarded = applyCommitmentGuard(
      previous,
      { appsConfig: replacement, commitmentLock: null },
      now + 60 * 60_000,
    );

    expect(guarded.appsConfig).toBe(replacement);
    expect(guarded.commitmentLock).toBeNull();
  });
});
