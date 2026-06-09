import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppState, Screen, SUPPORTED_APPS, AppConfig } from '../types';
import { Header, Switch, TimeSelector } from '../components/ui';
import { Play, Shield, ShieldAlert, Zap, Clock, Smartphone, Info, ChevronRight, Check } from 'lucide-react';

export function ReelsProtectionScreen({ state, updateState, navigate }: { state: AppState, updateState: (u: Partial<AppState>) => void, navigate: (s: Screen) => void }) {
  // Helpers
  const reelsPlatforms = ['instagram', 'youtube', 'tiktok', 'facebook', 'snapchat'];
  const platforms = SUPPORTED_APPS.filter(app => reelsPlatforms.includes(app.id));
  
  const activeCount = platforms.filter(app => state.appsConfig[app.id]?.reelsProtection?.enabled).length;

  const updateAppReelsConfig = (appId: string, update: Partial<AppConfig['reelsProtection']>) => {
    const config = state.appsConfig[appId] || { reelsProtection: {} };
    updateState({
      appsConfig: {
        ...state.appsConfig,
        [appId]: {
          ...config,
          reelsProtection: {
            ...config.reelsProtection,
            ...update
          }
        } as AppConfig
      }
    });
  };

  const applyGlobalProfile = (mode: 'soft' | 'balance' | 'strict' | 'noscroll') => {
    const newAppsConfig = { ...state.appsConfig };
    
    platforms.forEach(app => {
      const current = newAppsConfig[app.id] || { reelsProtection: {} };
      
      let newReelsConfig: Partial<AppConfig['reelsProtection']> = { enabled: true };
      
      if (mode === 'soft') {
        newReelsConfig = { enabled: true, mode: 'warn', dailyLimitMinutes: 30, sessionLimitMinutes: 15, hardInterrupt: false };
      } else if (mode === 'balance') {
        newReelsConfig = { enabled: true, mode: 'limit', dailyLimitMinutes: 15, sessionLimitMinutes: 5, hardInterrupt: true };
      } else if (mode === 'strict') {
        newReelsConfig = { enabled: true, mode: 'block', dailyLimitMinutes: 5, sessionLimitMinutes: 1, hardInterrupt: true };
      } else if (mode === 'noscroll') {
        newReelsConfig = { enabled: true, mode: 'block', dailyLimitMinutes: 0, sessionLimitMinutes: 0, singleItemsAllowed: 3, stopAfterSwipes: 1, hardInterrupt: true };
      }
      
      newAppsConfig[app.id] = {
        ...current,
        reelsProtection: {
          ...current.reelsProtection,
          ...newReelsConfig
        }
      } as AppConfig;
    });
    
    updateState({ appsConfig: newAppsConfig });
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-6 pb-32 flex flex-col h-full bg-zinc-950">
      <Header title="Kurzvideo-Schutz" onBack={() => navigate('dashboard')} />
      
      <div className="space-y-6 flex-1 overflow-y-auto scrollbar-hide py-2">
        {/* Intro */}
        <section className="text-center py-2">
          <div className="w-16 h-16 bg-blue-500/20 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
            <Play size={32} className="text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">Die Swipe-Falle stoppen</h1>
          <p className="text-zinc-400 text-sm max-w-xs mx-auto leading-relaxed">
            ScrollShield begrenzt gezielt endlose Feeds (Reels, Shorts, TikToks). Normale Nutzung (Nachrichten, Profile) bleibt erhalten.
          </p>
        </section>

        {/* 1. Übersicht */}
        <section aria-labelledby="overview-title">
          <h2 id="overview-title" className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 px-2">Übersicht</h2>
          <div className={`rounded-[2rem] p-6 border ${activeCount > 0 ? 'bg-blue-500/10 border-blue-500/30' : 'bg-zinc-900 border-zinc-800'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {activeCount > 0 ? <Shield className="text-blue-400" /> : <ShieldAlert className="text-zinc-400" />}
                <h3 className="font-bold text-lg">{activeCount > 0 ? 'Schutz aktiv' : 'Schutz inaktiv'}</h3>
              </div>
              <span className="text-xs font-bold px-2 py-1 bg-black/30 rounded-lg">{activeCount} von {platforms.length} Apps</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-4">
               <div className="bg-black/30 rounded-xl p-3 border border-zinc-800/50">
                 <p className="text-xs text-zinc-500 font-semibold mb-1">In Kurzvideos heute</p>
                 <p className="text-lg font-bold">12 Min</p>
               </div>
               <div className="bg-black/30 rounded-xl p-3 border border-zinc-800/50">
                 <p className="text-xs text-zinc-500 font-semibold mb-1">Blockierte Sessions</p>
                 <p className="text-lg font-bold">4</p>
               </div>
            </div>
          </div>
        </section>

        {/* 5. Schnellprofile */}
        <section aria-labelledby="profiles-title">
          <h2 id="profiles-title" className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 px-2">Schnellprofile (Für alle Feeds)</h2>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => applyGlobalProfile('soft')} className="bg-zinc-900/80 border border-zinc-800/50 rounded-2xl p-4 text-left hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
              <span className="text-xl mb-2 block">🌿</span>
              <h3 className="font-bold text-sm text-zinc-200">Sanft</h3>
              <p className="text-xs text-zinc-500 mt-1">Warnen nach 15 Min</p>
            </button>
            <button onClick={() => applyGlobalProfile('balance')} className="bg-zinc-900/80 border border-zinc-800/50 rounded-2xl p-4 text-left hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
              <span className="text-xl mb-2 block">⚖️</span>
              <h3 className="font-bold text-sm text-zinc-200">Balance</h3>
              <p className="text-xs text-zinc-500 mt-1">Limit auf 15 Min/Tag</p>
            </button>
            <button onClick={() => applyGlobalProfile('strict')} className="bg-zinc-900/80 border border-zinc-800/50 rounded-2xl p-4 text-left hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
              <span className="text-xl mb-2 block">🛡️</span>
              <h3 className="font-bold text-sm text-zinc-200">Streng</h3>
              <p className="text-xs text-zinc-500 mt-1">Nur 5 Min/Tag erlaubt</p>
            </button>
            <button onClick={() => applyGlobalProfile('noscroll')} className="bg-zinc-900/80 border border-blue-500/30 rounded-2xl p-4 text-left hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 bg-blue-500/5">
              <span className="text-xl mb-2 block">🛑</span>
              <h3 className="font-bold text-sm text-blue-200">Kein Endlos-Swipe</h3>
              <p className="text-xs text-blue-400 mt-1">Komplett blockieren</p>
            </button>
          </div>
        </section>

        {/* 2. Plattform-Liste */}
        <section aria-labelledby="platforms-title">
          <h2 id="platforms-title" className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 px-2">Feeds & Plattformen</h2>
          <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800/50 rounded-[2rem] overflow-hidden">
            {platforms.map((app, index) => {
              const config = state.appsConfig[app.id]?.reelsProtection;
              const isEnabled = config?.enabled ?? false;
              
              return (
                <div key={app.id}>
                  <div className={`p-5 flex flex-col gap-4 ${isEnabled ? 'bg-zinc-800/20' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-lg border border-white/10 ${app.color}`}>
                          {app.icon}
                        </div>
                        <div>
                          <h3 className="font-bold text-zinc-100">{app.name}</h3>
                          <p className="text-xs text-zinc-400">
                            {isEnabled ? `Modus: ${config?.mode === 'block' ? 'Blockieren' : config?.mode === 'limit' ? 'Begrenzen' : 'Warnen'}` : 'Inaktiv'}
                          </p>
                        </div>
                      </div>
                      <Switch 
                        checked={isEnabled} 
                        onChange={(c) => updateAppReelsConfig(app.id, { enabled: c })} 
                        aria-label={`${app.name} Kurzvideo-Schutz`} 
                      />
                    </div>
                    
                    {isEnabled && (
                      <div className="pl-14 space-y-4">
                        {/* Mode Selection */}
                        <div className="bg-zinc-950/50 rounded-xl p-1 border border-zinc-800/50 flex">
                          {['warn', 'limit', 'block'].map(mode => (
                            <button
                              key={mode}
                              onClick={() => updateAppReelsConfig(app.id, { mode: mode as any })}
                              className={`flex-1 py-1.5 text-xs font-bold rounded-lg capitalize transition-colors ${config?.mode === mode ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                              {mode === 'warn' ? 'Warnen' : mode === 'limit' ? 'Begrenzen' : 'Blocken'}
                            </button>
                          ))}
                        </div>
                        
                        {(config?.mode === 'limit' || config?.mode === 'warn') && (
                          <div className="space-y-3 mt-4">
                            <div className="flex justify-between items-center">
                              <label className="text-xs font-semibold text-zinc-300">Tageslimit (Feed)</label>
                              <TimeSelector 
                                value={config?.dailyLimitMinutes || 15} 
                                onChange={(v) => updateAppReelsConfig(app.id, { dailyLimitMinutes: v })} 
                                options={[1, 3, 5, 10, 15, 30]} 
                                allowDisabled={true}
                                disabledLabel="Blockiert"
                              />
                            </div>
                            <div className="flex justify-between items-center mt-2">
                              <label className="text-xs font-semibold text-zinc-300">Session-Limit (Am Stück)</label>
                              <TimeSelector 
                                value={config?.sessionLimitMinutes || 5} 
                                onChange={(v) => updateAppReelsConfig(app.id, { sessionLimitMinutes: v })} 
                                options={[1, 3, 5, 10]} 
                                allowDisabled={true}
                                disabledLabel="Blockiert"
                              />
                            </div>
                          </div>
                        )}

                        {config?.mode === 'block' && (
                          <div className="flex items-center justify-between bg-zinc-950/50 p-3 rounded-xl border border-zinc-800/50 mt-4">
                            <span className="text-xs text-zinc-300">Erlaubte Videos pro Session</span>
                            <TimeSelector 
                              value={config?.singleItemsAllowed ?? 3} 
                              onChange={(v) => updateAppReelsConfig(app.id, { singleItemsAllowed: v })} 
                              options={[1, 3, 5]} 
                              allowDisabled={true}
                              disabledLabel="Unbegrenzt"
                              unit="Videos"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {index < platforms.length - 1 && <div className="h-px bg-zinc-800/50" />}
                </div>
              );
            })}
          </div>
        </section>

        {/* 3. Modi erklären */}
        <section aria-labelledby="modes-title" className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-5">
          <h2 id="modes-title" className="text-sm font-bold text-zinc-100 mb-3 flex items-center gap-2">
            <Info size={16} className="text-blue-400" />
            Wie funktioniert der Schutz?
          </h2>
          <div className="space-y-3 mt-4 text-sm leading-relaxed">
            <div>
              <strong className="text-zinc-200">Warnen:</strong>
              <p className="text-zinc-400">Du wirst erinnert, aber der Feed wird nicht blockiert.</p>
            </div>
            <div>
              <strong className="text-zinc-200">Begrenzen:</strong>
              <p className="text-zinc-400">Kurzvideo-Nutzung ist strikt auf deine Limits limitiert.</p>
            </div>
            <div>
              <strong className="text-zinc-200">Blockieren:</strong>
              <p className="text-zinc-400">Der endlose Video-Feed wird sofort unterbrochen.</p>
            </div>
          </div>
        </section>

        {/* 4. Technischer Hinweis */}
        <section className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex gap-3 my-4">
          <Smartphone className="text-amber-500/70 flex-shrink-0 mt-0.5" size={18} />
          <p className="text-xs text-amber-500/90 leading-relaxed font-medium">
            Je nach Gerät und Plattform können manche Schutzfunktionen unterschiedlich stark wirken. ScrollShield nutzt immer die bestmögliche verfügbare Schutzmethode.
          </p>
        </section>
        
      </div>
    </motion.div>
  );
}
