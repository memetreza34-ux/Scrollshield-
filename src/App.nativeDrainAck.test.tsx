import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { DEFAULT_APP_CONFIG, DEFAULT_STATE, type AppState } from './types';

const {
  acknowledgeDrainMock,
  drainMock,
  factoryResetMock,
  getStatusMock,
  loadStateMock,
  pendingMigrationMock,
  saveStateMock,
  startMock,
  stopMock,
  syncMock,
} = vi.hoisted(() => ({
  acknowledgeDrainMock: vi.fn(),
  drainMock: vi.fn(),
  factoryResetMock: vi.fn(),
  getStatusMock: vi.fn(),
  loadStateMock: vi.fn(),
  pendingMigrationMock: vi.fn(),
  saveStateMock: vi.fn(),
  startMock: vi.fn(),
  stopMock: vi.fn(),
  syncMock: vi.fn(),
}));

vi.mock('./lib/storage', () => ({
  StorageService: {
    loadState: () => loadStateMock(),
    hasPendingLegacyMigration: () => pendingMigrationMock(),
    saveState: (...args: unknown[]) => saveStateMock(...args),
    clearState: vi.fn(),
  },
}));

vi.mock('./lib/nativeProtection', () => ({
  NativeProtection: {
    isAvailable: () => true,
    sync: (...args: unknown[]) => syncMock(...args),
    start: (...args: unknown[]) => startMock(...args),
    stop: (...args: unknown[]) => stopMock(...args),
    getStatus: (...args: unknown[]) => getStatusMock(...args),
    drain: (...args: unknown[]) => drainMock(...args),
    acknowledgeDrain: (...args: unknown[]) => acknowledgeDrainMock(...args),
    factoryReset: (...args: unknown[]) => factoryResetMock(...args),
  },
}));

const BATCH_ID = '12345678-1234-4234-8234-123456789abc';

const savedState: AppState = {
  ...DEFAULT_STATE,
  hasCompletedOnboarding: true,
  operatingSystem: 'android',
  appsConfig: {
    instagram: {
      id: 'instagram',
      ...DEFAULT_APP_CONFIG,
      active: true,
    },
  },
};

describe('App native drain persistence ordering', () => {
  beforeEach(() => {
    acknowledgeDrainMock.mockReset();
    drainMock.mockReset();
    factoryResetMock.mockReset();
    getStatusMock.mockReset();
    loadStateMock.mockReset();
    pendingMigrationMock.mockReset();
    saveStateMock.mockReset();
    startMock.mockReset();
    stopMock.mockReset();
    syncMock.mockReset();

    loadStateMock.mockReturnValue(savedState);
    pendingMigrationMock.mockReturnValue(false);
    saveStateMock.mockReturnValue(true);
    syncMock.mockResolvedValue([]);
    getStatusMock.mockResolvedValue({
      running: false,
      enabled: false,
      unavailableAppIds: [],
      lastStartAt: 0,
      lastStopAt: 0,
      lastStopCode: '',
      lastStopMessage: '',
      health: 'never-started',
    });
    startMock.mockResolvedValue(undefined);
    stopMock.mockResolvedValue(undefined);
    factoryResetMock.mockResolvedValue(undefined);
    drainMock.mockResolvedValue({
      batchId: BATCH_ID,
      usage: [{ date: '2026-08-16', appId: 'instagram', durationMs: 60_000 }],
      events: [
        {
          timestamp: 1_786_000_000_000,
          type: 'block',
          appId: 'instagram',
          desc: 'Instagram wurde blockiert',
        },
      ],
    });
    acknowledgeDrainMock.mockResolvedValue(undefined);
  });

  it('persists stats, history, and processed batch id before acknowledging Android', async () => {
    render(<App />);

    await waitFor(() => expect(acknowledgeDrainMock).toHaveBeenCalledWith(BATCH_ID));

    const persistedCallIndex = saveStateMock.mock.calls.findIndex((call) => {
      const state = call[0] as AppState & {
        settings: AppState['settings'] & {
          __scrollshieldNativeDrain?: { lastProcessedBatchId?: string };
        };
      };
      return state.settings.__scrollshieldNativeDrain?.lastProcessedBatchId === BATCH_ID;
    });

    expect(persistedCallIndex).toBeGreaterThanOrEqual(0);
    const persistedState = saveStateMock.mock.calls[persistedCallIndex]?.[0] as AppState;
    expect(persistedState.dailyStats['2026-08-16']?.usageMinutes.instagram).toBe(1);
    expect(persistedState.dailyStats['2026-08-16']?.blockedOpens).toBe(1);
    expect(persistedState.history[0]?.metadata).toMatchObject({
      source: 'native_android',
      nativeDrainBatchId: BATCH_ID,
    });

    const saveOrder = saveStateMock.mock.invocationCallOrder[persistedCallIndex];
    const ackOrder = acknowledgeDrainMock.mock.invocationCallOrder[0];
    expect(saveOrder).toBeLessThan(ackOrder);
  });

  it('does not acknowledge while the batch-bearing state cannot be persisted', async () => {
    saveStateMock.mockImplementation((state: AppState & { settings: Record<string, unknown> }) => {
      const journal = state.settings.__scrollshieldNativeDrain as
        | { lastProcessedBatchId?: string }
        | undefined;
      return journal?.lastProcessedBatchId !== BATCH_ID;
    });

    render(<App />);

    await waitFor(() => {
      expect(
        saveStateMock.mock.calls.some((call) => {
          const state = call[0] as AppState & { settings: Record<string, unknown> };
          const journal = state.settings.__scrollshieldNativeDrain as
            | { lastProcessedBatchId?: string }
            | undefined;
          return journal?.lastProcessedBatchId === BATCH_ID;
        }),
      ).toBe(true);
    });
    expect(acknowledgeDrainMock).not.toHaveBeenCalled();
  });
});
