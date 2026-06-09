import { motion } from 'motion/react';
import { Terminal, Shield, Activity, Clock, AlertTriangle, Database, Smartphone, Play, RefreshCw, XCircle, Star } from 'lucide-react';
import { AppState, Screen, HistoryEvent } from '../types';
import { Header } from '../components/ui';

export function DebugScreen({ state, updateState, navigate }: { state: AppState, updateState: (u: Partial<AppState>) => void, navigate: (s: Screen) => void }) {
  
  const logEvent = (type: HistoryEvent['type'], desc: string, appId?: string) => {
    const newEvent: HistoryEvent = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      type,
      appId,
      desc
    };
    updateState({ history: [newEvent, ...state.history] });
  };

  const simulateDayChange = () => {
    updateState({
      stats: {
        ...state.stats,
        currentStreak: state.stats.currentStreak + 1,
        cleanDaysStreak: state.stats.cleanDaysStreak + 1
      },
      dailyStats: {
        ...state.dailyStats,
        [new Date().toISOString().split('T')[0]]: {
          date: new Date().toISOString().split('T')[0],
          usageMinutes: {},
          blockedOpens: 5,
          savedTimeMinutes: 25,
          emergencyUnlocks: 0,
          focusMinutes: 60
        }
      }
    });
    logEvent('rule_change', 'Tageswechsel simuliert');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="p-6 pb-32 flex flex-col h-full bg-zinc-950">
      <Header title="Developer / Debug" onBack={() => navigate('settings')} />

      <div className="space-y-6 flex-1 overflow-y-auto scrollbar-hide">
        
        {/* 1. System Health & Platform */}
        <section>
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 px-2 flex items-center gap-2">
            <Terminal size={14} /> Plattformdiagnose
          </h3>
          <div className="bg-zinc-900 border border-zinc-800 rounded-[1.5rem] p-4 space-y-3 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-500">OS:</span>
              <span className="text-emerald-400">{state.operatingSystem.toUpperCase()}</span>
            </div>
          </div>
        </section>

        {/* 2. Active Logic */}
        <section>
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 px-2 flex items-center gap-2">
            <Shield size={14} /> Aktive Schutzlogik
          </h3>
          <div className="bg-zinc-900 border border-zinc-800 rounded-[1.5rem] p-4 space-y-3 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-500">Global Level:</span>
              <span className="text-blue-400">{state.activeProtectionLevel.toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Focus Mode:</span>
              <span className={state.isFocusModeActive ? 'text-emerald-400' : 'text-zinc-500'}>{state.isFocusModeActive ? `ACTIVE (${state.focusTimeRemaining}m)` : 'INACTIVE'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Active Profile:</span>
              <span className="text-purple-400">{state.activeProfileId}</span>
            </div>
          </div>
        </section>

        {/* 3. Test Functions */}
        <section>
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 px-2 flex items-center gap-2">
            <Activity size={14} /> Testfunktionen
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => { updateState({ isFocusModeActive: true, focusTimeRemaining: 15 }); logEvent('focus_start', 'Debug: Fokus gestartet'); }}
              className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-xs font-bold text-zinc-300 hover:bg-zinc-800 flex items-center gap-2"
            >
              <Play size={14} /> Fokus Starten
            </button>
            <button 
              onClick={() => { updateState({ isFocusModeActive: false, focusTimeRemaining: 0 }); logEvent('focus_end', 'Debug: Fokus beendet'); }}
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

        {/* 4. Event Log */}
        <section>
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 px-2 flex items-center gap-2">
            <Database size={14} /> Event Log (Letzte 10)
          </h3>
          <div className="bg-zinc-900 border border-zinc-800 rounded-[1.5rem] p-4 space-y-3 font-mono text-[10px] overflow-hidden">
            {state.history.slice(0, 10).map(event => (
              <div key={event.id} className="border-b border-zinc-800/50 pb-2 last:border-0 last:pb-0">
                <div className="flex justify-between text-zinc-500 mb-1">
                  <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
                  <span className={
                    event.type === 'block' ? 'text-red-400' : 
                    event.type === 'open' ? 'text-blue-400' : 
                    event.type === 'emergency' ? 'text-amber-400' : 'text-emerald-400'
                  }>{event.type.toUpperCase()}</span>
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
