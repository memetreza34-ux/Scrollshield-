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
