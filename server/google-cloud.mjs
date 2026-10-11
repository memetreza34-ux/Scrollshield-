import { createHash } from 'node:crypto';
import { PLAY_PACKAGE, PLAY_PRODUCT } from './play-policy.mjs';

export class UpstreamError extends Error {
  constructor(message = 'External service unavailable') {
    super(message);
    this.name = 'UpstreamError';
  }
}
export class PurchaseOwnedError extends Error {
  constructor() {
    super('Purchase is already linked to another identity');
    this.name = 'PurchaseOwnedError';
  }
}

const timeout = (ms) => AbortSignal.timeout(ms);

const firestoreField = (value) =>
  typeof value === 'boolean' ? { booleanValue: value } :
  typeof value === 'number' ? { integerValue: String(Math.trunc(value)) } :
  { stringValue: String(value) };

export function fingerprintPurchaseToken(token) {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export class GoogleCloudStore {
  constructor({ projectId, packageName = PLAY_PACKAGE, productId = PLAY_PRODUCT,
    fetchImpl = fetch, metadataBase = 'http://metadata.google.internal/computeMetadata/v1' }) {
    if (!projectId || !packageName || !productId) throw new Error('Server configuration missing');
    this.projectId = projectId;
    this.packageName = packageName;
    this.productId = productId;
    this.fetchImpl = fetchImpl;
    this.metadataBase = metadataBase;
    this.cachedToken = null;
  }

  /** Cloud Run Workload Identity token, not service-account JSON in the APK. */
  async accessToken() {
    if (this.cachedToken && Date.now() + 60_000 < this.cachedToken.expiresAt) {
      return this.cachedToken.value;
    }
    let response;
    try {
      response = await this.fetchImpl(
        `${this.metadataBase}/instance/service-accounts/default/token`,
        { headers: { 'Metadata-Flavor': 'Google' }, signal: timeout(6000) },
      );
    } catch {
      throw new UpstreamError();
    }
    if (!response.ok) throw new UpstreamError();
    const parsed = await response.json();
    if (typeof parsed.access_token !== 'string' || !parsed.access_token) throw new UpstreamError();
    this.cachedToken = {
      value: parsed.access_token,
      expiresAt: Date.now() + Math.max(1, Number(parsed.expires_in) || 300) * 1000,
    };
    return parsed.access_token;
  }

  async googleFetch(url, { method = 'GET', body } = {}) {
    const token = await this.accessToken();
    let response;
    try {
      response = await this.fetchImpl(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: timeout(9000),
      });
    } catch {
      throw new UpstreamError();
    }
    return response;
  }

  /**
   * KMS RSA_SIGN_PKCS1_2048_SHA256 or RSA_SIGN_PKCS1_3072_SHA256.
   * Grant runtime identity only cloudkms.cryptoKeyVersions.useToSign.
   * Private key never enters server memory, repository or Android binary.
   */
  async signEntitlement(message, kmsVersionName) {
    const namePattern = /^projects\/[a-z0-9-]+\/locations\/[a-z0-9-]+\/keyRings\/[A-Za-z0-9_-]+\/cryptoKeys\/[A-Za-z0-9_-]+\/cryptoKeyVersions\/[0-9]+$/;
    if (!namePattern.test(kmsVersionName ?? '') || !Buffer.isBuffer(message) || message.length > 2048) {
      throw new UpstreamError();
    }
    const digest = createHash('sha256').update(message).digest('base64');
    const response = await this.googleFetch(
      `https://cloudkms.googleapis.com/v1/${kmsVersionName}:asymmetricSign`,
      { method: 'POST', body: { digest: { sha256: digest } } },
    );
    if (!response.ok) throw new UpstreamError();
    const data = await response.json();
    if (data.name !== kmsVersionName || typeof data.signature !== 'string') throw new UpstreamError();
    const signature = Buffer.from(data.signature, 'base64');
    if (signature.length < 256 || signature.length > 512) throw new UpstreamError();
    return signature;
  }

  async queryPlay(token) {
    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(this.packageName)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(token)}`;
    const response = await this.googleFetch(url);
    // Never treat an unsuccessful Play response as any kind of paid access.
    if (!response.ok) throw new UpstreamError();
    const result = await response.json();
    if (!result || typeof result !== 'object' || !Array.isArray(result.lineItems)) {
      throw new UpstreamError();
    }
    return result;
  }

  claimUrl(hash) {
    return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(this.projectId)}/databases/(default)/documents/subscriptionClaims/${hash}`;
  }

  async getClaim(hash) {
    const response = await this.googleFetch(this.claimUrl(hash));
    if (response.status === 404) return null;
    if (!response.ok) throw new UpstreamError();
    const value = await response.json();
    return {
      ownerUid: value?.fields?.ownerUid?.stringValue,
      productId: value?.fields?.productId?.stringValue,
    };
  }

  /**
   * Firestore createDocument(documentId=SHA256(token)) is atomic:
   * first verifier wins. On 409 re-read the immutable owner; a second UID
   * cannot restore by copying the same purchase token.
   */
  async claimPurchase(hash, uid) {
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(this.projectId)}/databases/(default)/documents/subscriptionClaims?documentId=${hash}`;
    const response = await this.googleFetch(url, {
      method: 'POST',
      body: {
        fields: {
          ownerUid: firestoreField(uid),
          productId: firestoreField(this.productId),
          createdAt: firestoreField(new Date().toISOString()),
          state: firestoreField('UNVERIFIED'),
        },
      },
    });
    if (response.ok) return;
    if (response.status !== 409) throw new UpstreamError();
    const existing = await this.getClaim(hash);
    if (!existing || existing.ownerUid !== uid || existing.productId !== this.productId) {
      throw new PurchaseOwnedError();
    }
  }

  async updateVerifiedStatus(hash, entitlement) {
    const url = new URL(this.claimUrl(hash));
    // Change only status metadata; never overwrite immutable ownership fields.
    for (const key of ['state', 'active', 'expiryEpochMs', 'verifiedAt']) {
      url.searchParams.append('updateMask.fieldPaths', key);
    }
    const response = await this.googleFetch(url.toString(), {
      method: 'PATCH',
      body: {
        fields: {
          state: firestoreField(entitlement.state),
          active: firestoreField(entitlement.active),
          expiryEpochMs: firestoreField(entitlement.expiryEpochMs ?? 0),
          verifiedAt: firestoreField(new Date().toISOString()),
        },
      },
    });
    if (!response.ok) throw new UpstreamError();
  }
}
