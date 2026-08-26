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

  it('restarts only a safe stale activation with an installed active target', () => {
    expect(
      shouldRecoverStaleProtection(
        { enabled: true, running: false, health: 'stale-activation' },
        ['instagram'],
      ),
    ).toBe(true);
    expect(
      shouldRecoverStaleProtection(
        { enabled: true, running: false, health: 'unclean-process-stop' },
        ['instagram'],
      ),
    ).toBe(false);
    expect(
      shouldRecoverStaleProtection(
        { enabled: true, running: false, health: 'start-pending' },
        ['instagram'],
      ),
    ).toBe(false);
    expect(
      shouldRecoverStaleProtection(
        { enabled: true, running: false, health: 'start-interrupted' },
        ['instagram'],
      ),
    ).toBe(false);
    expect(
      shouldRecoverStaleProtection(
        { enabled: false, running: false, health: 'never-started' },
        ['instagram'],
      ),
    ).toBe(false);
    expect(
      shouldRecoverStaleProtection(
        { enabled: true, running: true, health: 'active' },
        ['instagram'],
      ),
    ).toBe(false);
    expect(
      shouldRecoverStaleProtection(
        { enabled: true, running: false, health: 'stale-activation' },
        [],
      ),
    ).toBe(false);
  });
});
