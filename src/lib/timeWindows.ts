import { AppConfig } from '../types';

/**
 * Time-window rules
 * ═════════════════
 * `AppConfig.timeWindows` has existed since the first release but was never
 * evaluated: the values were normalized on load and then ignored, so a profile
 * configured with `workRules: 'strict'` behaved exactly like one without.
 *
 * The window boundaries below are a product decision, not a user setting. They
 * are deliberately coarse — a per-app schedule editor would be a different
 * feature — and they are documented in the UI so the labels are not guesswork.
 */

export type TimeWindowId = 'morning' | 'work' | 'evening' | 'night' | 'weekend';
export type TimeWindowRule = 'normal' | 'strict' | 'block';

export interface TimeWindowDefinition {
  id: Exclude<TimeWindowId, 'weekend'>;
  label: string;
  /** Inclusive start hour in local time */
  startHour: number;
  /** Exclusive end hour in local time */
  endHour: number;
}

/**
 * Windows are checked in order and do not overlap. Night wraps past midnight
 * and is therefore expressed as start > end.
 */
export const TIME_WINDOWS: TimeWindowDefinition[] = [
  { id: 'morning', label: 'Morgen (6–9 Uhr)', startHour: 6, endHour: 9 },
  { id: 'work', label: 'Arbeitszeit (9–18 Uhr)', startHour: 9, endHour: 18 },
  { id: 'evening', label: 'Abend (18–22 Uhr)', startHour: 18, endHour: 22 },
  { id: 'night', label: 'Nacht (22–6 Uhr)', startHour: 22, endHour: 6 },
];

const isWeekend = (date: Date) => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

/** Returns the window a moment falls into, ignoring the weekend rule. */
export function getTimeWindow(now: Date = new Date()): TimeWindowDefinition['id'] {
  const hour = now.getHours();

  for (const window of TIME_WINDOWS) {
    if (window.startHour < window.endHour) {
      if (hour >= window.startHour && hour < window.endHour) return window.id;
    } else if (hour >= window.startHour || hour < window.endHour) {
      // Wrapping window (night)
      return window.id;
    }
  }

  return 'night';
}

/**
 * Resolves which rule applies right now.
 *
 * The weekend rule wins over the time-of-day rule, but only when it is stricter:
 * someone who set `weekendRules: 'normal'` should not lose their night block on
 * a Saturday.
 */
export function getActiveTimeWindowRule(
  timeWindows: AppConfig['timeWindows'] | undefined,
  now: Date = new Date(),
): { window: TimeWindowId; rule: TimeWindowRule } {
  // Opt-in: stored configurations carry rule values that were never evaluated,
  // so they must not take effect until the user turns the feature on.
  if (!timeWindows?.enabled) return { window: getTimeWindow(now), rule: 'normal' };

  const window = getTimeWindow(now);
  const byTimeOfDay: TimeWindowRule = timeWindows[`${window}Rules`] ?? 'normal';

  if (!isWeekend(now)) return { window, rule: byTimeOfDay };

  const weekendRule = timeWindows.weekendRules ?? 'normal';
  const severity: Record<TimeWindowRule, number> = { normal: 0, strict: 1, block: 2 };

  return severity[weekendRule] > severity[byTimeOfDay]
    ? { window: 'weekend', rule: weekendRule }
    : { window, rule: byTimeOfDay };
}

const WINDOW_LABELS: Record<TimeWindowId, string> = {
  morning: 'Morgen',
  work: 'Arbeitszeit',
  evening: 'Abend',
  night: 'Nacht',
  weekend: 'Wochenende',
};

export const getTimeWindowLabel = (window: TimeWindowId) => WINDOW_LABELS[window];
