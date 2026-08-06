import { describe, expect, it } from 'vitest';
import { DEFAULT_STATE } from '../types';
import {
  createExportFilename,
  createScrollShieldExport,
  parseScrollShieldExport,
  serializeScrollShieldExport,
} from './dataExport';

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

  it.each([
    ['invalid JSON', '{bad-json'],
    ['wrong app', JSON.stringify({ app: 'Other', schemaVersion: 1, state: {} })],
    ['unknown schema', JSON.stringify({ app: 'ScrollShield', schemaVersion: 2, state: {} })],
    ['incomplete state', JSON.stringify({ app: 'ScrollShield', schemaVersion: 1, state: { settings: {} } })],
  ])('rejects %s', (_label, raw) => {
    expect(() => parseScrollShieldExport(raw)).toThrow();
  });
});
