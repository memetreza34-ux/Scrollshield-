import { describe, expect, it } from 'vitest';
import { AppState } from '../types';
import {
  getSessionElapsedSeconds,
  getSessionLimitSeconds,
  isSessionLimitEnabled,
  recordProtectionEventStats,
  recordSessionUsage,
} from './session';

const session: NonNullable<AppState['activeSession']> = {
  appId: 'instagram',
  startTime: 1_000,
  extensionCount: 0,
  isPaused: false,
};

describe('getSessionElapsedSeconds', () => {
  it('derives elapsed time from startTime', () => {
    expect(getSessionElapsedSeconds(session, 61_500)).toBe(60);
  });

  it('freezes elapsed time while paused', () => {
    expect(getSessionElapsedSeconds({ ...session, isPaused: true, pausedAt: 31_000 }, 90_000)).toBe(30);
  });

  it('never returns negative elapsed time', () => {
    expect(getSessionElapsedSeconds(session, 500)).toBe(0);
  });
});

describe('getSessionLimitSeconds', () => {
  it('uses override and five-minute extensions', () => {
    expect(getSessionLimitSeconds({ ...session, sessionLimitOverride: 2, extensionCount: 1 }, 15)).toBe(420);
  });

  it('keeps disabled session limits disabled', () => {
    expect(getSessionLimitSeconds({ ...session, sessionLimitOverride: 0 }, 15)).toBe(0);
    expect(getSessionLimitSeconds(session, 0)).toBe(0);
    expect(isSessionLimitEnabled(0)).toBe(false);
    expect(isSessionLimitEnabled(60)).toBe(true);
  });
});

describe('recordSessionUsage', () => {
  it('adds usage minutes into the local day bucket', () => {
    const stats = recordSessionUsage({}, 'instagram', 7, new Date(2026, 5, 14, 12).getTime());

    expect(stats['2026-06-14'].usageMinutes.instagram).toBe(7);
  });

  it('accumulates existing usage for the same app', () => {
    const timestamp = new Date(2026, 5, 14, 12).getTime();
    const stats = recordSessionUsage(
      {
        '2026-06-14': {
          date: '2026-06-14',
          usageMinutes: { instagram: 3 },
          blockedOpens: 1,
          savedTimeMinutes: 5,
          emergencyUnlocks: 0,
          focusMinutes: 0,
        },
      },
      'instagram',
      4,
      timestamp,
    );

    expect(stats['2026-06-14'].usageMinutes.instagram).toBe(7);
    expect(stats['2026-06-14'].blockedOpens).toBe(1);
  });
});

describe('recordProtectionEventStats', () => {
  it('counts block-like events without inventing saved time', () => {
    const timestamp = new Date(2026, 5, 14, 12).getTime();
    const afterBlock = recordProtectionEventStats({}, 'block', timestamp);
    const afterWarning = recordProtectionEventStats(afterBlock, 'warning', timestamp);

    expect(afterWarning['2026-06-14'].blockedOpens).toBe(2);
    expect(afterWarning['2026-06-14'].savedTimeMinutes).toBe(0);
  });

  it('counts emergency unlocks separately', () => {
    const timestamp = new Date(2026, 5, 14, 12).getTime();
    const stats = recordProtectionEventStats({}, 'emergency', timestamp);

    expect(stats['2026-06-14'].emergencyUnlocks).toBe(1);
    expect(stats['2026-06-14'].blockedOpens).toBe(0);
  });

  it('ignores non-stat protection events', () => {
    expect(recordProtectionEventStats({}, 'open', new Date(2026, 5, 14, 12).getTime())).toEqual({});
  });
});
