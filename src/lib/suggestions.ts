import { AppState, SUPPORTED_APPS } from '../types';
import { getLocalDateKey } from './appUtils';
import { countReopens, eventsOnDay } from './metrics';
import { getPresetId } from './presets';
import { getShortVideoUsageKey } from './stats';
import { FEATURE_FLAGS } from '../config/featureFlags';

/**
 * Suggestions on Heute (docs/V1_MASTER_PLAN.md, 4.2)
 * ══════════════════════════════════════════════════
 * At most one at a time, computed from measured data, and each one a change
 * the user can make with a single tap. Every rule needs a minimum of evidence;
 * without it there is no suggestion at all.
 */

export type SuggestionAction =
  | { kind: 'evening_schedule'; appId: string }
  | { kind: 'feed_limit'; appId: string; minutes: number }
  | { kind: 'preset_ausgewogen'; appId: string };

export interface Suggestion {
  /** Stable per rule and app, so a hidden suggestion stays hidden that day. */
  id: string;
  text: string;
  actionLabel: string;
  action: SuggestionAction;
}

/** Openings after this hour count as late. */
export const LATE_HOUR = 21;
export const MIN_LATE_OPENS = 4;
export const FEED_MINUTES_FOR_LIMIT = 20;
export const MIN_REOPENS_FOR_PRESET = 3;

const isLate = (timestamp: number) => {
  const hour = new Date(timestamp).getHours();
  return hour >= LATE_HOUR || hour < 5;
};

export function getSuggestion(state: AppState, now = new Date()): Suggestion | null {
  const today = getLocalDateKey(now);
  const hidden = (id: string) => state.dismissedSuggestions?.[id] === today;
  const apps = SUPPORTED_APPS.filter((app) => state.appsConfig[app.id]?.active);
  const candidates: Suggestion[] = [];

  // 1. Often opened late in the evening, and no schedule covers it.
  const weekAgo = now.getTime() - 7 * 24 * 60 * 60_000;
  for (const app of apps) {
    const lateOpens = state.history.filter(
      (event) =>
        event.appId === app.id && event.type === 'open' && event.timestamp >= weekAgo && isLate(event.timestamp),
    ).length;
    const covered = state.schedules.some((schedule) => schedule.active && schedule.appIds.includes(app.id));
    if (lateOpens >= MIN_LATE_OPENS && !covered) {
      candidates.push({
        id: `evening-${app.id}`,
        text: `Du öffnest ${app.name} oft nach ${LATE_HOUR} Uhr (${lateOpens}× in 7 Tagen). Ein Zeitplan sperrt die App abends von 21 bis 7 Uhr.`,
        actionLabel: 'Abends sperren',
        action: { kind: 'evening_schedule', appId: app.id },
      });
    }
  }

  // 2. Experimental only: short-video suggestions remain outside the V1 production surface.
  const stats = state.dailyStats[today];
  if (FEATURE_FLAGS.enableShortVideoResearch) {
    for (const app of apps) {
      if (!app.shortVideoSurface) continue;
      const minutes = stats?.usageMinutes[getShortVideoUsageKey(app.id)] ?? 0;
      const feed = state.appsConfig[app.id]?.reelsProtection;
      const limited = feed?.enabled && feed.mode !== 'allow' && feed.mode !== 'warn';
      if (minutes >= FEED_MINUTES_FOR_LIMIT && !limited) {
        candidates.push({
          id: `feed-${app.id}`,
          text: `${app.shortVideoSurface.name} heute schon ${minutes} Min.`,
          actionLabel: 'Auf 15 Min. begrenzen',
          action: { kind: 'feed_limit', appId: app.id, minutes: 15 },
        });
      }
    }
  }

  // 3. Many reopens today on the gentlest preset.
  const todayEvents = eventsOnDay(state.history, now);
  for (const app of apps) {
    const config = state.appsConfig[app.id];
    if (!config || getPresetId(config) !== 'sanft') continue;
    const reopens = countReopens(todayEvents.filter((event) => event.appId === app.id));
    if (reopens >= MIN_REOPENS_FOR_PRESET) {
      candidates.push({
        id: `preset-${app.id}`,
        text: `${app.name} heute ${reopens}× kurz nacheinander wieder geöffnet.`,
        actionLabel: 'Ausgewogen wählen',
        action: { kind: 'preset_ausgewogen', appId: app.id },
      });
    }
  }

  return candidates.find((candidate) => !hidden(candidate.id)) ?? null;
}
