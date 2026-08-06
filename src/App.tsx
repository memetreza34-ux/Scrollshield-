import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'motion/react';
import { AppState, HistoryEvent, Screen, DEFAULT_STATE } from './types';
import { StorageService } from './lib/storage';
import { normalizeAppState } from './lib/state';
import { reconcileFocusRuntime } from './lib/focus';
import { NativeProtection } from './lib/nativeProtection';
import { createEventId } from './lib/appUtils';
import { recordProtectionEventStats } from './lib/session';
import { BottomNav } from './components/ui';
import { Welcome, Onboarding } from './screens/OnboardingScreens';
import { Dashboard, History } from './screens/MainScreens';
import { AppList } from './screens/AppListScreen';
import { AppDetail, Rules, Settings, Help, PrivacyScreen } from './screens/ConfigScreens';
import { ReelsProtectionScreen } from './screens/ReelsProtectionScreen';
import { Focus } from './screens/FocusScreens';
import { ProtectionFlow } from './screens/ProtectionFlow';
import { PermissionsScreen } from './screens/PermissionsScreen';
import { DebugScreen } from './screens/DebugScreen';
import { ActiveSessionScreen } from './screens/ActiveSessionScreen';
import { MigrationRecoveryScreen } from './screens/MigrationRecoveryScreen';
import { SupportScreen, ImprintScreen } from './screens/SupportScreen';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('welcome');
  const [appState, setAppState] = useState<AppState>(DEFAULT_STATE);
  const [isLoaded, setIsLoaded] = useState(false);
  const [migrationBlocked, setMigrationBlocked] = useState(false);
  const skipNextSaveRef = useRef(false);
  const screenScrollRef = useRef<HTMLDivElement>(null);

  const applyLoadedState = React.useCallback((saved: Partial<AppState>): boolean => {
    try {
      const normalizedState = normalizeAppState(saved);
      const focusUpdate = reconcileFocusRuntime(normalizedState);
      const restoredState = focusUpdate ? { ...normalizedState, ...focusUpdate } : normalizedState;
      setAppState(restoredState);
      setCurrentScreen(
        restoredState.hasCompletedOnboarding
          ? restoredState.activeSession
            ? 'active_session'
            : 'dashboard'
          : 'welcome',
      );
      return true;
    } catch (error) {
      console.error('Failed to parse saved state', error);
      return false;
    }
  }, []);

  useEffect(() => {
    const saved = StorageService.loadState();
    const legacyPending = StorageService.hasPendingLegacyMigration();
    if (saved && !legacyPending) {
      applyLoadedState(saved);
    } else if (legacyPending) {
      setMigrationBlocked(true);
    }
    setIsLoaded(true);
  }, [applyLoadedState]);

  useEffect(() => {
    if (!isLoaded || migrationBlocked || !appState.isFocusModeActive) return;

    const syncFocusRuntime = () => {
      setAppState((previousState) => {
        const update = reconcileFocusRuntime(previousState);
        return update ? { ...previousState, ...update } : previousState;
      });
    };

    syncFocusRuntime();
    const interval = window.setInterval(syncFocusRuntime, 15_000);
    return () => window.clearInterval(interval);
  }, [isLoaded, migrationBlocked, appState.isFocusModeActive]);

  useEffect(() => {
    if (screenScrollRef.current) {
      screenScrollRef.current.scrollTop = 0;
    }
  }, [currentScreen]);

  useEffect(() => {
    if (isLoaded && !migrationBlocked) {
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
  }, [isLoaded, migrationBlocked, currentScreen, appState.hasCompletedOnboarding]);

  useEffect(() => {
    if (isLoaded && !migrationBlocked) {
      if (skipNextSaveRef.current) {
        skipNextSaveRef.current = false;
        return;
      }
      StorageService.saveState(appState);
    }
  }, [appState, isLoaded, migrationBlocked]);

  useEffect(() => {
    if (!isLoaded || migrationBlocked || !NativeProtection.isAvailable()) return;

    const syncTimer = window.setTimeout(() => {
      void NativeProtection.sync(appState.appsConfig, appState.isFocusModeActive).catch((error) => {
        console.error('Failed to sync native protection configuration', error);
      });
    }, 250);

    return () => window.clearTimeout(syncTimer);
  }, [appState.appsConfig, appState.isFocusModeActive, isLoaded, migrationBlocked]);

  useEffect(() => {
    if (!isLoaded || migrationBlocked || !NativeProtection.isAvailable()) return;

    let cancelled = false;
    const drainNativeData = async () => {
      try {
        const nativeDrain = await NativeProtection.drain();
        if (cancelled || (nativeDrain.events.length === 0 && nativeDrain.usage.length === 0)) return;

        setAppState((previousState) => {
          let dailyStats = previousState.dailyStats;

          for (const sample of nativeDrain.usage) {
            const existing = dailyStats[sample.date] || {
              date: sample.date,
              usageMinutes: {},
              blockedOpens: 0,
              savedTimeMinutes: 0,
              emergencyUnlocks: 0,
              focusMinutes: 0,
            };
            dailyStats = {
              ...dailyStats,
              [sample.date]: {
                ...existing,
                usageMinutes: {
                  ...existing.usageMinutes,
                  [sample.appId]: (existing.usageMinutes[sample.appId] || 0) + sample.durationMs / 60_000,
                },
              },
            };
          }

          const historyEvents: HistoryEvent[] = nativeDrain.events.map((event) => {
            dailyStats = recordProtectionEventStats(dailyStats, event.type, event.timestamp);
            return {
              id: createEventId(),
              timestamp: event.timestamp,
              type: event.type,
              appId: event.appId,
              desc: event.desc,
              trigger: 'Android-Systemschutz',
              metadata: { source: 'native_android' },
            };
          });

          return {
            ...previousState,
            history: [...historyEvents.reverse(), ...previousState.history].slice(0, 1_000),
            dailyStats,
          };
        });
      } catch (error) {
        console.error('Failed to import native protection data', error);
      }
    };

    void drainNativeData();
    const interval = window.setInterval(() => void drainNativeData(), 2_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isLoaded, migrationBlocked]);

  if (!isLoaded)
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">Laden...</div>;

  const retryLegacyMigration = (): boolean => {
    const saved = StorageService.loadState();
    const legacyPending = StorageService.hasPendingLegacyMigration();
    if (!saved || legacyPending) {
      setMigrationBlocked(legacyPending);
      return false;
    }
    const restored = applyLoadedState(saved);
    if (restored) setMigrationBlocked(false);
    return restored;
  };

  if (migrationBlocked) {
    return (
      <ErrorBoundary>
        <MigrationRecoveryScreen onRetry={retryLegacyMigration} />
      </ErrorBoundary>
    );
  }

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
