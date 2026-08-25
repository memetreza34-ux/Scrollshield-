import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { NativeProtectionStatus } from '../lib/nativeProtection';
import { NativeProtectionStatusPanel } from './NativeProtectionStatusPanel';

const makeStatus = (updates: Partial<NativeProtectionStatus> = {}): NativeProtectionStatus => ({
  running: false,
  enabled: false,
  unavailableAppIds: [],
  lastStartRequestAt: 0,
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

  it('blocks duplicate starts while a fresh start request is awaiting confirmation', () => {
    const onToggle = vi.fn();
    render(
      <NativeProtectionStatusPanel
        status={makeStatus({
          enabled: true,
          lastStartRequestAt: 300,
          health: 'start-pending',
        })}
        busy={false}
        onToggle={onToggle}
      />,
    );

    expect(screen.getByText('STARTET')).toBeInTheDocument();
    const pendingButton = screen.getByRole('button', { name: 'Start wird bestätigt…' });
    expect(pendingButton).toBeDisabled();
    fireEvent.click(pendingButton);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('offers a normal retry after an unconfirmed start was interrupted', () => {
    const onToggle = vi.fn();
    render(
      <NativeProtectionStatusPanel
        status={makeStatus({
          enabled: true,
          lastStartRequestAt: 300,
          lastStartAt: 100,
          lastStopAt: 200,
          health: 'start-interrupted',
        })}
        busy={false}
        onToggle={onToggle}
      />,
    );

    expect(screen.getByText('START ABGEBROCHEN')).toBeInTheDocument();
    const retryButton = screen.getByRole('button', { name: 'Schutz erneut starten' });
    expect(retryButton).toBeEnabled();
    fireEvent.click(retryButton);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('offers a dedicated recovery action after an unclean process stop', () => {
    const onToggle = vi.fn();
    render(
      <NativeProtectionStatusPanel
        status={makeStatus({
          enabled: true,
          running: false,
          lastStartRequestAt: 150,
          lastStartAt: 200,
          lastStopAt: 100,
          health: 'unclean-process-stop',
        })}
        busy={false}
        onToggle={onToggle}
      />,
    );

    expect(screen.getByText('PROZESS ABGEBROCHEN')).toBeInTheDocument();
    const recoveryButton = screen.getByRole('button', { name: 'Schutz wiederherstellen' });
    expect(recoveryButton).toBeEnabled();
    fireEvent.click(recoveryButton);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('shows a dedicated busy label while process-loss recovery is running', () => {
    render(
      <NativeProtectionStatusPanel
        status={makeStatus({ enabled: true, health: 'unclean-process-stop' })}
        busy
        onToggle={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Wiederherstellung läuft…' })).toBeDisabled();
  });

  it('shows a persistent target-app blocker after recovery finds no installed active target', () => {
    render(
      <NativeProtectionStatusPanel
        status={makeStatus({
          health: 'stopped-with-reason',
          lastStopAt: 300,
          lastStopCode: 'target_app_missing',
          lastStopMessage: 'Keine aktive installierte Ziel-App ist mehr verfügbar',
          unavailableAppIds: ['instagram'],
        })}
        busy={false}
        onToggle={vi.fn()}
      />,
    );

    expect(screen.getByText('ZIEL-APP FEHLT')).toBeInTheDocument();
    expect(screen.getByText('Keine installierte Ziel-App verfügbar')).toBeInTheDocument();
    expect(screen.getByText(/mindestens eine installierte App/)).toBeInTheDocument();
    expect(screen.getByText('target_app_missing')).toBeInTheDocument();
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
