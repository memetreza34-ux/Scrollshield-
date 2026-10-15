import type { Screen } from '../types';

/**
 * Where Android's back button leads from each screen – the same place as the
 * back arrow in the screen's header. Screens without an entry are start
 * screens: back sends the app to the background there.
 */
const BACK_TARGETS: Partial<Record<Screen, Screen>> = {
  onboarding: 'welcome',
  // The tabs: back leads to Heute, and from there out of the app.
  protect: 'today',
  focus: 'today',
  insights: 'today',
  app_detail: 'protect',
  schedule_edit: 'protect',
  commitment: 'protect',
  rescue: 'today',
  paywall: 'today',
  settings: 'today',
  pro_status: 'settings',
  protection_flow: 'today',
  notifications: 'settings',
  privacy: 'settings',
  support: 'settings',
  diagnostics: 'permissions',
  debug: 'settings',
  help: 'support',
  imprint: 'settings',
};

/**
 * Screens reachable before the onboarding is done. "Mehr erfahren" on the
 * welcome screen leads to the help, and help, support, imprint and privacy
 * must be readable before anyone agrees to anything; with only the three
 * setup screens allowed, the app bounced straight back to the welcome screen.
 */
const PRE_ONBOARDING_SCREENS: Screen[] = [
  'welcome',
  'onboarding',
  'permissions',
  'help',
  'support',
  'imprint',
  'privacy',
];

export const isAllowedBeforeOnboarding = (screen: Screen) => PRE_ONBOARDING_SCREENS.includes(screen);

/** The screen back leads to, or null when the app should go to the background. */
export function getBackTarget(screen: Screen, hasCompletedOnboarding: boolean): Screen | null {
  if (screen === 'permissions') return hasCompletedOnboarding ? 'settings' : 'onboarding';
  const target = BACK_TARGETS[screen] ?? null;
  if (target && !hasCompletedOnboarding && !isAllowedBeforeOnboarding(target)) return 'welcome';
  return target;
}
