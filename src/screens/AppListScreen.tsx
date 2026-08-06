import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronRight, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { Header, Switch } from '../components/ui';
import { NativeProtection } from '../lib/nativeProtection';
import { DEFAULT_APP_CONFIG, SUPPORTED_APPS } from '../types';
import type { AppState, Screen } from '../types';

export function AppList({
  state,
  updateState,
  navigate,
}: {
  state: AppState;
  updateState: (updates: Partial<AppState>) => void;
  navigate: (screen: Screen) => void;
}) {
  const [unavailableAppIds, setUnavailableAppIds] = useState<string[]>([]);
  const [checkingApps, setCheckingApps] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const nativeAndroid = NativeProtection.isAvailable();
  const unavailableSet = useMemo(() => new Set(unavailableAppIds), [unavailableAppIds]);

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
    if (nativeAndroid && unavailableSet.has(id)) return;

    const appsConfig = { ...state.appsConfig };
    if (appsConfig[id]) {
      appsConfig[id] = {
        ...appsConfig[id],
        active: !appsConfig[id].active,
      };
    } else {
      appsConfig[id] = { id, ...DEFAULT_APP_CONFIG, active: true };
    }
    updateState({ appsConfig });
  };

  const openDetail = (id: string) => {
    if (nativeAndroid && unavailableSet.has(id)) return;

    const appsConfig = { ...state.appsConfig };
    if (!appsConfig[id]) {
      appsConfig[id] = { id, ...DEFAULT_APP_CONFIG, active: false };
      updateState({ appsConfig });
    }
    updateState({ selectedAppId: id });
    navigate('app_detail');
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
        Wähle die Apps aus, bei denen du endloses Scrollen einschränken möchtest. Tippe auf eine App für Details.
      </p>

      {nativeAndroid && (
        <div className="mb-5 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 text-xs text-zinc-400 leading-relaxed">
          ScrollShield aktiviert den Android-Schutz nur für Apps, die auf diesem Gerät installiert und für Android
          sichtbar sind. Nicht verfügbare Apps bleiben deaktiviert.
        </div>
      )}

      {availabilityError && (
        <p role="alert" className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300">
          {availabilityError}
        </p>
      )}

      <ul className="space-y-3 flex-1 overflow-y-auto scrollbar-hide" aria-label="Liste der unterstützten Apps">
        {sortedApps.map((app) => {
          const config = state.appsConfig[app.id];
          const isActive = config?.active || false;
          const isUnavailable = nativeAndroid && unavailableSet.has(app.id);
          const statusText = isUnavailable
            ? isActive
              ? 'Konfiguriert, aber nicht installiert'
              : 'Nicht installiert'
            : isActive
              ? `Modus: ${config.mode}`
              : 'Inaktiv';

          return (
            <li key={app.id}>
              <div
                className={`w-full flex items-center gap-3 p-4 rounded-[1.5rem] border transition-all min-h-[48px] ${
                  isUnavailable
                    ? 'bg-zinc-950/40 border-zinc-800/50 opacity-60'
                    : isActive
                      ? 'bg-zinc-900/80 border-zinc-700 shadow-lg'
                      : 'bg-zinc-950/50 border-zinc-800/50 opacity-80 hover:opacity-100'
                }`}
              >
                <button
                  type="button"
                  onClick={() => openDetail(app.id)}
                  disabled={isUnavailable}
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
                    <div className={`text-xs mt-0.5 font-medium ${isUnavailable ? 'text-amber-500/80' : 'text-zinc-500'}`}>
                      {statusText}
                    </div>
                  </div>
                  {!isUnavailable && <ChevronRight size={18} className="text-zinc-600" aria-hidden="true" />}
                </button>
                <Switch
                  checked={isActive}
                  disabled={isUnavailable}
                  onChange={() => toggleApp(app.id)}
                  ariaLabel={
                    isUnavailable
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
