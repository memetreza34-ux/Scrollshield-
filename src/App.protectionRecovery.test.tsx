import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { DEFAULT_APP_CONFIG, DEFAULT_STATE } from './types';
import type { NativeProtectionHealth } from './lib/nativeProtection';

const CONFIG_GENERATION = '11111111-2222-4333-8444-555555555555';

const {
  acknowledgeDrainMock,
  factoryResetMock,
  loadStateMock,
  pendingMigrationMock,
  saveStateMock,
  syncMock,
  syncCommittedMock,
  getStatusMock,
  startMock,
  startCommittedMock,
  recoverMock,
  drainMock,
} = vi.hoisted(() => ({
  acknowledgeDrainMock: vi.fn(),
  factoryResetMock: vi.fn(),
  loadStateMock: vi.fn(),
  pendingMigrationMock: vi.fn(),
  saveStateMock: vi.fn(),
  syncMock: vi.fn(),
  syncCommittedMock: vi.fn(),
  getStatusMock: vi.fn(),
  startMock: vi.fn(),
  startCommittedMock: vi.fn(),
  recoverMock: vi.fn(),
  drainMock: vi.fn(),
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
    syncCommitted: (...args: unknown[]) => syncCommittedMock(...args),
    getStatus: (...args: unknown[]) => getStatusMock(...args),
    start: (...args: unknown[]) => startMock(...args),
    startCommitted: (...args: unknown[]) => startCommittedMock(...args),
    recoverAfterProcessLoss: (...args: unknown[]) => recoverMock(...args),
    drain: (...args: unknown[]) => drainMock(...args),
    acknowledgeDrain: (...args: unknown[]) => acknowledgeDrainMock(...args),
    factoryReset: (...args: unknown[]) => factoryResetMock(...args),
    stop: vi.fn(),
  },
}));

const savedState = {
  ...DEFAULT_STATE,
  hasCompletedOnboarding: true,
  operatingSystem: 'android' as const,
  appsConfig: {
    ...DEFAULT_STATE.appsConfig,
    instagram: {
      id: 'instagram',
      ...DEFAULT_APP_CONFIG,
      active: true,
      updatedAt: 123,
    },
  },
};

const status = (
  enabled: boolean,
  running: boolean,
  health: NativeProtectionHealth = enabled && running
    ? 'active'
    : enabled
      ? 'stale-activation'
      : 'never-started',
) => ({
  enabled,
  running,
  unavailableAppIds: [],
  lastStartRequestAt: 0,
  lastStartAt: health === 'unclean-process-stop' ? 2 : 1,
  lastStopAt: 0,
  lastStopCode: '',
  lastStopMessage: '',
  health,
});

describe('App native protection recovery', () => {
  beforeEach(() => {
    loadStateMock.mockReset();
    pendingMigrationMock.mockReset();
    saveStateMock.mockReset();
    syncMock.mockReset();
    syncCommittedMock.mockReset();
    getStatusMock.mockReset();
    startMock.mockReset();
    startCommittedMock.mockReset();
    recoverMock.mockReset();
    drainMock.mockReset();
    acknowledgeDrainMock.mockReset();
    factoryResetMock.mockReset();

    loadStateMock.mockReturnValue(savedState);
    pendingMigrationMock.mockReturnValue(false);
    saveStateMock.mockReturnValue(true);
    syncMock.mockResolvedValue([]);
    syncCommittedMock.mockResolvedValue({
      unavailableAppIds: [],
      configGeneration: CONFIG_GENERATION,
    });
    getStatusMock.mockResolvedValue(status(true, false));
    startMock.mockResolvedValue(undefined);
    startCommittedMock.mockResolvedValue(undefined);
    recoverMock.mockResolvedValue(status(true, true, 'active'));
    drainMock.mockResolvedValue({ batchId: '', events: [], usage: [] });
    acknowledgeDrainMock.mockResolvedValue(undefined);
    factoryResetMock.mockResolvedValue(undefined);
  });

  it('restarts a stale service with the single durable generation and exact lifecycle snapshot', async () => {
    render(<App />);

    await waitFor(() =>
      expect(startCommittedMock).toHaveBeenCalledWith(
        CONFIG_GENERATION,
        expect.objectContaining({
          enabled: true,
          running: false,
          lastStartRequestAt: 0,
          lastStartAt: 1,
          lastStopAt: 0,
          health: 'stale-activation',
        }),
      ),
    );
    expect(syncCommittedMock).toHaveBeenCalledTimes(1);
    expect(syncCommittedMock).toHaveBeenCalledWith(expect.any(Object), false);
    expect(startCommittedMock).toHaveBeenCalledTimes(1);
    expect(syncMock).not.toHaveBeenCalled();
    expect(startMock).not.toHaveBeenCalled();
    expect(recoverMock).not.toHaveBeenCalled();
  });

  it('uses controlled process-loss recovery without a duplicate app-level config sync', async () => {
    getStatusMock.mockResolvedValue(status(true, false, 'unclean-process-stop'));
    render(<App />);

    await waitFor(() => expect(recoverMock).toHaveBeenCalled());
    expect(recoverMock).toHaveBeenCalledWith(expect.any(Object), false);
    expect(syncCommittedMock).not.toHaveBeenCalled();
    expect(startCommittedMock).not.toHaveBeenCalled();
    expect(syncMock).not.toHaveBeenCalled();
    expect(startMock).not.toHaveBeenCalled();
  });

  it('does not invalidate a fresh pending start request with config sync or a duplicate start', async () => {
    getStatusMock.mockResolvedValue(status(true, false, 'start-pending'));
    render(<App />);

    await waitFor(() => expect(getStatusMock).toHaveBeenCalled());
    expect(syncCommittedMock).not.toHaveBeenCalled();
    expect(startCommittedMock).not.toHaveBeenCalled();
    expect(syncMock).not.toHaveBeenCalled();
    expect(startMock).not.toHaveBeenCalled();
    expect(recoverMock).not.toHaveBeenCalled();
  });

  it('never automatically enables protection that was deliberately disabled', async () => {
    getStatusMock.mockResolvedValue(status(false, false));
    render(<App />);

    await waitFor(() => expect(syncCommittedMock).toHaveBeenCalled());
    expect(startCommittedMock).not.toHaveBeenCalled();
    expect(startMock).not.toHaveBeenCalled();
    expect(recoverMock).not.toHaveBeenCalled();
  });

  it('delegates unavailable-target stale recovery to the native snapshot-bound preflight', async () => {
    syncCommittedMock.mockResolvedValue({
      unavailableAppIds: ['instagram'],
      configGeneration: CONFIG_GENERATION,
    });
    render(<App />);

    await waitFor(() =>
      expect(startCommittedMock).toHaveBeenCalledWith(
        CONFIG_GENERATION,
        expect.objectContaining({
          enabled: true,
          running: false,
          lastStartRequestAt: 0,
          lastStartAt: 1,
          lastStopAt: 0,
          health: 'stale-activation',
        }),
      ),
    );
    expect(syncCommittedMock).toHaveBeenCalledTimes(1);
    expect(startCommittedMock).toHaveBeenCalledTimes(1);
    expect(startMock).not.toHaveBeenCalled();
    expect(recoverMock).not.toHaveBeenCalled();
  });
});