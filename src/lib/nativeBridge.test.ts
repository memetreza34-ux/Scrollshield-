import { describe, expect, it } from 'vitest';
import { buildNativeProtectionRules } from './nativeBridge';

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
