import { describe, expect, it } from 'vitest';
import {
  buildDailySummary,
  buildFocusFinished,
  buildWeeklyReview,
  shouldSendDailySummary,
  shouldSendWeeklyReview,
} from './notifications';
import { AppState, DEFAULT_STATE, HistoryEvent } from '../types';

const appsConfig: AppState['appsConfig'] = {
  ...DEFAULT_STATE.appsConfig,
  instagram: { ...DEFAULT_STATE.appsConfig.instagram, active: true },
};

const stateWith = (overrides: {
  dailySummary?: boolean;
  weeklyReview?: boolean;
  pro?: boolean;
  history?: HistoryEvent[];
}) => ({
  pro: { active: overrides.pro ?? true },
  settings: {
    ...DEFAULT_STATE.settings,
    notifications: {
      ...DEFAULT_STATE.settings.notifications,
      dailySummary: overrides.dailySummary ?? true,
      weeklyReview: overrides.weeklyReview ?? true,
    },
  },
  history: overrides.history ?? [],
  dailyStats: {},
  appsConfig,
});

/** An interruption; `stopped` means the user chose "Zurück". */
const interruption = (at: string, stopped = false): HistoryEvent => ({
  id: `block-${at}`,
  timestamp: new Date(at).getTime(),
  type: 'block',
  appId: 'instagram',
  desc: '',
  ...(stopped ? { metadata: { outcome: 'stopped' } } : {}),
});

describe('daily summary', () => {
  // A Wednesday.
  const evening = new Date('2026-09-02T21:30');
  const today = [interruption('2026-09-02T10:00', true), interruption('2026-09-02T12:00')];

  it('fires from 21:00 when something was interrupted', () => {
    expect(shouldSendDailySummary(stateWith({ history: today }), null, evening)).toBe(true);
    expect(shouldSendDailySummary(stateWith({ history: today }), null, new Date('2026-09-02T20:59'))).toBe(false);
  });

  it('fires only once per day', () => {
    const state = stateWith({ history: today });

    expect(shouldSendDailySummary(state, '2026-09-02', evening)).toBe(false);
    expect(shouldSendDailySummary(state, '2026-09-01', evening)).toBe(true);
  });

  it('stays quiet on a day without an interruption and when switched off', () => {
    expect(shouldSendDailySummary(stateWith({}), null, evening)).toBe(false);
    expect(shouldSendDailySummary(stateWith({ dailySummary: false, history: today }), null, evening)).toBe(false);
  });

  it('gives way to the weekly review on Sundays', () => {
    const sunday = new Date('2026-09-06T21:30');
    const history = [interruption('2026-09-06T10:00')];

    expect(shouldSendDailySummary(stateWith({ history }), null, sunday)).toBe(false);
    expect(shouldSendDailySummary(stateWith({ weeklyReview: false, history }), null, sunday)).toBe(true);
    expect(shouldSendDailySummary(stateWith({ pro: false, history }), null, sunday)).toBe(true);
  });

  it('reports interruptions and "Zurück" without praise or saved time', () => {
    const payload = buildDailySummary(stateWith({ history: today }), evening);

    expect(payload.title).toBe('Heute');
    expect(payload.body).toBe('2-mal unterbrochen, 1-mal Zurück.');
    expect(payload.tag).toBe('daily-summary-2026-09-02');
  });
});

describe('weekly review', () => {
  // A Sunday.
  const sundayEvening = new Date('2026-09-06T18:30');
  const week = [
    interruption('2026-09-06T09:00', true),
    interruption('2026-09-02T09:00'),
    interruption('2026-09-02T10:00', true),
    // Eight days back: outside the week.
    interruption('2026-08-29T09:00'),
  ];

  it('fires on Sunday from 18:00 when the week had an interruption', () => {
    expect(shouldSendWeeklyReview(stateWith({ history: week }), null, sundayEvening)).toBe(true);
    expect(shouldSendWeeklyReview(stateWith({ history: week }), '2026-09-06', sundayEvening)).toBe(false);
  });

  it('stays quiet on other days, before the hour, without data or when switched off', () => {
    const state = stateWith({ history: week });

    expect(shouldSendWeeklyReview(state, null, new Date('2026-09-05T18:30'))).toBe(false);
    expect(shouldSendWeeklyReview(state, null, new Date('2026-09-06T17:59'))).toBe(false);
    expect(shouldSendWeeklyReview(stateWith({}), null, sundayEvening)).toBe(false);
    expect(shouldSendWeeklyReview(stateWith({ weeklyReview: false, history: week }), null, sundayEvening)).toBe(false);
  });

  it('belongs to Pro', () => {
    expect(shouldSendWeeklyReview(stateWith({ pro: false, history: week }), null, sundayEvening)).toBe(false);
  });

  it('adds up the last seven days', () => {
    const payload = buildWeeklyReview(stateWith({ history: week }), sundayEvening);

    expect(payload.title).toBe('Deine Woche');
    expect(payload.body).toBe('Diese Woche 3-mal unterbrochen, 2-mal Zurück.');
    expect(payload.tag).toBe('weekly-review-2026-09-06');
  });
});

describe('focus end', () => {
  it('names the duration, nothing more', () => {
    expect(buildFocusFinished(30)).toMatchObject({ title: 'Fokus beendet', body: '30 Min. Fokus.' });
  });
});
