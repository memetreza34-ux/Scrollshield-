# SS-404 — Server-signed native Pro entitlement and Free boundary

**State:** Draft source code, not deployed or end-to-end verified. This is NOT permission to
enable charging. Prerequisites PR #20 → #34 → #36 → #37 remain unmerged.

## Purpose

The React state / backups / Capacitor calls are untrusted. Native
`AppMonitorService` MUST enforce Free unless Android has a **valid short-lived
server-signature**. This change implements a second independent entitlement
boundary inside the native service, even if `syncBlockedApps` is called
directly with three protected apps or paid restrictions.

## Token format

`SS1.<base64url-json>.<base64url-signature>`

- Signed bytes: literal UTF-8 `SS1.<base64url-json>`, no JSON reserialization.
- Signing: Cloud KMS **RSA_SIGN_PKCS1_2048_SHA256** or
  **RSA_SIGN_PKCS1_3072_SHA256**. RSA SHA256 PKCS#1 v1.5
  (`SHA256withRSA` in Android). **Do not choose a PSS KMS key**.
- The Cloud Run service hashes the exact signed bytes with SHA-256 and calls
  KMS `cryptoKeyVersions.asymmetricSign` using its attached workload
  identity. No private key lives in Node/Android/GitHub.
- Claims: `{v:1,aud:"app.scrollshield.mobile",sub:"<sha256(uid)>",plan:"pro",
  pro:true,iat:<epoch seconds>,exp:<epoch seconds>}`.
- Grant lifetime: **10 minutes** maximum, never after verified Play expiry.
  Android rejects grants over **15 minutes**, unknown plans, wrong audience,
  malformed claims, invalid RSA signature, expired grants, future issuance
  beyond 60 seconds and device clock rollback beyond 30 seconds from the
  last trusted high-water mark.
- Server only emits a token after Firebase authentication, live
  `purchases.subscriptionsv2.get` verification, `obfuscatedExternalAccountId`
  match, purchase ownership claim and successful KMS signature. Without a
  configured KMS version, active purchase verification fails closed.
- The signed token stays **native-only** in SharedPreferences. It is not a
  purchase receipt or Firebase JWT, and its payload contains only a hash
  derived from the UID. It is nevertheless a temporary bearer credential
  and must remain out of backups/logs and cross-account restores.

## Native enforcement

`NativeProEntitlement.install(...)` verifies the pinned public SPKI and
expiration before synchronously writing the signed token and timestamp.
`AppMonitorService.loadRules()` validates the same token again and calls
`NativeFreeRules.project(..., signedPro)`. If no trusted grant is active:

- Only the **first two distinct supported apps** survive, with package-to-app
  identity determined from Android's built-in allow-list, not from a
  user-controlled `appId`. Multiple packages of one supported app share one
  slot; unknown packages are rejected.
- Forced safe Free presets (soft or standard); advanced strict modes,
  daily budgets and Session Guard fields are removed.
- Free emergency access restored (2 × 5 minutes) even after importing a
  no-exit Pro backup.
- Only one distinct time window is allowed, and it can apply to both
  protected apps. Free focus is limited to an hour from sync time.
- Legacy JSON arrays containing plain package strings are also downgraded.
- The service checks expiration while polling, then reprojects to Free
  and removes stale overlays; malformed saved JSON cannot retain old Pro
  restrictions.
- Explicit `clearVerifiedPro()` for future logout/account switching,
  plus `getNativeProStatus()` (status only; no JS-provided entitlement).
- A rollback high-water timestamp helps defend against manually rolling
  back the wall clock. **Not a tamper-proof secure time source**; rooted
  devices/modified APKs are out of the local-only trust boundary.

The current React paid feature gates remain disabled in production until
actual **recoverable Firebase login**, account re-linking and
signed-entitlement refresh are implemented. Thus this PR is
**necessary but not sufficient** for a functional subscriber experience.

## Cloud KMS provisioning requirements

1. Create a Cloud KMS **ASYMMETRIC_SIGN** key using
   `RSA_SIGN_PKCS1_2048_SHA256` in the project's chosen key ring/location.
   Never download private key material.
2. Add IAM permission `cloudkms.cryptoKeyVersions.useToSign` to the
   **backend Cloud Run service account only**.
3. Set `BILLING_KMS_KEY_VERSION` on Cloud Run to the full resource name:
   `projects/.../locations/.../keyRings/.../cryptoKeys/.../cryptoKeyVersions/1`.
4. Retrieve the **public key** from KMS
   `cryptoKeyVersions.getPublicKey`, which returns PEM SPKI.
   Extract DER SPKI and encode as standard Base64, and supply only to the
   Android release build via the nonsecret Gradle property
   `-PscrollshieldEntitlementPublicKeyBase64=...`.
   Key and algorithm must match precisely; the app fails closed otherwise.
5. The Android build must also have the HTTPS verifier URL as
   `-PscrollshieldBillingApiUrl=https://YOUR-DEPLOYED-HOST`.
   Without BOTH settings, native Pro cannot activate.
6. **Key rotation:** current app pins one KMS key version's public SPKI.
   Plan a staged multi-key/kid migration before changing the Cloud KMS
   active signer, and test users on old app versions.
7. Never include `BILLING_ACCOUNT_HMAC_KEY` or any service account
   secret/private key in Gradle properties, the mobile app, Git, logs or
   exported backups. The HMAC key belongs in Google Secret Manager.

## Testing and release blockers

- `node --test server/*.test.mjs` includes signed RSA grant checks,
  tampered payload, expiry caps, KMS digest and unavailable signing.
- Android instrumentation
  `NativeProEntitlementInstrumentedTest`: generates temporary RSA keypairs
  at test time, verifies sign/expiry/wrong-key/rollback and Free rule
  projection including legacy rules and shared schedule. No private key
  is committed.
- Run `npm run verify`, `cd android && ./gradlew testDebugUnitTest
  connectedDebugAndroidTest assembleDebug`, and real Google Play internal
  track+Cloud Run/KMS key tests **after CI is repaired**.
- No live purchase flow, acknowledgment, recoverable Firebase login or
  automatic background refresh. Because grants last 10 minutes,
  **subscribers would be downgraded after 10 minutes without a refresh**.
  Implement secure native/background refresh, RTDN/renewal handling and
  token revocation response before taking money.
- A valid signed token on a device is short-lived and temporarily bearer-like;
  an explicit device binding/Play Integrity policy may be warranted after
  threat-model review. This does not protect rooted/tampered APKs.
- Do NOT advertise subscription entitlements, show working checkout or
  deploy paying users until code review, green CI, API/Play license-testing,
  authenticated ownership, restoration and the whole refund lifecycle pass.

Docs: [Cloud KMS asymmetricSign](https://docs.cloud.google.com/kms/docs/reference/rest/v1/projects.locations.keyRings.cryptoKeys.cryptoKeyVersions/asymmetricSign);
[Google Play subscription verification](https://developer.android.com/google/play/billing/security).
