import { AppState } from '../types';
import { normalizeAppState } from './state';

/**
 * Local Storage Service for ScrollShield
 *
 * Security Architecture:
 * - AES-256-GCM encryption via Web Crypto API for all sensitive data.
 * - A device-bound AES key is generated once and stored in localStorage.
 *   It is never transmitted and never leaves the device.
 * - Each encryption call generates a fresh random 96-bit IV (nonce).
 * - Stats and history (non-sensitive) remain plaintext for performance.
 * - Robust migration from legacy v3 XOR-obfuscated format.
 */

const STORAGE_PREFIX = 'scrollshield_';
const VERSION = 4; // v4: AES-GCM encryption
const CRYPTO_KEY_STORAGE = `${STORAGE_PREFIX}device_key`;

// ─── AES-GCM Crypto Layer ───────────────────────────────────────────────────

/** Returns the persistent device-bound AES-GCM key, creating it on first use. */
async function getOrCreateDeviceKey(): Promise<CryptoKey> {
  const stored = localStorage.getItem(CRYPTO_KEY_STORAGE);
  if (stored) {
    try {
      const raw = Uint8Array.from(atob(stored), (c) => c.charCodeAt(0));
      return await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
    } catch {
      // Corrupted key – generate a new one and wipe old data
      localStorage.removeItem(CRYPTO_KEY_STORAGE);
    }
  }

  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const raw = await crypto.subtle.exportKey('raw', key);
  localStorage.setItem(CRYPTO_KEY_STORAGE, btoa(String.fromCharCode(...new Uint8Array(raw))));
  return key;
}

/**
 * Encrypts a plain-text string with AES-256-GCM.
 * Returns Base64(IV + ciphertext).
 */
async function encrypt(plaintext: string): Promise<string> {
  const key = await getOrCreateDeviceKey();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit nonce
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.byteLength);
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts a Base64(IV + ciphertext) string produced by `encrypt`.
 * Returns null on any failure (corrupted data, wrong key, etc.).
 */
async function decrypt(ciphertextB64: string): Promise<string | null> {
  try {
    const key = await getOrCreateDeviceKey();
    const combined = Uint8Array.from(atob(ciphertextB64), (c) => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const plainBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return new TextDecoder().decode(plainBuffer);
  } catch {
    return null;
  }
}

// ─── Legacy XOR deobfuscation (read-only, for v3 migration) ─────────────────

function legacyDeobfuscate(data: string): string | null {
  try {
    const decoded = atob(data);
    let out = '';
    for (let i = 0; i < decoded.length; i++) {
      out += String.fromCharCode(decoded.charCodeAt(i) ^ 42);
    }
    return decodeURIComponent(out);
  } catch {
    try {
      return decodeURIComponent(atob(data));
    } catch {
      return null;
    }
  }
}

// ─── JSON helpers ─────────────────────────────────────────────────────────────

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// ─── Storage key definitions ──────────────────────────────────────────────────

const KEYS = {
  SETTINGS: `${STORAGE_PREFIX}settings_v${VERSION}`,
  STATS: `${STORAGE_PREFIX}stats_v${VERSION}`,
  HISTORY: `${STORAGE_PREFIX}history_v${VERSION}`,
  PROFILES: `${STORAGE_PREFIX}profiles_v${VERSION}`,
  META: `${STORAGE_PREFIX}meta_v${VERSION}`,
  // Legacy v3 keys (only for migration)
  LEGACY_SETTINGS: `${STORAGE_PREFIX}settings_v3`,
  LEGACY_PROFILES: `${STORAGE_PREFIX}profiles_v3`,
} as const;

// ─── Public API ───────────────────────────────────────────────────────────────

export const StorageService = {
  /**
   * Saves the application state to localStorage.
   * Sensitive chunks are encrypted with AES-256-GCM.
   * Non-sensitive chunks (stats, history) stay plaintext.
   */
  saveState: async (state: AppState): Promise<void> => {
    try {
      // 1. Settings (Sensitive → AES-256-GCM encrypted)
      const settingsData = {
        settings: state.settings,
        permissions: state.permissions,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        activeProtectionLevel: state.activeProtectionLevel,
        isFocusModeActive: state.isFocusModeActive,
        focusTimeRemaining: state.focusTimeRemaining,
        focusSchedules: state.focusSchedules,
        pendingFocusResultId: state.pendingFocusResultId,
        activeSession: state.activeSession,
      };
      localStorage.setItem(KEYS.SETTINGS, await encrypt(JSON.stringify(settingsData)));

      // 2. Profiles & App Configs (Sensitive → AES-256-GCM encrypted)
      const profilesData = {
        profiles: state.profiles,
        activeProfileId: state.activeProfileId,
        appsConfig: state.appsConfig,
      };
      localStorage.setItem(KEYS.PROFILES, await encrypt(JSON.stringify(profilesData)));

      // 3. Stats (non-sensitive – plaintext)
      localStorage.setItem(KEYS.STATS, JSON.stringify({ stats: state.stats, dailyStats: state.dailyStats }));

      // 4. History (non-sensitive, capped at last 100 events)
      localStorage.setItem(
        KEYS.HISTORY,
        JSON.stringify({
          history: state.history.slice(0, 100),
          focusSessions: state.focusSessions.slice(0, 50),
        }),
      );

      // 5. Meta
      localStorage.setItem(KEYS.META, JSON.stringify({ version: VERSION, lastSaved: Date.now() }));
    } catch (error) {
      console.error('Failed to save state', error);
    }
  },

  /**
   * Loads and reconstructs the application state.
   * Automatically migrates from legacy XOR-obfuscated v3 format when needed.
   */
  loadState: async (): Promise<Partial<AppState> | null> => {
    try {
      const metaRaw = localStorage.getItem(KEYS.META);
      if (!metaRaw) {
        // Try legacy v3 migration first, then v2
        const migratedV3 = await StorageService.migrateFromV3();
        return migratedV3 ?? (await StorageService.migrateFromV2());
      }

      let state: Partial<AppState> = {};

      // Settings
      const settingsRaw = localStorage.getItem(KEYS.SETTINGS);
      if (settingsRaw) {
        const decrypted = await decrypt(settingsRaw);
        const parsed = parseJson<Partial<AppState>>(decrypted);
        if (parsed) state = { ...state, ...parsed };
        else console.error('Corrupted/unreadable settings chunk – using defaults');
      }

      // Profiles
      const profilesRaw = localStorage.getItem(KEYS.PROFILES);
      if (profilesRaw) {
        const decrypted = await decrypt(profilesRaw);
        const parsed = parseJson<Partial<AppState>>(decrypted);
        if (parsed) state = { ...state, ...parsed };
        else console.error('Corrupted/unreadable profiles chunk – using defaults');
      }

      // Stats (plaintext)
      const statsRaw = localStorage.getItem(KEYS.STATS);
      if (statsRaw) {
        const parsed = parseJson<Partial<AppState>>(statsRaw);
        if (parsed) state = { ...state, ...parsed };
      }

      // History (plaintext)
      const historyRaw = localStorage.getItem(KEYS.HISTORY);
      if (historyRaw) {
        const parsed = parseJson<Partial<AppState>>(historyRaw);
        if (parsed) state = { ...state, ...parsed };
      }

      return Object.keys(state).length > 0 ? state : null;
    } catch (error) {
      console.error('Fatal error loading state', error);
      return null;
    }
  },

  /**
   * Securely wipes all ScrollShield data from localStorage,
   * including the device encryption key.
   */
  clearState: () => {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(STORAGE_PREFIX))
        .forEach((k) => localStorage.removeItem(k));
      localStorage.removeItem('scrollshield_state_v2');
      localStorage.removeItem('scrollshield_state');
    } catch (error) {
      console.error('Failed to clear local storage', error);
    }
  },

  /**
   * Migrates from legacy v3 XOR-obfuscated format to AES-GCM v4.
   */
  migrateFromV3: async (): Promise<Partial<AppState> | null> => {
    const settingsRaw = localStorage.getItem(KEYS.LEGACY_SETTINGS);
    const profilesRaw = localStorage.getItem(KEYS.LEGACY_PROFILES);
    if (!settingsRaw && !profilesRaw) return null;

    try {
      let state: Partial<AppState> = {};

      if (settingsRaw) {
        const parsed = parseJson<Partial<AppState>>(legacyDeobfuscate(settingsRaw));
        if (parsed) state = { ...state, ...parsed };
      }
      if (profilesRaw) {
        const parsed = parseJson<Partial<AppState>>(legacyDeobfuscate(profilesRaw));
        if (parsed) state = { ...state, ...parsed };
      }

      if (Object.keys(state).length > 0) {
        await StorageService.saveState(normalizeAppState(state));
        // Remove legacy keys
        localStorage.removeItem(KEYS.LEGACY_SETTINGS);
        localStorage.removeItem(KEYS.LEGACY_PROFILES);
        console.info('ScrollShield: migrated from v3 XOR to v4 AES-GCM');
        return state;
      }
      return null;
    } catch (error) {
      console.error('Migration from v3 failed', error);
      return null;
    }
  },

  /**
   * Migrates from legacy v2 monolithic plaintext storage.
   */
  migrateFromV2: async (): Promise<Partial<AppState> | null> => {
    try {
      const oldRaw = localStorage.getItem('scrollshield_state_v2');
      if (!oldRaw) return null;
      const oldState = JSON.parse(oldRaw) as AppState;
      await StorageService.saveState(normalizeAppState(oldState));
      localStorage.removeItem('scrollshield_state_v2');
      console.info('ScrollShield: migrated from v2 plaintext to v4 AES-GCM');
      return oldState;
    } catch (error) {
      console.error('Migration from v2 failed', error);
      return null;
    }
  },
};
