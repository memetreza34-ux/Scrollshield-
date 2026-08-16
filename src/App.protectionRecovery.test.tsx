import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { DEFAULT_APP_CONFIG, DEFAULT_STATE } from './types';

const {
  acknowledgeDrainMock,
  factoryResetMock,
  loadStateMock,
  pendingMigrationMock,
  saveStateMock,
  syncMock,
  getStatusMock,
  startMock,
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

const status = (enabled: boolean, running: boolean) => ({
  enabled,
  running,
  unavailableAppIds: [],
  lastStartAt: 1,
  lastStopAt: 0,
  lastStopCode: '',
  lastStopMessage: '',
  health: enabled && running ? 'active' : enabled ? 'stale-activation' : 'never-started',
});

describe('App native protection recovery', () => {
  beforeEach(() => {
    loadStateMock.mockReset();
    pendingMigrationMock.mockReset();
    saveStateMock.mockReset();
    syncMock.mockReset();
    getStatusMock.mockReset();
    startMock.mockReset();
    drainMock.mockReset();
    acknowledgeDrainMock.mockReset();
    factoryResetMock.mockReset();

    loadStateMock.mockReturnValue(savedState);
    pendingMigrationMock.mockReturnValue(false);
    saveStateMock.mockReturnValue(true);
    syncMock.mockResolvedValue([]);
    getStatusMock.mockResolvedValue(status(true, false));
    startMock.mockResolvedValue(undefined);
    drainMock.mockResolvedValue({ batchId: '', events: [], usage: [] });
    acknowledgeDrainMock.mockResolvedValue(undefined);
    factoryResetMock.mockResolvedValue(undefined);
  });

  it('restarts a previously enabled stale service when an active target is installed', async () => {
    render(<App />);

    await waitFor(() => expect(startMock).toHaveBeenCalled());
    expect(startMock).toHaveBeenCalledWith(expect.any(Object), false);
  });

  it('never automatically enables protection that was deliberately disabled', async () => {
    getStatusMock.mockResolvedValue(status(false, false));
    render(<App />);

    await waitFor(() => expect(getStatusMock).toHaveBeenCalled());
    expect(startMock).not.toHaveBeenCalled();
  });

  it('does not restart when every configured active target is unavailable', async () => {
    syncMock.mockResolvedValue(['instagram']);
    render(<App />);

    await waitFor(() => expect(getStatusMock).toHaveBeenCalled());
    expect(startMock).not.toHaveBeenCalled();
  });
});
