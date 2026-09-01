import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_APP_CONFIG, DEFAULT_STATE } from '../types';
import {
  applyCommitmentGuard,
  assessCommitmentStartReadiness,
  clearCommitmentLock,
  createCommitmentLock,
  isCommitmentLockActive,
  loadCommitmentLock,
  normalizeCommitmentLock,
  saveCommitmentLock,
} from './commitmentLock';

describe('commitment lock', () => {
  const now = new Date(2030, 0, 1, 12).getTime();

  beforeEach(() => localStorage.clear());

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

  it('persists the short-lived lock locally and removes it after expiry', () => {
    const lock = createCommitmentLock(480, now);
    expect(saveCommitmentLock(lock)).toBe(true);
    expect(loadCommitmentLock(now + 1_000)).toEqual(lock);
    expect(loadCommitmentLock(lock.lockedUntil)).toBeNull();
    expect(localStorage.getItem('scrollshield_commitment_lock_v1')).toBeNull();
  });

  it('clears the device-local lock explicitly', () => {
    expect(saveCommitmentLock(createCommitmentLock(60, now))).toBe(true);
    clearCommitmentLock();
    expect(loadCommitmentLock(now)).toBeNull();
  });

  it('requires Android, an active installed app, and a live enabled service before commitment', () => {
    const activeAndroidState = {
      ...DEFAULT_STATE,
      operatingSystem: 'android' as const,
      appsConfig: {
        instagram: { id: 'instagram', ...DEFAULT_APP_CONFIG, active: true },
      },
    };
    const running = {
      nativeAvailable: true,
      unavailableAppIds: [] as string[],
      running: true,
      enabled: true,
    };

    expect(assessCommitmentStartReadiness({ ...activeAndroidState, operatingSystem: 'ios' }, running)).toMatchObject({
      ok: false,
      code: 'android_required',
    });
    expect(assessCommitmentStartReadiness({ ...activeAndroidState, appsConfig: {} }, running)).toMatchObject({
      ok: false,
      code: 'active_app_required',
      action: 'apps',
    });
    expect(assessCommitmentStartReadiness(activeAndroidState, { ...running, nativeAvailable: false })).toMatchObject({
      ok: false,
      code: 'native_unavailable',
      action: 'permissions',
    });
    expect(
      assessCommitmentStartReadiness(activeAndroidState, {
        ...running,
        unavailableAppIds: ['instagram'],
      }),
    ).toMatchObject({ ok: false, code: 'installed_app_required', action: 'apps' });
    expect(
      assessCommitmentStartReadiness(activeAndroidState, { ...running, running: false, enabled: false }),
    ).toMatchObject({ ok: false, code: 'service_not_running', action: 'permissions' });
    expect(assessCommitmentStartReadiness(activeAndroidState, { ...running, enabled: false })).toMatchObject({
      ok: false,
      code: 'service_inconsistent',
      action: 'permissions',
    });
    expect(assessCommitmentStartReadiness(activeAndroidState, running)).toEqual({ ok: true });
  });

  it('accepts commitment when at least one of multiple active apps remains installed', () => {
    const state = {
      ...DEFAULT_STATE,
      operatingSystem: 'android' as const,
      appsConfig: {
        instagram: { id: 'instagram', ...DEFAULT_APP_CONFIG, active: true },
        youtube: { id: 'youtube', ...DEFAULT_APP_CONFIG, active: true },
      },
    };

    expect(
      assessCommitmentStartReadiness(state, {
        nativeAvailable: true,
        unavailableAppIds: ['instagram'],
        running: true,
        enabled: true,
      }),
    ).toEqual({ ok: true });
  });

  it('freezes protection configuration but permits unrelated runtime updates', () => {
    const lock = createCommitmentLock(480, now);
    const previous = {
      ...DEFAULT_STATE,
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
        isFocusModeActive: true,
        focusTimeRemaining: 25,
      },
      lock,
      now + 1_000,
    );

    expect(guarded.appsConfig).toBe(previous.appsConfig);
    expect(guarded.profiles).toBe(previous.profiles);
    expect(guarded.activeProfileId).toBe(previous.activeProfileId);
    expect(guarded.activeProtectionLevel).toBe(previous.activeProtectionLevel);
    expect(guarded.isFocusModeActive).toBe(true);
    expect(guarded.focusTimeRemaining).toBe(25);
  });

  it('rejects a full-state replacement atomically instead of partially importing it', () => {
    const lock = createCommitmentLock(480, now);
    const importedState = {
      ...DEFAULT_STATE,
      appsConfig: {
        youtube: {
          id: 'youtube',
          ...DEFAULT_APP_CONFIG,
          active: true,
        },
      },
      history: [
        {
          id: 'imported',
          timestamp: now,
          type: 'open' as const,
          desc: 'Imported event',
        },
      ],
    };

    expect(applyCommitmentGuard(DEFAULT_STATE, importedState, lock, now + 1_000)).toEqual({});
  });

  it('stops guarding configuration after the deadline', () => {
    const lock = createCommitmentLock(60, now);
    const replacement = { youtube: { id: 'youtube', ...DEFAULT_APP_CONFIG, active: true } };

    const guarded = applyCommitmentGuard(DEFAULT_STATE, { appsConfig: replacement }, lock, now + 60 * 60_000);

    expect(guarded.appsConfig).toBe(replacement);
  });
});
