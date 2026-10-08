export interface FeatureFlags {
  enableAdvancedStats: boolean;
  enableCloudSync: boolean;
  enablePartnerControl: boolean;
  enableFamilyControl: boolean;
  enableSubscriptions: boolean;
  /** Experimental research only. V1 production must not depend on AccessibilityService. */
  enableShortVideoResearch: boolean;
  enableAiRecommendations: boolean;
}

export const FEATURE_FLAGS = Object.freeze({
  enableAdvancedStats: false,
  enableCloudSync: false,
  enablePartnerControl: false,
  enableFamilyControl: false,
  enableSubscriptions: false,
  enableShortVideoResearch: false,
  enableAiRecommendations: false,
}) satisfies Readonly<FeatureFlags>;
