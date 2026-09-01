import type { AppState, DailyStats } from '../types';
import { getLocalDateKey } from './appUtils';

export interface ProtectionInsightPeriod {
  days: number;
  startDate: string;
  endDate: string;
  measuredUsageMinutes: number;
  interventions: number;
  emergencyUnlocks: number;
  focusMinutes: number;
  estimatedSavedMinutes: number;
  activeDays: number;
  averageMeasuredUsageMinutes: number;
  topMeasuredAppId: string | null;
  topMeasuredAppMinutes: number;
}

export interface ProtectionInsightComparison {
  current: ProtectionInsightPeriod;
  previous: ProtectionInsightPeriod;
  measuredUsageChangeMinutes: number;
  measuredUsageChangePercent: number | null;
  interventionsChange: number;
  emergencyUnlocksChange: number;
  focusMinutesChange: number;
}

const startOfLocalDay = (value: Date) => {
  const result = new Date(value);
  result.setHours(0, 0, 0, 0);
  return result;
};

const addLocalDays = (value: Date, days: number) => {
  const result = new Date(value);
  result.setDate(result.getDate() + days);
  result.setHours(0, 0, 0, 0);
  return result;
};

export const getLocalDateKeys = (endDate: Date, days: number): string[] => {
  const boundedDays = Math.max(1, Math.min(366, Math.round(days)));
  const end = startOfLocalDay(endDate);
  return Array.from({ length: boundedDays }, (_, index) =>
    getLocalDateKey(addLocalDays(end, index - (boundedDays - 1))),
  );
};

const emptyDailyStats = (date: string): DailyStats => ({
  date,
  usageMinutes: {},
  blockedOpens: 0,
  savedTimeMinutes: 0,
  emergencyUnlocks: 0,
  focusMinutes: 0,
});

export const buildProtectionInsightPeriod = (
  dailyStats: AppState['dailyStats'],
  endDate: Date,
  days: number,
): ProtectionInsightPeriod => {
  const keys = getLocalDateKeys(endDate, days);
  const appUsage: Record<string, number> = {};
  let measuredUsageMinutes = 0;
  let interventions = 0;
  let emergencyUnlocks = 0;
  let focusMinutes = 0;
  let estimatedSavedMinutes = 0;
  let activeDays = 0;

  for (const key of keys) {
    const day = dailyStats[key] || emptyDailyStats(key);
    const measuredForDay = Object.entries(day.usageMinutes).reduce((total, [appId, rawMinutes]) => {
      const minutes = Number.isFinite(rawMinutes) ? Math.max(0, rawMinutes) : 0;
      appUsage[appId] = (appUsage[appId] || 0) + minutes;
      return total + minutes;
    }, 0);

    const dayInterventions = Number.isFinite(day.blockedOpens) ? Math.max(0, day.blockedOpens) : 0;
    const dayEmergencyUnlocks = Number.isFinite(day.emergencyUnlocks) ? Math.max(0, day.emergencyUnlocks) : 0;
    const dayFocusMinutes = Number.isFinite(day.focusMinutes) ? Math.max(0, day.focusMinutes) : 0;
    const dayEstimatedSavedMinutes = Number.isFinite(day.savedTimeMinutes) ? Math.max(0, day.savedTimeMinutes) : 0;

    measuredUsageMinutes += measuredForDay;
    interventions += dayInterventions;
    emergencyUnlocks += dayEmergencyUnlocks;
    focusMinutes += dayFocusMinutes;
    estimatedSavedMinutes += dayEstimatedSavedMinutes;

    if (measuredForDay > 0 || dayInterventions > 0 || dayEmergencyUnlocks > 0 || dayFocusMinutes > 0) {
      activeDays += 1;
    }
  }

  const topMeasuredApp = Object.entries(appUsage).sort((left, right) => right[1] - left[1])[0];

  return {
    days: keys.length,
    startDate: keys[0],
    endDate: keys[keys.length - 1],
    measuredUsageMinutes,
    interventions,
    emergencyUnlocks,
    focusMinutes,
    estimatedSavedMinutes,
    activeDays,
    averageMeasuredUsageMinutes: measuredUsageMinutes / keys.length,
    topMeasuredAppId: topMeasuredApp?.[0] ?? null,
    topMeasuredAppMinutes: topMeasuredApp?.[1] ?? 0,
  };
};

export const compareProtectionInsightPeriods = (
  dailyStats: AppState['dailyStats'],
  now: Date,
  days: number,
): ProtectionInsightComparison => {
  const boundedDays = Math.max(1, Math.min(366, Math.round(days)));
  const currentEnd = startOfLocalDay(now);
  const previousEnd = addLocalDays(currentEnd, -boundedDays);
  const current = buildProtectionInsightPeriod(dailyStats, currentEnd, boundedDays);
  const previous = buildProtectionInsightPeriod(dailyStats, previousEnd, boundedDays);
  const measuredUsageChangeMinutes = current.measuredUsageMinutes - previous.measuredUsageMinutes;

  return {
    current,
    previous,
    measuredUsageChangeMinutes,
    measuredUsageChangePercent:
      previous.measuredUsageMinutes > 0 ? (measuredUsageChangeMinutes / previous.measuredUsageMinutes) * 100 : null,
    interventionsChange: current.interventions - previous.interventions,
    emergencyUnlocksChange: current.emergencyUnlocks - previous.emergencyUnlocks,
    focusMinutesChange: current.focusMinutes - previous.focusMinutes,
  };
};
