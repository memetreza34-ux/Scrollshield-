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
 * Returns the platform the app is running on. Uses Capacitor inside the native
 * shell and falls back to user-agent detection in the browser.
 */
export function detectOperatingSystem(): OperatingSystem {
  try {
    if (Capacitor.isNativePlatform()) {
      const platform = Capacitor.getPlatform();
      if (platform === 'ios' || platform === 'android') return platform;
    }
  } catch {
    // Capacitor unavailable – fall through to the browser check.
  }

  return detectFromUserAgent(typeof navigator !== 'undefined' ? navigator.userAgent : '');
}

/**
 * Browser detection. Exported for tests: user-agent strings are the kind of
 * thing that silently stops matching.
 */
export function detectFromUserAgent(userAgent: string): OperatingSystem {
  const ua = userAgent.toLowerCase();

  if (/android/.test(ua)) return 'android';

  // iPadOS 13+ reports itself as a Mac, distinguishable by touch support.
  const isIpadOs = /macintosh/.test(ua) && typeof navigator !== 'undefined' && (navigator.maxTouchPoints ?? 0) > 1;
  if (/iphone|ipad|ipod/.test(ua) || isIpadOs) return 'ios';

  return 'web';
}

/** True when the platform can enforce rules outside the app at all. */
export const canEnforceNatively = (operatingSystem: OperatingSystem) => operatingSystem !== 'web';
