import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getPlatformMock,
  isNativePlatformMock,
  startProtectionServiceMock,
  stopProtectionServiceMock,
  syncProtectionConfigMock,
} = vi.hoisted(() => ({
  getPlatformMock: vi.fn(),
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
    getProtectionServiceStatus: vi.fn(),
    drainProtectionEvents: vi.fn(),
  }),
}));

import { NativeProtection } from './nativeProtection';

describe('NativeProtection lifecycle reasons', () => {
  beforeEach(() => {
    isNativePlatformMock.mockReset();
    getPlatformMock.mockReset();
    startProtectionServiceMock.mockReset();
    stopProtectionServiceMock.mockReset();
    syncProtectionConfigMock.mockReset();

    isNativePlatformMock.mockReturnValue(true);
    getPlatformMock.mockReturnValue('android');
    stopProtectionServiceMock.mockResolvedValue(undefined);
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

  it('does not call Android in the browser preview', async () => {
    isNativePlatformMock.mockReturnValue(false);

    await NativeProtection.stop({ code: 'migration_recovery', message: 'Nicht auf Android' });

    expect(stopProtectionServiceMock).not.toHaveBeenCalled();
  });
});
