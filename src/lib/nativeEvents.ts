import { AppState, HistoryEvent } from '../types';
import type { NativeInterruptionEvent } from './nativeBridge';
import { recordProtectionEventStats } from './session';

/**
 * Interruptions from the Android overlay
 * ══════════════════════════════════════
 * The overlay used to leave no trace, so on a real phone the dashboard, the
 * statistics, the stop rate and the relapse warning only counted what happened
 * inside ScrollShield. The native side now logs every interruption
 * (InterruptionLog.kt); this turns them into history events like the ones the
 * in-app protection flow writes.
 *
 * Mapping, mirroring the in-app flow:
 *  - blocked   → 'block'   (strict mode, time window, daily limit,
 *                           anti-binge, hard feed interrupt)
 *  - warned    → 'warning' (anti-binge warning, soft feed interrupt)
 *  - stopped   → 'warning' (interrupted, the user went back to the home screen)
 *  - continued → 'open'    (the user opened the app after the interruption)
 */

type PlatformSlice = { id: string; androidPackages: string[] };

const HISTORY_ID_PREFIX = 'android-';

const APP_DESCRIPTIONS: Record<NativeInterruptionEvent['outcome'], string> = {
  blocked: 'Auf dem Handy gesperrt',
  warned: 'Auf dem Handy unterbrochen',
  stopped: 'Unterbrochen und nicht geöffnet',
  continued: 'Nach der Unterbrechung geöffnet',
};

const LOCK_REASONS: Record<string, string> = {
  TIME_WINDOW: 'Zeitfenster',
  DAILY_LIMIT: 'Tageslimit',
  ANTI_BINGE: 'Anti-Binge',
  STRICT: 'strenger Modus',
};

const describe = (event: NativeInterruptionEvent): string => {
  if (event.kind === 'short_video') {
    switch (event.reason) {
      case 'SWIPES':
        return `Kurzvideo: nach ${event.swipes} Wischern unterbrochen`;
      case 'SESSION_LIMIT':
        return 'Kurzvideo: Sitzungslimit erreicht';
      case 'DAILY_LIMIT':
        return 'Kurzvideo: Tageslimit erreicht';
      default:
        return 'Kurzvideo-Feed gesperrt';
    }
  }

  if (event.outcome === 'warned' && event.reason === 'ANTI_BINGE_WARNING') return 'Anti-Binge-Warnung auf dem Handy';

  const base = APP_DESCRIPTIONS[event.outcome];
  if (event.outcome !== 'blocked') return base;
  return `${base} (${LOCK_REASONS[event.reason] ?? LOCK_REASONS.STRICT})`;
};

const typeFor = (outcome: NativeInterruptionEvent['outcome']): HistoryEvent['type'] => {
  if (outcome === 'blocked') return 'block';
  if (outcome === 'continued') return 'open';
  return 'warning';
};

/** Translates one native event; null for a package no platform knows. */
export function toHistoryEvent(event: NativeInterruptionEvent, platforms: PlatformSlice[]): HistoryEvent | null {
  const platform = platforms.find((candidate) => candidate.androidPackages.includes(event.packageName));
  if (!platform || !event.id || !Number.isFinite(event.timestamp)) return null;

  const isFeed = event.kind === 'short_video';

  return {
    id: `${HISTORY_ID_PREFIX}${event.id}`,
    timestamp: event.timestamp,
    type: typeFor(event.outcome),
    appId: platform.id,
    desc: describe(event),
    ...(isFeed ? { trigger: 'reels_protection' } : {}),
    metadata: {
      source: 'android',
      reason: event.reason,
      ...(isFeed
        ? {
            surface: 'reels',
            contentType: 'short_video',
            ...(event.swipes > 0 ? { singleItemsViewed: event.swipes } : {}),
          }
        : {}),
    },
  };
}

/**
 * Adds native interruptions to history and daily stats. Events already in the
 * history (same id) are skipped, so a pull that was not acknowledged cannot
 * count twice. Returns the input unchanged when nothing is new.
 */
export function mergeNativeInterruptions(
  state: Pick<AppState, 'history' | 'dailyStats'>,
  events: NativeInterruptionEvent[],
  platforms: PlatformSlice[],
): Pick<AppState, 'history' | 'dailyStats'> {
  const known = new Set(state.history.map((event) => event.id));
  const added: HistoryEvent[] = [];

  for (const event of events) {
    const historyEvent = toHistoryEvent(event, platforms);
    if (!historyEvent || known.has(historyEvent.id)) continue;
    known.add(historyEvent.id);
    added.push(historyEvent);
  }

  if (added.length === 0) return state;

  let dailyStats = state.dailyStats;
  for (const event of added) {
    dailyStats = recordProtectionEventStats(dailyStats, event.type, event.timestamp);
  }

  // Newest first, like everything else in the history.
  const history = [...added, ...state.history].sort((a, b) => b.timestamp - a.timestamp);

  return { history, dailyStats };
}
