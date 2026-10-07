import { describe, expect, it } from 'vitest';
import { buildNativeProtectionRules, requiresAccessibilityService } from './nativeBridge';

const platforms = [
  { id: 'instagram', androidPackages: ['com.instagram.android', 'com.instagram.lite'] },
  { id: 'tiktok', androidPackages: ['com.zhiliaoapp.musically'] },
  { id: 'youtube', androidPackages: ['com.google.android.youtube'] },
];

describe('buildNativeProtectionRules', () => {
  it('only emits rules for active apps', () => {
    const rules = buildNativeProtectionRules(
      {
        instagram: { active: true, mode: 'standard', openDelay: 15 },
        tiktok: { active: false, mode: 'strict', openDelay: 30 },
      },
      platforms,
    );

    expect(rules.map((rule) => rule.packageName)).toEqual(['com.instagram.android', 'com.instagram.lite']);
  });

  it('carries mode and delay per package', () => {
    const rules = buildNativeProtectionRules({ tiktok: { active: true, mode: 'strict', openDelay: 30 } }, platforms);

    expect(rules).toEqual([
      { packageName: 'com.zhiliaoapp.musically', appId: 'tiktok', mode: 'strict', delaySeconds: 30 },
    ]);
  });

  it('escalates to strict while a focus session blocks the app', () => {
    const appsConfig = {
      instagram: { active: true, mode: 'soft' as const, openDelay: 5, focusModeBehavior: 'block' as const },
      youtube: { active: true, mode: 'standard' as const, openDelay: 10, focusModeBehavior: 'warn' as const },
    };

    const during = buildNativeProtectionRules(appsConfig, platforms, { isFocusModeActive: true });
    const outside = buildNativeProtectionRules(appsConfig, platforms, { isFocusModeActive: false });

    expect(during.find((rule) => rule.packageName === 'com.instagram.android')?.mode).toBe('strict');
    expect(during.find((rule) => rule.packageName === 'com.google.android.youtube')?.mode).toBe('standard');
    expect(outside.find((rule) => rule.packageName === 'com.instagram.android')?.mode).toBe('soft');
  });

  it('normalizes negative or fractional delays', () => {
    const rules = buildNativeProtectionRules({ tiktok: { active: true, mode: 'standard', openDelay: -4 } }, platforms);

    expect(rules[0].delaySeconds).toBe(0);
  });

  it('never emits a package twice', () => {
    const duplicated = [...platforms, { id: 'instagram_clone', androidPackages: ['com.instagram.android'] }];
    const rules = buildNativeProtectionRules(
      {
        instagram: { active: true, mode: 'standard', openDelay: 5 },
        instagram_clone: { active: true, mode: 'strict', openDelay: 5 },
      },
      duplicated,
    );

    expect(rules.filter((rule) => rule.packageName === 'com.instagram.android')).toHaveLength(1);
  });

  it('returns an empty list when nothing is protected', () => {
    expect(buildNativeProtectionRules({}, platforms)).toEqual([]);
  });
});

const feedPlatforms = [
  { id: 'instagram', androidPackages: ['com.instagram.android'], shortVideoSurface: { id: 'reels' } },
  { id: 'tiktok', androidPackages: ['com.zhiliaoapp.musically'], shortVideoSurface: { id: 'tiktok_feed' } },
  { id: 'youtube', androidPackages: ['com.google.android.youtube'], shortVideoSurface: { id: 'shorts' } },
];

const activeApp = (feed?: Partial<Parameters<typeof buildNativeProtectionRules>[0][string]>) => ({
  active: true,
  mode: 'standard' as const,
  openDelay: 10,
  ...feed,
});

describe('short-video V1 gate', () => {
  it('never emits feed-level rules while the post-V1 research flag is disabled', () => {
    const rules = buildNativeProtectionRules(
      {
        instagram: activeApp({
          reelsProtection: {
            enabled: true,
            mode: 'limit',
            dailyLimitMinutes: 15,
            sessionLimitMinutes: 5,
            stopAfterSwipes: 10,
            hardInterrupt: true,
          },
        }),
      },
      feedPlatforms,
    );

    expect(rules[0].shortVideo).toBeUndefined();
    expect(requiresAccessibilityService(rules)).toBe(false);
  });
});

describe('schedules', () => {
  const evening = { id: 's1', name: 'Abend', startHour: 21, endHour: 7, appIds: ['tiktok'], active: true };

  it('hands the schedules naming an app down as locking windows', () => {
    const rules = buildNativeProtectionRules({ tiktok: activeApp() }, platforms, { schedules: [evening] });

    expect(rules[0].timeWindows).toEqual({
      windows: [{ startHour: 21, endHour: 7, rule: 'block' }],
      weekendRule: 'normal',
    });
  });

  it('sends nothing for paused schedules or schedules for other apps', () => {
    const paused = buildNativeProtectionRules({ tiktok: activeApp() }, platforms, {
      schedules: [{ ...evening, active: false }],
    });
    const other = buildNativeProtectionRules({ tiktok: activeApp() }, platforms, {
      schedules: [{ ...evening, appIds: ['instagram'] }],
    });

    expect(paused[0].timeWindows).toBeUndefined();
    expect(other[0].timeWindows).toBeUndefined();
  });
});

describe('focus apps', () => {
  it('locks only the apps the running session chose', () => {
    const rules = buildNativeProtectionRules({ instagram: activeApp(), tiktok: activeApp() }, platforms, {
      isFocusModeActive: true,
      focusBlockedAppIds: ['tiktok'],
    });

    expect(rules.find((rule) => rule.appId === 'tiktok')?.mode).toBe('strict');
    expect(rules.find((rule) => rule.appId === 'instagram')?.mode).not.toBe('strict');
  });
});

describe('daily limit and anti-binge rules', () => {
  const antiBinge = { warningThreshold: 3, warningTimeframe: 10, blockThreshold: 5, blockTimeframe: 20 };

  it('hands the daily limit and anti-binge thresholds down with the app id', () => {
    const rules = buildNativeProtectionRules(
      { instagram: activeApp({ dailyLimit: 45, antiBinge: { enabled: true, ...antiBinge } }) },
      platforms,
    );

    expect(rules.map((rule) => rule.appId)).toEqual(['instagram', 'instagram']);
    expect(rules[0]).toMatchObject({ dailyLimitMinutes: 45, antiBinge });
  });

  it('leaves both out when they are switched off', () => {
    const rules = buildNativeProtectionRules(
      { instagram: activeApp({ dailyLimit: 0, antiBinge: { enabled: false, ...antiBinge } }) },
      platforms,
    );

    expect(rules[0].dailyLimitMinutes).toBeUndefined();
    expect(rules[0].antiBinge).toBeUndefined();
  });
});
