import { AppState, HistoryEvent } from '../types';
import { getLocalDateKey } from './appUtils';

/**
 * Insights
 * ════════
 * The dashboard showed counters ("12 Blockaden", "36 Minuten gespart") but never
 * said anything about them. A number without interpretation gives no reason to
 * come back tomorrow.
 *
 * These derive statements from data that already exists in `dailyStats` and
 * `history`. Every rule has a minimum-evidence threshold: claiming "your weakest
 * hour is 3am" from a single event would be worse than saying nothing.
 */

export type InsightTone = 'neutral' | 'positive' | 'warning';

export interface Insight {
  id: string;
  tone: InsightTone;
  title: string;
  detail: string;
}

/** Below this, a pattern is coincidence rather than a habit. */
export const MIN_EVENTS_FOR_HOUR_PATTERN = 6;
export const MIN_DAYS_FOR_TREND = 4;

const hourLabel = (hour: number) =>
  `${hour.toString().padStart(2, '0')}–${((hour + 1) % 24).toString().padStart(2, '0')} Uhr`;

/**
 * The hour of day with the most interruption attempts, but only when one hour
 * clearly stands out — otherwise the "pattern" is noise.
 */
export function findWeakestHour(history: HistoryEvent[]): { hour: number; count: number } | null {
  const attempts = history.filter((event) => event.type === 'block' || event.type === 'warning');
  if (attempts.length < MIN_EVENTS_FOR_HOUR_PATTERN) return null;

  const byHour = new Array(24).fill(0) as number[];
  for (const event of attempts) {
    byHour[new Date(event.timestamp).getHours()]++;
  }

  let topHour = 0;
  for (let hour = 1; hour < 24; hour++) {
    if (byHour[hour] > byHour[topHour]) topHour = hour;
  }

  // Require the peak to carry at least a quarter of all attempts, so a flat
  // distribution produces no claim.
  if (byHour[topHour] < Math.max(3, attempts.length * 0.25)) return null;

  return { hour: topHour, count: byHour[topHour] };
}

/** Total short-video and app minutes across a set of day keys. */
function sumMinutes(dailyStats: AppState['dailyStats'], dateKeys: string[]): number {
  return dateKeys.reduce((total, key) => {
    const usage = dailyStats[key]?.usageMinutes ?? {};
    return total + Object.values(usage).reduce((sum, minutes) => sum + minutes, 0);
  }, 0);
}

const dayKeysBack = (from: Date, offsetDays: number, count: number): string[] =>
  Array.from({ length: count }, (_, index) => {
    const date = new Date(from);
    date.setDate(date.getDate() - offsetDays - index);
    return getLocalDateKey(date);
  });

/**
 * Compares the last seven days with the seven before. Returns null until enough
 * days carry data to make the comparison meaningful.
 */
export function compareWeeks(
  dailyStats: AppState['dailyStats'],
  now: Date = new Date(),
): { currentMinutes: number; previousMinutes: number; deltaMinutes: number } | null {
  const currentKeys = dayKeysBack(now, 0, 7);
  const previousKeys = dayKeysBack(now, 7, 7);

  const daysWithData = [...currentKeys, ...previousKeys].filter((key) => dailyStats[key]).length;
  if (daysWithData < MIN_DAYS_FOR_TREND) return null;

  const currentMinutes = sumMinutes(dailyStats, currentKeys);
  const previousMinutes = sumMinutes(dailyStats, previousKeys);
  if (previousMinutes === 0) return null;

  return { currentMinutes, previousMinutes, deltaMinutes: currentMinutes - previousMinutes };
}

/**
 * How often an interruption actually stopped the user, versus how often they
 * pushed through. This is the honest measure of whether the app works.
 */
export function getStopRate(history: HistoryEvent[], now = Date.now(), windowDays = 7): number | null {
  const since = now - windowDays * 24 * 60 * 60_000;
  const recent = history.filter((event) => event.timestamp >= since);

  const interruptions = recent.filter((event) => event.type === 'block' || event.type === 'warning').length;
  const pushedThrough = recent.filter((event) => event.type === 'emergency' || event.type === 'open').length;
  const total = interruptions + pushedThrough;

  if (total < MIN_EVENTS_FOR_HOUR_PATTERN) return null;

  return interruptions / total;
}

export function deriveInsights(state: AppState, now: Date = new Date()): Insight[] {
  const insights: Insight[] = [];

  const weakestHour = findWeakestHour(state.history);
  if (weakestHour) {
    insights.push({
      id: 'weakest-hour',
      tone: 'neutral',
      title: `Deine schwierigste Zeit: ${hourLabel(weakestHour.hour)}`,
      detail: `${weakestHour.count} Unterbrechungen fielen in diese Stunde. Vielleicht hilft dort eine strengere Regel.`,
    });
  }

  const weeks = compareWeeks(state.dailyStats, now);
  if (weeks) {
    const better = weeks.deltaMinutes < 0;
    const absolute = Math.abs(weeks.deltaMinutes);
    if (absolute >= 5) {
      insights.push({
        id: 'week-trend',
        tone: better ? 'positive' : 'warning',
        title: better ? `${absolute} Minuten weniger als letzte Woche` : `${absolute} Minuten mehr als letzte Woche`,
        detail: `Diese Woche ${weeks.currentMinutes} Minuten, davor ${weeks.previousMinutes}.`,
      });
    }
  }

  const stopRate = getStopRate(state.history, now.getTime());
  if (stopRate !== null) {
    const percent = Math.round(stopRate * 100);
    insights.push({
      id: 'stop-rate',
      tone: percent >= 50 ? 'positive' : 'neutral',
      title: `${percent} % der Impulse abgebrochen`,
      detail:
        percent >= 50
          ? 'Mehr als die Hälfte der Versuche hast du nicht zu Ende geführt.'
          : 'Die meisten Versuche gehen noch durch. Eine längere Verzögerung könnte helfen.',
    });
  }

  return insights;
}
