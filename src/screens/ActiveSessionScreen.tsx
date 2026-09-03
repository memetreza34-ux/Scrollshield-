import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppState, Screen, SUPPORTED_APPS, HistoryEvent } from '../types';
import { X, Clock, AlertTriangle, Pause, Play, Shield } from 'lucide-react';
import { createEventId } from '../lib/appUtils';
import {
  getSessionElapsedSeconds,
  getSessionLimitSeconds,
  isSessionLimitEnabled,
  recordSessionUsage,
} from '../lib/session';
import { getReelsUsageMinutesForAppDate, getShortVideoUsageKey } from '../lib/stats';
import { applyWheel, beginGesture, createSwipeCounterState, endGesture, shouldInterrupt } from '../lib/swipeCounter';

export function ActiveSessionScreen({
  state,
  updateState,
  navigate,
}: {
  state: AppState;
  updateState: (u: Partial<AppState>) => void;
  navigate: (s: Screen) => void;
}) {
  const session = state.activeSession;
  const appId = session?.appId;
  const appInfo = SUPPORTED_APPS.find((a) => a.id === appId);
  const config = state.appsConfig[appId || ''];

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [isSwipingReels, setIsSwipingReels] = useState(false);
  const [reelsSwipeCount, setReelsSwipeCount] = useState(0);
  const swipeStateRef = useRef(createSwipeCounterState());
  const [showReelsInterrupt, setShowReelsInterrupt] = useState(false);
  const [showReelsLimitBlock, setShowReelsLimitBlock] = useState(false);

  const sessionLimitMinutes = session?.sessionLimitOverride ?? config?.sessionLimit ?? 15;
  const currentLimitSeconds = session ? getSessionLimitSeconds(session, config?.sessionLimit ?? 15) : 0;
  const hasSessionLimit = isSessionLimitEnabled(currentLimitSeconds);
  const reelsUsageToday = appId ? getReelsUsageMinutesForAppDate(state, appId) : 0;
  const reelsDailyLimit = config?.reelsProtection?.dailyLimitMinutes ?? 0;
  const isReelsFeedBlocked =
    config?.reelsProtection?.mode === 'block' || reelsDailyLimit <= 0 || reelsUsageToday >= reelsDailyLimit;

  useEffect(() => {
    if (!session || !appInfo) {
      navigate('dashboard');
      return;
    }

    setElapsedSeconds(getSessionElapsedSeconds(session));
    let interval: NodeJS.Timeout;
    if (!session.isPaused) {
      interval = setInterval(() => {
        setElapsedSeconds(() => {
          const next = getSessionElapsedSeconds(session);
          if (hasSessionLimit && next >= currentLimitSeconds && !showWarning) {
            setShowWarning(true);
          }
          return next;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [session, appInfo, currentLimitSeconds, hasSessionLimit, showWarning, navigate]);

  if (!session || !appInfo) return null;

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ── Swipe counting ──────────────────────────────────────────────────────────
  // A swipe is a real gesture, not a tick of the clock. The counter used to be
  // driven by a one-second interval, which made "stop after 10 swipes" mean
  // "stop after 10 seconds" even with the phone lying still.

  const registerSwipe = () => {
    const next = swipeStateRef.current.count;
    setReelsSwipeCount(next);
    if (shouldInterrupt(next, config?.reelsProtection?.stopAfterSwipes)) {
      setShowReelsInterrupt(true);
      setIsSwipingReels(false);
    }
  };

  const handleFeedPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    swipeStateRef.current = beginGesture(swipeStateRef.current, event.clientY);
  };

  const handleFeedPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const result = endGesture(swipeStateRef.current, event.clientY, Date.now());
    swipeStateRef.current = result.state;
    if (result.counted) registerSwipe();
  };

  const handleFeedWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const result = applyWheel(swipeStateRef.current, event.deltaY, Date.now());
    swipeStateRef.current = result.state;
    if (result.counted) registerSwipe();
  };

  const openFeed = () => {
    swipeStateRef.current = createSwipeCounterState();
    setReelsSwipeCount(0);
    setIsSwipingReels(true);
  };

  const closeFeed = () => {
    setIsSwipingReels(false);
  };

  const closeApp = () => {
    // Log the session duration
    const durationMinutes = Math.ceil(elapsedSeconds / 60);
    const hasReelsUsage = reelsSwipeCount > 0;
    const newEvent: HistoryEvent = {
      id: createEventId(),
      timestamp: Date.now(),
      type: 'open', // We use 'open' to track usage, or we could add a 'session_end' type
      appId: appInfo.id,
      desc: `Sitzung beendet (${durationMinutes} Min)`,
      metadata: hasReelsUsage
        ? {
            surface: 'reels',
            contentType: 'short_video',
            singleItemsViewed: reelsSwipeCount,
          }
        : undefined,
    };
    const dailyStats = hasReelsUsage
      ? recordSessionUsage(
          recordSessionUsage(state.dailyStats, appInfo.id, durationMinutes, newEvent.timestamp),
          getShortVideoUsageKey(appInfo.id),
          durationMinutes,
          newEvent.timestamp,
        )
      : recordSessionUsage(state.dailyStats, appInfo.id, durationMinutes, newEvent.timestamp);

    updateState({
      activeSession: null,
      history: [newEvent, ...state.history],
      dailyStats,
    });
    navigate('dashboard');
  };

  const togglePause = () => {
    if (session.isPaused) {
      const pausedDuration = Date.now() - (session.pausedAt || Date.now());
      updateState({
        activeSession: {
          ...session,
          startTime: session.startTime + pausedDuration,
          isPaused: false,
          pausedAt: undefined,
        },
      });
      return;
    }

    updateState({
      activeSession: { ...session, isPaused: true, pausedAt: Date.now() },
    });
  };

  const extendSession = () => {
    updateState({
      activeSession: { ...session, extensionCount: session.extensionCount + 1 },
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

          <button
            onClick={closeApp}
            aria-label="App schließen"
            className="w-12 h-12 bg-zinc-900/80 backdrop-blur-md border border-zinc-800/50 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors shadow-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Timer Widget */}
        <div className="mt-auto mb-auto flex flex-col items-center justify-center">
          <div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-800/50 rounded-[2.5rem] p-8 flex flex-col items-center shadow-2xl w-full max-w-xs">
            <div className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">Aktive Sitzung</div>
            <div
              className={`text-6xl font-mono font-bold tracking-tighter mb-6 ${session.isPaused ? 'text-zinc-500' : 'text-zinc-100'}`}
            >
              {formatTime(elapsedSeconds)}
            </div>

            <div className="w-full bg-zinc-800/50 rounded-full h-2 mb-6 overflow-hidden">
              <motion.div
                className={`h-full ${hasSessionLimit && elapsedSeconds >= currentLimitSeconds * 0.8 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                initial={{ width: 0 }}
                animate={{
                  width: `${hasSessionLimit ? Math.min(100, (elapsedSeconds / currentLimitSeconds) * 100) : 100}%`,
                }}
                transition={{ ease: 'linear', duration: 1 }}
              />
            </div>

            <div className="flex gap-3 w-full mb-3">
              <button
                onClick={togglePause}
                className="flex-1 py-3 rounded-xl font-semibold bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
              >
                {session.isPaused ? (
                  <>
                    <Play size={16} /> Fortsetzen
                  </>
                ) : (
                  <>
                    <Pause size={16} /> Pausieren
                  </>
                )}
              </button>
            </div>

            {config?.reelsProtection?.enabled && (
              <div className="w-full">
                <button
                  onClick={() => {
                    if (isReelsFeedBlocked) {
                      setShowReelsLimitBlock(true);
                      return;
                    }
                    if (isSwipingReels) {
                      closeFeed();
                    } else {
                      openFeed();
                    }
                  }}
                  className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${isReelsFeedBlocked ? 'bg-zinc-900/70 border-2 border-zinc-800 text-zinc-500' : isSwipingReels ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-transparent border-2 border-amber-500/50 text-amber-500 hover:bg-amber-500/10'}`}
                >
                  <Play size={18} />
                  {isReelsFeedBlocked
                    ? 'Kurzvideo-Limit erreicht'
                    : isSwipingReels
                      ? 'Feed schließen'
                      : 'Kurzvideo Feed öffnen'}
                </button>

                {isSwipingReels && (
                  <div
                    data-testid="reels-swipe-surface"
                    role="group"
                    aria-label="Kurzvideo-Feed: wische hier, um zu blättern"
                    onPointerDown={handleFeedPointerDown}
                    onPointerUp={handleFeedPointerUp}
                    onPointerCancel={closeFeed}
                    onWheel={handleFeedWheel}
                    className="mt-3 h-40 rounded-xl border-2 border-amber-500/30 bg-zinc-900/60 flex flex-col items-center justify-center gap-2 touch-none select-none"
                  >
                    <span className="text-4xl font-bold text-amber-400 tabular-nums">{reelsSwipeCount}</span>
                    <span className="text-zinc-400 text-xs text-center px-4">
                      {reelsSwipeCount === 1 ? 'Wischbewegung' : 'Wischbewegungen'} in diesem Feed
                    </span>
                    <span className="text-zinc-600 text-[11px] text-center px-4">
                      Wische hoch oder runter. Auf Android zählt ScrollShield die echten Wischer im Feed der App.
                    </span>
                  </div>
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
              Dein Kurzvideo-Schutz hat unterbrochen. Du bist bereits im Swipe-Modus. Möchtest du wirklich weiter
              scrollen?
            </p>

            <div className="w-full max-w-sm space-y-3">
              <button
                onClick={() => {
                  setShowReelsInterrupt(false);
                  closeApp();
                }}
                className="w-full py-4 rounded-[1.5rem] font-bold bg-amber-500 text-white shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-transform"
              >
                Feed verlassen (App schließen)
              </button>
              <button
                onClick={() => {
                  setShowReelsInterrupt(false);
                  setIsSwipingReels(false);
                }}
                className="w-full py-4 rounded-[1.5rem] font-semibold bg-zinc-800 text-zinc-100 hover:bg-zinc-700 transition-colors"
              >
                Normale App-Nutzung fortsetzen
              </button>
              <button
                onClick={() => {
                  setShowReelsInterrupt(false);
                  setIsSwipingReels(true);
                }}
                className="w-full py-4 rounded-[1.5rem] font-semibold text-zinc-500 hover:text-zinc-400 transition-colors"
              >
                Trotzdem weiter swipen (Gefahr)
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showReelsLimitBlock && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-[60] bg-zinc-950/95 backdrop-blur-3xl flex flex-col p-6 items-center justify-center"
          >
            <div className="w-20 h-20 bg-red-500/10 rounded-[2rem] flex items-center justify-center mb-8 border border-red-500/20">
              <Shield size={40} className="text-red-500" />
            </div>
            <h3 className="text-3xl font-bold text-center mb-4 tracking-tight">Feed blockiert</h3>
            <p className="text-zinc-400 text-center text-base mb-10 max-w-sm leading-relaxed">
              Dein Kurzvideo-Schutz ist aktiv. Heute wurden {reelsUsageToday} von {Math.max(0, reelsDailyLimit)} Minuten
              genutzt.
            </p>

            <div className="w-full max-w-sm space-y-3">
              <button
                onClick={closeApp}
                className="w-full py-4 rounded-[1.5rem] font-bold bg-zinc-100 text-zinc-950 shadow-lg shadow-zinc-100/10 active:scale-[0.98] transition-transform"
              >
                App schließen
              </button>
              <button
                onClick={() => setShowReelsLimitBlock(false)}
                className="w-full py-4 rounded-[1.5rem] font-semibold bg-zinc-800 text-zinc-100 hover:bg-zinc-700 transition-colors"
              >
                Normale App-Nutzung fortsetzen
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
                Du hast dein gesetztes Limit von {sessionLimitMinutes} Minuten für diese Sitzung in {appInfo.name}{' '}
                erreicht. Zeit für eine Pause?
              </p>

              <div className="space-y-3">
                <button
                  onClick={closeApp}
                  className="w-full py-4 rounded-[1.5rem] font-bold bg-zinc-100 text-zinc-950 shadow-lg active:scale-[0.98] transition-transform"
                >
                  App schließen
                </button>
                <button
                  onClick={extendSession}
                  className="w-full py-4 rounded-[1.5rem] font-semibold bg-zinc-800 text-zinc-400 hover:text-zinc-300 transition-colors"
                >
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
