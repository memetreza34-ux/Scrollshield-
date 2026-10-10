import { describe, expect, it } from 'vitest';
import type { PermissionStatus } from './nativeBridge';
import { getProtectionHealth } from './protectionHealth';

const granted: PermissionStatus = {
  usageStats: true,
  overlay: true,
  notifications: false, // Optional: notification permission must not falsely stop protection.
  monitoringActive: true,
  accessibility: false, // V1 does not depend on AccessibilityService.
};

describe('live protection status on Heute', () => {
  it('does not claim protection when no apps were selected', () => {
    expect(getProtectionHealth(0, true, granted)).toMatchObject({
      label: 'Kein Schutz aktiv',
      destination: 'protect',
      operating: false,
    });
  });

  it('never reports a native protection service in a browser preview', () => {
    expect(getProtectionHealth(2, false, granted)).toMatchObject({
      label: 'Nur Vorschau – kein Android-Schutz',
      operating: false,
    });
  });

  it('does not trust cached permissions before an actual native response arrives', () => {
    expect(getProtectionHealth(2, true, null)).toMatchObject({
      label: 'Schutzstatus wird geprüft',
      operating: false,
    });
  });

  it('degrades safely when the native bridge fails', () => {
    expect(getProtectionHealth(1, true, 'unavailable')).toMatchObject({
      label: 'Schutzstatus nicht verfügbar',
      destination: 'settings',
      operating: false,
    });
  });

  it.each(['usageStats', 'overlay'] as const)('recognizes missing %s permission', (permission) => {
    expect(getProtectionHealth(1, true, { ...granted, [permission]: false })).toMatchObject({
      label: 'Schutz eingeschränkt – Berechtigung fehlt',
      destination: 'permissions',
      operating: false,
    });
  });

  it('reports a stopped service even when the OS permissions are granted', () => {
    expect(getProtectionHealth(2, true, { ...granted, monitoringActive: false })).toMatchObject({
      label: 'Schutzdienst gestoppt',
      destination: 'settings',
      operating: false,
    });
  });

  it('reports running only when Android says the service and permissions are present', () => {
    expect(getProtectionHealth(2, true, granted)).toMatchObject({
      label: 'Schutzdienst läuft',
      destination: 'protect',
      operating: true,
    });
  });
});
