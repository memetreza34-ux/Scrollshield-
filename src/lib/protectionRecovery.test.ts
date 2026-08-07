import { describe, expect, it } from 'vitest';
import { DEFAULT_APP_CONFIG } from '../types';
import { getInstalledActiveProtectionIds, shouldRecoverStaleProtection } from './protectionRecovery';

describe('native protection recovery policy', () => {
  it('returns only active installed target ids', () => {
    const appsConfig = {
      instagram: { id: 'instagram', ...DEFAULT_APP_CONFIG, active: true },
      youtube: { id: 'youtube', ...DEFAULT_APP_CONFIG, active: true },
      reddit: { id: 'reddit', ...DEFAULT_APP_CONFIG, active: false },
    };

    expect(getInstalledActiveProtectionIds(appsConfig, ['youtube'])).toEqual(['instagram']);
  });

  it('recovers only a previously enabled but stopped service with an installed active target', () => {
    expect(shouldRecoverStaleProtection({ enabled: true, running: false }, ['instagram'])).toBe(true);
    expect(shouldRecoverStaleProtection({ enabled: false, running: false }, ['instagram'])).toBe(false);
    expect(shouldRecoverStaleProtection({ enabled: true, running: true }, ['instagram'])).toBe(false);
    expect(shouldRecoverStaleProtection({ enabled: true, running: false }, [])).toBe(false);
  });
});
