# SS-403 — Android Play verification and restore preparation

**Status:** coded, not deployed or device-tested. This PR intentionally DOES NOT
launch purchases, acknowledge them, store receipt tokens, or enable Pro.
Checkout remains disabled in the Paywall. Existing native Free limits remain
in effect, even if the backend returns a verified-active observation.

## Dependencies

The PR is stacked: main → #20 entitlement fail-closed foundation → #34
read-only Google Play Billing 9.1 catalog → #36 server verification → this PR.

The service in #36 is not deployed. Firebase Authentication and recoverable
user accounts are not yet connected to the Android app. No test purchase should
be attempted until the entire grant/restore/acknowledgment chain is ready.

## New native operations

Capacitor plugin `ScrollShieldBilling` (still separate from the monitoring
plugin) has three preparatory operations in addition to existing catalog:

| Operation | Input | Behavior / output |
| --- | --- | --- |
| `getVerificationReadiness()` | none | Indicates whether a release-controlled HTTPS endpoint was compiled |
| `getVerifiedAccountBinding()` | transient Firebase ID token | POST to `/v1/play/account-id`, returns a 64-hex HMAC account ID for future `setObfuscatedAccountId` |
| `verifyExistingPurchases()` | transient Firebase ID token | Query Google Play for owned subscriptions, skip pending/suspended, POST each PURCHASED token **directly native → server**, return only counts. **proActivated=false** |
| `prepareVerifiedCheckout()` | transient Firebase ID token, `monthly`/`annual`, optional offer ID | Validate identity with backend, re-query currently eligible Play offers, return readiness but **checkoutEnabled=false** |

The bridge does not return a purchase token, signature or Play receipt to
JavaScript. The Firebase ID token is transient in memory, supplied by the
eventual Firebase sign-in component; do not persist it to app backups or
localStorage. Google Play product and offer information is public metadata,
not an entitlement.

**Build configuration**: set the **nonsecret** Gradle property
`scrollshieldBillingApiUrl` to a trusted `https://your-cloud-run-host`.
Leave it undefined before backend deployment. Empty means verification
functions immediately reject with `BILLING_NOT_CONFIGURED`. HTTP,
custom paths, ports, credentials and redirects are rejected intentionally.
No Android manifest `usesCleartextTraffic` bypass is introduced. The HTTPS
host is baked into BuildConfig; it must be an approved release setting.

Example when a secured environment actually exists:

```sh
cd android
./gradlew assembleDebug -PscrollshieldBillingApiUrl=https://YOUR-TRUSTED-CLOUD-RUN-HOST
```

This example sets a **public URL only**, never a Firebase token, service
account private key, purchase token, or Secret Manager HMAC.

## Important security behavior

1. No Firebase token or HTTPS endpoint → no verification.
2. Return values from the backend and user-provided JavaScript are **never**
   mapped into `AppState.pro.active`, `hasPro`, Android rule sync, or any
   native Pro feature; **the native monitor still enforces Free**.
3. PENDING/SUSPENDED never count as active. Even PURCHASED is merely an
   observation until the Google API verification succeeds.
4. A failed Play/Cloud Run query counts as a verification failure and does
   not grant Pro, even when the local Billing SDK says PURCHASED.
5. No subscription purchase is acknowledged because this PR does **not grant
   entitlement**. A real purchase flow requires timely confirmation **after
   granting**, or Google Play automatically refunds unacknowledged purchases.
6. In production the future purchase flow MUST query fresh ProductDetails,
   pass its chosen eligible offerToken to `launchBillingFlow`, and set the
   backend-provided `obfuscatedAccountId`. A stale cached offer is unsafe.
7. Identity/account recovery, server authority for native paid rules,
   expiry/offline TTL, refunds, RTDN, Play acknowledgment and restoration on
   another device are still the **release blockers**.

## Verification plan

- JVM: `NativeBillingPolicyTest` (HTTPS, identity, pricing selectors,
  obfuscated account binding, tokens and response shape).
- TypeScript: `src/lib/billing.test.ts` browser Free fallback.
- Android: `cd android && ./gradlew testDebugUnitTest assembleDebug`.
- Node backend: `node --test server/*.test.mjs` and `npm run verify`.
- Real internal Play testing: available prices/eligibility, pending purchase,
  canceled-but-valid, paused/hold, refund, re-sign-in, reinstall and second
  device after native entitlement integration is implemented.

### Next required release work

Implement a secure, recoverable Firebase Auth identity and account linking;
server-authoritative, native-verifiable and short-lived paid entitlements
(including offline expiry); buy/restore/acknowledge transactional flow with
fresh offer tokens; refunds/RTDN reconciliation; on-device tests. Only then
make the Paywall buy button actionable. Final UI/brand work remains separate.

Google reference:
https://developer.android.com/google/play/billing/integrate
https://developer.android.com/reference/com/android/billingclient/api/Purchase
