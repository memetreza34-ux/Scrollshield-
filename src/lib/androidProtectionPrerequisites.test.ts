import { describe, expect, it } from 'vitest';
import {
  describeMissingAndroidProtectionPrerequisites,
  getAndroidProtectionPrerequisiteForStopCode,
  getMissingAndroidProtectionPrerequisites,
} from './androidProtectionPrerequisites';

describe('Android protection prerequisite diagnostics', () => {
  it('returns no missing prerequisites when all required Android access is available', () => {
    expect(
      getMissingAndroidProtectionPrerequisites({
        usageAccess: true,
        overlay: true,
        notifications: true,
      }),
    ).toEqual([]);
  });

  it('returns missing prerequisites in a stable user-facing order', () => {
    const missing = getMissingAndroidProtectionPrerequisites({
      usageAccess: false,
      overlay: false,
      notifications: false,
    });

    expect(missing).toEqual(['usageAccess', 'overlay', 'notifications']);
    expect(describeMissingAndroidProtectionPrerequisites(missing)).toBe(
      'App-Nutzungszugriff, Hinweis über anderen Apps, Benachrichtigungen',
    );
  });

  it('describes each missing prerequisite independently', () => {
    expect(describeMissingAndroidProtectionPrerequisites(['usageAccess'])).toBe('App-Nutzungszugriff');
    expect(describeMissingAndroidProtectionPrerequisites(['overlay'])).toBe('Hinweis über anderen Apps');
    expect(describeMissingAndroidProtectionPrerequisites(['notifications'])).toBe('Benachrichtigungen');
  });

  it('maps stable native prerequisite stop codes back to the same UI prerequisite keys', () => {
    expect(getAndroidProtectionPrerequisiteForStopCode('usage_access_missing')).toBe('usageAccess');
    expect(getAndroidProtectionPrerequisiteForStopCode('overlay_permission_missing')).toBe('overlay');
    expect(getAndroidProtectionPrerequisiteForStopCode('notifications_missing')).toBe('notifications');
  });

  it('does not treat unrelated terminal stop codes as permission prerequisites', () => {
    expect(getAndroidProtectionPrerequisiteForStopCode('unexpected_service_destroy')).toBeNull();
    expect(getAndroidProtectionPrerequisiteForStopCode('target_app_missing')).toBeNull();
    expect(getAndroidProtectionPrerequisiteForStopCode('')).toBeNull();
  });
});
