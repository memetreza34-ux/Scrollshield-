# ScrollShield Subscription Entitlement Architecture

Status: **SOURCE CONTRACT / NOT RELEASE EVIDENCE**

This document defines the security boundary between Google Play purchase data and ScrollShield paid entitlements.

It does **not** mean Plus/Max purchases are live. Checkout remains blocked by `docs/SUBSCRIPTION_RELEASE_GATE.md`.

## Current source implementation

Current source components:

```text
android/app/build.gradle
  → Google Play Billing Library 9.1.0

ScrollShieldBillingPlugin.java
  → connect to Google Play Billing
  → query current subscription purchases
  → include suspended subscriptions
  → surface purchase token/state for secure verification
  → never grant entitlement
  → no launchBillingFlow()
  → no acknowledgePurchase()

src/lib/nativeBilling.ts
  → normalize Play purchase records
  → malformed query/result → no usable purchase record
  → purchase record is NOT entitlement

src/lib/subscriptionEntitlementPolicy.ts
  → only cryptographically verified backend assertion can become Plus/Max
  → pending/expired/revoked/unknown → Free
  → bounded offline assertion window
  → safe downgrade planning without destructive mutation
```

None of these source contracts are proof that Play Billing or backend verification has executed successfully.

## Trust model

Untrusted inputs include:

```text
localStorage
SharedPreferences
query parameters
React state
raw Google Play purchase callbacks
raw queryPurchasesAsync() results
locally editable plan strings
cached JSON without cryptographic verification
```

These inputs may identify a purchase that needs verification. They may **not** directly authorize Plus or Max.

The intended trust chain is:

```text
Google Play purchase
→ purchaseToken
→ secure ScrollShield backend
→ Google Play Developer API verification
→ server-side lifecycle/fraud checks
→ cryptographically verifiable bounded entitlement assertion
→ ScrollShield entitlement policy
→ effective Free / Plus / Max
```

## Play purchase state is not entitlement state

A Play record with:

```text
purchaseState = purchased
```

still does not mean:

```text
ScrollShield Plus/Max = active
```

The purchase token must be verified server-side first.

Likewise:

```text
purchaseState = pending
```

must never grant paid access.

Suspended subscriptions are included in the native query so they are not silently omitted from restore/status processing. The backend remains responsible for interpreting the authoritative subscription lifecycle.

## Backend assertion contract

`subscriptionEntitlementPolicy.ts` currently accepts a planning shape with these required trust properties:

```text
schemaVersion = 1
plan = free | plus | max
lifecycleState = active | grace | pending | expired | revoked | unknown
cryptographicallyVerified = true
issuedAtMs
validUntilMs
```

`cryptographicallyVerified = true` is a security boundary, **not a user-editable flag**. Before paid release it must be set only by a verifier that validates a backend-signed assertion using release-controlled cryptographic material.

Until that cryptographic verifier exists and is tested, production must not feed locally persisted JSON into this field as trusted input.

## Fail-closed lifecycle policy

Paid access is possible only when all conditions are true:

```text
schemaVersion valid
AND plan is plus/max
AND cryptographic verification succeeded
AND lifecycleState is active or grace
AND issuedAt/validUntil are valid
AND assertion has not expired
AND offline assertion window is bounded
```

Otherwise:

```text
→ ScrollShield Free
```

Explicit non-entitling states:

```text
pending
expired
revoked
unknown
```

all resolve to Free.

## Bounded offline behavior

Current source policy:

```text
MAX_OFFLINE_ENTITLEMENT_WINDOW_MS = 72 hours
```

A verified assertion may authorize paid access only until its `validUntilMs`, and the assertion's total issue-to-validity window must not exceed 72 hours.

Purpose:

- short network/backend outages do not instantly destroy a user's working paid setup;
- a stale local cache cannot manufacture indefinite Plus/Max access;
- verified expiry/revocation eventually wins;
- Free safety/data-recovery functions remain available after fallback.

This 72-hour value is a deliberate security/product default and may be revised only together with the release gate, tests and backend policy.

## Downgrade capacity transition

Configured data is never deleted because entitlement changes.

Example:

```text
Max
→ 8 configured/active apps
→ verified entitlement becomes Free
→ Free limit = 1
```

The capacity planner must **not** silently pick one app.

Without a valid explicit user selection:

```text
requiresUserChoice = true
selectedActiveAppIds = []
pausedAppIds = []
```

This means the planner performs no destructive mutation. The previous durable configuration remains untouched until the user selects a valid set and the replacement configuration can be committed atomically.

After explicit valid selection:

```text
selected app(s) become the requested active set
all other configured apps remain stored as paused/read-only data
no rule/history/profile deletion
```

## Why acknowledgement is not in the client bridge yet

Google Play requires completed purchases to be acknowledged, but ScrollShield intentionally does not expose client acknowledgement in the current bridge.

Target release flow:

```text
PURCHASED purchase token
→ backend verifies purchase and replay/fraud state
→ backend records entitlement
→ backend acknowledges eligible initial subscription purchase
→ backend returns signed bounded entitlement assertion
```

A client-only acknowledgement path would make it easier to accidentally acknowledge a purchase before the secure entitlement transaction is complete.

## Restore behavior

Current native source can query subscription purchases, including suspended subscriptions.

Future restore flow:

```text
querySubscriptionPurchases()
→ for each purchaseToken
→ backend verify
→ backend returns authoritative signed entitlement assertion
→ client verifies assertion
→ entitlement policy resolves Free/Plus/Max
```

Restore must be idempotent and must not duplicate local rules, profiles, history or migration data.

## Required backend lifecycle

Before paid release, backend must process at minimum:

- initial subscription purchase;
- pending → purchased transition;
- cancellation while access remains valid;
- grace period;
- account hold/suspension;
- expiry;
- refund/revocation/chargeback;
- upgrade/downgrade/replacement purchase tokens;
- duplicate/replayed purchase tokens;
- RTDN delivery and retry/idempotency;
- Google Play Developer API reconciliation after missed events.

Use current Google Play `purchases.subscriptionsv2` lifecycle APIs rather than deprecated subscription endpoints for new implementation work.

## Source guards

`npm run check:subscription-safety` must fail if the source loses any of these boundaries:

```text
Free=1 / Plus=3 / Max=unlimited
Always-Free safety/data ownership
72-hour bounded offline entitlement assertion
cryptographic verification required before paid access
pending/expired/revoked/unknown → Free
no silent downgrade selection
Google Play Billing dependency pinned to reviewed version
queryPurchasesAsync(SUBS) includes suspended subscriptions
raw Play purchase != entitlement
no launchBillingFlow while release gate is blocked
no client acknowledgePurchase before backend verification design is complete
```

## Evidence boundary

Not yet proven until executed on the exact candidate:

- TypeScript/Vitest checks;
- `check:subscription-safety`;
- Android compilation with Billing 9.1.0;
- Billing service connection;
- subscription query on Play-installed build;
- license-tester purchase;
- pending purchase;
- suspended subscription query;
- restore after reinstall/device change;
- backend verification;
- signed assertion verification;
- RTDN processing;
- acknowledgement;
- refund/revocation;
- 72-hour offline behavior;
- Free/Plus/Max upgrade and downgrade flows.

Until that evidence exists, PR #8 remains Draft and paid checkout remains disabled.
