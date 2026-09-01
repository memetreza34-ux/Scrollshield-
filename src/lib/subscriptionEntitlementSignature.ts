import {
  SUBSCRIPTION_ENTITLEMENT_AUDIENCE,
  SUBSCRIPTION_ENTITLEMENT_ISSUER,
  SUBSCRIPTION_ENTITLEMENT_VERIFICATION_KEYS,
  SUBSCRIPTION_EXPECTED_PACKAGE_NAME,
  type SubscriptionEntitlementVerificationKey,
} from '../config/subscriptionTrust';
import {
  resolveEffectiveSubscriptionEntitlement,
  type EffectiveSubscriptionEntitlement,
} from './subscriptionEntitlementPolicy';
import { isSubscriptionPlanId } from './subscriptionPlanPolicy';

interface EntitlementJwsHeader {
  alg?: unknown;
  kid?: unknown;
  typ?: unknown;
}

interface EntitlementJwsPayload {
  schemaVersion?: unknown;
  assertionId?: unknown;
  issuer?: unknown;
  audience?: unknown;
  packageName?: unknown;
  installationKeyId?: unknown;
  plan?: unknown;
  lifecycleState?: unknown;
  issuedAtMs?: unknown;
  validUntilMs?: unknown;
}

export interface SubscriptionEntitlementVerificationResult {
  entitlement: EffectiveSubscriptionEntitlement;
  verified: boolean;
  assertionId: string | null;
  kid: string | null;
  reason:
    | 'verified'
    | 'missing-assertion'
    | 'malformed-jws'
    | 'unsupported-header'
    | 'unknown-key'
    | 'invalid-signature'
    | 'invalid-payload'
    | 'wrong-installation';
}

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const ASSERTION_TYPE = 'scrollshield-entitlement+jwt';
const TEXT_ENCODER = new TextEncoder();

const fail = (
  reason: Exclude<SubscriptionEntitlementVerificationResult['reason'], 'verified'>,
  kid: string | null = null,
): SubscriptionEntitlementVerificationResult => ({
  entitlement: resolveEffectiveSubscriptionEntitlement(null),
  verified: false,
  assertionId: null,
  kid,
  reason,
});

const decodeBase64Url = (value: string): Uint8Array | null => {
  if (!value || !BASE64URL_PATTERN.test(value)) return null;
  const padded = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');
  try {
    const decoded = globalThis.atob(padded);
    return Uint8Array.from(decoded, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
};

const decodeJsonPart = <T>(value: string): T | null => {
  const bytes = decodeBase64Url(value);
  if (!bytes) return null;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as T) : null;
  } catch {
    return null;
  }
};

const findVerificationKey = (
  kid: string,
  keys: readonly SubscriptionEntitlementVerificationKey[],
): SubscriptionEntitlementVerificationKey | null =>
  keys.find((key) => key.kid === kid && key.algorithm === 'ES256') ?? null;

const verifyEs256 = async (
  signingInput: string,
  signature: Uint8Array,
  key: SubscriptionEntitlementVerificationKey,
): Promise<boolean> => {
  if (signature.byteLength !== 64) return false;
  try {
    const publicKey = await globalThis.crypto.subtle.importKey(
      'jwk',
      key.publicJwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify'],
    );
    return globalThis.crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      publicKey,
      signature,
      TEXT_ENCODER.encode(signingInput),
    );
  } catch {
    return false;
  }
};

const isBoundedIdentifier = (value: unknown, min: number, max: number): value is string =>
  typeof value === 'string' && value.length >= min && value.length <= max && BASE64URL_PATTERN.test(value);

/**
 * Verifies one compact ES256 JWS from the dedicated ScrollShield subscription backend.
 *
 * Only this cryptographic boundary is allowed to convert a backend assertion into a
 * `cryptographicallyVerified: true` candidate for the entitlement policy. Raw JSON,
 * Play Billing results, Integrity tokens, localStorage and SharedPreferences must never
 * call the entitlement policy with trusted=true on their own.
 */
export const verifySubscriptionEntitlementAssertion = async (
  compactJws: string | null | undefined,
  expectedInstallationKeyId: string,
  nowMs = Date.now(),
  trustedKeys: readonly SubscriptionEntitlementVerificationKey[] = SUBSCRIPTION_ENTITLEMENT_VERIFICATION_KEYS,
): Promise<SubscriptionEntitlementVerificationResult> => {
  if (!compactJws) return fail('missing-assertion');
  if (!isBoundedIdentifier(expectedInstallationKeyId, 32, 128)) return fail('wrong-installation');

  const parts = compactJws.split('.');
  if (parts.length !== 3 || parts.some((part) => !part || !BASE64URL_PATTERN.test(part))) {
    return fail('malformed-jws');
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeJsonPart<EntitlementJwsHeader>(encodedHeader);
  const payload = decodeJsonPart<EntitlementJwsPayload>(encodedPayload);
  const signature = decodeBase64Url(encodedSignature);
  if (!header || !payload || !signature) return fail('malformed-jws');

  if (header.alg !== 'ES256' || header.typ !== ASSERTION_TYPE || !isBoundedIdentifier(header.kid, 16, 128)) {
    return fail('unsupported-header');
  }

  const verificationKey = findVerificationKey(header.kid, trustedKeys);
  if (!verificationKey) return fail('unknown-key', header.kid);

  const signatureValid = await verifyEs256(`${encodedHeader}.${encodedPayload}`, signature, verificationKey);
  if (!signatureValid) return fail('invalid-signature', header.kid);

  if (
    payload.schemaVersion !== 1 ||
    !isBoundedIdentifier(payload.assertionId, 16, 128) ||
    payload.issuer !== SUBSCRIPTION_ENTITLEMENT_ISSUER ||
    payload.audience !== SUBSCRIPTION_ENTITLEMENT_AUDIENCE ||
    payload.packageName !== SUBSCRIPTION_EXPECTED_PACKAGE_NAME ||
    !isSubscriptionPlanId(payload.plan) ||
    typeof payload.lifecycleState !== 'string' ||
    typeof payload.issuedAtMs !== 'number' ||
    typeof payload.validUntilMs !== 'number' ||
    !Number.isFinite(payload.issuedAtMs) ||
    !Number.isFinite(payload.validUntilMs)
  ) {
    return fail('invalid-payload', header.kid);
  }

  if (payload.installationKeyId !== expectedInstallationKeyId) {
    return fail('wrong-installation', header.kid);
  }

  const entitlement = resolveEffectiveSubscriptionEntitlement(
    {
      schemaVersion: payload.schemaVersion,
      plan: payload.plan,
      lifecycleState: payload.lifecycleState,
      cryptographicallyVerified: true,
      issuedAtMs: payload.issuedAtMs,
      validUntilMs: payload.validUntilMs,
    },
    nowMs,
  );

  return {
    entitlement,
    verified: entitlement.source === 'verified-backend-assertion',
    assertionId: payload.assertionId,
    kid: header.kid,
    reason: entitlement.source === 'verified-backend-assertion' ? 'verified' : 'invalid-payload',
  };
};
