import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { NativeProtectionStatus } from '../lib/nativeProtection';
import { NativeProtectionStatusPanel } from './NativeProtectionStatusPanel';

const makeStatus = (updates: Partial<NativeProtectionStatus> = {}): NativeProtectionStatus => ({
  running: false,
  enabled: false,
  unavailableAppIds: [],
  lastStartAt: 0,
  lastStopAt: 0,
  lastStopCode: '',
  lastStopMessage: '',
  health: 'never-started',
  ...updates,
});

describe('NativeProtectionStatusPanel', () => {
  it('shows stale activation with exact stop diagnostics and restart action', () => {
    const onToggle = vi.fn();
    render(
      <NativeProtectionStatusPanel
        status={makeStatus({
          enabled: true,
          health: 'stale-activation',
          lastStopAt: new Date('2026-08-07T03:20:00Z').getTime(),
          lastStopCode: 'notifications_missing',
          lastStopMessage: 'Benachrichtigungen wurden entzogen',
        })}
        busy={false}
        onToggle={onToggle}
      />,
    );

    expect(screen.getByText('NEUSTART NÖTIG')).toBeInTheDocument();
    expect(screen.getByText('Schutz ist gespeichert, aber der Dienst läuft nicht')).toBeInTheDocument();
    expect(screen.getByText('Benachrichtigungen wurden entzogen')).toBeInTheDocument();
    expect(screen.getByText('notifications_missing')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Schutzdienst starten' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('shows active state and a stop action', () => {
    render(
      <NativeProtectionStatusPanel
        status={makeStatus({ running: true, enabled: true, health: 'active' })}
        busy={false}
        onToggle={vi.fn()}
      />,
    );

    expect(screen.getByText('AKTIV')).toBeInTheDocument();
    expect(screen.getByText('Android-Schutz läuft')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Schutzdienst stoppen' })).toBeInTheDocument();
  });

  it('blocks the in-app stop action while commitment is active but keeps status visible', () => {
    const onToggle = vi.fn();
    render(
      <NativeProtectionStatusPanel
        status={makeStatus({ running: true, enabled: true, health: 'active' })}
        busy={false}
        onToggle={onToggle}
        stopLocked
        stopLockedMessage="Regeln sind bis zum Commitment-Ende eingefroren."
      />,
    );

    expect(screen.getByText('AKTIV')).toBeInTheDocument();
    expect(screen.getByText('Regeln sind bis zum Commitment-Ende eingefroren.')).toBeInTheDocument();
    const stopButton = screen.getByRole('button', { name: 'Stop während Commitment gesperrt' });
    expect(stopButton).toBeDisabled();
    fireEvent.click(stopButton);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('still permits restarting a stopped service during commitment recovery', () => {
    const onToggle = vi.fn();
    render(
      <NativeProtectionStatusPanel
        status={makeStatus({ enabled: true, running: false, health: 'stale-activation' })}
        busy={false}
        onToggle={onToggle}
        stopLocked
      />,
    );

    const startButton = screen.getByRole('button', { name: 'Schutzdienst starten' });
    expect(startButton).toBeEnabled();
    fireEvent.click(startButton);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('keeps deliberate manual stops neutral but visible', () => {
    render(
      <NativeProtectionStatusPanel
        status={makeStatus({
          health: 'stopped-with-reason',
          lastStopAt: 1_786_000_000_000,
          lastStopCode: 'manual_app_stop',
          lastStopMessage: 'Der Android-Schutz wurde manuell gestoppt',
        })}
        busy={false}
        onToggle={vi.fn()}
      />,
    );

    expect(screen.getByText('GESTOPPT')).toBeInTheDocument();
    expect(screen.getByText('Der Android-Schutz wurde manuell gestoppt')).toBeInTheDocument();
  });
});
