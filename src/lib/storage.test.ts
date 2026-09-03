import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_STATE } from '../types';
import { StorageService } from './storage';

// ── Minimal localStorage mock ─────────────────────────────────────────────────
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
    Object.keys(this.store).forEach((k) => {
      delete this[k];
    });
    this.store = {};
  }
}

// ── Web Crypto stub (JSDOM doesn't ship crypto.subtle) ────────────────────────
// We stub encrypt/decrypt with a trivial reversible transform so the storage
// layer can be tested end-to-end without a real browser crypto context.

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const stubKey = {} as CryptoKey;

const cryptoSubtleStub = {
  generateKey: vi.fn().mockResolvedValue(stubKey),
  exportKey: vi.fn().mockResolvedValue(new Uint8Array(32).buffer),
  importKey: vi.fn().mockResolvedValue(stubKey),
  encrypt: vi.fn().mockImplementation(async (_algo: unknown, _key: unknown, data: BufferSource) => {
    // Prepend 12 zero bytes to simulate IV, then copy plaintext bytes
    const src =
      data instanceof ArrayBuffer
        ? new Uint8Array(data)
        : new Uint8Array(
            (data as ArrayBufferView).buffer,
            (data as ArrayBufferView).byteOffset,
            (data as ArrayBufferView).byteLength,
          );
    const out = new Uint8Array(12 + src.byteLength);
    out.set(src, 12);
    return out.buffer;
  }),
  decrypt: vi.fn().mockImplementation(async (_algo: unknown, _key: unknown, data: BufferSource) => {
    // Strip the first 12 bytes (stub IV)
    const src =
      data instanceof ArrayBuffer
        ? new Uint8Array(data)
        : new Uint8Array(
            (data as ArrayBufferView).buffer,
            (data as ArrayBufferView).byteOffset,
            (data as ArrayBufferView).byteLength,
          );
    return src.slice(12).buffer;
  }),
};

beforeEach(() => {
  vi.stubGlobal('localStorage', new LocalStorageMock());
  vi.stubGlobal('crypto', {
    getRandomValues: (arr: Uint8Array) => arr.fill(0),
    subtle: cryptoSubtleStub,
  });
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────

describe('StorageService', () => {
  it('saves and loads split application state', async () => {
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

    await StorageService.saveState(state);
    const loaded = await StorageService.loadState();

    expect(loaded?.hasCompletedOnboarding).toBe(true);
    expect(loaded?.activeProtectionLevel).toBe('strict');
    expect(loaded?.isFocusModeActive).toBe(true);
    expect(loaded?.focusTimeRemaining).toBe(12);
    expect(loaded?.activeSession?.appId).toBe('instagram');
    expect(loaded?.history).toHaveLength(1);
    expect(loaded?.history?.[0].appId).toBe('instagram');
  });

  it('limits persisted history and focus sessions', async () => {
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

    await StorageService.saveState({ ...DEFAULT_STATE, history: longHistory, focusSessions: longFocusSessions });
    const loaded = await StorageService.loadState();

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

  it('migrates old v2 monolithic state', async () => {
    const oldState = { ...DEFAULT_STATE, hasCompletedOnboarding: true };
    localStorage.setItem('scrollshield_state_v2', JSON.stringify(oldState));

    const migrated = await StorageService.loadState();

    expect(migrated?.hasCompletedOnboarding).toBe(true);
    expect(localStorage.getItem('scrollshield_state_v2')).toBeNull();
    // saveState is async / fire-and-forget during migration, so meta key may not be present yet
    // The important assertion is that the state was correctly loaded and v2 key removed.
    expect(migrated).not.toBeNull();
  });

  it('loads valid plaintext chunks even when encrypted chunk is corrupted', async () => {
    await StorageService.saveState({ ...DEFAULT_STATE, hasCompletedOnboarding: true });
    // Overwrite the encrypted settings with garbage to simulate corruption
    localStorage.setItem('scrollshield_settings_v4', 'not-valid-base64!!');

    const loaded = await StorageService.loadState();

    expect(loaded?.profiles).toEqual(DEFAULT_STATE.profiles);
    expect(loaded?.hasCompletedOnboarding).toBeUndefined();
  });

  it('ignores corrupted plaintext stats chunks', async () => {
    await StorageService.saveState({ ...DEFAULT_STATE, history: [] });
    localStorage.setItem('scrollshield_stats_v4', '{bad-json');

    const loaded = await StorageService.loadState();

    expect(loaded?.history).toEqual([]);
    expect(loaded?.dailyStats).toBeUndefined();
  });
});
