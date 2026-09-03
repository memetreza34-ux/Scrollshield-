import { describe, expect, it } from 'vitest';
import {
  RELAPSE_BLOCK_THRESHOLD,
  buildEveningSummary,
  buildRelapseWarning,
  shouldSendEveningSummary,
  shouldSendRelapseWarning,
} from './notifications';
import { AppState, DEFAULT_STATE, HistoryEvent } from '../types';

const stateWith = (overrides: {
  eveningReminder?: boolean;
  relapseWarning?: boolean;
  dailyStats?: AppState['dailyStats'];
}) => ({
  settings: {
    ...DEFAULT_STATE.settings,
    notifications: {
      ...DEFAULT_STATE.settings.notifications,
      eveningReminder: overrides.eveningReminder ?? true,
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

describe('evening summary', () => {
  const evening = new Date('2026-09-02T21:00');
  const afternoon = new Date('2026-09-02T15:00');

  it('fires in the evening when something happened', () => {
    const state = stateWith({ dailyStats: dayStats('2026-09-02', 4) });

    expect(shouldSendEveningSummary(state, null, evening)).toBe(true);
  });

  it('stays quiet before the evening hour', () => {
    const state = stateWith({ dailyStats: dayStats('2026-09-02', 4) });

    expect(shouldSendEveningSummary(state, null, afternoon)).toBe(false);
  });

  it('fires only once per day', () => {
    const state = stateWith({ dailyStats: dayStats('2026-09-02', 4) });

    expect(shouldSendEveningSummary(state, '2026-09-02', evening)).toBe(false);
    expect(shouldSendEveningSummary(state, '2026-09-01', evening)).toBe(true);
  });

  it('stays quiet on a day without activity', () => {
    expect(shouldSendEveningSummary(stateWith({}), null, evening)).toBe(false);
  });

  it('respects the setting', () => {
    const state = stateWith({ eveningReminder: false, dailyStats: dayStats('2026-09-02', 4) });

    expect(shouldSendEveningSummary(state, null, evening)).toBe(false);
  });

  it('reports the numbers of the day', () => {
    const payload = buildEveningSummary({ dailyStats: dayStats('2026-09-02', 4) }, evening);

    expect(payload.body).toContain('4');
    expect(payload.tag).toBe('evening-2026-09-02');
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
