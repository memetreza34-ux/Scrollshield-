import { AppState, DailyStats, HistoryEvent } from '../types';
import { createEventId, getLocalDateKey } from './appUtils';
import { applyPreset } from './presets';
import { normalizeAppConfig } from './state';

/**
 * A realistic day for the development preview, so every screen can be seen
 * filled: two protected apps, openings and interruptions today, late openings
 * over the past week, measured usage and screen time. Only reachable from the
 * debug screen, which the production build does not contain.
 */
export function createDemoState(state: AppState, now = new Date()): Partial<AppState> {
  const at = (daysAgo: number, hour: number, minute: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    date.setHours(hour, minute, 0, 0);
    return Math.min(date.getTime(), now.getTime() - 60_000);
  };
  const event = (
    type: HistoryEvent['type'],
    appId: string,
    timestamp: number,
    desc: string,
    metadata?: HistoryEvent['metadata'],
  ): HistoryEvent => ({ id: createEventId(), type, appId, timestamp, desc, ...(metadata ? { metadata } : {}) });

  const history: HistoryEvent[] = [
    event('open', 'instagram', at(0, 8, 5), 'App geöffnet'),
    event('warning', 'instagram', at(0, 8, 9), 'Wieder geöffnet: längere Pause'),
    event('open', 'instagram', at(0, 8, 10), 'App geöffnet'),
    event('warning', 'instagram', at(0, 8, 14), 'Wieder geöffnet: längere Pause'),
    event('open', 'instagram', at(0, 8, 15), 'App geöffnet'),
    event('warning', 'instagram', at(0, 12, 30), 'Unterbrochen und nicht geöffnet', { outcome: 'stopped' }),
    event('block', 'instagram', at(0, 12, 41), 'Kurzvideo: Tageslimit erreicht', { surface: 'reels' }),
    event('open', 'tiktok', at(0, 13, 2), 'App geöffnet'),
    event('warning', 'tiktok', at(0, 13, 20), 'Unterbrochen und nicht geöffnet', { outcome: 'stopped' }),
    event('warning', 'tiktok', at(0, 13, 25), 'Unterbrochen und nicht geöffnet', { outcome: 'stopped' }),
    ...[1, 2, 3, 4, 5].map((daysAgo) => event('open', 'tiktok', at(daysAgo, 22, 10 + daysAgo), 'App geöffnet')),
  ].sort((a, b) => b.timestamp - a.timestamp);

  const day = (daysAgo: number, screenTimeMinutes: number, instagram: number, reels: number, tiktok: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    const key = getLocalDateKey(date);
    const stats: DailyStats = {
      date: key,
      usageMinutes: { instagram, instagram_reels: reels, tiktok },
      blockedOpens: 0,
      savedTimeMinutes: 0,
      emergencyUnlocks: 0,
      focusMinutes: daysAgo === 0 ? 30 : 0,
      screenTimeMinutes,
    };
    return [key, stats] as const;
  };

  const appsConfig = { ...state.appsConfig };
  for (const appId of ['instagram', 'tiktok']) {
    appsConfig[appId] = { ...applyPreset(normalizeAppConfig(appId, appsConfig[appId]), 'ausgewogen'), active: true };
  }

  return {
    hasCompletedOnboarding: true,
    appsConfig,
    history,
    dailyStats: Object.fromEntries([day(0, 192, 48, 12, 17), day(1, 220, 61, 25, 34), day(2, 205, 55, 20, 30)]),
    schedules: [],
    dismissedSuggestions: {},
  };
}
