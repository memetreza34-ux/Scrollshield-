import { AppState, DailyStats } from '../types';
import { getLocalDateKey } from './appUtils';

const isShortVideoUsageKey = (key: string) => {
  const normalized = key.toLowerCase();
  return normalized.includes('reels') || normalized.includes('short') || normalized.includes('shorts');
};

export const getShortVideoUsageKey = (appId: string) => `${appId}_reels`;

/**
 * Whether the feed settings alone block the feed. A limit of 0 minutes means
 * "blocked" – the settings label it "Blockiert" – not "no limit". The native
 * service reads 0 as "no limit", so a feed blocked this way has to reach it as
 * mode `block`; see buildNativeProtectionRules.
 */
export const isShortVideoFeedBlockedByConfig = (feed: {
  mode: 'allow' | 'warn' | 'limit' | 'block';
  dailyLimitMinutes?: number;
  sessionLimitMinutes?: number;
}) => {
  if (feed.mode === 'allow') return false;
  return feed.mode === 'block' || feed.dailyLimitMinutes === 0 || feed.sessionLimitMinutes === 0;
};

const isReelsEvent = (event: AppState['history'][number]) => {
  return (
    event.metadata?.surface === 'reels' ||
    event.metadata?.contentType === 'short_video' ||
    event.trigger === 'reels_protection'
  );
};

export const getReelsStatsForDate = (state: AppState, date = new Date()) => {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);

  const dayKey = getLocalDateKey(dayStart);
  const dayStats = state.dailyStats[dayKey];
  const reelsEvents = state.history.filter((event) => event.timestamp >= dayStart.getTime() && isReelsEvent(event));

  return {
    reelsTimeTodayMinutes: Object.entries(dayStats?.usageMinutes ?? {})
      .filter(([key]) => isShortVideoUsageKey(key))
      .reduce((total, [, minutes]) => total + minutes, 0),
    reelsBlockedSessions: reelsEvents.filter((event) => event.type === 'block' || event.type === 'warning').length,
    singleItemsCount: reelsEvents.reduce((total, event) => {
      const viewed = event.metadata?.singleItemsViewed ?? event.metadata?.singleItemsAllowed ?? 0;
      return total + (typeof viewed === 'number' ? viewed : 0);
    }, 0),
  };
};

export const getReelsUsageMinutesForAppDate = (state: AppState, appId: string, date = new Date()) => {
  const dateKey = getLocalDateKey(date);
  return state.dailyStats[dateKey]?.usageMinutes[getShortVideoUsageKey(appId)] ?? 0;
};

type NativeUsage = { date: string; entries: { packageName: string; minutesToday: number }[] };
type PlatformPackages = { id: string; androidPackages: string[] };

/**
 * Takes minutes measured on the device into the daily stats under
 * `keyFor(appId)`. The native figure covers the whole day, so it replaces a
 * smaller value instead of adding to it: an in-app session may already have
 * recorded part of the same time. Main and lite builds of one app count
 * together. Returns the input unchanged when nothing grows, so callers can
 * skip the state update.
 */
const mergeNativeMinutes = (
  dailyStats: AppState['dailyStats'],
  usage: NativeUsage,
  platforms: PlatformPackages[],
  keyFor: (appId: string) => string,
): AppState['dailyStats'] => {
  const minutesByApp = new Map<string, number>();
  for (const entry of usage.entries) {
    if (!(entry.minutesToday > 0)) continue;
    const platform = platforms.find((candidate) => candidate.androidPackages.includes(entry.packageName));
    if (!platform) continue;
    minutesByApp.set(platform.id, (minutesByApp.get(platform.id) ?? 0) + entry.minutesToday);
  }
  if (minutesByApp.size === 0) return dailyStats;

  const existing: DailyStats = dailyStats[usage.date] ?? {
    date: usage.date,
    usageMinutes: {},
    blockedOpens: 0,
    savedTimeMinutes: 0,
    emergencyUnlocks: 0,
    focusMinutes: 0,
  };

  let usageMinutes = existing.usageMinutes;
  for (const [appId, minutes] of minutesByApp) {
    const key = keyFor(appId);
    if ((usageMinutes[key] ?? 0) >= minutes) continue;
    usageMinutes = { ...usageMinutes, [key]: minutes };
  }
  if (usageMinutes === existing.usageMinutes) return dailyStats;

  return { ...dailyStats, [usage.date]: { ...existing, usageMinutes } };
};

/**
 * Short-video minutes the accessibility service measured. Before, only the
 * diagnostics screen read them; now the dashboard, the insights and the
 * in-app feed limit see them.
 */
export const mergeNativeShortVideoUsage = (
  dailyStats: AppState['dailyStats'],
  usage: NativeUsage,
  platforms: PlatformPackages[],
): AppState['dailyStats'] => mergeNativeMinutes(dailyStats, usage, platforms, getShortVideoUsageKey);

/**
 * Minutes the protected apps were in the foreground on the device. Before,
 * app usage only counted sessions inside ScrollShield, so the daily limit and
 * the usage figures ignored the real phone.
 */
export const mergeNativeAppUsage = (
  dailyStats: AppState['dailyStats'],
  usage: NativeUsage,
  platforms: PlatformPackages[],
): AppState['dailyStats'] => mergeNativeMinutes(dailyStats, usage, platforms, (appId) => appId);

/** Stores the device's measured screen time for today and yesterday in the daily stats. */
export const mergeScreenTime = (
  dailyStats: AppState['dailyStats'],
  screenTime: { date: string; todayMinutes?: number; yesterdayMinutes?: number },
): AppState['dailyStats'] => {
  const today = new Date(`${screenTime.date}T12:00:00`);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let next = dailyStats;
  const put = (date: Date, minutes: number | undefined) => {
    if (minutes === undefined || !Number.isFinite(minutes)) return;
    const key = getLocalDateKey(date);
    const existing: DailyStats = next[key] ?? {
      date: key,
      usageMinutes: {},
      blockedOpens: 0,
      savedTimeMinutes: 0,
      emergencyUnlocks: 0,
      focusMinutes: 0,
    };
    if (existing.screenTimeMinutes === minutes) return;
    next = { ...next, [key]: { ...existing, screenTimeMinutes: Math.max(0, Math.round(minutes)) } };
  };
  put(today, screenTime.todayMinutes);
  put(yesterday, screenTime.yesterdayMinutes);
  return next;
};

/** Stores the protected apps' minutes per hour of a day, for the day's timeline on "Start". */
export const mergeUsagePerHour = (
  dailyStats: AppState['dailyStats'],
  usage: { date: string; minutesPerHour: number[] },
): AppState['dailyStats'] => {
  if (usage.minutesPerHour.length !== 24) return dailyStats;
  const perHour = usage.minutesPerHour.map((minutes) =>
    Number.isFinite(minutes) ? Math.min(60, Math.max(0, Math.round(minutes))) : 0,
  );
  const existing: DailyStats = dailyStats[usage.date] ?? {
    date: usage.date,
    usageMinutes: {},
    blockedOpens: 0,
    savedTimeMinutes: 0,
    emergencyUnlocks: 0,
    focusMinutes: 0,
  };
  if (existing.usagePerHour?.every((minutes, hour) => minutes === perHour[hour])) return dailyStats;
  return { ...dailyStats, [usage.date]: { ...existing, usagePerHour: perHour } };
};
