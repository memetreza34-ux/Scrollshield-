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
  it('names the schedule that locks the app', () => {
    const hour = new Date().getHours();
    renderFlow({
      appsConfig: { instagram: instagram() },
      schedules: [
        { id: 's', name: 'Abend', startHour: hour, endHour: (hour + 1) % 24, appIds: ['instagram'], active: true },
      ],
    });

    expect(screen.getByText(/im Zeitplan „Abend“ gesperrt/)).toBeInTheDocument();
  });

  it('offers no emergency unlock during a self-commitment', () => {
    renderFlow({
      appsConfig: { instagram: instagram({ mode: 'strict' }) },
      commitment: { until: Date.now() + 60 * 60_000 },
    });

    expect(screen.queryByRole('button', { name: 'Notfallfreigabe anfordern' })).toBeNull();
  });

  it('locks only the apps the running focus chose', () => {
    const session = {
      id: 'f',
      startTime: Date.now(),
      endTime: null,
      duration: 30,
      successful: false,
      protectedApps: ['tiktok'],
      blocksTriggered: 0,
    };
    renderFlow({
      appsConfig: { instagram: instagram({ mode: 'standard', openDelay: 7 }) },
      isFocusModeActive: true,
      focusSessions: [session],
    });

    expect(screen.queryByText('Blockiert')).toBeNull();
  });

  it('makes the pause longer with every reopen', () => {
    // 12 s pause, three openings in the last 10 minutes, 10 s more each.
    renderFlow({
      appsConfig: { instagram: instagram({ mode: 'standard', openDelay: 12 }) },
      history: recentOpens(3),
    });

    fireEvent.click(screen.getByRole('button', { name: 'Trotzdem weiter' }));

    expect(screen.getByText('42')).toBeInTheDocument();
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
      appsConfig: {
        instagram: instagram({
          antiBinge: {
            enabled: true,
            warningThreshold: 1,
            warningTimeframe: 10,
            blockThreshold: 3,
            blockTimeframe: 30,
          },
        }),
      },
      history: recentOpens(3),
    });

    expect(screen.getByText(/in den letzten 30 Minuten zu oft geöffnet/)).toBeInTheDocument();
  });
});
