export interface FeatureFlags {
  enableAdvancedStats: boolean;
  enableCloudSync: boolean;
  enablePartnerControl: boolean;
  enableFamilyControl: boolean;
  enableSubscriptions: boolean;
  enableAiRecommendations: boolean;
}

export const FEATURE_FLAGS = Object.freeze({
  enableAdvancedStats: false,
  enableCloudSync: false,
  enablePartnerControl: false,
  enableFamilyControl: false,
  enableSubscriptions: false,
  enableAiRecommendations: false,
}) satisfies Readonly<FeatureFlags>;
