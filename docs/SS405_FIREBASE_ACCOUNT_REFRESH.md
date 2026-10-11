# SS-405 — Recoverable Firebase billing identity and native grant renewal

**Status:** Stacked Draft PR, not deployed. No purchases can be initiated.
Dependencies: PR #20 → #34 → #36 → #37 → #38 → this branch.

## Scope actually implemented

- Native Firebase Android Auth using Firebase BoM **34.19.0**, main `firebase-auth`
  artifact (not deprecated Firebase Auth KTX). Firebase is initialized
  programmatically with **public** project identifiers and API key, and
  remains unavailable when settings are absent. No service-account secret,
  Google Cloud HMAC, KMS private key or purchase token in the app or JS bundle.
- Email/password registration and sign-in; email verification/resend,
  password reset, reloading verification status and sign-out from Paywall.
  Firebase owns the device's persistent refresh session. The WebView receives
  only `{configured,signedIn,verified,email}`, never ID or refresh tokens.
  Password fields are transient React component state, not AppState/backups.
- Backend Firebase JWT verification now requires `email_verified: true`
  and rejects anonymous sign-in; Play ownership stays bound to the authenticated
  Firebase UID and server-side HMAC account identity.
- Android signed entitlement validates the **current verified Firebase UID**
  via a SHA-256 subject hash in every check and installation. Logging out or
  switching users invalidates/cancels native Pro regardless of a copied signed
  token. This plugs a cross-account bearer-token replay avenue.
- Native `ScrollShieldBillingPlugin` no longer accepts a Firebase JWT from
  WebView calls. It fetches a fresh verified ID token internally before
  requesting a Play binding, eligibility preflight or restore. Only native
  Android handles raw Play purchase tokens.
- `NativePlayRefreshCoordinator` checks Google Play for owned SUBS and
  re-verifies each PURCHASED, nonsuspended subscription with Cloud Run
  every ~4 minutes (1-minute retry when verification is unavailable) while
  `AppMonitorService` runs. On a successful active result, installs a
  freshly RSA-verified, UID-bound, <=10-minute grant and notifies the service.
  When a successful listing finds no valid paid purchase, it clears Pro.
  Network errors do not extend grants: the old token expires automatically.
- React's premium feature gates now read **ephemeral, runtime-only** native
  signed Pro status on app load, every 30 seconds and on focus/visibility,
  never from persisted `state.pro.active` in release builds. A new signed
  status resyncs paid app protection rules; Android independently revalidates
  the signature in its native service. Reset/sign-out clears UI trust.
- Paywall optionally displays the Firebase account panel when native
  Firebase is configured. Purchase button remains **disabled**. Manual Play
  restoration uses native signed verification if a verified account exists.
- Privacy text differentiates local usage data from optional account,
  authentication and purchase verification metadata. **Full Play/privacy/legal
  review and server-side user deletion remain required before launch.**

## Public-only Android build configuration

Supply these only after real projects are created and validated:

```sh
cd android
./gradlew assembleDebug \
  -PscrollshieldFirebaseProjectId=YOUR_FIREBASE_PROJECT_ID \
  -PscrollshieldFirebaseAppId=YOUR_ANDROID_FIREBASE_APP_ID \
  -PscrollshieldFirebaseApiKey=YOUR_PUBLIC_FIREBASE_WEB_API_KEY \
  -PscrollshieldBillingApiUrl=https://YOUR_CLOUD_RUN_HOST \
  -PscrollshieldEntitlementPublicKeyBase64=YOUR_PUBLIC_KMS_SPKI_DER_BASE64
```

Do **not** put backend service-account credentials, Firebase JWT,
`BILLING_ACCOUNT_HMAC_KEY`, purchase receipts or private KMS keys here. The
Firebase API key is client-visible *public configuration*; apply Google's API
key restrictions and App Check abuse mitigation as part of threat review.

Enable Firebase Authentication **Email/Password** in the console, enable
email enumeration protection, configure authorized domain and verification
email templates, and check identity-provider/app policy before deploying.
Users must confirm their email before a paid entitlement can be issued.

## Important remaining blockers

1. **No Google Cloud/Play Console deployment and no actual paid purchases.**
   Checkout is deliberately blocked; native preflight is not launchBillingFlow.
2. No purchase acknowledgment, RTDN lifecycle validation at scale, automated
   payment onboarding, user account deletion, tested account recovery on a
   different device or legal-approved privacy policy yet.
3. Background refresh uses an existing Android foreground monitor: Android
   may stop the service or revoke usage permission. Without active monitoring,
   renewal is not guaranteed. A signed grant expires after at most ten minutes;
   this is **fail closed**, not a guaranteed continuous subscriber experience.
   Implement tested lifecycle/foreground resume recovery and battery/OEM
   behavior before charging users.
4. Google Play, Firebase and Cloud KMS SDK/API details need the full Gradle and
   real-device test matrix. Signed-grant correctness should be covered in
   instrumentation; no private Cloud KMS key is ever committed.
5. Billing identity persistence is managed by Firebase SDK; tests must verify
   uninstall/reinstall/second-device login and receipt ownership. Treat
   account deletion, deletion requests and refund privacy requirements as
   release blockers. App reset signs out but does not delete the Firebase
   account or Google subscription.

## Tests and gates

- `npm run verify` (Vitest + backend `node --test server/*.test.mjs`).
- `cd android && ./gradlew testDebugUnitTest assembleDebug`.
- `cd android && ./gradlew connectedDebugAndroidTest` on a physical device.
- Internal Play track: register → verify email → sign out/in → password reset
  → restore a valid purchase → TTL refresh without web UI → expiration,
  revoked purchase, pending payment, offline failure and account switching.
- Production: account recovery and deletion, exact KMS/Play/RTDN owner binding,
  full Play billing lifecycle and end-to-end GDPR/data protection review.
- CI issue [#23](https://github.com/memetreza34-ux/Scrollshield-/issues/23)
  continues blocking GitHub Actions before checkout; do not merge/release
  before full green checks and security review.

References:
- https://firebase.google.com/docs/auth/android/start
- https://firebase.google.com/docs/auth/android/manage-users
- https://developer.android.com/google/play/billing/security
