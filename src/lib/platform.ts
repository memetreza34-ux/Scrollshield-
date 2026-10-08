import { Capacitor } from '@capacitor/core';

/**
 * Platform detection
 * ══════════════════
 * `operatingSystem` was hardcoded to 'ios' in DEFAULT_STATE with the comment
 * "Defaulting to iOS for demonstration of fallbacks", and nothing ever changed
 * it. Consequences on every non-iOS device:
 *
 *  - The permission screen hid every Android card, so Usage Access, overlay and
 *    the short-video detection could not be granted at all.
 *  - The dashboard warned "Der Bildschirmzeit-Zugriff ist inaktiv" in a browser,
 *    where Screen Time does not exist.
 *
 * 'web' is a real third case: a browser has neither Screen Time nor Usage
 * Access, so claiming either platform there produces false statements.
 */

export type OperatingSystem = 'ios' | 'android' | 'web';

/**
 * Returns the platform the app is running on. Only the native shell counts:
 * a browser on a phone can neither read Usage Access nor use Screen Time, so
 * calling it 'android' or 'ios' showed permissions that cannot be granted
 * there – and let the user "activate" them anyway.
 */
export function detectOperatingSystem(): OperatingSystem {
  try {
    if (Capacitor.isNativePlatform()) {
      const platform = Capacitor.getPlatform();
      if (platform === 'ios' || platform === 'android') return platform;
    }
  } catch {
    // Capacitor unavailable – a plain browser.
  }

  return 'web';
}

/** True when the platform can enforce rules outside the app at all. */
export const canEnforceNatively = (operatingSystem: OperatingSystem) => operatingSystem !== 'web';
