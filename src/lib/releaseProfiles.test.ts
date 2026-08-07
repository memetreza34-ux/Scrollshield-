import { describe, expect, it } from 'vitest';
import { DEFAULT_APP_CONFIG, DEFAULT_PROFILES } from '../types';
import {
  createReleaseDefaultAppConfig,
  getReleaseProfileConfig,
  getReleaseProfilePresentation,
  getReleaseSafeProfileConfig,
  isLegacyUntouchedDefaultConfig,
} from './releaseProfiles';

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

  it('creates neutral defaults for a newly activated release app', () => {
    const config = createReleaseDefaultAppConfig('instagram', true);

    expect(config.active).toBe(true);
    expect(config.mode).toBe('standard');
    expect(config.timeWindows).toEqual({
      morningRules: 'normal',
      workRules: 'normal',
      eveningRules: 'normal',
      nightRules: 'normal',
      weekendRules: 'normal',
    });
    expect(config.antiBinge.enabled).toBe(false);
    expect(config.reelsProtection.enabled).toBe(false);
  });

  it('recognizes only the untouched legacy default for automatic replacement', () => {
    const untouched = { id: 'instagram', ...DEFAULT_APP_CONFIG };
    expect(isLegacyUntouchedDefaultConfig(untouched)).toBe(true);
    expect(isLegacyUntouchedDefaultConfig({ ...untouched, dailyLimit: 30 })).toBe(false);
    expect(isLegacyUntouchedDefaultConfig({ ...untouched, updatedAt: 123 })).toBe(false);
  });

  it('translates untouched built-in presets into explicit release semantics', () => {
    const gentle = getReleaseProfileConfig('gentle', DEFAULT_PROFILES[0].appsConfig.instagram);
    const balance = getReleaseProfileConfig('balance', DEFAULT_PROFILES[1].appsConfig.instagram);

    expect(gentle.mode).toBe('standard');
    expect(gentle.timeWindows.workRules).toBe('normal');
    expect(gentle.timeWindows.nightRules).toBe('normal');
    expect(gentle.antiBinge.enabled).toBe(false);

    expect(balance.mode).toBe('standard');
    expect(balance.timeWindows.workRules).toBe('normal');
    expect(balance.timeWindows.nightRules).toBe('normal');
    expect(balance.antiBinge.enabled).toBe(true);
  });

  it('preserves explicit user-edited weekly rules once updatedAt is present', () => {
    const edited = {
      ...DEFAULT_PROFILES[0].appsConfig.instagram,
      updatedAt: 123,
      timeWindows: {
        ...DEFAULT_APP_CONFIG.timeWindows,
        morningRules: 'block' as const,
      },
    };
    const result = getReleaseProfileConfig('gentle', edited);

    expect(result.timeWindows.morningRules).toBe('block');
    expect(result.timeWindows.workRules).toBe(DEFAULT_APP_CONFIG.timeWindows.workRules);
  });

  it('presents default profiles without legacy Reels or endless-feed claims', () => {
    const presentations = DEFAULT_PROFILES.map(getReleaseProfilePresentation);
    const text = presentations.map((profile) => `${profile.name} ${profile.description}`).join(' ');

    expect(text).not.toMatch(/Reels|Shorts|Endlos-Feed|Endlos-Swipe/i);
    expect(presentations.find((profile) => profile.name === 'Konsequent')).toBeDefined();
    expect(presentations.find((profile) => profile.name === 'Sanft')?.description).toMatch(/Kein Wochenplan/);
  });
});
