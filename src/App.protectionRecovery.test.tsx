import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { DEFAULT_APP_CONFIG, DEFAULT_STATE } from './types';
import type { NativeProtectionHealth } from './lib/nativeProtection';

const {
  acknowledgeDrainMock,
  factoryResetMock,
  loadStateMock,
  pendingMigrationMock,
  saveStateMock,
  syncMock,
  getStatusMock,
  startMock,
  recoverMock,
  drainMock,
} = vi.hoisted(() => ({
  acknowledgeDrainMock: vi.fn(),
  factoryResetMock: vi.fn(),
  loadStateMock: vi.fn(),
  pendingMigrationMock: vi.fn(),
  saveStateMock: vi.fn(),
  syncMock: vi.fn(),
  getStatusMock: vi.fn(),
  startMock: vi.fn(),
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
    getStatus: (...args: unknown[]) => getStatusMock(...args),
    start: (...args: unknown[]) => startMock(...args),
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
    getStatusMock.mockReset();
    startMock.mockReset();
    recoverMock.mockReset();
    drainMock.mockReset();
    acknowledgeDrainMock.mockReset();
    factoryResetMock.mockReset();

    loadStateMock.mockReturnValue(savedState);
    pendingMigrationMock.mockReturnValue(false);
    saveStateMock.mockReturnValue(true);
    syncMock.mockResolvedValue([]);
    getStatusMock.mockResolvedValue(status(true, false));
    startMock.mockResolvedValue(undefined);
    recoverMock.mockResolvedValue(status(true, true, 'active'));
    drainMock.mockResolvedValue({ batchId: '', events: [], usage: [] });
    acknowledgeDrainMock.mockResolvedValue(undefined);
    factoryResetMock.mockResolvedValue(undefined);
  });

  it('restarts a previously enabled stale service when an active target is installed', async () => {
    render(<App />);

    await waitFor(() => expect(startMock).toHaveBeenCalled());
    expect(syncMock).toHaveBeenCalledWith(expect.any(Object), false);
    expect(startMock).toHaveBeenCalledWith(expect.any(Object), false);
    expect(recoverMock).not.toHaveBeenCalled();
  });

  it('uses controlled process-loss recovery without a duplicate app-level config sync', async () => {
    getStatusMock.mockResolvedValue(status(true, false, 'unclean-process-stop'));
    render(<App />);

    await waitFor(() => expect(recoverMock).toHaveBeenCalled());
    expect(recoverMock).toHaveBeenCalledWith(expect.any(Object), false);
    expect(syncMock).not.toHaveBeenCalled();
    expect(startMock).not.toHaveBeenCalled();
  });

  it('does not invalidate a fresh pending start request with config sync or a duplicate start', async () => {
    getStatusMock.mockResolvedValue(status(true, false, 'start-pending'));
    render(<App />);

    await waitFor(() => expect(getStatusMock).toHaveBeenCalled());
    expect(syncMock).not.toHaveBeenCalled();
    expect(startMock).not.toHaveBeenCalled();
    expect(recoverMock).not.toHaveBeenCalled();
  });

  it('never automatically enables protection that was deliberately disabled', async () => {
    getStatusMock.mockResolvedValue(status(false, false));
    render(<App />);

    await waitFor(() => expect(syncMock).toHaveBeenCalled());
    expect(startMock).not.toHaveBeenCalled();
    expect(recoverMock).not.toHaveBeenCalled();
  });

  it('does not restart when every configured active target is unavailable', async () => {
    syncMock.mockResolvedValue(['instagram']);
    render(<App />);

    await waitFor(() => expect(syncMock).toHaveBeenCalled());
    expect(startMock).not.toHaveBeenCalled();
    expect(recoverMock).not.toHaveBeenCalled();
  });
});
