import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_STATE } from '../types';
import { StorageService } from './storage';

class LocalStorageMock {
  [key: string]: unknown;

  private store: Record<string, string> = {};
  private failingWrites = new Set<string>();

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
    if (this.failingWrites.has(key)) throw new Error(`Simulated write failure for ${key}`);
    this.store[key] = value;
    this[key] = value;
  }

  removeItem(key: string) {
    delete this.store[key];
    delete this[key];
  }

  clear() {
    Object.keys(this.store).forEach((key) => {
      delete this[key];
    });
    this.store = {};
    this.failingWrites.clear();
  }

  failWriteFor(key: string) {
    this.failingWrites.add(key);
  }
}

let storage: LocalStorageMock;

beforeEach(() => {
  storage = new LocalStorageMock();
  vi.stubGlobal('localStorage', storage);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('StorageService', () => {
  it('saves and loads split application state', () => {
    const state = {
      ...DEFAULT_STATE,
      hasCompletedOnboarding: true,
      activeProtectionLevel: 'strict' as const,
      isFocusModeActive: true,
      focusTimeRemaining: 12,
      activeSession: {
        appId: 'instagram',
        startTime: 1_000,
        extensionCount: 0,
        isPaused: false,
      },
      history: [{ id: 'event-1', timestamp: 1, type: 'open' as const, appId: 'instagram', desc: 'Opened' }],
    };

    expect(StorageService.saveState(state)).toBe(true);
    const loaded = StorageService.loadState();

    expect(loaded?.hasCompletedOnboarding).toBe(true);
    expect(loaded?.activeProtectionLevel).toBe('strict');
    expect(loaded?.isFocusModeActive).toBe(true);
    expect(loaded?.focusTimeRemaining).toBe(12);
    expect(loaded?.activeSession?.appId).toBe('instagram');
    expect(loaded?.history).toHaveLength(1);
    expect(loaded?.history?.[0].appId).toBe('instagram');
    expect(Object.keys(localStorage).some((key) => key.endsWith('_pending'))).toBe(false);
  });

  it('limits persisted history and focus sessions', () => {
    const longHistory = Array.from({ length: 105 }, (_, index) => ({
      id: `event-${index}`,
      timestamp: index,
      type: 'open' as const,
      appId: 'instagram',
      desc: 'Opened',
    }));
    const longFocusSessions = Array.from({ length: 55 }, (_, index) => ({
      id: `focus-${index}`,
      startTime: index,
      endTime: null,
      duration: 25,
      successful: false,
      protectedApps: [],
      blocksTriggered: 0,
    }));

    StorageService.saveState({ ...DEFAULT_STATE, history: longHistory, focusSessions: longFocusSessions });
    const loaded = StorageService.loadState();

    expect(loaded?.history).toHaveLength(100);
    expect(loaded?.focusSessions).toHaveLength(50);
  });

  it('clears current, pending, archive, monolithic, and V0.7 keys without touching unrelated data', () => {
    localStorage.setItem('scrollshield_settings_v3', 'x');
    localStorage.setItem('scrollshield_settings_v3_pending', 'x');
    localStorage.setItem('scrollshield_legacy_v07_archive_v1', 'x');
    localStorage.setItem('scrollshield_state_v2', 'x');
    localStorage.setItem('scrollshield_brainState', 'x');
    localStorage.setItem('unrelated', 'keep');

    StorageService.clearState();

    expect(localStorage.getItem('scrollshield_settings_v3')).toBeNull();
    expect(localStorage.getItem('scrollshield_settings_v3_pending')).toBeNull();
    expect(localStorage.getItem('scrollshield_legacy_v07_archive_v1')).toBeNull();
    expect(localStorage.getItem('scrollshield_state_v2')).toBeNull();
    expect(localStorage.getItem('scrollshield_brainState')).toBeNull();
    expect(localStorage.getItem('unrelated')).toBe('keep');
  });

  it('migrates old v2 monolithic state only after a verified transactional write', () => {
    const oldState = {
      ...DEFAULT_STATE,
      hasCompletedOnboarding: true,
      goals: ['Weniger automatische Öffnungen'],
      history: [
        {
          id: 'old-event',
          timestamp: 123,
          type: 'block' as const,
          appId: 'instagram',
          desc: 'Altbestand',
        },
      ],
    };
    const raw = JSON.stringify(oldState);
    localStorage.setItem('scrollshield_state_v2', raw);

    const migrated = StorageService.loadState();

    expect(migrated?.hasCompletedOnboarding).toBe(true);
    expect(migrated?.goals).toEqual(['Weniger automatische Öffnungen']);
    expect(migrated?.history?.[0].id).toBe('old-event');
    expect(localStorage.getItem('scrollshield_state_v2')).toBeNull();
    expect(localStorage.getItem('scrollshield_meta_v3')).toContain('scrollshield_state_v2');
    expect(StorageService.getLegacyArchive()?.sources[0].rawEntries.scrollshield_state_v2).toBe(raw);
  });

  it('migrates the unversioned legacy state key instead of silently ignoring it', () => {
    const oldState = {
      ...DEFAULT_STATE,
      hasCompletedOnboarding: true,
      stats: { ...DEFAULT_STATE.stats, totalSavedTime: 321 },
    };
    const raw = JSON.stringify(oldState);
    localStorage.setItem('scrollshield_state', raw);

    const migrated = StorageService.loadState();

    expect(migrated?.stats?.totalSavedTime).toBe(321);
    expect(localStorage.getItem('scrollshield_state')).toBeNull();
    expect(StorageService.getLegacyArchive()?.sources[0].rawEntries.scrollshield_state).toBe(raw);
  });

  it('retains the legacy source when a transactional migration write fails', () => {
    const raw = JSON.stringify({ ...DEFAULT_STATE, hasCompletedOnboarding: true });
    localStorage.setItem('scrollshield_state_v2', raw);
    storage.failWriteFor('scrollshield_meta_v3_pending');

    const migrated = StorageService.loadState();

    expect(migrated).toBeNull();
    expect(localStorage.getItem('scrollshield_state_v2')).toBe(raw);
    expect(localStorage.getItem('scrollshield_meta_v3')).toBeNull();
  });

  it('migrates V0.7 events and saved time while archiving every original key byte-for-byte', () => {
    const brainStateRaw = JSON.stringify({
      savedTimeMinutesToday: 73,
      mindfulnessScore: 88,
      activeProfileId: 'profile-balanced',
    });
    const eventsRaw = JSON.stringify([
      {
        id: '1',
        appName: 'Instagram',
        timestamp: '14:20',
        delayDurationSeconds: 15,
        outcome: 'blocked',
        vulnerabilityScoreAtTime: 65,
      },
      {
        id: '2',
        appName: 'TikTok',
        timestamp: '16:05',
        delayDurationSeconds: 20,
        outcome: 'delayed_opened',
        vulnerabilityScoreAtTime: 40,
      },
      {
        id: '3',
        appName: 'YouTube Shorts',
        timestamp: '17:45',
        delayDurationSeconds: 25,
        outcome: 'emergency_unlocked',
        vulnerabilityScoreAtTime: 82,
      },
    ]);
    const rulesRaw = JSON.stringify([
      { id: 'rule-1', prompt: 'Alte KI-Regel', condition: 'legacy', action: 'legacy', isActive: true },
    ]);
    const gameRaw = JSON.stringify({ level: 9, xp: 450 });
    localStorage.setItem('scrollshield_brainState', brainStateRaw);
    localStorage.setItem('scrollshield_events', eventsRaw);
    localStorage.setItem('scrollshield_rules', rulesRaw);
    localStorage.setItem('scrollshield_game', gameRaw);

    const migrated = StorageService.loadState();
    const archive = StorageService.getLegacyArchive();

    expect(migrated?.hasCompletedOnboarding).toBe(true);
    expect(migrated?.stats?.totalSavedTime).toBe(73);
    expect(migrated?.history?.some((event) => event.id === 'legacy-1' && event.appId === 'instagram')).toBe(true);
    expect(migrated?.history?.some((event) => event.id === 'legacy-2' && event.type === 'open')).toBe(true);
    expect(migrated?.history?.some((event) => event.id === 'legacy-3' && event.type === 'emergency')).toBe(true);
    expect(migrated?.history?.[0].desc).toContain('nicht automatisch aktiviert');
    expect(Object.values(migrated?.appsConfig ?? {}).every((config) => !config.active)).toBe(true);
    expect(archive?.sources[0].source).toBe('legacy_v07_pro');
    expect(archive?.sources[0].rawEntries).toEqual({
      scrollshield_brainState: brainStateRaw,
      scrollshield_events: eventsRaw,
      scrollshield_rules: rulesRaw,
      scrollshield_game: gameRaw,
    });
    expect(localStorage.getItem('scrollshield_brainState')).toBeNull();
    expect(localStorage.getItem('scrollshield_events')).toBeNull();
    expect(localStorage.getItem('scrollshield_rules')).toBeNull();
    expect(localStorage.getItem('scrollshield_game')).toBeNull();
  });

  it('finishes a complete pending transaction after an interrupted commit', () => {
    StorageService.saveState({
      ...DEFAULT_STATE,
      hasCompletedOnboarding: true,
      stats: { ...DEFAULT_STATE.stats, totalSavedTime: 444 },
    });
    const keys = [
      'scrollshield_settings_v3',
      'scrollshield_profiles_v3',
      'scrollshield_stats_v3',
      'scrollshield_history_v3',
      'scrollshield_meta_v3',
    ];
    for (const key of keys) localStorage.setItem(`${key}_pending`, localStorage.getItem(key) as string);
    localStorage.setItem('scrollshield_stats_v3', '{corrupted-during-interrupted-commit');

    const recovered = StorageService.loadState();

    expect(recovered?.stats?.totalSavedTime).toBe(444);
    expect(keys.every((key) => localStorage.getItem(`${key}_pending`) === null)).toBe(true);
  });

  it('keeps corrupted legacy data untouched for manual recovery', () => {
    localStorage.setItem('scrollshield_state_v2', '{bad-json');

    const migrated = StorageService.loadState();

    expect(migrated).toBeNull();
    expect(localStorage.getItem('scrollshield_state_v2')).toBe('{bad-json');
  });

  it('loads valid chunks even when another stored chunk is corrupted', () => {
    StorageService.saveState({ ...DEFAULT_STATE, hasCompletedOnboarding: true });
    localStorage.setItem('scrollshield_settings_v3', 'not-valid-base64');

    const loaded = StorageService.loadState();

    expect(loaded?.profiles).toEqual(DEFAULT_STATE.profiles);
    expect(loaded?.hasCompletedOnboarding).toBeUndefined();
  });

  it('ignores corrupted plaintext stats chunks', () => {
    StorageService.saveState({ ...DEFAULT_STATE, history: [] });
    localStorage.setItem('scrollshield_stats_v3', '{bad-json');

    const loaded = StorageService.loadState();

    expect(loaded?.history).toEqual([]);
    expect(loaded?.dailyStats).toBeUndefined();
  });
});
