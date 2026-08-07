import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_APP_CONFIG, DEFAULT_STATE } from '../types';
import { FocusScreen } from './FocusScreen';

const state = {
  ...DEFAULT_STATE,
  hasCompletedOnboarding: true,
  appsConfig: {
    instagram: {
      id: 'instagram',
      ...DEFAULT_APP_CONFIG,
      active: true,
      focusModeBehavior: 'block' as const,
    },
    youtube: {
      id: 'youtube',
      ...DEFAULT_APP_CONFIG,
      active: true,
      focusModeBehavior: 'warn' as const,
    },
  },
};

describe('FocusScreen', () => {
  it('shows only the persistent focus timer and no demo schedule tab', () => {
    render(<FocusScreen state={state} updateState={vi.fn()} navigate={vi.fn()} />);

    expect(screen.getByText('Fokus-Sitzung starten')).toBeInTheDocument();
    expect(screen.getByText(/1 App mit Blockieren und 1 mit Warnen/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Zeitpläne' })).not.toBeInTheDocument();
    expect(screen.queryByText('Arbeit / Deep Work')).not.toBeInTheDocument();
  });

  it('starts the actual global focus state for the selected duration', () => {
    const updateState = vi.fn();
    render(<FocusScreen state={state} updateState={updateState} navigate={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /45 Min/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Fokus für 45 Minuten starten' }));

    expect(updateState).toHaveBeenCalledWith(
      expect.objectContaining({
        isFocusModeActive: true,
        focusTimeRemaining: 45,
      }),
    );
  });

  it('describes an active focus session as per-app rules instead of universal strict blocking', () => {
    render(
      <FocusScreen
        state={{ ...state, isFocusModeActive: true, focusTimeRemaining: 20 }}
        updateState={vi.fn()}
        navigate={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Fokusregeln aktiv' })).toBeInTheDocument();
    expect(screen.getByLabelText('Noch 20 Minuten')).toBeInTheDocument();
    expect(screen.queryByText('Strikter Schutz aktiv')).not.toBeInTheDocument();
  });
});
