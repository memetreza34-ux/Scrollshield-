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

/**
 * Takes the short-video minutes the accessibility service measured on the
 * device into the daily stats, so the dashboard, the insights and the in-app
 * feed limit see them. Before, only the diagnostics screen read them.
 *
 * The native figure covers the whole day, so it replaces a smaller value
 * instead of adding to it: an in-app session may already have recorded part
 * of the same time. Returns the input unchanged when nothing grows, so callers
 * can skip the state update.
 */
export const mergeNativeShortVideoUsage = (
  dailyStats: AppState['dailyStats'],
  usage: { date: string; entries: { packageName: string; minutesToday: number }[] },
  platforms: { id: string; androidPackages: string[] }[],
): AppState['dailyStats'] => {
  const minutesByApp = new Map<string, number>();
  for (const entry of usage.entries) {
    if (!(entry.minutesToday > 0)) continue;
    const platform = platforms.find((candidate) => candidate.androidPackages.includes(entry.packageName));
    if (!platform) continue;
    // Lite and main builds of one app count together.
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
    const key = getShortVideoUsageKey(appId);
    if ((usageMinutes[key] ?? 0) >= minutes) continue;
    usageMinutes = { ...usageMinutes, [key]: minutes };
  }
  if (usageMinutes === existing.usageMinutes) return dailyStats;

  return { ...dailyStats, [usage.date]: { ...existing, usageMinutes } };
};
