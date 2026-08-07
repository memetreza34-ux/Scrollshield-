import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_STATE } from '../types';
import { ProfilesScreen } from './ProfilesScreen';

const makeState = () => ({
  ...DEFAULT_STATE,
  activeProfileId: 'gentle',
  appsConfig: {
    ...DEFAULT_STATE.appsConfig,
    instagram: {
      ...DEFAULT_STATE.profiles![0].appsConfig.instagram,
      active: true,
      mode: 'soft' as const,
      reelsProtection: {
        ...DEFAULT_STATE.profiles![0].appsConfig.instagram.reelsProtection,
        enabled: true,
      },
    },
  },
});

describe('ProfilesScreen', () => {
  it('presents protection profiles without legacy focus-only or Reels claims', () => {
    render(<ProfilesScreen state={makeState()} updateState={vi.fn()} navigate={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Schutzprofile' })).toBeInTheDocument();
    expect(screen.getByText(/Ein Profil wechselt die gesamte App-Konfiguration/)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Konsequent/ })).toBeInTheDocument();
    expect(screen.queryByText('Fokus-Profile')).not.toBeInTheDocument();
    expect(screen.queryByText(/Kurzvideos/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Endlos-Feeds/)).not.toBeInTheDocument();
  });

  it('normalizes unsupported legacy values when switching profiles', () => {
    const updateState = vi.fn();
    const state = makeState();

    render(<ProfilesScreen state={state} updateState={updateState} navigate={vi.fn()} />);
    fireEvent.click(screen.getByRole('radio', { name: /Balance/ }));

    expect(updateState).toHaveBeenCalledWith({
      profiles: expect.any(Array),
      activeProfileId: 'balance',
      appsConfig: expect.objectContaining({
        instagram: expect.objectContaining({
          mode: 'standard',
          reelsProtection: expect.objectContaining({ enabled: false, mode: 'allow' }),
          singleContent: expect.objectContaining({ allowSharedLinks: false, allowOnlyOne: false }),
        }),
      }),
    });
  });

  it('creates a custom snapshot without reactivating unsupported short-video controls', () => {
    const updateState = vi.fn();
    render(<ProfilesScreen state={makeState()} updateState={updateState} navigate={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Eigenes Profil' }));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Arbeit' } });
    fireEvent.change(screen.getByLabelText('Beschreibung'), { target: { value: 'Mein Arbeitsprofil' } });
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    const update = updateState.mock.calls[0][0];
    const custom = update.profiles.find((profile: { name: string }) => profile.name === 'Arbeit');
    expect(custom.appsConfig.instagram.reelsProtection.enabled).toBe(false);
    expect(custom.appsConfig.instagram.singleContent.allowOnlyOne).toBe(false);
    expect(custom.appsConfig.instagram.mode).toBe('standard');
  });
});
