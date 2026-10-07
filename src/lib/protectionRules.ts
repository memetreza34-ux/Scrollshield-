import { AppConfig, AppState, HistoryEvent, Schedule } from '../types';
import { getLocalDateKey } from './appUtils';
import { getActiveScheduleForApp } from './schedules';

export type ProtectionFlowStep =
  | 'init'
  | 'soft_intent'
  | 'standard_delay'
  | 'strict_blocked'
  | 'emergency_countdown'
  | 'emergency_reason'
  | 'anti_binge_warning'
  | 'anti_binge_block'
  | 'app_opened';

/**
 * Why an attempt ends in 'anti_binge_block'. The step is shared by every
 * lock without an emergency unlock, and the screen used to explain all of
 * them as "opened too often".
 */
export type ProtectionBlockReason = 'daily_limit' | 'anti_binge' | 'time_window' | 'emergency_limit';

export interface ProtectionDecision {
  step: ProtectionFlowStep;
  delaySeconds?: number;
  blockReason?: ProtectionBlockReason;
  event?: {
    type: HistoryEvent['type'];
    desc: string;
  };
}

export const countEmergencyUnlocksToday = (history: HistoryEvent[], now = Date.now()) => {
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  return history.filter((event) => event.type === 'emergency' && event.timestamp >= dayStart.getTime()).length;
};

export const getAppUsageMinutesToday = (dailyStats: AppState['dailyStats'], appId: string, now = Date.now()) => {
  const dateKey = getLocalDateKey(new Date(now));
  return dailyStats[dateKey]?.usageMinutes[appId] ?? 0;
};

/** Longest pause the reopen protection builds up. */
export const MAX_ESCALATED_DELAY_SECONDS = 120;

/** The opening pause after `reopens` openings inside the reopen window. */
export const getEscalatedDelay = (config: AppConfig, reopens: number) =>
  Math.min(MAX_ESCALATED_DELAY_SECONDS, config.openDelay + reopens * (config.antiBinge.escalationSeconds ?? 0));

export const evaluateProtectionAttempt = ({
  appId,
  config,
  dailyStats = {},
  history,
  isFocusModeActive,
  focusBlockedAppIds,
  schedules = [],
  now = Date.now(),
}: {
  appId: string;
  config: AppConfig;
  dailyStats?: AppState['dailyStats'];
  history: HistoryEvent[];
  isFocusModeActive: boolean;
  /** The apps the running focus or rescue session locks; without it, `focusModeBehavior` decides. */
  focusBlockedAppIds?: string[];
  schedules?: Schedule[];
  now?: number;
}): ProtectionDecision => {
  if (!config.active) {
    return { step: 'app_opened' };
  }

  const usageMinutesToday = getAppUsageMinutesToday(dailyStats, appId, now);
  if (config.dailyLimit > 0 && usageMinutesToday >= config.dailyLimit) {
    return {
      step: 'anti_binge_block',
      blockReason: 'daily_limit',
      event: {
        type: 'block',
        desc: `Tageslimit erreicht (${usageMinutesToday}/${config.dailyLimit} Min)`,
      },
    };
  }

  if (config.antiBinge.enabled) {
    const recentBlockWindowOpens = history.filter(
      (event) =>
        event.appId === appId &&
        event.type === 'open' &&
        now - event.timestamp < config.antiBinge.blockTimeframe * 60_000,
    );

    if (recentBlockWindowOpens.length >= config.antiBinge.blockThreshold) {
      return {
        step: 'anti_binge_block',
        blockReason: 'anti_binge',
        event: {
          type: 'block',
          desc: `Anti-Binge Sperre (${recentBlockWindowOpens.length} Öffnungen in ${config.antiBinge.blockTimeframe}m)`,
        },
      };
    }
  }

  const schedule = getActiveScheduleForApp(schedules, appId, new Date(now));
  if (schedule) {
    return {
      step: 'anti_binge_block',
      blockReason: 'time_window',
      event: {
        type: 'block',
        desc: `Gesperrt im Zeitplan „${schedule.name}“`,
      },
    };
  }

  const effectiveMode = config.mode;
  const focusBlocked =
    isFocusModeActive &&
    (focusBlockedAppIds ? focusBlockedAppIds.includes(appId) : config.focusModeBehavior === 'block');

  if (focusBlocked || effectiveMode === 'strict') {
    const maxEmergencyUnlocks = config.emergencyUnlock?.maxPerDay ?? 0;
    const emergencyCountToday = countEmergencyUnlocksToday(history, now);

    if (maxEmergencyUnlocks > 0 && emergencyCountToday >= maxEmergencyUnlocks) {
      return {
        step: 'anti_binge_block',
        blockReason: 'emergency_limit',
        event: {
          type: 'block',
          desc: 'Zu viele Notfallfreigaben heute',
        },
      };
    }

    return {
      step: 'strict_blocked',
      event: {
        type: 'block',
        desc: focusBlocked ? 'Während des Fokus gesperrt' : 'Durch strikten Modus gesperrt',
      },
    };
  }

  // The anti-binge warning comes after every lock: its "Trotzdem weiter" leads
  // into the normal soft or standard flow, so placed earlier it let a time
  // window block or strict mode be bypassed.
  if (config.antiBinge.enabled) {
    const recentWarningWindowOpens = history.filter(
      (event) =>
        event.appId === appId &&
        event.type === 'open' &&
        now - event.timestamp < config.antiBinge.warningTimeframe * 60_000,
    );

    if (recentWarningWindowOpens.length >= config.antiBinge.warningThreshold) {
      return {
        step: 'anti_binge_warning',
        delaySeconds: getEscalatedDelay(config, recentWarningWindowOpens.length),
        event: {
          type: 'warning',
          desc: `Anti-Binge Warnung (${recentWarningWindowOpens.length} Öffnungen in ${config.antiBinge.warningTimeframe}m)`,
        },
      };
    }
  }

  if (effectiveMode === 'standard') {
    return {
      step: 'standard_delay',
      delaySeconds: config.openDelay,
    };
  }

  if (effectiveMode === 'soft') {
    return { step: 'soft_intent' };
  }

  return { step: 'app_opened' };
};
