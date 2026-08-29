# ScrollShield Subscription Backend Security

Status: **SOURCE / BACKEND CONTRACT — NOT DEPLOYED, NOT RELEASE EVIDENCE**

This document defines the server-side protocol required before ScrollShield can sell Plus or Max.

The existing connected Supabase project is not a ScrollShield backend and must not be reused accidentally. A dedicated ScrollShield project/environment is required before deployment.

## Security objective

A stolen or copied single artifact must not be sufficient to obtain paid access.

None of these are sufficient alone:

```text
purchaseToken
Play purchaseState = PURCHASED
Play Integrity token
installation public key
installation challenge signature
cached entitlement JSON
```

Paid access requires the complete current server-verified chain.

## End-to-end verification protocol

### Phase 1 — installation identity

The Android client creates a P-256 signing key in Android Keystore.

Client may expose only:

```text
installationKeyId = base64url(SHA-256(publicKeySpki))
publicKeySpki
algorithm = ES256
```

The private key never leaves Android Keystore.

### Phase 2 — backend challenge

Client requests a verification challenge and supplies:

```text
installationKeyId
publicKeySpki
```

Backend must first verify:

```text
installationKeyId == base64url(SHA-256(publicKeySpki))
public key parses as P-256 SubjectPublicKeyInfo
```

Backend then creates cryptographically random challenge data:

```text
challengeId
nonce >= 128 bits random entropy, base64url without padding
issuedAt
expiresAt <= issuedAt + 5 minutes
```

Challenge is bound to `installationKeyId` and stored server-side. The client never chooses the authoritative nonce.

### Phase 3 — client proof

For that exact challenge, Android produces:

```text
Play Integrity token for nonce
+
ES256 installation signature over:
scrollshield-subscription-v1:<challengeId>:<nonce>
+
Google Play subscription purchaseToken from read-only Billing query
```

The verification request must **not** contain an authoritative requested plan. The server derives the plan only from Google Play product/base-plan data.

### Phase 4 — atomic challenge ownership

Before expensive external verification, backend atomically transitions the challenge from:

```text
unused → verifying
```

Only one request may win this transition.

A challenge in `verifying`, `consumed` or expired state cannot be replayed.

If external verification later fails or times out, that challenge remains unusable. The client requests a fresh challenge for retry.

### Phase 5 — installation signature

Backend reconstructs the exact canonical statement and verifies the ES256 signature against `publicKeySpki` stored on the challenge.

It must reject:

- keyId/public-key mismatch;
- malformed/non-P-256 key;
- invalid signature;
- signature over any different challenge ID or nonce.

### Phase 6 — Play Integrity

Integrity token is decoded and verified **server-side** through Google Play. No verdict is trusted from the client.

Minimum subscription-verification policy:

```text
request nonce == challenge nonce
packageName == app.scrollshield.mobile
appIntegrity == PLAY_RECOGNIZED
account/licensing == LICENSED
deviceRecognitionVerdict contains MEETS_DEVICE_INTEGRITY
```

Do not require optional stronger verdicts such as `MEETS_STRONG_INTEGRITY` globally until real compatibility evidence exists. Security policy can become stricter later, but must not silently lock legitimate users out without tested fallback behavior.

Integrity failure must never remove Free safety, data export, migration or recovery capabilities.

### Phase 7 — Google Play subscription verification

Backend calls the current Android Publisher endpoint:

```text
purchases.subscriptionsv2.get(
  packageName = app.scrollshield.mobile,
  token = purchaseToken
)
```

Server must use the authoritative response, not client product IDs, order IDs or purchase state.

Evaluate at minimum:

```text
subscriptionState
acknowledgementState
lineItems[].productId
lineItems[].expiryTime
linkedPurchaseToken
externalAccountIdentifiers if deliberately configured later
```

Do not use deprecated `latestOrderId` as entitlement identity.

### Phase 8 — lifecycle mapping

The exact mapping must be locked by backend tests against current Google semantics before production.

Security intent:

```text
ACTIVE                       → paid entitlement allowed until verified expiry
IN_GRACE_PERIOD              → lifecycle = grace, bounded assertion allowed
CANCELED but not yet expired → access may continue only until authoritative line-item expiry
PENDING                      → no paid entitlement
ON_HOLD                      → no paid entitlement
PAUSED                       → no paid entitlement unless a separately reviewed policy proves otherwise
EXPIRED                      → no paid entitlement
UNSPECIFIED/unknown          → no paid entitlement
revoked/voided               → no paid entitlement
```

Unknown future Google states fail closed.

### Phase 9 — product-to-plan mapping

Backend configuration owns the mapping from verified Google Play products/base plans to:

```text
plus
max
```

The client must never submit `plan=max` as an authoritative input.

Unknown product IDs fail closed to Free/no assertion.

### Phase 10 — purchase token replay/binding

Never store a raw purchase token in analytics/audit logs.

Store a keyed server-side identifier or SHA-256 token hash for replay/idempotency tracking. Raw token may exist only transiently where required to call Google.

A purchase token is bound to an installation key according to explicit policy.

If the same token appears from a different `installationKeyId`, backend must **not** silently rebind it. Reinstall/new-device restore requires a separate reviewed rebind flow with fresh Integrity, purchase verification and rate/abuse controls.

`linkedPurchaseToken` from Google must be handled for upgrade/downgrade/replacement chains so old tokens cannot create parallel entitlements.

### Phase 11 — acknowledgement transaction

Client currently cannot acknowledge purchases.

For an eligible initial purchase requiring acknowledgement, backend sequence is:

```text
challenge + installation proof verified
→ Play Integrity verified
→ subscriptionsv2 verified
→ replay/binding transaction persisted
→ eligible purchase acknowledged server-side
→ signed entitlement assertion issued
```

Acknowledgement must be idempotent. A failed transaction must never manufacture local entitlement.

### Phase 12 — signed bounded entitlement

Backend signs a compact ES256 JWS with a release-controlled key that never ships in the app.

Header:

```json
{
  "alg": "ES256",
  "typ": "scrollshield-entitlement+jwt",
  "kid": "<active signing key id>"
}
```

Payload:

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

For paid assertions:

```text
validUntilMs - issuedAtMs <= 72 hours
validUntilMs <= authoritative paid-access expiry when that expiry is sooner
```

Client verifies signature and installation binding before `cryptographicallyVerified=true` can reach the entitlement policy.

## RTDN and reconciliation

Real-time Developer Notifications are signals, not a complete source of truth.

Each RTDN handler must:

1. verify/decode the Pub/Sub message using the configured trusted channel;
2. deduplicate event/message IDs;
3. extract purchase token/package data;
4. re-query Google Play `purchases.subscriptionsv2.get`;
5. update authoritative lifecycle state transactionally;
6. never trust the RTDN payload as the sole entitlement state.

Periodic reconciliation must re-query active/recent subscriptions so a missed RTDN cannot leave indefinite access.

## Supabase deployment model

A dedicated ScrollShield Supabase project is required before deployment.

Recommended server design:

```text
private schema
  subscription_challenges
  subscription_purchase_bindings
  subscription_entitlement_audit

Edge Functions
  subscription-challenge
  verify-play-subscription
  google-play-rtdn
  subscription-reconcile (scheduled/service-only)
```

Sensitive tables must not be directly exposed to client Data API access.

Server credentials only:

```text
Google service-account / workload credential
entitlement-signing private key
Supabase secret/service-role credentials where needed
RTDN verification configuration
```

No server secret may be committed to GitHub or shipped in the React/Android client.

## Abuse controls

Before paid release:

- challenge TTL <= 5 minutes;
- challenge one-time state transition;
- per-IP and per-installation challenge rate limit;
- verification rate limit;
- bounded payload/token sizes;
- timeout external Google calls;
- no secrets in errors/logs;
- hash/redact purchase tokens;
- audit suspicious rebind attempts;
- distinguish retriable infrastructure errors from entitlement denial;
- generic client-facing failure messages where detail would help attackers.

## Required test matrix

Backend tests must prove at minimum:

- reused challenge rejected;
- expired challenge rejected;
- keyId/public-key mismatch rejected;
- invalid installation signature rejected;
- Integrity nonce mismatch rejected;
- wrong package rejected;
- unrecognized app rejected;
- unlicensed account rejected;
- insufficient device integrity rejected;
- pending subscription rejected;
- on-hold/paused/expired/unknown rejected;
- active and grace mapped correctly;
- canceled-but-still-valid handled only until verified expiry;
- unknown product rejected;
- purchase token replay is idempotent for same installation;
- cross-installation replay does not silently rebind;
- linked replacement token cannot create duplicate access;
- assertion window never exceeds 72 hours;
- assertion installationKeyId is exact;
- signing-key rotation supports previous valid assertions for their bounded lifetime;
- RTDN duplicate delivery is idempotent;
- missed RTDN is repaired by reconciliation.

## Evidence boundary

This file is an architecture contract only.

No backend project, schema, Edge Function, Google service account, Integrity server decode, Publisher API call, RTDN subscription, signing private key or production assertion has been deployed/proven yet.
