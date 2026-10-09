import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_APP_CONFIG } from '../types';
import type { AppConfig, Schedule } from '../types';
import { getEntitledNativeProtection, hasPro } from './entitlements';

const SUPPORTED_TEST_IDS = new Set(['instagram', 'tiktok', 'youtube']);

const makeApp = (id: string, overrides: Partial<AppConfig> = {}): AppConfig => ({
  ...DEFAULT_APP_CONFIG,
  id,
  active: true,
  ...overrides,
});

const schedule = (id: string, appIds: string[]): Schedule => ({
  id,
  name: id,
  startHour: 21,
  endHour: 7,
  active: true,
  appIds,
});

afterEach(() => vi.unstubAllEnvs());

describe('unverified billing state', () => {
  it('never treats a saved Pro preview flag as payment in a production build', () => {
    vi.stubEnv('PROD', true);
    expect(hasPro({ pro: { active: true } })).toBe(false);
    expect(hasPro({ pro: { active: false } })).toBe(false);
  });

  it('allows Pro preview for development testing only', () => {
    vi.stubEnv('PROD', false);
    expect(hasPro({ pro: { active: true } })).toBe(true);
    expect(hasPro({ pro: { active: false } })).toBe(false);
  });
});

describe('Free native protection boundary', () => {
  it('limits imported configurations to two apps, one schedule and standard presets', () => {
    vi.stubEnv('PROD', true);
    const state = {
      pro: { active: true }, // cannot be trusted: user-controlled local storage
      appsConfig: {
        instagram: makeApp('instagram', {
          preset: 'stark',
          openDelay: 60,
          dailyLimit: 30,
          sessionLimit: 10,
          mode: 'strict',
        }),
        tiktok: makeApp('tiktok'),
        youtube: makeApp('youtube'),
      },
      schedules: [
        schedule('night', ['instagram', 'tiktok', 'youtube']),
        schedule('work', ['instagram', 'youtube']),
      ],
    };

    const result = getEntitledNativeProtection(state, SUPPORTED_TEST_IDS);

    expect(Object.entries(result.appsConfig).filter(([, config]) => config.active).map(([id]) => id)).toEqual([
      'instagram',
      'tiktok',
    ]);
    expect(result.appsConfig.instagram).toMatchObject({
      preset: 'ausgewogen',
      mode: 'standard',
      openDelay: 5,
      dailyLimit: 0,
      sessionLimit: 0,
      antiBinge: { blockThreshold: 99, escalationSeconds: 10 },
    });
    expect(result.schedules).toHaveLength(1);
    expect(result.schedules[0].appIds).toEqual(['instagram', 'tiktok']);

    // The import is not destroyed; a future verified subscriber may restore it.
    expect(state.appsConfig.instagram.preset).toBe('stark');
    expect(state.appsConfig.youtube.active).toBe(true);
    expect(state.schedules).toHaveLength(2);
  });

  it('never spends a Free protection slot on an unsupported imported platform', () => {
    vi.stubEnv('PROD', true);
    const result = getEntitledNativeProtection(
      {
        pro: { active: true },
        appsConfig: {
          'unrecognized-app': makeApp('unrecognized-app'),
          instagram: makeApp('instagram'),
          tiktok: makeApp('tiktok'),
        },
        schedules: [schedule('evening', ['unrecognized-app', 'instagram', 'tiktok'])],
      },
      SUPPORTED_TEST_IDS,
    );

    expect(result.appsConfig['unrecognized-app'].active).toBe(false);
    expect(result.appsConfig.instagram.active).toBe(true);
    expect(result.appsConfig.tiktok.active).toBe(true);
    expect(result.schedules[0].appIds).toEqual(['instagram', 'tiktok']);
  });

  it('keeps the gentle Free preset and its emergency unlock', () => {
    vi.stubEnv('PROD', true);
    const result = getEntitledNativeProtection(
      {
        pro: { active: false },
        appsConfig: {
          instagram: makeApp('instagram', { preset: 'sanft', mode: 'standard', openDelay: 3 }),
        },
        schedules: [],
      },
      SUPPORTED_TEST_IDS,
    );
    expect(result.appsConfig.instagram.openDelay).toBe(3);
    expect(result.appsConfig.instagram.antiBinge.enabled).toBe(false);
    expect(result.appsConfig.instagram.emergencyUnlock.enabled).toBe(true);
  });

  it('restores Free emergency access after a Pro-only custom rule or imported backup', () => {
    vi.stubEnv('PROD', true);
    const emergencyUnlock = {
      enabled: false,
      maxPerDay: 0,
      durationMinutes: 120,
      requireCountdown: false,
      requireReason: false,
    };
    const state = {
      pro: { active: true },
      appsConfig: { instagram: makeApp('instagram', { preset: 'eigene', emergencyUnlock }) },
      schedules: [],
    };
    const result = getEntitledNativeProtection(state, SUPPORTED_TEST_IDS);
    expect(result.appsConfig.instagram.emergencyUnlock).toEqual(DEFAULT_APP_CONFIG.emergencyUnlock);
    expect(result.appsConfig.instagram.preset).toBe('ausgewogen');
    // Downgrade never destroys the user's saved custom configuration.
    expect(state.appsConfig.instagram.emergencyUnlock).toEqual(emergencyUnlock);
  });

  it('preserves advanced native settings in development Pro preview', () => {
    vi.stubEnv('PROD', false);
    const appsConfig = {
      instagram: makeApp('instagram', { preset: 'stark', sessionLimit: 10 }),
      tiktok: makeApp('tiktok'),
      youtube: makeApp('youtube'),
    };
    const schedules = [schedule('night', ['instagram']), schedule('work', ['youtube'])];
    const result = getEntitledNativeProtection({ pro: { active: true }, appsConfig, schedules }, SUPPORTED_TEST_IDS);
    expect(result.appsConfig).toBe(appsConfig);
    expect(result.schedules).toBe(schedules);
  });
});
