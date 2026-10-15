import React, { useState, useEffect, useRef } from 'react';
import { AppState, Screen, SUPPORTED_APPS, HistoryEvent } from '../types';
import { Pause, Play, Shield, SquarePlay, X } from 'lucide-react';
import { AppTile, IconButton, SecondaryButton } from '../components/ui';
import { BackAction, ContinueAction, Countdown, InterruptionScreen } from '../components/Interruption';
import { t } from '../i18n';
import { createEventId } from '../lib/appUtils';
import {
  getSessionElapsedSeconds,
  getSessionLimitSeconds,
  isSessionLimitEnabled,
  recordSessionUsage,
} from '../lib/session';
import { getReelsUsageMinutesForAppDate, getShortVideoUsageKey, isShortVideoFeedBlockedByConfig } from '../lib/stats';
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
  // The session guard is itself a short pause: "Weiter" only after 5 seconds.
  const [guardWait, setGuardWait] = useState(5);

  const sessionLimitMinutes = session?.sessionLimitOverride ?? config?.sessionLimit ?? 15;
  const currentLimitSeconds = session ? getSessionLimitSeconds(session, config?.sessionLimit ?? 15) : 0;
  const hasSessionLimit = isSessionLimitEnabled(currentLimitSeconds);
  const reelsUsageToday = appId ? getReelsUsageMinutesForAppDate(state, appId) : 0;
  const reelsDailyLimit = config?.reelsProtection?.dailyLimitMinutes ?? 0;
  const isReelsFeedBlocked =
    !!config?.reelsProtection &&
    (isShortVideoFeedBlockedByConfig(config.reelsProtection) ||
      (reelsDailyLimit > 0 && reelsUsageToday >= reelsDailyLimit));

  useEffect(() => {
    if (!session || !appInfo) {
      navigate('today');
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

  useEffect(() => {
    if (!showWarning) {
      setGuardWait(5);
      return;
    }
    if (guardWait <= 0) return;
    const timeout = setTimeout(() => setGuardWait((previous) => previous - 1), 1000);
    return () => clearTimeout(timeout);
  }, [showWarning, guardWait]);

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
      // Not 'open': the opening was already logged by the protection flow, and
      // anti-binge counts 'open' events.
      type: 'session_end',
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
    navigate('today');
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

  const surface = appInfo.shortVideoSurface?.name.split(' ').at(-1) ?? '';
  const limitShare = hasSessionLimit ? Math.min(1, elapsedSeconds / currentLimitSeconds) : 1;

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-ground text-ink">
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-3">
          <div className={`flex items-center gap-3 rounded-surface border border-line bg-surface p-3`}>
            <AppTile app={appInfo} size="sm" />
            <div>
              <div className="text-label text-ink">{appInfo.name}</div>
              <div className="flex items-center gap-1 text-caption text-muted">
                <Shield size={12} strokeWidth={2} aria-hidden="true" /> {t('session.active')}
              </div>
            </div>
          </div>
          <IconButton icon={X} label={t('session.close')} onClick={closeApp} />
        </div>

        <div className="my-auto flex flex-col items-center">
          <div className="flex w-full max-w-xs flex-col items-center rounded-surface border border-line bg-surface p-6">
            <div className="mb-1 text-label-s text-muted">{t('session.title')}</div>
            <div className={`mb-5 text-display ${session.isPaused ? 'text-muted' : 'text-ink'}`}>
              {formatTime(elapsedSeconds)}
            </div>

            <div className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-line" aria-hidden="true">
              <div
                className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${hasSessionLimit && limitShare >= 0.8 ? 'bg-pause' : 'bg-accent'}`}
                style={{ width: `${limitShare * 100}%` }}
              />
            </div>

            <div className="mb-3 w-full">
              <SecondaryButton onClick={togglePause}>
                {session.isPaused ? (
                  <>
                    <Play size={16} aria-hidden="true" /> {t('session.resume')}
                  </>
                ) : (
                  <>
                    <Pause size={16} aria-hidden="true" /> {t('session.pause')}
                  </>
                )}
              </SecondaryButton>
            </div>

            {config?.reelsProtection?.enabled && (
              <div className="w-full">
                <SecondaryButton
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
                >
                  <SquarePlay size={18} aria-hidden="true" />
                  {isReelsFeedBlocked
                    ? t('session.feed.limit')
                    : isSwipingReels
                      ? t('session.feed.close', { surface })
                      : t('session.feed.open', { surface })}
                </SecondaryButton>

                {isSwipingReels && (
                  <div
                    data-testid="reels-swipe-surface"
                    role="group"
                    aria-label={t('session.feed.surface')}
                    onPointerDown={handleFeedPointerDown}
                    onPointerUp={handleFeedPointerUp}
                    onPointerCancel={closeFeed}
                    onWheel={handleFeedWheel}
                    className="mt-3 flex h-40 touch-none select-none flex-col items-center justify-center gap-2 rounded-control border border-line bg-raised"
                  >
                    <span className="text-number text-ink">{reelsSwipeCount}</span>
                    <span className="px-4 text-center text-caption text-muted">
                      {t(reelsSwipeCount === 1 ? 'session.feed.swipeOne' : 'session.feed.swipeMany')}
                    </span>
                    <span className="px-4 text-center text-caption text-muted">{t('session.feed.hint')}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showReelsInterrupt && (
        <InterruptionScreen
          app={appInfo}
          chip={t('interrupt.stage.pause')}
          tone="pause"
          title={t('session.swipes.title', { count: reelsSwipeCount })}
          text={t('session.swipes.text', { app: appInfo.name })}
          footer={
            <>
              <BackAction
                label={t('session.feed.leave', { surface })}
                onClick={() => {
                  setShowReelsInterrupt(false);
                  setIsSwipingReels(false);
                }}
              />
              <ContinueAction
                label={t('session.swipes.continue')}
                onClick={() => {
                  setShowReelsInterrupt(false);
                  setIsSwipingReels(true);
                }}
              />
            </>
          }
        />
      )}

      {showReelsLimitBlock && (
        <InterruptionScreen
          app={appInfo}
          chip={t('session.feed.blockedChip', { surface })}
          tone="lock"
          title={t('session.feed.limitTitle', { surface })}
          text={t('session.feed.limitText', { used: reelsUsageToday, limit: Math.max(0, reelsDailyLimit) })}
          footer={
            <BackAction label={t('session.feed.leave', { surface })} onClick={() => setShowReelsLimitBlock(false)} />
          }
        >
          <p className="text-body-s text-muted">{t('session.feed.midnight')}</p>
        </InterruptionScreen>
      )}

      {showWarning && (
        <InterruptionScreen
          app={appInfo}
          chip={t('protect.rule.session')}
          tone="pause"
          title={t('session.guard.title', { minutes: sessionLimitMinutes, app: appInfo.name })}
          text={t('session.guard.text')}
          footer={
            <>
              <BackAction label={t('session.guard.stop')} onClick={closeApp} />
              <ContinueAction
                label={guardWait > 0 ? t('interrupt.continueIn', { seconds: guardWait }) : t('session.guard.more')}
                disabled={guardWait > 0}
                onClick={extendSession}
              />
            </>
          }
        >
          {guardWait > 0 && <Countdown value={guardWait} label={t('session.guard.pause')} />}
        </InterruptionScreen>
      )}
    </div>
  );
}
