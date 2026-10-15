import { act, fireEvent, render, screen } from '@testing-library/react';
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

    expect(screen.getByText(/^Zeitplan „Abend“ bis \d\d:00\.$/)).toBeInTheDocument();
  });

  it('offers no emergency unlock during a self-commitment', () => {
    renderFlow({
      appsConfig: { instagram: instagram({ mode: 'strict' }) },
      commitment: { until: Date.now() + 60 * 60_000 },
    });

    expect(screen.queryByRole('button', { name: 'Notfallfreigabe' })).toBeNull();
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

    expect(screen.queryByText('Gesperrt · Fokus')).toBeNull();
  });

  it('makes the pause longer with every reopen', () => {
    // 12 s pause, three openings in the last 10 minutes, 10 s more each.
    renderFlow({
      appsConfig: { instagram: instagram({ mode: 'standard', openDelay: 12 }) },
      history: recentOpens(3),
    });

    expect(screen.getAllByText('Längere Pause').length).toBeGreaterThan(0);
    expect(screen.getByRole('timer')).toHaveTextContent('42');
    expect(screen.getByRole('button', { name: 'Weiter in 42 s' })).toBeDisabled();
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

    expect(screen.getByText('Dein Tagesbudget für Instagram ist aufgebraucht.')).toBeInTheDocument();
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

    expect(screen.getByText('Du hast Instagram in 30 Minuten 3× geöffnet.')).toBeInTheDocument();
  });

  it('unlocks in an emergency only after a reason and a wait', () => {
    vi.useFakeTimers();
    const hour = new Date().getHours();
    renderFlow({
      appsConfig: { instagram: instagram() },
      schedules: [
        { id: 's', name: 'Abend', startHour: hour, endHour: (hour + 1) % 24, appIds: ['instagram'], active: true },
      ],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Notfallfreigabe' }));
    expect(screen.getByRole('button', { name: 'Weiter' })).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: 'Nachricht' }));
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));

    expect(screen.getByText('Gleich ist Instagram 5 Minuten frei.')).toBeInTheDocument();
    for (let second = 0; second <= 10; second++) act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole('button', { name: 'Instagram öffnen' })).toBeInTheDocument();
    vi.useRealTimers();
  });
});
