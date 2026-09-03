import { describe, expect, it } from 'vitest';
import { canEnforceNatively, detectFromUserAgent } from './platform';

describe('detectFromUserAgent', () => {
  it('detects Android phones', () => {
    expect(
      detectFromUserAgent(
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36',
      ),
    ).toBe('android');
  });

  it('detects iPhones', () => {
    expect(
      detectFromUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      ),
    ).toBe('ios');
  });

  it('detects iPads reporting the classic user agent', () => {
    expect(detectFromUserAgent('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15')).toBe('ios');
  });

  it('treats a desktop browser as web, not as a phone', () => {
    // The old hardcoded 'ios' made the dashboard claim Screen Time was missing.
    expect(
      detectFromUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
      ),
    ).toBe('web');
    expect(detectFromUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120')).toBe('web');
  });

  it('prefers Android when both tokens appear', () => {
    // Android WebViews often carry "Safari" and "like Mac OS X" fragments.
    expect(detectFromUserAgent('Mozilla/5.0 (Linux; Android 13) AppleWebKit like Mac OS X Safari')).toBe('android');
  });

  it('falls back to web on an empty user agent', () => {
    expect(detectFromUserAgent('')).toBe('web');
  });
});

describe('canEnforceNatively', () => {
  it('is false in the browser and true on devices', () => {
    expect(canEnforceNatively('web')).toBe(false);
    expect(canEnforceNatively('android')).toBe(true);
    expect(canEnforceNatively('ios')).toBe(true);
  });
});
