import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'motion/react';
import { AppState, Screen, DEFAULT_STATE } from './types';
import { StorageService } from './lib/storage';
import { normalizeAppState } from './lib/state';
import { reconcileFocusRuntime } from './lib/focus';
import { NativeProtection } from './lib/nativeProtection';
import {
  applyNativeDrainBatch,
  getLastProcessedNativeDrainBatchId,
} from './lib/nativeDrainJournal';
import { getRuntimeOperatingSystem } from './lib/runtimePlatform';
import {
  applyCommitmentGuard,
  assessCommitmentStartReadiness,
  clearCommitmentLock,
  createCommitmentLock,
  isCommitmentLockActive,
  loadCommitmentLock,
  saveCommitmentLock,
  type CommitmentDurationMinutes,
  type CommitmentLock,
  type CommitmentStartResult,
} from './lib/commitmentLock';
import { BottomNav } from './components/ui';
import { ReleaseWelcome, ReleaseOnboarding } from './screens/ReleaseOnboardingScreens';
import { DashboardScreen } from './screens/DashboardScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { AppList } from './screens/AppListScreen';
import { ReleaseAppDetailScreen } from './screens/ReleaseAppDetailScreen';
import { ProfilesScreen } from './screens/ProfilesScreen';
import { ReleasePrivacyScreen } from './screens/ReleasePrivacyScreen';
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
  const [commitmentLock, setCommitmentLock] = useState<CommitmentLock | null>(() => loadCommitmentLock());
  const [isLoaded, setIsLoaded] = useState(false);
  const [migrationBlocked, setMigrationBlocked] = useState(false);
  const skipNextSaveRef = useRef(false);
  const screenScrollRef = useRef<HTMLDivElement>(null);
  const appStateRef = useRef(appState);
  const pendingNativeDrainAckRef = useRef<string | null>(null);
  const persistedNativeDrainBatchIdRef = useRef<string | null>(null);
  appStateRef.current = appState;

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
      persistedNativeDrainBatchIdRef.current = getLastProcessedNativeDrainBatchId(releaseState);
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
    setCommitmentLock(loadCommitmentLock());
    setIsLoaded(true);
  }, [applyLoadedState]);

  useEffect(() => {
    if (!commitmentLock) return;
    const remaining = commitmentLock.lockedUntil - Date.now();
    if (remaining <= 0) {
      clearCommitmentLock();
      setCommitmentLock(null);
      return;
    }

    const timeout = window.setTimeout(() => {
      clearCommitmentLock();
      setCommitmentLock(null);
    }, remaining);
    return () => window.clearTimeout(timeout);
  }, [commitmentLock]);

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
    } else if (isCommitmentLockActive(commitmentLock) && currentScreen === 'app_detail') {
      setCurrentScreen('apps');
    } else if (import.meta.env.PROD && currentScreen === 'debug') {
      setCurrentScreen('dashboard');
    } else if (
      !appState.hasCompletedOnboarding &&
      !['welcome', 'onboarding', 'permissions', 'help'].includes(currentScreen)
    ) {
      setCurrentScreen('welcome');
    } else if (appState.hasCompletedOnboarding && ['welcome', 'onboarding'].includes(currentScreen)) {
      setCurrentScreen('dashboard');
    }
  }, [isLoaded, migrationBlocked, currentScreen, appState.hasCompletedOnboarding, commitmentLock]);

  useEffect(() => {
    if (!isLoaded || migrationBlocked) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    const saved = StorageService.saveState(appState);
    if (!saved) return;

    const persistedBatchId = getLastProcessedNativeDrainBatchId(appState);
    persistedNativeDrainBatchIdRef.current = persistedBatchId;
    const pendingBatchId = pendingNativeDrainAckRef.current;
    if (!pendingBatchId || persistedBatchId !== pendingBatchId || !NativeProtection.isAvailable()) return;

    void NativeProtection.acknowledgeDrain(pendingBatchId)
      .then(() => {
        if (pendingNativeDrainAckRef.current === pendingBatchId) {
          pendingNativeDrainAckRef.current = null;
        }
      })
      .catch((error) => {
        console.error('Failed to acknowledge persisted native protection data', error);
      });
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
    let drainInFlight = false;
    const drainNativeData = async () => {
      if (drainInFlight) return;
      drainInFlight = true;
      try {
        const nativeDrain = await NativeProtection.drain();
        if (cancelled || !nativeDrain.batchId) return;

        // Crash recovery: if this id is known to have reached StorageService successfully, the
        // payload was already applied before the previous process died. Only ACK it; never add it
        // to stats/history again.
        if (persistedNativeDrainBatchIdRef.current === nativeDrain.batchId) {
          await NativeProtection.acknowledgeDrain(nativeDrain.batchId);
          return;
        }

        // A previous save attempt may have failed in this process. If the in-memory state already
        // carries the id, retry the transactional save explicitly instead of relying on another
        // React state change to retrigger the save effect.
        const currentState = appStateRef.current;
        if (getLastProcessedNativeDrainBatchId(currentState) === nativeDrain.batchId) {
          if (StorageService.saveState(currentState)) {
            persistedNativeDrainBatchIdRef.current = nativeDrain.batchId;
            await NativeProtection.acknowledgeDrain(nativeDrain.batchId);
            if (pendingNativeDrainAckRef.current === nativeDrain.batchId) {
              pendingNativeDrainAckRef.current = null;
            }
          }
          return;
        }

        pendingNativeDrainAckRef.current = nativeDrain.batchId;
        setAppState((previousState) => applyNativeDrainBatch(previousState, nativeDrain));
      } catch (error) {
        console.error('Failed to import native protection data', error);
      } finally {
        drainInFlight = false;
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
    setAppState((previousState) => ({
      ...previousState,
      ...applyCommitmentGuard(previousState, updates, commitmentLock),
    }));
  };

  const startCommitment = async (durationMinutes: CommitmentDurationMinutes): Promise<CommitmentStartResult> => {
    if (isCommitmentLockActive(commitmentLock) || isCommitmentLockActive(loadCommitmentLock())) {
      return {
        ok: false,
        code: 'already_active',
        message: 'Commitment ist bereits aktiv.',
      };
    }

    const nativeAvailable = NativeProtection.isAvailable();
    const preliminary = assessCommitmentStartReadiness(appState, {
      nativeAvailable,
      unavailableAppIds: [],
      running: true,
      enabled: true,
    });
    if (!preliminary.ok) return preliminary;

    try {
      const unavailableAppIds = await NativeProtection.sync(appState.appsConfig, appState.isFocusModeActive);
      const serviceStatus = await NativeProtection.getStatus();
      const readiness = assessCommitmentStartReadiness(appState, {
        nativeAvailable: true,
        unavailableAppIds,
        running: serviceStatus.running,
        enabled: serviceStatus.enabled,
      });
      if (!readiness.ok) return readiness;

      if (isCommitmentLockActive(loadCommitmentLock())) {
        return {
          ok: false,
          code: 'already_active',
          message: 'Commitment ist bereits aktiv.',
        };
      }

      const nextLock = createCommitmentLock(durationMinutes);
      if (!saveCommitmentLock(nextLock)) {
        return {
          ok: false,
          code: 'storage_failed',
          message: 'Commitment konnte nicht sicher lokal gespeichert werden. Es wurde nicht aktiviert.',
        };
      }
      setCommitmentLock(nextLock);
      return { ok: true };
    } catch (error) {
      console.error('Failed to verify native protection before commitment', error);
      return {
        ok: false,
        code: 'runtime_check_failed',
        message: 'Der aktuelle Android-Schutzstatus konnte nicht sicher geprüft werden. Commitment wurde nicht aktiviert.',
        action: 'permissions',
      };
    }
  };

  const resetApp = () => {
    if (NativeProtection.isAvailable()) {
      void NativeProtection.stop({
        code: 'factory_reset',
        message: 'Der Android-Schutz wurde wegen eines vollständigen ScrollShield-Resets beendet',
      }).catch((error) => {
        console.error('Failed to stop native protection during app reset', error);
      });
    }
    skipNextSaveRef.current = true;
    pendingNativeDrainAckRef.current = null;
    persistedNativeDrainBatchIdRef.current = null;
    StorageService.clearState();
    clearCommitmentLock();
    setCommitmentLock(null);
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
                  commitmentLock={commitmentLock}
                />
              )}
              {currentScreen === 'dashboard' && (
                <DashboardScreen
                  key="dashboard"
                  state={appState}
                  updateState={updateState}
                  navigate={navigate}
                  commitmentLock={commitmentLock}
                />
              )}
              {currentScreen === 'apps' && (
                <AppList
                  key="apps"
                  state={appState}
                  updateState={updateState}
                  navigate={navigate}
                  commitmentLock={commitmentLock}
                />
              )}
              {currentScreen === 'app_detail' && (
                <ReleaseAppDetailScreen
                  key="app_detail"
                  state={appState}
                  updateState={updateState}
                  navigate={navigate}
                />
              )}
              {currentScreen === 'rules' && (
                <ProfilesScreen
                  key="rules"
                  state={appState}
                  updateState={updateState}
                  navigate={navigate}
                  commitmentLock={commitmentLock}
                  onStartCommitment={startCommitment}
                />
              )}
              {currentScreen === 'focus' && (
                <FocusScreen key="focus" state={appState} updateState={updateState} navigate={navigate} />
              )}
              {currentScreen === 'history' && <HistoryScreen key="history" state={appState} navigate={navigate} />}
              {currentScreen === 'settings' && <SettingsScreen key="settings" state={appState} navigate={navigate} />}
              {currentScreen === 'privacy' && (
                <ReleasePrivacyScreen
                  key="privacy"
                  state={appState}
                  updateState={updateState}
                  resetApp={resetApp}
                  navigate={navigate}
                  commitmentLock={commitmentLock}
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
