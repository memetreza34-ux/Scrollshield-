import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';
import { AppState, DEFAULT_APP_CONFIG, DEFAULT_STATE, FocusSession } from '../types';
import { setLanguage } from '../i18n';
import { Focus } from './FocusScreens';

afterEach(() => setLanguage('de'));

const withApps = (overrides: Partial<AppState> = {}): AppState => ({
  ...DEFAULT_STATE,
  hasCompletedOnboarding: true,
  appsConfig: {
    instagram: { ...DEFAULT_APP_CONFIG, id: 'instagram', active: true },
    tiktok: { ...DEFAULT_APP_CONFIG, id: 'tiktok', active: true },
  },
  ...overrides,
});

const session = (overrides: Partial<FocusSession> = {}): FocusSession => ({
  id: 'f1',
  startTime: Date.now() - 10 * 60_000,
  endTime: null,
  duration: 30,
  successful: false,
  protectedApps: ['instagram', 'tiktok'],
  blocksTriggered: 0,
  kind: 'focus',
  ...overrides,
});

describe('Focus', () => {
  it('starts a focus for the chosen apps only', () => {
    const updateState = vi.fn();
    render(<Focus state={withApps()} updateState={updateState} navigate={vi.fn()} />);

    fireEvent.click(screen.getByRole('switch', { name: 'Instagram während des Fokus sperren' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fokus starten · 30 Min.' }));

    const update = updateState.mock.calls[0][0];
    expect(update.isFocusModeActive).toBe(true);
    expect(update.focusSessions[0]).toMatchObject({ duration: 30, protectedApps: ['tiktok'], kind: 'focus' });
  });

  it('sends free users to the paywall for a custom duration and strict focus', () => {
    const updateState = vi.fn();
    const navigate = vi.fn();
    render(<Focus state={withApps()} updateState={updateState} navigate={navigate} />);

    fireEvent.click(screen.getByRole('radio', { name: /Eigene/ }));

    expect(navigate).toHaveBeenCalledWith('paywall');
    expect(updateState).toHaveBeenCalledWith({ paywallReason: 'Eine eigene Fokus-Dauer gehört zu Pro.' });
  });

  it('cannot start while Android lacks a required permission', () => {
    render(
      <Focus
        state={withApps({
          operatingSystem: 'android',
          permissions: { ...DEFAULT_STATE.permissions, usageAccess: true },
        })}
        updateState={vi.fn()}
        navigate={vi.fn()}
      />,
    );

    expect(screen.getByText('„Über anderen Apps einblenden“ fehlt.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fokus starten/ })).toBeDisabled();
  });

  it('asks before ending a running focus early', () => {
    const updateState = vi.fn();
    render(
      <Focus
        state={withApps({ isFocusModeActive: true, focusSessions: [session()] })}
        updateState={updateState}
        navigate={vi.fn()}
      />,
    );

    expect(screen.getByRole('timer')).toHaveTextContent(/^20:00|19:59$/);
    fireEvent.click(screen.getByRole('button', { name: 'Fokus beenden' }));
    expect(screen.getByRole('dialog', { name: 'Fokus beenden?' })).toHaveTextContent('Instagram und TikTok');
    expect(updateState).not.toHaveBeenCalled();
  });

  it('shows a short summary when a focus runs out on this tab', () => {
    const running = withApps({ isFocusModeActive: true, focusSessions: [session()] });
    const { rerender } = render(<Focus state={running} updateState={vi.fn()} navigate={vi.fn()} />);

    const end = Date.now();
    act(() =>
      rerender(
        <Focus
          state={{ ...running, isFocusModeActive: false, focusSessions: [session({ endTime: end, successful: true })] }}
          updateState={vi.fn()}
          navigate={vi.fn()}
        />,
      ),
    );

    expect(screen.getByRole('heading', { name: 'Fokus beendet' })).toBeInTheDocument();
    expect(screen.getByText('30 Min. Fokus · 0 Öffnungsversuche unterbrochen')).toBeInTheDocument();
  });

  it('speaks English on an English phone', () => {
    setLanguage('en');
    render(<Focus state={withApps()} updateState={vi.fn()} navigate={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Start focus · 30 min' })).toBeInTheDocument();
  });

  it('has no obvious accessibility violations', async () => {
    const { container } = render(<Focus state={withApps()} updateState={vi.fn()} navigate={vi.fn()} />);
    await expectNoA11yViolations(container);
  });
});
