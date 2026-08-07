import { describe, expect, it } from 'vitest';
import { DEFAULT_APP_CONFIG, DEFAULT_PROFILES } from '../types';
import { getReleaseProfilePresentation, getReleaseSafeProfileConfig } from './releaseProfiles';

describe('release profile helpers', () => {
  it('removes unsupported short-video behavior from configs used by the release UI', () => {
    const config = getReleaseSafeProfileConfig({
      id: 'instagram',
      ...DEFAULT_APP_CONFIG,
      mode: 'soft',
      reelsProtection: {
        ...DEFAULT_APP_CONFIG.reelsProtection,
        enabled: true,
        mode: 'block',
        warnOnEndlessScroll: true,
        hardInterrupt: true,
      },
      singleContent: {
        ...DEFAULT_APP_CONFIG.singleContent,
        allowSharedLinks: true,
        allowOnlyOne: true,
      },
    });

    expect(config.mode).toBe('standard');
    expect(config.reelsProtection.enabled).toBe(false);
    expect(config.reelsProtection.mode).toBe('allow');
    expect(config.reelsProtection.warnOnEndlessScroll).toBe(false);
    expect(config.reelsProtection.hardInterrupt).toBe(false);
    expect(config.singleContent.allowSharedLinks).toBe(false);
    expect(config.singleContent.allowOnlyOne).toBe(false);
  });

  it('presents default profiles without legacy Reels or endless-feed claims', () => {
    const presentations = DEFAULT_PROFILES.map(getReleaseProfilePresentation);
    const text = presentations.map((profile) => `${profile.name} ${profile.description}`).join(' ');

    expect(text).not.toMatch(/Reels|Shorts|Endlos-Feed|Endlos-Swipe/i);
    expect(presentations.find((profile) => profile.name === 'Konsequent')).toBeDefined();
  });
});
