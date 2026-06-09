import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppState, Screen, SUPPORTED_APPS, HistoryEvent } from '../types';
import { X, Clock, AlertTriangle, Pause, Play, Shield } from 'lucide-react';

export function ActiveSessionScreen({ state, updateState, navigate }: { state: AppState, updateState: (u: Partial<AppState>) => void, navigate: (s: Screen) => void }) {
  const session = state.activeSession;
  const appId = session?.appId;
  const appInfo = SUPPORTED_APPS.find(a => a.id === appId);
  const config = state.appsConfig[appId || ''];
  
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [isSwipingReels, setIsSwipingReels] = useState(false);
  const [reelsSwipeCount, setReelsSwipeCount] = useState(0);
  const [showReelsInterrupt, setShowReelsInterrupt] = useState(false);

  // Use override if provided (e.g. from Emergency flow), else config limit, else 15
  const sessionLimitMinutes = session?.sessionLimitOverride || config?.sessionLimit || 15;
  const limitSeconds = sessionLimitMinutes * 60;
  // Each extension adds 5 minutes
  const currentLimitSeconds = limitSeconds + ((session?.extensionCount || 0) * 300);

  useEffect(() => {
    if (!session || !appInfo) {
      navigate('dashboard');
      return;
    }

    let interval: NodeJS.Timeout;
    if (!session.isPaused) {
      interval = setInterval(() => {
        setElapsedSeconds(prev => {
          const next = prev + 1;
          if (next >= currentLimitSeconds && !showWarning) {
            setShowWarning(true);
          }
          return next;
        });
        
        if (isSwipingReels && config?.reelsProtection?.enabled) {
          setReelsSwipeCount(prev => {
            const next = prev + 1;
            // Simulation: 1 swipe every 3 seconds, and interrupt after e.g., 5 swipes (15s) in demo
            if (config.reelsProtection.stopAfterSwipes && next > 0 && next % config.reelsProtection.stopAfterSwipes === 0) {
              setShowReelsInterrupt(true);
              setIsSwipingReels(false); // pause swiping
            }
            return next;
          });
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [session, appInfo, currentLimitSeconds, showWarning, navigate, isSwipingReels, config]);

  if (!session || !appInfo) return null;

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const closeApp = () => {
    // Log the session duration
    const durationMinutes = Math.ceil(elapsedSeconds / 60);
    const newEvent: HistoryEvent = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      type: 'open', // We use 'open' to track usage, or we could add a 'session_end' type
      appId: appInfo.id,
      desc: `Sitzung beendet (${durationMinutes} Min)`
    };
    
    updateState({ 
      activeSession: null,
      history: [newEvent, ...state.history]
    });
    navigate('dashboard');
  };

  const togglePause = () => {
    updateState({
      activeSession: { ...session, isPaused: !session.isPaused }
    });
  };

  const extendSession = () => {
    updateState({
      activeSession: { ...session, extensionCount: session.extensionCount + 1 }
    });
    setShowWarning(false);
  };

  return (
    <div className="absolute inset-0 z-50 bg-zinc-950 flex flex-col">
      {/* Simulated App Background */}
      <div className={`absolute inset-0 opacity-20 ${appInfo.color}`} />
      
      <div className="relative z-10 flex-1 flex flex-col p-6">
        {/* Header / Status Bar */}
        <div className="flex justify-between items-start mb-auto">
          <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800/50 rounded-2xl p-3 flex items-center gap-3 shadow-lg">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${appInfo.color}`}>
              {appInfo.icon}
            </div>
            <div>
              <div className="font-bold text-sm text-zinc-100">{appInfo.name}</div>
              <div className="text-xs text-zinc-400 flex items-center gap-1">
                <Shield size={10} /> ScrollShield aktiv
              </div>
            </div>
          </div>
          
          <button onClick={closeApp} className="w-12 h-12 bg-zinc-900/80 backdrop-blur-md border border-zinc-800/50 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors shadow-lg">
            <X size={20} />
          </button>
        </div>

        {/* Timer Widget */}
        <div className="mt-auto mb-auto flex flex-col items-center justify-center">
          <div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-800/50 rounded-[2.5rem] p-8 flex flex-col items-center shadow-2xl w-full max-w-xs">
            <div className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">Aktive Sitzung</div>
            <div className={`text-6xl font-mono font-bold tracking-tighter mb-6 ${session.isPaused ? 'text-zinc-500' : 'text-zinc-100'}`}>
              {formatTime(elapsedSeconds)}
            </div>
            
            <div className="w-full bg-zinc-800/50 rounded-full h-2 mb-6 overflow-hidden">
              <motion.div 
                className={`h-full ${elapsedSeconds >= currentLimitSeconds * 0.8 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (elapsedSeconds / currentLimitSeconds) * 100)}%` }}
                transition={{ ease: "linear", duration: 1 }}
              />
            </div>

            <div className="flex gap-3 w-full mb-3">
              <button 
                onClick={togglePause}
                className="flex-1 py-3 rounded-xl font-semibold bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
              >
                {session.isPaused ? <><Play size={16} /> Fortsetzen</> : <><Pause size={16} /> Pausieren</>}
              </button>
            </div>
            
            {(config?.reelsProtection?.enabled) && (
              <div className="w-full">
                <button 
                  onClick={() => setIsSwipingReels(!isSwipingReels)}
                  className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${isSwipingReels ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-transparent border-2 border-amber-500/50 text-amber-500 hover:bg-amber-500/10'}`}
                >
                  <Play size={18} className={isSwipingReels ? "animate-pulse" : ""} />
                  {isSwipingReels ? "Swipen simulieren..." : "Kurzvideo Feed öffnen"}
                </button>
                {isSwipingReels && (
                  <p className="text-zinc-400 text-center text-xs mt-3 animate-pulse">Endlos-Scrollen detektiert...</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reels/Shorts Interrupt Overlay */}
      <AnimatePresence>
        {showReelsInterrupt && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.95 }} 
            className="absolute inset-0 z-[60] bg-zinc-950/95 backdrop-blur-3xl flex flex-col p-6 items-center justify-center"
          >
            <div className="w-20 h-20 bg-amber-500/10 rounded-[2rem] flex items-center justify-center mb-8 border border-amber-500/20">
              <AlertTriangle size={40} className="text-amber-500" />
            </div>
            <h3 className="text-3xl font-bold text-center mb-4 tracking-tight">Kurze Pause</h3>
            <p className="text-zinc-400 text-center text-base mb-10 max-w-sm leading-relaxed">
              Dein Kurzvideo-Schutz hat unterbrochen. Du bist bereits im Swipe-Modus. Möchtest du wirklich weiter scrollen?
            </p>
            
            <div className="w-full max-w-sm space-y-3">
              <button onClick={() => {
                setShowReelsInterrupt(false);
                closeApp();
              }} className="w-full py-4 rounded-[1.5rem] font-bold bg-amber-500 text-white shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-transform">
                Feed verlassen (App schließen)
              </button>
              <button onClick={() => {
                setShowReelsInterrupt(false);
                setIsSwipingReels(false);
              }} className="w-full py-4 rounded-[1.5rem] font-semibold bg-zinc-800 text-zinc-100 hover:bg-zinc-700 transition-colors">
                Normale App-Nutzung fortsetzen
              </button>
              <button onClick={() => {
                setShowReelsInterrupt(false);
                setIsSwipingReels(true);
              }} className="w-full py-4 rounded-[1.5rem] font-semibold text-zinc-500 hover:text-zinc-400 transition-colors">
                Trotzdem weiter swipen (Gefahr)
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Warning Overlay */}
      <AnimatePresence>
        {showWarning && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 50 }} 
            className="absolute inset-x-0 bottom-0 z-50 p-6"
          >
            <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-[2rem] p-6 shadow-2xl shadow-black">
              <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center mb-4 text-amber-500 mx-auto">
                <Clock size={32} />
              </div>
              <h3 className="text-2xl font-bold text-center mb-2">Zeitlimit erreicht</h3>
              <p className="text-zinc-400 text-center text-sm mb-6 leading-relaxed">
                Du hast dein gesetztes Limit von {sessionLimitMinutes} Minuten für diese Sitzung in {appInfo.name} erreicht. Zeit für eine Pause?
              </p>
              
              <div className="space-y-3">
                <button onClick={closeApp} className="w-full py-4 rounded-[1.5rem] font-bold bg-zinc-100 text-zinc-950 shadow-lg active:scale-[0.98] transition-transform">
                  App schließen
                </button>
                <button onClick={extendSession} className="w-full py-4 rounded-[1.5rem] font-semibold bg-zinc-800 text-zinc-400 hover:text-zinc-300 transition-colors">
                  Noch 5 Minuten
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
