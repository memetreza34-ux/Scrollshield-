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
  it('exposes only release-supported whole-app controls and distinct modes', () => {
    render(<AppDetailScreen state={makeState()} updateState={vi.fn()} navigate={vi.fn()} />);

    expect(screen.getByText(/Version 1 schützt die gesamte ausgewählte App/)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Bewusste Pause' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Strikt' })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'soft' })).not.toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Tägliches Sperrfenster aktivieren' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Notfall-Countdown verlangen' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Notfall-Begründung verlangen' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Anti-Binge aktivieren' })).toBeInTheDocument();

    expect(screen.queryByRole('switch', { name: 'Reels-Schutz aktivieren' })).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Swipe-Unterbrecher aktivieren' })).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Einzelinhalt-Erlaubnis' })).not.toBeInTheDocument();
  });

  it('enables the native daily block window with an overnight-safe default', () => {
    const updateState = vi.fn();
    render(<AppDetailScreen state={makeState()} updateState={updateState} navigate={vi.fn()} />);

    fireEvent.click(screen.getByRole('switch', { name: 'Tägliches Sperrfenster aktivieren' }));

    expect(updateState).toHaveBeenCalledWith({
      appsConfig: expect.objectContaining({
        instagram: expect.objectContaining({ blockHours: '22:00-07:00' }),
      }),
    });
  });

  it('normalizes invalid Anti-Binge ordering before persisting it', () => {
    const updateState = vi.fn();
    const state = makeState();
    state.appsConfig.instagram.antiBinge = {
      ...state.appsConfig.instagram.antiBinge,
      enabled: true,
      warningThreshold: 8,
      blockThreshold: 9,
    };
    render(<AppDetailScreen state={state} updateState={updateState} navigate={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Strikte Sperre nach'), { target: { value: '3' } });

    expect(updateState).toHaveBeenCalledWith({
      appsConfig: expect.objectContaining({
        instagram: expect.objectContaining({
          antiBinge: expect.objectContaining({ warningThreshold: 8, blockThreshold: 9 }),
        }),
      }),
    });
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

  it('removes inactive controls from keyboard and assistive-technology navigation', () => {
    const state = makeState();
    state.appsConfig.instagram.active = false;
    const { container } = render(<AppDetailScreen state={state} updateState={vi.fn()} navigate={vi.fn()} />);

    const inertSection = container.querySelector('[inert]');
    expect(inertSection).not.toBeNull();
  });
});