import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_STATE } from '../types';
import { ReleaseOnboarding, ReleaseWelcome } from './ReleaseOnboardingScreens';

describe('release onboarding', () => {
  it('welcomes users with whole-app protection instead of a fake short-video layer', () => {
    render(<ReleaseWelcome navigate={vi.fn()} />);

    expect(screen.getByText('Ganze Apps bewusst öffnen')).toBeInTheDocument();
    expect(screen.getByText('Strikt, wenn du es brauchst')).toBeInTheDocument();
    expect(screen.queryByText('Kurzvideo-Sog stoppen')).not.toBeInTheDocument();
    expect(screen.queryByText(/Die 2 Schutzebenen/)).not.toBeInTheDocument();
  });

  it('requires an app and applies a release-safe normalized profile', () => {
    const updateState = vi.fn();
    const state = { ...DEFAULT_STATE, operatingSystem: 'android' as const };

    render(<ReleaseOnboarding state={state} updateState={updateState} navigate={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Mindestens eine App wählen' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Instagram/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));

    expect(screen.getByRole('heading', { name: 'Startprofil wählen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Konsequent/ })).toBeInTheDocument();
    expect(screen.queryByText(/Kurzvideos auf/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Endlos-Feeds erhalten/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Sanft/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));

    expect(updateState).toHaveBeenCalledWith({
      appsConfig: expect.objectContaining({
        instagram: expect.objectContaining({
          active: true,
          mode: 'standard',
          reelsProtection: expect.objectContaining({ enabled: false, mode: 'allow' }),
          singleContent: expect.objectContaining({ allowSharedLinks: false, allowOnlyOne: false }),
        }),
      }),
      activeProfileId: 'gentle',
    });
    expect(screen.getByText('Android v1')).toBeInTheDocument();
  });
});
