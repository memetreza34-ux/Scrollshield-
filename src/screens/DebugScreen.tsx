import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  AlertTriangle,
  Clipboard,
  Copy,
  Database,
  Play,
  RefreshCw,
  Shield,
  Terminal,
  XCircle,
} from 'lucide-react';
import type { AppState, HistoryEvent, Screen } from '../types';
import { Header } from '../components/ui';
import { createEventId, getLocalDateKey } from '../lib/appUtils';
import { NativeDiagnostics } from '../lib/nativeDiagnostics';
import type { NativeDiagnosticsSnapshot } from '../lib/nativeDiagnostics';

const formatLifecycleTime = (timestamp: number) =>
  timestamp > 0 ? new Date(timestamp).toLocaleString() : 'NOCH NIE';

export function DebugScreen({
  state,
  updateState,
  navigate,
}: {
  state: AppState;
  updateState: (updates: Partial<AppState>) => void;
  navigate: (screen: Screen) => void;
}) {
  const [nativeSnapshot, setNativeSnapshot] = useState<NativeDiagnosticsSnapshot | null>(null);
  const [diagnosticsBusy, setDiagnosticsBusy] = useState(false);
  const [diagnosticsError, setDiagnosticsError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const logEvent = (type: HistoryEvent['type'], desc: string, appId?: string) => {
    const newEvent: HistoryEvent = {
      id: createEventId(),
      timestamp: Date.now(),
      type,
      appId,
      desc,
    };
    updateState({ history: [newEvent, ...state.history] });
  };

  const refreshNativeDiagnostics = async () => {
    if (!NativeDiagnostics.isAvailable()) return;
    setDiagnosticsBusy(true);
    setDiagnosticsError(null);
    try {
      setNativeSnapshot(await NativeDiagnostics.getSnapshot());
    } catch (error) {
      console.error('Could not read Android diagnostics', error);
      setDiagnosticsError('Android-Diagnose konnte nicht gelesen werden.');
    } finally {
      setDiagnosticsBusy(false);
    }
  };

  useEffect(() => {
    void refreshNativeDiagnostics();
    // Snapshot is refreshed manually after permission or service changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copyDiagnostics = async () => {
    if (!nativeSnapshot) return;
    setCopyStatus(null);
    try {
      await navigator.clipboard.writeText(JSON.stringify(nativeSnapshot, null, 2));
      setCopyStatus('Diagnose wurde kopiert.');
    } catch (error) {
      console.error('Could not copy diagnostics', error);
      setCopyStatus('Diagnose konnte nicht kopiert werden.');
    }
  };

  const simulateDayChange = () => {
    const todayKey = getLocalDateKey();
    updateState({
      stats: {
        ...state.stats,
        currentStreak: state.stats.currentStreak + 1,
        cleanDaysStreak: state.stats.cleanDaysStreak + 1,
      },
      dailyStats: {
        ...state.dailyStats,
        [todayKey]: {
          date: todayKey,
          usageMinutes: {},
          blockedOpens: 5,
          savedTimeMinutes: 25,
          emergencyUnlocks: 0,
          focusMinutes: 60,
        },
      },
    });
    logEvent('rule_change', 'Tageswechsel simuliert');
  };

  const diagnosticRows: Array<[string, string, boolean?]> = nativeSnapshot
    ? [
        ['Gerät', `${nativeSnapshot.manufacturer} ${nativeSnapshot.model}`],
        ['Android', `${nativeSnapshot.androidRelease} / SDK ${nativeSnapshot.sdkInt}`],
        ['Paket', nativeSnapshot.packageName],
        ['Version', `${nativeSnapshot.versionName} (Build ${nativeSnapshot.versionCode})`],
        ['Zeitzone', nativeSnapshot.timeZone],
        ['Sprache', nativeSnapshot.locale],
        ['Nutzungszugriff', nativeSnapshot.usageAccess ? 'AKTIV' : 'FEHLT', nativeSnapshot.usageAccess],
        ['Overlay', nativeSnapshot.overlay ? 'AKTIV' : 'FEHLT', nativeSnapshot.overlay],
        [
          'App-Benachrichtigungen',
          nativeSnapshot.appNotificationsEnabled ? 'AKTIV' : 'DEAKTIVIERT',
          nativeSnapshot.appNotificationsEnabled,
        ],
        [
          'Schutzkanal',
          nativeSnapshot.protectionChannelCreated
            ? nativeSnapshot.protectionChannelEnabled
              ? 'AKTIV'
              : 'DEAKTIVIERT'
            : 'NOCH NICHT ERSTELLT',
          nativeSnapshot.protectionChannelCreated
            ? nativeSnapshot.protectionChannelEnabled
            : undefined,
        ],
        [
          'Schutz-Benachrichtigung',
          nativeSnapshot.notifications ? 'BEREIT' : 'NICHT BEREIT',
          nativeSnapshot.notifications,
        ],
        [
          'Akku-Ausnahme',
          nativeSnapshot.batteryOptimizationExempt ? 'AKTIV' : 'NICHT AKTIV',
          nativeSnapshot.batteryOptimizationExempt,
        ],
        [
          'Schutz aktiviert',
          nativeSnapshot.protectionEnabled ? 'JA' : 'NEIN',
          nativeSnapshot.protectionEnabled,
        ],
        ['Dienst läuft', nativeSnapshot.serviceRunning ? 'JA' : 'NEIN', nativeSnapshot.serviceRunning],
        [
          'Installierte Ziel-App',
          nativeSnapshot.configuredInstalledApps ? 'GEFUNDEN' : 'KEINE',
          nativeSnapshot.configuredInstalledApps,
        ],
        ['Letzte Startanforderung', formatLifecycleTime(nativeSnapshot.lastProtectionStartRequestAt)],
        ['Letzter Schutzstart', formatLifecycleTime(nativeSnapshot.lastProtectionStartAt)],
        ['Letzter Stoppzeitpunkt', formatLifecycleTime(nativeSnapshot.lastProtectionStopAt)],
        ['Letzter Stoppcode', nativeSnapshot.lastProtectionStopCode || 'KEINER'],
        ['Letzter Stoppgrund', nativeSnapshot.lastProtectionStopMessage || 'NOCH KEIN STOPPGRUND'],
      ]
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="p-6 pb-32 flex flex-col h-full bg-zinc-950"
    >
      <Header title="Developer / Debug" onBack={() => navigate('settings')} />

      <div className="space-y-6 flex-1 overflow-y-auto scrollbar-hide">
        <section>
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 px-2 flex items-center gap-2">
            <Terminal size={14} /> Plattformdiagnose
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-[1.5rem] p-4 space-y-3 font-mono text-xs">
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">UI-Plattform:</span>
              <span className="text-emerald-400">{state.operatingSystem.toUpperCase()}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">Native Diagnose:</span>
              <span className={NativeDiagnostics.isAvailable() ? 'text-emerald-400' : 'text-zinc-500'}>
                {NativeDiagnostics.isAvailable() ? 'VERFÜGBAR' : 'NICHT VERFÜGBAR'}
              </span>
            </div>
          </div>
        </section>

        {NativeDiagnostics.isAvailable() && (
          <section>
            <div className="flex items-center justify-between gap-3 mb-3 px-2">
              <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Clipboard size={14} /> Android-Gerätebericht
              </h2>
              <button
                type="button"
                onClick={() => void refreshNativeDiagnostics()}
                disabled={diagnosticsBusy}
                aria-label="Android-Diagnose aktualisieren"
                className="min-h-[40px] min-w-[40px] rounded-full border border-zinc-800 bg-zinc-900 text-zinc-400 flex items-center justify-center disabled:opacity-50"
              >
                <RefreshCw size={15} className={diagnosticsBusy ? 'animate-spin' : ''} />
              </button>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-[1.5rem] p-4 space-y-3 font-mono text-xs">
              {diagnosticsError && <p className="text-red-400">{diagnosticsError}</p>}
              {!nativeSnapshot && !diagnosticsError && (
                <p className="text-zinc-500">
                  {diagnosticsBusy ? 'Diagnose wird gelesen…' : 'Noch kein Snapshot.'}
                </p>
              )}
              {diagnosticRows.map(([label, value, positive]) => (
                <div
                  key={label}
                  className="flex justify-between gap-4 border-b border-zinc-800/50 pb-2 last:border-0 last:pb-0"
                >
                  <span className="text-zinc-500">{label}:</span>
                  <span
                    className={
                      positive === undefined
                        ? 'text-zinc-300 text-right'
                        : positive
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                    }
                  >
                    {value}
                  </span>
                </div>
              ))}

              {nativeSnapshot && (
                <button
                  type="button"
                  onClick={() => void copyDiagnostics()}
                  className="w-full mt-2 rounded-xl border border-zinc-700 bg-zinc-800 py-3 text-zinc-200 font-bold flex items-center justify-center gap-2"
                >
                  <Copy size={14} /> Diagnose als JSON kopieren
                </button>
              )}
              {copyStatus && (
                <p role="status" className="text-center text-zinc-400">
                  {copyStatus}
                </p>
              )}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 px-2 flex items-center gap-2">
            <Shield size={14} /> Aktive Schutzlogik
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-[1.5rem] p-4 space-y-3 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-500">Global Level:</span>
              <span className="text-blue-400">{state.activeProtectionLevel.toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Focus Mode:</span>
              <span className={state.isFocusModeActive ? 'text-emerald-400' : 'text-zinc-500'}>
                {state.isFocusModeActive ? `ACTIVE (${state.focusTimeRemaining}m)` : 'INACTIVE'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Active Profile:</span>
              <span className="text-purple-400">{state.activeProfileId}</span>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 px-2 flex items-center gap-2">
            <Activity size={14} /> Testfunktionen
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                updateState({ isFocusModeActive: true, focusTimeRemaining: 15 });
                logEvent('focus_start', 'Debug: Fokus gestartet');
              }}
              className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-xs font-bold text-zinc-300 hover:bg-zinc-800 flex items-center gap-2"
            >
              <Play size={14} /> Fokus Starten
            </button>
            <button
              onClick={() => {
                updateState({ isFocusModeActive: false, focusTimeRemaining: 0 });
                logEvent('focus_end', 'Debug: Fokus beendet');
              }}
              className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-xs font-bold text-zinc-300 hover:bg-zinc-800 flex items-center gap-2"
            >
              <XCircle size={14} /> Fokus Beenden
            </button>
            <button
              onClick={() => logEvent('block', 'Debug: Blockierung simuliert', 'instagram')}
              className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-xs font-bold text-zinc-300 hover:bg-zinc-800 flex items-center gap-2"
            >
              <Shield size={14} /> Block Simulieren
            </button>
            <button
              onClick={() => logEvent('emergency', 'Debug: Notfallfreigabe', 'tiktok')}
              className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-xs font-bold text-zinc-300 hover:bg-zinc-800 flex items-center gap-2"
            >
              <AlertTriangle size={14} /> Notfall Simulieren
            </button>
            <button
              onClick={simulateDayChange}
              className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-xs font-bold text-zinc-300 hover:bg-zinc-800 flex items-center gap-2 col-span-2 justify-center"
            >
              <RefreshCw size={14} /> Tageswechsel Simulieren
            </button>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 px-2 flex items-center gap-2">
            <Database size={14} /> Event Log (Letzte 10)
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-[1.5rem] p-4 space-y-3 font-mono text-[10px] overflow-hidden">
            {state.history.slice(0, 10).map((event) => (
              <div key={event.id} className="border-b border-zinc-800/50 pb-2 last:border-0 last:pb-0">
                <div className="flex justify-between text-zinc-500 mb-1">
                  <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
                  <span
                    className={
                      event.type === 'block'
                        ? 'text-red-400'
                        : event.type === 'open'
                          ? 'text-blue-400'
                          : event.type === 'emergency'
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                    }
                  >
                    {event.type.toUpperCase()}
                  </span>
                </div>
                <div className="text-zinc-300">
                  {event.appId && <span className="text-purple-400 mr-2">[{event.appId}]</span>}
                  {event.desc}
                  {event.trigger && <span className="text-zinc-500 ml-2">(Trigger: {event.trigger})</span>}
                </div>
              </div>
            ))}
            {state.history.length === 0 && <div className="text-zinc-500 text-center py-2">Keine Events</div>}
          </div>
        </section>
      </div>
    </motion.div>
  );
}
