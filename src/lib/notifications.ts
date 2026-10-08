import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { AppState, DailyStats, HistoryEvent } from '../types';
import { getLocalDateKey } from './appUtils';
import { compareWeeks } from './insights';

/**
 * Notifications
 * ═════════════
 * The five switches in the settings ("Fokus-Erinnerungen", "Abend-Erinnerung",
 * "Rückfall-Warnung", "Tageszusammenfassung", "Wochenrückblick") existed since
 * the first release, together with a system permission card — but nothing in
 * the codebase ever called the Notification API. Users granted a permission and
 * enabled reminders that could never fire.
 *
 * Two delivery paths:
 *  - Browser: the Notification API. Without a push server a web app can only
 *    notify while it is running (an open tab, including in the background).
 *  - Native app: @capacitor/local-notifications. The Android WebView has no
 *    Notification API at all, so without this path nothing was ever shown on
 *    the phone. The focus-end reminder and the evening reminder are scheduled
 *    with the system and arrive even when ScrollShield is closed. Daily
 *    summary, weekly review and relapse warning depend on the day's data and
 *    stay best-effort while the app runs.
 *
 * The decision logic lives here as pure functions so the timing rules are
 * testable without a browser.
 */

export type NotificationKind =
  | 'focus_finished'
  | 'evening_reminder'
  | 'daily_summary'
  | 'weekly_review'
  | 'relapse_warning';

export interface NotificationPayload {
  kind: NotificationKind;
  title: string;
  body: string;
  /** Collapses repeats of the same reminder */
  tag: string;
}

/** Hour from which the daily summary and, on Sundays, the weekly review may be shown. */
export const SUMMARY_HOUR = 20;

/** Hour of the wind-down reminder; the night time window starts here too. */
export const EVENING_REMINDER_HOUR = 22;

/** Blocks within this window that trigger a relapse warning. */
export const RELAPSE_WINDOW_MINUTES = 30;
export const RELAPSE_BLOCK_THRESHOLD = 3;

/** True inside the native app, where the local-notifications plugin delivers. */
export function usesNativeNotifications(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function isNotificationSupported(): boolean {
  return usesNativeNotifications() || (typeof window !== 'undefined' && 'Notification' in window);
}

/**
 * Android identifies a notification by a number. Derived from the tag so a
 * repeat replaces the previous one, like the browser's `tag`. Kept clear of
 * the monitor service's own notification id (1001).
 */
export function notificationIdForTag(tag: string): number {
  let hash = 0;
  for (let index = 0; index < tag.length; index++) {
    hash = (hash * 31 + tag.charCodeAt(index)) | 0;
  }
  return 10_000 + (Math.abs(hash) % 1_000_000_000);
}

/** Asks for permission. Returns whether notifications may be sent afterwards. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (usesNativeNotifications()) {
    try {
      return (await LocalNotifications.requestPermissions()).display === 'granted';
    } catch {
      return false;
    }
  }

  if (!isNotificationSupported()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  try {
    return (await Notification.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

async function hasNativePermission(): Promise<boolean> {
  try {
    return (await LocalNotifications.checkPermissions()).display === 'granted';
  } catch {
    return false;
  }
}

/**
 * Hands a notification to the system, now or at `at`. Never asks for
 * permission itself: a prompt out of nowhere is worse than a missed reminder.
 * Exact alarms are not requested; see the manifest.
 */
async function scheduleNative(payload: NotificationPayload, at?: Date): Promise<boolean> {
  if (!(await hasNativePermission())) return false;

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: notificationIdForTag(payload.tag),
          title: payload.title,
          body: payload.body,
          isExactNotification: false,
          ...(at ? { schedule: { at, allowWhileIdle: true } } : {}),
        },
      ],
    });
    return true;
  } catch {
    return false;
  }
}

/** Sends a notification. No-op when unsupported or not permitted. */
export async function sendNotification(payload: NotificationPayload): Promise<boolean> {
  if (usesNativeNotifications()) return scheduleNative(payload);

  if (!isNotificationSupported() || Notification.permission !== 'granted') return false;

  try {
    new Notification(payload.title, { body: payload.body, tag: payload.tag });
    return true;
  } catch {
    // Some browsers only allow notifications from a service worker context.
    return false;
  }
}

/**
 * Schedules a notification with the system. Only the native app can do this;
 * in the browser it returns false and the caller notifies while running.
 */
export async function scheduleNotification(payload: NotificationPayload, at: Date): Promise<boolean> {
  if (!usesNativeNotifications()) return false;
  return scheduleNative(payload, at);
}

/**
 * Schedules a notification every day at `hour`:00 with the system. Only the
 * native app can do this. Without boot access (see the manifest) the alarm
 * does not survive a reboot; the app schedules it again on every start.
 */
export async function scheduleDailyNotification(payload: NotificationPayload, hour: number): Promise<boolean> {
  if (!usesNativeNotifications() || !(await hasNativePermission())) return false;

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: notificationIdForTag(payload.tag),
          title: payload.title,
          body: payload.body,
          isExactNotification: false,
          schedule: { on: { hour, minute: 0 }, allowWhileIdle: true },
        },
      ],
    });
    return true;
  } catch {
    return false;
  }
}

/** Withdraws a scheduled or shown notification. */
export async function cancelNotification(tag: string): Promise<void> {
  if (!usesNativeNotifications()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: notificationIdForTag(tag) }] });
  } catch {
    // Nothing scheduled.
  }
}

// ── Decision logic ────────────────────────────────────────────────────────────

const hasActivity = (stats: DailyStats | undefined) =>
  !!stats && (stats.blockedOpens > 0 || Object.keys(stats.usageMinutes ?? {}).length > 0);

const lastSevenDayKeys = (now: Date) =>
  Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(date.getDate() - index);
    return getLocalDateKey(date);
  });

/** The weekly review is due on Sundays; it then takes the daily summary's place. */
const isWeeklyReviewDay = (state: Pick<AppState, 'settings'>, now: Date) =>
  state.settings.notifications.weeklyReview && now.getDay() === 0;

/**
 * The daily summary ("Tageszusammenfassung") is shown once per day, from
 * SUMMARY_HOUR onwards, and only when there is something to report. It used to
 * hang off the "Abend-Erinnerung" switch, which left the summary switch
 * without any effect.
 */
export function shouldSendDailySummary(
  state: Pick<AppState, 'settings' | 'dailyStats'>,
  lastSentDateKey: string | null,
  now: Date = new Date(),
): boolean {
  if (!state.settings.notifications.dailySummary) return false;
  if (now.getHours() < SUMMARY_HOUR) return false;
  if (isWeeklyReviewDay(state, now)) return false;

  const today = getLocalDateKey(now);
  if (lastSentDateKey === today) return false;

  return hasActivity(state.dailyStats[today]);
}

export function buildDailySummary(state: Pick<AppState, 'dailyStats'>, now: Date = new Date()): NotificationPayload {
  const today = getLocalDateKey(now);
  const stats = state.dailyStats[today];
  const blocks = stats?.blockedOpens ?? 0;
  const savedMinutes = stats?.savedTimeMinutes ?? 0;

  return {
    kind: 'daily_summary',
    title: 'Dein Tag mit ScrollShield',
    body:
      blocks > 0
        ? `${blocks} Mal hast du heute innegehalten, rund ${savedMinutes} Minuten gespart.`
        : 'Heute keine Unterbrechungen nötig. Wie war dein Tag?',
    tag: `daily-summary-${today}`,
  };
}

/**
 * The weekly review ("Wochenrückblick") is shown on Sundays from SUMMARY_HOUR,
 * once, when the past seven days carry any data.
 */
export function shouldSendWeeklyReview(
  state: Pick<AppState, 'settings' | 'dailyStats'>,
  lastSentDateKey: string | null,
  now: Date = new Date(),
): boolean {
  if (!isWeeklyReviewDay(state, now)) return false;
  if (now.getHours() < SUMMARY_HOUR) return false;
  if (lastSentDateKey === getLocalDateKey(now)) return false;

  return lastSevenDayKeys(now).some((key) => hasActivity(state.dailyStats[key]));
}

export function buildWeeklyReview(state: Pick<AppState, 'dailyStats'>, now: Date = new Date()): NotificationPayload {
  const days = lastSevenDayKeys(now).map((key) => state.dailyStats[key]);
  const blocks = days.reduce((total, stats) => total + (stats?.blockedOpens ?? 0), 0);
  const savedMinutes = days.reduce((total, stats) => total + (stats?.savedTimeMinutes ?? 0), 0);

  const lines = [
    blocks > 0
      ? `${blocks} Mal hast du diese Woche innegehalten, rund ${savedMinutes} Minuten gespart.`
      : 'Diese Woche waren keine Unterbrechungen nötig.',
  ];

  // Only with enough days on both sides; compareWeeks returns null otherwise.
  const trend = compareWeeks(state.dailyStats, now);
  if (trend && trend.deltaMinutes !== 0) {
    const minutes = Math.abs(trend.deltaMinutes);
    lines.push(
      trend.deltaMinutes < 0
        ? `${minutes} Minuten weniger in geschützten Apps als letzte Woche.`
        : `${minutes} Minuten mehr in geschützten Apps als letzte Woche.`,
    );
  }

  return {
    kind: 'weekly_review',
    title: 'Deine Woche mit ScrollShield',
    body: lines.join(' '),
    tag: `weekly-review-${getLocalDateKey(now)}`,
  };
}

export const EVENING_REMINDER_TAG = 'evening-reminder';

/**
 * The wind-down reminder ("Abend-Erinnerung"). Its text does not depend on
 * the day, so the native app schedules it once as a daily alarm; the browser
 * sends it while running, once per day from EVENING_REMINDER_HOUR.
 */
export function buildEveningReminder(): NotificationPayload {
  return {
    kind: 'evening_reminder',
    title: 'Zeit zum Abschalten',
    body: 'Leg das Handy für heute beiseite. Was noch kommt, ist morgen auch noch da.',
    tag: EVENING_REMINDER_TAG,
  };
}

export function shouldSendEveningReminder(
  state: Pick<AppState, 'settings'>,
  lastSentDateKey: string | null,
  now: Date = new Date(),
): boolean {
  if (!state.settings.notifications.eveningReminder) return false;
  if (now.getHours() < EVENING_REMINDER_HOUR) return false;
  return lastSentDateKey !== getLocalDateKey(now);
}

/**
 * Warns when blocks cluster: several interruptions in a short window are the
 * signal that someone is fighting the same impulse over and over.
 */
export function shouldSendRelapseWarning(
  state: Pick<AppState, 'settings'>,
  history: HistoryEvent[],
  lastSentAt: number | null,
  now = Date.now(),
): boolean {
  if (!state.settings.notifications.relapseWarning) return false;

  // Never warn twice inside the same window.
  if (lastSentAt !== null && now - lastSentAt < RELAPSE_WINDOW_MINUTES * 60_000) return false;

  const recentBlocks = history.filter(
    (event) => event.type === 'block' && now - event.timestamp < RELAPSE_WINDOW_MINUTES * 60_000,
  );

  return recentBlocks.length >= RELAPSE_BLOCK_THRESHOLD;
}

export function buildRelapseWarning(blockCount: number): NotificationPayload {
  return {
    kind: 'relapse_warning',
    title: 'Schwieriger Moment?',
    body: `${blockCount} Versuche in der letzten halben Stunde. Vielleicht hilft eine kurze Pause vom Handy.`,
    tag: 'relapse-warning',
  };
}

export const FOCUS_FINISHED_TAG = 'focus-finished';

export function buildFocusFinished(minutes: number): NotificationPayload {
  return {
    kind: 'focus_finished',
    title: 'Fokuszeit beendet',
    body: `${minutes} Minuten durchgehalten. Gut gemacht.`,
    tag: FOCUS_FINISHED_TAG,
  };
}
