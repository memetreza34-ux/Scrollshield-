import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { AppState } from '../types';
import { t } from '../i18n';
import { getLocalDateKey } from './appUtils';
import { formatMinutes } from './format';
import { hasPro } from './entitlements';
import { getDayMetrics } from './metrics';

/**
 * Notifications (docs/V1_MASTER_PLAN.md, 4.9)
 * ═════════════
 * Three kinds, all quiet and factual: focus end, daily summary (off by
 * default) and weekly review (Pro). Real numbers only, never a nudge back into
 * the app, no streaks, no praise. The ongoing "Schutz aktiv" notification
 * belongs to the native service and is not built here.
 *
 * Two delivery paths:
 *  - Browser: the Notification API. Without a push server a web app can only
 *    notify while it is running (an open tab, including in the background).
 *  - Native app: @capacitor/local-notifications. The Android WebView has no
 *    Notification API at all. The focus end is scheduled with the system and
 *    arrives even when ScrollShield is closed; the summaries depend on the
 *    day's data and stay best-effort while the app runs.
 *
 * The decision logic lives here as pure functions so the timing rules are
 * testable without a browser.
 */

export type NotificationKind = 'focus_finished' | 'daily_summary' | 'weekly_review';

export interface NotificationPayload {
  kind: NotificationKind;
  title: string;
  body: string;
  /** Collapses repeats of the same reminder */
  tag: string;
}

/** Hour from which the daily summary may be shown. */
export const SUMMARY_HOUR = 21;

/** Hour from which the weekly review may be shown on Sundays. */
export const WEEKLY_REVIEW_HOUR = 18;

/**
 * Tag of the evening reminder older versions scheduled as a daily alarm. The
 * reminder is gone; the tag stays so the alarm can be cancelled on start.
 */
export const LEGACY_EVENING_REMINDER_TAG = 'evening-reminder';

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

type SummaryState = Pick<AppState, 'settings' | 'pro' | 'history' | 'dailyStats' | 'appsConfig'>;

const lastSevenDays = (now: Date) =>
  Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(date.getDate() - index);
    return date;
  });

/** Interruptions and "Zurück" over some days, as the summaries report them. */
const countInterruptions = (state: Pick<AppState, 'history' | 'dailyStats' | 'appsConfig'>, days: Date[]) =>
  days.reduce(
    (total, day) => {
      const metrics = getDayMetrics(state, day);
      return { interrupted: total.interrupted + metrics.interruptions, back: total.back + metrics.abandoned };
    },
    { interrupted: 0, back: 0 },
  );

/** The weekly review (Pro) is due on Sundays; it then takes the daily summary's place. */
const isWeeklyReviewDay = (state: Pick<AppState, 'settings' | 'pro'>, now: Date) =>
  hasPro(state) && state.settings.notifications.weeklyReview && now.getDay() === 0;

/**
 * The daily summary ("Tageszusammenfassung"): once per day from SUMMARY_HOUR,
 * only when it is switched on and something was interrupted. On days without
 * an event nothing comes.
 */
export function shouldSendDailySummary(
  state: SummaryState,
  lastSentDateKey: string | null,
  now: Date = new Date(),
): boolean {
  if (!state.settings.notifications.dailySummary) return false;
  if (now.getHours() < SUMMARY_HOUR) return false;
  if (isWeeklyReviewDay(state, now)) return false;
  if (lastSentDateKey === getLocalDateKey(now)) return false;

  return countInterruptions(state, [now]).interrupted > 0;
}

export function buildDailySummary(
  state: Pick<AppState, 'history' | 'dailyStats' | 'appsConfig'>,
  now: Date = new Date(),
): NotificationPayload {
  const { interrupted, back } = countInterruptions(state, [now]);
  return {
    kind: 'daily_summary',
    title: t('notify.dailyTitle'),
    body: t('notify.dailyBody', { interrupted, back }),
    tag: `daily-summary-${getLocalDateKey(now)}`,
  };
}

/**
 * The weekly review ("Wochenrückblick", Pro): Sundays from WEEKLY_REVIEW_HOUR,
 * once, when the past seven days had an interruption. No comparison with
 * anyone else.
 */
export function shouldSendWeeklyReview(
  state: SummaryState,
  lastSentDateKey: string | null,
  now: Date = new Date(),
): boolean {
  if (!isWeeklyReviewDay(state, now)) return false;
  if (now.getHours() < WEEKLY_REVIEW_HOUR) return false;
  if (lastSentDateKey === getLocalDateKey(now)) return false;

  return countInterruptions(state, lastSevenDays(now)).interrupted > 0;
}

export function buildWeeklyReview(
  state: Pick<AppState, 'history' | 'dailyStats' | 'appsConfig'>,
  now: Date = new Date(),
): NotificationPayload {
  const { interrupted, back } = countInterruptions(state, lastSevenDays(now));
  return {
    kind: 'weekly_review',
    title: t('notify.weeklyTitle'),
    body: t('notify.weeklyBody', { interrupted, back }),
    tag: `weekly-review-${getLocalDateKey(now)}`,
  };
}

export const FOCUS_FINISHED_TAG = 'focus-finished';

/** Once at the end of a focus; never a reminder to focus again. */
export function buildFocusFinished(minutes: number): NotificationPayload {
  return {
    kind: 'focus_finished',
    title: t('notify.focusTitle'),
    body: t('notify.focusBody', { duration: formatMinutes(minutes) }),
    tag: FOCUS_FINISHED_TAG,
  };
}
