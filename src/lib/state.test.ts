import { describe, expect, it } from 'vitest';
import { AppConfig, DEFAULT_APP_CONFIG, DEFAULT_PROFILES, DEFAULT_STATE } from '../types';
import {
  applyProfileConfig,
  normalizeAppConfig,
  normalizeAppsConfig,
  normalizeAppState,
  normalizeHistory,
  normalizePrivacySettings,
} from './state';

type LegacyConfigPatch = Parameters<typeof normalizeAppConfig>[1];

describe('normalizeAppConfig', () => {
  it('deep-merges nested app config defaults', () => {
    const legacyConfig: LegacyConfigPatch = {
      mode: 'soft',
      reelsProtection: { enabled: false },
      emergencyUnlock: { maxPerDay: 7 },
    };
    const config = normalizeAppConfig('instagram', legacyConfig);

    expect(config.id).toBe('instagram');
    expect(config.mode).toBe('soft');
    expect(config.reelsProtection.enabled).toBe(false);
    expect(config.reelsProtection.sessionLimitMinutes).toBe(DEFAULT_APP_CONFIG.reelsProtection.sessionLimitMinutes);
    expect(config.emergencyUnlock.maxPerDay).toBe(7);
    expect(config.emergencyUnlock.requireReason).toBe(true);
  });
});

describe('normalizeAppsConfig', () => {
  it('creates complete configs for all supported apps', () => {
    const configs = normalizeAppsConfig({
      instagram: { id: 'instagram', active: true } as Partial<AppConfig> as AppConfig,
    });

    expect(configs.instagram.active).toBe(true);
    expect(configs.tiktok.id).toBe('tiktok');
    expect(configs.youtube.reelsProtection.enabled).toBe(true);
  });
});

describe('applyProfileConfig', () => {
  const protectedInstagram = normalizeAppsConfig({
    instagram: { id: 'instagram', active: true, mode: 'soft' } as Partial<AppConfig> as AppConfig,
  });
  const balance = DEFAULT_PROFILES.find((profile) => profile.id === 'balance')!;

  it('keeps the protected apps when switching to a built-in profile', () => {
    // Every app is inactive in the built-in profiles; switching used to turn the protection off.
    expect(balance.appsConfig.instagram.active).toBe(false);

    const configs = applyProfileConfig(balance.appsConfig, protectedInstagram);

    expect(configs.instagram.active).toBe(true);
    expect(configs.tiktok.active).toBe(false);
  });

  it('takes the rules from the profile', () => {
    const configs = applyProfileConfig(balance.appsConfig, protectedInstagram);

    expect(configs.instagram.mode).toBe('standard');
    expect(configs.instagram.openDelay).toBe(balance.appsConfig.instagram.openDelay);
  });

  it('keeps the current rules of an app the profile does not know', () => {
    const current = {
      ...protectedInstagram,
      custom_app: normalizeAppConfig('custom_app', { active: true, mode: 'strict' }),
    };

    const configs = applyProfileConfig(balance.appsConfig, current);

    expect(configs.custom_app.active).toBe(true);
    expect(configs.custom_app.mode).toBe('strict');
  });
});

describe('normalizeAppState', () => {
  it('preserves custom profiles and fills nested defaults', () => {
    const state = normalizeAppState({
      ...DEFAULT_STATE,
      profiles: [
        ...(DEFAULT_STATE.profiles ?? []),
        {
          id: 'custom',
          name: 'Custom',
          description: 'Custom profile',
          icon: 'Zap',
          color: 'text-blue-400',
          isCustom: true,
          appsConfig: {
            instagram: { id: 'instagram', reelsProtection: { enabled: false } } as Partial<AppConfig> as AppConfig,
          },
        },
      ],
    });

    const custom = state.profiles?.find((profile) => profile.id === 'custom');

    expect(custom).toBeDefined();
    expect(custom?.appsConfig.instagram.reelsProtection.enabled).toBe(false);
    expect(custom?.appsConfig.instagram.reelsProtection.sessionLimitMinutes).toBe(
      DEFAULT_APP_CONFIG.reelsProtection.sessionLimitMinutes,
    );
    expect(custom?.appsConfig.tiktok.id).toBe('tiktok');
  });

  it('deep-merges settings and permissions with defaults', () => {
    const state = normalizeAppState({
      settings: {
        ...DEFAULT_STATE.settings,
        notifications: { ...DEFAULT_STATE.settings.notifications, dailySummary: true },
      },
      permissions: { usageAccess: true } as Partial<
        typeof DEFAULT_STATE.permissions
      > as typeof DEFAULT_STATE.permissions,
    });

    expect(state.settings.notifications.dailySummary).toBe(true);
    expect(state.settings.notifications.weeklyReview).toBe(true);
    expect(state.permissions.usageAccess).toBe(true);
    expect(state.permissions.notifications).toBe(false);
  });
});

describe('normalizePrivacySettings', () => {
  it.each(['unknown', 'under_13', '13_to_15'] as const)(
    'enforces local-only strict privacy for %s age group',
    (ageGroup) => {
      expect(normalizePrivacySettings({ ageGroup, localOnly: false, strictPrivacyMode: false })).toEqual({
        ageGroup,
        localOnly: true,
        strictPrivacyMode: true,
      });
    },
  );

  it('keeps strict privacy optional for adults while enforcing local-only v1', () => {
    expect(normalizePrivacySettings({ ageGroup: '16_plus', localOnly: false, strictPrivacyMode: false })).toEqual({
      ageGroup: '16_plus',
      localOnly: true,
      strictPrivacyMode: false,
    });
  });
});

describe('normalizeHistory', () => {
  it('turns legacy session ends stored as openings into session_end events', () => {
    const history = normalizeHistory([
      { id: '2', timestamp: 2, type: 'open', appId: 'instagram', desc: 'Sitzung beendet (3 Min)' },
      { id: '1', timestamp: 1, type: 'open', appId: 'instagram', desc: 'App geöffnet' },
    ]);

    expect(history.map((event) => event.type)).toEqual(['session_end', 'open']);
  });

  it('falls back to an empty history for malformed input', () => {
    expect(normalizeHistory(undefined)).toEqual([]);
  });
});
