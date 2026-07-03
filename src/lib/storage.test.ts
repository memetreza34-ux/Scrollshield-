import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_STATE } from '../types';
import { StorageService } from './storage';

class LocalStorageMock {
  [key: string]: unknown;

  private store: Record<string, string> = {};

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
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', new LocalStorageMock());
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
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

    StorageService.saveState(state);
    const loaded = StorageService.loadState();

    expect(loaded?.hasCompletedOnboarding).toBe(true);
    expect(loaded?.activeProtectionLevel).toBe('strict');
    expect(loaded?.isFocusModeActive).toBe(true);
    expect(loaded?.focusTimeRemaining).toBe(12);
    expect(loaded?.activeSession?.appId).toBe('instagram');
    expect(loaded?.history).toHaveLength(1);
    expect(loaded?.history?.[0].appId).toBe('instagram');
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

  it('clears all ScrollShield-owned keys and legacy keys', () => {
    localStorage.setItem('scrollshield_settings_v3', 'x');
    localStorage.setItem('scrollshield_custom_future_key', 'x');
    localStorage.setItem('scrollshield_state_v2', 'x');
    localStorage.setItem('unrelated', 'keep');

    StorageService.clearState();

    expect(localStorage.getItem('scrollshield_settings_v3')).toBeNull();
    expect(localStorage.getItem('scrollshield_custom_future_key')).toBeNull();
    expect(localStorage.getItem('scrollshield_state_v2')).toBeNull();
    expect(localStorage.getItem('unrelated')).toBe('keep');
  });

  it('migrates old v2 monolithic state', () => {
    const oldState = { ...DEFAULT_STATE, hasCompletedOnboarding: true };
    localStorage.setItem('scrollshield_state_v2', JSON.stringify(oldState));

    const migrated = StorageService.loadState();

    expect(migrated?.hasCompletedOnboarding).toBe(true);
    expect(localStorage.getItem('scrollshield_state_v2')).toBeNull();
    expect(localStorage.getItem('scrollshield_meta_v3')).not.toBeNull();
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
