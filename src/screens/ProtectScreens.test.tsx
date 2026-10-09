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

  it('does not spend Free slots on unsupported imported apps', () => {
    const updateState = vi.fn();
    const navigate = vi.fn();
    const imported = state({
      appsConfig: {
        legacy: { ...DEFAULT_APP_CONFIG, id: 'legacy', active: true },
        instagram: { ...DEFAULT_APP_CONFIG, id: 'instagram', active: true },
      },
    });

    render(<ProtectScreen state={imported} updateState={updateState} navigate={navigate} />);
    fireEvent.click(screen.getByRole('switch', { name: 'TikTok schützen' }));

    expect(navigate).not.toHaveBeenCalledWith('paywall');
    expect(updateState.mock.calls[0][0].appsConfig.tiktok.active).toBe(true);
  });

  it('does not show an imported third Free app as protected when native enforcement excludes it', () => {
    const imported = state({
      appsConfig: {
        instagram: { ...DEFAULT_APP_CONFIG, id: 'instagram', active: true },
        tiktok: { ...DEFAULT_APP_CONFIG, id: 'tiktok', active: true },
        youtube: { ...DEFAULT_APP_CONFIG, id: 'youtube', active: true },
      },
    });

    render(<ProtectScreen state={imported} updateState={vi.fn()} navigate={vi.fn()} />);
    expect(screen.getByRole('switch', { name: 'YouTube schützen' })).not.toBeChecked();
    expect(screen.getByText(/wegen des kostenlosen Limits derzeit nicht geschützt/)).toBeInTheDocument();
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

  it('explains when a stored Pro preset is not actually enforced on Android', () => {
    const imported = state({
      selectedAppId: 'instagram',
      appsConfig: {
        instagram: { ...DEFAULT_APP_CONFIG, id: 'instagram', active: true, preset: 'stark', openDelay: 60 },
      },
    });

    render(<AppDetailScreen state={imported} updateState={vi.fn()} navigate={vi.fn()} />);
    expect(screen.getByText(/Auf Android gilt „Ausgewogen“/)).toBeInTheDocument();
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
