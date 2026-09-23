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

    expect(rules).toEqual([{ packageName: 'com.zhiliaoapp.musically', mode: 'strict', delaySeconds: 30 }]);
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

describe('short-video rules', () => {
  it('attaches a feed rule with the detection hints', () => {
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

    const feed = rules[0].shortVideo;
    expect(feed?.surfaceId).toBe('reels');
    expect(feed?.stopAfterSwipes).toBe(10);
    expect(feed?.hardInterrupt).toBe(true);
    expect(feed?.viewIdHints.length).toBeGreaterThan(0);
  });

  it('omits the feed rule when the user disabled it', () => {
    const rules = buildNativeProtectionRules(
      {
        instagram: activeApp({
          reelsProtection: { enabled: false, mode: 'block', dailyLimitMinutes: 5 },
        }),
      },
      feedPlatforms,
    );

    expect(rules[0].shortVideo).toBeUndefined();
  });

  it('omits the feed rule in allow mode so the service can skip the app', () => {
    const rules = buildNativeProtectionRules(
      { instagram: activeApp({ reelsProtection: { enabled: true, mode: 'allow' } }) },
      feedPlatforms,
    );

    expect(rules[0].shortVideo).toBeUndefined();
  });

  it('marks TikTok as always short video', () => {
    const rules = buildNativeProtectionRules(
      { tiktok: activeApp({ reelsProtection: { enabled: true, mode: 'limit', dailyLimitMinutes: 10 } }) },
      feedPlatforms,
    );

    expect(rules[0].shortVideo?.alwaysShortVideo).toBe(true);
  });

  it('blocks the feed too while a focus session blocks the app', () => {
    const appsConfig = {
      youtube: activeApp({
        focusModeBehavior: 'block' as const,
        reelsProtection: { enabled: true, mode: 'warn' as const, dailyLimitMinutes: 20 },
      }),
    };

    expect(buildNativeProtectionRules(appsConfig, feedPlatforms, { isFocusModeActive: true })[0].shortVideo?.mode).toBe(
      'block',
    );
    expect(
      buildNativeProtectionRules(appsConfig, feedPlatforms, { isFocusModeActive: false })[0].shortVideo?.mode,
    ).toBe('warn');
  });

  it('normalizes missing limits to zero rather than undefined', () => {
    const rules = buildNativeProtectionRules(
      { instagram: activeApp({ reelsProtection: { enabled: true, mode: 'warn' } }) },
      feedPlatforms,
    );

    expect(rules[0].shortVideo).toMatchObject({
      dailyLimitMinutes: 0,
      sessionLimitMinutes: 0,
      stopAfterSwipes: 0,
      hardInterrupt: false,
    });
  });

  it('reports whether the accessibility service is needed', () => {
    const withFeed = buildNativeProtectionRules(
      { instagram: activeApp({ reelsProtection: { enabled: true, mode: 'limit', dailyLimitMinutes: 5 } }) },
      feedPlatforms,
    );
    const withoutFeed = buildNativeProtectionRules({ instagram: activeApp() }, feedPlatforms);

    expect(requiresAccessibilityService(withFeed)).toBe(true);
    expect(requiresAccessibilityService(withoutFeed)).toBe(false);
  });

  it('hands a feed limit of 0 ("Blockiert") down as a blocked feed', () => {
    const daily = buildNativeProtectionRules(
      {
        instagram: activeApp({
          reelsProtection: { enabled: true, mode: 'limit', dailyLimitMinutes: 0, sessionLimitMinutes: 5 },
        }),
      },
      feedPlatforms,
    );
    const session = buildNativeProtectionRules(
      {
        instagram: activeApp({
          reelsProtection: { enabled: true, mode: 'warn', dailyLimitMinutes: 15, sessionLimitMinutes: 0 },
        }),
      },
      feedPlatforms,
    );

    expect(daily[0].shortVideo?.mode).toBe('block');
    expect(session[0].shortVideo?.mode).toBe('block');
  });
});

describe('time-window rules', () => {
  const schedule = {
    enabled: true,
    morningRules: 'normal' as const,
    workRules: 'strict' as const,
    eveningRules: 'normal' as const,
    nightRules: 'block' as const,
    weekendRules: 'normal' as const,
  };

  it('hands the tightening windows down with the shared hour boundaries', () => {
    const rules = buildNativeProtectionRules({ tiktok: activeApp({ timeWindows: schedule }) }, platforms);

    expect(rules[0].timeWindows).toEqual({
      windows: [
        { startHour: 9, endHour: 18, rule: 'strict' },
        { startHour: 22, endHour: 6, rule: 'block' },
      ],
      weekendRule: 'normal',
    });
  });

  it('sends nothing while time windows are off or never tighten the mode', () => {
    const off = buildNativeProtectionRules(
      { tiktok: activeApp({ timeWindows: { ...schedule, enabled: false } }) },
      platforms,
    );
    const allNormal = buildNativeProtectionRules(
      {
        tiktok: activeApp({
          timeWindows: { ...schedule, workRules: 'normal', nightRules: 'normal' },
        }),
      },
      platforms,
    );

    expect(off[0].timeWindows).toBeUndefined();
    expect(allNormal[0].timeWindows).toBeUndefined();
  });

  it('keeps a weekend rule even without a stricter time of day', () => {
    const rules = buildNativeProtectionRules(
      {
        tiktok: activeApp({
          timeWindows: { ...schedule, workRules: 'normal', nightRules: 'normal', weekendRules: 'block' },
        }),
      },
      platforms,
    );

    expect(rules[0].timeWindows).toEqual({ windows: [], weekendRule: 'block' });
  });
});
