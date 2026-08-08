import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCommitmentLock } from '../lib/commitmentLock';
import { DEFAULT_APP_CONFIG, DEFAULT_STATE } from '../types';
import { DashboardScreen } from './DashboardScreen';

const { isAvailableMock, getStatusMock } = vi.hoisted(() => ({
  isAvailableMock: vi.fn(),
  getStatusMock: vi.fn(),
}));

vi.mock('../lib/nativeProtection', () => ({
  NativeProtection: {
    isAvailable: () => isAvailableMock(),
    getStatus: (...args: unknown[]) => getStatusMock(...args),
  },
}));

const makeAndroidState = () => ({
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
    ...DEFAULT_STATE.appsConfig,
    instagram: { id: 'instagram', ...DEFAULT_APP_CONFIG, active: true },
  },
});

const activeNativeStatus = () => ({
  running: true,
  enabled: true,
  unavailableAppIds: [],
  lastStartAt: Date.now(),
  lastStopAt: 0,
  lastStopCode: '',
  lastStopMessage: '',
  health: 'active' as const,
});

describe('DashboardScreen', () => {
  beforeEach(() => {
    isAvailableMock.mockReset();
    getStatusMock.mockReset();
    isAvailableMock.mockReturnValue(false);
    getStatusMock.mockResolvedValue(activeNativeStatus());
  });

  it('uses whole-app release metrics instead of unsupported reel statistics', () => {
    render(<DashboardScreen state={makeAndroidState()} updateState={vi.fn()} navigate={vi.fn()} />);

    expect(screen.getByText('Geschützte Apps')).toBeInTheDocument();
    expect(screen.getByText('Interventionen')).toBeInTheDocument();
    expect(screen.getByText('Gemessene Freigabezeit')).toBeInTheDocument();
    expect(screen.getByText('Notfallfreigaben')).toBeInTheDocument();
    expect(screen.getByText(/Kurzvideo-Unterseiten oder einzelne Feed-Elemente/)).toBeInTheDocument();

    expect(screen.queryByText('Kurzvideo-Schutz')).not.toBeInTheDocument();
    expect(screen.queryByText('Heute im Feed')).not.toBeInTheDocument();
    expect(screen.queryByText('Erlaubte Videos')).not.toBeInTheDocument();
  });

  it('routes to the real Android protection status when permissions are missing', () => {
    const navigate = vi.fn();
    const state = makeAndroidState();
    state.permissions = { ...state.permissions, notifications: false };

    render(<DashboardScreen state={state} updateState={vi.fn()} navigate={navigate} />);

    fireEvent.click(screen.getByRole('button', { name: /Android-Schutz ist noch nicht vollständig bereit/ }));
    expect(navigate).toHaveBeenCalledWith('permissions');
  });

  it('labels iOS as preview instead of claiming native protection is finished', () => {
    render(
      <DashboardScreen
        state={{ ...makeAndroidState(), operatingSystem: 'ios' }}
        updateState={vi.fn()}
        navigate={vi.fn()}
      />,
    );

    expect(screen.getByText(/native iOS-Schutz ist noch nicht Bestandteil des Release-Kandidaten/)).toBeInTheDocument();
  });

  it('surfaces an active commitment after live native verification and routes to its details', async () => {
    isAvailableMock.mockReturnValue(true);
    getStatusMock.mockResolvedValue(activeNativeStatus());
    const navigate = vi.fn();
    render(
      <DashboardScreen
        state={makeAndroidState()}
        updateState={vi.fn()}
        navigate={navigate}
        commitmentLock={createCommitmentLock(480, Date.now())}
      />,
    );

    const commitmentButton = await screen.findByRole('button', { name: /Commitment aktiv · Regeln eingefroren/ });
    fireEvent.click(commitmentButton);
    expect(navigate).toHaveBeenCalledWith('rules');
  });

  it('warns and routes to protection status when commitment remains but native protection stops', async () => {
    isAvailableMock.mockReturnValue(true);
    getStatusMock.mockResolvedValue({
      ...activeNativeStatus(),
      running: false,
      enabled: false,
      lastStopAt: Date.now(),
      lastStopCode: 'notifications_missing',
      lastStopMessage: 'Benachrichtigungen fehlen',
      health: 'stopped-with-reason' as const,
    });
    const navigate = vi.fn();

    render(
      <DashboardScreen
        state={makeAndroidState()}
        updateState={vi.fn()}
        navigate={navigate}
        commitmentLock={createCommitmentLock(480, Date.now())}
      />,
    );

    const warning = await screen.findByRole('button', { name: /Commitment aktiv · Android-Schutz läuft nicht/ });
    expect(warning).toHaveTextContent('notifications_missing');
    expect(screen.queryByRole('button', { name: /Commitment aktiv · Regeln eingefroren/ })).not.toBeInTheDocument();
    fireEvent.click(warning);
    expect(navigate).toHaveBeenCalledWith('permissions');
  });

  it('fails visibly when commitment protection status cannot be read', async () => {
    isAvailableMock.mockReturnValue(true);
    getStatusMock.mockRejectedValue(new Error('bridge unavailable'));

    render(
      <DashboardScreen
        state={makeAndroidState()}
        updateState={vi.fn()}
        navigate={vi.fn()}
        commitmentLock={createCommitmentLock(60, Date.now())}
      />,
    );

    expect(await screen.findByRole('button', { name: /Commitment aktiv · Schutzstatus nicht prüfbar/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Commitment aktiv · Regeln eingefroren/ })).not.toBeInTheDocument();
  });
});
