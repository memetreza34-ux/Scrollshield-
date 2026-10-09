import type { PermissionStatus } from './nativeBridge';

export type LiveProtectionStatus = PermissionStatus | 'unavailable' | null;

export interface ProtectionHealth {
  label: string;
  tone: string;
  destination: 'permissions' | 'protect' | 'settings';
  /** This only means the required permissions and native service were observed, not that every overlay was device-tested. */
  operating: boolean;
}

/**
 * A saved permission toggle is never proof that Android is protecting apps.
 * The dashboard must use a fresh native service/permission observation.
 */
export function getProtectionHealth(
  selectedAppCount: number,
  isNativeAndroid: boolean,
  observed: LiveProtectionStatus,
): ProtectionHealth {
  if (selectedAppCount === 0) {
    return {
      label: 'Kein Schutz aktiv',
      tone: 'text-zinc-400',
      destination: 'protect',
      operating: false,
    };
  }

  if (!isNativeAndroid) {
    return {
      label: 'Nur Vorschau – kein Android-Schutz',
      tone: 'text-zinc-400',
      destination: 'protect',
      operating: false,
    };
  }

  if (observed === null) {
    return {
      label: 'Schutzstatus wird geprüft',
      tone: 'text-zinc-400',
      destination: 'settings',
      operating: false,
    };
  }

  if (observed === 'unavailable') {
    return {
      label: 'Schutzstatus nicht verfügbar',
      tone: 'text-amber-400',
      destination: 'settings',
      operating: false,
    };
  }

  if (!observed.usageStats || !observed.overlay) {
    return {
      label: 'Schutz eingeschränkt – Berechtigung fehlt',
      tone: 'text-amber-400',
      destination: 'permissions',
      operating: false,
    };
  }

  if (!observed.monitoringActive) {
    return {
      label: 'Schutzdienst gestoppt',
      tone: 'text-amber-400',
      destination: 'settings',
      operating: false,
    };
  }

  return {
    label: 'Schutzdienst läuft',
    tone: 'text-emerald-400',
    destination: 'protect',
    operating: true,
  };
}
