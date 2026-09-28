import type { Screen } from '../types';

/**
 * Where Android's back button leads from each screen – the same place as the
 * back arrow in the screen's header. Screens without an entry are start
 * screens: back sends the app to the background there.
 */
const BACK_TARGETS: Partial<Record<Screen, Screen>> = {
  onboarding: 'welcome',
  apps: 'dashboard',
  app_detail: 'apps',
  rules: 'dashboard',
  reels_protection: 'dashboard',
  focus: 'dashboard',
  history: 'dashboard',
  settings: 'dashboard',
  protection_flow: 'dashboard',
  privacy: 'settings',
  support: 'settings',
  diagnostics: 'settings',
  debug: 'settings',
  help: 'support',
  imprint: 'support',
};

/** The screen back leads to, or null when the app should go to the background. */
export function getBackTarget(screen: Screen, hasCompletedOnboarding: boolean): Screen | null {
  if (screen === 'permissions') return hasCompletedOnboarding ? 'settings' : 'onboarding';
  return BACK_TARGETS[screen] ?? null;
}
