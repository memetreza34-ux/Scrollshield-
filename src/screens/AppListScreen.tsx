import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, ChevronRight, LockKeyhole, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { Header, Switch } from '../components/ui';
import { NativeProtection } from '../lib/nativeProtection';
import { isCommitmentLockActive, type CommitmentLock } from '../lib/commitmentLock';
import {
  createReleaseDefaultAppConfig,
  isLegacyUntouchedDefaultConfig,
} from '../lib/releaseProfiles';
import { SUPPORTED_APPS } from '../types';
import type { AppConfig, AppState, Screen } from '../types';

type WeeklyPresetId = 'off' | 'balanced' | 'work' | 'sleep' | 'strict';

const WEEKLY_PRESETS: Record<WeeklyPresetId, { label: string; description: string; windows: AppConfig['timeWindows'] }> = {
  off: {
    label: 'Kein Wochenplan',
    description: 'Nur die normalen App-Regeln und Limits gelten.',
    windows: {
      morningRules: 'normal',
      workRules: 'normal',
      eveningRules: 'normal',
      nightRules: 'normal',
      weekendRules: 'normal',
    },
  },
  balanced: {
    label: 'Ausgeglichen',
    description: 'Streng bei Arbeit oder Schule, nachts blockiert, Wochenende normal.',
    windows: {
      morningRules: 'normal',
      workRules: 'strict',
      eveningRules: 'normal',
      nightRules: 'block',
      weekendRules: 'normal',
    },
  },
  work: {
    label: 'Arbeit & Lernen',
    description: 'Unter der Woche tagsüber blockiert, nachts strenger Schutz.',
    windows: {
      morningRules: 'normal',
      workRules: 'block',
      eveningRules: 'normal',
      nightRules: 'strict',
      weekendRules: 'normal',
    },
  },
  sleep: {
    label: 'Abend & Schlaf',
    description: 'Abends streng und zwischen 22:00 und 06:00 Uhr blockiert.',
    windows: {
      morningRules: 'normal',
      workRules: 'normal',
      eveningRules: 'strict',
      nightRules: 'block',
      weekendRules: 'normal',
    },
  },
  strict: {
    label: 'Sehr streng',
    description: 'Alle wiederkehrenden Zeitfenster blockieren geschützte Apps.',
    windows: {
      morningRules: 'block',
      workRules: 'block',
      eveningRules: 'block',
      nightRules: 'block',
      weekendRules: 'block',
    },
  },
};

const matchesWindows = (left: AppConfig['timeWindows'], right: AppConfig['timeWindows']) =>
  left.morningRules === right.morningRules &&
  left.workRules === right.workRules &&
  left.eveningRules === right.eveningRules &&
  left.nightRules === right.nightRules &&
  left.weekendRules === right.weekendRules;

const releaseModeLabel = (mode: AppConfig['mode']) => (mode === 'strict' ? 'Strikt' : 'Bewusste Pause');

export function AppList({
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
  const nativeAndroid = NativeProtection.isAvailable();
  const configurationLocked = isCommitmentLockActive(commitmentLock);
  const [unavailableAppIds, setUnavailableAppIds] = useState<string[]>([]);
  const [checkingApps, setCheckingApps] = useState(nativeAndroid);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const unavailableSet = useMemo(() => new Set(unavailableAppIds), [unavailableAppIds]);
  const activeAppConfigs = Object.values(state.appsConfig).filter((config) => config.active);

  const activePreset = useMemo(() => {
    if (activeAppConfigs.length === 0) return 'off';
    const firstWindows = activeAppConfigs[0].timeWindows;
    const allEqual = activeAppConfigs.every((config) => matchesWindows(config.timeWindows, firstWindows));
    if (!allEqual) return 'custom';

    const match = (Object.entries(WEEKLY_PRESETS) as Array<[WeeklyPresetId, (typeof WEEKLY_PRESETS)[WeeklyPresetId]]>).find(
      ([, preset]) => matchesWindows(firstWindows, preset.windows),
    );
    return match?.[0] ?? 'custom';
  }, [activeAppConfigs]);

  const refreshAvailability = async () => {
    if (!nativeAndroid) return;
    setCheckingApps(true);
    setAvailabilityError(null);
    try {
      const unavailable = await NativeProtection.sync(state.appsConfig, state.isFocusModeActive);
      setUnavailableAppIds(unavailable);
    } catch (error) {
      console.error('Could not inspect installed Android apps', error);
      setAvailabilityError('Der Installationsstatus konnte nicht geprüft werden.');
    } finally {
      setCheckingApps(false);
    }
  };

  useEffect(() => {
    void refreshAvailability();
    // Configuration changes are synchronized by App.tsx. This screen refreshes when it opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nativeAndroid]);

  const toggleApp = (id: string) => {
    if (configurationLocked || checkingApps || (nativeAndroid && unavailableSet.has(id))) return;

    const appsConfig = { ...state.appsConfig };
    const existing = appsConfig[id];
    const now = Date.now();
    if (!existing) {
      appsConfig[id] = { ...createReleaseDefaultAppConfig(id, true), updatedAt: now };
    } else if (!existing.active && isLegacyUntouchedDefaultConfig(existing)) {
      appsConfig[id] = { ...createReleaseDefaultAppConfig(id, true), updatedAt: now };
    } else {
      appsConfig[id] = {
        ...existing,
        active: !existing.active,
        updatedAt: now,
      };
    }
    updateState({ appsConfig });
  };

  const openDetail = (id: string) => {
    if (configurationLocked || checkingApps || (nativeAndroid && unavailableSet.has(id))) return;

    const appsConfig = { ...state.appsConfig };
    if (!appsConfig[id]) {
      appsConfig[id] = createReleaseDefaultAppConfig(id, false);
      updateState({ appsConfig });
    }
    updateState({ selectedAppId: id });
    navigate('app_detail');
  };

  const applyWeeklyPreset = (presetId: WeeklyPresetId) => {
    if (configurationLocked) return;
    const preset = WEEKLY_PRESETS[presetId];
    const updatedAt = Date.now();
    const appsConfig = Object.fromEntries(
      Object.entries(state.appsConfig).map(([appId, config]) => [
        appId,
        config.active
          ? {
              ...config,
              timeWindows: { ...preset.windows },
              updatedAt,
            }
          : config,
      ]),
    );
    updateState({ appsConfig });
  };

  const sortedApps = [...SUPPORTED_APPS].sort((a, b) => {
    const aUnavailable = nativeAndroid && unavailableSet.has(a.id) ? 1 : 0;
    const bUnavailable = nativeAndroid && unavailableSet.has(b.id) ? 1 : 0;
    if (aUnavailable !== bUnavailable) return aUnavailable - bUnavailable;

    const aActive = state.appsConfig[a.id]?.active ? 1 : 0;
    const bActive = state.appsConfig[b.id]?.active ? 1 : 0;
    return bActive - aActive;
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-6 pb-32 flex flex-col h-full"
    >
      <Header
        title="Geschützte Apps"
        onBack={() => navigate('dashboard')}
        rightAction={
          nativeAndroid ? (
            <button
              type="button"
              onClick={() => void refreshAvailability()}
              disabled={checkingApps}
              aria-label="Installierte Apps neu prüfen"
              className="min-h-[44px] min-w-[44px] rounded-full border border-zinc-800 bg-zinc-900/70 text-zinc-400 flex items-center justify-center disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <RefreshCw size={18} className={checkingApps ? 'animate-spin' : ''} />
            </button>
          ) : null
        }
      />
      <p className="text-zinc-400 text-sm mb-4 leading-relaxed">
        Wähle die Apps aus, bei denen du impulsives Öffnen und lange Sitzungen einschränken möchtest. Neu aktivierte Apps starten neutral: ohne versteckten Wochenplan und mit Anti-Binge zunächst aus.
      </p>

      {configurationLocked && commitmentLock && (
        <div role="status" className="mb-5 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4 text-xs leading-relaxed text-indigo-100">
          <div className="flex items-start gap-3">
            <LockKeyhole size={17} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div>
              <strong className="block">Commitment aktiv – Regeln sind eingefroren</strong>
              <span className="mt-1 block text-indigo-200/75">
                Änderungen bleiben bis {new Date(commitmentLock.lockedUntil).toLocaleString('de-DE')} gesperrt. Statusprüfung und laufender Schutz funktionieren weiter.
              </span>
            </div>
          </div>
        </div>
      )}

      {nativeAndroid && (
        <div className="mb-5 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 text-xs text-zinc-400 leading-relaxed">
          {checkingApps
            ? 'Installierte Apps werden geprüft. Die Schutzschalter bleiben bis zum Abschluss gesperrt.'
            : 'ScrollShield aktiviert den Android-Schutz nur für Apps, die auf diesem Gerät installiert und für Android sichtbar sind. Nicht verfügbare Apps bleiben deaktiviert.'}
        </div>
      )}

      {availabilityError && (
        <p role="alert" className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300">
          {availabilityError}
        </p>
      )}

      <section className="mb-6 rounded-[1.75rem] border border-zinc-800 bg-zinc-900/70 p-5" aria-labelledby="weekly-plan-title">
        <div className="flex gap-3 items-start mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-300 flex items-center justify-center flex-shrink-0">
            <CalendarDays size={20} />
          </div>
          <div>
            <h2 id="weekly-plan-title" className="font-bold text-zinc-100">
              Wiederkehrender Wochenplan
            </h2>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Gilt für alle aktuell geschützten Apps: Morgen 06–09 Uhr, Arbeit/Schule 09–17 Uhr, Abend 17–22 Uhr,
              Nacht 22–06 Uhr und Wochenende ganztägig.
            </p>
          </div>
        </div>

        <label htmlFor="weekly-preset" className="text-xs font-bold uppercase tracking-widest text-zinc-500 block mb-2">
          Plan auswählen
        </label>
        <select
          id="weekly-preset"
          value={activePreset}
          disabled={activeAppConfigs.length === 0 || configurationLocked}
          onChange={(event) => applyWeeklyPreset(event.target.value as WeeklyPresetId)}
          className="w-full min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-200 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50"
        >
          {activePreset === 'custom' && <option value="custom">Individuelle Kombination</option>}
          {(Object.entries(WEEKLY_PRESETS) as Array<[WeeklyPresetId, (typeof WEEKLY_PRESETS)[WeeklyPresetId]]>).map(
            ([presetId, preset]) => (
              <option key={presetId} value={presetId}>
                {preset.label}
              </option>
            ),
          )}
        </select>
        <p className="text-xs text-zinc-500 mt-3 leading-relaxed">
          {configurationLocked
            ? 'Der Wochenplan bleibt während des Commitments unverändert.'
            : activeAppConfigs.length === 0
              ? 'Aktiviere zuerst mindestens eine installierte App.'
              : activePreset === 'custom'
                ? 'Die geschützten Apps verwenden unterschiedliche Zeitfenster.'
                : WEEKLY_PRESETS[activePreset].description}
        </p>
      </section>

      <ul className="space-y-3 flex-1 overflow-y-auto scrollbar-hide" aria-label="Liste der unterstützten Apps">
        {sortedApps.map((app) => {
          const config = state.appsConfig[app.id];
          const isActive = config?.active || false;
          const isUnavailable = nativeAndroid && unavailableSet.has(app.id);
          const controlsDisabled = configurationLocked || checkingApps || isUnavailable;
          const statusText = configurationLocked
            ? 'Commitment aktiv – Regeln eingefroren'
            : checkingApps
              ? 'Installationsstatus wird geprüft'
              : isUnavailable
                ? isActive
                  ? 'Konfiguriert, aber nicht installiert'
                  : 'Nicht installiert'
                : isActive
                  ? `Modus: ${releaseModeLabel(config.mode)}`
                  : 'Inaktiv';

          return (
            <li key={app.id}>
              <div
                className={`w-full flex items-center gap-3 p-4 rounded-[1.5rem] border transition-all min-h-[48px] ${
                  controlsDisabled
                    ? 'bg-zinc-950/40 border-zinc-800/50 opacity-60'
                    : isActive
                      ? 'bg-zinc-900/80 border-zinc-700 shadow-lg'
                      : 'bg-zinc-950/50 border-zinc-800/50 opacity-80 hover:opacity-100'
                }`}
              >
                <button
                  type="button"
                  onClick={() => openDetail(app.id)}
                  disabled={controlsDisabled}
                  className="min-w-0 flex flex-1 items-center gap-4 text-left rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[48px] disabled:cursor-not-allowed"
                  aria-label={`${app.name} Details. Status: ${statusText}`}
                >
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner ${app.color}`}
                    aria-hidden="true"
                  >
                    {app.icon}
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <div className="font-semibold flex items-center gap-2">
                      <span className="truncate">{app.name}</span>
                      {isUnavailable && <AlertTriangle size={14} className="flex-shrink-0 text-amber-500" />}
                    </div>
                    <div
                      className={`text-xs mt-0.5 font-medium ${isUnavailable ? 'text-amber-500/80' : 'text-zinc-500'}`}
                    >
                      {statusText}
                    </div>
                  </div>
                  {!controlsDisabled && <ChevronRight size={18} className="text-zinc-600" aria-hidden="true" />}
                </button>
                <Switch
                  checked={isActive}
                  disabled={controlsDisabled}
                  onChange={() => toggleApp(app.id)}
                  ariaLabel={
                    configurationLocked
                      ? `${app.name} ist während des Commitments gesperrt`
                      : checkingApps
                        ? `${app.name} wird noch geprüft`
                        : isUnavailable
                          ? `${app.name} ist nicht installiert und kann nicht geschützt werden`
                          : `${app.name} Schutz umschalten`
                  }
                />
              </div>
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
}
