import { describe, expect, it } from 'vitest';
import { DEFAULT_APP_CONFIG } from '../types';
import { createEventId, getActiveReelsCount, getLocalDateKey, REELS_PLATFORM_IDS } from './appUtils';

describe('getLocalDateKey', () => {
  it('formats a date as a local YYYY-MM-DD key', () => {
    expect(getLocalDateKey(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
});

describe('createEventId', () => {
  it('returns non-empty unique-looking ids', () => {
    const first = createEventId();
    const second = createEventId();

    expect(first.length).toBeGreaterThan(8);
    expect(second.length).toBeGreaterThan(8);
    expect(first).not.toBe(second);
  });
});

describe('getActiveReelsCount', () => {
  it('counts only supported short-video platforms', () => {
    const appsConfig = Object.fromEntries(
      [...REELS_PLATFORM_IDS, 'twitter'].map((id) => [
        id,
        { ...DEFAULT_APP_CONFIG, id, reelsProtection: { ...DEFAULT_APP_CONFIG.reelsProtection, enabled: true } },
      ]),
    );

    expect(getActiveReelsCount(appsConfig)).toBe(REELS_PLATFORM_IDS.length);
  });
});
