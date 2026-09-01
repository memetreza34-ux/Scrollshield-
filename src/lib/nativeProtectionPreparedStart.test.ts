import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getPlatformMock, isNativePlatformMock, startProtectionServiceMock, syncProtectionConfigMock } = vi.hoisted(
  () => ({
    getPlatformMock: vi.fn(),
    isNativePlatformMock: vi.fn(),
    startProtectionServiceMock: vi.fn(),
    syncProtectionConfigMock: vi.fn(),
  }),
);

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => isNativePlatformMock(),
    getPlatform: () => getPlatformMock(),
  },
  registerPlugin: () => ({
    syncProtectionConfig: (...args: unknown[]) => syncProtectionConfigMock(...args),
    startProtectionService: (...args: unknown[]) => startProtectionServiceMock(...args),
    stopProtectionService: vi.fn(),
    getProtectionServiceStatus: vi.fn(),
    drainProtectionEvents: vi.fn(),
    acknowledgeProtectionEvents: vi.fn(),
    factoryResetProtectionData: vi.fn(),
  }),
}));

import { NativeProtection } from './nativeProtection';

const CONFIG_GENERATION = '11111111-2222-4333-8444-555555555555';

describe('NativeProtection committed-start boundary', () => {
  beforeEach(() => {
    getPlatformMock.mockReset();
    isNativePlatformMock.mockReset();
    startProtectionServiceMock.mockReset();
    syncProtectionConfigMock.mockReset();

    getPlatformMock.mockReturnValue('android');
    isNativePlatformMock.mockReturnValue(true);
    startProtectionServiceMock.mockResolvedValue(undefined);
    syncProtectionConfigMock.mockResolvedValue({
      unavailableAppIdsJson: '["instagram"]',
      configGeneration: CONFIG_GENERATION,
    });
  });

  it('returns the exact durable generation together with unavailable targets', async () => {
    await expect(NativeProtection.syncCommitted({}, false)).resolves.toEqual({
      unavailableAppIds: ['instagram'],
      configGeneration: CONFIG_GENERATION,
    });
    expect(syncProtectionConfigMock).toHaveBeenCalledTimes(1);
  });

  it('starts an already committed generation without performing a second config sync', async () => {
    const synced = await NativeProtection.syncCommitted({}, false);
    await NativeProtection.startCommitted(synced.configGeneration);

    expect(syncProtectionConfigMock).toHaveBeenCalledTimes(1);
    expect(startProtectionServiceMock).toHaveBeenCalledTimes(1);
    expect(startProtectionServiceMock).toHaveBeenCalledWith({
      expectedConfigGeneration: CONFIG_GENERATION,
    });
  });

  it('forwards a lifecycle snapshot for conditional automatic restart', async () => {
    const synced = await NativeProtection.syncCommitted({}, false);
    await NativeProtection.startCommitted(synced.configGeneration, {
      enabled: true,
      lastStartRequestAt: 300,
      lastStartAt: 200,
      lastStopAt: 250,
    });

    expect(syncProtectionConfigMock).toHaveBeenCalledTimes(1);
    expect(startProtectionServiceMock).toHaveBeenCalledWith({
      expectedConfigGeneration: CONFIG_GENERATION,
      requireLifecycleSnapshot: true,
      expectedEnabled: true,
      expectedLastStartRequestAt: 300,
      expectedLastStartAt: 200,
      expectedLastStopAt: 250,
    });
  });

  it('fails closed before Android dispatch when the prepared generation is invalid', async () => {
    await expect(NativeProtection.startCommitted('invalid')).rejects.toThrow(
      'valid durable protection config generation',
    );
    expect(syncProtectionConfigMock).not.toHaveBeenCalled();
    expect(startProtectionServiceMock).not.toHaveBeenCalled();
  });

  it('fails closed before Android dispatch when automatic restart snapshot is invalid', async () => {
    await expect(
      NativeProtection.startCommitted(CONFIG_GENERATION, {
        enabled: false,
        lastStartRequestAt: 300,
        lastStartAt: 200,
        lastStopAt: 250,
      }),
    ).rejects.toThrow('enabled lifecycle evidence');
    expect(startProtectionServiceMock).not.toHaveBeenCalled();
  });
});
