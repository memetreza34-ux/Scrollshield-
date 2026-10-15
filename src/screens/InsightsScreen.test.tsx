import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';
import { AppState, DEFAULT_APP_CONFIG, DEFAULT_STATE, HistoryEvent } from '../types';
import { setLanguage } from '../i18n';
import { InsightsScreen } from './InsightsScreen';

afterEach(() => setLanguage('de'));

const androidEvent = (outcome: string, minutesAgo: number, reason = 'ANTI_BINGE'): HistoryEvent => ({
  id: `${outcome}-${minutesAgo}`,
  timestamp: Date.now() - minutesAgo * 60_000,
  type: outcome === 'blocked' ? 'block' : outcome === 'continued' ? 'open' : 'warning',
  appId: 'instagram',
  desc: 'Auf dem Handy gesperrt',
  metadata: { source: 'android', outcome, reason },
});

const state = (overrides: Partial<AppState> = {}): AppState => ({
  ...DEFAULT_STATE,
  hasCompletedOnboarding: true,
  appsConfig: { instagram: { ...DEFAULT_APP_CONFIG, id: 'instagram', active: true } },
  ...overrides,
});

describe('InsightsScreen', () => {
  it('counts today and lists what happened', () => {
    render(
      <InsightsScreen
        state={state({ history: [androidEvent('blocked', 1, 'TIME_WINDOW'), androidEvent('continued', 5)] })}
        updateState={vi.fn()}
        navigate={vi.fn()}
      />,
    );

    expect(screen.getByText('Öffnungsversuche').previousSibling).toHaveTextContent('2');
    expect(screen.getByText('Unterbrechungen').previousSibling).toHaveTextContent('1');
    expect(screen.getByText('Gesperrt (Zeitplan)')).toBeInTheDocument();
    expect(screen.getByText('Nach der Pause geöffnet')).toBeInTheDocument();
  });

  it('explains an empty day instead of showing a wall of zeros', () => {
    render(<InsightsScreen state={state()} updateState={vi.fn()} navigate={vi.fn()} />);

    expect(screen.getByText('Noch nichts passiert heute.')).toBeInTheDocument();
    expect(screen.queryByText('Öffnungsversuche')).not.toBeInTheDocument();
  });

  it('shows free users a calm week preview with a way to Pro', () => {
    const updateState = vi.fn();
    const navigate = vi.fn();
    render(<InsightsScreen state={state()} updateState={updateState} navigate={navigate} />);

    fireEvent.click(screen.getByRole('radio', { name: /Woche/ }));
    expect(screen.getByText('Vorschau ohne echte Werte')).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Pro ansehen' }));
    expect(navigate).toHaveBeenCalledWith('paywall');
  });

  it('compares the week with the week before for Pro', () => {
    render(
      <InsightsScreen
        state={state({ pro: { active: true }, history: [androidEvent('blocked', 1)] })}
        updateState={vi.fn()}
        navigate={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('radio', { name: 'Woche' }));
    expect(screen.getByText('1 mehr als in der Vorwoche')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Unterbrechungen pro Tag' })).toBeInTheDocument();
  });

  it('speaks English on an English phone, events included', () => {
    setLanguage('en');
    render(
      <InsightsScreen
        state={state({ history: [androidEvent('blocked', 1, 'TIME_WINDOW')] })}
        updateState={vi.fn()}
        navigate={vi.fn()}
      />,
    );

    expect(screen.getByText('Blocked (schedule)')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'What happened today' })).toBeInTheDocument();
  });

  it('has no obvious accessibility violations', async () => {
    const { container } = render(
      <InsightsScreen
        state={state({ history: [androidEvent('blocked', 1)] })}
        updateState={vi.fn()}
        navigate={vi.fn()}
      />,
    );
    await expectNoA11yViolations(container);
  });
});
