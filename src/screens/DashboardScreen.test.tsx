import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_APP_CONFIG, DEFAULT_STATE } from '../types';
import { DashboardScreen } from './DashboardScreen';

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

describe('DashboardScreen', () => {
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
});
