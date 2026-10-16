import { t } from '../i18n';
import type { AppState, HistoryEvent } from '../types';
import { getLocalDateKey } from './appUtils';
import { getShortVideoUsageKey } from './stats';

/**
 * Metrics (docs/V1_MASTER_PLAN.md, section 9)
 * ═══════════════════════════════════════════
 * Every number comes from an event or a measurement of the system, or is plain
 * arithmetic on those. Nothing is estimated: there is no "time saved".
 */

/** A reopen is an opening within this many minutes after the previous one of the same app. */
export const REOPEN_WINDOW_MINUTES = 10;

export interface AppDayMetrics {
  appId: string;
  opens: number;
  reopens: number;
  interruptions: number;
  abandoned: number;
  usageMinutes: number | null;
  shortVideoMinutes: number | null;
}

export interface DayMetrics {
  interruptions: number;
  abandoned: number;
  opens: number;
  reopens: number;
  emergencyUnlocks: number;
  focusMinutes: number;
  perApp: AppDayMetrics[];
}

const isInterruption = (event: HistoryEvent) => event.type === 'block' || event.type === 'warning';

/** The user was interrupted and did not open the app (Android: "stopped"). */
const isAbandoned = (event: HistoryEvent) => event.metadata?.outcome === 'stopped';

const dayBounds = (date: Date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.getTime(), end: end.getTime() };
};

export const eventsOnDay = (history: HistoryEvent[], date: Date) => {
  const { start, end } = dayBounds(date);
  return history.filter((event) => event.timestamp >= start && event.timestamp < end);
};

/** Openings of an app that followed the previous opening within REOPEN_WINDOW_MINUTES. */
export const countReopens = (events: HistoryEvent[]) => {
  const opens = events.filter((event) => event.type === 'open').sort((a, b) => a.timestamp - b.timestamp);
  let reopens = 0;
  for (let index = 1; index < opens.length; index++) {
    if (opens[index].timestamp - opens[index - 1].timestamp <= REOPEN_WINDOW_MINUTES * 60_000) reopens++;
  }
  return reopens;
};

export function getDayMetrics(
  state: Pick<AppState, 'history' | 'dailyStats' | 'appsConfig'>,
  date = new Date(),
): DayMetrics {
  const events = eventsOnDay(state.history, date);
  const stats = state.dailyStats[getLocalDateKey(date)];
  const appIds = Object.values(state.appsConfig)
    .filter((config) => config.active)
    .map((config) => config.id);

  const perApp = appIds.map((appId): AppDayMetrics => {
    const appEvents = events.filter((event) => event.appId === appId);
    const usage = stats?.usageMinutes[appId];
    const shortVideo = stats?.usageMinutes[getShortVideoUsageKey(appId)];
    return {
      appId,
      opens: appEvents.filter((event) => event.type === 'open').length,
      reopens: countReopens(appEvents),
      interruptions: appEvents.filter(isInterruption).length,
      abandoned: appEvents.filter(isAbandoned).length,
      usageMinutes: usage ?? null,
      shortVideoMinutes: shortVideo ?? null,
    };
  });

  return {
    interruptions: events.filter(isInterruption).length,
    abandoned: events.filter(isAbandoned).length,
    opens: events.filter((event) => event.type === 'open').length,
    reopens: perApp.reduce((sum, app) => sum + app.reopens, 0),
    emergencyUnlocks: events.filter((event) => event.type === 'emergency').length,
    focusMinutes: stats?.focusMinutes ?? 0,
    perApp,
  };
}

/** An interruption on the day's timeline: did the user go back, or open the app anyway? */
export interface DayMark {
  timestamp: number;
  wentBack: boolean;
}

/**
 * The interruptions of a day for the timeline on "Start". Going back after a
 * pause and a lock count as "went back"; continuing after a pause as "opened
 * anyway". A longer pause is recorded when shown and again when decided, so
 * only the decision counts; a warning without any outcome (browser preview)
 * was followed by opening.
 */
export function getDayMarks(history: HistoryEvent[], date = new Date()): DayMark[] {
  return eventsOnDay(history, date)
    .flatMap((event): DayMark[] => {
      const outcome = event.metadata?.outcome;
      if (outcome === 'stopped' || event.type === 'block') return [{ timestamp: event.timestamp, wentBack: true }];
      if (outcome === 'continued') return [{ timestamp: event.timestamp, wentBack: false }];
      if (event.type === 'warning' && outcome === undefined) return [{ timestamp: event.timestamp, wentBack: false }];
      return [];
    })
    .sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Minutes the protected apps (or, with `field`, the whole phone) usually had by this time of day: the average
 * over the last 7 days that have an hourly record, counting the current hour
 * in proportion. Undefined with fewer than 3 such days – too few to compare.
 */
export function usualMinutesByNow(
  dailyStats: AppState['dailyStats'],
  now = new Date(),
  field: 'usagePerHour' | 'screenTimePerHour' = 'usagePerHour',
): number | undefined {
  const hour = now.getHours();
  const sums: number[] = [];
  for (let back = 1; back <= 7; back++) {
    const day = new Date(now);
    day.setDate(day.getDate() - back);
    const perHour = dailyStats[getLocalDateKey(day)]?.[field];
    if (!perHour || perHour.length !== 24) continue;
    const fullHours = perHour.slice(0, hour).reduce((sum, minutes) => sum + minutes, 0);
    sums.push(fullHours + perHour[hour] * (now.getMinutes() / 60));
  }
  return sums.length >= 3 ? Math.round(sums.reduce((sum, minutes) => sum + minutes, 0) / sums.length) : undefined;
}

/** One concrete observation for an app today, or null when nothing stands out. */
export type AppDayObservation = { kind: 'reopens' | 'shortVideo' | 'abandoned'; text: string };

/** The one concrete observation for an app's day, if there is one. */
export function describeAppDay(app: AppDayMetrics): AppDayObservation | null {
  if (app.reopens >= 2)
    return {
      kind: 'reopens',
      text: t('today.observation.reopens', { count: app.reopens, minutes: REOPEN_WINDOW_MINUTES }),
    };
  if (app.shortVideoMinutes !== null && app.shortVideoMinutes > 0)
    return { kind: 'shortVideo', text: t('today.observation.shortVideo', { minutes: app.shortVideoMinutes }) };
  if (app.abandoned > 0) return { kind: 'abandoned', text: t('today.observation.abandoned', { count: app.abandoned }) };
  return null;
}

/** The last seven days, oldest first, for the week view. */
export function getWeekMetrics(state: Pick<AppState, 'history' | 'dailyStats' | 'appsConfig'>, now = new Date()) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (6 - index));
    return { date, metrics: getDayMetrics(state, date) };
  });
}

/** Reopens per hour of day over the last 14 days. */
export function getReopenHours(history: HistoryEvent[], now = Date.now()) {
  const since = now - 14 * 24 * 60 * 60_000;
  const byApp = new Map<string, HistoryEvent[]>();
  for (const event of history) {
    if (event.type !== 'open' || !event.appId || event.timestamp < since) continue;
    byApp.set(event.appId, [...(byApp.get(event.appId) ?? []), event]);
  }
  const hours = new Array(24).fill(0) as number[];
  for (const opens of byApp.values()) {
    opens.sort((a, b) => a.timestamp - b.timestamp);
    for (let index = 1; index < opens.length; index++) {
      if (opens[index].timestamp - opens[index - 1].timestamp <= REOPEN_WINDOW_MINUTES * 60_000) {
        hours[new Date(opens[index].timestamp).getHours()]++;
      }
    }
  }
  return hours;
}
