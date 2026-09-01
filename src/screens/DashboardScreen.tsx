import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Clock,
  Focus,
  History as HistoryIcon,
  LockKeyhole,
  Settings,
  Shield,
  Smartphone,
} from 'lucide-react';
import { motion } from 'motion/react';
import { isCommitmentLockActive, type CommitmentLock } from '../lib/commitmentLock';
import { createFocusEndUpdate } from '../lib/focus';
import { NativeProtection, type NativeProtectionStatus } from '../lib/nativeProtection';
import type { AppState, Screen } from '../types';

const getLocalDateKey = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatMinutes = (minutes: number): string => {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const rest = safeMinutes % 60;
  return hours > 0 ? `${hours}h ${rest}m` : `${rest}m`;
};

export function DashboardScreen({
  state,
  updateState,
  navigate,
  commitmentLock = null,
}: {
  state: AppState;
  updateState: (updates: Partial<AppState>) => void;
  navigate: (screen: Screen) => void;
  commitmentLock?: CommitmentLock | null;
}) {
  const protectedApps = Object.values(state.appsConfig).filter((config) => config.active);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todaysHistory = state.history.filter((event) => event.timestamp >= todayStart.getTime());
  const interventionCount = todaysHistory.filter((event) => event.type === 'block' || event.type === 'warning').length;
  const emergencyCount = todaysHistory.filter((event) => event.type === 'emergency').length;
  const todayStats = state.dailyStats[getLocalDateKey()];
  const trackedUsageMinutes = Object.values(todayStats?.usageMinutes ?? {}).reduce((sum, value) => sum + value, 0);
  const estimatedSavedMinutes = todayStats?.savedTimeMinutes ?? 0;
  const activeProfile = state.profiles?.find((profile) => profile.id === state.activeProfileId);
  const commitmentActive = isCommitmentLockActive(commitmentLock);
  const nativeAndroid = state.operatingSystem === 'android' && NativeProtection.isAvailable();
  const [commitmentRuntimeStatus, setCommitmentRuntimeStatus] = useState<NativeProtectionStatus | null>(null);
  const [commitmentRuntimeError, setCommitmentRuntimeError] = useState(false);

  useEffect(() => {
    if (!commitmentActive || !nativeAndroid) {
      setCommitmentRuntimeStatus(null);
      setCommitmentRuntimeError(false);
      return;
    }

    let cancelled = false;
    const refreshCommitmentRuntime = async () => {
      try {
        const status = await NativeProtection.getStatus();
        if (cancelled) return;
        setCommitmentRuntimeStatus(status);
        setCommitmentRuntimeError(false);
      } catch (error) {
        console.error('Failed to verify commitment protection status', error);
        if (cancelled) return;
        setCommitmentRuntimeStatus(null);
        setCommitmentRuntimeError(true);
      }
    };

    void refreshCommitmentRuntime();
    const interval = window.setInterval(() => void refreshCommitmentRuntime(), 5_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [commitmentActive, nativeAndroid]);

  const missingAndroidProtection =
    state.operatingSystem === 'android' &&
    (!state.permissions.usageAccess || !state.permissions.overlay || !state.permissions.notifications);
  const iosPreview = state.operatingSystem === 'ios';
  const commitmentRuntimeHealthy =
    nativeAndroid && commitmentRuntimeStatus
      ? commitmentRuntimeStatus.running && commitmentRuntimeStatus.enabled
      : false;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 pb-32 space-y-7">
      <header className="mt-4">
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-3" aria-hidden="true">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900">
              <Shield size={16} className="text-emerald-400" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">ScrollShield</span>
          </div>
          <button
            type="button"
            onClick={() => navigate('settings')}
            aria-label="Einstellungen"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-800/50 bg-zinc-900/50 text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <Settings size={16} />
          </button>
        </div>

        <h1 className="text-3xl font-medium tracking-tight text-zinc-50">Dein Schutz heute.</h1>
        <p className="mt-2 text-sm text-zinc-400">
          {protectedApps.length === 0
            ? 'Wähle mindestens eine App aus, um mit dem Schutz zu starten.'
            : `${protectedApps.length} App${protectedApps.length === 1 ? '' : 's'} im aktuellen Profil geschützt.`}
        </p>
      </header>

      {commitmentActive && commitmentLock && nativeAndroid && commitmentRuntimeError && (
        <button
          type="button"
          onClick={() => navigate('permissions')}
          className="flex w-full gap-3 rounded-[1.5rem] border border-amber-500/35 bg-amber-500/10 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <AlertTriangle size={20} className="mt-0.5 flex-shrink-0 text-amber-300" aria-hidden="true" />
          <div>
            <div className="text-sm font-bold text-amber-200">Commitment aktiv · Schutzstatus nicht prüfbar</div>
            <p className="mt-1 text-xs leading-relaxed text-amber-100/70">
              Deine Regeln bleiben bis {new Date(commitmentLock.lockedUntil).toLocaleString('de-DE')} eingefroren, aber
              der Android-Dienststatus konnte nicht gelesen werden. Tippe hier, um den Schutzstatus zu prüfen.
            </p>
          </div>
        </button>
      )}

      {commitmentActive && commitmentLock && nativeAndroid && !commitmentRuntimeError && !commitmentRuntimeStatus && (
        <button
          type="button"
          onClick={() => navigate('permissions')}
          className="flex w-full gap-3 rounded-[1.5rem] border border-zinc-700 bg-zinc-900/80 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
        >
          <LockKeyhole size={20} className="mt-0.5 flex-shrink-0 text-zinc-300" aria-hidden="true" />
          <div>
            <div className="text-sm font-bold text-zinc-200">Commitment aktiv · Schutzstatus wird geprüft</div>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              Die Regeln sind eingefroren. ScrollShield bestätigt gerade separat, ob der native Android-Schutzdienst
              noch läuft.
            </p>
          </div>
        </button>
      )}

      {commitmentActive && commitmentLock && nativeAndroid && commitmentRuntimeStatus && !commitmentRuntimeHealthy && (
        <button
          type="button"
          onClick={() => navigate('permissions')}
          className="flex w-full gap-3 rounded-[1.5rem] border border-red-500/35 bg-red-500/10 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          <AlertTriangle size={20} className="mt-0.5 flex-shrink-0 text-red-300" aria-hidden="true" />
          <div>
            <div className="text-sm font-bold text-red-200">Commitment aktiv · Android-Schutz läuft nicht</div>
            <p className="mt-1 text-xs leading-relaxed text-red-100/70">
              Die Regeln bleiben bis {new Date(commitmentLock.lockedUntil).toLocaleString('de-DE')} eingefroren, aber
              der Schutzdienst ist aktuell nicht vollständig aktiv. Tippe hier zum Reparieren.
            </p>
            {commitmentRuntimeStatus.lastStopCode && (
              <p className="mt-2 font-mono text-[10px] text-red-200/70">
                Stoppcode: {commitmentRuntimeStatus.lastStopCode}
              </p>
            )}
          </div>
        </button>
      )}

      {commitmentActive && commitmentLock && (!nativeAndroid || commitmentRuntimeHealthy) && (
        <button
          type="button"
          onClick={() => navigate('rules')}
          className="flex w-full gap-3 rounded-[1.5rem] border border-indigo-500/30 bg-indigo-500/10 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          <LockKeyhole size={20} className="mt-0.5 flex-shrink-0 text-indigo-200" aria-hidden="true" />
          <div>
            <div className="text-sm font-bold text-indigo-100">Commitment aktiv · Regeln eingefroren</div>
            <p className="mt-1 text-xs leading-relaxed text-indigo-200/70">
              Bis {new Date(commitmentLock.lockedUntil).toLocaleString('de-DE')} bleiben Apps, Profile, Limits und
              Zeitpläne unverändert. Tippe für Details und Sicherheitsausgänge.
            </p>
          </div>
        </button>
      )}

      {missingAndroidProtection && (
        <button
          type="button"
          onClick={() => navigate('permissions')}
          className="flex w-full gap-3 rounded-[1.5rem] border border-amber-500/30 bg-amber-500/10 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <AlertTriangle size={20} className="mt-0.5 flex-shrink-0 text-amber-400" aria-hidden="true" />
          <div>
            <div className="text-sm font-bold text-amber-300">Android-Schutz ist noch nicht vollständig bereit</div>
            <p className="mt-1 text-xs leading-relaxed text-amber-200/70">
              Nutzungszugriff, Overlay und sichtbare Benachrichtigungen müssen aktiv sein. Tippe hier für den echten
              Gerätestatus.
            </p>
          </div>
        </button>
      )}

      {iosPreview && (
        <div className="flex gap-3 rounded-[1.5rem] border border-blue-500/25 bg-blue-500/5 p-4">
          <AlertTriangle size={19} className="mt-0.5 flex-shrink-0 text-blue-400" aria-hidden="true" />
          <p className="text-xs leading-relaxed text-zinc-400">
            Der native iOS-Schutz ist noch nicht Bestandteil des Release-Kandidaten. Diese Ansicht ist dort nur
            Produktvorschau.
          </p>
        </div>
      )}

      {state.isFocusModeActive && (
        <section
          className="rounded-[2rem] border border-emerald-500/30 bg-emerald-500/10 p-6 text-center"
          aria-labelledby="active-focus-title"
        >
          <h2 id="active-focus-title" className="text-xs font-bold uppercase tracking-widest text-emerald-400">
            Fokus aktiv
          </h2>
          <div
            className="mt-3 text-5xl font-mono font-bold tracking-tighter text-emerald-50"
            aria-label={`Noch ${state.focusTimeRemaining} Minuten`}
          >
            {state.focusTimeRemaining}
            <span className="text-2xl text-emerald-400/80">m</span>
          </div>
          <button
            type="button"
            onClick={() => updateState(createFocusEndUpdate(state, false))}
            className="mt-5 min-h-[44px] rounded-full border border-emerald-800/50 bg-emerald-950/50 px-6 py-2.5 text-sm font-semibold text-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            Fokus beenden
          </button>
        </section>
      )}

      <section aria-labelledby="today-title">
        <div className="mb-3 flex items-center justify-between px-2">
          <h2 id="today-title" className="text-xs font-bold uppercase tracking-widest text-zinc-500">
            Heute
          </h2>
          <span className="text-xs text-zinc-600">lokale Daten</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="min-h-[118px] rounded-[1.5rem] border border-zinc-800/50 bg-zinc-900/80 p-5">
            <Smartphone size={17} className="text-zinc-500" aria-hidden="true" />
            <div className="mt-4 text-3xl font-mono font-bold tracking-tighter text-zinc-100">
              {protectedApps.length}
            </div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Geschützte Apps</div>
          </div>
          <div className="min-h-[118px] rounded-[1.5rem] border border-zinc-800/50 bg-zinc-900/80 p-5">
            <Shield size={17} className="text-emerald-500" aria-hidden="true" />
            <div className="mt-4 text-3xl font-mono font-bold tracking-tighter text-zinc-100">{interventionCount}</div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Interventionen</div>
          </div>
          <div className="min-h-[118px] rounded-[1.5rem] border border-zinc-800/50 bg-zinc-900/80 p-5">
            <Clock size={17} className="text-blue-400" aria-hidden="true" />
            <div className="mt-4 text-3xl font-mono font-bold tracking-tighter text-zinc-100">
              {formatMinutes(trackedUsageMinutes)}
            </div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Gemessene Freigabezeit
            </div>
          </div>
          <div className="min-h-[118px] rounded-[1.5rem] border border-zinc-800/50 bg-zinc-900/80 p-5">
            <AlertTriangle size={17} className="text-amber-400" aria-hidden="true" />
            <div className="mt-4 text-3xl font-mono font-bold tracking-tighter text-zinc-100">{emergencyCount}</div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Notfallfreigaben</div>
          </div>
        </div>

        {estimatedSavedMinutes > 0 && (
          <p className="mt-3 px-2 text-xs leading-relaxed text-zinc-500">
            Geschätzte gesparte Zeit heute: {formatMinutes(estimatedSavedMinutes)}. Dieser Wert ist eine
            Produktschätzung, keine exakte Messung.
          </p>
        )}
      </section>

      <section aria-labelledby="current-profile-title">
        <h2 id="current-profile-title" className="mb-3 px-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
          Aktuelles Profil
        </h2>
        <button
          type="button"
          onClick={() => navigate('rules')}
          className="w-full rounded-[1.5rem] border border-zinc-800/50 bg-zinc-900/80 p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <div className="font-semibold text-zinc-100">{activeProfile?.name ?? 'Standard'}</div>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            {activeProfile?.description ?? 'Passe geschützte Apps und Regeln an deinen Alltag an.'}
          </p>
          <div className="mt-3 text-xs font-semibold text-emerald-400">Profile & Regeln öffnen →</div>
        </button>
      </section>

      <section aria-labelledby="quick-actions-title">
        <h2 id="quick-actions-title" className="mb-3 px-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
          Direktzugriff
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => navigate('apps')}
            className="rounded-[1.5rem] border border-zinc-800/50 bg-zinc-900/80 p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <Smartphone size={19} className="text-emerald-400" aria-hidden="true" />
            <div className="mt-4 text-sm font-bold text-zinc-100">Apps schützen</div>
            <p className="mt-1 text-xs text-zinc-500">Auswahl und echte Android-Regeln</p>
          </button>
          <button
            type="button"
            onClick={() => navigate('focus')}
            className="rounded-[1.5rem] border border-zinc-800/50 bg-zinc-900/80 p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <Focus size={19} className="text-blue-400" aria-hidden="true" />
            <div className="mt-4 text-sm font-bold text-zinc-100">Fokus starten</div>
            <p className="mt-1 text-xs text-zinc-500">Zeitlich begrenzte Fokus-Sitzung</p>
          </button>
          <button
            type="button"
            onClick={() => navigate('history')}
            className="rounded-[1.5rem] border border-zinc-800/50 bg-zinc-900/80 p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <HistoryIcon size={19} className="text-zinc-400" aria-hidden="true" />
            <div className="mt-4 text-sm font-bold text-zinc-100">Verlauf</div>
            <p className="mt-1 text-xs text-zinc-500">Lokale Schutzereignisse prüfen</p>
          </button>
          <button
            type="button"
            onClick={() => navigate('permissions')}
            className="rounded-[1.5rem] border border-zinc-800/50 bg-zinc-900/80 p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <Shield size={19} className="text-zinc-400" aria-hidden="true" />
            <div className="mt-4 text-sm font-bold text-zinc-100">Schutzstatus</div>
            <p className="mt-1 text-xs text-zinc-500">Berechtigungen und Dienstzustand</p>
          </button>
        </div>
      </section>

      <p className="px-2 text-xs leading-relaxed text-zinc-600">
        ScrollShield v1 wertet auf Android ganze ausgewählte Apps aus. Kurzvideo-Unterseiten oder einzelne Feed-Elemente
        werden nicht als eigene Schutzfunktion ausgewiesen.
      </p>
    </motion.div>
  );
}
