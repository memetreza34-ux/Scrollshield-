import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';
import { AppState, DEFAULT_APP_CONFIG, DEFAULT_STATE } from '../types';
import { Focus } from './FocusScreens';

const withApps = (overrides: Partial<AppState> = {}): AppState => ({
  ...DEFAULT_STATE,
  hasCompletedOnboarding: true,
  appsConfig: {
    instagram: { ...DEFAULT_APP_CONFIG, id: 'instagram', active: true },
    tiktok: { ...DEFAULT_APP_CONFIG, id: 'tiktok', active: true },
  },
  ...overrides,
});

describe('Focus', () => {
  it('starts a focus for the chosen apps only', () => {
    const updateState = vi.fn();
    render(<Focus state={withApps()} updateState={updateState} navigate={vi.fn()} />);

    fireEvent.click(screen.getByRole('switch', { name: 'Instagram während des Fokus sperren' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fokus starten' }));

    const update = updateState.mock.calls[0][0];
    expect(update.isFocusModeActive).toBe(true);
    expect(update.focusSessions[0]).toMatchObject({ duration: 30, protectedApps: ['tiktok'], kind: 'focus' });
  });

  it('sends free users to the paywall for a custom duration and strict focus', () => {
    const updateState = vi.fn();
    const navigate = vi.fn();
    render(<Focus state={withApps()} updateState={updateState} navigate={navigate} />);

    fireEvent.click(screen.getByRole('radio', { name: /45 Min\./ }));

    expect(navigate).toHaveBeenCalledWith('paywall');
    expect(updateState).toHaveBeenCalledWith({ paywallReason: 'Eine eigene Fokus-Dauer gehört zu Pro.' });
  });

  it('has no obvious accessibility violations', async () => {
    const { container } = render(<Focus state={withApps()} updateState={vi.fn()} navigate={vi.fn()} />);
    await expectNoA11yViolations(container);
  });
});
