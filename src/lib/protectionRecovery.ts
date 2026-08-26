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
  installedActiveAppIds: string[],
): boolean =>
  status.enabled &&
  !status.running &&
  installedActiveAppIds.length > 0 &&
  (status.health === 'stale-activation' || status.health === 'unclean-process-stop');
