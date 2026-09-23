import { describe, expect, it } from 'vitest';
import {
  RELAPSE_BLOCK_THRESHOLD,
  buildDailySummary,
  buildEveningReminder,
  buildRelapseWarning,
  buildWeeklyReview,
  shouldSendDailySummary,
  shouldSendEveningReminder,
  shouldSendRelapseWarning,
  shouldSendWeeklyReview,
} from './notifications';
import { AppState, DEFAULT_STATE, HistoryEvent } from '../types';

const stateWith = (overrides: {
  eveningReminder?: boolean;
  dailySummary?: boolean;
  weeklyReview?: boolean;
  relapseWarning?: boolean;
  dailyStats?: AppState['dailyStats'];
}) => ({
  settings: {
    ...DEFAULT_STATE.settings,
    notifications: {
      ...DEFAULT_STATE.settings.notifications,
      eveningReminder: overrides.eveningReminder ?? true,
      dailySummary: overrides.dailySummary ?? true,
      weeklyReview: overrides.weeklyReview ?? true,
      relapseWarning: overrides.relapseWarning ?? true,
    },
  },
  dailyStats: overrides.dailyStats ?? {},
});

const dayStats = (dateKey: string, blockedOpens: number): AppState['dailyStats'] => ({
  [dateKey]: {
    date: dateKey,
    usageMinutes: {},
    blockedOpens,
    savedTimeMinutes: blockedOpens * 3,
    emergencyUnlocks: 0,
    focusMinutes: 0,
  },
});

const blockEvent = (timestamp: number): HistoryEvent => ({
  id: `block-${timestamp}`,
  timestamp,
  type: 'block',
  appId: 'instagram',
  desc: 'blockiert',
});

describe('daily summary', () => {
  // A Wednesday.
  const evening = new Date('2026-09-02T21:00');
  const afternoon = new Date('2026-09-02T15:00');

  it('fires in the evening when something happened', () => {
    const state = stateWith({ dailyStats: dayStats('2026-09-02', 4) });

    expect(shouldSendDailySummary(state, null, evening)).toBe(true);
  });

  it('stays quiet before the evening hour', () => {
    const state = stateWith({ dailyStats: dayStats('2026-09-02', 4) });

    expect(shouldSendDailySummary(state, null, afternoon)).toBe(false);
  });

  it('fires only once per day', () => {
    const state = stateWith({ dailyStats: dayStats('2026-09-02', 4) });

    expect(shouldSendDailySummary(state, '2026-09-02', evening)).toBe(false);
    expect(shouldSendDailySummary(state, '2026-09-01', evening)).toBe(true);
  });

  it('stays quiet on a day without activity', () => {
    expect(shouldSendDailySummary(stateWith({}), null, evening)).toBe(false);
  });

  it('follows its own switch, not the evening reminder', () => {
    const stats = dayStats('2026-09-02', 4);

    expect(shouldSendDailySummary(stateWith({ dailySummary: false, dailyStats: stats }), null, evening)).toBe(false);
    expect(shouldSendDailySummary(stateWith({ eveningReminder: false, dailyStats: stats }), null, evening)).toBe(true);
  });

  it('gives way to the weekly review on Sundays', () => {
    const sunday = new Date('2026-09-06T21:00');
    const stats = dayStats('2026-09-06', 4);

    expect(shouldSendDailySummary(stateWith({ dailyStats: stats }), null, sunday)).toBe(false);
    expect(shouldSendDailySummary(stateWith({ weeklyReview: false, dailyStats: stats }), null, sunday)).toBe(true);
  });

  it('reports the numbers of the day', () => {
    const payload = buildDailySummary({ dailyStats: dayStats('2026-09-02', 4) }, evening);

    expect(payload.body).toContain('4');
    expect(payload.tag).toBe('daily-summary-2026-09-02');
  });
});

describe('weekly review', () => {
  // A Sunday.
  const sundayEvening = new Date('2026-09-06T20:30');

  it('fires on Sunday evening when the week carries data', () => {
    const state = stateWith({ dailyStats: dayStats('2026-09-02', 3) });

    expect(shouldSendWeeklyReview(state, null, sundayEvening)).toBe(true);
    expect(shouldSendWeeklyReview(state, '2026-09-06', sundayEvening)).toBe(false);
  });

  it('stays quiet on other days, before the hour, without data or when switched off', () => {
    const state = stateWith({ dailyStats: dayStats('2026-09-02', 3) });

    expect(shouldSendWeeklyReview(state, null, new Date('2026-09-05T20:30'))).toBe(false);
    expect(shouldSendWeeklyReview(state, null, new Date('2026-09-06T15:00'))).toBe(false);
    expect(shouldSendWeeklyReview(stateWith({}), null, sundayEvening)).toBe(false);
    expect(
      shouldSendWeeklyReview(
        stateWith({ weeklyReview: false, dailyStats: dayStats('2026-09-02', 3) }),
        null,
        sundayEvening,
      ),
    ).toBe(false);
  });

  it('adds up the last seven days', () => {
    const payload = buildWeeklyReview(
      {
        dailyStats: {
          ...dayStats('2026-09-06', 2),
          ...dayStats('2026-09-02', 3),
          // Eight days back: outside the week.
          ...dayStats('2026-08-29', 50),
        },
      },
      sundayEvening,
    );

    expect(payload.body).toContain('5 Mal');
    expect(payload.body).toContain('15 Minuten');
    expect(payload.tag).toBe('weekly-review-2026-09-06');
  });
});

describe('evening reminder', () => {
  it('fires once per day from 22:00 while switched on', () => {
    const state = stateWith({});

    expect(shouldSendEveningReminder(state, null, new Date('2026-09-02T21:59'))).toBe(false);
    expect(shouldSendEveningReminder(state, null, new Date('2026-09-02T22:00'))).toBe(true);
    expect(shouldSendEveningReminder(state, '2026-09-02', new Date('2026-09-02T22:30'))).toBe(false);
    expect(shouldSendEveningReminder(stateWith({ eveningReminder: false }), null, new Date('2026-09-02T22:30'))).toBe(
      false,
    );
  });

  it('does not depend on the day, so it can be scheduled ahead', () => {
    expect(buildEveningReminder()).toEqual(buildEveningReminder());
  });
});

describe('relapse warning', () => {
  const now = 1_000_000_000;

  it('fires when blocks cluster', () => {
    const history = Array.from({ length: RELAPSE_BLOCK_THRESHOLD }, (_, index) => blockEvent(now - index * 60_000));

    expect(shouldSendRelapseWarning(stateWith({}), history, null, now)).toBe(true);
  });

  it('ignores blocks outside the window', () => {
    const history = Array.from({ length: RELAPSE_BLOCK_THRESHOLD }, (_, index) =>
      blockEvent(now - 40 * 60_000 - index * 60_000),
    );

    expect(shouldSendRelapseWarning(stateWith({}), history, null, now)).toBe(false);
  });

  it('does not repeat inside the same window', () => {
    const history = Array.from({ length: RELAPSE_BLOCK_THRESHOLD }, (_, index) => blockEvent(now - index * 60_000));

    expect(shouldSendRelapseWarning(stateWith({}), history, now - 5 * 60_000, now)).toBe(false);
    expect(shouldSendRelapseWarning(stateWith({}), history, now - 45 * 60_000, now)).toBe(true);
  });

  it('only counts blocks, not ordinary opens', () => {
    const history: HistoryEvent[] = Array.from({ length: 5 }, (_, index) => ({
      ...blockEvent(now - index * 60_000),
      type: 'open',
    }));

    expect(shouldSendRelapseWarning(stateWith({}), history, null, now)).toBe(false);
  });

  it('respects the setting', () => {
    const history = Array.from({ length: 5 }, (_, index) => blockEvent(now - index * 60_000));

    expect(shouldSendRelapseWarning(stateWith({ relapseWarning: false }), history, null, now)).toBe(false);
  });

  it('names the number of attempts', () => {
    expect(buildRelapseWarning(4).body).toContain('4');
  });
});
