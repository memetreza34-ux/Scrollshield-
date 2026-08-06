import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'motion/react';
import { AppState, Screen, DEFAULT_STATE } from './types';
import { StorageService } from './lib/storage';
import { normalizeAppState } from './lib/state';
import { reconcileFocusRuntime } from './lib/focus';
import { NativeProtection } from './lib/nativeProtection';
import { BottomNav } from './components/ui';
import { Welcome, Onboarding } from './screens/OnboardingScreens';
import { Dashboard, History } from './screens/MainScreens';
import { AppList, AppDetail, Rules, Settings, Help, PrivacyScreen } from './screens/ConfigScreens';
import { ReelsProtectionScreen } from './screens/ReelsProtectionScreen';
import { Focus } from './screens/FocusScreens';
import { ProtectionFlow } from './screens/ProtectionFlow';
import { PermissionsScreen } from './screens/PermissionsScreen';
import { DebugScreen } from './screens/DebugScreen';
import { ActiveSessionScreen } from './screens/ActiveSessionScreen';
import { SupportScreen, ImprintScreen } from './screens/SupportScreen';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('welcome');
  const [appState, setAppState] = useState<AppState>(DEFAULT_STATE);
  const [isLoaded, setIsLoaded] = useState(false);
  const skipNextSaveRef = useRef(false);
  const screenScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = StorageService.loadState();
    if (saved) {
      try {
        const normalizedState = normalizeAppState(saved);
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
    }
    setIsLoaded(true);
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

  useEffect(() => {
    if (isLoaded) {
      if (skipNextSaveRef.current) {
        skipNextSaveRef.current = false;
        return;
      }
      StorageService.saveState(appState);
    }
  }, [appState, isLoaded]);

  useEffect(() => {
    if (!isLoaded || !NativeProtection.isAvailable()) return;

    const syncTimer = window.setTimeout(() => {
      void NativeProtection.sync(appState.appsConfig, appState.isFocusModeActive).catch((error) => {
        console.error('Failed to sync native protection configuration', error);
      });
    }, 250);

    return () => window.clearTimeout(syncTimer);
  }, [appState.appsConfig, appState.isFocusModeActive, isLoaded]);

  if (!isLoaded)
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">Laden...</div>;

  const updateState = (updates: Partial<AppState>) => {
    setAppState((prev) => ({ ...prev, ...updates }));
  };

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
      <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-zinc-800 flex justify-center items-center p-0 sm:p-4">
        <div className="w-full max-w-md bg-zinc-950 h-[100dvh] sm:h-[850px] sm:max-h-[90vh] relative overflow-hidden flex flex-col sm:rounded-[2.5rem] shadow-2xl shadow-black/80 sm:border border-zinc-800/50">
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
