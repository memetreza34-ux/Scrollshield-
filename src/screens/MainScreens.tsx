import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Shield,
  Smartphone,
  Settings,
  PieChart,
  Play,
  AlertTriangle,
  Clock,
  Activity,
  CheckCircle2,
  XCircle,
  Target,
  CloudOff,
} from 'lucide-react';
import { AppState, Screen, SUPPORTED_APPS } from '../types';
import { Header } from '../components/ui';
import { getReelsStatsForDate } from '../lib/stats';
import { deriveInsights } from '../lib/insights';
import { createFocusEndUpdate } from '../lib/focus';
import { getActiveReelsCount, REELS_PLATFORM_IDS } from '../lib/appUtils';

export function Dashboard({
  state,
  updateState,
  navigate,
}: {
  state: AppState;
  updateState: (u: Partial<AppState>) => void;
  navigate: (s: Screen) => void;
}) {
  const protectedApps = Object.values(state.appsConfig).filter((a) => a.active);
  const activeAppsCount = protectedApps.length;

  const activeReelsCount = getActiveReelsCount(state.appsConfig);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todaysHistory = state.history.filter((e) => e.timestamp >= today.getTime());

  const blockedToday = todaysHistory.filter((e) => e.type === 'block' || e.type === 'warning').length;

  const savedTimeToday = blockedToday * 5; // Estimate 5 mins per block
  const hours = Math.floor(savedTimeToday / 60);
  const mins = savedTimeToday % 60;
  const timeString = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  const activeProfile = state.profiles?.find((p) => p.id === state.activeProfileId);
  const profileName = activeProfile?.name || 'Standard';

  // Problem App Detection
  const blockedByApp = todaysHistory
    .filter((e) => e.type === 'block' || e.type === 'warning')
    .reduce(
      (acc, curr) => {
        if (curr.appId) {
          acc[curr.appId] = (acc[curr.appId] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

  const mostBlockedAppId = Object.keys(blockedByApp).sort((a, b) => blockedByApp[b] - blockedByApp[a])[0];
  const problemApp = SUPPORTED_APPS.find((a) => a.id === mostBlockedAppId);

  // Motivation Card Quotes
  const quotes = [
    'Weniger Impulse, mehr Kontrolle.',
    'Kurze Unterbrechungen verhindern lange Sessions.',
    'Jede blockierte Spirale spart echte Zeit.',
  ];
  const randomQuote = quotes[new Date().getDate() % quotes.length];

  const { reelsTimeTodayMinutes, reelsBlockedSessions, singleItemsCount } = getReelsStatsForDate(state, today);

  // Statements derived from the user's own data; empty until there is evidence.
  const insights = deriveInsights(state);

  // Find riskiest reels app
  const riskiestReelsAppId =
    REELS_PLATFORM_IDS.find((id) => state.appsConfig[id]?.reelsProtection?.enabled) || 'tiktok';
  const riskiestReelsApp = SUPPORTED_APPS.find((a) => a.id === riskiestReelsAppId);

  // Greeting Status
  let greetingStatus = 'Heute unter Kontrolle';
  if (blockedToday > 10) greetingStatus = 'Achte heute auf impulsive Öffnungen';
  else if (state.isFocusModeActive) greetingStatus = 'Guter Fokus bisher';

  const renderSystemHealthBanner = () => {
    const { operatingSystem, permissions, hasCompletedOnboarding } = state;
    if (!hasCompletedOnboarding) return null;
    // In a browser there is neither Screen Time nor Usage Access, so warning
    // about a missing permission would be a false statement. The limits of the
    // web version are stated in the card above instead.
    if (operatingSystem === 'web') return null;

    let missingCritical = false;
    let warningText = '';

    if (operatingSystem === 'android') {
      if (!permissions.usageAccess || !permissions.backgroundActivity || !permissions.overlay) {
        missingCritical = true;
        warningText = 'Wichtige Android-Berechtigungen fehlen. Der Schutz kann jederzeit systembedingt ausfallen.';
      }
    } else if (operatingSystem === 'ios') {
      if (!permissions.screenTime) {
        missingCritical = true;
        warningText =
          'Der Bildschirmzeit-Zugriff ist inaktiv. ScrollShield kann deine Apps nicht rechtzeitig unterbrechen.';
      }
    }

    if (missingCritical) {
      return (
        <button
          onClick={() => navigate('permissions')}
          className="w-full text-left bg-amber-500/10 border border-amber-500/30 rounded-[1.5rem] p-4 flex gap-3 mb-4 cursor-pointer hover:bg-amber-500/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          aria-label="Warnung: Fehlende Berechtigungen. Tippe hier, um sie zu aktivieren."
        >
          <AlertTriangle className="text-amber-400 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <span className="block font-bold text-sm text-amber-400 mb-0.5">Schutzschild lückenhaft!</span>
            <p className="text-xs text-amber-300/80 leading-relaxed">{warningText} Tippe hier, um das zu beheben.</p>
          </div>
        </button>
      );
    }
    return null;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 pb-32 space-y-8">
      {/* 1. Premium Hero Area */}
      <header className="mt-4 mb-2">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3" aria-hidden="true">
            <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-inner">
              <Shield size={14} className="text-zinc-300" />
            </div>
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-500">ScrollShield</span>
          </div>
          <button
            onClick={() => navigate('settings')}
            aria-label="Einstellungen"
            className="w-11 h-11 -mt-1.5 -mr-1.5 rounded-full bg-zinc-900/50 border border-zinc-800/50 flex items-center justify-center hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <Settings size={14} className="text-zinc-400" />
          </button>
        </div>
        <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-zinc-50 mb-2 leading-tight">
          {greetingStatus}.
        </h1>
        <p className="text-zinc-400 text-sm" aria-live="polite">
          {blockedToday === 0
            ? 'Bereit für einen fokussierten Tag.'
            : `${blockedToday} unbewusste Impulse heute gestoppt.`}
        </p>
      </header>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.35 }}
        aria-label="Account- und Datenschutzstatus"
        className="relative overflow-hidden rounded-[1.5rem] border border-emerald-500/25 bg-emerald-500/10 p-4"
      >
        <div className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-emerald-400/20 blur-2xl" />
        <div className="relative flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-emerald-400/25 bg-emerald-400/10">
            <CloudOff size={18} className="text-emerald-300" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-emerald-100">Kein Account nötig</h2>
            <p className="mt-1 text-xs leading-relaxed text-emerald-200/80">
              Du verbindest hier keine Social-Media-Konten. ScrollShield läuft lokal in dieser Webapp; echte
              System-Sperren kommen später in der nativen App.
            </p>
          </div>
        </div>
      </motion.section>

      {renderSystemHealthBanner()}

      {/* 7. Focus Status (High Priority) */}
      {state.isFocusModeActive && (
        <section
          aria-labelledby="focus-status-title"
          className="bg-emerald-500/10 border border-emerald-500/30 rounded-[2rem] p-6 relative overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.15)]"
        >
          <div
            className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 blur-[50px] rounded-full"
            aria-hidden="true"
          />
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                aria-hidden="true"
              />
              <h2 id="focus-status-title" className="font-bold text-emerald-400 uppercase tracking-widest text-xs">
                Fokusmodus Aktiv
              </h2>
            </div>
            <div
              className="text-5xl font-mono font-bold tracking-tighter text-emerald-50 mt-2 mb-4"
              aria-live="polite"
              aria-label={`Noch ${state.focusTimeRemaining} Minuten`}
            >
              {state.focusTimeRemaining}
              <span className="text-2xl text-emerald-400/80" aria-hidden="true">
                m
              </span>
            </div>
            <button
              onClick={() => updateState(createFocusEndUpdate(state, false))}
              className="bg-emerald-950/50 hover:bg-emerald-900/50 text-emerald-400 border border-emerald-800/50 px-6 py-2.5 rounded-full text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px]"
            >
              Fokus beenden
            </button>
          </div>
        </section>
      )}

      {/* 2. Layer 1: App-Schutz */}
      <section aria-labelledby="app-protection-title" className="mb-8">
        <h2
          id="app-protection-title"
          className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-3 px-2 flex items-center gap-2"
        >
          <Smartphone size={14} /> App-Schutz
        </h2>

        {activeAppsCount === 0 ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-[1.5rem] p-6 text-center">
            <h3 className="font-bold text-emerald-400 mb-2">Keine Apps geschützt</h3>
            <p className="text-sm text-emerald-300/80 mb-4">Wähle Apps aus, um den Schutz zu aktivieren.</p>
            <button
              onClick={() => navigate('apps')}
              className="bg-emerald-500 text-emerald-950 px-6 py-2 rounded-full text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px]"
            >
              Apps auswählen
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800/50 rounded-[1.5rem] p-5 flex flex-col justify-between min-h-[110px]">
              <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Geschützte Apps</h3>
              <div className="text-3xl font-bold font-mono tracking-tighter mt-2 text-zinc-100">{activeAppsCount}</div>
            </div>
            <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800/50 rounded-[1.5rem] p-5 flex flex-col justify-between min-h-[110px]">
              <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Heute Blockiert</h3>
              <div className="text-3xl font-bold font-mono tracking-tighter mt-2 text-zinc-100">
                {blockedToday} <span className="text-sm text-zinc-500 font-sans">mal</span>
              </div>
            </div>
            <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800/50 rounded-[1.5rem] p-5 flex flex-col justify-between min-h-[110px]">
              <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                <Clock size={12} /> Gesparte Zeit
              </h3>
              <div className="text-3xl font-bold font-mono tracking-tighter mt-2 text-emerald-400">{timeString}</div>
            </div>
            <button
              onClick={() => navigate('rules')}
              className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800/50 rounded-[1.5rem] p-5 flex flex-col justify-between min-h-[110px] text-left hover:bg-zinc-800 transition-colors"
            >
              <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Schutzstufe</h3>
              <div className="mt-2">
                <span className="text-lg font-bold text-zinc-100 block">{profileName}</span>
                <span className="text-xs text-blue-400 font-medium">Profil ändern &rarr;</span>
              </div>
            </button>
          </div>
        )}
      </section>

      {/* 3. Layer 2: Kurzvideo-Schutz */}
      <section aria-labelledby="reels-protection-title" className="mb-8">
        <h2
          id="reels-protection-title"
          className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-3 px-2 flex items-center gap-2"
        >
          <Play size={14} /> Kurzvideo-Schutz
        </h2>

        <div
          className={`rounded-[1.5rem] p-5 border ${activeReelsCount > 0 ? 'bg-blue-500/10 border-blue-500/30' : 'bg-zinc-900/80 border-zinc-800/50'}`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {activeReelsCount > 0 ? (
                <Shield className="text-blue-400" size={20} />
              ) : (
                <AlertTriangle className="text-zinc-500" size={20} />
              )}
              <h3 className="font-bold text-lg text-zinc-100">{activeReelsCount > 0 ? 'Aktiv' : 'Inaktiv'}</h3>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-black/40 rounded-lg text-zinc-300">
              {activeReelsCount} / {REELS_PLATFORM_IDS.length} Apps
            </span>
          </div>

          {activeReelsCount > 0 ? (
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="bg-black/30 rounded-xl p-3 border border-zinc-800/50">
                <p className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase mb-1">Heute im Feed</p>
                <p className="text-xl font-bold font-mono text-zinc-100">
                  {reelsTimeTodayMinutes} <span className="text-xs text-zinc-500 font-sans">Min</span>
                </p>
              </div>
              <div className="bg-black/30 rounded-xl p-3 border border-zinc-800/50">
                <p className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase mb-1">Erlaubte Videos</p>
                <p className="text-xl font-bold font-mono text-zinc-100">{singleItemsCount}</p>
              </div>
              <div className="bg-black/30 rounded-xl p-3 border border-zinc-800/50">
                <p className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase mb-1">
                  Blockierte Sessions
                </p>
                <p className="text-xl font-bold font-mono text-zinc-100">{reelsBlockedSessions}</p>
              </div>
              {riskiestReelsApp && (
                <div className="bg-black/30 rounded-xl p-3 border border-zinc-800/50 flex flex-col justify-center">
                  <p className="text-[10px] text-red-400 font-bold tracking-widest uppercase mb-1 leading-tight">
                    Höchstes Risiko
                  </p>
                  <p className="text-sm font-bold text-zinc-200 flex items-center gap-1.5 break-words">
                    {riskiestReelsApp.name}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-2">
              <p className="text-sm text-zinc-400 mb-4">
                Schütze dich gezielt vor endlosen Feeds in Instagram, TikTok und YouTube.
              </p>
              <button
                onClick={() => navigate('reels_protection')}
                className="bg-blue-500 text-blue-950 px-5 py-2 rounded-full text-sm font-bold min-h-[44px]"
              >
                Kurzvideo-Schutz aktivieren
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 4. Statuskarten (Smart Insights) */}
      {(protectedApps.length > 0 || activeReelsCount > 0) && (
        <section aria-labelledby="status-cards-title" className="mb-8">
          <h2 id="status-cards-title" className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 px-2">
            Aktueller App-Status
          </h2>
          <div className="space-y-3">
            {SUPPORTED_APPS.filter((app) => state.appsConfig[app.id]?.active)
              .slice(0, 3)
              .map((app) => {
                const config = state.appsConfig[app.id];
                const reelsConfig = config.reelsProtection;
                let statusText = 'Normale Nutzung erlaubt';
                let statusColor = 'text-emerald-400';
                let bgColor = 'bg-emerald-500/10';

                if (reelsConfig && reelsConfig.enabled) {
                  if (reelsConfig.mode === 'block') {
                    statusText = 'Normale Nutzung erlaubt, Kurzvideos blockiert';
                    statusColor = 'text-blue-400';
                    bgColor = 'bg-blue-500/10';
                  } else if (reelsConfig.mode === 'limit') {
                    statusText = 'App erlaubt, Kurzvideo-Feed begrenzt';
                    statusColor = 'text-amber-400';
                    bgColor = 'bg-amber-500/10';
                  } else {
                    statusText = 'App erlaubt, Kurzvideo-Warnung aktiv';
                    statusColor = 'text-indigo-400';
                    bgColor = 'bg-indigo-500/10';
                  }
                }

                return (
                  <div
                    key={app.id}
                    className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800/50 rounded-2xl p-4 flex items-center gap-4"
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl shadow-inner ${app.color}`}
                    >
                      {app.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-zinc-100 text-sm mb-0.5">{app.name}</h3>
                      <div
                        className={`text-xs font-medium px-2 py-0.5 rounded-md inline-block ${bgColor} ${statusColor}`}
                      >
                        {statusText}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      )}

      {/* 5. Schnellaktionen */}
      <section aria-labelledby="quick-actions-title" className="space-y-3">
        <h2 id="quick-actions-title" className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 px-2">
          Schnellaktionen
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          {!state.isFocusModeActive && (
            <button
              onClick={() => navigate('focus')}
              className="w-full bg-gradient-to-r from-emerald-900/40 to-emerald-800/20 border border-emerald-500/30 rounded-[1.5rem] p-4 flex items-center justify-between text-left group hover:from-emerald-900/60 transition-all min-h-[80px]"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Target size={16} className="text-emerald-400" />
                  <h3 className="font-bold text-emerald-100 text-base">Fokus starten</h3>
                </div>
              </div>
            </button>
          )}

          <button
            onClick={() => navigate('reels_protection')}
            className={`w-full bg-gradient-to-r from-blue-900/40 to-blue-800/20 border border-blue-500/30 rounded-[1.5rem] p-4 flex items-center justify-between text-left group hover:from-blue-900/60 transition-all min-h-[80px] ${state.isFocusModeActive ? 'col-span-1 sm:col-span-2' : ''}`}
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Play size={16} className="text-blue-400" />
                <h3 className="font-bold text-blue-100 text-base">Feed-Schutz einstellen</h3>
              </div>
            </div>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <button
            onClick={() => navigate('apps')}
            className="bg-zinc-900/80 border border-zinc-800/50 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 text-center hover:bg-zinc-800 transition-colors"
          >
            <Settings size={20} className="text-zinc-400" />
            <span className="text-xs font-semibold text-zinc-300">App-Regeln bearbeiten</span>
          </button>

          <button
            onClick={() => navigate('history')}
            className="bg-zinc-900/80 border border-zinc-800/50 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 text-center hover:bg-zinc-800 transition-colors"
          >
            <PieChart size={20} className="text-zinc-400" />
            <span className="text-xs font-semibold text-zinc-300">Tagesbericht ansehen</span>
          </button>

          <button
            onClick={() => {
              const activeAppId = Object.keys(state.appsConfig).find((id) => state.appsConfig[id].active);
              updateState({ simulatedAppToOpen: activeAppId || 'instagram' });
              navigate('protection_flow');
            }}
            className="col-span-2 sm:col-span-1 bg-zinc-900/80 border border-zinc-800/50 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 text-center hover:bg-zinc-800 transition-colors"
          >
            <Activity size={20} className="text-amber-400" />
            <span className="text-xs font-semibold text-amber-200">Schutzablauf testen</span>
          </button>
        </div>
      </section>

      {/* 5. Problem App Detection */}
      {problemApp && blockedByApp[mostBlockedAppId] > 2 && (
        <section
          aria-label="Problem-App Erkenntnis"
          className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800/50 rounded-[1.5rem] p-5 flex items-center gap-4"
        >
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${problemApp.color}`}
            aria-hidden="true"
          >
            {problemApp.icon}
          </div>
          <div>
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Problem-App heute</h3>
            <p className="font-semibold text-zinc-200">
              {problemApp.name} ({blockedByApp[mostBlockedAppId]}x blockiert)
            </p>
          </div>
        </section>
      )}

      {/* 5b. Erkenntnisse aus den eigenen Daten */}
      {insights.length > 0 && (
        <section aria-labelledby="dashboard-insights" className="mt-6">
          <h2 id="dashboard-insights" className="mb-3 px-1 text-xs font-bold uppercase tracking-widest text-zinc-500">
            Was deine Daten zeigen
          </h2>
          <div className="space-y-3">
            {insights.map((insight) => (
              <article
                key={insight.id}
                className={`rounded-[1.5rem] border p-5 ${
                  insight.tone === 'positive'
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : insight.tone === 'warning'
                      ? 'border-amber-500/30 bg-amber-500/5'
                      : 'border-zinc-800/50 bg-zinc-900/80'
                }`}
              >
                <h3 className="mb-1 font-semibold text-zinc-100">{insight.title}</h3>
                <p className="text-sm leading-relaxed text-zinc-400">{insight.detail}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* 6. Motivation Card (Editorial Style) */}
      <aside
        aria-label="Motivation"
        className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-2xl p-5 my-8 flex gap-4 items-start relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <Target size={64} />
        </div>
        <div className="w-1 bg-emerald-500/50 rounded-full h-full absolute left-0 top-0 bottom-0"></div>
        <p className="text-sm font-medium text-zinc-300 leading-relaxed italic z-10">"{randomQuote}"</p>
      </aside>

      {/* 4. Daily Overview (Timeline) */}
      <section aria-labelledby="timeline-title">
        <h2 id="timeline-title" className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 px-2">
          Heute
        </h2>
        <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800/50 rounded-[1.5rem] p-5">
          {todaysHistory.length === 0 ? (
            <div className="text-center py-6">
              <div
                className="w-12 h-12 bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-3"
                aria-hidden="true"
              >
                <Shield size={20} className="text-zinc-500" />
              </div>
              <h3 className="font-bold text-zinc-200 mb-1">Noch keine Aktivitäten</h3>
              <p className="text-sm text-zinc-500">
                Dein Verlauf füllt sich automatisch, sobald ScrollShield aktiv eingreift oder du eine App öffnest.
              </p>
            </div>
          ) : (
            <ul className="space-y-4" aria-label="Aktivitätsverlauf">
              {todaysHistory
                .slice(-4)
                .reverse()
                .map((event, i) => {
                  const time = new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const app = SUPPORTED_APPS.find((a) => a.id === event.appId);

                  let icon = <Shield size={14} className="text-zinc-400" aria-hidden="true" />;
                  let text = 'Aktivität';

                  if (event.type === 'block') {
                    icon = <XCircle size={14} className="text-red-400" aria-hidden="true" />;
                    text = `${app?.name || 'App'} blockiert`;
                  } else if (event.type === 'warning') {
                    icon = <AlertTriangle size={14} className="text-amber-400" aria-hidden="true" />;
                    text = `Warnung bei ${app?.name || 'App'}`;
                  } else if (event.type === 'open') {
                    icon = <CheckCircle2 size={14} className="text-emerald-400" aria-hidden="true" />;
                    text = `${app?.name || 'App'} geöffnet`;
                  }

                  return (
                    <li key={i} className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full bg-zinc-950 border border-zinc-800/50 flex items-center justify-center flex-shrink-0"
                        aria-hidden="true"
                      >
                        {icon}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-zinc-200">{text}</div>
                      </div>
                      <div className="text-xs text-zinc-500 font-mono" aria-label={`Um ${time} Uhr`}>
                        {time}
                      </div>
                    </li>
                  );
                })}
            </ul>
          )}
        </div>
      </section>
    </motion.div>
  );
}

export function History({ state, navigate: _navigate }: { state: AppState; navigate: (s: Screen) => void }) {
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month'>('week');
  const [typeFilter, setTypeFilter] = useState<'all' | 'block' | 'focus' | 'emergency'>('all');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter logic
  const filteredEvents = state.history.filter((ev) => {
    // Time filter
    const evDate = new Date(ev.timestamp);
    if (timeFilter === 'today' && evDate.getTime() < today.getTime()) return false;
    if (timeFilter === 'week' && evDate.getTime() < today.getTime() - 6 * 24 * 60 * 60 * 1000) return false;
    if (timeFilter === 'month' && evDate.getTime() < today.getTime() - 30 * 24 * 60 * 60 * 1000) return false;

    // Type filter
    if (typeFilter === 'block' && ev.type !== 'block' && ev.type !== 'warning') return false;
    if (typeFilter === 'focus' && ev.type !== 'focus_start' && ev.type !== 'focus_end' && ev.type !== 'focus')
      return false;
    if (typeFilter === 'emergency' && ev.type !== 'emergency') return false;

    // Hide system events in stats view by default
    if (ev.type === 'profile_change' || ev.type === 'rule_change') return false;

    return true;
  });

  // Calculate Chart Data
  let chartData: { name: string; blocks: number }[] = [];
  let chartTitle = 'Verlauf';

  if (timeFilter === 'week') {
    chartTitle = 'Verlauf der letzten 7 Tage';
    chartData = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));

      const dayBlocks = state.history.filter((e) => {
        if (e.type !== 'block' && e.type !== 'warning') return false;
        const ed = new Date(e.timestamp);
        return ed.getDate() === d.getDate() && ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear();
      }).length;

      return {
        name: d.toLocaleDateString('de-DE', { weekday: 'short' }),
        blocks: dayBlocks,
      };
    });
  } else if (timeFilter === 'month') {
    chartTitle = 'Verlauf der letzten 30 Tage';
    chartData = Array.from({ length: 30 }).map((_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (29 - i));

      const dayBlocks = state.history.filter((e) => {
        if (e.type !== 'block' && e.type !== 'warning') return false;
        const ed = new Date(e.timestamp);
        return ed.getDate() === d.getDate() && ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear();
      }).length;

      return {
        name: d.getDate() % 5 === 0 ? String(d.getDate()) : '',
        blocks: dayBlocks,
      };
    });
  } else if (timeFilter === 'today') {
    chartTitle = 'Verlauf Heute';
    chartData = Array.from({ length: 6 }).map((_, i) => {
      const startHour = i * 4;
      const endHour = startHour + 4;

      const rangeBlocks = state.history.filter((e) => {
        if (e.type !== 'block' && e.type !== 'warning') return false;
        const ed = new Date(e.timestamp);
        return (
          ed.getDate() === today.getDate() &&
          ed.getMonth() === today.getMonth() &&
          ed.getFullYear() === today.getFullYear() &&
          ed.getHours() >= startHour &&
          ed.getHours() < endHour
        );
      }).length;

      return {
        name: `${startHour}h`,
        blocks: rangeBlocks,
      };
    });
  }

  // KPIs
  const blocksCount = filteredEvents.filter((e) => e.type === 'block' || e.type === 'warning').length;
  // Estimate 5 mins saved per block
  const savedMinutesTotal = blocksCount * 5;
  const savedHours = Math.floor(savedMinutesTotal / 60);
  const savedMins = savedMinutesTotal % 60;

  const appBlocks = filteredEvents
    .filter((e) => e.type === 'block' || e.type === 'warning')
    .reduce(
      (acc, curr) => {
        if (curr.appId) acc[curr.appId] = (acc[curr.appId] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

  const topBlockedAppId = Object.keys(appBlocks).sort((a, b) => appBlocks[b] - appBlocks[a])[0];
  const topApp = SUPPORTED_APPS.find((a) => a.id === topBlockedAppId);
  const maxChartBlocks = Math.max(1, ...chartData.map((day) => day.blocks));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 pb-32">
      <Header title="Statistiken" />

      {/* Filters */}
      <section aria-label="Verlaufsfilter" className="space-y-3 mb-6">
        <nav aria-label="Zeitraum filtern" className="flex bg-zinc-900/80 p-1 rounded-xl border border-zinc-800/50">
          {(['today', 'week', 'month'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeFilter(t)}
              aria-pressed={timeFilter === t}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px] ${timeFilter === t ? 'bg-zinc-800 text-zinc-100 shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              {t === 'today' ? 'Heute' : t === 'week' ? '7 Tage' : 'Monat'}
            </button>
          ))}
        </nav>
      </section>

      {/* Must-Have KPIs */}
      <section aria-label="Kennzahlen" className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800/50 rounded-[1.5rem] p-5">
          <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
            <Shield size={12} /> Erfolgreich blockiert
          </h3>
          <div className="text-3xl font-bold font-mono tracking-tighter mt-2 text-zinc-100">{blocksCount}</div>
        </div>
        <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800/50 rounded-[1.5rem] p-5">
          <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
            <Clock size={12} /> Gesparte Zeit
          </h3>
          <div className="text-3xl font-bold font-mono tracking-tighter mt-2 text-emerald-400">
            {savedHours > 0 ? `${savedHours}h ${savedMins}m` : `${savedMins}m`}
          </div>
        </div>

        {topApp ? (
          <div className="col-span-2 bg-zinc-900/80 backdrop-blur-md border border-zinc-800/50 rounded-[1.5rem] p-5 flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner ${topApp.color}`}
            >
              {topApp.icon}
            </div>
            <div>
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Größter Zeitfresser</h3>
              <p className="font-semibold text-zinc-200">
                {topApp.name} ({appBlocks[topBlockedAppId]}x blockiert)
              </p>
            </div>
          </div>
        ) : (
          <div className="col-span-2 bg-emerald-900/20 backdrop-blur-md border border-emerald-500/20 rounded-[1.5rem] p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner bg-emerald-500/20 text-emerald-400">
              <Shield size={24} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-0.5">
                Alles im grünen Bereich
              </h3>
              <p className="font-semibold text-emerald-100">
                Wir mussten in diesem Zeitraum keine Apps für dich blockieren. Das ist wirklich stark!
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Chart */}
      <section
        aria-labelledby="chart-title"
        className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800/50 rounded-[1.5rem] p-5 mb-8"
      >
        <h2 id="chart-title" className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">
          {chartTitle}
        </h2>
        <div
          className="h-48 w-full flex items-end gap-1.5 border-b border-zinc-800/70 pb-6"
          role="img"
          aria-label={`${chartTitle}: ${chartData.map((day) => `${day.name || 'Tag'} ${day.blocks}`).join(', ')}`}
        >
          {chartData.map((entry, index) => {
            const height = entry.blocks === 0 ? 8 : Math.max(12, Math.round((entry.blocks / maxChartBlocks) * 132));
            return (
              <div
                key={`${entry.name}-${index}`}
                className="flex-1 h-full flex flex-col justify-end items-center gap-2 min-w-0"
              >
                <div className="relative w-full max-w-8 flex justify-center group">
                  <div
                    className={`w-full rounded-md transition-colors ${entry.blocks > 0 ? 'bg-emerald-500' : 'bg-zinc-800'}`}
                    style={{ height }}
                  />
                  <div className="pointer-events-none absolute bottom-full mb-2 hidden group-hover:block w-max max-w-40 rounded-lg bg-zinc-950 border border-zinc-800 px-2 py-1 text-center text-[10px] font-bold text-zinc-200 shadow-xl">
                    {entry.blocks} blockiert
                  </div>
                </div>
                <span className="max-w-full break-words text-center text-[10px] font-semibold text-zinc-500">
                  {entry.name}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Type Filter for Event List */}
      <nav aria-label="Ereignistyp filtern" className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
        <button
          onClick={() => setTypeFilter('all')}
          aria-pressed={typeFilter === 'all'}
          className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px] ${typeFilter === 'all' ? 'bg-zinc-100 text-zinc-950' : 'bg-zinc-900/80 text-zinc-400 border border-zinc-800/50'}`}
        >
          Alle
        </button>
        <button
          onClick={() => setTypeFilter('block')}
          aria-pressed={typeFilter === 'block'}
          className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px] ${typeFilter === 'block' ? 'bg-emerald-500 text-emerald-950' : 'bg-zinc-900/80 text-zinc-400 border border-zinc-800/50'}`}
        >
          Blockiert
        </button>
        <button
          onClick={() => setTypeFilter('emergency')}
          aria-pressed={typeFilter === 'emergency'}
          className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px] ${typeFilter === 'emergency' ? 'bg-amber-500 text-amber-950' : 'bg-zinc-900/80 text-zinc-400 border border-zinc-800/50'}`}
        >
          Notfälle
        </button>
        <button
          onClick={() => setTypeFilter('focus')}
          aria-pressed={typeFilter === 'focus'}
          className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px] ${typeFilter === 'focus' ? 'bg-blue-500 text-blue-950' : 'bg-zinc-900/80 text-zinc-400 border border-zinc-800/50'}`}
        >
          Fokus
        </button>
      </nav>

      <section aria-label="Verlaufsliste" className="space-y-4">
        {filteredEvents.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 mt-12" aria-live="polite">
            <div
              className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center mb-4"
              aria-hidden="true"
            >
              <Clock size={28} className="text-zinc-500" />
            </div>
            <h2 className="text-lg font-bold text-zinc-200 mb-2">Verlauf ist leer</h2>
            <p className="text-sm text-zinc-500 mb-6 max-w-[250px]">
              Hier siehst du später alle Ereignisse für diesen Zeitraum.
            </p>
          </div>
        ) : (
          <ul className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800/50 rounded-[2rem] overflow-hidden">
            {filteredEvents.map((ev, i) => {
              const appInfo = SUPPORTED_APPS.find((a) => a.id === ev.appId);
              const date = new Date(ev.timestamp);
              const timeString = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
              const dateString = date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });

              let icon = <Play size={16} className="text-zinc-400" aria-hidden="true" />;
              let title = appInfo?.name || 'System';
              const desc = ev.desc;

              if (ev.type === 'block') {
                icon = <XCircle size={16} className="text-emerald-400" aria-hidden="true" />;
                title = `${appInfo?.name} blockiert`;
              } else if (ev.type === 'focus_start' || ev.type === 'focus') {
                icon = <Play size={16} className="text-blue-400" aria-hidden="true" />;
                title = 'Fokusmodus gestartet';
              } else if (ev.type === 'focus_end') {
                icon = <CheckCircle2 size={16} className="text-blue-400" aria-hidden="true" />;
                title = 'Fokusmodus beendet';
              } else if (ev.type === 'emergency') {
                icon = <AlertTriangle size={16} className="text-amber-500" aria-hidden="true" />;
                title = `Notfallfreigabe für ${appInfo?.name}`;
              } else if (ev.type === 'warning') {
                icon = <AlertTriangle size={16} className="text-orange-400" aria-hidden="true" />;
                title = `Warnung bei ${appInfo?.name}`;
              }

              return (
                <li
                  key={ev.id}
                  className={`p-5 flex items-start gap-4 ${i !== filteredEvents.length - 1 ? 'border-b border-zinc-800/50' : ''}`}
                >
                  <div
                    className="mt-1 w-8 h-8 rounded-full bg-zinc-800/80 flex items-center justify-center shadow-inner flex-shrink-0"
                    aria-hidden="true"
                  >
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-sm break-words pr-2 text-zinc-200">{title}</span>
                      <span
                        className="text-xs text-zinc-500 font-mono flex-shrink-0"
                        aria-label={`Am ${dateString} um ${timeString} Uhr`}
                      >
                        {timeFilter !== 'today' ? `${dateString} ` : ''}
                        {timeString}
                      </span>
                    </div>
                    <p className="text-zinc-400 text-sm break-words">{desc}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </motion.div>
  );
}
