import { createPublicKey, verify as verifySignature } from 'node:crypto';

const FIREBASE_JWKS = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const GOOGLE_OIDC_JWKS = 'https://www.googleapis.com/oauth2/v3/certs';

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

const parsePart = (part) => {
  try {
    return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
  } catch {
    throw new UnauthorizedError();
  }
};

const requireString = (value) => typeof value === 'string' && value.length > 0;

export async function verifyJwt(token, { issuer, audience, jwksUrl, fetchImpl = fetch, now = Date.now() }) {
  if (!requireString(token) || token.length > 8192) throw new UnauthorizedError();
  const parts = token.split('.');
  if (parts.length !== 3) throw new UnauthorizedError();
  const [h, p, signature] = parts;
  const header = parsePart(h);
  const payload = parsePart(p);

  if (header.alg !== 'RS256' || !requireString(header.kid) ||
      (header.typ !== undefined && header.typ !== 'JWT') ||
      !requireString(payload.sub) || !requireString(payload.iss) ||
      !requireString(payload.aud) || payload.iss !== issuer || payload.aud !== audience ||
      !Number.isFinite(payload.exp) || !Number.isFinite(payload.iat) ||
      payload.iat * 1000 > now + 60_000 || payload.exp * 1000 <= now) {
    throw new UnauthorizedError();
  }

  let response;
  try {
    response = await fetchImpl(jwksUrl, { signal: AbortSignal.timeout(6000) });
  } catch {
    // A failed key lookup must NEVER authorize a signed-looking local token.
    throw new UnauthorizedError();
  }
  if (!response.ok) throw new UnauthorizedError();
  const data = await response.json();
  if (!Array.isArray(data.keys)) throw new UnauthorizedError();
  const key = data.keys.find((entry) => entry.kid === header.kid &&
    entry.kty === 'RSA' && entry.use === 'sig' && entry.alg === 'RS256');
  if (!key) throw new UnauthorizedError();

  try {
    const publicKey = createPublicKey({ key, format: 'jwk' });
    const valid = verifySignature('RSA-SHA256', Buffer.from(h + '.' + p),
      publicKey, Buffer.from(signature, 'base64url'));
    if (!valid) throw new UnauthorizedError();
  } catch {
    throw new UnauthorizedError();
  }
  return payload;
}

/**
 * Firebase Auth anonymous users are still authentic identities (UIDs), not
 * client-supplied device IDs. Restoring purchases on a second device requires
 * an explicit linked/sign-in identity before payments may ship.
 */
export async function verifyFirebaseIdToken(token, projectId, opts = {}) {
  if (!requireString(projectId)) throw new UnauthorizedError();
  const payload = await verifyJwt(token, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
    jwksUrl: FIREBASE_JWKS,
    ...opts,
  });
  if (payload.sub.length > 128 || !Number.isFinite(payload.auth_time) ||
      payload.auth_time * 1000 > (opts.now ?? Date.now()) + 60_000) throw new UnauthorizedError();
  return { uid: payload.sub };
}

/** Google Pub/Sub authenticated push (OIDC) needs issuer, audience and email. */
export async function verifyPubSubJwt(token, audience, serviceAccountEmail, opts = {}) {
  if (!requireString(audience) || !requireString(serviceAccountEmail)) throw new UnauthorizedError();
  const payload = await verifyJwt(token, {
    issuer: 'https://accounts.google.com',
    audience,
    jwksUrl: GOOGLE_OIDC_JWKS,
    ...opts,
  });
  if (payload.email !== serviceAccountEmail || payload.email_verified !== true) {
    throw new UnauthorizedError();
  }
  return payload;
}
