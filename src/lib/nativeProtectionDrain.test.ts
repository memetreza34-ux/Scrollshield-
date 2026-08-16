import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  acknowledgeProtectionEventsMock,
  drainProtectionEventsMock,
  factoryResetProtectionDataMock,
  getPlatformMock,
  isNativePlatformMock,
} = vi.hoisted(() => ({
  acknowledgeProtectionEventsMock: vi.fn(),
  drainProtectionEventsMock: vi.fn(),
  factoryResetProtectionDataMock: vi.fn(),
  getPlatformMock: vi.fn(),
  isNativePlatformMock: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => isNativePlatformMock(),
    getPlatform: () => getPlatformMock(),
  },
  registerPlugin: () => ({
    syncProtectionConfig: vi.fn(),
    startProtectionService: vi.fn(),
    stopProtectionService: vi.fn(),
    getProtectionServiceStatus: vi.fn(),
    drainProtectionEvents: (...args: unknown[]) => drainProtectionEventsMock(...args),
    acknowledgeProtectionEvents: (...args: unknown[]) => acknowledgeProtectionEventsMock(...args),
    factoryResetProtectionData: (...args: unknown[]) => factoryResetProtectionDataMock(...args),
  }),
}));

import { NativeProtection } from './nativeProtection';

const BATCH_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('NativeProtection drain ACK bridge', () => {
  beforeEach(() => {
    acknowledgeProtectionEventsMock.mockReset();
    drainProtectionEventsMock.mockReset();
    factoryResetProtectionDataMock.mockReset();
    getPlatformMock.mockReset();
    isNativePlatformMock.mockReset();

    isNativePlatformMock.mockReturnValue(true);
    getPlatformMock.mockReturnValue('android');
  });

  it('parses a valid native batch and acknowledges the same id explicitly', async () => {
    drainProtectionEventsMock.mockResolvedValue({
      batchId: BATCH_ID.toUpperCase(),
      eventsJson: JSON.stringify([
        {
          timestamp: 1_786_000_000_000,
          type: 'block',
          appId: 'instagram',
          desc: 'blocked',
        },
      ]),
      usageJson: JSON.stringify([
        { date: '2026-08-16', appId: 'instagram', durationMs: 60_000 },
      ]),
    });
    acknowledgeProtectionEventsMock.mockResolvedValue({ acknowledged: true });

    await expect(NativeProtection.drain()).resolves.toEqual({
      batchId: BATCH_ID,
      events: [
        {
          timestamp: 1_786_000_000_000,
          type: 'block',
          appId: 'instagram',
          desc: 'blocked',
        },
      ],
      usage: [{ date: '2026-08-16', appId: 'instagram', durationMs: 60_000 }],
    });

    await NativeProtection.acknowledgeDrain(BATCH_ID.toUpperCase());
    expect(acknowledgeProtectionEventsMock).toHaveBeenCalledWith({ batchId: BATCH_ID });
  });

  it('fails closed when Android returns real data without a valid batch id', async () => {
    drainProtectionEventsMock.mockResolvedValue({
      batchId: 'invalid',
      eventsJson: JSON.stringify([
        { timestamp: 1, type: 'warning', appId: 'system', desc: 'warning' },
      ]),
      usageJson: '[]',
    });

    await expect(NativeProtection.drain()).rejects.toThrow(
      'Android returned protection data without a valid drain batch id',
    );
  });

  it('rejects malformed acknowledgements before calling Android', async () => {
    await expect(NativeProtection.acknowledgeDrain('bad-id')).rejects.toThrow(
      'Invalid native drain batch id',
    );
    expect(acknowledgeProtectionEventsMock).not.toHaveBeenCalled();
  });

  it('requires an explicit native factory-reset confirmation', async () => {
    factoryResetProtectionDataMock.mockResolvedValue({ resetPendingCleanup: true });
    await expect(NativeProtection.factoryReset()).resolves.toBeUndefined();

    factoryResetProtectionDataMock.mockResolvedValue({ resetPendingCleanup: false });
    await expect(NativeProtection.factoryReset()).rejects.toThrow(
      'Android did not confirm native factory-reset protection',
    );
  });

  it('keeps browser preview drain, ack, and reset as safe no-ops', async () => {
    isNativePlatformMock.mockReturnValue(false);

    await expect(NativeProtection.drain()).resolves.toEqual({ batchId: '', events: [], usage: [] });
    await expect(NativeProtection.acknowledgeDrain(BATCH_ID)).resolves.toBeUndefined();
    await expect(NativeProtection.factoryReset()).resolves.toBeUndefined();

    expect(drainProtectionEventsMock).not.toHaveBeenCalled();
    expect(acknowledgeProtectionEventsMock).not.toHaveBeenCalled();
    expect(factoryResetProtectionDataMock).not.toHaveBeenCalled();
  });
});
