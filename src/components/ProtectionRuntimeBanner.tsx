import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldOff } from 'lucide-react';
import { NativeProtection, type NativeProtectionStatus } from '../lib/nativeProtection';
import type { AppState, Screen } from '../types';

export function ProtectionRuntimeBanner({ state, navigate }: { state: AppState; navigate: (screen: Screen) => void }) {
  const nativeAndroid = NativeProtection.isAvailable();
  const [status, setStatus] = useState<NativeProtectionStatus | null>(null);
  const [loading, setLoading] = useState(nativeAndroid);
  const activeConfiguredApps = Object.values(state.appsConfig).filter((config) => config.active).length;

  const refresh = useCallback(async () => {
    if (!nativeAndroid) return;
    try {
      setStatus(await NativeProtection.getStatus());
    } catch (error) {
      console.error('Failed to refresh Android protection status', error);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [nativeAndroid]);

  useEffect(() => {
    if (!nativeAndroid) return;

    void refresh();
    const interval = window.setInterval(() => void refresh(), 5_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [nativeAndroid, refresh]);

  if (state.operatingSystem !== 'android') return null;

  if (!nativeAndroid) {
    return (
      <section
        className="mb-5 rounded-[1.5rem] border border-blue-500/20 bg-blue-500/5 p-4"
        aria-label="Android Schutzstatus"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-blue-300" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-semibold text-blue-100">Android-Systemstatus nur auf dem Gerät</h2>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              Diese Webansicht kann nicht bestätigen, ob der native Android-Schutzdienst läuft.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section
        className="mb-5 rounded-[1.5rem] border border-zinc-800 bg-zinc-900/70 p-4"
        aria-label="Android Schutzstatus wird geprüft"
      >
        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <RefreshCw size={17} className="animate-spin" aria-hidden="true" /> Android-Schutzstatus wird geprüft …
        </div>
      </section>
    );
  }

  if (status?.running && status.enabled) {
    return (
      <section
        className="mb-5 rounded-[1.5rem] border border-emerald-500/25 bg-emerald-500/5 p-4"
        aria-label="Android Schutzstatus aktiv"
      >
        <div className="flex items-start gap-3">
          <CheckCircle2 size={19} className="mt-0.5 flex-shrink-0 text-emerald-400" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-semibold text-emerald-100">Android-Schutz läuft</h2>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              Dienst und gespeicherte Aktivierung sind aktiv. {activeConfiguredApps} App
              {activeConfiguredApps === 1 ? '' : 's'} konfiguriert.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const stale = status?.enabled && !status.running;
  const stoppedReason = status?.lastStopMessage.trim();

  return (
    <section
      className="mb-5 rounded-[1.5rem] border border-amber-500/30 bg-amber-500/5 p-4"
      aria-label={stale ? 'Android Schutzstatus Wiederherstellung nötig' : 'Android Schutzstatus gestoppt'}
    >
      <div className="flex items-start gap-3">
        <ShieldOff size={19} className="mt-0.5 flex-shrink-0 text-amber-400" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-amber-100">
            {stale ? 'Android-Schutz ist nicht laufend' : 'Android-Schutz ist gestoppt'}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">
            {stale
              ? 'Die Aktivierung ist noch gespeichert. ScrollShield versucht beim Öffnen eine sichere Wiederherstellung, sofern mindestens eine aktive Ziel-App installiert ist.'
              : activeConfiguredApps > 0
                ? 'Deine Regeln sind gespeichert, aber sie werden nicht durch den nativen Dienst durchgesetzt.'
                : 'Noch keine aktive App-Regel benötigt den Android-Schutzdienst.'}
          </p>
          {stoppedReason && (
            <p className="mt-2 break-words text-xs leading-relaxed text-amber-300/80">Letzter Stopp: {stoppedReason}</p>
          )}
          <button
            type="button"
            onClick={() => navigate(activeConfiguredApps > 0 ? 'permissions' : 'apps')}
            className="mt-3 min-h-[42px] rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 text-xs font-bold text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            {activeConfiguredApps > 0 ? 'Schutzstatus öffnen' : 'Apps auswählen'}
          </button>
        </div>
      </div>
    </section>
  );
}
