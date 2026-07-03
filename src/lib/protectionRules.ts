import { AppConfig, AppState, HistoryEvent } from '../types';
import { getLocalDateKey } from './appUtils';

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

export interface ProtectionDecision {
  step: ProtectionFlowStep;
  delaySeconds?: number;
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

export const evaluateProtectionAttempt = ({
  appId,
  config,
  dailyStats = {},
  history,
  isFocusModeActive,
  now = Date.now(),
}: {
  appId: string;
  config: AppConfig;
  dailyStats?: AppState['dailyStats'];
  history: HistoryEvent[];
  isFocusModeActive: boolean;
  now?: number;
}): ProtectionDecision => {
  if (!config.active) {
    return { step: 'app_opened' };
  }

  const usageMinutesToday = getAppUsageMinutesToday(dailyStats, appId, now);
  if (config.dailyLimit > 0 && usageMinutesToday >= config.dailyLimit) {
    return {
      step: 'anti_binge_block',
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
        event: {
          type: 'block',
          desc: `Anti-Binge Sperre (${recentBlockWindowOpens.length} Oeffnungen in ${config.antiBinge.blockTimeframe}m)`,
        },
      };
    }

    const recentWarningWindowOpens = history.filter(
      (event) =>
        event.appId === appId &&
        event.type === 'open' &&
        now - event.timestamp < config.antiBinge.warningTimeframe * 60_000,
    );

    if (recentWarningWindowOpens.length >= config.antiBinge.warningThreshold) {
      return {
        step: 'anti_binge_warning',
        event: {
          type: 'warning',
          desc: `Anti-Binge Warnung (${recentWarningWindowOpens.length} Oeffnungen in ${config.antiBinge.warningTimeframe}m)`,
        },
      };
    }
  }

  if ((isFocusModeActive && config.focusModeBehavior === 'block') || config.mode === 'strict') {
    const maxEmergencyUnlocks = config.emergencyUnlock?.maxPerDay ?? 0;
    const emergencyCountToday = countEmergencyUnlocksToday(history, now);

    if (maxEmergencyUnlocks > 0 && emergencyCountToday >= maxEmergencyUnlocks) {
      return {
        step: 'anti_binge_block',
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
        desc: 'Durch strikten Modus / Fokus blockiert',
      },
    };
  }

  if (config.mode === 'standard') {
    return {
      step: 'standard_delay',
      delaySeconds: config.openDelay,
    };
  }

  if (config.mode === 'soft') {
    return { step: 'soft_intent' };
  }

  return { step: 'app_opened' };
};
