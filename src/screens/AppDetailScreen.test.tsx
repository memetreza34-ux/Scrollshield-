import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_APP_CONFIG, DEFAULT_STATE } from '../types';
import { AppDetailScreen } from './AppDetailScreen';

const makeState = () => ({
  ...DEFAULT_STATE,
  selectedAppId: 'instagram',
  appsConfig: {
    ...DEFAULT_STATE.appsConfig,
    instagram: {
      id: 'instagram',
      ...DEFAULT_APP_CONFIG,
      active: true,
      emergencyUnlock: {
        ...DEFAULT_APP_CONFIG.emergencyUnlock,
        enabled: true,
      },
    },
  },
});

describe('AppDetailScreen', () => {
  it('exposes only release-supported whole-app controls', () => {
    render(<AppDetailScreen state={makeState()} updateState={vi.fn()} navigate={vi.fn()} />);

    expect(screen.getByText(/Version 1 schützt die gesamte ausgewählte App/)).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Notfall-Countdown verlangen' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Notfall-Begründung verlangen' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Anti-Binge aktivieren' })).toBeInTheDocument();

    expect(screen.queryByRole('switch', { name: 'Reels-Schutz aktivieren' })).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Swipe-Unterbrecher aktivieren' })).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Einzelinhalt-Erlaubnis' })).not.toBeInTheDocument();
  });

  it('persists the emergency countdown requirement', () => {
    const updateState = vi.fn();
    render(<AppDetailScreen state={makeState()} updateState={updateState} navigate={vi.fn()} />);

    fireEvent.click(screen.getByRole('switch', { name: 'Notfall-Countdown verlangen' }));

    expect(updateState).toHaveBeenCalledWith({
      appsConfig: expect.objectContaining({
        instagram: expect.objectContaining({
          emergencyUnlock: expect.objectContaining({ requireCountdown: false }),
        }),
      }),
    });
  });

  it('persists the emergency reason requirement without losing the other emergency settings', () => {
    const updateState = vi.fn();
    render(<AppDetailScreen state={makeState()} updateState={updateState} navigate={vi.fn()} />);

    fireEvent.click(screen.getByRole('switch', { name: 'Notfall-Begründung verlangen' }));

    expect(updateState).toHaveBeenCalledWith({
      appsConfig: expect.objectContaining({
        instagram: expect.objectContaining({
          emergencyUnlock: expect.objectContaining({
            enabled: true,
            requireCountdown: true,
            requireReason: false,
          }),
        }),
      }),
    });
  });
});
