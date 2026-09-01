import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createCommitmentLock } from '../lib/commitmentLock';
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

const makeAndroidState = () => ({
  ...makeState(),
  operatingSystem: 'android' as const,
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

  it('requires an explicit second confirmation before starting commitment', async () => {
    const onStartCommitment = vi.fn(async () => ({ ok: true as const }));
    render(
      <ProfilesScreen
        state={makeAndroidState()}
        updateState={vi.fn()}
        navigate={vi.fn()}
        onStartCommitment={onStartCommitment}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '1 Stunde' }));
    expect(onStartCommitment).not.toHaveBeenCalled();
    expect(screen.getByText(/1 Stunde verbindlich einfrieren/)).toBeInTheDocument();
    expect(
      screen.getByText(/Ziel-App wirklich installiert ist und der Android-Schutzdienst tatsächlich läuft/),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Verbindlich starten' }));
    await waitFor(() => expect(onStartCommitment).toHaveBeenCalledWith(60));
  });

  it('does not offer commitment activation in the iOS preview', () => {
    render(<ProfilesScreen state={makeState()} updateState={vi.fn()} navigate={vi.fn()} />);

    expect(screen.getByText(/nur mit dem nativen Android-Schutz verfügbar/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '1 Stunde' })).not.toBeInTheDocument();
  });

  it('requires at least one active app before offering commitment', () => {
    const navigate = vi.fn();
    render(
      <ProfilesScreen state={{ ...makeAndroidState(), appsConfig: {} }} updateState={vi.fn()} navigate={navigate} />,
    );

    expect(screen.getByText(/Aktiviere zuerst mindestens eine App/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '1 Stunde' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Apps auswählen' }));
    expect(navigate).toHaveBeenCalledWith('apps');
  });

  it('shows an actionable native readiness failure without activating commitment', async () => {
    const navigate = vi.fn();
    const onStartCommitment = vi.fn(async () => ({
      ok: false as const,
      code: 'service_not_running' as const,
      message: 'Starte zuerst den Android-Schutzdienst. Commitment wurde nicht aktiviert.',
      action: 'permissions' as const,
    }));

    render(
      <ProfilesScreen
        state={makeAndroidState()}
        updateState={vi.fn()}
        navigate={navigate}
        onStartCommitment={onStartCommitment}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '8 Stunden' }));
    fireEvent.click(screen.getByRole('button', { name: 'Verbindlich starten' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Starte zuerst den Android-Schutzdienst/);
    fireEvent.click(screen.getByRole('button', { name: 'Schutzstatus öffnen' }));
    expect(navigate).toHaveBeenCalledWith('permissions');
  });

  it('makes profile configuration read-only while commitment is active', () => {
    const lock = createCommitmentLock(480, Date.now());
    render(
      <ProfilesScreen
        state={makeAndroidState()}
        updateState={vi.fn()}
        navigate={vi.fn()}
        commitmentLock={lock}
        onStartCommitment={vi.fn(async () => ({ ok: true as const }))}
      />,
    );

    expect(screen.getByText(/Regeln sind eingefroren/i)).toBeInTheDocument();
    expect(screen.getByText(/Berechtigungen und Schutzstatus können weiterhin repariert werden/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Eigenes Profil' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: /Balance/ })).toBeDisabled();
  });
});
