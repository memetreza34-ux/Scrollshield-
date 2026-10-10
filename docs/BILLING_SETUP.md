# SS-401 — Google Play Billing rollout (Android V1)

**Status:** Read-only Play Billing transport is implemented in this branch; purchase launch,
verification, acknowledgment and paid entitlements are **NOT live**. Do not sell a plan
or advertise fully working subscriptions until every gate below is completed.

## Source-of-truth

- Google Play Billing Library: `com.android.billingclient:billing:9.1.0`
  (9.1.0 released 2026-06-18; confirm compatibility before release).
- Native Capacitor plugin: `ScrollShieldBilling`, registered in `MainActivity.java`.
- TypeScript read-only interface: `src/lib/billing.ts`.
- Product ID in native code: **`scrollshield_pro`** (subscription, not INAPP).
- Base plans: **`monthly`** and **`annual`**. Configure both in Play Console.
- A 7-day trial on the annual plan is an **optional Play Console offer**,
  not a hardcoded benefit. Only display it when Play returns an eligible offer.
- Planning targets were €3.99/month and €24.99/year, **not promises**.
  Localized prices, phases, currencies and eligibility come from Google Play.

## What exists

1. `getCatalog()` queries real product details and displays returned billing
   phases, including free trial phases when eligible. An unfetched subscription
   leaves the paywall without a price; it does not fabricate a price.
2. `getPurchaseOverview()` requests current subscription purchase observations,
   including suspended subscriptions, but returns only anonymized status and
   acknowledgment indicators. It **does not return purchase tokens** to React
   or mark any account as Pro.
3. React's purchase action stays **disabled**. Existing local `pro.active`
   remains only a development preview, ignored in production by `hasPro()`.
4. The existing Free native protection boundary in PR #20 is unchanged:
   unverified status cannot bypass the 2-app/1-schedule limit.

## Mandatory next technical work before selling

1. Create the subscription and base plans in **Google Play Console** with
   accurate country-specific prices, subscription policy disclosures and
   optional trial offer. Install an app build from a Play testing track.
2. Deploy a protected verification backend (service credentials **only on the
   server**, never in the APK, JavaScript bundle or GitHub repo). Authenticate
   requests appropriately for the chosen account/anonymous device model.
   With a local-first app, design purchase ownership and multi-device restore
   explicitly rather than using localStorage as proof.
3. On a new Play purchase, send its token over HTTPS **directly from native
   code to the verification backend**. Verify using Google Play Developer API
   `purchases.subscriptionsv2.get`, package name, expected product, state,
   expiry, linked tokens and replay/ownership protections.
4. Persist an authoritative server-side subscription record and implement
   RTDN (Real-time Developer Notifications) to reconcile renewals, refunds,
   pauses, grace period, account hold, expiration and pending cancellations.
   Query the API again on notification rather than trusting RTDN as authority.
5. Only a **server-verified** active or eligible grace-period entitlement
   may unlock Pro; protect the **native enforcement boundary**, not just a
   front-end toggle. Plan the precise offline/grace policy and expiration.
6. Acknowledge only eligible PURCHASED transactions after verification, within
   Google Play's required deadline. Do not acknowledge PENDING transactions.
7. Implement real purchase flow, restoration, manage-subscription deep links
   and user-facing states for pending, canceled, suspended, expired, offline and
   non-Play distribution. Do not enable purchase buttons before steps 2–6.
8. Test closed-track payments with license testers: purchase, trial,
   renewal, restore, cancel, refund/revoke, hold, pending-to-purchased,
   purchases on a second device, clock manipulation and reinstall.
9. Complete privacy notice (purchase tokens, backend, retention and support)
   and policy review before Play publication.

## Release gates

- `npm run verify` green on the final merged SHA.
- `cd android && ./gradlew testDebugUnitTest assembleDebug` green.
- Real Play internal/closed testing with real product IDs, paid sandbox flows,
  backend logs and lifecycle verification.
- No imported/edited `pro.active` or `purchased_unverified` client value
  can unlock native Pro without an authoritative verified entitlement.
- No personal purchase tokens, raw receipts or server secrets logged to the
  browser, persisted with app configuration or exposed in public bug reports.

## Source references (review again before release)

- https://developer.android.com/google/play/billing/integrate
- https://developer.android.com/google/play/billing/release-notes
- https://developer.android.com/google/play/billing/security
- https://developer.android.com/google/play/billing/lifecycle/subscriptions
- https://developer.android.com/google/play/billing/migrate-gpblv9

**Note:** Google Play Billing cannot authenticate or validate an entire
subscription lifecycle by itself. Client receipts and acknowledged flags are
not equivalent to server-verified, currently entitled Pro access.
