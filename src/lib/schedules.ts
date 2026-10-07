import type { Schedule } from '../types';
import { createEventId } from './appUtils';

/**
 * Schedules
 * ═════════
 * A schedule locks the chosen apps every day between two full hours. They
 * replace the four fixed time windows (morning, work, evening, night), which
 * could not express "21:00–07:00". The native service evaluates the same
 * hours itself (NativeTimeWindows), because ScrollShield may not be running
 * when a schedule starts.
 */

/** The rule a native time window applies; schedules only ever lock. */
export type TimeWindowRule = 'normal' | 'strict' | 'block';

export const isHourInRange = (hour: number, startHour: number, endHour: number) =>
  startHour < endHour ? hour >= startHour && hour < endHour : hour >= startHour || hour < endHour;

/** The first active schedule that locks this app at this moment, if any. */
export function getActiveScheduleForApp(schedules: Schedule[], appId: string, now: Date = new Date()) {
  return schedules.find(
    (schedule) =>
      schedule.active &&
      schedule.startHour !== schedule.endHour &&
      schedule.appIds.includes(appId) &&
      isHourInRange(now.getHours(), schedule.startHour, schedule.endHour),
  );
}

const pad = (hour: number) => `${hour.toString().padStart(2, '0')}:00`;

export const formatScheduleRange = (schedule: Pick<Schedule, 'startHour' | 'endHour'>) =>
  `${pad(schedule.startHour)}–${pad(schedule.endHour)}`;

/** The next start of any active schedule, for "Ab 21:00 Abend" on Heute. */
export function getNextSchedule(schedules: Schedule[], now: Date = new Date()) {
  const hour = now.getHours();
  const upcoming = schedules
    .filter((schedule) => schedule.active && schedule.appIds.length > 0 && schedule.startHour !== schedule.endHour)
    .map((schedule) => ({ schedule, hoursAway: (schedule.startHour - hour + 24) % 24 || 24 }))
    .sort((a, b) => a.hoursAway - b.hoursAway);
  return upcoming[0]?.schedule ?? null;
}

export const createSchedule = (appIds: string[]): Schedule => ({
  id: createEventId(),
  name: 'Abend',
  startHour: 21,
  endHour: 7,
  appIds,
  active: true,
});
