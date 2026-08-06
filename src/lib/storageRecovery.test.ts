import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_STATE } from '../types';
import { StorageService } from './storage';

class OneShotFailureStorage {
  [key: string]: unknown;

  private store: Record<string, string> = {};
  private failOnceKeys = new Set<string>();

  get length() {
    return Object.keys(this.store).length;
  }

  key(index: number) {
    return Object.keys(this.store)[index] ?? null;
  }

  getItem(key: string) {
    return this.store[key] ?? null;
  }

  setItem(key: string, value: string) {
    if (this.failOnceKeys.delete(key)) throw new Error(`One-shot failure for ${key}`);
    this.store[key] = value;
    this[key] = value;
  }

  removeItem(key: string) {
    delete this.store[key];
    delete this[key];
  }

  clear() {
    Object.keys(this.store).forEach((key) => delete this[key]);
    this.store = {};
    this.failOnceKeys.clear();
  }

  failNextWriteFor(key: string) {
    this.failOnceKeys.add(key);
  }
}

let storage: OneShotFailureStorage;

beforeEach(() => {
  storage = new OneShotFailureStorage();
  vi.stubGlobal('localStorage', storage);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('StorageService interrupted migration recovery', () => {
  it('does not normalize partially committed chunks after a legacy migration failure', () => {
    const legacyState = {
      ...DEFAULT_STATE,
      hasCompletedOnboarding: true,
      goals: ['Legacy-Ziel muss erhalten bleiben'],
      stats: { ...DEFAULT_STATE.stats, totalSavedTime: 777 },
      history: [
        {
          id: 'legacy-critical-event',
          timestamp: 123,
          type: 'block' as const,
          appId: 'instagram',
          desc: 'Darf nicht verloren gehen',
        },
      ],
    };
    const raw = JSON.stringify(legacyState);
    localStorage.setItem('scrollshield_state_v2', raw);
    storage.failNextWriteFor('scrollshield_profiles_v3');

    const failedAttempt = StorageService.loadState();

    expect(failedAttempt).toBeNull();
    expect(localStorage.getItem('scrollshield_state_v2')).toBe(raw);
    expect(localStorage.getItem('scrollshield_meta_v3')).toBeNull();
    expect(localStorage.getItem('scrollshield_settings_v3_pending')).not.toBeNull();
    expect(localStorage.getItem('scrollshield_profiles_v3_pending')).not.toBeNull();
    expect(localStorage.getItem('scrollshield_stats_v3_pending')).not.toBeNull();
    expect(localStorage.getItem('scrollshield_history_v3_pending')).not.toBeNull();
    expect(localStorage.getItem('scrollshield_meta_v3_pending')).not.toBeNull();

    const recovered = StorageService.loadState();

    expect(recovered?.goals).toEqual(['Legacy-Ziel muss erhalten bleiben']);
    expect(recovered?.stats?.totalSavedTime).toBe(777);
    expect(recovered?.history?.[0].id).toBe('legacy-critical-event');
    expect(localStorage.getItem('scrollshield_state_v2')).toBeNull();
    expect(Object.keys(localStorage).some((key) => key.endsWith('_pending'))).toBe(false);
    expect(StorageService.getLegacyArchive()?.sources[0].rawEntries.scrollshield_state_v2).toBe(raw);
  });

  it('never deletes a legacy source when its value no longer matches the archived copy', () => {
    const archivedRaw = JSON.stringify({ ...DEFAULT_STATE, goals: ['Archiv'] });
    const changedRaw = JSON.stringify({ ...DEFAULT_STATE, goals: ['Nach Archiv geändert'] });
    localStorage.setItem(
      'scrollshield_legacy_v07_archive_v1',
      JSON.stringify({
        schemaVersion: 1,
        sources: [
          {
            source: 'scrollshield_state_v2',
            capturedAt: '2026-08-06T16:00:00.000Z',
            rawEntries: { scrollshield_state_v2: archivedRaw },
          },
        ],
      }),
    );
    StorageService.saveState(DEFAULT_STATE);
    localStorage.setItem('scrollshield_state_v2', changedRaw);

    StorageService.loadState();

    expect(localStorage.getItem('scrollshield_state_v2')).toBe(changedRaw);
  });
});
