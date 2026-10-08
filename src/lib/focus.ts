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

export interface FocusStartOptions {
  /** Apps to lock; all protected apps when left out. */
  appIds?: string[];
  kind?: FocusSession['kind'];
  strict?: boolean;
}

export const createFocusStartUpdate = (
  state: AppState,
  durationMinutes: number,
  now = Date.now(),
  options: FocusStartOptions = {},
): Partial<AppState> => {
  const kind = options.kind ?? 'focus';
  const focusSession: FocusSession = {
    id: createEventId(),
    startTime: now,
    endTime: null,
    duration: durationMinutes,
    successful: false,
    protectedApps:
      options.appIds ??
      Object.values(state.appsConfig)
        .filter((config) => config.active)
        .map((config) => config.id),
    blocksTriggered: 0,
    kind,
    // Rescue has no early end by design.
    strict: kind === 'rescue' || options.strict === true,
  };

  const event: HistoryEvent = {
    id: createEventId(),
    timestamp: now,
    type: 'focus_start',
    desc:
      kind === 'rescue' ? `Rescue für ${durationMinutes} Min. gestartet.` : `${durationMinutes} Min. Fokus gestartet.`,
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

export const getRunningFocusSession = (state: Pick<AppState, 'focusSessions'>) =>
  state.focusSessions.find((session) => session.endTime === null) ?? null;

/** The apps the running focus or rescue session locks; empty when none runs. */
export const getFocusBlockedAppIds = (state: Pick<AppState, 'focusSessions' | 'isFocusModeActive'>) =>
  state.isFocusModeActive ? (getRunningFocusSession(state)?.protectedApps ?? []) : [];

/** Minutes from now until a clock time today, or tomorrow when it has passed. */
export const minutesUntilClockTime = (hour: number, minute: number, now: Date = new Date()) => {
  const target = new Date(now);
  target.setHours(hour, minute, 0, 0);
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
  return Math.max(1, Math.round((target.getTime() - now.getTime()) / 60_000));
};
