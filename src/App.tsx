import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { AppState, Screen, DEFAULT_STATE, DEFAULT_PROFILES } from './types';
import { StorageService } from './lib/storage';
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

  useEffect(() => {
    const saved = StorageService.loadState();
    if (saved) {
      try {
        setAppState({ 
          ...DEFAULT_STATE, 
          ...saved, 
          profiles: DEFAULT_PROFILES.map(dp => {
            const savedProfile = saved.profiles?.find((p: any) => p.id === dp.id);
            return savedProfile ? { ...dp, appsConfig: savedProfile.appsConfig } : dp;
          }),
          activeProfileId: saved.activeProfileId || DEFAULT_STATE.activeProfileId 
        });
        if (saved.hasCompletedOnboarding) {
          setCurrentScreen('dashboard');
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
    if (isLoaded) {
      if (!appState.hasCompletedOnboarding && !['welcome', 'onboarding', 'permissions'].includes(currentScreen)) {
        setCurrentScreen('welcome');
      } else if (appState.hasCompletedOnboarding && ['welcome', 'onboarding'].includes(currentScreen)) {
        setCurrentScreen('dashboard');
      }
    }
  }, [isLoaded, currentScreen, appState.hasCompletedOnboarding]);

  // Sync state to local storage when it changes
  useEffect(() => {
    if (isLoaded) {
      StorageService.saveState(appState);
    }
  }, [appState, isLoaded]);

  if (!isLoaded) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">Laden...</div>;

  const updateState = (updates: Partial<AppState>) => {
    setAppState(prev => ({ ...prev, ...updates }));
  };

  const resetApp = () => {
    // Firebase reset disabled for v1.0 offline-first approach
    // if (user) {
    //   const userDocRef = doc(db, 'users', user.uid);
    //   setDoc(userDocRef, { ...DEFAULT_STATE, uid: user.uid }).catch(e => handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`));
    // }
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
          
          <div className="flex-1 overflow-y-auto overflow-x-hidden relative scrollbar-hide">
            <AnimatePresence mode="wait">
              {currentScreen === 'welcome' && <Welcome key="welcome" navigate={navigate} />}
            {currentScreen === 'onboarding' && <Onboarding key="onboarding" state={appState} updateState={updateState} navigate={navigate} />}
            {currentScreen === 'permissions' && <PermissionsScreen key="permissions" state={appState} updateState={updateState} navigate={navigate} isOnboarding={!appState.hasCompletedOnboarding} />}
            {currentScreen === 'dashboard' && <Dashboard key="dashboard" state={appState} updateState={updateState} navigate={navigate} />}
            {currentScreen === 'apps' && <AppList key="apps" state={appState} updateState={updateState} navigate={navigate} />}
            {currentScreen === 'app_detail' && <AppDetail key="app_detail" state={appState} updateState={updateState} navigate={navigate} />}
            {currentScreen === 'rules' && <Rules key="rules" state={appState} updateState={updateState} navigate={navigate} />}
            {currentScreen === 'reels_protection' && <ReelsProtectionScreen key="reels_protection" state={appState} updateState={updateState} navigate={navigate} />}
            {currentScreen === 'focus' && <Focus key="focus" state={appState} updateState={updateState} navigate={navigate} />}
            {currentScreen === 'history' && <History key="history" state={appState} navigate={navigate} />}
            {currentScreen === 'settings' && <Settings key="settings" state={appState} updateState={updateState} resetApp={resetApp} navigate={navigate} />}
            {currentScreen === 'privacy' && <PrivacyScreen key="privacy" state={appState} updateState={updateState} resetApp={resetApp} navigate={navigate} />}
            {currentScreen === 'help' && <Help key="help" navigate={navigate} />}
            {currentScreen === 'protection_flow' && <ProtectionFlow key="protection_flow" state={appState} updateState={updateState} navigate={navigate} />}
            {currentScreen === 'active_session' && <ActiveSessionScreen key="active_session" state={appState} updateState={updateState} navigate={navigate} />}
            {currentScreen === 'support' && <SupportScreen key="support" navigate={navigate} />}
            {currentScreen === 'imprint' && <ImprintScreen key="imprint" navigate={navigate} />}
            {currentScreen === 'debug' && <DebugScreen key="debug" state={appState} updateState={updateState} navigate={navigate} />}
          </AnimatePresence>
        </div>

        {appState.hasCompletedOnboarding && !['welcome', 'onboarding', 'protection_flow', 'active_session', 'permissions'].includes(currentScreen) && (
          <BottomNav currentScreen={currentScreen} navigate={navigate} />
        )}
      </div>
    </div>
    </ErrorBoundary>
  );
}

