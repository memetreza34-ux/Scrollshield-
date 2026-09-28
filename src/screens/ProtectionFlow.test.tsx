import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { getLocalDateKey } from '../lib/appUtils';
import { AppConfig, AppState, DEFAULT_APP_CONFIG, DEFAULT_STATE, HistoryEvent } from '../types';
import { ProtectionFlow } from './ProtectionFlow';

const instagram = (overrides: Partial<AppConfig> = {}): AppConfig => ({
  id: 'instagram',
  ...DEFAULT_APP_CONFIG,
  active: true,
  ...overrides,
});

const renderFlow = (state: Partial<AppState>) =>
  render(
    <ProtectionFlow
      state={{ ...DEFAULT_STATE, simulatedAppToOpen: 'instagram', ...state }}
      updateState={vi.fn()}
      navigate={vi.fn()}
    />,
  );

const recentOpens = (count: number): HistoryEvent[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `open-${index}`,
    timestamp: Date.now() - index * 60_000,
    type: 'open',
    appId: 'instagram',
    desc: 'App geöffnet',
  }));

describe('ProtectionFlow', () => {
  it('keeps the opening delay after the anti-binge warning', () => {
    renderFlow({
      appsConfig: { instagram: instagram({ mode: 'standard', openDelay: 12 }) },
      history: recentOpens(3),
    });

    fireEvent.click(screen.getByRole('button', { name: 'Trotzdem weiter' }));

    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Trotzdem öffnen' })).toBeDisabled();
  });

  it('names the daily limit as the reason, not too many openings', () => {
    renderFlow({
      appsConfig: { instagram: instagram({ dailyLimit: 20 }) },
      dailyStats: {
        [getLocalDateKey(new Date())]: {
          date: getLocalDateKey(new Date()),
          usageMinutes: { instagram: 25 },
          blockedOpens: 0,
          savedTimeMinutes: 0,
          emergencyUnlocks: 0,
          focusMinutes: 0,
        },
      },
    });

    expect(screen.getByText(/Tageslimit für Instagram ist für heute aufgebraucht/)).toBeInTheDocument();
    expect(screen.queryByText(/zu oft geöffnet/)).not.toBeInTheDocument();
  });

  it('explains an anti-binge lock with the openings', () => {
    renderFlow({
      appsConfig: { instagram: instagram() },
      history: recentOpens(5),
    });

    expect(screen.getByText(/in den letzten 20 Minuten zu oft geöffnet/)).toBeInTheDocument();
  });
});
