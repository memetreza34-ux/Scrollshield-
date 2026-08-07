import { describe, expect, it } from 'vitest';
import { AppConfig, DEFAULT_APP_CONFIG, DEFAULT_STATE } from '../types';
import { normalizeAppConfig, normalizeAppsConfig, normalizeAppState, normalizePrivacySettings } from './state';

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

  it('normalizes unsafe restored protection values before UI or native sync', () => {
    const config = normalizeAppConfig('instagram', {
      openDelay: 50_000,
      dailyLimit: 50_000,
      sessionLimit: 0,
      antiBinge: {
        enabled: true,
        warningThreshold: 8,
        warningTimeframe: 50_000,
        blockThreshold: 3,
        blockTimeframe: 50_000,
      },
      emergencyUnlock: {
        enabled: true,
        durationMinutes: 50_000,
        maxPerDay: 0,
      },
    });

    expect(config.openDelay).toBe(120);
    expect(config.dailyLimit).toBe(1440);
    expect(config.sessionLimit).toBe(1);
    expect(config.antiBinge.warningThreshold).toBe(8);
    expect(config.antiBinge.blockThreshold).toBe(9);
    expect(config.antiBinge.warningTimeframe).toBe(180);
    expect(config.antiBinge.blockTimeframe).toBe(180);
    expect(config.emergencyUnlock.durationMinutes).toBe(60);
    expect(config.emergencyUnlock.maxPerDay).toBe(1);
    expect(config.emergencyUnlock.requireCountdown).toBe(true);
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