import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { AppState, HistoryEvent } from '../types';
import { getLocalDateKey } from './appUtils';

/**
 * Notifications
 * ═════════════
 * The three switches in the settings ("Fokus-Erinnerungen", "Abend-Erinnerung",
 * "Rückfall-Warnung") existed since the first release, together with a system
 * permission card — but nothing in the codebase ever called the Notification
 * API. Users granted a permission and enabled reminders that could never fire.
 *
 * Two delivery paths:
 *  - Browser: the Notification API. Without a push server a web app can only
 *    notify while it is running (an open tab, including in the background).
 *  - Native app: @capacitor/local-notifications. The Android WebView has no
 *    Notification API at all, so without this path nothing was ever shown on
 *    the phone. The focus-end reminder is scheduled with the system when a
 *    session starts and arrives even when ScrollShield is closed. Evening
 *    summary and relapse warning depend on the day's data and stay best-effort
 *    while the app runs.
 *
 * The decision logic lives here as pure functions so the timing rules are
 * testable without a browser.
 */

export type NotificationKind = 'focus_finished' | 'evening_summary' | 'relapse_warning';

export interface NotificationPayload {
  kind: NotificationKind;
  title: string;
  body: string;
  /** Collapses repeats of the same reminder */
  tag: string;
}

/** Hour from which the evening summary may be shown. */
export const EVENING_SUMMARY_HOUR = 20;

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

/**
 * The evening summary is shown once per day, from EVENING_SUMMARY_HOUR onwards,
 * and only when there is something to report.
 */
export function shouldSendEveningSummary(
  state: Pick<AppState, 'settings' | 'dailyStats'>,
  lastSentDateKey: string | null,
  now: Date = new Date(),
): boolean {
  if (!state.settings.notifications.eveningReminder) return false;
  if (now.getHours() < EVENING_SUMMARY_HOUR) return false;

  const today = getLocalDateKey(now);
  if (lastSentDateKey === today) return false;

  const stats = state.dailyStats[today];
  if (!stats) return false;

  return stats.blockedOpens > 0 || Object.keys(stats.usageMinutes ?? {}).length > 0;
}

export function buildEveningSummary(state: Pick<AppState, 'dailyStats'>, now: Date = new Date()): NotificationPayload {
  const today = getLocalDateKey(now);
  const stats = state.dailyStats[today];
  const blocks = stats?.blockedOpens ?? 0;
  const savedMinutes = stats?.savedTimeMinutes ?? 0;

  return {
    kind: 'evening_summary',
    title: 'Dein Tag mit ScrollShield',
    body:
      blocks > 0
        ? `${blocks} Mal hast du heute innegehalten, rund ${savedMinutes} Minuten gespart.`
        : 'Heute keine Unterbrechungen nötig. Wie war dein Tag?',
    tag: `evening-${today}`,
  };
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
