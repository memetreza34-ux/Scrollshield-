import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { createCommitmentLock, saveCommitmentLock } from './lib/commitmentLock';
import { StorageService } from './lib/storage';
import { DEFAULT_APP_CONFIG, DEFAULT_STATE } from './types';

const { drainMock, getStatusMock, isAvailableMock, startMock, stopMock, syncMock } = vi.hoisted(() => ({
  drainMock: vi.fn(),
  getStatusMock: vi.fn(),
  isAvailableMock: vi.fn(),
  startMock: vi.fn(),
  stopMock: vi.fn(),
  syncMock: vi.fn(),
}));

vi.mock('./lib/nativeProtection', () => ({
  NativeProtection: {
    isAvailable: () => isAvailableMock(),
    sync: (...args: unknown[]) => syncMock(...args),
    start: (...args: unknown[]) => startMock(...args),
    stop: (...args: unknown[]) => stopMock(...args),
    getStatus: (...args: unknown[]) => getStatusMock(...args),
    drain: (...args: unknown[]) => drainMock(...args),
  },
}));

const makeStoredAndroidState = () => ({
  ...DEFAULT_STATE,
  hasCompletedOnboarding: true,
  operatingSystem: 'android' as const,
  permissions: {
    ...DEFAULT_STATE.permissions,
    usageAccess: true,
    overlay: true,
    notifications: true,
  },
  appsConfig: {
    instagram: {
      id: 'instagram',
      ...DEFAULT_APP_CONFIG,
      active: true,
    },
  },
});

const healthyStatus = () => ({
  running: true,
  enabled: true,
  unavailableAppIds: [],
  lastStartAt: Date.now(),
  lastStopAt: 0,
  lastStopCode: '',
  lastStopMessage: '',
  health: 'active' as const,
});

const openCommitmentConfirmation = async () => {
  const profileButton = await screen.findByRole('button', { name: /Profile & Regeln öffnen/ });
  fireEvent.click(profileButton);
  expect(await screen.findByRole('heading', { name: 'Schutzprofile' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '1 Stunde' }));
  expect(screen.getByText(/1 Stunde verbindlich einfrieren/)).toBeInTheDocument();
};

describe('App commitment activation', () => {
  beforeEach(() => {
    localStorage.clear();
    isAvailableMock.mockReset();
    syncMock.mockReset();
    getStatusMock.mockReset();
    drainMock.mockReset();
    startMock.mockReset();
    stopMock.mockReset();

    isAvailableMock.mockReturnValue(true);
    syncMock.mockResolvedValue([]);
    getStatusMock.mockResolvedValue(healthyStatus());
    drainMock.mockResolvedValue({ events: [], usage: [] });
    startMock.mockResolvedValue(undefined);
    stopMock.mockResolvedValue(undefined);

    expect(StorageService.saveState(makeStoredAndroidState())).toBe(true);
  });

  it('persists commitment only after the real App flow verifies installed targets and a healthy native service', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Dein Schutz heute.' })).toBeInTheDocument();

    await openCommitmentConfirmation();
    expect(localStorage.getItem('scrollshield_commitment_lock_v1')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Verbindlich starten' }));

    await waitFor(() => expect(getStatusMock).toHaveBeenCalled());
    await waitFor(() => {
      const rawLock = localStorage.getItem('scrollshield_commitment_lock_v1');
      expect(rawLock).not.toBeNull();
      expect(JSON.parse(rawLock as string)).toMatchObject({ durationMinutes: 60 });
    });
    expect(syncMock).toHaveBeenCalledWith(expect.objectContaining({ instagram: expect.objectContaining({ active: true }) }), false);
    expect(await screen.findByText(/Deine aktuelle Schutzkonfiguration ist bis/)).toBeInTheDocument();
  });

  it('fails closed and does not persist commitment when the live native service is stopped', async () => {
    getStatusMock.mockResolvedValue({
      ...healthyStatus(),
      running: false,
      enabled: false,
      lastStopAt: Date.now(),
      lastStopCode: 'notifications_missing',
      lastStopMessage: 'Benachrichtigungen fehlen',
      health: 'stopped-with-reason' as const,
    });

    render(<App />);
    await openCommitmentConfirmation();
    fireEvent.click(screen.getByRole('button', { name: 'Verbindlich starten' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Starte zuerst den Android-Schutzdienst/);
    expect(localStorage.getItem('scrollshield_commitment_lock_v1')).toBeNull();
    expect(screen.getByRole('button', { name: 'Schutzstatus öffnen' })).toBeInTheDocument();
  });

  it('fails closed when the native readiness check itself throws', async () => {
    getStatusMock.mockRejectedValue(new Error('native bridge unavailable'));

    render(<App />);
    await openCommitmentConfirmation();
    fireEvent.click(screen.getByRole('button', { name: 'Verbindlich starten' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Android-Schutzstatus konnte nicht sicher geprüft werden/);
    expect(localStorage.getItem('scrollshield_commitment_lock_v1')).toBeNull();
  });

  it('stops native protection with a deliberate factory-reset reason and clears commitment on full reset', async () => {
    expect(saveCommitmentLock(createCommitmentLock(480, Date.now()))).toBe(true);

    render(<App />);
    expect(await screen.findByRole('button', { name: /Commitment aktiv · Regeln eingefroren/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Einstellungen' }));
    expect(await screen.findByRole('heading', { name: 'Menü' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Datenschutz & lokale Daten/ }));
    expect(await screen.findByRole('heading', { name: 'Datenschutz & Transparenz' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /App zurücksetzen/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Ja, Reset' }));

    expect(await screen.findByRole('heading', { name: 'ScrollShield' })).toBeInTheDocument();
    expect(stopMock).toHaveBeenCalledWith({
      code: 'factory_reset',
      message: 'Der Android-Schutz wurde wegen eines vollständigen ScrollShield-Resets beendet',
    });
    expect(localStorage.getItem('scrollshield_commitment_lock_v1')).toBeNull();
    await waitFor(() => {
      expect(Object.keys(localStorage).filter((key) => key.startsWith('scrollshield_'))).toEqual([]);
    });
  });
});
