import { normalizeAppState, normalizeAppsConfig, normalizeAppConfig } from '../src/lib/state';
import { DEFAULT_STATE, DEFAULT_PROFILES, SUPPORTED_APPS } from '../src/types';

console.log("=== EMPIRICAL TEST 1: Backward Compatibility of State Normalization ===");

// 1. Simulate legacy localStorage saved state (v3 with 6 apps)
const legacyV3State = {
  activeProfileId: 'gentle',
  appsConfig: {
    instagram: {
      id: 'instagram',
      active: true,
      mode: 'strict',
      openDelay: 10,
      dailyLimit: 45,
      sessionLimit: 10,
      blockHours: '22:00-07:00',
      focusModeBehavior: 'block',
      reelsProtection: {
        enabled: true,
        mode: 'block',
        dailyLimitMinutes: 10,
        sessionLimitMinutes: 3,
        singleItemsAllowed: 1,
        autoStopAfterMinutes: 3,
        stopAfterSwipes: 5,
        warnOnEndlessScroll: true,
        hardInterrupt: true,
      },
      singleContent: { allowSharedLinks: true, allowOnlyOne: true, returnToPrevious: true },
      emergencyUnlock: { enabled: true, durationMinutes: 5, requireCountdown: true, requireReason: true, maxPerDay: 2 },
      timeWindows: { morningRules: 'normal', workRules: 'strict', eveningRules: 'normal', nightRules: 'block', weekendRules: 'normal' },
      antiBinge: { enabled: true, warningThreshold: 3, warningTimeframe: 10, blockThreshold: 5, blockTimeframe: 20 },
    },
    // Missing the other 5 apps or missing new platforms
  },
  profiles: DEFAULT_PROFILES,
};

const normalized = normalizeAppState(legacyV3State as any);
console.log("Normalized apps count (current code):", Object.keys(normalized.appsConfig).length);
console.log("Instagram active status preserved:", normalized.appsConfig.instagram.active === true);
console.log("Instagram openDelay preserved:", normalized.appsConfig.instagram.openDelay === 10);
console.log("TikTok generated with defaults:", normalized.appsConfig.tiktok.dailyLimit === 60);

// Test proposal's updated normalizeAppsConfig with customPlatforms
const proposedPlatforms = [
  ...SUPPORTED_APPS,
  { id: 'reddit', name: 'Reddit', category: 'social', color: 'bg-red-500', androidPackages: ['com.reddit.frontpage'], hasShortVideoFeed: true },
  { id: 'pinterest', name: 'Pinterest', category: 'social', color: 'bg-red-600', androidPackages: ['com.pinterest'], hasShortVideoFeed: true },
];

function proposedNormalizeAppsConfig(
  appsConfig: Record<string, any> = {},
  customPlatforms: any[] = []
) {
  const normalized: Record<string, any> = {};
  const allPlatforms = [...proposedPlatforms, ...customPlatforms];

  allPlatforms.forEach((app) => {
    normalized[app.id] = normalizeAppConfig(app.id, appsConfig[app.id]);
  });

  Object.keys(appsConfig).forEach((appId) => {
    if (!normalized[appId] && appsConfig[appId]) {
      normalized[appId] = normalizeAppConfig(appId, appsConfig[appId]);
    }
  });

  return normalized;
}

const proposedNormalized = proposedNormalizeAppsConfig(legacyV3State.appsConfig);
console.log("Proposed normalized apps count:", Object.keys(proposedNormalized).length);
console.log("Reddit auto-seeded with defaults:", proposedNormalized.reddit.dailyLimit === 60);
console.log("Instagram custom overrides preserved:", proposedNormalized.instagram.openDelay === 10);

