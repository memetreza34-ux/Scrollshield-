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

const CONFIG_GENERATION = '11111111-2222-4333-8444-555555555555';

const uncleanStatus = {
  running: false,
  enabled: true,
  unavailableAppIdsJson: '[]',
  lastStartRequestAt: 150,
  lastStartAt: 200,
  lastStopAt: 100,
  lastStopCode: 'notification_action_stop',
  lastStopMessage: 'Ein älterer sauberer Stopp',
};

const expectedRecoveryStart = {
  expectedConfigGeneration: CONFIG_GENERATION,
  requireLifecycleSnapshot: true,
  expectedEnabled: true,
  expectedLastStartRequestAt: 150,
  expectedLastStartAt: 200,
  expectedLastStopAt: 100,
};

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
    syncProtectionConfigMock.mockResolvedValue({
      unavailableAppIdsJson: '[]',
      configGeneration: CONFIG_GENERATION,
    });
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

  it('starts only with the exact durable config generation returned by native sync', async () => {
    await NativeProtection.start(
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
    expect(startProtectionServiceMock).toHaveBeenCalledWith({
      expectedConfigGeneration: CONFIG_GENERATION,
    });
  });

  it('fails closed before start when native sync does not confirm a valid config generation', async () => {
    syncProtectionConfigMock.mockResolvedValue({ unavailableAppIdsJson: '[]', configGeneration: 'invalid' });

    await expect(NativeProtection.start({}, false)).rejects.toThrow(
      'durable protection config generation',
    );
    expect(startProtectionServiceMock).not.toHaveBeenCalled();
  });

  it('preserves lifecycle diagnostics and detects stale activation', async () => {
    getProtectionServiceStatusMock.mockResolvedValue({
      running: false,
      enabled: true,
      unavailableAppIdsJson: '["instagram","instagram","tiktok"]',
      lastStartRequestAt: 1_785_999_900_000,
      lastStartAt: 1_786_000_000_000,
      lastStopAt: 1_786_000_100_000,
      lastStopCode: ' notifications_missing ',
      lastStopMessage: ' Benachrichtigungen wurden entzogen ',
    });

    await expect(NativeProtection.getStatus()).resolves.toEqual({
      running: false,
      enabled: true,
      unavailableAppIds: ['instagram', 'tiktok'],
      lastStartRequestAt: 1_785_999_900_000,
      lastStartAt: 1_786_000_000_000,
      lastStopAt: 1_786_000_100_000,
      lastStopCode: 'notifications_missing',
      lastStopMessage: 'Benachrichtigungen wurden entzogen',
      health: 'stale-activation',
    });
  });

  it('detects a pending start request during the confirmation grace window', () => {
    expect(
      assessNativeProtectionHealth(
        {
          running: false,
          enabled: true,
          lastStartRequestAt: 1_000_000,
          lastStartAt: 900_000,
          lastStopAt: 950_000,
          lastStopCode: 'manual_app_stop',
          lastStopMessage: 'Älterer Stopp',
        },
        1_010_000,
      ),
    ).toBe('start-pending');
  });

  it('detects an interrupted start request after the confirmation grace window', () => {
    expect(
      assessNativeProtectionHealth(
        {
          running: false,
          enabled: true,
          lastStartRequestAt: 1_000_000,
          lastStartAt: 900_000,
          lastStopAt: 950_000,
          lastStopCode: 'manual_app_stop',
          lastStopMessage: 'Älterer Stopp',
        },
        1_020_001,
      ),
    ).toBe('start-interrupted');
  });

  it('detects an unclean process stop when the last confirmed start has no later stop record', async () => {
    getProtectionServiceStatusMock.mockResolvedValue({
      running: false,
      enabled: true,
      unavailableAppIdsJson: '[]',
      lastStartRequestAt: 1_786_000_150_000,
      lastStartAt: 1_786_000_200_000,
      lastStopAt: 1_786_000_100_000,
      lastStopCode: 'notification_action_stop',
      lastStopMessage: 'Ein älterer sauberer Stopp',
    });

    await expect(NativeProtection.getStatus()).resolves.toMatchObject({
      running: false,
      enabled: true,
      lastStartRequestAt: 1_786_000_150_000,
      lastStartAt: 1_786_000_200_000,
      lastStopAt: 1_786_000_100_000,
      health: 'unclean-process-stop',
    });
  });

  it('recovers only from a confirmed unclean process stop and re-reads native truth', async () => {
    getProtectionServiceStatusMock
      .mockResolvedValueOnce(uncleanStatus)
      .mockResolvedValueOnce({
        running: true,
        enabled: true,
        unavailableAppIdsJson: '[]',
        lastStartRequestAt: 250,
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
    expect(startProtectionServiceMock).toHaveBeenCalledWith(expectedRecoveryStart);
    expect(getProtectionServiceStatusMock).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ running: true, enabled: true, health: 'active' });
  });

  it('preserves a newer manual stop that wins while process-loss recovery is in flight', async () => {
    getProtectionServiceStatusMock
      .mockResolvedValueOnce(uncleanStatus)
      .mockResolvedValueOnce({
        running: false,
        enabled: false,
        unavailableAppIdsJson: '[]',
        lastStartRequestAt: 150,
        lastStartAt: 200,
        lastStopAt: 260,
        lastStopCode: 'manual_app_stop',
        lastStopMessage: 'Bewusst gestoppt',
      });

    const result = await NativeProtection.recoverAfterProcessLoss({}, false);

    expect(syncProtectionConfigMock).toHaveBeenCalledTimes(1);
    expect(startProtectionServiceMock).toHaveBeenCalledWith(expectedRecoveryStart);
    expect(stopProtectionServiceMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      running: false,
      enabled: false,
      lastStopAt: 260,
      lastStopCode: 'manual_app_stop',
      lastStopMessage: 'Bewusst gestoppt',
      health: 'stopped-with-reason',
    });
  });

  it('returns fresh native target_app_missing evidence instead of writing a TypeScript stop', async () => {
    startProtectionServiceMock.mockRejectedValueOnce(new Error('At least one installed active protected app is required'));
    getProtectionServiceStatusMock
      .mockResolvedValueOnce(uncleanStatus)
      .mockResolvedValueOnce({
        running: false,
        enabled: false,
        unavailableAppIdsJson: '["instagram"]',
        lastStartRequestAt: 150,
        lastStartAt: 200,
        lastStopAt: 250,
        lastStopCode: 'target_app_missing',
        lastStopMessage: 'Keine aktive installierte Ziel-App ist mehr verfügbar',
      });
    syncProtectionConfigMock.mockResolvedValue({
      unavailableAppIdsJson: '["instagram"]',
      configGeneration: CONFIG_GENERATION,
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

    expect(startProtectionServiceMock).toHaveBeenCalledWith(expectedRecoveryStart);
    expect(stopProtectionServiceMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      running: false,
      enabled: false,
      lastStopCode: 'target_app_missing',
      health: 'stopped-with-reason',
    });
  });

  it('still recovers when one active target is unavailable but another remains installed', async () => {
    getProtectionServiceStatusMock
      .mockResolvedValueOnce(uncleanStatus)
      .mockResolvedValueOnce({
        running: true,
        enabled: true,
        unavailableAppIdsJson: '["instagram"]',
        lastStartRequestAt: 250,
        lastStartAt: 300,
        lastStopAt: 100,
        lastStopCode: 'notification_action_stop',
        lastStopMessage: 'Ein älterer sauberer Stopp',
      });
    syncProtectionConfigMock.mockResolvedValue({
      unavailableAppIdsJson: '["instagram"]',
      configGeneration: CONFIG_GENERATION,
    });

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
    expect(startProtectionServiceMock).toHaveBeenCalledWith(expectedRecoveryStart);
    expect(result).toMatchObject({
      running: true,
      enabled: true,
      unavailableAppIds: ['instagram'],
      health: 'active',
    });
  });

  it('rethrows a native start failure when no newer terminal evidence was persisted', async () => {
    startProtectionServiceMock.mockRejectedValueOnce(new Error('transport failed'));
    getProtectionServiceStatusMock
      .mockResolvedValueOnce(uncleanStatus)
      .mockResolvedValueOnce(uncleanStatus);

    await expect(NativeProtection.recoverAfterProcessLoss({}, false)).rejects.toThrow('transport failed');
    expect(getProtectionServiceStatusMock).toHaveBeenCalledTimes(2);
    expect(stopProtectionServiceMock).not.toHaveBeenCalled();
  });

  it('does not restart when process-loss recovery finds the service already active', async () => {
    getProtectionServiceStatusMock.mockResolvedValue({
      running: true,
      enabled: true,
      unavailableAppIdsJson: '[]',
      lastStartRequestAt: 250,
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
      lastStartRequestAt: 50,
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
      lastStartRequestAt: Number.POSITIVE_INFINITY,
      lastStartAt: Number.NaN,
      lastStopAt: -100,
      lastStopCode: null,
      lastStopMessage: 123,
    });

    await expect(NativeProtection.getStatus()).resolves.toEqual({
      running: false,
      enabled: false,
      unavailableAppIds: [],
      lastStartRequestAt: 0,
      lastStartAt: 0,
      lastStopAt: 0,
      lastStopCode: '',
      lastStopMessage: '',
      health: 'never-started',
    });
  });

  it('distinguishes active, start, process-loss, inconsistent, and stopped states deterministically', () => {
    const base = {
      lastStartRequestAt: 0,
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
      assessNativeProtectionHealth(
        {
          ...base,
          running: false,
          enabled: true,
          lastStartRequestAt: 20_000,
        },
        25_000,
      ),
    ).toBe('start-pending');
    expect(
      assessNativeProtectionHealth(
        {
          ...base,
          running: false,
          enabled: true,
          lastStartRequestAt: 20_000,
        },
        40_001,
      ),
    ).toBe('start-interrupted');
    expect(
      assessNativeProtectionHealth({
        ...base,
        running: false,
        enabled: true,
        lastStartRequestAt: 150,
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
      lastStartRequestAt: 0,
      lastStartAt: 0,
      lastStopAt: 0,
      lastStopCode: '',
      lastStopMessage: '',
      health: 'never-started',
    });
  });
});