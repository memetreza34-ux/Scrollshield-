import { describe, expect, it } from 'vitest';
import { AppState, DEFAULT_STATE } from '../types';
import { getReelsStatsForDate, getReelsUsageMinutesForAppDate, getShortVideoUsageKey } from './stats';

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
