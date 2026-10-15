import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';
import { AppState, DEFAULT_APP_CONFIG, DEFAULT_STATE } from '../types';
import { setLanguage } from '../i18n';
import { AppDetailScreen, CommitmentScreen, ProtectScreen, ScheduleEditScreen } from './ProtectScreens';

afterEach(() => setLanguage('de'));

const state = (overrides: Partial<AppState> = {}): AppState => ({
  ...DEFAULT_STATE,
  hasCompletedOnboarding: true,
  appsConfig: {
    instagram: { ...DEFAULT_APP_CONFIG, id: 'instagram', active: true },
    tiktok: { ...DEFAULT_APP_CONFIG, id: 'tiktok', active: true },
  },
  ...overrides,
});

describe('ProtectScreen', () => {
  it('opens the paywall when a free user wants a third app', () => {
    const updateState = vi.fn();
    const navigate = vi.fn();
    render(<ProtectScreen state={state()} updateState={updateState} navigate={navigate} />);

    expect(screen.getByText('2 von 2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /App schützen/ }));

    expect(navigate).toHaveBeenCalledWith('paywall');
    expect(updateState.mock.calls[0][0].paywallReason).toMatch(/2 Apps/);
  });

  it('lets Pro users protect a third app', () => {
    const updateState = vi.fn();
    render(<ProtectScreen state={state({ pro: { active: true } })} updateState={updateState} navigate={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'App schützen' }));
    fireEvent.click(screen.getByRole('switch', { name: 'YouTube schützen' }));

    expect(updateState.mock.calls[0][0].appsConfig.youtube.active).toBe(true);
  });

  it('keeps apps switched on during a self-commitment', () => {
    const updateState = vi.fn();
    render(
      <ProtectScreen
        state={state({ commitment: { until: Date.now() + 60_000 } })}
        updateState={updateState}
        navigate={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('switch', { name: 'Instagram schützen' }));

    expect(updateState).not.toHaveBeenCalled();
  });

  it('explains schedules when there is none yet', () => {
    render(<ProtectScreen state={state()} updateState={vi.fn()} navigate={vi.fn()} />);

    expect(screen.getByText(/Noch kein Zeitplan/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zeitplan anlegen' })).toBeInTheDocument();
  });

  it('has no obvious accessibility violations', async () => {
    const { container } = render(<ProtectScreen state={state()} updateState={vi.fn()} navigate={vi.fn()} />);
    await expectNoA11yViolations(container);
  });
});

describe('AppDetailScreen', () => {
  it('applies a free preset and sends Stark to the paywall', () => {
    const updateState = vi.fn();
    const navigate = vi.fn();
    render(
      <AppDetailScreen state={state({ selectedAppId: 'instagram' })} updateState={updateState} navigate={navigate} />,
    );

    fireEvent.click(screen.getByRole('radio', { name: 'Sanft' }));
    expect(updateState.mock.calls[0][0].appsConfig.instagram).toMatchObject({ preset: 'sanft', openDelay: 3 });

    fireEvent.click(screen.getByRole('radio', { name: /Stark/ }));
    expect(navigate).toHaveBeenCalledWith('paywall');
  });

  it('offers the feed rule for Instagram but not for Facebook', () => {
    const { unmount } = render(
      <AppDetailScreen state={state({ selectedAppId: 'instagram' })} updateState={vi.fn()} navigate={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: /^Reels/ })).toBeInTheDocument();
    unmount();

    render(
      <AppDetailScreen
        state={state({
          selectedAppId: 'facebook',
          appsConfig: { facebook: { ...DEFAULT_APP_CONFIG, id: 'facebook', active: true } },
        })}
        updateState={vi.fn()}
        navigate={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: /^Reels/ })).toBeNull();
  });

  it('shows the accessibility disclosure when the feed rule is switched on without the service', () => {
    const updateState = vi.fn();
    render(
      <AppDetailScreen
        state={state({ selectedAppId: 'instagram', operatingSystem: 'android' })}
        updateState={updateState}
        navigate={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /^Reels/ }));
    fireEvent.click(screen.getByRole('radio', { name: 'Gesperrt' }));

    expect(updateState.mock.calls[0][0].appsConfig.instagram.reelsProtection).toMatchObject({
      enabled: true,
      mode: 'block',
    });
    expect(screen.getByRole('dialog', { name: 'Bedienungshilfe für den Kurzvideo-Schutz' })).toBeInTheDocument();
    // A real choice: both answers look the same.
    expect(screen.getByRole('button', { name: 'Zustimmen und einschalten' }).className).toBe(
      screen.getByRole('button', { name: 'Nicht jetzt' }).className,
    );
  });

  it('speaks English on an English phone', () => {
    setLanguage('en');
    render(<AppDetailScreen state={state({ selectedAppId: 'instagram' })} updateState={vi.fn()} navigate={vi.fn()} />);

    expect(screen.getByRole('radio', { name: /^Balanced/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Rules' })).toBeInTheDocument();
  });

  it('has no obvious accessibility violations', async () => {
    const { container } = render(
      <AppDetailScreen state={state({ selectedAppId: 'instagram' })} updateState={vi.fn()} navigate={vi.fn()} />,
    );
    await expectNoA11yViolations(container);
  });
});

describe('ScheduleEditScreen', () => {
  const withSchedule = state({
    schedules: [{ id: 's1', name: 'Abend', startHour: 21, endHour: 7, appIds: ['instagram'], active: true }],
    selectedScheduleId: 's1',
  });

  it('says that an evening schedule ends the next morning', () => {
    render(<ScheduleEditScreen state={withSchedule} updateState={vi.fn()} navigate={vi.fn()} />);

    expect(screen.getByText('Endet am nächsten Morgen.')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Instagram im Zeitplan' })).toHaveAttribute('aria-checked', 'true');
  });
});

describe('CommitmentScreen', () => {
  it('asks once more before the commitment is fixed', () => {
    const updateState = vi.fn();
    render(<CommitmentScreen state={state({ pro: { active: true } })} updateState={updateState} navigate={vi.fn()} />);

    fireEvent.click(screen.getByRole('radio', { name: 'Für 24 Stunden' }));
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));

    expect(screen.getByRole('dialog', { name: /festschreiben\?$/ })).toBeInTheDocument();
    expect(updateState).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Festschreiben' }));
    expect(updateState.mock.calls[0][0].commitment.until).toBeGreaterThan(Date.now() + 23 * 60 * 60_000);
  });
});
