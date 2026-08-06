import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_STATE } from '../types';
import {
  createExportFilename,
  createScrollShieldExport,
  parseScrollShieldExport,
  serializeScrollShieldExport,
} from './dataExport';

const LEGACY_ARCHIVE_KEY = 'scrollshield_legacy_v07_archive_v1';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('data export', () => {
  it('creates a versioned local-data export without transient session fields', () => {
    const exported = createScrollShieldExport(
      {
        ...DEFAULT_STATE,
        simulatedAppToOpen: 'instagram',
        activeSession: {
          appId: 'instagram',
          startTime: 1,
          extensionCount: 0,
          isPaused: false,
        },
      },
      { exportedAt: new Date('2026-06-17T12:00:00.000Z'), appVersion: '1.2.3' },
    );

    expect(exported.schemaVersion).toBe(1);
    expect(exported.exportedAt).toBe('2026-06-17T12:00:00.000Z');
    expect(exported.appVersion).toBe('1.2.3');
    expect(exported.state.settings).toEqual(DEFAULT_STATE.settings);
    expect(exported.state).not.toHaveProperty('simulatedAppToOpen');
    expect(exported.state).not.toHaveProperty('activeSession');
  });

  it('serializes exports as readable JSON', () => {
    const exported = createScrollShieldExport(DEFAULT_STATE, {
      exportedAt: new Date('2026-06-17T12:00:00.000Z'),
      appVersion: '1.0.0',
    });

    expect(serializeScrollShieldExport(exported)).toContain('\n  "schemaVersion": 1,');
  });

  it('creates stable dated filenames', () => {
    expect(createExportFilename(new Date('2026-06-17T12:00:00.000Z'))).toBe('scrollshield-export-2026-06-17.json');
  });

  it('parses supported exports', () => {
    const exported = createScrollShieldExport(DEFAULT_STATE, { appVersion: '1.0.0' });

    expect(parseScrollShieldExport(serializeScrollShieldExport(exported)).state.settings).toEqual(
      DEFAULT_STATE.settings,
    );
  });

  it('includes the exact V0.7 archive and restores it during import', () => {
    const archive = {
      schemaVersion: 1 as const,
      sources: [
        {
          source: 'legacy_v07_pro',
          capturedAt: '2026-08-06T16:00:00.000Z',
          rawEntries: {
            scrollshield_events: '[{"id":"legacy"}]',
            scrollshield_rules: '[{"id":"rule"}]',
          },
        },
      ],
    };
    localStorage.setItem(LEGACY_ARCHIVE_KEY, JSON.stringify(archive));
    const exported = createScrollShieldExport(DEFAULT_STATE, { appVersion: '1.0.0' });
    expect(exported.legacyArchive).toEqual(archive);

    localStorage.removeItem(LEGACY_ARCHIVE_KEY);
    const parsed = parseScrollShieldExport(serializeScrollShieldExport(exported));

    expect(parsed.legacyArchive).toEqual(archive);
    expect(JSON.parse(localStorage.getItem(LEGACY_ARCHIVE_KEY) as string)).toEqual(archive);
  });

  it('rejects a damaged V0.7 archive without changing local storage', () => {
    const raw = JSON.stringify({
      ...createScrollShieldExport(DEFAULT_STATE, { appVersion: '1.0.0' }),
      legacyArchive: {
        schemaVersion: 1,
        sources: [{ source: 'legacy', capturedAt: 'today', rawEntries: { bad: 123 } }],
      },
    });

    expect(() => parseScrollShieldExport(raw)).toThrow('V0.7-Datenarchiv');
    expect(localStorage.getItem(LEGACY_ARCHIVE_KEY)).toBeNull();
  });

  it.each([
    ['invalid JSON', '{bad-json'],
    ['wrong app', JSON.stringify({ app: 'Other', schemaVersion: 1, state: {} })],
    ['unknown schema', JSON.stringify({ app: 'ScrollShield', schemaVersion: 2, state: {} })],
    ['incomplete state', JSON.stringify({ app: 'ScrollShield', schemaVersion: 1, state: { settings: {} } })],
  ])('rejects %s', (_label, raw) => {
    expect(() => parseScrollShieldExport(raw)).toThrow();
  });
});
