# ScrollShield Subscription Backend Schema Contract

Status: **PLANNED PRIVATE SCHEMA / NOT DEPLOYED**

This is the database contract for the dedicated ScrollShield backend. It is intentionally **not** a migration file yet because no dedicated ScrollShield Supabase project has been selected/created and tested.

When the backend project exists, schema changes must be applied/tested there first and then converted into normal project migration history using the current Supabase workflow.

## Schema boundary

Use a non-exposed schema:

```text
private
```

Subscription security tables must not be directly available through the browser/client Data API.

The mobile app talks only to controlled Edge Functions / backend endpoints.

## `private.subscription_challenges`

Purpose: one-time server challenges for Play Integrity + Android-Keystore installation proof.

Required logical columns:

| Field | Contract |
| --- | --- |
| `id` | UUID primary key / challenge ID |
| `nonce_hash` | SHA-256 of server random nonce, unique |
| `installation_key_id` | base64url SHA-256 fingerprint of SPKI |
| `public_key_spki` | validated P-256 public SPKI; not secret |
| `state` | `unused | verifying | consumed | failed` |
| `issued_at` | server timestamp |
| `expires_at` | server timestamp, <= issued + 5 minutes |
| `verifying_at` | nullable |
| `consumed_at` | nullable |
| `request_fingerprint` | optional keyed/rate-limit fingerprint, privacy-reviewed |

Invariants:

```text
nonce_hash unique
expires_at > issued_at
expires_at <= issued_at + 5 minutes
unused → verifying is atomic and one-way
verifying → consumed/failed
consumed/failed cannot return to unused
```

Raw nonce does not need long-term storage. If implementation needs it until verification, encrypt or retain only for the minimum challenge TTL and remove/redact after use. Prefer recomputing/validating against a securely stored short-lived representation rather than permanent plaintext retention.

## `private.subscription_installations`

Purpose: known installation public identities and controlled restore/rebind history.

Required logical columns:

| Field | Contract |
| --- | --- |
| `installation_key_id` | primary key |
| `public_key_spki` | exact P-256 public key |
| `first_seen_at` | server timestamp |
| `last_verified_at` | nullable |
| `status` | `active | blocked | retired` |
| `rebind_count` | abuse/risk signal |

Do not store Android private keys or any client-exportable secret.

## `private.subscription_purchase_bindings`

Purpose: purchase-token replay/idempotency and installation binding.

Required logical columns:

| Field | Contract |
| --- | --- |
| `purchase_token_hash` | primary key; SHA-256 or keyed hash of Play token |
| `installation_key_id` | FK/logical reference to installation |
| `product_id` | verified Google product ID |
| `plan` | derived `plus | max` only |
| `google_subscription_state` | last authoritative subscriptionsv2 state |
| `acknowledgement_state` | last authoritative state |
| `access_expiry_at` | derived from authoritative line item(s) |
| `linked_purchase_token_hash` | nullable replacement-chain pointer |
| `first_verified_at` | server timestamp |
| `last_verified_at` | server timestamp |
| `revoked_at` | nullable |

Rules:

- raw purchase token is not an analytics key and must not appear in logs;
- same token + same installation is idempotent;
- same token + different installation never silently rebinds;
- linked/replacement tokens are reconciled as one subscription evolution, not parallel paid identities;
- plan comes only from verified server product mapping.

## `private.subscription_entitlements`

Purpose: latest server truth used for assertion issuance/reconciliation.

Required logical columns:

| Field | Contract |
| --- | --- |
| `installation_key_id` | key / installation binding |
| `plan` | `free | plus | max` |
| `lifecycle_state` | normalized server lifecycle |
| `source_purchase_token_hash` | nullable for Free |
| `access_until` | authoritative max paid-access time |
| `updated_at` | server timestamp |
| `version` | monotonic concurrency/version field |

This table is server truth, but the client still requires a valid signed assertion before using Plus/Max offline.

## `private.subscription_entitlement_audit`

Purpose: security/lifecycle audit without exposing raw sensitive purchase material.

Recommended fields:

```text
id
created_at
installation_key_id
purchase_token_hash (nullable)
event_type
previous_plan / new_plan
previous_lifecycle / new_lifecycle
google_event_id_hash (nullable)
reason_code
request_correlation_id
```

Do not write:

- raw purchase tokens;
- Google service-account credentials;
- Integrity tokens;
- entitlement signing private key;
- full client headers/auth tokens.

## `private.google_play_rtdn_events`

Purpose: duplicate-safe RTDN processing.

Recommended fields:

```text
message_id primary key
received_at
processed_at nullable
status = received | processing | processed | failed
package_name
purchase_token_hash nullable
notification_type nullable
attempt_count
last_error_code nullable
```

RTDN payload does not directly change entitlement. Processing re-queries Google Play first.

## Atomic operations required

Implementation must provide transaction-safe operations equivalent to:

### Claim challenge

```text
UPDATE challenge
SET state='verifying', verifying_at=now()
WHERE id=?
  AND installation_key_id=?
  AND state='unused'
  AND expires_at > now()
RETURNING ...
```

Exactly one concurrent caller may succeed.

### Bind purchase token

For new token:

```text
insert token hash + installation key
```

For existing token:

```text
same installation → idempotent reconciliation
other installation → reject/rebind workflow required
```

### Apply authoritative lifecycle

Google subscription state + line-item expiry + replacement token are written in one transaction together with the normalized entitlement transition and audit record.

### Consume RTDN message

`message_id` uniqueness makes repeated Pub/Sub delivery idempotent.

## Permissions

Preferred model:

- tables live in `private`, not exposed client schemas;
- browser/mobile roles receive **no direct table grants**;
- Edge Functions use server credentials only where privileged DB access is required;
- do not expose service-role/secret keys to the app;
- any future privileged SQL function must be outside exposed schemas, have explicit `search_path`, explicit caller checks, and no default PUBLIC execute privilege.

## Retention

Suggested starting policy, to be revalidated with privacy/legal requirements:

- challenges: purge expired/consumed challenge detail quickly; retain only minimal abuse/audit metadata;
- Integrity tokens: do not persist after verification unless a short diagnostic retention has a documented necessity;
- raw purchase tokens: avoid durable storage where feasible; use hash for identity/replay and retrieve raw token only from current request/secure lifecycle channel when Google API calls require it;
- audit rows: bounded retention with no raw tokens/secrets;
- revoked/expired binding hashes: retain only as long as needed for replay/fraud/reconciliation/legal obligations.

## Migration gate

Do not invent/apply a production migration from this document alone.

Before schema deployment:

1. dedicated ScrollShield Supabase project selected/created;
2. current Supabase docs/changelog rechecked;
3. schema iterated with `execute_sql` on that project;
4. security + performance advisors run;
5. access tested from anon/authenticated roles to prove private tables are not exposed;
6. clean migration generated/pulled using current Supabase workflow;
7. migration committed only after verification.
