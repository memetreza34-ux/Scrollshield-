import { createServer } from 'node:http';
import { URL } from 'node:url';
import {
  evaluatePlaySubscription, validPurchaseToken, safePublicEntitlement,
  obfuscatedPlayAccountId, isPlayPurchaseBoundToOwner,
} from './play-policy.mjs';
import { fingerprintPurchaseToken, GoogleCloudStore, PurchaseOwnedError, UpstreamError } from './google-cloud.mjs';
import { verifyFirebaseIdToken, verifyPubSubJwt, UnauthorizedError } from './identity.mjs';
import { issueSignedProEntitlement } from './signed-entitlement.mjs';

const jsonResponse = (response, status, value) => {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(body);
};

const noContent = (response) => {
  response.writeHead(204, { 'Cache-Control': 'no-store' });
  response.end();
};

async function readJson(request, maxBytes = 12_000) {
  if (!request.headers['content-type']?.startsWith('application/json')) {
    const err = new Error('CONTENT_TYPE');
    err.status = 415;
    throw err;
  }
  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > maxBytes) {
      const err = new Error('PAYLOAD_TOO_LARGE');
      err.status = 413;
      throw err;
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    const err = new Error('INVALID_JSON');
    err.status = 400;
    throw err;
  }
}

const bearer = (request) => {
  const value = request.headers.authorization;
  if (!value || !value.startsWith('Bearer ')) throw new UnauthorizedError();
  return value.slice(7);
};

/**
 * Pure route orchestration supports injected auth/Play/Firestore dependencies
 * for isolated tests; production uses real Google signatures and Play API.
 */
export function createHandler({
  store,
  firebaseProjectId,
  accountHmacKey,
  kmsKeyVersion,
  signMessage,
  pushAudience,
  pushEmail,
  authenticate = (token) => verifyFirebaseIdToken(token, firebaseProjectId),
  authenticatePush = (token) => verifyPubSubJwt(token, pushAudience, pushEmail),
  now = Date.now,
}) {
  if (!store || !firebaseProjectId || typeof accountHmacKey !== 'string' ||
      Buffer.byteLength(accountHmacKey, 'utf8') < 32) {
    throw new Error('Billing verifier config missing');
  }

  return async (request, response) => {
    try {
      const url = new URL(request.url, 'https://scrollshield.invalid');
      if (request.method === 'GET' && url.pathname === '/healthz') {
        // Health is not a billing authorization signal.
        return jsonResponse(response, 200, { ok: true });
      }
      if (request.method !== 'POST') return jsonResponse(response, 404, { error: 'NOT_FOUND' });

      if (url.pathname === '/v1/play/account-id') {
        const { uid } = await authenticate(bearer(request));
        if (typeof uid !== 'string' || !uid || uid.length > 128) throw new UnauthorizedError();
        return jsonResponse(response, 200, { obfuscatedAccountId: obfuscatedPlayAccountId(uid, accountHmacKey) });
      }

      if (url.pathname === '/v1/play/verify') {
        const { uid } = await authenticate(bearer(request));
        if (typeof uid !== 'string' || !uid || uid.length > 128) throw new UnauthorizedError();
        const payload = await readJson(request);
        const token = payload?.purchaseToken;
        if (!validPurchaseToken(token)) {
          return jsonResponse(response, 400, { error: 'INVALID_PURCHASE_TOKEN' });
        }

        // Verify with Google BEFORE reserving a token to avoid an unauthenticated
        // or unknown product claiming subscription ownership in Firestore.
        const play = await store.queryPlay(token);
        const entitlement = evaluatePlaySubscription(play, now(), store.productId);
        const hasExpectedProduct = play.lineItems.some((x) => x?.productId === store.productId);
        if (!hasExpectedProduct) {
          return jsonResponse(response, 403, { error: 'WRONG_PRODUCT' });
        }
        // Token possession alone is insufficient. Only purchases made with
        // this Firebase identity's server-issued Play account binding qualify.
        if (!isPlayPurchaseBoundToOwner(play, uid, accountHmacKey)) {
          return jsonResponse(response, 403, { error: 'PURCHASE_ACCOUNT_MISMATCH' });
        }

        // Upgrades / replacements may rotate purchase tokens. If an old token
        // belongs to someone else, the new token cannot silently change owner.
        if (validPurchaseToken(play.linkedPurchaseToken)) {
          const predecessor = await store.getClaim(fingerprintPurchaseToken(play.linkedPurchaseToken));
          if (predecessor && predecessor.ownerUid !== uid) throw new PurchaseOwnedError();
        }

        const hash = fingerprintPurchaseToken(token);
        await store.claimPurchase(hash, uid);
        await store.updateVerifiedStatus(hash, entitlement);
        const result = safePublicEntitlement(entitlement);
        if (entitlement.active) {
          // An unsigned client-visible "pro: true" is NEVER an entitlement.
          // No KMS key -> reject instead of issuing an unusable paid grant.
          if (!kmsKeyVersion && !signMessage) throw new UpstreamError();
          const signed = await issueSignedProEntitlement({
            uid,
            verified: entitlement,
            nowMillis: now(),
            signMessage: signMessage ?? ((message) => store.signEntitlement(message, kmsKeyVersion)),
          });
          if (!signed) throw new UpstreamError();
          result.entitlementToken = signed;
        }
        return jsonResponse(response, 200, result);
      }

      if (url.pathname === '/v1/play/rtdn') {
        if (!pushAudience || !pushEmail) return jsonResponse(response, 503, { error: 'NOT_CONFIGURED' });
        await authenticatePush(bearer(request));
        const push = await readJson(request);
        const encoded = push?.message?.data;
        if (typeof encoded !== 'string' || encoded.length > 8192) {
          return jsonResponse(response, 400, { error: 'BAD_NOTIFICATION' });
        }
        let event;
        try {
          event = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
        } catch {
          return jsonResponse(response, 400, { error: 'BAD_NOTIFICATION' });
        }
        const token = event?.subscriptionNotification?.purchaseToken;
        if (event?.packageName !== store.packageName || !validPurchaseToken(token)) {
          // Test / unrelated / voided events do not authorize anything.
          return noContent(response);
        }

        const hash = fingerprintPurchaseToken(token);
        const owned = await store.getClaim(hash);
        if (!owned) {
          // No known customer to update. A future first-party verification
          // can still claim this Play token for an authenticated UID.
          return noContent(response);
        }
        const play = await store.queryPlay(token);
        const entitlement = evaluatePlaySubscription(play, now(), store.productId);
        await store.updateVerifiedStatus(hash, entitlement);
        return noContent(response);
      }

      return jsonResponse(response, 404, { error: 'NOT_FOUND' });
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return jsonResponse(response, 401, { error: 'UNAUTHORIZED' });
      }
      if (error instanceof PurchaseOwnedError) {
        return jsonResponse(response, 409, { error: 'PURCHASE_ALREADY_LINKED' });
      }
      if (error?.status && [400, 413, 415].includes(error.status)) {
        return jsonResponse(response, error.status, { error: error.message });
      }
      // Deliberately never log purchase token, Google JSON or bearer header.
      // Upstream outages always fail closed; no cached Pro entitlement.
      if (error instanceof UpstreamError) {
        return jsonResponse(response, 503, { error: 'PLAY_VERIFICATION_UNAVAILABLE' });
      }
      return jsonResponse(response, 503, { error: 'VERIFICATION_UNAVAILABLE' });
    }
  };
}

export function createProductionServer(env = process.env) {
  const {
    GOOGLE_CLOUD_PROJECT,
    FIREBASE_PROJECT_ID,
    PUBSUB_PUSH_AUDIENCE,
    PUBSUB_PUSH_SERVICE_ACCOUNT,
    BILLING_ACCOUNT_HMAC_KEY,
    BILLING_KMS_KEY_VERSION,
  } = env;
  if (!GOOGLE_CLOUD_PROJECT || !FIREBASE_PROJECT_ID ||
      !BILLING_ACCOUNT_HMAC_KEY || BILLING_ACCOUNT_HMAC_KEY.length < 32 ||
      !BILLING_KMS_KEY_VERSION) {
    throw new Error('Missing GCP/Firebase project or BILLING_ACCOUNT_HMAC_KEY');
  }
  const store = new GoogleCloudStore({ projectId: GOOGLE_CLOUD_PROJECT });
  return createServer(createHandler({
    store,
    firebaseProjectId: FIREBASE_PROJECT_ID,
    accountHmacKey: BILLING_ACCOUNT_HMAC_KEY,
    kmsKeyVersion: BILLING_KMS_KEY_VERSION,
    pushAudience: PUBSUB_PUSH_AUDIENCE,
    pushEmail: PUBSUB_PUSH_SERVICE_ACCOUNT,
  }));
}
