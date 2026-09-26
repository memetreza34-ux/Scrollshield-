import { describe, expect, it } from 'vitest';
import { DEFAULT_STATE } from '../types';
import type { NativeInterruptionEvent } from './nativeBridge';
import { mergeNativeInterruptions, toHistoryEvent } from './nativeEvents';
import { getReelsStatsForDate } from './stats';

const platforms = [
  { id: 'instagram', androidPackages: ['com.instagram.android', 'com.instagram.lite'] },
  { id: 'tiktok', androidPackages: ['com.zhiliaoapp.musically'] },
];

const at = new Date(2030, 0, 1, 12).getTime();
const dayKey = '2030-01-01';

const event = (overrides: Partial<NativeInterruptionEvent> = {}): NativeInterruptionEvent => ({
  id: 'e1',
  timestamp: at,
  packageName: 'com.instagram.android',
  kind: 'app',
  outcome: 'blocked',
  reason: 'STRICT',
  swipes: 0,
  ...overrides,
});

describe('toHistoryEvent', () => {
  it('maps the outcome like the in-app protection flow', () => {
    expect(toHistoryEvent(event({ outcome: 'blocked' }), platforms)?.type).toBe('block');
    expect(toHistoryEvent(event({ outcome: 'stopped', reason: 'STANDARD' }), platforms)?.type).toBe('warning');
    expect(toHistoryEvent(event({ outcome: 'continued', reason: 'STANDARD' }), platforms)?.type).toBe('open');
    expect(toHistoryEvent(event({ kind: 'short_video', outcome: 'warned', reason: 'SWIPES' }), platforms)?.type).toBe(
      'warning',
    );
  });

  it('names the app, the reason and the source', () => {
    const lite = toHistoryEvent(event({ packageName: 'com.instagram.lite', reason: 'TIME_WINDOW' }), platforms);

    expect(lite).toMatchObject({
      id: 'android-e1',
      appId: 'instagram',
      desc: 'Auf dem Handy gesperrt (Zeitfenster)',
      metadata: { source: 'android', reason: 'TIME_WINDOW' },
    });
  });

  it('marks feed interruptions so the short-video statistics count them', () => {
    const feed = toHistoryEvent(
      event({ kind: 'short_video', outcome: 'blocked', reason: 'SWIPES', swipes: 10 }),
      platforms,
    );

    expect(feed).toMatchObject({
      desc: 'Kurzvideo: nach 10 Wischern unterbrochen',
      trigger: 'reels_protection',
      metadata: { surface: 'reels', contentType: 'short_video', singleItemsViewed: 10 },
    });
  });

  it('names daily limit, anti-binge lock and anti-binge warning', () => {
    expect(toHistoryEvent(event({ reason: 'DAILY_LIMIT' }), platforms)?.desc).toBe(
      'Auf dem Handy gesperrt (Tageslimit)',
    );
    expect(toHistoryEvent(event({ reason: 'ANTI_BINGE' }), platforms)?.desc).toBe(
      'Auf dem Handy gesperrt (Anti-Binge)',
    );
    expect(toHistoryEvent(event({ outcome: 'warned', reason: 'ANTI_BINGE_WARNING' }), platforms)).toMatchObject({
      type: 'warning',
      desc: 'Anti-Binge-Warnung auf dem Handy',
    });
  });

  it('skips packages no platform knows', () => {
    expect(toHistoryEvent(event({ packageName: 'com.example.other' }), platforms)).toBeNull();
  });
});

describe('mergeNativeInterruptions', () => {
  const empty = { history: DEFAULT_STATE.history, dailyStats: DEFAULT_STATE.dailyStats };

  it('adds interruptions to the history and counts blocks in the daily stats', () => {
    const merged = mergeNativeInterruptions(
      empty,
      [
        event({ id: 'a', outcome: 'blocked' }),
        event({ id: 'b', outcome: 'stopped', reason: 'STANDARD', timestamp: at + 1_000 }),
        event({ id: 'c', outcome: 'continued', reason: 'STANDARD', timestamp: at + 2_000 }),
      ],
      platforms,
    );

    expect(merged.history.map((entry) => entry.id)).toEqual(['android-c', 'android-b', 'android-a']);
    expect(merged.dailyStats[dayKey].blockedOpens).toBe(2);
    expect(merged.dailyStats[dayKey].savedTimeMinutes).toBe(10);
  });

  it('never counts the same interruption twice', () => {
    const once = mergeNativeInterruptions(empty, [event()], platforms);
    const twice = mergeNativeInterruptions(once, [event()], platforms);

    expect(twice).toBe(once);
    expect(twice.dailyStats[dayKey].blockedOpens).toBe(1);
  });

  it('keeps newer in-app events in order', () => {
    const inApp = {
      id: 'web-1',
      timestamp: at + 60_000,
      type: 'open' as const,
      appId: 'tiktok',
      desc: 'App geöffnet',
    };
    const merged = mergeNativeInterruptions({ ...empty, history: [inApp] }, [event()], platforms);

    expect(merged.history.map((entry) => entry.id)).toEqual(['web-1', 'android-e1']);
  });

  it('feeds the short-video statistics', () => {
    const merged = mergeNativeInterruptions(
      empty,
      [event({ kind: 'short_video', outcome: 'blocked', reason: 'DAILY_LIMIT' })],
      platforms,
    );

    const reels = getReelsStatsForDate({ ...DEFAULT_STATE, ...merged }, new Date(at));
    expect(reels.reelsBlockedSessions).toBe(1);
  });

  it('returns the input when nothing is new', () => {
    expect(mergeNativeInterruptions(empty, [], platforms)).toBe(empty);
    expect(mergeNativeInterruptions(empty, [event({ packageName: 'com.example.other' })], platforms)).toBe(empty);
  });
});
