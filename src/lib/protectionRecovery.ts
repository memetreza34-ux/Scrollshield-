import type { AppConfig } from '../types';
import type { NativeProtectionStatus } from './nativeProtection';

export const getInstalledActiveProtectionIds = (
  appsConfig: Record<string, AppConfig>,
  unavailableAppIds: string[],
): string[] => {
  const unavailable = new Set(unavailableAppIds);
  return Object.values(appsConfig)
    .filter((config) => config.active && !unavailable.has(config.id))
    .map((config) => config.id);
};

export const shouldRecoverStaleProtection = (
  status: Pick<NativeProtectionStatus, 'enabled' | 'running' | 'health'>,
  _installedActiveAppIds: string[],
): boolean => status.enabled && !status.running && status.health === 'stale-activation';