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
 * HARD LIMIT, stated in the UI as well:
 * Without a push server a web app can only notify while it is running (an open
 * tab, including in the background). It cannot wake itself at 20:00 when it is
 * closed. Scheduled notifications on a closed app need either Web Push with a
 * backend — which would end the "no server" promise — or
 * @capacitor/local-notifications in the native build. Until then these are
 * best-effort reminders, not guaranteed alarms.
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

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/** Asks for permission. Returns whether notifications may be sent afterwards. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  try {
    return (await Notification.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

/** Sends a notification. No-op when unsupported or not permitted. */
export function sendNotification(payload: NotificationPayload): boolean {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return false;

  try {
    new Notification(payload.title, { body: payload.body, tag: payload.tag });
    return true;
  } catch {
    // Some browsers only allow notifications from a service worker context.
    return false;
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

export function buildFocusFinished(minutes: number): NotificationPayload {
  return {
    kind: 'focus_finished',
    title: 'Fokuszeit beendet',
    body: `${minutes} Minuten durchgehalten. Gut gemacht.`,
    tag: 'focus-finished',
  };
}
