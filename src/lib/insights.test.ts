import { describe, expect, it } from 'vitest';
import { compareWeeks, deriveInsights, findFrequentIntent, findWeakestHour, getStopRate } from './insights';
import { AppState, DEFAULT_STATE, HistoryEvent } from '../types';
import { getLocalDateKey } from './appUtils';

const eventAt = (isoLocal: string, type: HistoryEvent['type'] = 'block'): HistoryEvent => ({
  id: `${type}-${isoLocal}`,
  timestamp: new Date(isoLocal).getTime(),
  type,
  appId: 'instagram',
  desc: type,
});

const statsForDay = (date: Date, minutes: number) => ({
  [getLocalDateKey(date)]: {
    date: getLocalDateKey(date),
    usageMinutes: { instagram: minutes },
    blockedOpens: 1,
    savedTimeMinutes: 3,
    emergencyUnlocks: 0,
    focusMinutes: 0,
  },
});

const daysAgo = (from: Date, offset: number) => {
  const date = new Date(from);
  date.setDate(date.getDate() - offset);
  return date;
};

describe('findWeakestHour', () => {
  it('stays silent below the evidence threshold', () => {
    const history = [eventAt('2026-09-02T22:10'), eventAt('2026-09-02T22:20')];

    expect(findWeakestHour(history)).toBeNull();
  });

  it('identifies a clear peak hour', () => {
    const history = [
      ...Array.from({ length: 5 }, (_, i) => eventAt(`2026-09-02T22:${(10 + i).toString().padStart(2, '0')}`)),
      eventAt('2026-09-02T09:00'),
      eventAt('2026-09-02T14:00'),
    ];

    expect(findWeakestHour(history)).toEqual({ hour: 22, count: 5 });
  });

  it('reports nothing when attempts are spread evenly', () => {
    const history = Array.from({ length: 12 }, (_, i) => eventAt(`2026-09-02T${i.toString().padStart(2, '0')}:30`));

    expect(findWeakestHour(history)).toBeNull();
  });

  it('ignores ordinary opens', () => {
    const history = Array.from({ length: 10 }, (_, i) =>
      eventAt(`2026-09-02T22:${(10 + i).toString().padStart(2, '0')}`, 'open'),
    );

    expect(findWeakestHour(history)).toBeNull();
  });
});

describe('compareWeeks', () => {
  const now = new Date('2026-09-16T12:00');

  it('needs enough days before comparing', () => {
    expect(compareWeeks(statsForDay(now, 30), now)).toBeNull();
  });

  it('computes the difference between both weeks', () => {
    const dailyStats: AppState['dailyStats'] = {
      ...statsForDay(daysAgo(now, 1), 10),
      ...statsForDay(daysAgo(now, 2), 10),
      ...statsForDay(daysAgo(now, 8), 30),
      ...statsForDay(daysAgo(now, 9), 30),
    };

    expect(compareWeeks(dailyStats, now)).toEqual({
      currentMinutes: 20,
      previousMinutes: 60,
      deltaMinutes: -40,
    });
  });

  it('returns null without a baseline week', () => {
    const dailyStats: AppState['dailyStats'] = {
      ...statsForDay(daysAgo(now, 1), 10),
      ...statsForDay(daysAgo(now, 2), 10),
      ...statsForDay(daysAgo(now, 3), 10),
      ...statsForDay(daysAgo(now, 4), 10),
    };

    expect(compareWeeks(dailyStats, now)).toBeNull();
  });
});

describe('getStopRate', () => {
  const now = new Date('2026-09-02T20:00').getTime();

  it('needs a minimum of events', () => {
    expect(getStopRate([eventAt('2026-09-02T10:00')], now)).toBeNull();
  });

  it('measures interruptions against pushed-through opens', () => {
    const history = [
      ...Array.from({ length: 6 }, (_, i) => eventAt(`2026-09-02T1${i}:00`, 'block')),
      ...Array.from({ length: 2 }, (_, i) => eventAt(`2026-09-02T1${i}:30`, 'open')),
    ];

    expect(getStopRate(history, now)).toBeCloseTo(0.75);
  });

  it('ignores events outside the window', () => {
    const history = Array.from({ length: 10 }, (_, i) => eventAt(`2026-08-01T1${i % 10}:00`));

    expect(getStopRate(history, now)).toBeNull();
  });
});

describe('findFrequentIntent', () => {
  const now = new Date('2026-09-02T20:00').getTime();

  const openWithReason = (reason: string, offsetMinutes: number): HistoryEvent => ({
    id: `open-${reason}-${offsetMinutes}`,
    timestamp: now - offsetMinutes * 60_000,
    type: 'open',
    appId: 'instagram',
    desc: `App geöffnet: ${reason}`,
    metadata: { intentReason: reason },
  });

  it('stays silent below the evidence threshold', () => {
    const history = [openWithReason('Nachricht checken', 10), openWithReason('Nachricht checken', 20)];

    expect(findFrequentIntent(history, now)).toBeNull();
  });

  it('reports the most frequent reason', () => {
    const history = [
      openWithReason('Nachricht checken', 10),
      openWithReason('Nachricht checken', 60),
      openWithReason('Nachricht checken', 120),
      openWithReason('Kurz was posten', 200),
    ];

    expect(findFrequentIntent(history, now)).toEqual({
      reason: 'Nachricht checken',
      count: 3,
      total: 4,
    });
  });

  it('groups reasons case-insensitively but keeps the original wording', () => {
    const history = [
      openWithReason('Nachricht checken', 10),
      openWithReason('nachricht checken', 60),
      openWithReason('NACHRICHT CHECKEN', 120),
    ];

    const result = findFrequentIntent(history, now);
    expect(result?.count).toBe(3);
    expect(result?.reason).toBe('Nachricht checken');
  });

  it('needs a reason to actually repeat', () => {
    const history = [openWithReason('Grund A', 10), openWithReason('Grund B', 60), openWithReason('Grund C', 120)];

    expect(findFrequentIntent(history, now)).toBeNull();
  });

  it('ignores events without a stated reason', () => {
    const history: HistoryEvent[] = Array.from({ length: 6 }, (_, i) => eventAt('2026-09-02T12:00', 'open'));

    expect(findFrequentIntent(history, now)).toBeNull();
  });

  it('ignores reasons outside the window', () => {
    const history = [
      openWithReason('Alt', 30 * 24 * 60),
      openWithReason('Alt', 31 * 24 * 60),
      openWithReason('Alt', 32 * 24 * 60),
    ];

    expect(findFrequentIntent(history, now)).toBeNull();
  });
});

describe('deriveInsights', () => {
  it('produces nothing for a fresh install', () => {
    expect(deriveInsights(DEFAULT_STATE)).toEqual([]);
  });

  it('never invents a pattern from a single event', () => {
    const state: AppState = { ...DEFAULT_STATE, history: [eventAt('2026-09-02T03:00')] };

    expect(deriveInsights(state, new Date('2026-09-02T20:00'))).toEqual([]);
  });

  it('reports the weakest hour once there is evidence', () => {
    const state: AppState = {
      ...DEFAULT_STATE,
      history: Array.from({ length: 8 }, (_, i) => eventAt(`2026-09-02T22:${(10 + i).toString().padStart(2, '0')}`)),
    };

    const insights = deriveInsights(state, new Date('2026-09-02T23:00'));

    expect(insights.some((insight) => insight.id === 'weakest-hour')).toBe(true);
  });
});
