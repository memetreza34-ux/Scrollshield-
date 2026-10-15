import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'motion/react';
import { AppState, Screen, DEFAULT_STATE, SUPPORTED_APPS } from './types';
import { StorageService } from './lib/storage';
import { normalizeAppState } from './lib/state';
import { getFocusBlockedAppIds, getRunningFocusSession, reconcileFocusRuntime } from './lib/focus';
import {
  acknowledgeInterruptionEvents,
  clearNativeData,
  minimizeApp,
  onHardwareBack,
  readAppIcons,
  readAppUsage,
  readScreenTime,
  readInterruptionEvents,
  readShortVideoUsage,
  syncNativeBlockList,
} from './lib/nativeBridge';
import { getBackTarget, isAllowedBeforeOnboarding } from './lib/navigation';
import { mergeNativeInterruptions } from './lib/nativeEvents';
import { mergeNativeAppUsage, mergeNativeShortVideoUsage, mergeScreenTime } from './lib/stats';
import { getLocalDateKey } from './lib/appUtils';
import { detectOperatingSystem } from './lib/platform';
import { AppIconsContext } from './lib/appIcons';
import {
  FOCUS_FINISHED_TAG,
  LEGACY_EVENING_REMINDER_TAG,
  NotificationPayload,
  buildDailySummary,
  buildFocusFinished,
  buildWeeklyReview,
  cancelNotification,
  scheduleNotification,
  sendNotification,
  shouldSendDailySummary,
  shouldSendWeeklyReview,
  usesNativeNotifications,
} from './lib/notifications';
import { BottomNav } from './components/ui';
import { Welcome, Onboarding } from './screens/OnboardingScreens';
import { PrivacyScreen } from './screens/ConfigScreens';
import { TodayScreen } from './screens/TodayScreen';
import { AppDetailScreen, CommitmentScreen, ProtectScreen, ScheduleEditScreen } from './screens/ProtectScreens';
import { Focus } from './screens/FocusScreens';
import { RescueScreen } from './screens/RescueScreen';
import { InsightsScreen } from './screens/InsightsScreen';
import { NotificationsScreen, ProStatusScreen, SettingsScreen } from './screens/SettingsScreens';
import { PaywallScreen } from './screens/PaywallScreen';
import { ProExpiredScreen } from './screens/ProExpiredScreen';
import { effectiveAppsConfig, mustChooseFreeApps } from './lib/entitlements';
import { ProtectionFlow } from './screens/ProtectionFlow';
import { PermissionsScreen } from './screens/PermissionsScreen';
import { DebugScreen } from './screens/DebugScreen';
import { DiagnosticsScreen } from './screens/DiagnosticsScreen';
import { ActiveSessionScreen } from './screens/ActiveSessionScreen';
import { SupportScreen, ImprintScreen } from './screens/SupportScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { resolveLanguage, setLanguage, t } from './i18n';

/** When each best-effort notification was last sent, per session of the app. */
type SentNotifications = {
  dailySummarySentOn: string | null;
  weeklyReviewSentOn: string | null;
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('welcome');
  const [appState, setAppState] = useState<AppState>(DEFAULT_STATE);
  const [isLoaded, setIsLoaded] = useState(false);
  const [appIcons, setAppIcons] = useState<ReadonlyMap<string, string>>(() => new Map());
  const skipNextSaveRef = useRef(false);
  const screenScrollRef = useRef<HTMLDivElement>(null);
  // Notifications are deliberately not persisted: a reminder missed because the
  // app was closed should not fire on next launch.
  const notificationStateRef = useRef<SentNotifications>({
    dailySummarySentOn: null,
    weeklyReviewSentOn: null,
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
            setCurrentScreen(restoredState.activeSession ? 'active_session' : 'today');
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

  // Focus-end reminder. Sent from committed state, not from inside the state
  // updater: React may run an updater twice (StrictMode does), and an updater
  // must not have side effects.
  //  - Native app: handed to the system when the session starts, so it arrives
  //    even when ScrollShield is closed at the end; withdrawn if the session is
  //    stopped early or the switch is turned off.
  //  - Browser: nothing can be scheduled, so it is sent when the running app
  //    notices the session ran out.
  const focusRemindersEnabled = appState.settings.notifications.focusReminders;
  const runningFocusSessionIdRef = useRef<string | null>(null);
  const scheduledFocusReminderRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isLoaded) return;

    const running = appState.focusSessions.find((session) => session.endTime === null);
    const previousId = runningFocusSessionIdRef.current;
    runningFocusSessionIdRef.current = running?.id ?? null;

    if (running) {
      const key = focusRemindersEnabled ? running.id : null;
      if (scheduledFocusReminderRef.current === key) return;
      scheduledFocusReminderRef.current = key;
      if (key) {
        void scheduleNotification(
          buildFocusFinished(running.duration),
          new Date(running.startTime + running.duration * 60_000),
        );
      } else {
        void cancelNotification(FOCUS_FINISHED_TAG);
      }
      return;
    }

    scheduledFocusReminderRef.current = null;
    if (!previousId) return;

    // Only the timer ends a session exactly at its scheduled end.
    const finished = appState.focusSessions.find((session) => session.id === previousId);
    const ranOut =
      !!finished?.successful &&
      finished.endTime !== null &&
      finished.endTime === finished.startTime + finished.duration * 60_000;

    if (!ranOut) {
      void cancelNotification(FOCUS_FINISHED_TAG);
    } else if (focusRemindersEnabled && !usesNativeNotifications()) {
      void sendNotification(buildFocusFinished(finished.duration));
    }
  }, [isLoaded, appState.focusSessions, focusRemindersEnabled]);

  // What happened on the device while ScrollShield was in the background:
  // short-video minutes from the accessibility service, foreground minutes of
  // the protected apps and the interruptions the overlay showed. Pulled on start, on return to the app and once a
  // minute while it runs; in the browser both come back empty.
  useEffect(() => {
    if (!isLoaded) return;

    let cancelled = false;
    const pull = async () => {
      const [usage, appUsage, interruptions, screenTime] = await Promise.all([
        readShortVideoUsage(),
        readAppUsage(),
        readInterruptionEvents(),
        readScreenTime(),
      ]);
      if (cancelled) return;
      const today = getLocalDateKey(new Date());

      setAppState((previous) => {
        let next = previous;
        if (usage.available && usage.entries.length > 0) {
          const dailyStats = mergeNativeShortVideoUsage(
            next.dailyStats,
            { date: usage.date ?? today, entries: usage.entries },
            SUPPORTED_APPS,
          );
          if (dailyStats !== next.dailyStats) next = { ...next, dailyStats };
        }
        if (appUsage.available && appUsage.entries.length > 0) {
          const dailyStats = mergeNativeAppUsage(
            next.dailyStats,
            { date: appUsage.date ?? today, entries: appUsage.entries },
            SUPPORTED_APPS,
          );
          if (dailyStats !== next.dailyStats) next = { ...next, dailyStats };
        }
        if (screenTime.available) {
          const dailyStats = mergeScreenTime(next.dailyStats, { ...screenTime, date: screenTime.date ?? today });
          if (dailyStats !== next.dailyStats) next = { ...next, dailyStats };
        }
        if (interruptions.length > 0) {
          const merged = mergeNativeInterruptions(next, interruptions, SUPPORTED_APPS);
          if (merged.history !== next.history) next = { ...next, ...merged };
        }
        return next;
      });

      // Now part of the state, which the save effect persists right away.
      // Should the acknowledgement fail, the next pull finds them in the
      // history and skips them.
      void acknowledgeInterruptionEvents(interruptions.map((event) => event.id));
    };
    const pullWhenVisible = () => {
      if (document.visibilityState === 'visible') void pull();
    };

    void pull();
    const interval = window.setInterval(() => void pull(), 60_000);
    document.addEventListener('visibilitychange', pullWhenVisible);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', pullWhenVisible);
    };
  }, [isLoaded]);

  // Launcher icons of the installed protected apps for the app tiles. Read on
  // start and on return to the app, which is where a new app gets installed.
  useEffect(() => {
    if (detectOperatingSystem() !== 'android') return;

    let cancelled = false;
    const packages = SUPPORTED_APPS.flatMap((app) => app.androidPackages);
    const read = () => {
      if (document.visibilityState !== 'visible') return;
      void readAppIcons(packages).then((icons) => {
        if (!cancelled) setAppIcons(icons);
      });
    };

    read();
    document.addEventListener('visibilitychange', read);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', read);
    };
  }, []);

  // Older versions scheduled an evening reminder as a daily alarm; it is not
  // part of V1, so a leftover alarm is cancelled once per start.
  useEffect(() => {
    if (isLoaded && usesNativeNotifications()) void cancelNotification(LEGACY_EVENING_REMINDER_TAG);
  }, [isLoaded]);

  // Everything that depends on the day's data can only be sent while the app
  // runs: the daily summary and the weekly review. The "sent" mark
  // is set before the asynchronous send so a state change in between cannot
  // send twice; a failed send clears it again.
  useEffect(() => {
    if (!isLoaded) return;

    const sendMarked = <K extends keyof SentNotifications>(
      key: K,
      value: SentNotifications[K],
      payload: NotificationPayload,
    ) => {
      const sent = notificationStateRef.current;
      const previous = sent[key];
      sent[key] = value;
      void sendNotification(payload).then((ok) => {
        if (!ok) sent[key] = previous;
      });
    };

    const check = () => {
      const sent = notificationStateRef.current;
      const now = new Date();
      const today = getLocalDateKey(now);

      if (shouldSendWeeklyReview(appState, sent.weeklyReviewSentOn, now)) {
        sendMarked('weeklyReviewSentOn', today, buildWeeklyReview(appState, now));
      }

      if (shouldSendDailySummary(appState, sent.dailySummarySentOn, now)) {
        sendMarked('dailySummarySentOn', today, buildDailySummary(appState, now));
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

  // Android's back button. Screens are switched without browser history, so
  // without this back closed ScrollShield on every screen. Registered once;
  // the ref carries the current screen into the handler.
  const backStateRef = useRef({ screen: currentScreen, onboarded: false });
  useEffect(() => {
    backStateRef.current = { screen: currentScreen, onboarded: appState.hasCompletedOnboarding };
  }, [currentScreen, appState.hasCompletedOnboarding]);
  useEffect(() => {
    if (!isLoaded) return;
    return onHardwareBack(() => {
      const { screen, onboarded } = backStateRef.current;
      const target = getBackTarget(screen, onboarded);
      if (!target) {
        void minimizeApp();
        return;
      }
      // Leaving the protection flow is its "cancel".
      if (screen === 'protection_flow') setAppState((previous) => ({ ...previous, simulatedAppToOpen: null }));
      setCurrentScreen(target);
    });
  }, [isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      if (import.meta.env.PROD && currentScreen === 'debug') {
        setCurrentScreen('today');
      } else if (!appState.hasCompletedOnboarding && !isAllowedBeforeOnboarding(currentScreen)) {
        setCurrentScreen('welcome');
      } else if (appState.hasCompletedOnboarding && ['welcome', 'onboarding'].includes(currentScreen)) {
        setCurrentScreen('today');
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

  // Sync protection rules to the native layer whenever they change. Focus
  // and rescue go down with their end time, so the phone unlocks on time even
  // when ScrollShield is closed.
  useEffect(() => {
    if (!isLoaded) return;
    const running = getRunningFocusSession({ focusSessions: appState.focusSessions });
    void syncNativeBlockList(
      effectiveAppsConfig({ appsConfig: appState.appsConfig, pro: appState.pro }),
      SUPPORTED_APPS,
      {
        isFocusModeActive: appState.isFocusModeActive,
        focusBlockedAppIds: getFocusBlockedAppIds({
          focusSessions: appState.focusSessions,
          isFocusModeActive: appState.isFocusModeActive,
        }),
        focusUntil: running ? running.startTime + running.duration * 60_000 : undefined,
        focusStrict: running?.strict === true,
        commitmentUntil: appState.commitment?.until,
        schedules: appState.schedules,
      },
    );
  }, [
    appState.appsConfig,
    appState.pro,
    appState.isFocusModeActive,
    appState.focusSessions,
    appState.schedules,
    appState.commitment,
    isLoaded,
  ]);

  // Stable, and accepts an updater for callers that must merge into the latest
  // state rather than the one they rendered with.
  // t() reads one module-wide language; setting it on every render keeps all
  // screens of this render in the language of the setting (or of the phone).
  setLanguage(resolveLanguage(appState.settings.language));

  const updateState = useCallback((updates: Partial<AppState> | ((previous: AppState) => Partial<AppState>)) => {
    setAppState((prev) => ({ ...prev, ...(typeof updates === 'function' ? updates(prev) : updates) }));
  }, []);

  if (!isLoaded)
    return (
      <div className="flex min-h-screen items-center justify-center bg-ground text-body text-muted">
        {t('common.loading')}
      </div>
    );

  const resetApp = () => {
    skipNextSaveRef.current = true;
    StorageService.clearState();
    void clearNativeData();
    // Pro belongs to the Google account, not to the data on this phone.
    setAppState((previous) => ({ ...DEFAULT_STATE, pro: previous.pro }));
    setCurrentScreen('welcome');
  };

  const navigate = (screen: Screen) => {
    setCurrentScreen(screen);
  };

  // Pro ended with more apps than Free protects: the choice comes first; only
  // the paywall ("Pro erneuern") may open on top of it.
  const choosingFreeApps = mustChooseFreeApps(appState) && currentScreen !== 'paywall';

  return (
    <ErrorBoundary>
      <AppIconsContext.Provider value={appIcons}>
        <div className="flex min-h-screen items-center justify-center bg-black p-0 font-sans text-ink selection:bg-raised sm:p-4">
          <div className="relative flex h-[100dvh] w-full max-w-md flex-col overflow-hidden bg-ground sm:h-[850px] sm:max-h-[90vh] sm:rounded-[2.5rem] sm:border sm:border-line">
            <div
              ref={screenScrollRef}
              data-testid="screen-scroll"
              className="flex-1 overflow-y-auto overflow-x-hidden relative scrollbar-hide"
            >
              {choosingFreeApps ? (
                <ProExpiredScreen state={appState} updateState={updateState} navigate={navigate} />
              ) : (
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
                    />
                  )}
                  {currentScreen === 'today' && (
                    <TodayScreen key="today" state={appState} updateState={updateState} navigate={navigate} />
                  )}
                  {currentScreen === 'protect' && (
                    <ProtectScreen key="protect" state={appState} updateState={updateState} navigate={navigate} />
                  )}
                  {currentScreen === 'app_detail' && (
                    <AppDetailScreen key="app_detail" state={appState} updateState={updateState} navigate={navigate} />
                  )}
                  {currentScreen === 'schedule_edit' && (
                    <ScheduleEditScreen
                      key="schedule_edit"
                      state={appState}
                      updateState={updateState}
                      navigate={navigate}
                    />
                  )}
                  {currentScreen === 'commitment' && (
                    <CommitmentScreen key="commitment" state={appState} updateState={updateState} navigate={navigate} />
                  )}
                  {currentScreen === 'focus' && (
                    <Focus key="focus" state={appState} updateState={updateState} navigate={navigate} />
                  )}
                  {currentScreen === 'rescue' && (
                    <RescueScreen key="rescue" state={appState} updateState={updateState} navigate={navigate} />
                  )}
                  {currentScreen === 'insights' && (
                    <InsightsScreen key="insights" state={appState} updateState={updateState} navigate={navigate} />
                  )}
                  {currentScreen === 'settings' && (
                    <SettingsScreen key="settings" state={appState} updateState={updateState} navigate={navigate} />
                  )}
                  {currentScreen === 'pro_status' && (
                    <ProStatusScreen key="pro_status" state={appState} updateState={updateState} navigate={navigate} />
                  )}
                  {currentScreen === 'notifications' && (
                    <NotificationsScreen
                      key="notifications"
                      state={appState}
                      updateState={updateState}
                      navigate={navigate}
                    />
                  )}
                  {currentScreen === 'paywall' && (
                    <PaywallScreen key="paywall" state={appState} updateState={updateState} navigate={navigate} />
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
                  {currentScreen === 'protection_flow' && (
                    <ProtectionFlow
                      key="protection_flow"
                      state={appState}
                      updateState={updateState}
                      navigate={navigate}
                    />
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
                  {currentScreen === 'support' && (
                    <SupportScreen
                      key="support"
                      navigate={navigate}
                      backTo={appState.hasCompletedOnboarding ? 'settings' : 'welcome'}
                    />
                  )}
                  {currentScreen === 'imprint' && <ImprintScreen key="imprint" navigate={navigate} />}
                  {currentScreen === 'debug' && !import.meta.env.PROD && (
                    <DebugScreen key="debug" state={appState} updateState={updateState} navigate={navigate} />
                  )}
                </AnimatePresence>
              )}
            </div>

            {appState.hasCompletedOnboarding &&
              !choosingFreeApps &&
              !['welcome', 'onboarding', 'protection_flow', 'active_session', 'permissions'].includes(
                currentScreen,
              ) && <BottomNav currentScreen={currentScreen} navigate={navigate} />}
          </div>
        </div>
      </AppIconsContext.Provider>
    </ErrorBoundary>
  );
}
