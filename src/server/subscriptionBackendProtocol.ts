import {
  SUBSCRIPTION_ENTITLEMENT_AUDIENCE,
  SUBSCRIPTION_ENTITLEMENT_ISSUER,
  SUBSCRIPTION_EXPECTED_PACKAGE_NAME,
} from '../config/subscriptionTrust';
import { MAX_OFFLINE_ENTITLEMENT_WINDOW_MS } from '../lib/subscriptionEntitlementPolicy';
import { buildSubscriptionChallengeStatement } from '../lib/subscriptionInstallationIdentity';

export type ServerPaidPlan = 'plus' | 'max';
export type ServerLifecycle = 'active' | 'grace';

export interface SubscriptionServerChallenge {
  challengeId: string;
  nonce: string;
  installationKeyId: string;
  publicKeySpki: string;
  issuedAtMs: number;
  expiresAtMs: number;
}

export interface SubscriptionVerificationEnvelopeInput {
  schemaVersion?: unknown;
  challengeId?: unknown;
  installationKeyId?: unknown;
  publicKeySpki?: unknown;
  installationAlgorithm?: unknown;
  installationSignature?: unknown;
  integrityToken?: unknown;
  purchaseToken?: unknown;
  [key: string]: unknown;
}

export interface GoogleSubscriptionLineItemLike {
  productId?: unknown;
  expiryTime?: unknown;
}

export interface GoogleSubscriptionPurchaseV2Like {
  subscriptionState?: unknown;
  acknowledgementState?: unknown;
  linkedPurchaseToken?: unknown;
  lineItems?: unknown;
}

export interface ServerSubscriptionDecision {
  entitled: boolean;
  plan: ServerPaidPlan | null;
  lifecycleState: ServerLifecycle | null;
  accessUntilMs: number | null;
  productId: string | null;
  reason:
    | 'verified-active'
    | 'verified-grace'
    | 'verified-canceled-until-expiry'
    | 'non-entitling-state'
    | 'invalid-google-response'
    | 'unknown-product'
    | 'ambiguous-products'
    | 'expired-line-item';
}

export interface SignedEntitlementPayload {
  schemaVersion: 1;
  assertionId: string;
  issuer: typeof SUBSCRIPTION_ENTITLEMENT_ISSUER;
  audience: typeof SUBSCRIPTION_ENTITLEMENT_AUDIENCE;
  packageName: typeof SUBSCRIPTION_EXPECTED_PACKAGE_NAME;
  installationKeyId: string;
  plan: ServerPaidPlan;
  lifecycleState: ServerLifecycle;
  issuedAtMs: number;
  validUntilMs: number;
}

export const SUBSCRIPTION_CHALLENGE_TTL_MS = 5 * 60 * 1000;
export const ES256_P1363_SIGNATURE_BYTES = 64;

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const textEncoder = new TextEncoder();

const base64UrlEncode = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return globalThis
    .btoa(binary)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

const base64UrlDecode = (value: string): Uint8Array | null => {
  if (!value || !BASE64URL_PATTERN.test(value)) return null;
  try {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
    const binary = globalThis.atob(padded);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
};

const randomBase64Url = (byteLength: number): string => {
  const bytes = new Uint8Array(byteLength);
  globalThis.crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
};

const isBoundedBase64Url = (value: unknown, min: number, max: number): value is string =>
  typeof value === 'string' && value.length >= min && value.length <= max && BASE64URL_PATTERN.test(value);

export const sha256Base64Url = async (value: Uint8Array | string): Promise<string> => {
  const bytes = typeof value === 'string' ? textEncoder.encode(value) : value;
  return base64UrlEncode(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes)));
};

export const hashPurchaseToken = async (purchaseToken: string): Promise<string> => {
  if (!purchaseToken || purchaseToken.length > 4096) throw new Error('Invalid purchase token');
  return sha256Base64Url(purchaseToken);
};

export const validateInstallationPublicIdentity = async (
  installationKeyId: string,
  publicKeySpki: string,
): Promise<CryptoKey | null> => {
  if (!isBoundedBase64Url(installationKeyId, 32, 128)) return null;
  if (!isBoundedBase64Url(publicKeySpki, 64, 2048)) return null;
  const spki = base64UrlDecode(publicKeySpki);
  if (!spki) return null;

  const expectedKeyId = await sha256Base64Url(spki);
  if (expectedKeyId !== installationKeyId) return null;

  try {
    return await globalThis.crypto.subtle.importKey(
      'spki',
      spki,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify'],
    );
  } catch {
    return null;
  }
};

export const createSubscriptionServerChallenge = async (
  installationKeyId: string,
  publicKeySpki: string,
  nowMs = Date.now(),
): Promise<SubscriptionServerChallenge> => {
  const publicKey = await validateInstallationPublicIdentity(installationKeyId, publicKeySpki);
  if (!publicKey) throw new Error('Invalid subscription installation public identity');

  return {
    challengeId: randomBase64Url(16),
    nonce: randomBase64Url(32),
    installationKeyId,
    publicKeySpki,
    issuedAtMs: nowMs,
    expiresAtMs: nowMs + SUBSCRIPTION_CHALLENGE_TTL_MS,
  };
};

const FORBIDDEN_CLIENT_AUTHORITY_FIELDS = [
  'plan',
  'lifecycleState',
  'productId',
  'products',
  'entitlement',
  'paid',
  'price',
] as const;

export const normalizeSubscriptionVerificationEnvelope = (
  raw: SubscriptionVerificationEnvelopeInput,
): Required<Omit<SubscriptionVerificationEnvelopeInput, keyof typeof Object.prototype>> | null => {
  if (!raw || typeof raw !== 'object') return null;
  if (FORBIDDEN_CLIENT_AUTHORITY_FIELDS.some((field) => field in raw)) return null;
  if (raw.schemaVersion !== 1) return null;
  if (!isBoundedBase64Url(raw.challengeId, 16, 128)) return null;
  if (!isBoundedBase64Url(raw.installationKeyId, 32, 128)) return null;
  if (!isBoundedBase64Url(raw.publicKeySpki, 64, 2048)) return null;
  if (raw.installationAlgorithm !== 'ES256') return null;
  if (!isBoundedBase64Url(raw.installationSignature, 86, 86)) return null;
  if (typeof raw.integrityToken !== 'string' || raw.integrityToken.length < 32 || raw.integrityToken.length > 16_384) {
    return null;
  }
  if (typeof raw.purchaseToken !== 'string' || raw.purchaseToken.length < 16 || raw.purchaseToken.length > 4096) {
    return null;
  }

  return raw as Required<Omit<SubscriptionVerificationEnvelopeInput, keyof typeof Object.prototype>>;
};

export const verifyInstallationChallengeSignature = async (
  challenge: SubscriptionServerChallenge,
  envelope: SubscriptionVerificationEnvelopeInput,
): Promise<boolean> => {
  const normalized = normalizeSubscriptionVerificationEnvelope(envelope);
  if (!normalized) return false;
  if (normalized.challengeId !== challenge.challengeId) return false;
  if (normalized.installationKeyId !== challenge.installationKeyId) return false;
  if (normalized.publicKeySpki !== challenge.publicKeySpki) return false;

  const publicKey = await validateInstallationPublicIdentity(
    normalized.installationKeyId,
    normalized.publicKeySpki,
  );
  const signature = base64UrlDecode(normalized.installationSignature);
  if (!publicKey || !signature || signature.byteLength !== ES256_P1363_SIGNATURE_BYTES) return false;

  const statement = buildSubscriptionChallengeStatement(challenge.challengeId, challenge.nonce);
  try {
    return globalThis.crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      publicKey,
      signature,
      textEncoder.encode(statement),
    );
  } catch {
    return false;
  }
};

const parseExpiryMs = (value: unknown): number | null => {
  if (typeof value !== 'string') return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : null;
};

const getLineItems = (raw: unknown): GoogleSubscriptionLineItemLike[] | null => {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  return raw.every((item) => item && typeof item === 'object')
    ? (raw as GoogleSubscriptionLineItemLike[])
    : null;
};

export const deriveSubscriptionDecisionFromGoogle = (
  purchase: GoogleSubscriptionPurchaseV2Like,
  productPlanMap: Readonly<Record<string, ServerPaidPlan>>,
  nowMs = Date.now(),
): ServerSubscriptionDecision => {
  if (!purchase || typeof purchase !== 'object' || typeof purchase.subscriptionState !== 'string') {
    return { entitled: false, plan: null, lifecycleState: null, accessUntilMs: null, productId: null, reason: 'invalid-google-response' };
  }

  const lineItems = getLineItems(purchase.lineItems);
  if (!lineItems) {
    return { entitled: false, plan: null, lifecycleState: null, accessUntilMs: null, productId: null, reason: 'invalid-google-response' };
  }

  const activeMapped = lineItems
    .map((item) => ({
      productId: typeof item.productId === 'string' ? item.productId : null,
      expiryMs: parseExpiryMs(item.expiryTime),
    }))
    .filter(
      (item): item is { productId: string; expiryMs: number } =>
        item.productId !== null && item.expiryMs !== null && item.expiryMs > nowMs,
    )
    .map((item) => ({ ...item, plan: productPlanMap[item.productId] ?? null }))
    .filter((item): item is { productId: string; expiryMs: number; plan: ServerPaidPlan } => item.plan !== null);

  if (activeMapped.length === 0) {
    const anyUnexpired = lineItems.some((item) => {
      const expiry = parseExpiryMs(item.expiryTime);
      return expiry !== null && expiry > nowMs;
    });
    return {
      entitled: false,
      plan: null,
      lifecycleState: null,
      accessUntilMs: null,
      productId: null,
      reason: anyUnexpired ? 'unknown-product' : 'expired-line-item',
    };
  }

  const distinctPlans = new Set(activeMapped.map((item) => item.plan));
  const distinctProducts = new Set(activeMapped.map((item) => item.productId));
  if (distinctPlans.size !== 1 || distinctProducts.size !== 1) {
    return { entitled: false, plan: null, lifecycleState: null, accessUntilMs: null, productId: null, reason: 'ambiguous-products' };
  }

  const item = activeMapped.reduce((latest, current) =>
    current.expiryMs > latest.expiryMs ? current : latest,
  );

  switch (purchase.subscriptionState) {
    case 'SUBSCRIPTION_STATE_ACTIVE':
      return { entitled: true, plan: item.plan, lifecycleState: 'active', accessUntilMs: item.expiryMs, productId: item.productId, reason: 'verified-active' };
    case 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD':
      return { entitled: true, plan: item.plan, lifecycleState: 'grace', accessUntilMs: item.expiryMs, productId: item.productId, reason: 'verified-grace' };
    case 'SUBSCRIPTION_STATE_CANCELED':
      return { entitled: true, plan: item.plan, lifecycleState: 'active', accessUntilMs: item.expiryMs, productId: item.productId, reason: 'verified-canceled-until-expiry' };
    default:
      return { entitled: false, plan: null, lifecycleState: null, accessUntilMs: null, productId: null, reason: 'non-entitling-state' };
  }
};

export const buildSignedEntitlementPayload = (
  decision: ServerSubscriptionDecision,
  installationKeyId: string,
  assertionId: string,
  nowMs = Date.now(),
): SignedEntitlementPayload => {
  if (!decision.entitled || !decision.plan || !decision.lifecycleState || !decision.accessUntilMs) {
    throw new Error('Cannot build a paid assertion from a non-entitling Google decision');
  }
  if (!isBoundedBase64Url(installationKeyId, 32, 128)) {
    throw new Error('Invalid installation key id');
  }
  if (!isBoundedBase64Url(assertionId, 16, 128)) {
    throw new Error('Invalid assertion id');
  }

  const validUntilMs = Math.min(
    decision.accessUntilMs,
    nowMs + MAX_OFFLINE_ENTITLEMENT_WINDOW_MS,
  );
  if (validUntilMs <= nowMs) throw new Error('Entitlement has no remaining access window');

  return {
    schemaVersion: 1,
    assertionId,
    issuer: SUBSCRIPTION_ENTITLEMENT_ISSUER,
    audience: SUBSCRIPTION_ENTITLEMENT_AUDIENCE,
    packageName: SUBSCRIPTION_EXPECTED_PACKAGE_NAME,
    installationKeyId,
    plan: decision.plan,
    lifecycleState: decision.lifecycleState,
    issuedAtMs: nowMs,
    validUntilMs,
  };
};

export const signEntitlementJwsEs256 = async (
  payload: SignedEntitlementPayload,
  kid: string,
  privateJwk: JsonWebKey,
): Promise<string> => {
  if (!isBoundedBase64Url(kid, 16, 128)) throw new Error('Invalid entitlement signing key id');

  const header = { alg: 'ES256', typ: 'scrollshield-entitlement+jwt', kid };
  const encodedHeader = base64UrlEncode(textEncoder.encode(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(textEncoder.encode(JSON.stringify(payload)));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const privateKey = await globalThis.crypto.subtle.importKey(
    'jwk',
    privateJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const signature = new Uint8Array(
    await globalThis.crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      privateKey,
      textEncoder.encode(signingInput),
    ),
  );
  if (signature.byteLength !== ES256_P1363_SIGNATURE_BYTES) {
    throw new Error('Unexpected ES256 signature representation');
  }

  return `${signingInput}.${base64UrlEncode(signature)}`;
};
