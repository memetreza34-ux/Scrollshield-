import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'motion/react';
import { AppState, Screen, DEFAULT_STATE, SUPPORTED_APPS } from './types';
import { StorageService } from './lib/storage';
import { normalizeAppState } from './lib/state';
import { reconcileFocusRuntime } from './lib/focus';
import { syncNativeBlockList } from './lib/nativeBridge';
import { getLocalDateKey } from './lib/appUtils';
import { detectOperatingSystem } from './lib/platform';
import {
  RELAPSE_WINDOW_MINUTES,
  buildEveningSummary,
  buildFocusFinished,
  buildRelapseWarning,
  sendNotification,
  shouldSendEveningSummary,
  shouldSendRelapseWarning,
} from './lib/notifications';
import { BottomNav } from './components/ui';
import { Welcome, Onboarding } from './screens/OnboardingScreens';
import { Dashboard, History } from './screens/MainScreens';
import { AppList, AppDetail, Rules, Settings, Help, PrivacyScreen } from './screens/ConfigScreens';
import { ReelsProtectionScreen } from './screens/ReelsProtectionScreen';
import { Focus } from './screens/FocusScreens';
import { ProtectionFlow } from './screens/ProtectionFlow';
import { PermissionsScreen } from './screens/PermissionsScreen';
import { DebugScreen } from './screens/DebugScreen';
import { DiagnosticsScreen } from './screens/DiagnosticsScreen';
import { ActiveSessionScreen } from './screens/ActiveSessionScreen';
import { SupportScreen, ImprintScreen } from './screens/SupportScreen';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('welcome');
  const [appState, setAppState] = useState<AppState>(DEFAULT_STATE);
  const [isLoaded, setIsLoaded] = useState(false);
  const skipNextSaveRef = useRef(false);
  const screenScrollRef = useRef<HTMLDivElement>(null);
  // Notifications are deliberately not persisted: a reminder missed because the
  // app was closed should not fire on next launch.
  const notificationStateRef = useRef<{ eveningSentOn: string | null; relapseSentAt: number | null }>({
    eveningSentOn: null,
    relapseSentAt: null,
  });

  useEffect(() => {
    const init = async () => {
      const saved = await StorageService.loadState();
      // The platform is a property of the device, never of the stored state:
      // the same export can be imported on a phone and in a browser.
      const operatingSystem = detectOperatingSystem();

      if (saved) {
        try {
          const normalizedState = { ...normalizeAppState(saved), operatingSystem };
          const focusUpdate = reconcileFocusRuntime(normalizedState);
          const restoredState = focusUpdate ? { ...normalizedState, ...focusUpdate } : normalizedState;
          setAppState(restoredState);
          if (saved.hasCompletedOnboarding) {
            setCurrentScreen(restoredState.activeSession ? 'active_session' : 'dashboard');
          } else {
            setCurrentScreen('welcome');
          }
        } catch (e) {
          console.error('Failed to parse saved state', e);
        }
      } else {
        setAppState((previous) => ({ ...previous, operatingSystem }));
      }
      setIsLoaded(true);
    };
    void init();
  }, []);

  useEffect(() => {
    if (!isLoaded || !appState.isFocusModeActive) return;

    const syncFocusRuntime = () => {
      setAppState((previousState) => {
        const update = reconcileFocusRuntime(previousState);
        return update ? { ...previousState, ...update } : previousState;
      });
    };

    syncFocusRuntime();
    const interval = window.setInterval(syncFocusRuntime, 15_000);
    return () => window.clearInterval(interval);
  }, [isLoaded, appState.isFocusModeActive]);

  // A focus session that ran out while the app was open – tell the user, they
  // are elsewhere by now. Sent from committed state, not from inside the state
  // updater: React may run an updater twice (StrictMode does), and an updater
  // must not have side effects.
  const runningFocusSessionIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isLoaded) return;

    const running = appState.focusSessions.find((session) => session.endTime === null);
    const previousId = runningFocusSessionIdRef.current;
    runningFocusSessionIdRef.current = running?.id ?? null;
    if (!previousId || previousId === running?.id) return;

    // Only the timer ends a session exactly at its scheduled end; a session the
    // user stopped themselves needs no notification.
    const finished = appState.focusSessions.find((session) => session.id === previousId);
    if (
      finished?.successful &&
      finished.endTime !== null &&
      finished.endTime === finished.startTime + finished.duration * 60_000
    ) {
      sendNotification(buildFocusFinished(finished.duration));
    }
  }, [isLoaded, appState.focusSessions]);

  // Evening summary and relapse warning. Both are best-effort: without a push
  // server the app can only notify while it is running.
  useEffect(() => {
    if (!isLoaded) return;

    const check = () => {
      if (shouldSendEveningSummary(appState, notificationStateRef.current.eveningSentOn)) {
        if (sendNotification(buildEveningSummary(appState))) {
          notificationStateRef.current.eveningSentOn = getLocalDateKey(new Date());
        }
      }

      if (shouldSendRelapseWarning(appState, appState.history, notificationStateRef.current.relapseSentAt)) {
        const recentBlocks = appState.history.filter(
          (event) => event.type === 'block' && Date.now() - event.timestamp < RELAPSE_WINDOW_MINUTES * 60_000,
        ).length;
        if (sendNotification(buildRelapseWarning(recentBlocks))) {
          notificationStateRef.current.relapseSentAt = Date.now();
        }
      }
    };

    check();
    const interval = window.setInterval(check, 60_000);
    return () => window.clearInterval(interval);
  }, [isLoaded, appState]);

  useEffect(() => {
    if (screenScrollRef.current) {
      screenScrollRef.current.scrollTop = 0;
    }
  }, [currentScreen]);

  useEffect(() => {
    if (isLoaded) {
      if (import.meta.env.PROD && currentScreen === 'debug') {
        setCurrentScreen('dashboard');
      } else if (
        !appState.hasCompletedOnboarding &&
        !['welcome', 'onboarding', 'permissions'].includes(currentScreen)
      ) {
        setCurrentScreen('welcome');
      } else if (appState.hasCompletedOnboarding && ['welcome', 'onboarding'].includes(currentScreen)) {
        setCurrentScreen('dashboard');
      }
    }
  }, [isLoaded, currentScreen, appState.hasCompletedOnboarding]);

  // Sync state to local storage when it changes
  useEffect(() => {
    if (isLoaded) {
      if (skipNextSaveRef.current) {
        skipNextSaveRef.current = false;
        return;
      }
      void StorageService.saveState(appState);
    }
  }, [appState, isLoaded]);

  // Sync protection rules to the native layer whenever they change
  useEffect(() => {
    if (!isLoaded) return;
    void syncNativeBlockList(appState.appsConfig, SUPPORTED_APPS, {
      isFocusModeActive: appState.isFocusModeActive,
    });
  }, [appState.appsConfig, appState.isFocusModeActive, isLoaded]);

  // Stable, and accepts an updater for callers that must merge into the latest
  // state rather than the one they rendered with.
  const updateState = useCallback((updates: Partial<AppState> | ((previous: AppState) => Partial<AppState>)) => {
    setAppState((prev) => ({ ...prev, ...(typeof updates === 'function' ? updates(prev) : updates) }));
  }, []);

  if (!isLoaded)
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">Laden...</div>;

  const resetApp = () => {
    skipNextSaveRef.current = true;
    StorageService.clearState();
    setAppState(DEFAULT_STATE);
    setCurrentScreen('welcome');
  };

  const navigate = (screen: Screen) => {
    setCurrentScreen(screen);
  };

  return (
    <ErrorBoundary>
      <div className="app-stage min-h-screen text-zinc-100 font-sans selection:bg-zinc-800 flex justify-center items-center p-0 sm:p-4">
        <div className="app-device w-full max-w-md bg-zinc-950 h-[100dvh] sm:h-[850px] sm:max-h-[90vh] relative overflow-hidden flex flex-col sm:rounded-[2.5rem] shadow-2xl shadow-black/80 sm:border border-zinc-800/50">
          <div
            ref={screenScrollRef}
            data-testid="screen-scroll"
            className="flex-1 overflow-y-auto overflow-x-hidden relative scrollbar-hide"
          >
            <AnimatePresence mode="wait">
              {currentScreen === 'welcome' && <Welcome key="welcome" navigate={navigate} />}
              {currentScreen === 'onboarding' && (
                <Onboarding key="onboarding" state={appState} updateState={updateState} navigate={navigate} />
              )}
              {currentScreen === 'permissions' && (
                <PermissionsScreen
                  key="permissions"
                  state={appState}
                  updateState={updateState}
                  navigate={navigate}
                  isOnboarding={!appState.hasCompletedOnboarding}
                />
              )}
              {currentScreen === 'dashboard' && (
                <Dashboard key="dashboard" state={appState} updateState={updateState} navigate={navigate} />
              )}
              {currentScreen === 'apps' && (
                <AppList key="apps" state={appState} updateState={updateState} navigate={navigate} />
              )}
              {currentScreen === 'app_detail' && (
                <AppDetail key="app_detail" state={appState} updateState={updateState} navigate={navigate} />
              )}
              {currentScreen === 'rules' && (
                <Rules key="rules" state={appState} updateState={updateState} navigate={navigate} />
              )}
              {currentScreen === 'reels_protection' && (
                <ReelsProtectionScreen
                  key="reels_protection"
                  state={appState}
                  updateState={updateState}
                  navigate={navigate}
                />
              )}
              {currentScreen === 'focus' && (
                <Focus key="focus" state={appState} updateState={updateState} navigate={navigate} />
              )}
              {currentScreen === 'history' && <History key="history" state={appState} navigate={navigate} />}
              {currentScreen === 'settings' && (
                <Settings
                  key="settings"
                  state={appState}
                  updateState={updateState}
                  resetApp={resetApp}
                  navigate={navigate}
                />
              )}
              {currentScreen === 'privacy' && (
                <PrivacyScreen
                  key="privacy"
                  state={appState}
                  updateState={updateState}
                  resetApp={resetApp}
                  navigate={navigate}
                />
              )}
              {currentScreen === 'help' && <Help key="help" navigate={navigate} />}
              {currentScreen === 'protection_flow' && (
                <ProtectionFlow key="protection_flow" state={appState} updateState={updateState} navigate={navigate} />
              )}
              {currentScreen === 'active_session' && (
                <ActiveSessionScreen
                  key="active_session"
                  state={appState}
                  updateState={updateState}
                  navigate={navigate}
                />
              )}
              {currentScreen === 'diagnostics' && <DiagnosticsScreen key="diagnostics" navigate={navigate} />}
              {currentScreen === 'support' && <SupportScreen key="support" navigate={navigate} />}
              {currentScreen === 'imprint' && <ImprintScreen key="imprint" navigate={navigate} />}
              {currentScreen === 'debug' && !import.meta.env.PROD && (
                <DebugScreen key="debug" state={appState} updateState={updateState} navigate={navigate} />
              )}
            </AnimatePresence>
          </div>

          {appState.hasCompletedOnboarding &&
            !['welcome', 'onboarding', 'protection_flow', 'active_session', 'permissions'].includes(currentScreen) && (
              <BottomNav currentScreen={currentScreen} navigate={navigate} />
            )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
