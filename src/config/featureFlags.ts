export interface FeatureFlags {
  enableAdvancedStats: boolean;
  enableCloudSync: boolean;
  enablePartnerControl: boolean;
  enableFamilyControl: boolean;
  enableSubscriptions: boolean;
  enableAiRecommendations: boolean;
  /** Post-V1 only: never a production V1 dependency. */
  enableShortVideoResearch: boolean;
}

export const FEATURE_FLAGS = Object.freeze({
  enableAdvancedStats: false,
  enableCloudSync: false,
  enablePartnerControl: false,
  enableFamilyControl: false,
  enableSubscriptions: false,
  enableAiRecommendations: false,
  enableShortVideoResearch: false,
}) satisfies Readonly<FeatureFlags>;
