import { describe, expect, it } from 'vitest';
import type { DailyStats, HistoryEvent } from '../types';
import { getLocalDateKey } from './appUtils';
import { getDayMarks, usualMinutesByNow } from './metrics';
import { mergeUsagePerHour } from './stats';

const now = new Date(2026, 9, 16, 14, 30);

const event = (type: HistoryEvent['type'], hour: number, outcome?: string): HistoryEvent => ({
  id: `${type}-${hour}-${outcome ?? ''}`,
  type,
  appId: 'instagram',
  timestamp: new Date(2026, 9, 16, hour, 0).getTime(),
  desc: '',
  ...(outcome ? { metadata: { outcome } } : {}),
});

describe('getDayMarks', () => {
  it('marks going back and locks as "went back", continuing as "opened anyway"', () => {
    const marks = getDayMarks(
      [
        event('warning', 9, 'stopped'),
        event('block', 10, 'blocked'),
        event('open', 11, 'continued'),
        event('warning', 12, 'warned'),
        event('open', 13),
      ],
      now,
    );

    expect(marks.map((mark) => mark.wentBack)).toEqual([true, true, false]);
  });

  it('treats a pause without a decision (browser preview) as opened', () => {
    expect(getDayMarks([event('warning', 9)], now)).toEqual([
      { timestamp: new Date(2026, 9, 16, 9, 0).getTime(), wentBack: false },
    ]);
  });
});

const day = (daysBack: number, perHour: number[]): [string, DailyStats] => {
  const date = new Date(now);
  date.setDate(date.getDate() - daysBack);
  const key = getLocalDateKey(date);
  return [
    key,
    {
      date: key,
      usageMinutes: {},
      blockedOpens: 0,
      savedTimeMinutes: 0,
      emergencyUnlocks: 0,
      focusMinutes: 0,
      usagePerHour: perHour,
    },
  ];
};

const hours = (values: Record<number, number>) => Array.from({ length: 24 }, (_, hour) => values[hour] ?? 0);

describe('usualMinutesByNow', () => {
  it('averages the minutes up to the same time on recent days', () => {
    // By 14:30: all of 9:00 and 12:00, half of 14:00.
    const stats = Object.fromEntries([
      day(1, hours({ 9: 10, 12: 20, 14: 20, 21: 60 })),
      day(2, hours({ 9: 20, 12: 10, 14: 0 })),
      day(3, hours({ 9: 0, 12: 30, 14: 40 })),
    ]);

    expect(usualMinutesByNow(stats, now)).toBe(Math.round((40 + 30 + 50) / 3));
  });

  it('does not compare with fewer than three days', () => {
    const stats = Object.fromEntries([day(1, hours({ 9: 10 })), day(2, hours({ 9: 10 }))]);
    expect(usualMinutesByNow(stats, now)).toBeUndefined();
  });
});

describe('mergeUsagePerHour', () => {
  it('stores 24 hours, rounded and capped at 60', () => {
    const merged = mergeUsagePerHour({}, { date: '2026-10-16', minutesPerHour: hours({ 8: 12.4, 21: 75 }) });
    expect(merged['2026-10-16'].usagePerHour?.[8]).toBe(12);
    expect(merged['2026-10-16'].usagePerHour?.[21]).toBe(60);
  });

  it('ignores anything that is not 24 hours and keeps the same object when nothing changed', () => {
    const stats = mergeUsagePerHour({}, { date: '2026-10-16', minutesPerHour: hours({ 8: 5 }) });
    expect(mergeUsagePerHour(stats, { date: '2026-10-16', minutesPerHour: [1, 2] })).toBe(stats);
    expect(mergeUsagePerHour(stats, { date: '2026-10-16', minutesPerHour: hours({ 8: 5 }) })).toBe(stats);
  });
});
