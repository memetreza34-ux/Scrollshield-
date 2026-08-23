import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_APP_CONFIG } from '../types';

const {
  getPlatformMock,
  getProtectionServiceStatusMock,
  isNativePlatformMock,
  startProtectionServiceMock,
  stopProtectionServiceMock,
  syncProtectionConfigMock,
} = vi.hoisted(() => ({
  getPlatformMock: vi.fn(),
  getProtectionServiceStatusMock: vi.fn(),
  isNativePlatformMock: vi.fn(),
  startProtectionServiceMock: vi.fn(),
  stopProtectionServiceMock: vi.fn(),
  syncProtectionConfigMock: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => isNativePlatformMock(),
    getPlatform: () => getPlatformMock(),
  },
  registerPlugin: () => ({
    syncProtectionConfig: (...args: unknown[]) => syncProtectionConfigMock(...args),
    startProtectionService: (...args: unknown[]) => startProtectionServiceMock(...args),
    stopProtectionService: (...args: unknown[]) => stopProtectionServiceMock(...args),
    getProtectionServiceStatus: (...args: unknown[]) => getProtectionServiceStatusMock(...args),
    drainProtectionEvents: vi.fn(),
  }),
}));

import { assessNativeProtectionHealth, NativeProtection } from './nativeProtection';

describe('NativeProtection lifecycle reasons', () => {
  beforeEach(() => {
    isNativePlatformMock.mockReset();
    getPlatformMock.mockReset();
    getProtectionServiceStatusMock.mockReset();
    startProtectionServiceMock.mockReset();
    stopProtectionServiceMock.mockReset();
    syncProtectionConfigMock.mockReset();

    isNativePlatformMock.mockReturnValue(true);
    getPlatformMock.mockReturnValue('android');
    startProtectionServiceMock.mockResolvedValue(undefined);
    stopProtectionServiceMock.mockResolvedValue(undefined);
    syncProtectionConfigMock.mockResolvedValue({ unavailableAppIdsJson: '[]' });
  });

  it('passes an explicit migration recovery reason to Android', async () => {
    await NativeProtection.stop({
      code: 'migration_recovery',
      message: 'Schutz wurde wegen einer blockierten Datenmigration gestoppt',
    });

    expect(stopProtectionServiceMock).toHaveBeenCalledWith({
      reasonCode: 'migration_recovery',
      reasonMessage: 'Schutz wurde wegen einer blockierten Datenmigration gestoppt',
    });
  });

  it('uses a stable manual-stop fallback for empty values', async () => {
    await NativeProtection.stop({ code: '   ', message: '' });

    expect(stopProtectionServiceMock).toHaveBeenCalledWith({
      reasonCode: 'manual_app_stop',
      reasonMessage: 'Der Android-Schutz wurde in ScrollShield manuell gestoppt',
    });
  });

  it('syncs emergency countdown and reason requirements to Android', async () => {
    await NativeProtection.sync(
      {
        instagram: {
          id: 'instagram',
          ...DEFAULT_APP_CONFIG,
          active: true,
          emergencyUnlock: {
            ...DEFAULT_APP_CONFIG.emergencyUnlock,
            enabled: true,
            durationMinutes: 2,
            maxPerDay: 1,
            requireCountdown: false,
            requireReason: true,
          },
        },
      },
      false,
    );

    const call = syncProtectionConfigMock.mock.calls[0]?.[0] as { configJson?: string } | undefined;
    const config = JSON.parse(call?.configJson ?? '{}') as {
      apps?: Array<{
        id: string;
        emergencyUnlock?: {
          enabled: boolean;
          durationMinutes: number;
          maxPerDay: number;
          requireCountdown: boolean;
          requireReason: boolean;
        };
      }>;
    };
    const instagram = config.apps?.find((app) => app.id === 'instagram');

    expect(instagram?.emergencyUnlock).toEqual({
      enabled: true,
      durationMinutes: 2,
      maxPerDay: 1,
      requireCountdown: false,
      requireReason: true,
    });
  });

  it('preserves lifecycle diagnostics and detects stale activation', async () => {
    getProtectionServiceStatusMock.mockResolvedValue({
      running: false,
      enabled: true,
      unavailableAppIdsJson: '["instagram","instagram","tiktok"]',
      lastStartAt: 1_786_000_000_000,
      lastStopAt: 1_786_000_100_000,
      lastStopCode: ' notifications_missing ',
      lastStopMessage: ' Benachrichtigungen wurden entzogen ',
    });

    await expect(NativeProtection.getStatus()).resolves.toEqual({
      running: false,
      enabled: true,
      unavailableAppIds: ['instagram', 'tiktok'],
      lastStartAt: 1_786_000_000_000,
      lastStopAt: 1_786_000_100_000,
      lastStopCode: 'notifications_missing',
      lastStopMessage: 'Benachrichtigungen wurden entzogen',
      health: 'stale-activation',
    });
  });

  it('detects an unclean process stop when the last start has no later stop record', async () => {
    getProtectionServiceStatusMock.mockResolvedValue({
      running: false,
      enabled: true,
      unavailableAppIdsJson: '[]',
      lastStartAt: 1_786_000_200_000,
      lastStopAt: 1_786_000_100_000,
      lastStopCode: 'notification_action_stop',
      lastStopMessage: 'Ein älterer sauberer Stopp',
    });

    await expect(NativeProtection.getStatus()).resolves.toMatchObject({
      running: false,
      enabled: true,
      lastStartAt: 1_786_000_200_000,
      lastStopAt: 1_786_000_100_000,
      health: 'unclean-process-stop',
    });
  });

  it('recovers only from a confirmed unclean process stop and re-reads native truth', async () => {
    getProtectionServiceStatusMock
      .mockResolvedValueOnce({
        running: false,
        enabled: true,
        unavailableAppIdsJson: '[]',
        lastStartAt: 200,
        lastStopAt: 100,
        lastStopCode: 'notification_action_stop',
        lastStopMessage: 'Ein älterer sauberer Stopp',
      })
      .mockResolvedValueOnce({
        running: true,
        enabled: true,
        unavailableAppIdsJson: '[]',
        lastStartAt: 300,
        lastStopAt: 100,
        lastStopCode: 'notification_action_stop',
        lastStopMessage: 'Ein älterer sauberer Stopp',
      });

    const result = await NativeProtection.recoverAfterProcessLoss(
      {
        instagram: {
          id: 'instagram',
          ...DEFAULT_APP_CONFIG,
          active: true,
        },
      },
      false,
    );

    expect(syncProtectionConfigMock).toHaveBeenCalledTimes(1);
    expect(startProtectionServiceMock).toHaveBeenCalledTimes(1);
    expect(getProtectionServiceStatusMock).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ running: true, enabled: true, health: 'active' });
  });

  it('fails closed with target_app_missing when every active Android target is unavailable', async () => {
    getProtectionServiceStatusMock
      .mockResolvedValueOnce({
        running: false,
        enabled: true,
        unavailableAppIdsJson: '[]',
        lastStartAt: 200,
        lastStopAt: 100,
        lastStopCode: 'notification_action_stop',
        lastStopMessage: 'Ein älterer sauberer Stopp',
      })
      .mockResolvedValueOnce({
        running: false,
        enabled: false,
        unavailableAppIdsJson: '["instagram"]',
        lastStartAt: 200,
        lastStopAt: 250,
        lastStopCode: 'target_app_missing',
        lastStopMessage: 'Keine aktive installierte Ziel-App ist mehr verfügbar',
      });
    syncProtectionConfigMock.mockResolvedValue({ unavailableAppIdsJson: '["instagram"]' });

    const result = await NativeProtection.recoverAfterProcessLoss(
      {
        instagram: {
          id: 'instagram',
          ...DEFAULT_APP_CONFIG,
          active: true,
        },
      },
      false,
    );

    expect(syncProtectionConfigMock).toHaveBeenCalledTimes(1);
    expect(startProtectionServiceMock).not.toHaveBeenCalled();
    expect(stopProtectionServiceMock).toHaveBeenCalledWith({
      reasonCode: 'target_app_missing',
      reasonMessage: 'Keine aktive installierte Ziel-App ist mehr verfügbar; die Wiederherstellung wurde blockiert',
    });
    expect(result).toMatchObject({
      running: false,
      enabled: false,
      lastStopCode: 'target_app_missing',
      health: 'stopped-with-reason',
    });
  });

  it('still recovers when one active target is unavailable but another remains installed', async () => {
    getProtectionServiceStatusMock
      .mockResolvedValueOnce({
        running: false,
        enabled: true,
        unavailableAppIdsJson: '[]',
        lastStartAt: 200,
        lastStopAt: 100,
        lastStopCode: 'notification_action_stop',
        lastStopMessage: 'Ein älterer sauberer Stopp',
      })
      .mockResolvedValueOnce({
        running: true,
        enabled: true,
        unavailableAppIdsJson: '["instagram"]',
        lastStartAt: 300,
        lastStopAt: 100,
        lastStopCode: 'notification_action_stop',
        lastStopMessage: 'Ein älterer sauberer Stopp',
      });
    syncProtectionConfigMock.mockResolvedValue({ unavailableAppIdsJson: '["instagram"]' });

    const result = await NativeProtection.recoverAfterProcessLoss(
      {
        instagram: {
          id: 'instagram',
          ...DEFAULT_APP_CONFIG,
          active: true,
        },
        tiktok: {
          id: 'tiktok',
          ...DEFAULT_APP_CONFIG,
          active: true,
        },
      },
      false,
    );

    expect(stopProtectionServiceMock).not.toHaveBeenCalled();
    expect(startProtectionServiceMock).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      running: true,
      enabled: true,
      unavailableAppIds: ['instagram'],
      health: 'active',
    });
  });

  it('does not restart when process-loss recovery finds the service already active', async () => {
    getProtectionServiceStatusMock.mockResolvedValue({
      running: true,
      enabled: true,
      unavailableAppIdsJson: '[]',
      lastStartAt: 300,
      lastStopAt: 100,
      lastStopCode: '',
      lastStopMessage: '',
    });

    await expect(NativeProtection.recoverAfterProcessLoss({}, false)).resolves.toMatchObject({
      running: true,
      enabled: true,
      health: 'active',
    });
    expect(syncProtectionConfigMock).not.toHaveBeenCalled();
    expect(startProtectionServiceMock).not.toHaveBeenCalled();
  });

  it('refuses process-loss recovery from an unrelated stopped state', async () => {
    getProtectionServiceStatusMock.mockResolvedValue({
      running: false,
      enabled: false,
      unavailableAppIdsJson: '[]',
      lastStartAt: 100,
      lastStopAt: 200,
      lastStopCode: 'manual_app_stop',
      lastStopMessage: 'Bewusst gestoppt',
    });

    await expect(NativeProtection.recoverAfterProcessLoss({}, false)).rejects.toThrow(
      'unclean-process-stop',
    );
    expect(syncProtectionConfigMock).not.toHaveBeenCalled();
    expect(startProtectionServiceMock).not.toHaveBeenCalled();
  });

  it('normalizes malformed lifecycle values instead of exposing invalid diagnostics', async () => {
    getProtectionServiceStatusMock.mockResolvedValue({
      running: false,
      enabled: false,
      unavailableAppIdsJson: 'invalid-json',
      lastStartAt: Number.NaN,
      lastStopAt: -100,
      lastStopCode: null,
      lastStopMessage: 123,
    });

    await expect(NativeProtection.getStatus()).resolves.toEqual({
      running: false,
      enabled: false,
      unavailableAppIds: [],
      lastStartAt: 0,
      lastStopAt: 0,
      lastStopCode: '',
      lastStopMessage: '',
      health: 'never-started',
    });
  });

  it('distinguishes active, process-loss, inconsistent, and stopped states deterministically', () => {
    const base = {
      lastStartAt: 0,
      lastStopAt: 0,
      lastStopCode: '',
      lastStopMessage: '',
    };

    expect(assessNativeProtectionHealth({ ...base, running: true, enabled: true })).toBe('active');
    expect(assessNativeProtectionHealth({ ...base, running: true, enabled: false })).toBe(
      'running-without-activation',
    );
    expect(assessNativeProtectionHealth({ ...base, running: false, enabled: true })).toBe('stale-activation');
    expect(
      assessNativeProtectionHealth({
        ...base,
        running: false,
        enabled: true,
        lastStartAt: 200,
        lastStopAt: 100,
      }),
    ).toBe('unclean-process-stop');
    expect(
      assessNativeProtectionHealth({
        ...base,
        running: false,
        enabled: false,
        lastStopAt: 100,
        lastStopCode: 'manual_app_stop',
      }),
    ).toBe('stopped-with-reason');
    expect(
      assessNativeProtectionHealth({ ...base, running: false, enabled: false, lastStartAt: 100 }),
    ).toBe('stopped-without-reason');
    expect(assessNativeProtectionHealth({ ...base, running: false, enabled: false })).toBe('never-started');
  });

  it('does not call Android in the browser preview and returns a safe empty status', async () => {
    isNativePlatformMock.mockReturnValue(false);

    await NativeProtection.stop({ code: 'migration_recovery', message: 'Nicht auf Android' });

    expect(stopProtectionServiceMock).not.toHaveBeenCalled();
    await expect(NativeProtection.getStatus()).resolves.toEqual({
      running: false,
      enabled: false,
      unavailableAppIds: [],
      lastStartAt: 0,
      lastStopAt: 0,
      lastStopCode: '',
      lastStopMessage: '',
      health: 'never-started',
    });
  });
});