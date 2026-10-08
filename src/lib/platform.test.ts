import { afterEach, describe, expect, it, vi } from 'vitest';
import { Capacitor } from '@capacitor/core';
import { canEnforceNatively, detectOperatingSystem } from './platform';

describe('detectOperatingSystem', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports the native platform inside the app', () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('android');

    expect(detectOperatingSystem()).toBe('android');
  });

  it('treats every browser as web, also on a phone', () => {
    // Usage Access and Screen Time do not exist in a browser, whatever the device.
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36',
    );

    expect(detectOperatingSystem()).toBe('web');
  });
});

describe('canEnforceNatively', () => {
  it('is false in the browser and true on devices', () => {
    expect(canEnforceNatively('web')).toBe(false);
    expect(canEnforceNatively('android')).toBe(true);
    expect(canEnforceNatively('ios')).toBe(true);
  });
});
