import { describe, expect, it } from 'vitest';
import type { NativeProtectionStatus } from './nativeProtection';
import { describeNativeProtectionHealth } from './nativeProtectionHealth';

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

describe('describeNativeProtectionHealth', () => {
  it('shows an explicit warning for stale native activation', () => {
    const presentation = describeNativeProtectionHealth(
      makeStatus({
        enabled: true,
        health: 'stale-activation',
        lastStopAt: 1_786_000_000_000,
        lastStopCode: 'notifications_missing',
        lastStopMessage: 'Benachrichtigungen wurden entzogen',
      }),
    );

    expect(presentation.badge).toBe('NEUSTART NÖTIG');
    expect(presentation.title).toContain('Dienst läuft nicht');
    expect(presentation.message).toBe('Benachrichtigungen wurden entzogen');
    expect(presentation.tone).toBe('warning');
    expect(presentation.showLastStop).toBe(true);
  });

  it('explains an unclean process stop without trusting an older stop record', () => {
    const presentation = describeNativeProtectionHealth(
      makeStatus({
        enabled: true,
        health: 'unclean-process-stop',
        lastStartAt: 1_786_000_200_000,
        lastStopAt: 1_786_000_100_000,
        lastStopCode: 'manual_app_stop',
        lastStopMessage: 'Dieser Stopp gehört zu einer älteren Dienstinstanz',
      }),
    );

    expect(presentation.badge).toBe('PROZESS ABGEBROCHEN');
    expect(presentation.title).toContain('ohne sauberen Stopp');
    expect(presentation.message).toContain('letzte bestätigte Dienststart');
    expect(presentation.message).toContain('System-Kill');
    expect(presentation.message).toContain('Schutz wiederherstellen');
    expect(presentation.tone).toBe('warning');
    expect(presentation.showLastStop).toBe(false);
  });

  it('keeps deliberate user stops neutral', () => {
    const presentation = describeNativeProtectionHealth(
      makeStatus({
        health: 'stopped-with-reason',
        lastStopAt: 1_786_000_000_000,
        lastStopCode: 'manual_app_stop',
        lastStopMessage: 'Der Android-Schutz wurde manuell gestoppt',
      }),
    );

    expect(presentation.badge).toBe('GESTOPPT');
    expect(presentation.tone).toBe('neutral');
    expect(presentation.showLastStop).toBe(true);
  });

  it('treats the persistent notification stop action as deliberate', () => {
    const presentation = describeNativeProtectionHealth(
      makeStatus({
        health: 'stopped-with-reason',
        lastStopAt: 1_786_000_000_000,
        lastStopCode: 'notification_action_stop',
        lastStopMessage: 'Der Android-Schutz wurde über die Dauerbenachrichtigung manuell gestoppt',
      }),
    );

    expect(presentation.badge).toBe('GESTOPPT');
    expect(presentation.tone).toBe('neutral');
    expect(presentation.message).toContain('Dauerbenachrichtigung');
  });

  it('treats a complete app factory reset as a deliberate stop', () => {
    const presentation = describeNativeProtectionHealth(
      makeStatus({
        health: 'stopped-with-reason',
        lastStopAt: 1_786_000_000_000,
        lastStopCode: 'factory_reset',
        lastStopMessage: 'Der Android-Schutz wurde wegen eines vollständigen ScrollShield-Resets beendet',
      }),
    );

    expect(presentation.badge).toBe('GESTOPPT');
    expect(presentation.tone).toBe('neutral');
    expect(presentation.message).toContain('ScrollShield-Resets');
  });

  it('marks permission and system stops as requiring attention', () => {
    const presentation = describeNativeProtectionHealth(
      makeStatus({
        health: 'stopped-with-reason',
        lastStopAt: 1_786_000_000_000,
        lastStopCode: 'usage_access_missing',
        lastStopMessage: 'Nutzungszugriff wurde entzogen',
      }),
    );

    expect(presentation.badge).toBe('PRÜFEN');
    expect(presentation.tone).toBe('warning');
    expect(presentation.message).toContain('Nutzungszugriff');
  });

  it('marks unexpected service destruction as requiring attention', () => {
    const presentation = describeNativeProtectionHealth(
      makeStatus({
        health: 'stopped-with-reason',
        lastStopAt: 1_786_000_000_000,
        lastStopCode: 'unexpected_service_destroy',
        lastStopMessage: 'Android hat den Schutzdienst unerwartet beendet',
      }),
    );

    expect(presentation.badge).toBe('PRÜFEN');
    expect(presentation.tone).toBe('warning');
    expect(presentation.message).toContain('unerwartet beendet');
  });

  it('distinguishes a running service without saved activation', () => {
    const presentation = describeNativeProtectionHealth(
      makeStatus({ running: true, health: 'running-without-activation' }),
    );

    expect(presentation.badge).toBe('INKONSISTENT');
    expect(presentation.message).toContain('Stoppe den Schutzdienst');
  });

  it('shows an unverified state before Android status is loaded', () => {
    expect(describeNativeProtectionHealth(null)).toMatchObject({
      badge: 'UNGEPRÜFT',
      tone: 'neutral',
      showLastStop: false,
    });
  });
});