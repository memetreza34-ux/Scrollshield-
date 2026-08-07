import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'motion/react';
import { AppState, HistoryEvent, Screen, DEFAULT_STATE } from './types';
import { StorageService } from './lib/storage';
import { normalizeAppState } from './lib/state';
import { reconcileFocusRuntime } from './lib/focus';
import { NativeProtection } from './lib/nativeProtection';
import { getRuntimeOperatingSystem } from './lib/runtimePlatform';
import { createEventId } from './lib/appUtils';
import { recordProtectionEventStats } from './lib/session';
import { BottomNav } from './components/ui';
import { ReleaseWelcome, ReleaseOnboarding } from './screens/ReleaseOnboardingScreens';
import { DashboardScreen } from './screens/DashboardScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { AppList } from './screens/AppListScreen';
import { AppDetailScreen } from './screens/AppDetailScreen';
import { Rules, PrivacyScreen } from './screens/ConfigScreens';
import { SettingsScreen } from './screens/SettingsScreen';
import { HelpScreen } from './screens/HelpScreen';
import { ReleaseSupportScreen } from './screens/ReleaseSupportScreen';
import { FocusScreen } from './screens/FocusScreen';
import { ReleasePermissionsScreen } from './screens/ReleasePermissionsScreen';
import { DebugScreen } from './screens/DebugScreen';
import { MigrationRecoveryScreen } from './screens/MigrationRecoveryScreen';
import { ImprintScreen } from './screens/SupportScreen';
import { ErrorBoundary } from './components/ErrorBoundary';

const createRuntimeDefaultState = (): AppState => {
  const normalized = normalizeAppState(DEFAULT_STATE);
  return {
    ...normalized,
    operatingSystem: getRuntimeOperatingSystem(normalized.operatingSystem),
    activeSession: null,
    simulatedAppToOpen: null,
  };
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('welcome');
  const [appState, setAppState] = useState<AppState>(createRuntimeDefaultState);
  const [isLoaded, setIsLoaded] = useState(false);
  const [migrationBlocked, setMigrationBlocked] = useState(false);
  const skipNextSaveRef = useRef(false);
  const screenScrollRef = useRef<HTMLDivElement>(null);

  const applyLoadedState = React.useCallback((saved: Partial<AppState>): boolean => {
    try {
      const normalizedState = normalizeAppState(saved);
      const platformState: AppState = {
        ...normalizedState,
        operatingSystem: getRuntimeOperatingSystem(normalizedState.operatingSystem),
      };
      const focusUpdate = reconcileFocusRuntime(platformState);
      const restoredState = focusUpdate ? { ...platformState, ...focusUpdate } : platformState;
      const releaseState: AppState = {
        ...restoredState,
        activeSession: null,
        simulatedAppToOpen: null,
      };
      setAppState(releaseState);
      setCurrentScreen(releaseState.hasCompletedOnboarding ? 'dashboard' : 'welcome');
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
    if (!migrationBlocked || !NativeProtection.isAvailable()) return;
    void NativeProtection.stop({
      code: 'migration_recovery',
      message: 'Der Android-Schutz wurde wegen einer blockierten Datenmigration vorsorglich gestoppt',
    }).catch((error) => {
      console.error('Failed to stop native protection during migration recovery', error);
    });
  }, [migrationBlocked]);

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
    if (!isLoaded || migrationBlocked) return;

    if (['reels_protection', 'protection_flow', 'active_session'].includes(currentScreen)) {
      setCurrentScreen(appState.hasCompletedOnboarding ? 'apps' : 'welcome');
    } else if (import.meta.env.PROD && currentScreen === 'debug') {
      setCurrentScreen('dashboard');
    } else if (
      !appState.hasCompletedOnboarding &&
      !['welcome', 'onboarding', 'permissions'].includes(currentScreen)
    ) {
      setCurrentScreen('welcome');
    } else if (appState.hasCompletedOnboarding && ['welcome', 'onboarding'].includes(currentScreen)) {
      setCurrentScreen('dashboard');
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
    setAppState(createRuntimeDefaultState());
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
              {currentScreen === 'welcome' && <ReleaseWelcome key="welcome" navigate={navigate} />}
              {currentScreen === 'onboarding' && (
                <ReleaseOnboarding
                  key="onboarding"
                  state={appState}
                  updateState={updateState}
                  navigate={navigate}
                />
              )}
              {currentScreen === 'permissions' && (
                <ReleasePermissionsScreen
                  key="permissions"
                  state={appState}
                  updateState={updateState}
                  navigate={navigate}
                  isOnboarding={!appState.hasCompletedOnboarding}
                />
              )}
              {currentScreen === 'dashboard' && (
                <DashboardScreen key="dashboard" state={appState} updateState={updateState} navigate={navigate} />
              )}
              {currentScreen === 'apps' && (
                <AppList key="apps" state={appState} updateState={updateState} navigate={navigate} />
              )}
              {currentScreen === 'app_detail' && (
                <AppDetailScreen key="app_detail" state={appState} updateState={updateState} navigate={navigate} />
              )}
              {currentScreen === 'rules' && (
                <Rules key="rules" state={appState} updateState={updateState} navigate={navigate} />
              )}
              {currentScreen === 'focus' && (
                <FocusScreen key="focus" state={appState} updateState={updateState} navigate={navigate} />
              )}
              {currentScreen === 'history' && <HistoryScreen key="history" state={appState} navigate={navigate} />}
              {currentScreen === 'settings' && <SettingsScreen key="settings" state={appState} navigate={navigate} />}
              {currentScreen === 'privacy' && (
                <PrivacyScreen
                  key="privacy"
                  state={appState}
                  updateState={updateState}
                  resetApp={resetApp}
                  navigate={navigate}
                />
              )}
              {currentScreen === 'help' && <HelpScreen key="help" state={appState} navigate={navigate} />}
              {currentScreen === 'support' && <ReleaseSupportScreen key="support" navigate={navigate} />}
              {currentScreen === 'imprint' && <ImprintScreen key="imprint" navigate={navigate} />}
              {currentScreen === 'debug' && !import.meta.env.PROD && (
                <DebugScreen key="debug" state={appState} updateState={updateState} navigate={navigate} />
              )}
            </AnimatePresence>
          </div>

          {appState.hasCompletedOnboarding &&
            !['welcome', 'onboarding', 'permissions'].includes(currentScreen) && (
              <BottomNav currentScreen={currentScreen} navigate={navigate} />
            )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
