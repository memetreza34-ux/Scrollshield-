import { AppState, DailyStats, FocusSession, HistoryEvent } from '../types';
import { createEventId, getLocalDateKey } from './appUtils';

const getDailyStatsBucket = (dailyStats: AppState['dailyStats'], timestamp: number): DailyStats => {
  const dateKey = getLocalDateKey(new Date(timestamp));
  return (
    dailyStats[dateKey] || {
      date: dateKey,
      usageMinutes: {},
      blockedOpens: 0,
      savedTimeMinutes: 0,
      emergencyUnlocks: 0,
      focusMinutes: 0,
    }
  );
};

const addFocusMinutes = (dailyStats: AppState['dailyStats'], minutes: number, timestamp: number) => {
  if (minutes <= 0) return dailyStats;

  const dateKey = getLocalDateKey(new Date(timestamp));
  const existing = getDailyStatsBucket(dailyStats, timestamp);

  return {
    ...dailyStats,
    [dateKey]: {
      ...existing,
      focusMinutes: existing.focusMinutes + minutes,
    },
  };
};

export const createFocusStartUpdate = (
  state: AppState,
  durationMinutes: number,
  now = Date.now(),
): Partial<AppState> => {
  const focusSession: FocusSession = {
    id: createEventId(),
    startTime: now,
    endTime: null,
    duration: durationMinutes,
    successful: false,
    protectedApps: Object.values(state.appsConfig)
      .filter((config) => config.active)
      .map((config) => config.id),
    blocksTriggered: 0,
  };

  const event: HistoryEvent = {
    id: createEventId(),
    timestamp: now,
    type: 'focus_start',
    desc: `${durationMinutes} Min. Fokus-Sitzung gestartet.`,
  };

  return {
    isFocusModeActive: true,
    focusTimeRemaining: durationMinutes,
    focusSessions: [focusSession, ...state.focusSessions],
    history: [event, ...state.history],
  };
};

export const createFocusEndUpdate = (state: AppState, successful: boolean, now = Date.now()): Partial<AppState> => {
  const activeSession = state.focusSessions.find((session) => session.endTime === null);
  const elapsedMinutes = activeSession
    ? Math.max(0, Math.min(activeSession.duration, Math.ceil((now - activeSession.startTime) / 60_000)))
    : 0;
  const creditedMinutes = successful && activeSession ? activeSession.duration : elapsedMinutes;

  const event: HistoryEvent = {
    id: createEventId(),
    timestamp: now,
    type: 'focus_end',
    desc: successful ? 'Fokus-Sitzung erfolgreich beendet.' : 'Fokus-Sitzung vorzeitig abgebrochen.',
  };

  return {
    isFocusModeActive: false,
    focusTimeRemaining: 0,
    focusSessions: state.focusSessions.map((session) =>
      session.id === activeSession?.id ? { ...session, endTime: now, successful } : session,
    ),
    dailyStats: addFocusMinutes(state.dailyStats, creditedMinutes, now),
    history: [event, ...state.history],
  };
};

export const reconcileFocusRuntime = (state: AppState, now = Date.now()): Partial<AppState> | null => {
  const activeSession = state.focusSessions.find((session) => session.endTime === null);

  if (!activeSession) {
    return state.isFocusModeActive || state.focusTimeRemaining !== 0
      ? { isFocusModeActive: false, focusTimeRemaining: 0 }
      : null;
  }

  const scheduledEnd = activeSession.startTime + activeSession.duration * 60_000;
  if (now >= scheduledEnd) {
    return createFocusEndUpdate({ ...state, isFocusModeActive: true }, true, scheduledEnd);
  }

  const focusTimeRemaining = Math.max(1, Math.ceil((scheduledEnd - now) / 60_000));
  if (state.isFocusModeActive && state.focusTimeRemaining === focusTimeRemaining) return null;

  return { isFocusModeActive: true, focusTimeRemaining };
};
