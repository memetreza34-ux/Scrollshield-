import { AppState } from '../types';
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
