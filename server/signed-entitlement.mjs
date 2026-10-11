import { createHash } from 'node:crypto';

const AUDIENCE = 'app.scrollshield.mobile';
const TTL_SECONDS = 10 * 60;
const PREFIX = 'SS1';

/**
 * Signed grants are SHORT-LIVED and only issued after verifying purchase,
 * identity, Play obfuscatedAccountId and immutable token ownership.
 * Node never possesses the private key: signMessage uses Google Cloud KMS.
 */
export async function issueSignedProEntitlement({ uid, verified, nowMillis = Date.now(), signMessage }) {
  if (typeof uid !== 'string' || uid.length < 1 || uid.length > 128 ||
      verified?.active !== true || !Number.isFinite(verified.expiryEpochMs) ||
      verified.expiryEpochMs <= nowMillis ||
      typeof signMessage !== 'function') {
    return null;
  }
  const iat = Math.floor(nowMillis / 1000);
  const exp = Math.min(Math.floor(verified.expiryEpochMs / 1000), iat + TTL_SECONDS);
  if (exp <= iat) return null;
  const sub = createHash('sha256').update('scrollshield-uid-v1:' + uid).digest('hex');
  const payload = { v: 1, aud: AUDIENCE, sub, plan: 'pro', pro: true, iat, exp };
  const message = PREFIX + '.' + Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = await signMessage(Buffer.from(message, 'utf8'));
  if (!Buffer.isBuffer(signature) || signature.length < 128 || signature.length > 1024) {
    throw new Error('KMS signature unavailable');
  }
  return message + '.' + signature.toString('base64url');
}

export function parseEntitlementForTestingOnly(token) {
  const parts = token?.split('.');
  if (parts?.length !== 3 || parts[0] !== PREFIX) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}
