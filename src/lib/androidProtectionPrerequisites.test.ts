import { describe, expect, it } from 'vitest';
import {
  describeMissingAndroidProtectionPrerequisites,
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
});
