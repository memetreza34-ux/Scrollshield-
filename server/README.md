# SS-402 — Play purchase verification backend (Cloud Run prototype)

**STATUS: CODE REVIEW / NOT DEPLOYED / NOT RELEASE-READY.**
This service does not turn on Pro in the Android app. PR #34's purchase button
stays disabled. No Google Cloud project, Firebase identity integration, Play
Console subscription, or IAM deployment has been configured by this code.

## Architecture

- Runtime: Node.js 24, zero third-party server dependencies.
- Deployment target: Google Cloud Run, using its attached service account
  through the metadata server (Workload Identity / Application Default Credentials).
  **No service-account JSON/private key in git, image, APK or browser.**
- Identity: Firebase Authentication **ID token** (verified RS256 signature,
  Firebase project, issuer, audience, expiry, subject and auth time). The
  Android client must later implement sign-in/account linking before purchases.
- Product: `app.scrollshield.mobile` / `scrollshield_pro`.
- Google Play API: `purchases.subscriptionsv2.get`; product and expiry checked
  before granting. ACTIVE, IN_GRACE_PERIOD, and CANCELED **before expiry**
  permit access. Pending, paused, on-hold, expired, refunded and unknown states
  do not. Canceled does not mean instantly expired.
- Purchase ownership: server-only HMAC bound to the authenticated Firebase UID.
  The Android Play purchase flow must obtain an account binding from this
  backend and pass it to `BillingFlowParams.setObfuscatedAccountId(...)`.
  `SubscriptionPurchaseV2.externalAccountIdentifiers.obfuscatedExternalAccountId`
  must match before Firestore claims a token. Older/unbound purchases fail
  closed and need a reviewed migration.
- Firestore collection `subscriptionClaims`: one document per SHA-256 token
  fingerprint, created atomically. Immutable `ownerUid`; only the owner may
  verify/restore. **Raw purchase tokens are not stored** in Firestore.
- RTDN: authenticated Google Pub/Sub push with OIDC JWT signature, exact
  audience and allowed service-account email, then a live Play re-query;
  RTDN payload is *never* considered authoritative.
- Entitlements: a response to `POST /v1/play/verify` reflects a *live Google
  API lookup*. Firestore status is bookkeeping, **not an offline entitlement**
  to be trusted by the Android client. Native unlock integration remains open.
  Client-side flags cannot unlock Pro.

## HTTP endpoints

- `GET /healthz` — liveness only, no entitlement claim.
- `POST /v1/play/account-id` — Firebase bearer ID token; returns server
  HMAC-derived `obfuscatedAccountId` (64-character lowercase hex).
  This value is provided to Play when launching checkout.
- `POST /v1/play/verify` — Firebase bearer ID token + JSON
  `{"purchaseToken":"..."}` (max 12 KiB). Checks Play API and HMAC ownership,
  atomically links token to UID, returns only
  `{"pro":true/false,"state":"...","expiresAt":"..."/null,"source":"verified_google_play"}`.
- `POST /v1/play/rtdn` — authenticated Pub/Sub push envelope. Unknown token
  fingerprints are ignored (idempotent); known token status is refreshed from
  Play before updating Firestore. Does not create new ownership claims.

No endpoint accepts an arbitrary caller-selected UID. No unauthenticated
purchase is promoted to paid access. All write endpoints use JSON/no-store.
Request logs and Cloud Run logs **must not include Authorization headers,
receipt payloads, tokens, or identifiable Firestore document contents**.

## Configuration required (server only)

| Environment | Purpose |
| --- | --- |
| `GOOGLE_CLOUD_PROJECT` | Google Cloud project with Firestore database |
| `FIREBASE_PROJECT_ID` | Firebase Auth project whose JWT keys/audience are verified |
| `BILLING_ACCOUNT_HMAC_KEY` | **Secret Manager secret**, random >= 32 bytes, stable across redeployments |
| `PUBSUB_PUSH_AUDIENCE` | Exact configured OIDC audience for authenticated Pub/Sub push |
| `PUBSUB_PUSH_SERVICE_ACCOUNT` | Exact email of Pub/Sub push identity |
| `PORT` | Cloud Run supplies port (default 8080) |

Do not set the HMAC secret in version control, .env files, client builds or
command histories. A rotated HMAC key invalidates existing account bindings;
plan an explicit multi-key migration before rotation.

## Deploy prerequisites

1. In Google Cloud, link the Play Console developer account to the project
   and grant an **appropriate, least-privilege API service account** access
   to the intended app's subscription/order data.
2. Enable Android Publisher API and Firestore API; create the default
   Firestore (Native mode) database. Grant Cloud Run runtime service account
   least-privilege Firestore access. Deny public Firestore client writes.
3. Configure Firebase Auth (the chosen authentication method) and plan
   identity linking. Anonymous Firebase identities alone do **not** support
   reliable reinstall/second-device restore. Do not sell subscriptions
   until account recovery works.
4. Generate a high-entropy server HMAC key, store in Secret Manager, and
   provision it as Cloud Run secret `BILLING_ACCOUNT_HMAC_KEY`.
5. Build/deploy the service from `server/Dockerfile` with build context
   **`server/`**. A container image can be built using
   `docker build -f server/Dockerfile -t scrollshield-billing server`.
   Deploy with the dedicated runtime service account and required env
   variables/secrets. HTTPS-only service URL, Cloud Armor/rate limits,
   API monitoring, quotas and alerting are required.
6. Configure Pub/Sub push with authenticated delivery, exact audience and
   allowed sender account. Avoid treating Pub/Sub push request body as
   sufficient authentication; the handler verifies an OIDC JWT.
7. Integrate native Google Play checkout and Play account binding, securely
   transmit purchase tokens **directly native -> backend** over HTTPS, verify
   responses, handle retries and acknowledgements. Do not expose raw tokens to
   React state, localStorage or backups.
8. Implement server reconciliation, authoritative native entitlements,
   offline expiration, Play acknowledge after verification, RTDN retries,
   refund/revoke transitions, and migration for account ID/key rotation.
   This backend is a source-level foundation with added tests, **not yet executed or deployed** and not the final release solution.

## Local test commands

```sh
node --test server/*.test.mjs
```

These tests use offline synthetic Google API, Firestore, identity and
Pub/Sub fixtures. They do **not** exercise a real Play billing account.

## Security/release acceptance

- Every API route requires verified identity except `/healthz`.
- Incorrect product, missing Play binding, token replay under another UID,
  expired/revoked or pending purchase, lost GCP credentials and Play outage
  **fail closed**. No affirmative Pro when external checks fail.
- Play purchase tokens are not logged, stored in plain text or returned to
  the WebView. SHA-256 token hashes are identifiers, not credentials.
- Client `pro.active` is not trusted in production (parent PR #20).
- Cloud Run/Firestore IAM, Firebase identity, Pub/Sub OIDC, rate limits,
  fraud/replay/ownership model and device restore must be externally reviewed.
- End-to-end tests with real Play license accounts required before launch.

Official references:
- https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptionsv2
- https://developer.android.com/google/play/billing/security
- https://developer.android.com/google/play/billing/lifecycle/subscriptions
- https://firebase.google.com/docs/auth/admin/verify-id-tokens
- https://cloud.google.com/pubsub/docs/authenticate-push-subscriptions
