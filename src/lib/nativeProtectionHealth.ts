import type { NativeProtectionStatus } from './nativeProtection';

export type NativeProtectionHealthTone = 'positive' | 'warning' | 'neutral';

export interface NativeProtectionHealthPresentation {
  badge: string;
  title: string;
  message: string;
  tone: NativeProtectionHealthTone;
  showLastStop: boolean;
}

const USER_STOP_CODES = new Set([
  'manual_app_stop',
  'notification_action_stop',
  'migration_recovery',
  'factory_reset',
]);

export const describeNativeProtectionHealth = (
  status: NativeProtectionStatus | null,
): NativeProtectionHealthPresentation => {
  if (!status) {
    return {
      badge: 'UNGEPRÜFT',
      title: 'Android-Status noch nicht gelesen',
      message: 'Tippe auf „Status neu prüfen“, um den tatsächlichen Dienstzustand zu laden.',
      tone: 'neutral',
      showLastStop: false,
    };
  }

  switch (status.health) {
    case 'active':
      return {
        badge: 'AKTIV',
        title: 'Android-Schutz läuft',
        message: 'Der sichtbare Hintergrunddienst ist aktiv und die gespeicherte Aktivierung stimmt damit überein.',
        tone: 'positive',
        showLastStop: false,
      };
    case 'running-without-activation':
      return {
        badge: 'INKONSISTENT',
        title: 'Dienst läuft ohne gespeicherte Aktivierung',
        message:
          'Stoppe den Schutzdienst und starte ihn anschließend erneut. So werden Dienst und gespeicherter Status wieder abgeglichen.',
        tone: 'warning',
        showLastStop: status.lastStopAt > 0,
      };
    case 'unclean-process-stop':
      return {
        badge: 'PROZESS ABGEBROCHEN',
        title: 'Schutzprozess endete ohne sauberen Stopp',
        message:
          'Der letzte bestätigte Dienststart ist neuer als jeder gespeicherte Stopp, obwohl der Dienst nicht mehr läuft. Das deutet auf einen Prozessabbruch oder System-Kill hin. Prüfe die Android-Zugriffe und starte den Schutz erneut.',
        tone: 'warning',
        showLastStop: false,
      };
    case 'stale-activation':
      return {
        badge: 'NEUSTART NÖTIG',
        title: 'Schutz ist gespeichert, aber der Dienst läuft nicht',
        message:
          status.lastStopMessage ||
          'Android hat den Schutzdienst beendet oder nicht wiederhergestellt. Prüfe die Berechtigungen und starte den Schutz erneut.',
        tone: 'warning',
        showLastStop: status.lastStopAt > 0,
      };
    case 'stopped-with-reason': {
      const userInitiated = USER_STOP_CODES.has(status.lastStopCode);
      return {
        badge: userInitiated ? 'GESTOPPT' : 'PRÜFEN',
        title: userInitiated ? 'Android-Schutz wurde bewusst beendet' : 'Android-Schutz wurde beendet',
        message:
          status.lastStopMessage ||
          (userInitiated
            ? 'Der Schutz kann nach Prüfung der App-Auswahl wieder gestartet werden.'
            : 'Prüfe den letzten Stoppcode und die erforderlichen Android-Zugriffe.'),
        tone: userInitiated ? 'neutral' : 'warning',
        showLastStop: true,
      };
    }
    case 'stopped-without-reason':
      return {
        badge: 'PRÜFEN',
        title: 'Schutzdienst läuft nicht',
        message:
          'Es existiert ein früherer Start, aber kein verlässlicher Stoppgrund. Prüfe die Berechtigungen und starte den Schutz erneut.',
        tone: 'warning',
        showLastStop: false,
      };
    case 'never-started':
    default:
      return {
        badge: 'NOCH NICHT AKTIV',
        title: 'Android-Schutz wurde noch nicht gestartet',
        message: 'Erteile die erforderlichen Zugriffe, wähle mindestens eine App und starte anschließend den Schutzdienst.',
        tone: 'neutral',
        showLastStop: false,
      };
  }
};

export const formatNativeLifecycleTime = (timestamp: number): string =>
  timestamp > 0 ? new Date(timestamp).toLocaleString() : 'Nicht vorhanden';
