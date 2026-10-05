import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { expectNoA11yViolations } from '../test/a11y';
import { DEFAULT_STATE } from '../types';
import { getLocalDateKey } from '../lib/appUtils';
import { Dashboard, History } from './MainScreens';

describe('Dashboard', () => {
  it('shows recorded focus time in the home island', () => {
    const date = getLocalDateKey(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = getLocalDateKey(yesterday);
    render(
      <Dashboard
        state={{
          ...DEFAULT_STATE,
          dailyStats: {
            [yesterdayKey]: {
              date: yesterdayKey,
              usageMinutes: {},
              blockedOpens: 0,
              savedTimeMinutes: 0,
              emergencyUnlocks: 0,
              focusMinutes: 18,
            },
            [date]: {
              date,
              usageMinutes: {},
              blockedOpens: 0,
              savedTimeMinutes: 0,
              emergencyUnlocks: 0,
              focusMinutes: 42,
            },
          },
        }}
        updateState={vi.fn()}
        navigate={vi.fn()}
      />,
    );

    expect(screen.getByRole('region', { name: 'Fokuszeit heute' })).toHaveTextContent('42 Min');
    const chart = screen.getByRole('region', { name: 'Deine Fokuszeit' });
    expect(chart).toHaveTextContent('1 h 0 min');
    fireEvent.click(screen.getByRole('button', { name: /18 Minuten Fokus/ }));
    expect(chart).toHaveTextContent('18 Min Fokus');
  });

  it('opens the protection flow from the quick test action', () => {
    const updateState = vi.fn();
    const navigate = vi.fn();

    render(
      <Dashboard
        state={{ ...DEFAULT_STATE, hasCompletedOnboarding: true }}
        updateState={updateState}
        navigate={navigate}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Unterbrechung ausprobieren' }));

    expect(updateState).toHaveBeenCalledWith({ simulatedAppToOpen: 'instagram' });
    expect(navigate).toHaveBeenCalledWith('protection_flow');
  });

  it('has no obvious accessibility violations', async () => {
    const { container } = render(
      <Dashboard state={{ ...DEFAULT_STATE, hasCompletedOnboarding: true }} updateState={vi.fn()} navigate={vi.fn()} />,
    );

    await expectNoA11yViolations(container);
  });
});

describe('History', () => {
  it('shows measured focus time instead of estimated saved time', () => {
    const date = getLocalDateKey(new Date());
    render(
      <History
        state={{
          ...DEFAULT_STATE,
          dailyStats: {
            [date]: {
              date,
              usageMinutes: {},
              blockedOpens: 1,
              savedTimeMinutes: 5,
              emergencyUnlocks: 0,
              focusMinutes: 42,
            },
          },
        }}
        navigate={vi.fn()}
      />,
    );

    const metrics = screen.getByRole('region', { name: 'Kennzahlen' });
    expect(metrics).toHaveTextContent('42 Min');
    expect(metrics).not.toHaveTextContent('Gesparte Zeit');
  });
});
