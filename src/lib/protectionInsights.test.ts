import { describe, expect, it } from 'vitest';
import type { AppState } from '../types';
import { buildProtectionInsightPeriod, compareProtectionInsightPeriods, getLocalDateKeys } from './protectionInsights';

const stats = (entries: AppState['dailyStats']): AppState['dailyStats'] => entries;

describe('protection insights', () => {
  it('builds local calendar keys across month boundaries', () => {
    const keys = getLocalDateKeys(new Date(2026, 7, 2, 15), 4);
    expect(keys).toEqual(['2026-07-30', '2026-07-31', '2026-08-01', '2026-08-02']);
  });

  it('aggregates only measured local usage and separately retains estimated saved time', () => {
    const period = buildProtectionInsightPeriod(
      stats({
        '2026-08-01': {
          date: '2026-08-01',
          usageMinutes: { instagram: 12.5, youtube: 4 },
          blockedOpens: 3,
          savedTimeMinutes: 15,
          emergencyUnlocks: 1,
          focusMinutes: 25,
        },
        '2026-08-02': {
          date: '2026-08-02',
          usageMinutes: { instagram: 7.5 },
          blockedOpens: 2,
          savedTimeMinutes: 10,
          emergencyUnlocks: 0,
          focusMinutes: 10,
        },
      }),
      new Date(2026, 7, 2, 12),
      2,
    );

    expect(period.measuredUsageMinutes).toBe(24);
    expect(period.estimatedSavedMinutes).toBe(25);
    expect(period.interventions).toBe(5);
    expect(period.emergencyUnlocks).toBe(1);
    expect(period.focusMinutes).toBe(35);
    expect(period.topMeasuredAppId).toBe('instagram');
    expect(period.topMeasuredAppMinutes).toBe(20);
    expect(period.activeDays).toBe(2);
    expect(period.averageMeasuredUsageMinutes).toBe(12);
  });

  it('ignores negative and non-finite corrupted counters instead of poisoning insights', () => {
    const period = buildProtectionInsightPeriod(
      stats({
        '2026-08-02': {
          date: '2026-08-02',
          usageMinutes: { instagram: -20, youtube: Number.NaN },
          blockedOpens: -3,
          savedTimeMinutes: Number.POSITIVE_INFINITY,
          emergencyUnlocks: -1,
          focusMinutes: Number.NaN,
        },
      }),
      new Date(2026, 7, 2, 12),
      1,
    );

    expect(period.measuredUsageMinutes).toBe(0);
    expect(period.interventions).toBe(0);
    expect(period.estimatedSavedMinutes).toBe(0);
    expect(period.emergencyUnlocks).toBe(0);
    expect(period.focusMinutes).toBe(0);
    expect(period.topMeasuredAppId).toBe('instagram');
    expect(period.topMeasuredAppMinutes).toBe(0);
    expect(period.activeDays).toBe(0);
  });

  it('compares equal local periods without inventing a percentage when no previous usage exists', () => {
    const comparison = compareProtectionInsightPeriods(
      stats({
        '2026-08-07': {
          date: '2026-08-07',
          usageMinutes: { instagram: 20 },
          blockedOpens: 4,
          savedTimeMinutes: 20,
          emergencyUnlocks: 1,
          focusMinutes: 30,
        },
      }),
      new Date(2026, 7, 7, 12),
      7,
    );

    expect(comparison.current.measuredUsageMinutes).toBe(20);
    expect(comparison.previous.measuredUsageMinutes).toBe(0);
    expect(comparison.measuredUsageChangeMinutes).toBe(20);
    expect(comparison.measuredUsageChangePercent).toBeNull();
  });

  it('calculates measured-usage trend against the immediately preceding period', () => {
    const comparison = compareProtectionInsightPeriods(
      stats({
        '2026-08-01': {
          date: '2026-08-01',
          usageMinutes: { instagram: 60 },
          blockedOpens: 1,
          savedTimeMinutes: 5,
          emergencyUnlocks: 0,
          focusMinutes: 0,
        },
        '2026-08-02': {
          date: '2026-08-02',
          usageMinutes: { instagram: 40 },
          blockedOpens: 1,
          savedTimeMinutes: 5,
          emergencyUnlocks: 0,
          focusMinutes: 0,
        },
        '2026-08-03': {
          date: '2026-08-03',
          usageMinutes: { instagram: 30 },
          blockedOpens: 2,
          savedTimeMinutes: 10,
          emergencyUnlocks: 0,
          focusMinutes: 10,
        },
        '2026-08-04': {
          date: '2026-08-04',
          usageMinutes: { instagram: 20 },
          blockedOpens: 3,
          savedTimeMinutes: 15,
          emergencyUnlocks: 1,
          focusMinutes: 20,
        },
      }),
      new Date(2026, 7, 4, 12),
      2,
    );

    expect(comparison.previous.measuredUsageMinutes).toBe(100);
    expect(comparison.current.measuredUsageMinutes).toBe(50);
    expect(comparison.measuredUsageChangeMinutes).toBe(-50);
    expect(comparison.measuredUsageChangePercent).toBe(-50);
    expect(comparison.interventionsChange).toBe(3);
    expect(comparison.emergencyUnlocksChange).toBe(1);
    expect(comparison.focusMinutesChange).toBe(30);
  });
});
