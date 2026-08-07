import type { AppConfig } from '../types';

export const PROTECTION_BOUNDS = {
  openDelaySeconds: { min: 0, max: 120 },
  dailyLimitMinutes: { min: 0, max: 24 * 60 },
  sessionMinutes: { min: 1, max: 240 },
  antiBingeWarningThreshold: { min: 1, max: 10 },
  antiBingeBlockThreshold: { min: 2, max: 15 },
  antiBingeWindowMinutes: { min: 1, max: 180 },
  emergencyDurationMinutes: { min: 1, max: 60 },
  emergencyMaxPerDay: { min: 0, max: 10 },
} as const;

const finiteInteger = (value: number, fallback: number): number =>
  Number.isFinite(value) ? Math.round(value) : fallback;

export const clampInteger = (
  value: number,
  min: number,
  max: number,
  fallback: number,
): number => Math.min(max, Math.max(min, finiteInteger(value, fallback)));

export const normalizeProtectionConfig = (config: AppConfig): AppConfig => {
  const warningThreshold = clampInteger(
    config.antiBinge.warningThreshold,
    PROTECTION_BOUNDS.antiBingeWarningThreshold.min,
    PROTECTION_BOUNDS.antiBingeWarningThreshold.max,
    3,
  );
  const rawBlockThreshold = clampInteger(
    config.antiBinge.blockThreshold,
    PROTECTION_BOUNDS.antiBingeBlockThreshold.min,
    PROTECTION_BOUNDS.antiBingeBlockThreshold.max,
    5,
  );
  const blockThreshold = Math.min(
    PROTECTION_BOUNDS.antiBingeBlockThreshold.max,
    Math.max(rawBlockThreshold, warningThreshold + 1),
  );

  return {
    ...config,
    openDelay: clampInteger(
      config.openDelay,
      PROTECTION_BOUNDS.openDelaySeconds.min,
      PROTECTION_BOUNDS.openDelaySeconds.max,
      5,
    ),
    dailyLimit: clampInteger(
      config.dailyLimit,
      PROTECTION_BOUNDS.dailyLimitMinutes.min,
      PROTECTION_BOUNDS.dailyLimitMinutes.max,
      60,
    ),
    sessionLimit: clampInteger(
      config.sessionLimit,
      PROTECTION_BOUNDS.sessionMinutes.min,
      PROTECTION_BOUNDS.sessionMinutes.max,
      15,
    ),
    antiBinge: {
      ...config.antiBinge,
      warningThreshold,
      warningTimeframe: clampInteger(
        config.antiBinge.warningTimeframe,
        PROTECTION_BOUNDS.antiBingeWindowMinutes.min,
        PROTECTION_BOUNDS.antiBingeWindowMinutes.max,
        10,
      ),
      blockThreshold,
      blockTimeframe: clampInteger(
        config.antiBinge.blockTimeframe,
        PROTECTION_BOUNDS.antiBingeWindowMinutes.min,
        PROTECTION_BOUNDS.antiBingeWindowMinutes.max,
        20,
      ),
    },
    emergencyUnlock: {
      ...config.emergencyUnlock,
      durationMinutes: clampInteger(
        config.emergencyUnlock.durationMinutes,
        PROTECTION_BOUNDS.emergencyDurationMinutes.min,
        PROTECTION_BOUNDS.emergencyDurationMinutes.max,
        5,
      ),
      maxPerDay: clampInteger(
        config.emergencyUnlock.maxPerDay,
        PROTECTION_BOUNDS.emergencyMaxPerDay.min,
        PROTECTION_BOUNDS.emergencyMaxPerDay.max,
        2,
      ),
    },
  };
};
