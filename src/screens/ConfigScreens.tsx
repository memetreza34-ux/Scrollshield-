import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Database,
  Globe,
  Home,
  Bell,
  BellRing,
  Cloud,
  ChevronDown,
  ChevronUp,
  Star,
  ChevronRight,
  Check,
  Shield,
  Smartphone,
  Clock,
  Lock,
  HelpCircle,
  AlertTriangle,
  RefreshCw,
  Play,
  Briefcase,
  Coffee,
  Zap,
  Info,
  Moon,
  Plus,
  Edit3,
  Trash2,
  Save,
  Download,
  Upload,
  type LucideIcon,
} from 'lucide-react';
import { AppState, Screen, SUPPORTED_APPS, AppConfig, DEFAULT_APP_CONFIG } from '../types';
import { Header, Switch, TimeSelector } from '../components/ui';
import {
  createExportFilename,
  createScrollShieldExport,
  MAX_IMPORT_BYTES,
  parseScrollShieldExport,
  serializeScrollShieldExport,
} from '../lib/dataExport';
import { normalizeAppState } from '../lib/state';

export function AppList({
  state,
  updateState,
  navigate,
}: {
  state: AppState;
  updateState: (u: Partial<AppState>) => void;
  navigate: (s: Screen) => void;
}) {
  const [connectingAppId, setConnectingAppId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'checking' | 'success'>('idle');

  const toggleApp = (id: string) => {
    const appsConfig = { ...state.appsConfig };
    const config = appsConfig[id];
    
    // Wenn inaktiv und noch NICHT "verbunden", starte Connection-Flow
    if ((!config || !config.active) && (!config?.connected)) {
      setConnectingAppId(id);
      setConnectionStatus('checking');
      setTimeout(() => {
        setConnectionStatus('success');
        setTimeout(() => {
          setConnectingAppId(null);
          setConnectionStatus('idle');
          // Nach Verbindung direkt aktivieren
          const updatedAppsConfig = { ...state.appsConfig };
          updatedAppsConfig[id] = { 
            ...(updatedAppsConfig[id] || { id, ...DEFAULT_APP_CONFIG }), 
            active: true,
            connected: true 
          };
          updateState({ appsConfig: updatedAppsConfig });
        }, 1200);
      }, 2000);
      return;
    }

    if (appsConfig[id]) {
      appsConfig[id] = {
        ...appsConfig[id],
        active: !appsConfig[id].active,
      };
    } else {
      appsConfig[id] = { id, ...DEFAULT_APP_CONFIG, active: true, connected: true };
    }
    updateState({ appsConfig });
  };

  const openDetail = (id: string) => {
    const appsConfig = { ...state.appsConfig };
    if (!appsConfig[id]) {
      appsConfig[id] = { id, ...DEFAULT_APP_CONFIG, active: false };
      updateState({ appsConfig });
    }
    updateState({ selectedAppId: id });
    navigate('app_detail');
  };

  const connectingAppDef = connectingAppId ? SUPPORTED_APPS.find(a => a.id === connectingAppId) : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-6 pb-32 flex flex-col h-full relative"
    >
      <Header title="Geschützte Apps" onBack={() => navigate('dashboard')} />
      <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
        Wähle die Apps aus, bei denen du endloses Scrollen einschränken möchtest. Tippe auf eine App für Details.
      </p>

      <ul className="space-y-3 flex-1 overflow-y-auto scrollbar-hide" aria-label="Liste der unterstützten Apps">
        {[...SUPPORTED_APPS]
          .sort((a, b) => {
            const aActive = state.appsConfig[a.id]?.active ? 1 : 0;
            const bActive = state.appsConfig[b.id]?.active ? 1 : 0;
            return bActive - aActive;
          })
          .map((app) => {
            const config = state.appsConfig[app.id];
            const isActive = config?.active || false;

            return (
              <li key={app.id}>
                <div
                  className={`w-full flex items-center gap-3 p-4 rounded-[1.5rem] border transition-all min-h-[48px] ${isActive ? 'bg-zinc-900/80 border-zinc-700 shadow-lg' : 'bg-zinc-950/50 border-zinc-800/50 opacity-80 hover:opacity-100'}`}
                >
                  <button
                    onClick={() => openDetail(app.id)}
                    className="min-w-0 flex flex-1 items-center gap-4 text-left rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[48px]"
                    aria-label={`${app.name} Details. Status: ${isActive ? 'Aktiv' : 'Inaktiv'}`}
                  >
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner ${app.color}`}
                      aria-hidden="true"
                    >
                      {app.icon}
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">{app.name}</div>
                      <div className="text-xs text-zinc-500 mt-0.5 font-medium">
                        {isActive ? `Modus: ${config.mode}` : (config?.connected ? 'Verbunden, Inaktiv' : 'Nicht verbunden')}
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-zinc-600" aria-hidden="true" />
                  </button>
                  <Switch
                    checked={isActive}
                    onChange={() => toggleApp(app.id)}
                    ariaLabel={`${app.name} Schutz umschalten`}
                  />
                </div>
              </li>
            );
          })}
      </ul>

      <AnimatePresence>
        {connectingAppId && connectingAppDef && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-zinc-950/90 backdrop-blur-sm rounded-[2.5rem]"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm rounded-[2rem] border border-zinc-800 bg-zinc-900/95 p-8 text-center shadow-2xl flex flex-col items-center"
            >
              <div className={`w-20 h-20 rounded-3xl mb-6 flex items-center justify-center text-3xl shadow-lg relative ${connectingAppDef.color}`}>
                {connectionStatus === 'checking' && (
                  <RefreshCw size={24} className="absolute -top-2 -right-2 text-white bg-blue-500 rounded-full p-1 animate-spin shadow-md" />
                )}
                {connectionStatus === 'success' && (
                  <Check size={24} className="absolute -top-2 -right-2 text-white bg-emerald-500 rounded-full p-1 shadow-md" />
                )}
                {connectingAppDef.icon}
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">
                {connectionStatus === 'checking' ? `${connectingAppDef.name} autorisieren` : 'Erfolgreich verbunden'}
              </h3>
              <p className="text-zinc-400 text-sm leading-relaxed max-w-[250px]">
                {connectionStatus === 'checking' 
                  ? `ScrollShield verknüpft sich lokal mit ${connectingAppDef.name}, um den Zugriffs-Status und die Nutzungszeit auslesen zu können...` 
                  : `Der native Filter-Hook für ${connectingAppDef.name} wurde erfolgreich aktiviert.`}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function AppDetail({
  state,
  updateState,
  navigate,
}: {
  state: AppState;
  updateState: (u: Partial<AppState>) => void;
  navigate: (s: Screen) => void;
}) {
  const appId = state.selectedAppId;
  const appInfo = SUPPORTED_APPS.find((a) => a.id === appId);
  const config = state.appsConfig[appId || ''] || { ...DEFAULT_APP_CONFIG, id: appId };

  if (!appId || !appInfo) return null;

  const updateConfig = (updates: Partial<AppConfig>) => {
    updateState({
      appsConfig: { ...state.appsConfig, [appId]: { ...config, ...updates } },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-6 pb-32 flex flex-col h-full"
    >
      <Header title={appInfo.name} onBack={() => navigate('apps')} />

      <div className="space-y-6 flex-1 overflow-y-auto scrollbar-hide">
        <section
          aria-label="Schutz aktivieren"
          className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800/50 rounded-[2rem] p-6 flex justify-between items-center shadow-lg"
        >
          <h2 className="font-semibold text-lg">Schutz aktivieren</h2>
          <Switch
            checked={config.active}
            onChange={(c) => updateConfig({ active: c })}
            ariaLabel={`${appInfo.name} Schutz aktivieren`}
          />
        </section>

        <div
          className={`space-y-6 transition-opacity duration-300 ${!config.active ? 'opacity-40 pointer-events-none grayscale' : ''}`}
          aria-hidden={!config.active}
        >
          <section aria-labelledby="protection-mode-title">
            <h2
              id="protection-mode-title"
              className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 px-2"
            >
              Schutzmodus
            </h2>
            <div
              className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800/50 rounded-[1.5rem] p-1.5 flex shadow-inner"
              role="radiogroup"
              aria-labelledby="protection-mode-title"
            >
              {(['soft', 'standard', 'strict'] as const).map((mode) => (
                <button
                  key={mode}
                  role="radio"
                  aria-checked={config.mode === mode}
                  onClick={() => updateConfig({ mode })}
                  className={`flex-1 py-3 text-sm font-semibold capitalize transition-all rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px] ${config.mode === mode ? 'bg-zinc-100 text-zinc-950 shadow-md' : 'text-zinc-400 hover:text-zinc-200'}`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </section>

          <section aria-labelledby="reels-protection-title">
            <h2
              id="reels-protection-title"
              className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 px-2"
            >
              Reels- & Shorts-Schutz
            </h2>
            <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800/50 rounded-[2rem] overflow-hidden">
              <div className="p-6 border-b border-zinc-800/50 flex justify-between items-center">
                <div className="pr-4">
                  <h3 className="font-semibold mb-1 text-emerald-400">Reels-/Shorts-Modus</h3>
                  <p className="text-zinc-400 text-xs leading-relaxed">
                    Begrenzt endlose Kurzvideo-Feeds. Normale Nutzung bleibt uneingeschränkt.
                  </p>
                </div>
                <Switch
                  checked={config.reelsProtection?.enabled ?? false}
                  onChange={(c) => updateConfig({ reelsProtection: { ...config.reelsProtection, enabled: c } })}
                  ariaLabel="Reels-Schutz aktivieren"
                />
              </div>

              {(config.reelsProtection?.enabled ?? false) && (
                <>
                  <div className="p-4 bg-zinc-900 border-b border-zinc-800 flex gap-3 text-xs text-zinc-400">
                    <Info size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
                    <p>
                      <strong>Hinweis:</strong> Kürzere Session-Limits, Swiping-Unterbrechungen und Feed-Warnungen
                      greifen.
                    </p>
                  </div>
                  <div className="p-6 border-b border-zinc-800/50 flex items-center justify-between">
                    <label htmlFor="reels-limit" className="font-semibold block">
                      Tägliches Kurzvideo-Limit
                    </label>
                    <TimeSelector
                      value={config.reelsProtection?.dailyLimitMinutes || 15}
                      onChange={(v) =>
                        updateConfig({ reelsProtection: { ...config.reelsProtection, dailyLimitMinutes: v } })
                      }
                      options={[1, 3, 5, 10, 15, 30]}
                      allowDisabled={true}
                      disabledLabel="Blockiert"
                    />
                  </div>
                  <div className="p-6 border-b border-zinc-800/50 flex items-center justify-between">
                    <div className="pr-4">
                      <label className="font-semibold block mb-1">Einzelinhalt-Limit</label>
                      <p className="text-zinc-400 text-[10px] leading-relaxed">
                        Erlaubte Reels pro Session ohne Endlosmodus
                      </p>
                    </div>
                    <TimeSelector
                      value={config.reelsProtection?.singleItemsAllowed ?? 3}
                      onChange={(v) =>
                        updateConfig({ reelsProtection: { ...config.reelsProtection, singleItemsAllowed: v } })
                      }
                      options={[1, 3, 5]}
                      allowDisabled={true}
                      disabledLabel="Unbegrenzt"
                      unit="Videos"
                    />
                  </div>
                  <div className="p-6 border-b border-zinc-800/50 flex justify-between items-center">
                    <div className="pr-4">
                      <h3 className="font-semibold mb-1">Swipe-Unterbrecher</h3>
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        Pausiert den Bildschirm nach anhaltendem Swipen (alle X Swipes).
                      </p>
                    </div>
                    <Switch
                      checked={!!config.reelsProtection?.stopAfterSwipes && config.reelsProtection.stopAfterSwipes > 0}
                      onChange={(c) =>
                        updateConfig({ reelsProtection: { ...config.reelsProtection, stopAfterSwipes: c ? 10 : 0 } })
                      }
                      ariaLabel="Swipe-Unterbrecher aktivieren"
                    />
                  </div>
                </>
              )}
            </div>
          </section>

          <section aria-labelledby="limits-title">
            <h2 id="limits-title" className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 px-2">
              Limits & Zeiten
            </h2>
            <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800/50 rounded-[2rem] overflow-hidden">
              <div className="p-6 border-b border-zinc-800/50 flex justify-between items-center">
                <label className="font-semibold block">Tageslimit (Gesamte App)</label>
                <TimeSelector
                  value={config.dailyLimit}
                  onChange={(v) => updateConfig({ dailyLimit: v })}
                  options={[15, 30, 60]}
                  allowDisabled={true}
                  disabledLabel="Aus"
                />
              </div>
              <div className="p-6 border-b border-zinc-800/50 flex justify-between items-center">
                <label className="font-semibold block">Maximale Session-Länge</label>
                <TimeSelector
                  value={config.sessionLimit || 0}
                  onChange={(v) => updateConfig({ sessionLimit: v })}
                  options={[5, 10, 15, 30]}
                  allowDisabled={true}
                  disabledLabel="Aus"
                />
              </div>
              <div className="p-6 flex justify-between items-center">
                <label className="font-semibold block">Sperrzeit vor dem Öffnen</label>
                <TimeSelector
                  value={config.openDelay}
                  onChange={(v) => updateConfig({ openDelay: v })}
                  options={[5, 10, 15, 30]}
                  unit="Sek"
                  allowDisabled={true}
                  disabledLabel="Aus"
                />
              </div>
            </div>
          </section>

          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer list-none px-2 mb-3">
              <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Erweiterte Einstellungen</h2>
              <ChevronDown size={16} className="text-zinc-500 group-open:rotate-180 transition-transform" />
            </summary>

            <div className="space-y-6 mt-3">
              <section aria-labelledby="single-content-title">
                <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800/50 rounded-[2rem] overflow-hidden">
                  <div className="p-6 border-b border-zinc-800/50 flex justify-between items-center">
                    <div className="pr-4">
                      <h3 className="font-semibold mb-1">Fokus-Modus Verhalten</h3>
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        Verhalten der App, wenn Fokusmodus aktiv ist.
                      </p>
                    </div>
                    <select
                      aria-label="Fokus-Modus Verhalten"
                      value={config.focusModeBehavior || 'warn'}
                      onChange={(e) =>
                        updateConfig({ focusModeBehavior: e.target.value as 'allow' | 'warn' | 'block' })
                      }
                      className="bg-zinc-800 text-zinc-200 p-2 rounded-xl text-sm border border-zinc-700 outline-none"
                    >
                      <option value="allow">Erlauben</option>
                      <option value="warn">Warnen</option>
                      <option value="block">Blockieren</option>
                    </select>
                  </div>
                </div>
              </section>
              <section aria-labelledby="advanced-rules-title">
                <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800/50 rounded-[2rem] overflow-hidden">
                  <div className="p-6 border-b border-zinc-800/50 flex justify-between items-center">
                    <div className="pr-4">
                      <h3 className="font-semibold mb-1">Notfall-Zugang erlauben</h3>
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        Du kannst die App in dringenden Ausnahmefällen entsperren.
                      </p>
                    </div>
                    <Switch
                      checked={config.emergencyUnlock?.enabled ?? false}
                      onChange={(c) =>
                        updateConfig({
                          emergencyUnlock: {
                            ...(config.emergencyUnlock || {
                              durationMinutes: 5,
                              maxPerDay: 2,
                              requireCountdown: true,
                              requireReason: true,
                            }),
                            enabled: c,
                          },
                        })
                      }
                      ariaLabel="Notfall-Zugang erlauben"
                    />
                  </div>
                  {config.emergencyUnlock?.enabled && (
                    <>
                      <div className="p-6 border-b border-zinc-800/50 flex justify-between items-center bg-zinc-900/50">
                        <label className="font-semibold text-sm">Dauer des Notfall-Zugangs</label>
                        <TimeSelector
                          value={config.emergencyUnlock.durationMinutes}
                          onChange={(v) =>
                            updateConfig({ emergencyUnlock: { ...config.emergencyUnlock, durationMinutes: v } })
                          }
                          options={[2, 5, 10]}
                          unit="Min"
                        />
                      </div>
                      <div className="p-6 flex justify-between items-center bg-zinc-900/50">
                        <label className="font-semibold text-sm">Maximale Notfälle pro Tag</label>
                        <TimeSelector
                          value={config.emergencyUnlock.maxPerDay}
                          onChange={(v) =>
                            updateConfig({ emergencyUnlock: { ...config.emergencyUnlock, maxPerDay: v } })
                          }
                          options={[1, 2, 3, 5]}
                          unit="x"
                        />
                      </div>
                    </>
                  )}
                </div>
              </section>

              <section aria-labelledby="single-content">
                <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800/50 rounded-[2rem] overflow-hidden">
                  <div className="p-6 flex justify-between items-center">
                    <div className="pr-4">
                      <h3 className="font-semibold mb-1">Einzelinhalt-Erlaubnis</h3>
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        Erlaube geteilte Links, schließe danach direkt wieder (nur 1 Video).
                      </p>
                    </div>
                    <Switch
                      checked={config.singleContent?.allowOnlyOne ?? false}
                      onChange={(c) =>
                        updateConfig({
                          singleContent: {
                            ...(config.singleContent || { returnToPrevious: true, allowSharedLinks: true }),
                            allowOnlyOne: c,
                          },
                        })
                      }
                      ariaLabel="Einzelinhalt-Erlaubnis"
                    />
                  </div>
                </div>
              </section>

              <section aria-labelledby="anti-binge-title">
                <h2
                  id="anti-binge-title"
                  className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 px-2"
                >
                  Exzessiv-Nutzung verhindern
                </h2>
                <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800/50 rounded-[2rem] overflow-hidden">
                  <div className="p-6 border-b border-zinc-800/50 flex justify-between items-center">
                    <div className="pr-4">
                      <h3 className="font-semibold mb-1">Ketten-Öffnung blockieren</h3>
                      <p className="text-zinc-400 text-xs leading-relaxed">
                        Schützt dich, falls du eine App impulsiv immer wieder öffnest.
                      </p>
                    </div>
                    <Switch
                      checked={config.antiBinge.enabled}
                      onChange={(c) => updateConfig({ antiBinge: { ...config.antiBinge, enabled: c } })}
                      ariaLabel="Ketten-Öffnung blockieren aktivieren"
                    />
                  </div>

                  {config.antiBinge.enabled && (
                    <>
                      <div className="p-6 border-b border-zinc-800/50">
                        <div className="flex justify-between items-center mb-4">
                          <label htmlFor="warning-threshold" className="font-semibold">
                            Warnung nach
                          </label>
                          <span
                            className="text-zinc-400 text-sm font-mono bg-zinc-800/50 px-3 py-1 rounded-lg"
                            aria-hidden="true"
                          >
                            {config.antiBinge.warningThreshold}x in {config.antiBinge.warningTimeframe}m
                          </span>
                        </div>
                        <input
                          id="warning-threshold"
                          type="range"
                          min="2"
                          max="10"
                          step="1"
                          value={config.antiBinge.warningThreshold}
                          onChange={(e) =>
                            updateConfig({
                              antiBinge: { ...config.antiBinge, warningThreshold: parseInt(e.target.value) },
                            })
                          }
                          className="w-full accent-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                          aria-valuetext={`${config.antiBinge.warningThreshold} mal in ${config.antiBinge.warningTimeframe} Minuten`}
                        />
                      </div>
                      <div className="p-6">
                        <div className="flex justify-between items-center mb-4">
                          <label htmlFor="block-threshold" className="font-semibold text-red-400">
                            Sperre nach
                          </label>
                          <span
                            className="text-zinc-400 text-sm font-mono bg-zinc-800/50 px-3 py-1 rounded-lg"
                            aria-hidden="true"
                          >
                            {config.antiBinge.blockThreshold}x in {config.antiBinge.blockTimeframe}m
                          </span>
                        </div>
                        <input
                          id="block-threshold"
                          type="range"
                          min="3"
                          max="15"
                          step="1"
                          value={config.antiBinge.blockThreshold}
                          onChange={(e) =>
                            updateConfig({
                              antiBinge: { ...config.antiBinge, blockThreshold: parseInt(e.target.value) },
                            })
                          }
                          className="w-full accent-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                          aria-valuetext={`${config.antiBinge.blockThreshold} mal in ${config.antiBinge.blockTimeframe} Minuten`}
                        />
                      </div>
                    </>
                  )}
                </div>
              </section>
            </div>
          </details>

          <section>
            <button
              onClick={() => {
                updateState({ simulatedAppToOpen: appId });
                navigate('protection_flow');
              }}
              className="w-full py-4 rounded-[1.5rem] font-bold bg-zinc-100 text-zinc-950 flex items-center justify-center gap-3 shadow-lg shadow-zinc-100/10 active:scale-[0.98] transition-transform"
            >
              <Play size={20} className="fill-zinc-950" />
              App-Öffnen simulieren
            </button>
          </section>
        </div>
      </div>
    </motion.div>
  );
}

const ICONS: Record<string, LucideIcon> = { Shield, Briefcase, Coffee, Zap, Clock, Lock, Smartphone, Moon };

export function Rules({
  state,
  updateState,
  navigate,
}: {
  state: AppState;
  updateState: (u: Partial<AppState>) => void;
  navigate: (s: Screen) => void;
}) {
  const profiles = state.profiles || [];
  const activeProfileId = state.activeProfileId || 'default';

  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '', icon: 'Shield', color: 'text-emerald-400' });

  const switchProfile = (profileId: string) => {
    if (activeProfileId === profileId) return;

    // Speichere aktuelle Konfiguration im bisherigen Profil
    const updatedProfiles = profiles.map((p) =>
      p.id === activeProfileId ? { ...p, appsConfig: state.appsConfig } : p,
    );

    // Lade Konfiguration des neuen Profils
    const newProfile = updatedProfiles.find((p) => p.id === profileId);
    const newAppsConfig = newProfile?.appsConfig || {};

    // Stelle sicher, dass alle Apps zumindest eine Default-Konfiguration haben
    const mergedConfig = { ...newAppsConfig };
    SUPPORTED_APPS.forEach((app) => {
      if (!mergedConfig[app.id]) {
        mergedConfig[app.id] = state.appsConfig[app.id] || { id: app.id, ...DEFAULT_APP_CONFIG, active: false };
      }
    });

    updateState({
      profiles: updatedProfiles,
      activeProfileId: profileId,
      appsConfig: mergedConfig,
    });
  };

  const startCreate = () => {
    setIsCreating(true);
    setEditForm({ name: '', description: '', icon: 'Zap', color: 'text-indigo-400' });
  };

  const startEdit = (profileId: string) => {
    const p = profiles.find((p) => p.id === profileId);
    if (p) {
      setEditingProfileId(profileId);
      setEditForm({ name: p.name, description: p.description, icon: p.icon, color: p.color });
    }
  };

  const saveProfile = () => {
    if (!editForm.name.trim()) return;

    if (isCreating) {
      const newProfile = {
        id: 'custom_' + Date.now(),
        ...editForm,
        isCustom: true,
        appsConfig: { ...state.appsConfig }, // inherit current settings
      };
      updateState({ profiles: [...profiles, newProfile] });
    } else if (editingProfileId) {
      const updatedProfiles = profiles.map((p) => (p.id === editingProfileId ? { ...p, ...editForm } : p));
      updateState({ profiles: updatedProfiles });
    }

    setIsCreating(false);
    setEditingProfileId(null);
  };

  const deleteProfile = (profileId: string) => {
    const updatedProfiles = profiles.filter((p) => p.id !== profileId);
    const newConfigsAndProfile: Partial<AppState> = { profiles: updatedProfiles };

    if (activeProfileId === profileId) {
      const fallbackActive = updatedProfiles[0]?.id || 'gentle'; // fallback
      newConfigsAndProfile.activeProfileId = fallbackActive;
      const newProfile = updatedProfiles.find((p) => p.id === fallbackActive);
      const newAppsConfig = newProfile?.appsConfig || {};
      const mergedConfig = { ...newAppsConfig };
      SUPPORTED_APPS.forEach((app) => {
        if (!mergedConfig[app.id]) {
          mergedConfig[app.id] = state.appsConfig[app.id] || { id: app.id, ...DEFAULT_APP_CONFIG, active: false };
        }
      });
      newConfigsAndProfile.appsConfig = mergedConfig;
    }

    updateState(newConfigsAndProfile);
    setIsCreating(false);
    setEditingProfileId(null);
  };

  const cancelEdit = () => {
    setIsCreating(false);
    setEditingProfileId(null);
  };

  if (isCreating || editingProfileId) {
    const isEditingMode = !!editingProfileId;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-6 pb-32 flex flex-col h-full bg-zinc-950"
      >
        <Header title={isEditingMode ? 'Profil bearbeiten' : 'Neues Profil'} onBack={cancelEdit} />

        <div className="space-y-6 flex-1 overflow-y-auto scrollbar-hide py-4">
          <div className="space-y-4">
            <div>
              <label className="text-zinc-400 text-sm font-semibold mb-2 block">Name des Profils</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="z.B. Nur Lesen"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-zinc-400 text-sm font-semibold mb-2 block">Beschreibung</label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Kurze Beschreibung..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 h-24 resize-none"
              />
            </div>

            <div>
              <label className="text-zinc-400 text-sm font-semibold mb-2 block">Symbol wählen</label>
              <div className="flex gap-3 flex-wrap">
                {Object.keys(ICONS).map((iconName) => {
                  const IconComp = ICONS[iconName];
                  return (
                    <button
                      key={iconName}
                      onClick={() => setEditForm({ ...editForm, icon: iconName })}
                      aria-label={`Symbol ${iconName} wählen`}
                      aria-pressed={editForm.icon === iconName}
                      className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${editForm.icon === iconName ? 'bg-zinc-700 text-zinc-100 scale-110 shadow-lg' : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'}`}
                    >
                      <IconComp size={24} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-zinc-400 text-sm font-semibold mb-2 block">Farbe wählen</label>
              <div className="flex gap-3 flex-wrap">
                {[
                  'text-emerald-400',
                  'text-blue-400',
                  'text-indigo-400',
                  'text-amber-400',
                  'text-red-500',
                  'text-fuchsia-400',
                  'text-cyan-400',
                  'text-lime-400',
                ].map((color) => (
                  <button
                    key={color}
                    onClick={() => setEditForm({ ...editForm, color })}
                    aria-label={`Farbe ${color.replace('text-', '')} wählen`}
                    aria-pressed={editForm.color === color}
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${editForm.color === color ? 'bg-zinc-700 scale-110 shadow-lg' : 'bg-zinc-900 hover:bg-zinc-800'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-current ${color}`} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 flex gap-3">
          {isEditingMode && (
            <button
              onClick={() => deleteProfile(editingProfileId)}
              className="w-14 h-14 bg-red-500/10 text-red-400 rounded-[1.5rem] flex items-center justify-center active:scale-95 transition-transform"
            >
              <Trash2 size={24} />
            </button>
          )}
          <button
            disabled={!editForm.name.trim()}
            onClick={saveProfile}
            className="flex-1 bg-emerald-500 text-emerald-950 font-bold py-4 rounded-[1.5rem] flex justify-center items-center gap-2 disabled:opacity-50 disabled:active:scale-100 active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
          >
            <Save size={20} className="fill-emerald-950" /> Speichern
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-6 pb-32 flex flex-col h-full bg-zinc-950"
    >
      <Header title="Regeln & Modi" onBack={() => navigate('dashboard')} />

      <div className="space-y-8 flex-1 overflow-y-auto scrollbar-hide">
        <section aria-labelledby="profiles-title">
          <div className="flex justify-between items-center mb-4 px-2">
            <h2 id="profiles-title" className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
              Fokus-Profile
            </h2>
            <button
              onClick={startCreate}
              className="w-11 h-11 flex items-center justify-center text-emerald-400 bg-emerald-500/10 rounded-xl hover:bg-emerald-500/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              aria-label="Neues Profil erstellen"
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="space-y-3" role="radiogroup" aria-labelledby="profiles-title">
            {profiles.map((profile) => {
              const Icon = ICONS[profile.icon] || Shield;
              const isActive = activeProfileId === profile.id;
              return (
                <div
                  key={profile.id}
                  className={`w-full flex items-center rounded-[1.5rem] border transition-all overflow-hidden ${isActive ? 'bg-zinc-900/90 border-zinc-700 shadow-xl shadow-black/20' : 'bg-zinc-950/80 border-zinc-800/80 hover:bg-zinc-900'}`}
                >
                  <button
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => switchProfile(profile.id)}
                    className="flex-1 min-w-0 flex items-center justify-between p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 min-h-[88px]"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div
                        className={`w-12 h-12 rounded-2xl flex flex-shrink-0 items-center justify-center shadow-inner ${isActive ? 'bg-zinc-800' : 'bg-zinc-900'} ${profile.color}`}
                        aria-hidden="true"
                      >
                        <Icon size={24} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="font-semibold text-zinc-100 flex items-center gap-2">
                          {profile.name}
                          {profile.isCustom && (
                            <span className="bg-zinc-800 text-zinc-400 text-[9px] px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                              Custom
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-400 mt-1 leading-relaxed line-clamp-2">
                          {profile.description}
                        </div>
                      </div>
                    </div>
                    <div
                      className={`ml-3 w-6 h-6 flex-shrink-0 rounded-full border flex items-center justify-center ${isActive ? 'bg-zinc-100 border-zinc-100 text-zinc-950' : 'border-zinc-700'}`}
                      aria-hidden="true"
                    >
                      {isActive && <Check size={14} strokeWidth={3} />}
                    </div>
                  </button>
                  {profile.isCustom && (
                    <button
                      onClick={() => startEdit(profile.id)}
                      aria-label={`Profil ${profile.name} bearbeiten`}
                      className="w-11 h-11 mr-4 flex-shrink-0 rounded-full flex items-center justify-center bg-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    >
                      <Edit3 size={16} aria-hidden="true" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </motion.div>
  );
}

export function Settings({
  state,
  updateState,
  resetApp: _resetApp,
  navigate,
}: {
  state: AppState;
  updateState: (u: Partial<AppState>) => void;
  resetApp: () => void;
  navigate: (s: Screen) => void;
}) {
  const updateNotification = (key: keyof typeof state.settings.notifications, value: boolean) => {
    updateState({ settings: { ...state.settings, notifications: { ...state.settings.notifications, [key]: value } } });
  };

  const SectionHeader = ({ title, id }: { title: string; id?: string }) => (
    <h2 id={id} className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 px-2 mt-8 first:mt-0">
      {title}
    </h2>
  );

  const SettingRow = ({
    icon: Icon,
    label,
    value,
    onClick,
    rightElement,
    description,
    id,
  }: {
    icon: LucideIcon;
    label: string;
    value?: string;
    onClick?: () => void;
    rightElement?: React.ReactNode;
    description?: string;
    id?: string;
  }) => {
    const content = (
      <>
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-3">
            <div className="text-zinc-400" aria-hidden="true">
              <Icon size={18} />
            </div>
            <span id={id ? `${id}-label` : undefined} className="font-semibold text-zinc-200">
              {label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {value && <span className="text-zinc-500 text-sm font-medium">{value}</span>}
            {rightElement}
            {onClick && !rightElement && <ChevronRight size={18} className="text-zinc-600" aria-hidden="true" />}
          </div>
        </div>
        {description && (
          <div id={id ? `${id}-desc` : undefined} className="text-xs text-zinc-500 mt-1 ml-8">
            {description}
          </div>
        )}
      </>
    );

    if (onClick && !rightElement) {
      return (
        <button
          onClick={onClick}
          className="w-full p-4 border-b border-zinc-800/50 flex flex-col justify-center text-left transition-colors last:border-0 hover:bg-zinc-800/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[48px]"
          aria-labelledby={id ? `${id}-label` : undefined}
          aria-describedby={id && description ? `${id}-desc` : undefined}
        >
          {content}
        </button>
      );
    }

    return (
      <div
        className="w-full p-4 border-b border-zinc-800/50 flex flex-col justify-center text-left transition-colors last:border-0"
        aria-labelledby={id ? `${id}-label` : undefined}
        aria-describedby={id && description ? `${id}-desc` : undefined}
      >
        {content}
      </div>
    );
  };

  const Toggle = ({ checked, onChange, ariaLabel }: { checked: boolean; onChange: () => void; ariaLabel?: string }) => (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className="w-11 h-11 flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-full"
    >
      <span
        className={`block w-10 h-6 rounded-full p-1 transition-colors ${checked ? 'bg-emerald-500' : 'bg-zinc-700'}`}
        aria-hidden="true"
      >
        <span
          className={`block w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`}
        />
      </span>
    </button>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 pb-32">
      <Header title="Einstellungen" />

      <div className="space-y-2">
        {/* 1. Allgemein */}
        <section aria-labelledby="settings-general">
          <SectionHeader id="settings-general" title="Allgemein" />
          <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800/50 rounded-[2rem] overflow-hidden shadow-lg">
            <SettingRow icon={Globe} label="Sprache" value={state.settings.language === 'de' ? 'Deutsch' : 'English'} />
            <SettingRow icon={Home} label="Startscreen" value="Dashboard" />
            <SettingRow
              icon={Smartphone}
              label="App-Name (Intern)"
              value={state.settings.internalAppName}
              description="Name, der im System angezeigt wird"
            />
          </div>
        </section>

        {/* 2. Schutz */}
        <section aria-labelledby="settings-protection">
          <SectionHeader id="settings-protection" title="Schutz & Limits" />
          <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800/50 rounded-[2rem] overflow-hidden shadow-lg">
            <SettingRow icon={Shield} label="Standard-Schutzprofil" value="Standard" />
            <SettingRow icon={Clock} label="Standard-Verzögerung" value={`${state.settings.defaultDelay} Sek.`} />
            <SettingRow
              icon={AlertTriangle}
              label="Standard-Notfallfreigabe"
              value={`${state.settings.defaultEmergencyUnlock} Min.`}
            />
            <SettingRow icon={Clock} label="Fokusmodus-Voreinstellungen" value="15, 30, 45, 60 Min." />
          </div>
        </section>

        {/* 3. Benachrichtigungen */}
        <section aria-labelledby="settings-notifications">
          <SectionHeader id="settings-notifications" title="Benachrichtigungen" />
          <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800/50 rounded-[2rem] overflow-hidden shadow-lg">
            <SettingRow
              id="notif-focus"
              icon={Bell}
              label="Fokus-Erinnerungen"
              rightElement={
                <Toggle
                  ariaLabel="Fokus-Erinnerungen"
                  checked={state.settings.notifications.focusReminders}
                  onChange={() => updateNotification('focusReminders', !state.settings.notifications.focusReminders)}
                />
              }
            />
            <SettingRow
              id="notif-evening"
              icon={Moon}
              label="Abend-Erinnerung"
              rightElement={
                <Toggle
                  ariaLabel="Abend-Erinnerung"
                  checked={state.settings.notifications.eveningReminder}
                  onChange={() => updateNotification('eveningReminder', !state.settings.notifications.eveningReminder)}
                />
              }
            />
            <SettingRow
              id="notif-relapse"
              icon={AlertTriangle}
              label="Rückfall-Warnung"
              rightElement={
                <Toggle
                  ariaLabel="Rückfall-Warnung"
                  checked={state.settings.notifications.relapseWarning}
                  onChange={() => updateNotification('relapseWarning', !state.settings.notifications.relapseWarning)}
                />
              }
            />
            <SettingRow
              id="notif-daily"
              icon={BellRing}
              label="Tageszusammenfassung"
              rightElement={
                <Toggle
                  ariaLabel="Tageszusammenfassung"
                  checked={state.settings.notifications.dailySummary}
                  onChange={() => updateNotification('dailySummary', !state.settings.notifications.dailySummary)}
                />
              }
            />
            <SettingRow
              id="notif-weekly"
              icon={BellRing}
              label="Wochenrückblick"
              rightElement={
                <Toggle
                  ariaLabel="Wochenrückblick"
                  checked={state.settings.notifications.weeklyReview}
                  onChange={() => updateNotification('weeklyReview', !state.settings.notifications.weeklyReview)}
                />
              }
            />
          </div>
        </section>

        {/* 4. Daten & 5. Datenschutz */}
        <section aria-labelledby="settings-account-sync">
          <SectionHeader id="settings-account-sync" title="Konto & Sync" />
          <div className="overflow-hidden rounded-[2rem] border border-emerald-500/25 bg-emerald-500/10 shadow-lg">
            <div className="p-5">
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-400/25 bg-emerald-400/10 text-emerald-300">
                  <Cloud size={18} aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-emerald-100">Kein Account in Version 1</h3>
                  <p className="text-xs text-emerald-200/75">Kein Login, kein Cloud-Sync, keine Social-Verbindung.</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-emerald-100/80">
                Du musst dich nicht mit Instagram, TikTok, YouTube oder einem ScrollShield-Konto verbinden. Alles, was
                du einstellst, bleibt lokal auf diesem Geraet.
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="settings-privacy">
          <SectionHeader id="settings-privacy" title="Daten & Datenschutz" />
          <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800/50 rounded-[2rem] overflow-hidden shadow-lg">
            <SettingRow
              icon={Shield}
              label="Datenschutz & Transparenz"
              onClick={() => navigate('privacy')}
              description="Lokale Daten, Berechtigungen & App-Reset"
            />
          </div>
        </section>

        {/* 6. Hilfe */}
        <section aria-labelledby="settings-help">
          <SectionHeader id="settings-help" title="Hilfe & Info" />
          <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800/50 rounded-[2rem] overflow-hidden shadow-lg">
            <SettingRow icon={Shield} label="Berechtigungsstatus" onClick={() => navigate('permissions')} />
            <SettingRow
              icon={HelpCircle}
              label="Support & Kontakt"
              onClick={() => navigate('support')}
              description="FAQ, Feedback, Problem melden"
            />
            <SettingRow
              icon={Info}
              label="App-Version"
              value={`${__APP_VERSION__}${import.meta.env.DEV ? ' (Entwicklung)' : ''}`}
              onClick={
                import.meta.env.DEV
                  ? () => {
                      const debugWindow = window as Window & { debugTapCount?: number };
                      const count = debugWindow.debugTapCount || 0;
                      if (count >= 4) {
                        debugWindow.debugTapCount = 0;
                        navigate('debug' as Screen);
                      } else {
                        debugWindow.debugTapCount = count + 1;
                      }
                    }
                  : undefined
              }
            />
          </div>
        </section>
      </div>
    </motion.div>
  );
}

export function Help({ navigate }: { navigate: (s: Screen) => void }) {
  const [openSection, setOpenSection] = useState<string | null>('start');

  const toggleSection = (id: string) => {
    setOpenSection(openSection === id ? null : id);
  };

  const AccordionItem = ({
    id,
    icon: Icon,
    title,
    children,
  }: {
    id: string;
    icon: LucideIcon;
    title: string;
    children: React.ReactNode;
  }) => {
    const isOpen = openSection === id;
    return (
      <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-[1.5rem] overflow-hidden transition-colors hover:bg-zinc-900/80">
        <button
          onClick={() => toggleSection(id)}
          className="w-full p-5 flex items-center justify-between text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[48px]"
          aria-expanded={isOpen}
          aria-controls={`sect-${id}`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isOpen ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}
              aria-hidden="true"
            >
              <Icon size={18} />
            </div>
            <span className="font-semibold text-zinc-200">{title}</span>
          </div>
          {isOpen ? (
            <ChevronUp size={18} className="text-zinc-500" aria-hidden="true" />
          ) : (
            <ChevronDown size={18} className="text-zinc-500" aria-hidden="true" />
          )}
        </button>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              id={`sect-${id}`}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-5 pt-0 text-sm text-zinc-400 leading-relaxed border-t border-zinc-800/50 mt-2">
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-6 pb-32 flex flex-col h-full bg-zinc-950"
    >
      <Header title="Hilfe & FAQ" onBack={() => navigate('support')} />

      <div className="space-y-3 flex-1 overflow-y-auto scrollbar-hide mt-2">
        <AccordionItem id="start" icon={Star} title="Tipps für einen guten Start">
          <p className="mb-3">
            Willkommen bei ScrollShield. Das Ziel ist nicht, dein Handy unbrauchbar zu machen, sondern dir die Kontrolle
            zurückzugeben.
          </p>
          <ul className="list-disc pl-4 space-y-2">
            <li>
              <strong>Weniger ist mehr:</strong> Wähle anfangs nur 1-2 Apps aus, die dir wirklich Zeit rauben (z.B.
              Instagram oder TikTok).
            </li>
            <li>
              <strong>Sanft starten:</strong> Nutze das Profil "Sanfter Start". Eine kurze Verzögerung von 5 Sekunden
              reicht oft schon, um einen unbewussten Impuls zu brechen.
            </li>
            <li>
              <strong>Nicht frustrieren lassen:</strong> Wenn du eine App wirklich brauchst, nutze die Notfallfreigabe.
              Bewusster Konsum ist besser als radikaler Entzug.
            </li>
          </ul>
        </AccordionItem>

        <AccordionItem id="modes" icon={Shield} title="Schutzprofile & Verzögerung">
          <p className="mb-3">
            ScrollShield arbeitet mit vorgefertigten Profilen, die bestimmen, wie streng Apps blockiert werden.
          </p>
          <ul className="list-disc pl-4 space-y-2">
            <li>
              <strong>Die Öffnungsverzögerung:</strong> Das Herzstück der App. Bevor sich eine geschützte App öffnet,
              läuft ein kurzer Timer ab. Das stoppt den "Autopiloten" in deinem Gehirn.
            </li>
            <li>
              <strong>Tageslimits:</strong> Jedes Profil hat ein Limit (z.B. 30 Minuten). Ist dieses erreicht, wird die
              App für den Rest des Tages blockiert.
            </li>
            <li>
              <strong>Profilwechsel:</strong> Du kannst jederzeit zwischen Profilen (z.B. "Arbeit" oder "Schlaf")
              wechseln, um die Strenge an deinen Alltag anzupassen.
            </li>
          </ul>
        </AccordionItem>

        <AccordionItem id="focus" icon={Play} title="Fokus-Sitzungen">
          <p>Der Fokus-Modus ist für Phasen tiefer Konzentration (Deep Work) gedacht.</p>
          <p className="mt-2">
            Wenn du eine Fokus-Sitzung startest (z.B. für 45 Minuten), wendet ScrollShield auf alle ausgewählten Apps
            die strengste verfügbare Einschränkung an. Eine Notfallfreigabe bleibt nach einer längeren Wartezeit
            möglich. Nutze diesen Modus zum Lernen oder Arbeiten.
          </p>
        </AccordionItem>

        <AccordionItem id="emergency" icon={AlertTriangle} title="Die Notfallfreigabe">
          <p>
            Manchmal muss man einfach kurz eine Nachricht checken oder etwas nachsehen. Dafür gibt es die
            Notfallfreigabe.
          </p>
          <p className="mt-2">
            Wenn eine App blockiert ist, kannst du sie für wenige Minuten (meist 5 Min.) freischalten. Dies erfordert
            jedoch eine bewusste Bestätigung. In sehr strengen Profilen (wie "Schlaf schützen") ist diese Funktion
            deaktiviert.
          </p>
        </AccordionItem>

        <AccordionItem id="permissions" icon={Lock} title="Berechtigungen & Privatsphäre">
          <p className="mb-3">Um dich zu schützen, muss ScrollShield wissen, wann du eine App öffnest.</p>
          <ul className="list-disc pl-4 space-y-2">
            <li>
              <strong>Warum diese Rechte?</strong> Wir nutzen System-APIs (wie Screen Time oder Nutzungsdaten), um den
              Start einer App zu erkennen und das Blockier-Fenster darüberzulegen.
            </li>
            <li>
              <strong>Deine Daten:</strong> Diese Berechtigungen werden <em>ausschließlich</em> für die Blockier-Logik
              verwendet. Wir lesen keine Chats, sehen keine Passwörter und senden keine Nutzungsdaten an unsere Server.
              Alles bleibt lokal auf deinem Gerät.
            </li>
          </ul>
        </AccordionItem>

        <AccordionItem id="platform" icon={Smartphone} title="iOS vs. Android">
          <p>ScrollShield funktioniert auf beiden Plattformen, nutzt aber unterschiedliche Techniken.</p>
          <p className="mt-2">
            <strong>Apple (iOS):</strong> Nutzt die offizielle Screen Time API. Das ist sehr sicher und akkuschonend,
            erlaubt aber keine direkten "Overlays" über anderen Apps. Wir nutzen stattdessen System-Schilder.
          </p>
          <p className="mt-2">
            <strong>Android:</strong> Nutzt Nutzungsdatenzugriff, um die Vordergrund-App zu erkennen, und optional
            Overlay-Rechte für eigene Schutzbildschirme. Zusätzliche Bedienhilfen-Schnittstellen sind für die
            Release-Version nicht vorgesehen.
          </p>
        </AccordionItem>
      </div>
    </motion.div>
  );
}

export function PrivacyScreen({
  state,
  updateState,
  resetApp,
  navigate,
}: {
  state: AppState;
  updateState: (u: Partial<AppState>) => void;
  resetApp: () => void;
  navigate: (s: Screen) => void;
}) {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showHistoryConfirm, setShowHistoryConfirm] = useState(false);
  const [showStatsConfirm, setShowStatsConfirm] = useState(false);
  const [showDetailedPolicy, setShowDetailedPolicy] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const clearHistory = () => {
    updateState({ history: [] });
    setShowHistoryConfirm(false);
  };

  const clearStats = () => {
    updateState({
      dailyStats: {},
      stats: { currentStreak: 0, bestStreak: 0, totalSavedTime: 0, focusStreak: 0, cleanDaysStreak: 0 },
    });
    setShowStatsConfirm(false);
  };

  const exportLocalData = () => {
    const exportData = createScrollShieldExport(state, { appVersion: __APP_VERSION__ });
    const blob = new Blob([serializeScrollShieldExport(exportData)], { type: 'application/json' });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = objectUrl;
    link.download = createExportFilename();
    link.click();
    URL.revokeObjectURL(objectUrl);
  };

  const importLocalData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (file.size > MAX_IMPORT_BYTES) {
      setImportStatus({ type: 'error', message: 'Die Importdatei ist größer als 5 MB.' });
      return;
    }

    try {
      const imported = parseScrollShieldExport(await file.text());
      const normalized = normalizeAppState({
        ...state,
        ...imported.state,
        operatingSystem: state.operatingSystem,
        permissions: state.permissions,
        activeSession: null,
        simulatedAppToOpen: null,
      });

      updateState(normalized);
      setImportStatus({ type: 'success', message: 'Lokale Daten wurden erfolgreich importiert.' });
    } catch (error) {
      setImportStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Die Importdatei konnte nicht gelesen werden.',
      });
    }
  };

  if (showDetailedPolicy) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="p-6 pb-32 flex flex-col h-full bg-zinc-950 absolute inset-0 z-50"
      >
        <Header title="Datenschutzerklärung" onBack={() => setShowDetailedPolicy(false)} />
        <div className="space-y-6 flex-1 overflow-y-auto scrollbar-hide text-zinc-300 leading-relaxed mt-4">
          <div>
            <h3 className="text-lg font-bold text-zinc-100 mb-2">Präambel</h3>
            <p className="text-sm text-zinc-400">
              Wir haben ScrollShield entwickelt, um dir die Kontrolle über deine Zeit zurückzugeben – nicht, um deine
              Daten zu sammeln. Diese Erklärung zeigt in einfachen Worten, was mit deinen Daten passiert. Die
              Kurzfassung: Was auf deinem Gerät passiert, bleibt auf deinem Gerät.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-bold text-zinc-100 mb-2">1. Lokale Daten</h3>
            <p className="text-sm text-zinc-400">
              ScrollShield speichert, wie oft du Apps öffnest, wie oft du blockiert wurdest und wie viel Zeit du gespart
              hast. Diese Daten werden <strong>ausschließlich lokal</strong> in der sicheren Sandbox deines Smartphones
              gespeichert.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-bold text-zinc-100 mb-2">2. Keine Server-Übertragung</h3>
            <p className="text-sm text-zinc-400">
              Wir übertragen aktuell keinerlei Nutzungsdaten, App-Historien oder Statistiken an unsere Server. Wir haben
              keinen Zugriff auf dein Verhalten.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-bold text-zinc-100 mb-2">3. Systemberechtigungen</h3>
            <p className="text-sm text-zinc-400 mb-2">
              Um zu funktionieren, benötigt ScrollShield bestimmte Systemrechte. Wir nutzen diese streng zweckgebunden:
            </p>
            <ul className="list-disc pl-4 text-sm text-zinc-400 space-y-1">
              <li>
                <strong>App-Nutzungsdaten / Screen Time:</strong> Wird ausschließlich genutzt, um den Start einer von
                dir ausgewählten App zu erkennen und den Timer auszulösen.
              </li>
              <li>
                <strong>Bildschirm-Überlagerung:</strong> Wird genutzt, um den Verzögerungs-Timer über der ablenkenden
                App anzuzeigen.
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold text-zinc-100 mb-2">4. Kein Tracking & Keine Werbung</h3>
            <p className="text-sm text-zinc-400">
              ScrollShield nutzt keine Tracking-Tools von Drittanbietern, um dein Verhalten über andere Apps hinweg für
              Werbezwecke zu verfolgen. Es gibt keine Werbung und keine Datenweitergabe an Datenbroker oder
              Werbenetzwerke.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-bold text-zinc-100 mb-2">5. Datenlöschung</h3>
            <p className="text-sm text-zinc-400">
              Da deine Daten lokal gespeichert sind, hast du die volle Kontrolle. Ein Klick auf "App komplett
              zurücksetzen" oder die Deinstallation der App löscht alle Daten unwiderruflich von deinem Gerät.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-6 pb-32 flex flex-col h-full bg-zinc-950"
    >
      <Header title="Datenschutz & Transparenz" onBack={() => navigate('settings')} />

      <div className="space-y-6 flex-1 overflow-y-auto scrollbar-hide">
        {/* Intro */}
        <div className="text-center py-4">
          <div
            className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20"
            aria-hidden="true"
          >
            <Shield size={32} className="text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-zinc-100 mb-2">Deine Daten gehören dir.</h2>
          <p className="text-sm text-zinc-400 leading-relaxed max-w-[280px] mx-auto">
            ScrollShield arbeitet mit sensiblen Nutzungsdaten. Wir glauben an absolute Transparenz und lokale Kontrolle.
          </p>
        </div>

        {/* 1. Datenübersicht */}
        <section aria-labelledby="privacy-data-overview">
          <h2
            id="privacy-data-overview"
            className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 px-2"
          >
            Was wir speichern
          </h2>
          <div className="bg-zinc-900/80 border border-zinc-800/50 rounded-[2rem] p-5 space-y-4">
            <div className="flex items-start gap-3">
              <Database size={18} className="text-blue-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <div>
                <h3 className="font-semibold text-zinc-200 text-sm mb-1">Lokal auf deinem Gerät</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Dein Nutzungsverlauf, deine Statistiken und deine App-Regeln werden ausschließlich auf diesem Gerät
                  gespeichert.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Cloud size={18} className="text-zinc-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <div>
                <h3 className="font-semibold text-zinc-200 text-sm mb-1">Was nicht gesendet wird</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Wir senden keine Nutzungsdaten an externe Server. Dein Verhalten bleibt strikt privat auf deinem
                  Gerät.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Berechtigungen */}
        <section aria-labelledby="privacy-permissions">
          <h2 id="privacy-permissions" className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 px-2">
            Warum Berechtigungen?
          </h2>
          <div className="bg-zinc-900/80 border border-zinc-800/50 rounded-[2rem] p-5 space-y-4">
            <p className="text-xs text-zinc-400 leading-relaxed">
              Um dich vor impulsivem Öffnen zu schützen, muss ScrollShield erkennen können, wann du eine bestimmte App
              startest. Dafür benötigen wir Systemberechtigungen (wie Screen Time oder Nutzungsdatenzugriff). Diese
              Rechte werden <strong className="text-zinc-300">ausschließlich</strong> für die Blockier-Logik verwendet,
              nicht um dich auszuspionieren.
            </p>
          </div>
        </section>

        {/* 2.5 Ausführliche Erklärung */}
        <section aria-label="Ausführliche Datenschutzerklärung">
          <button
            onClick={() => setShowDetailedPolicy(true)}
            className="w-full bg-zinc-900/80 border border-zinc-800/50 rounded-[1.5rem] p-5 flex items-center justify-between hover:bg-zinc-800/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[48px]"
          >
            <div className="flex items-center gap-3">
              <Info size={18} className="text-zinc-400" aria-hidden="true" />
              <span className="font-semibold text-zinc-200 text-sm">Ausführliche Datenschutzerklärung</span>
            </div>
            <ChevronRight size={18} className="text-zinc-500" aria-hidden="true" />
          </button>
          <a
            href="/privacy.html"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 w-full bg-zinc-900/60 border border-zinc-800/50 rounded-[1.5rem] p-5 flex items-center justify-between hover:bg-zinc-800/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[48px]"
          >
            <div className="flex items-center gap-3">
              <Globe size={18} className="text-zinc-400" aria-hidden="true" />
              <span className="font-semibold text-zinc-200 text-sm">Öffentliche Datenschutzseite</span>
            </div>
            <ChevronRight size={18} className="text-zinc-500" aria-hidden="true" />
          </a>
        </section>

        {/* 3. Kontrolle & Löschen */}
        <section aria-labelledby="privacy-data-management">
          <h2
            id="privacy-data-management"
            className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 px-2"
          >
            Lokale Daten verwalten
          </h2>
          <div className="bg-zinc-900/80 border border-zinc-800/50 rounded-[2rem] overflow-hidden">
            <button
              onClick={exportLocalData}
              className="w-full p-5 flex items-center justify-between border-b border-zinc-800/50 hover:bg-zinc-800/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[48px]"
            >
              <div>
                <div className="font-semibold text-zinc-200 text-sm">Lokale Daten exportieren</div>
                <div className="text-xs text-zinc-500 mt-1">Speichert Regeln, Verlauf und Statistiken als JSON.</div>
              </div>
              <Download size={18} className="text-zinc-500" aria-hidden="true" />
            </button>

            <label className="w-full p-5 flex items-center justify-between border-b border-zinc-800/50 hover:bg-zinc-800/40 transition-colors text-left cursor-pointer focus-within:ring-2 focus-within:ring-emerald-500 min-h-[48px]">
              <div>
                <div className="font-semibold text-zinc-200 text-sm">Lokale Daten importieren</div>
                <div className="text-xs text-zinc-500 mt-1">
                  Stellt Regeln, Verlauf und Statistiken aus JSON wieder her.
                </div>
              </div>
              <Upload size={18} className="text-zinc-500" aria-hidden="true" />
              <input
                type="file"
                accept="application/json,.json"
                onChange={importLocalData}
                className="sr-only"
                aria-label="ScrollShield JSON-Export importieren"
              />
            </label>

            {importStatus && (
              <div
                role={importStatus.type === 'error' ? 'alert' : 'status'}
                className={`px-5 py-3 text-xs border-b ${
                  importStatus.type === 'error'
                    ? 'text-red-300 bg-red-500/10 border-red-500/20'
                    : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20'
                }`}
              >
                {importStatus.message}
              </div>
            )}

            {/* Verlauf löschen */}
            {showHistoryConfirm ? (
              <div className="p-5 bg-amber-500/10 border-b border-amber-500/20" role="alert">
                <p className="text-sm text-amber-400 mb-3 font-medium text-center">Nutzungsverlauf wirklich löschen?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowHistoryConfirm(false)}
                    className="flex-1 py-2 bg-zinc-800 text-zinc-300 rounded-xl text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 min-h-[44px]"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={clearHistory}
                    className="flex-1 py-2 bg-amber-500 text-amber-950 rounded-xl text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 min-h-[44px]"
                  >
                    Ja, leeren
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowHistoryConfirm(true)}
                className="w-full p-5 flex items-center justify-between border-b border-zinc-800/50 hover:bg-zinc-800/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[48px]"
              >
                <div>
                  <div className="font-semibold text-zinc-200 text-sm">Verlauf leeren</div>
                  <div className="text-xs text-zinc-500 mt-1">Löscht die Historie der blockierten Apps.</div>
                </div>
                <RefreshCw size={18} className="text-zinc-500" aria-hidden="true" />
              </button>
            )}

            {/* Statistiken zurücksetzen */}
            {showStatsConfirm ? (
              <div className="p-5 bg-amber-500/10 border-b border-amber-500/20" role="alert">
                <p className="text-sm text-amber-400 mb-3 font-medium text-center">
                  Alle Statistiken & Streaks auf 0 setzen?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowStatsConfirm(false)}
                    className="flex-1 py-2 bg-zinc-800 text-zinc-300 rounded-xl text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 min-h-[44px]"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={clearStats}
                    className="flex-1 py-2 bg-amber-500 text-amber-950 rounded-xl text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 min-h-[44px]"
                  >
                    Ja, zurücksetzen
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowStatsConfirm(true)}
                className="w-full p-5 flex items-center justify-between border-b border-zinc-800/50 hover:bg-zinc-800/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[48px]"
              >
                <div>
                  <div className="font-semibold text-zinc-200 text-sm">Statistiken zurücksetzen</div>
                  <div className="text-xs text-zinc-500 mt-1">Setzt Streaks und gesparte Zeit auf null.</div>
                </div>
                <RefreshCw size={18} className="text-zinc-500" aria-hidden="true" />
              </button>
            )}

            {/* App zurücksetzen */}
            {showResetConfirm ? (
              <div className="p-5 bg-red-500/10" role="alert">
                <p className="text-sm text-red-400 mb-3 font-medium text-center">
                  App auf Werkseinstellungen zurücksetzen?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 py-2 bg-zinc-800 text-zinc-300 rounded-xl text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 min-h-[44px]"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={() => {
                      resetApp();
                      setShowResetConfirm(false);
                    }}
                    className="flex-1 py-2 bg-red-500 text-white rounded-xl text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 min-h-[44px]"
                  >
                    Ja, Reset
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="w-full p-5 flex items-center justify-between hover:bg-zinc-800/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 min-h-[48px]"
              >
                <div>
                  <div className="font-semibold text-red-400 text-sm">App zurücksetzen</div>
                  <div className="text-xs text-zinc-500 mt-1">Löscht alle Regeln, Profile und lokale Daten.</div>
                </div>
                <AlertTriangle size={18} className="text-red-400" aria-hidden="true" />
              </button>
            )}
          </div>
        </section>
      </div>
    </motion.div>
  );
}
