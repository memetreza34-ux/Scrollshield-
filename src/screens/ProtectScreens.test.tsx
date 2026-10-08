import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';
import { AppState, DEFAULT_APP_CONFIG, DEFAULT_STATE } from '../types';
import { AppDetailScreen, ProtectScreen } from './ProtectScreens';

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
  it('opens the paywall when a free user switches on a third app', () => {
    const updateState = vi.fn();
    const navigate = vi.fn();
    render(<ProtectScreen state={state()} updateState={updateState} navigate={navigate} />);

    fireEvent.click(screen.getByRole('switch', { name: 'YouTube schützen' }));

    expect(navigate).toHaveBeenCalledWith('paywall');
    expect(updateState.mock.calls[0][0].paywallReason).toMatch(/2 Apps/);
  });

  it('lets Pro users protect a third app', () => {
    const updateState = vi.fn();
    render(<ProtectScreen state={state({ pro: { active: true } })} updateState={updateState} navigate={vi.fn()} />);

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

  it('does not expose research-only feed controls in the production V1 app detail', () => {
    const { rerender } = render(
      <AppDetailScreen state={state({ selectedAppId: 'instagram' })} updateState={vi.fn()} navigate={vi.fn()} />,
    );
    expect(screen.queryByText('Instagram Reels')).toBeNull();

    rerender(
      <AppDetailScreen
        state={state({
          selectedAppId: 'facebook',
          appsConfig: { facebook: { ...DEFAULT_APP_CONFIG, id: 'facebook', active: true } },
        })}
        updateState={vi.fn()}
        navigate={vi.fn()}
      />,
    );
    expect(screen.queryByText('Facebook Reels')).toBeNull();
  });

  it('has no obvious accessibility violations', async () => {
    const { container } = render(
      <AppDetailScreen state={state({ selectedAppId: 'instagram' })} updateState={vi.fn()} navigate={vi.fn()} />,
    );
    await expectNoA11yViolations(container);
  });
});
