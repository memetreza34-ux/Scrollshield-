import { AppState, DailyStats, HistoryEvent } from '../types';
import { getLocalDateKey } from './appUtils';

type ActiveSession = NonNullable<AppState['activeSession']>;

export const getSessionElapsedSeconds = (session: ActiveSession, now = Date.now()) => {
  const effectiveNow = session.isPaused && session.pausedAt ? session.pausedAt : now;
  return Math.max(0, Math.floor((effectiveNow - session.startTime) / 1000));
};

export const getSessionLimitSeconds = (session: ActiveSession, defaultSessionLimitMinutes: number) => {
  const sessionLimitMinutes = session.sessionLimitOverride ?? defaultSessionLimitMinutes;
  if (sessionLimitMinutes <= 0) return 0;

  return sessionLimitMinutes * 60 + session.extensionCount * 300;
};

export const isSessionLimitEnabled = (limitSeconds: number) => limitSeconds > 0;

export const recordSessionUsage = (
  dailyStats: AppState['dailyStats'],
  appId: string,
  durationMinutes: number,
  timestamp = Date.now(),
) => {
  const dateKey = getLocalDateKey(new Date(timestamp));
  const existing: DailyStats = dailyStats[dateKey] || {
    date: dateKey,
    usageMinutes: {},
    blockedOpens: 0,
    savedTimeMinutes: 0,
    emergencyUnlocks: 0,
    focusMinutes: 0,
  };

  return {
    ...dailyStats,
    [dateKey]: {
      ...existing,
      usageMinutes: {
        ...existing.usageMinutes,
        [appId]: (existing.usageMinutes[appId] || 0) + durationMinutes,
      },
    },
  };
};

export const recordProtectionEventStats = (
  dailyStats: AppState['dailyStats'],
  type: HistoryEvent['type'],
  timestamp = Date.now(),
) => {
  const isBlockLike = type === 'block' || type === 'warning';
  const isEmergency = type === 'emergency';

  if (!isBlockLike && !isEmergency) return dailyStats;

  const dateKey = getLocalDateKey(new Date(timestamp));
  const existing: DailyStats = dailyStats[dateKey] || {
    date: dateKey,
    usageMinutes: {},
    blockedOpens: 0,
    savedTimeMinutes: 0,
    emergencyUnlocks: 0,
    focusMinutes: 0,
  };

  return {
    ...dailyStats,
    [dateKey]: {
      ...existing,
      blockedOpens: existing.blockedOpens + (isBlockLike ? 1 : 0),
      savedTimeMinutes: existing.savedTimeMinutes + (isBlockLike ? 5 : 0),
      emergencyUnlocks: existing.emergencyUnlocks + (isEmergency ? 1 : 0),
    },
  };
};
