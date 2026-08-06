import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { DEFAULT_STATE } from './types';

const {
  loadStateMock,
  hasPendingLegacyMigrationMock,
  saveStateMock,
  nativeSyncMock,
  nativeDrainMock,
} = vi.hoisted(() => ({
  loadStateMock: vi.fn(),
  hasPendingLegacyMigrationMock: vi.fn(),
  saveStateMock: vi.fn(),
  nativeSyncMock: vi.fn(),
  nativeDrainMock: vi.fn(),
}));

vi.mock('./lib/storage', () => ({
  StorageService: {
    loadState: () => loadStateMock(),
    hasPendingLegacyMigration: () => hasPendingLegacyMigrationMock(),
    saveState: (...args: unknown[]) => saveStateMock(...args),
    clearState: vi.fn(),
  },
}));

vi.mock('./lib/nativeProtection', () => ({
  NativeProtection: {
    isAvailable: () => true,
    sync: (...args: unknown[]) => nativeSyncMock(...args),
    drain: (...args: unknown[]) => nativeDrainMock(...args),
  },
}));

describe('App legacy migration lifecycle', () => {
  beforeEach(() => {
    loadStateMock.mockReset();
    hasPendingLegacyMigrationMock.mockReset();
    saveStateMock.mockReset();
    nativeSyncMock.mockReset();
    nativeDrainMock.mockReset();

    loadStateMock.mockReturnValue(null);
    hasPendingLegacyMigrationMock.mockReturnValue(true);
    nativeSyncMock.mockResolvedValue(undefined);
    nativeDrainMock.mockResolvedValue({ events: [], usage: [] });
  });

  it('shows only recovery UI and pauses normal save and native synchronization while migration is unresolved', async () => {
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Alte Daten sind geschützt' })).toBeInTheDocument();
    expect(screen.queryByText('Dein digitaler Schutzschild')).not.toBeInTheDocument();

    await new Promise((resolve) => window.setTimeout(resolve, 300));
    expect(saveStateMock).not.toHaveBeenCalled();
    expect(nativeSyncMock).not.toHaveBeenCalled();
    expect(nativeDrainMock).not.toHaveBeenCalled();
  });

  it('unlocks the normal app only after retry returns state and no legacy source remains', async () => {
    loadStateMock
      .mockReturnValueOnce(null)
      .mockReturnValueOnce({ ...DEFAULT_STATE, hasCompletedOnboarding: true });
    hasPendingLegacyMigrationMock.mockReturnValueOnce(true).mockReturnValueOnce(false);

    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Migration erneut versuchen' }));

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Alte Daten sind geschützt' })).not.toBeInTheDocument();
    });
    await waitFor(() => expect(saveStateMock).toHaveBeenCalled());
  });
});
