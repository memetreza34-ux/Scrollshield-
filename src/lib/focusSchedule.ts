import { AppState, FocusSchedule } from '../types';
import { getLocalDateKey } from './appUtils';
import { createFocusStartUpdate } from './focus';

const getMinutes = (time: string) => {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export const getCurrentScheduleWindow = (schedule: FocusSchedule, now: number) => {
  const startMinutes = getMinutes(schedule.startTime);
  const endMinutes = getMinutes(schedule.endTime);
  if (startMinutes === null || endMinutes === null || startMinutes === endMinutes || schedule.days.length === 0) {
    return null;
  }

  for (const offset of [0, -1]) {
    const startDay = new Date(now);
    startDay.setHours(0, 0, 0, 0);
    startDay.setDate(startDay.getDate() + offset);
    if (!schedule.days.includes(startDay.getDay())) continue;

    const start = new Date(startDay);
    start.setMinutes(startMinutes);
    const end = new Date(startDay);
    end.setDate(end.getDate() + (endMinutes <= startMinutes ? 1 : 0));
    end.setMinutes(endMinutes);

    if (now >= start.getTime() && now < end.getTime()) {
      return { key: getLocalDateKey(startDay), end: end.getTime() };
    }
  }

  return null;
};

export const reconcileFocusSchedules = (state: AppState, now = Date.now()): Partial<AppState> | null => {
  if (!state.hasCompletedOnboarding || state.pendingFocusResultId) return null;

  const due = state.focusSchedules
    .filter((schedule) => schedule.active)
    .map((schedule) => ({ schedule, window: getCurrentScheduleWindow(schedule, now) }))
    .filter(({ schedule, window }) => window && schedule.lastStartedOn !== window.key);

  if (due.length === 0) return null;

  const focusSchedules = state.focusSchedules.map((schedule) => {
    const match = due.find((item) => item.schedule.id === schedule.id);
    return match?.window ? { ...schedule, lastStartedOn: match.window.key } : schedule;
  });

  if (state.isFocusModeActive || state.focusSessions.some((session) => session.endTime === null)) {
    return { focusSchedules };
  }

  const nextWindow = due[0].window;
  const minutesRemaining = nextWindow ? Math.ceil((nextWindow.end - now) / 60_000) : 0;
  if (minutesRemaining < 1) return { focusSchedules };

  return {
    ...createFocusStartUpdate({ ...state, focusSchedules }, minutesRemaining, now),
    focusSchedules,
  };
};
