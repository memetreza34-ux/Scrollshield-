import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createLegacyRecoveryFilename,
  createLegacyRecoveryPackage,
  serializeLegacyRecoveryPackage,
} from './legacyRecovery';

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe('legacy recovery export', () => {
  it('exports every ScrollShield-owned value exactly and excludes unrelated keys', () => {
    localStorage.setItem('scrollshield_state_v2', '{"legacy":true}');
    localStorage.setItem('scrollshield_settings_v3_pending', 'pending-bytes');
    localStorage.setItem('scrollshield_legacy_v07_archive_v1', '{"archive":true}');
    localStorage.setItem('unrelated', 'do-not-export');

    const recovery = createLegacyRecoveryPackage(new Date('2026-08-06T16:30:00.000Z'));

    expect(recovery).not.toBeNull();
    expect(recovery?.rawEntries).toEqual({
      scrollshield_legacy_v07_archive_v1: '{"archive":true}',
      scrollshield_settings_v3_pending: 'pending-bytes',
      scrollshield_state_v2: '{"legacy":true}',
    });
    expect(recovery?.exportedAt).toBe('2026-08-06T16:30:00.000Z');
    expect(serializeLegacyRecoveryPackage(recovery!)).not.toContain('do-not-export');
  });

  it('returns null when no ScrollShield data exists', () => {
    localStorage.setItem('unrelated', 'keep');
    expect(createLegacyRecoveryPackage()).toBeNull();
  });

  it('creates a stable dated recovery filename', () => {
    expect(createLegacyRecoveryFilename(new Date('2026-08-06T16:30:00.000Z'))).toBe(
      'scrollshield-legacy-recovery-2026-08-06.json',
    );
  });
});
