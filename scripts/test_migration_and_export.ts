import { normalizeAppState, normalizeAppsConfig, normalizeAppConfig } from '../src/lib/state';
import { DEFAULT_STATE, DEFAULT_PROFILES, AppState, AppConfig } from '../src/types';
import { createScrollShieldExport, parseScrollShieldExport } from '../src/lib/dataExport';

console.log("=== EMPIRICAL TEST 2: Schema Migration & JSON Backup Compatibility ===");

// 1. Create a current export
const currentExport = createScrollShieldExport(DEFAULT_STATE);
console.log("Export created with schemaVersion:", currentExport.schemaVersion);

// 2. Simulate an imported JSON string with legacy 6-app state
const rawLegacyJson = JSON.stringify({
  schemaVersion: 1,
  app: 'ScrollShield',
  exportedAt: new Date().toISOString(),
  appVersion: '1.0.0',
  state: {
    ...DEFAULT_STATE,
    appsConfig: {
      instagram: { active: true, mode: 'strict', openDelay: 15, dailyLimit: 30, sessionLimit: 5 },
      tiktok: { active: true, mode: 'strict', openDelay: 20, dailyLimit: 20, sessionLimit: 5 },
      youtube: { active: false, mode: 'standard', openDelay: 5, dailyLimit: 60, sessionLimit: 15 },
      facebook: { active: false, mode: 'standard', openDelay: 5, dailyLimit: 60, sessionLimit: 15 },
      twitter: { active: true, mode: 'soft', openDelay: 10, dailyLimit: 40, sessionLimit: 10 },
      snapchat: { active: false, mode: 'standard', openDelay: 5, dailyLimit: 60, sessionLimit: 15 },
    }
  }
});

const parsed = parseScrollShieldExport(rawLegacyJson);
console.log("Parsed export successfully:", parsed.app === 'ScrollShield');

const normalized = normalizeAppState(parsed.state as any);
console.log("Total apps in normalized imported state:", Object.keys(normalized.appsConfig).length);
console.log("Instagram openDelay preserved:", normalized.appsConfig.instagram.openDelay === 15);
console.log("TikTok active preserved:", normalized.appsConfig.tiktok.active === true);
