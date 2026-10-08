import { describe, expect, it } from 'vitest';
import { AppState, DEFAULT_STATE } from '../types';
import {
  getReelsStatsForDate,
  getReelsUsageMinutesForAppDate,
  getShortVideoUsageKey,
  isShortVideoFeedBlockedByConfig,
  mergeNativeAppUsage,
  mergeNativeShortVideoUsage,
} from './stats';

const makeState = (overrides: Partial<AppState>): AppState => ({
  ...DEFAULT_STATE,
  ...overrides,
});

describe('getReelsStatsForDate', () => {
  it('summarizes short-video usage and reels protection events for the selected local day', () => {
    const day = new Date(2026, 5, 14, 12);
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);

    const state = makeState({
      dailyStats: {
        '2026-06-14': {
          date: '2026-06-14',
          usageMinutes: {
            instagram: 20,
            instagram_reels: 7,
            youtube_shorts: 5,
          },
          blockedOpens: 2,
          savedTimeMinutes: 10,
          emergencyUnlocks: 0,
          focusMinutes: 0,
        },
      },
      history: [
        {
          id: 'block-1',
          timestamp: dayStart.getTime() + 1000,
          type: 'block',
          appId: 'instagram',
          desc: 'Reels blocked',
          trigger: 'reels_protection',
          metadata: { singleItemsViewed: 2 },
        },
        {
          id: 'warning-1',
          timestamp: dayStart.getTime() + 2000,
          type: 'warning',
          appId: 'youtube',
          desc: 'Shorts warning',
          metadata: { contentType: 'short_video', singleItemsAllowed: 1 },
        },
        {
          id: 'old-block',
          timestamp: dayStart.getTime() - 1000,
          type: 'block',
          appId: 'tiktok',
          desc: 'Yesterday',
          trigger: 'reels_protection',
        },
      ],
    });

    expect(getReelsStatsForDate(state, day)).toEqual({
      reelsTimeTodayMinutes: 12,
      reelsBlockedSessions: 2,
      singleItemsCount: 3,
    });
  });

  it('reads per-app reels usage from the standard reels key', () => {
    const day = new Date(2026, 5, 14, 12);
    const state = makeState({
      dailyStats: {
        '2026-06-14': {
          date: '2026-06-14',
          usageMinutes: { [getShortVideoUsageKey('instagram')]: 9 },
          blockedOpens: 0,
          savedTimeMinutes: 0,
          emergencyUnlocks: 0,
          focusMinutes: 0,
        },
      },
    });

    expect(getReelsUsageMinutesForAppDate(state, 'instagram', day)).toBe(9);
  });
});

describe('isShortVideoFeedBlockedByConfig', () => {
  it('reads a limit of 0 as blocked, as the settings label it', () => {
    expect(isShortVideoFeedBlockedByConfig({ mode: 'limit', dailyLimitMinutes: 0, sessionLimitMinutes: 5 })).toBe(true);
    expect(isShortVideoFeedBlockedByConfig({ mode: 'warn', dailyLimitMinutes: 15, sessionLimitMinutes: 0 })).toBe(true);
    expect(isShortVideoFeedBlockedByConfig({ mode: 'block', dailyLimitMinutes: 15, sessionLimitMinutes: 5 })).toBe(
      true,
    );
  });

  it('does not block missing limits or an allowed feed', () => {
    expect(isShortVideoFeedBlockedByConfig({ mode: 'limit' })).toBe(false);
    expect(isShortVideoFeedBlockedByConfig({ mode: 'limit', dailyLimitMinutes: 15, sessionLimitMinutes: 5 })).toBe(
      false,
    );
    expect(isShortVideoFeedBlockedByConfig({ mode: 'allow', dailyLimitMinutes: 0 })).toBe(false);
  });
});

describe('mergeNativeShortVideoUsage', () => {
  const platforms = [
    { id: 'instagram', androidPackages: ['com.instagram.android', 'com.instagram.lite'] },
    { id: 'tiktok', androidPackages: ['com.zhiliaoapp.musically'] },
  ];
  const day = '2030-01-01';

  it('adds the measured minutes per app, main and lite build together', () => {
    const merged = mergeNativeShortVideoUsage(
      {},
      {
        date: day,
        entries: [
          { packageName: 'com.instagram.android', minutesToday: 12 },
          { packageName: 'com.instagram.lite', minutesToday: 3 },
          { packageName: 'com.zhiliaoapp.musically', minutesToday: 7 },
          { packageName: 'com.unknown.app', minutesToday: 50 },
        ],
      },
      platforms,
    );

    expect(merged[day].usageMinutes).toEqual({ instagram_reels: 15, tiktok_reels: 7 });
    expect(merged[day].blockedOpens).toBe(0);
  });

  it('never lowers a larger value and never adds to it', () => {
    const stats = {
      [day]: {
        date: day,
        usageMinutes: { instagram: 30, instagram_reels: 20 },
        blockedOpens: 2,
        savedTimeMinutes: 10,
        emergencyUnlocks: 0,
        focusMinutes: 0,
      },
    };

    const lower = mergeNativeShortVideoUsage(
      stats,
      { date: day, entries: [{ packageName: 'com.instagram.android', minutesToday: 5 }] },
      platforms,
    );
    const higher = mergeNativeShortVideoUsage(
      stats,
      { date: day, entries: [{ packageName: 'com.instagram.android', minutesToday: 25 }] },
      platforms,
    );

    expect(lower).toBe(stats);
    expect(higher[day].usageMinutes).toEqual({ instagram: 30, instagram_reels: 25 });
    expect(higher[day].blockedOpens).toBe(2);
  });

  it('returns the same object when there is nothing to take over', () => {
    const stats = {};
    expect(mergeNativeShortVideoUsage(stats, { date: day, entries: [] }, platforms)).toBe(stats);
  });
});

describe('mergeNativeAppUsage', () => {
  const platforms = [{ id: 'instagram', androidPackages: ['com.instagram.android', 'com.instagram.lite'] }];
  const day = '2030-01-01';

  it('stores the foreground minutes under the app id, main and lite build together', () => {
    const merged = mergeNativeAppUsage(
      {},
      {
        date: day,
        entries: [
          { packageName: 'com.instagram.android', minutesToday: 40 },
          { packageName: 'com.instagram.lite', minutesToday: 5 },
        ],
      },
      platforms,
    );

    expect(merged[day].usageMinutes).toEqual({ instagram: 45 });
  });

  it('keeps the short-video key apart', () => {
    const stats = {
      [day]: {
        date: day,
        usageMinutes: { instagram_reels: 12 },
        blockedOpens: 0,
        savedTimeMinutes: 0,
        emergencyUnlocks: 0,
        focusMinutes: 0,
      },
    };

    const merged = mergeNativeAppUsage(
      stats,
      { date: day, entries: [{ packageName: 'com.instagram.android', minutesToday: 30 }] },
      platforms,
    );

    expect(merged[day].usageMinutes).toEqual({ instagram_reels: 12, instagram: 30 });
  });
});
