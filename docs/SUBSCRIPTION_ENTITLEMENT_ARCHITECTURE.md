# ScrollShield Subscription Entitlement Architecture

Status: **SOURCE CONTRACT / NOT RELEASE EVIDENCE**

This document defines the security boundary between Google Play purchase data and ScrollShield paid entitlements.

It does **not** mean Plus/Max purchases are live. Checkout remains blocked by `docs/SUBSCRIPTION_RELEASE_GATE.md`.

## Current source implementation

Current source components:

```text
android/app/build.gradle
  → Google Play Billing Library 9.1.0
  → Play Integrity Library 1.6.0

ScrollShieldBillingPlugin.java
  → connect to Google Play Billing
  → query current subscription purchases
  → include suspended subscriptions
  → surface purchase token/state for secure verification
  → never grant entitlement
  → no launchBillingFlow()
  → no acknowledgePurchase()

ScrollShieldIntegrityPlugin.java
  → accepts only a backend-issued bounded base64url nonce
  → requests a Play Integrity token for that exact nonce
  → returns the token as opaque transport
  → never decodes verdicts or decides entitlement locally

ScrollShieldSubscriptionIdentityPlugin.java
  → creates one P-256 key in Android Keystore
  → private key is non-exportable
  → keyId = SHA-256(public SPKI)
  → signs the canonical backend challenge with SHA256withECDSA
  → key possession alone never grants Plus/Max

src/lib/nativeBilling.ts
  → normalizes Play purchase records
  → malformed query/result → no usable purchase record
  → purchase record is NOT entitlement

src/lib/nativeIntegrity.ts
  → validates only challenge/token transport shape
  → never decodes Integrity verdicts

src/lib/subscriptionInstallationIdentity.ts
  → canonical challenge statement:
     scrollshield-subscription-v1:<challengeId>:<nonce>
  → exposes public key/keyId and native signature only

src/config/subscriptionTrust.ts
  → pins backend issuer/audience/package
  → contains only release-controlled public verification keys
  → currently empty and therefore fail-closed

src/lib/subscriptionEntitlementSignature.ts
  → verifies compact ES256 JWS
  → requires trusted kid + correct issuer/audience/package
  → requires exact current installationKeyId
  → only this boundary may create cryptographicallyVerified=true

src/lib/subscriptionEntitlementPolicy.ts
  → only cryptographically verified backend assertion can become Plus/Max
  → pending/expired/revoked/unknown → Free
  → bounded offline assertion window
  → safe downgrade planning without destructive mutation
```

None of these source contracts are proof that Play Billing, Play Integrity or backend verification has executed successfully.

## Trust model

Untrusted inputs include:

```text
localStorage
SharedPreferences
query parameters
React state
raw Google Play purchase callbacks
raw queryPurchasesAsync() results
raw Play Integrity tokens
locally editable plan strings
cached JSON without signature verification
```

These inputs may identify a purchase or verification attempt. They may **not** directly authorize Plus or Max.

The intended trust chain is:

```text
Google Play purchase token
+
backend one-time challenge
+
Play Integrity token bound to challenge nonce
+
Android-Keystore installation-key signature over canonical challenge
        ↓
secure ScrollShield backend
        ↓
consume challenge exactly once
verify installation public-key fingerprint + ES256 challenge signature
server-side Play Integrity decode and verdict checks
Google Play Developer API purchases.subscriptionsv2.get
server-side lifecycle / product / replay / replacement-token checks
        ↓
signed ES256 bounded entitlement assertion
        ↓
client verifies trusted kid + signature + issuer + audience + package + installationKeyId
        ↓
subscriptionEntitlementPolicy
        ↓
effective Free / Plus / Max
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

## Play Integrity is additional evidence, not entitlement

Play Integrity is used only for high-value subscription verification/restore operations, not every protection tick.

The client uses a **server-issued one-time nonce**. It never creates the authoritative challenge itself and never decodes the returned token.

The backend must verify at minimum:

```text
request nonce == unused server challenge nonce
package == app.scrollshield.mobile
app integrity == PLAY_RECOGNIZED
Play licensing == LICENSED
device verdict contains MEETS_DEVICE_INTEGRITY
```

Optional stronger/risk verdicts may be used later, but changing enforcement requires separate device compatibility evidence. Integrity failure must not break Free safety or user-owned data access.

## Installation identity

Every Android installation receives a P-256 signing key under the versioned alias:

```text
scrollshield_subscription_identity_v1
```

The private key lives in Android Keystore and is never exported.

The public identity is:

```text
keyId = base64url(SHA-256(publicKeySpki))
publicKeySpki = base64url(X.509 SubjectPublicKeyInfo)
algorithm = ES256
```

For verification, the app signs exactly:

```text
scrollshield-subscription-v1:<challengeId>:<nonce>
```

This proves possession of the installation private key. It does **not** prove a paid subscription by itself.

## Signed backend assertion contract

The backend eventually returns a compact JWS:

```text
alg = ES256
typ = scrollshield-entitlement+jwt
kid = release-controlled signing key id
```

Payload contract:

```text
schemaVersion = 1
assertionId
issuer = scrollshield-subscription-backend
audience = app.scrollshield.mobile/subscription
packageName = app.scrollshield.mobile
installationKeyId
plan = free | plus | max
lifecycleState = active | grace | pending | expired | revoked | unknown
issuedAtMs
validUntilMs
```

The client must reject:

- malformed compact JWS;
- non-ES256 algorithm;
- unknown `kid`;
- invalid signature;
- wrong issuer/audience/package;
- assertion bound to another installation key;
- invalid/expired/overlong time windows.

Only after successful JWS verification may the client construct a candidate with:

```text
cryptographicallyVerified = true
```

The production public-key trust list currently remains empty. Therefore the current build is fail-closed to Free even if an attacker supplies a syntactically valid assertion.

## Fail-closed lifecycle policy

Paid access is possible only when all conditions are true:

```text
schemaVersion valid
AND plan is plus/max
AND backend assertion signature verified
AND exact installation binding verified
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

The previous durable configuration remains untouched until the user selects a valid set and the replacement configuration can be committed atomically.

After explicit valid selection:

```text
selected app(s) become the requested active set
all other configured apps remain stored as paused/read-only data
no rule/history/profile deletion
```

## Why acknowledgement is not in the client bridge yet

Google Play requires eligible completed purchases to be acknowledged, but ScrollShield intentionally does not expose client acknowledgement in the current bridge.

Target release flow:

```text
PURCHASED purchase token
→ backend verifies challenge + installation + Integrity + Play subscription + replay state
→ backend records entitlement transaction
→ backend acknowledges eligible initial subscription purchase
→ backend returns signed bounded entitlement assertion
```

A client-only acknowledgement path would make it easier to acknowledge a purchase before the secure entitlement transaction is complete.

## Restore behavior

Current native source can query subscription purchases, including suspended subscriptions.

Future restore flow:

```text
querySubscriptionPurchases()
→ backend creates one-time challenge
→ installation signs challenge + requests Play Integrity token
→ backend verifies purchaseToken and installation proof
→ explicit restore/rebind policy if token is already bound to another installation key
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
- installation rebind/restore with explicit policy;
- RTDN delivery and retry/idempotency;
- Google Play Developer API reconciliation after missed events.

Use current Google Play `purchases.subscriptionsv2` lifecycle APIs rather than deprecated subscription endpoints for new implementation work.

## Source guards

Required checks:

```text
npm run check:subscription-safety
npm run check:subscription-integrity
```

They must fail if source loses any of these boundaries:

```text
Free=1 / Plus=3 / Max=unlimited
Always-Free safety/data ownership
72-hour bounded offline entitlement assertion
backend signature verification required before paid access
pending/expired/revoked/unknown → Free
no silent downgrade selection
Google Play Billing 9.1.0
Play Integrity 1.6.0
queryPurchasesAsync(SUBS) includes suspended subscriptions
server-issued Integrity nonce
Integrity token remains opaque on client
non-exportable Android-Keystore P-256 installation identity
canonical signed challenge statement
trusted ES256 backend assertion bound to installation key
raw Play purchase != entitlement
no launchBillingFlow while release gate is blocked
no client acknowledgePurchase before backend verification design is complete
```

## Evidence boundary

Not yet proven until executed on the exact candidate:

- TypeScript/Vitest checks;
- `check:subscription-safety`;
- `check:subscription-integrity`;
- Android compilation with Billing 9.1.0 + Integrity 1.6.0;
- Android Keystore identity creation/signing;
- Billing service connection;
- subscription query on Play-installed build;
- Play Integrity token request/decode;
- license-tester purchase;
- pending purchase;
- suspended subscription query;
- restore after reinstall/device change;
- backend challenge/replay protection;
- Google Play subscriptionsv2 verification;
- backend signed assertion + client verification;
- RTDN processing;
- acknowledgement;
- refund/revocation;
- 72-hour offline behavior;
- Free/Plus/Max upgrade and downgrade flows.

Until that evidence exists, PR #8 remains Draft and paid checkout remains disabled.
