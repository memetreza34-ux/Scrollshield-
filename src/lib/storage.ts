import { AppState } from '../types';

/**
 * Local Storage Service for ScrollShield
 *
 * Features:
 * - Separation of concerns (Settings, Stats, History, Profiles)
 * - Obfuscation of sensitive configuration data
 * - Robust error handling and fallback to defaults
 * - Migration support for future updates
 */

const STORAGE_PREFIX = 'scrollshield_';
const VERSION = 3; // Bumped version for new storage architecture

// Simple obfuscation to prevent casual plaintext reading of sensitive local data.
// Note: True encryption requires a user-provided password. This is obfuscation.
const obfuscate = (data: string): string => {
  try {
    const encoded = encodeURIComponent(data);
    let obfuscated = '';
    for (let i = 0; i < encoded.length; i++) {
      obfuscated += String.fromCharCode(encoded.charCodeAt(i) ^ 42); // Simple XOR
    }
    return btoa(obfuscated);
  } catch (e) {
    console.error('Obfuscation failed', e);
    return btoa(encodeURIComponent(data)); // Fallback
  }
};

const deobfuscate = (data: string): string | null => {
  try {
    const decoded = atob(data);
    let deobfuscated = '';
    for (let i = 0; i < decoded.length; i++) {
      deobfuscated += String.fromCharCode(decoded.charCodeAt(i) ^ 42);
    }
    return decodeURIComponent(deobfuscated);
  } catch (e) {
    console.error('Deobfuscation failed', e);
    try {
      return decodeURIComponent(atob(data)); // Fallback for older non-XOR payloads
    } catch (fallbackError) {
      console.error('Fallback deobfuscation failed', fallbackError);
      return null;
    }
  }
};

const parseJson = <T>(raw: string | null): T | null => {
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const parseStoredChunk = <T>(raw: string | null, encoded = false): T | null => {
  if (!raw) return null;
  return parseJson<T>(encoded ? deobfuscate(raw) : raw);
};

interface StorageKeys {
  SETTINGS: string;
  STATS: string;
  HISTORY: string;
  PROFILES: string;
  META: string;
}

const KEYS: StorageKeys = {
  SETTINGS: `${STORAGE_PREFIX}settings_v${VERSION}`,
  STATS: `${STORAGE_PREFIX}stats_v${VERSION}`,
  HISTORY: `${STORAGE_PREFIX}history_v${VERSION}`,
  PROFILES: `${STORAGE_PREFIX}profiles_v${VERSION}`,
  META: `${STORAGE_PREFIX}meta_v${VERSION}`,
};

export const StorageService = {
  /**
   * Saves the application state to local storage, separating it into logical chunks.
   * Sensitive data (settings, profiles) is obfuscated.
   */
  saveState: (state: AppState) => {
    try {
      // 1. Settings (Sensitive - Obfuscated)
      const settingsData = {
        settings: state.settings,
        permissions: state.permissions,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        activeProtectionLevel: state.activeProtectionLevel,
        isFocusModeActive: state.isFocusModeActive,
        focusTimeRemaining: state.focusTimeRemaining,
        activeSession: state.activeSession,
      };
      localStorage.setItem(KEYS.SETTINGS, obfuscate(JSON.stringify(settingsData)));

      // 2. Profiles & App Configs (Sensitive - Obfuscated)
      const profilesData = {
        profiles: state.profiles,
        activeProfileId: state.activeProfileId,
        appsConfig: state.appsConfig,
      };
      localStorage.setItem(KEYS.PROFILES, obfuscate(JSON.stringify(profilesData)));

      // 3. Stats (Local-only, plaintext for local export/debugging)
      const statsData = {
        stats: state.stats,
        dailyStats: state.dailyStats,
      };
      localStorage.setItem(KEYS.STATS, JSON.stringify(statsData));

      // 4. History (Local-only, plaintext, but limited to save space)
      // Only save the last 100 events locally to prevent storage bloat
      const historyData = {
        history: state.history.slice(0, 100),
        focusSessions: state.focusSessions.slice(0, 50),
      };
      localStorage.setItem(KEYS.HISTORY, JSON.stringify(historyData));

      // 5. Meta (Version tracking for migrations)
      localStorage.setItem(KEYS.META, JSON.stringify({ version: VERSION, lastSaved: Date.now() }));
    } catch (error) {
      console.error('Failed to save state to local storage', error);
    }
  },

  /**
   * Loads and reconstructs the application state from local storage.
   * Handles corrupted data gracefully by falling back to defaults.
   */
  loadState: (): Partial<AppState> | null => {
    try {
      // Check if we have the new version
      const metaRaw = localStorage.getItem(KEYS.META);
      if (!metaRaw) {
        // Migration: Check for old v2 state and migrate if exists
        return StorageService.migrateFromV2();
      }

      let reconstructedState: Partial<AppState> = {};

      // Load Settings
      const settingsRaw = localStorage.getItem(KEYS.SETTINGS);
      if (settingsRaw) {
        const settingsParsed = parseStoredChunk<Partial<AppState>>(settingsRaw, true);
        if (settingsParsed) {
          reconstructedState = { ...reconstructedState, ...settingsParsed };
        } else {
          console.error('Corrupted settings data, falling back to defaults');
        }
      }

      // Load Profiles
      const profilesRaw = localStorage.getItem(KEYS.PROFILES);
      if (profilesRaw) {
        const profilesParsed = parseStoredChunk<Partial<AppState>>(profilesRaw, true);
        if (profilesParsed) {
          reconstructedState = { ...reconstructedState, ...profilesParsed };
        } else {
          console.error('Corrupted profiles data, falling back to defaults');
        }
      }

      // Load Stats
      const statsRaw = localStorage.getItem(KEYS.STATS);
      if (statsRaw) {
        const statsParsed = parseStoredChunk<Partial<AppState>>(statsRaw);
        if (statsParsed) {
          reconstructedState = { ...reconstructedState, ...statsParsed };
        } else {
          console.error('Corrupted stats data, falling back to defaults');
        }
      }

      // Load History
      const historyRaw = localStorage.getItem(KEYS.HISTORY);
      if (historyRaw) {
        const historyParsed = parseStoredChunk<Partial<AppState>>(historyRaw);
        if (historyParsed) {
          reconstructedState = { ...reconstructedState, ...historyParsed };
        } else {
          console.error('Corrupted history data, falling back to defaults');
        }
      }

      return Object.keys(reconstructedState).length > 0 ? reconstructedState : null;
    } catch (error) {
      console.error('Fatal error loading state from local storage', error);
      return null;
    }
  },

  /**
   * Securely wipes all local data.
   */
  clearState: () => {
    try {
      // Remove all ScrollShield-owned keys across versions.
      Object.keys(localStorage)
        .filter((key) => key.startsWith(STORAGE_PREFIX))
        .forEach((key) => localStorage.removeItem(key));

      // Also clean up legacy keys just in case
      localStorage.removeItem('scrollshield_state_v2');
      localStorage.removeItem('scrollshield_state');
    } catch (error) {
      console.error('Failed to clear local storage', error);
    }
  },

  /**
   * Migrates data from the old v2 monolithic plaintext storage to v3 separated/obfuscated storage.
   */
  migrateFromV2: (): Partial<AppState> | null => {
    try {
      const oldStateRaw = localStorage.getItem('scrollshield_state_v2');
      if (!oldStateRaw) return null;

      const oldState = JSON.parse(oldStateRaw);

      // Save in new format immediately
      StorageService.saveState(oldState as AppState);

      // Clean up old state
      localStorage.removeItem('scrollshield_state_v2');

      return oldState;
    } catch (error) {
      console.error('Migration from v2 failed', error);
      return null;
    }
  },
};
