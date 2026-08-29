export interface SubscriptionEntitlementVerificationKey {
  kid: string;
  algorithm: 'ES256';
  publicJwk: JsonWebKey;
}

export const SUBSCRIPTION_ENTITLEMENT_ISSUER = 'scrollshield-subscription-backend';
export const SUBSCRIPTION_ENTITLEMENT_AUDIENCE = 'app.scrollshield.mobile/subscription';
export const SUBSCRIPTION_EXPECTED_PACKAGE_NAME = 'app.scrollshield.mobile';

/**
 * Release-controlled public verification keys only.
 *
 * This list intentionally remains empty until the dedicated ScrollShield backend signing
 * key exists, its public JWK has completed release review, and assertion verification has
 * real test evidence. An empty key set is fail-closed: Plus/Max cannot be activated.
 *
 * Never add a private key, service-account credential, Supabase secret/service-role key,
 * Google Play credential, or HMAC/shared secret to the client bundle.
 */
export const SUBSCRIPTION_ENTITLEMENT_VERIFICATION_KEYS: readonly SubscriptionEntitlementVerificationKey[] =
  [];
