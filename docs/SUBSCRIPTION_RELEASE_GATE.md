# ScrollShield Subscription Release Gate

Status: **BLOCKED / architecture gate only**

This document is an engineering release gate. It is not store copy and it does not mean a paid plan is currently available.

Detailed entitlement/source architecture: `docs/SUBSCRIPTION_ENTITLEMENT_ARCHITECTURE.md`.

## Product principle

ScrollShield monetization must never weaken the safety contract.

A paid plan buys **capacity, automation, commitment depth and richer local insight**. It must not buy basic safety, truthful diagnostics, recovery or ownership of user data.

The current Android engine protects **whole supported Android apps/packages**. It does not reliably distinguish multiple login accounts inside the same app. Therefore plan limits are defined as **protected apps**, not social-media login accounts. Store copy must not claim per-account protection until that behavior genuinely exists and is verified.

The following remain available independently of a paid entitlement:

- reliable basic protection for at least one supported app;
- intentional-opening delay;
- basic session and daily limits;
- visible foreground-service notification and direct stop action;
- permission transparency and truthful native service-health status;
- a safe return-home action from the Android protection overlay;
- a bounded emergency path instead of trapping the user;
- local migration and recovery of existing ScrollShield/V0.7 data;
- export/import and local reset;
- privacy disclosures and diagnostics;
- access to existing configurations, history, statistics and exports after downgrade.

No billing/network failure may make the protection engine less safe than the effective verified entitlement and last confirmed local protection state require.

## Three-plan architecture

This is the planned product boundary. It is **not yet a live paywall**.

The typed source contract lives in:

```text
src/lib/subscriptionPlanPolicy.ts
```

### ScrollShield Free

Capacity:

```text
1 protected app
1 profile
1 recurring schedule
7-day local insight window
```

Included safety/core value:

- whole-app protection for one supported app;
- opening delay;
- basic session and daily limits;
- basic strict protection behavior already required for reliable enforcement;
- safe emergency path;
- permission/service diagnostics;
- migration/recovery;
- export/import;
- privacy/support/reset functions.

Free must remain genuinely useful and advertisement-free under the current product strategy. It is the permanent fallback whenever paid entitlement cannot be securely verified.

### ScrollShield Plus

Capacity:

```text
up to 3 protected apps
up to 3 profiles
up to 5 recurring schedules
30-day local insights
```

Planned paid value, only after each feature is implemented and verified:

- advanced recurring schedule controls;
- richer local insights;
- advanced Anti-Binge controls;
- configurable emergency friction such as optional countdown/reason behavior;
- all Free safety/data-ownership functions.

### ScrollShield Max

Capacity:

```text
unlimited supported protected apps
unlimited profiles
unlimited recurring schedules
90-day local insight window
```

Planned premium value, only after each feature is implemented and verified:

- everything in Plus;
- advanced Commitment Mode / rule-edit lock workflows with a documented safe exit;
- Adaptive Friction;
- profile automation;
- the deepest locally computed behavior insights offered by the release;
- future accountability/cross-device features only after their separate privacy/security design and real implementation are complete.

`unlimited` means all technically supported apps/configurations within product/platform limits. It must never be marketed as support for apps or account-level behavior the engine cannot actually identify.

## Safety boundary across every plan

These functions must never become paid-only:

```text
safe return-home / stop path
bounded emergency access
permission transparency
service-health diagnostics
migration and data rescue
export/import of user-owned data
privacy disclosures
reset/uninstall guidance
```

Do not paywall data rescue, diagnostics, basic safety exits or the ability to export user-owned data.

The quality of the Android start/stop/config durability engine is identical across plans. A Free user must not receive a deliberately weaker or less reliable protection implementation.

## Entitlement fail-closed rule

Plan capacity and paid authorization are deliberately separate.

`src/lib/subscriptionPlanPolicy.ts` defines capacity only. Effective paid access is resolved exclusively by:

```text
src/lib/subscriptionEntitlementPolicy.ts
```

There is deliberately no boolean `purchaseVerified` shortcut in the plan policy.

The effective entitlement rule is:

```text
missing / malformed / unverified / pending / expired / revoked / unknown
→ ScrollShield Free
```

Plus/Max requires an active/grace backend assertion whose cryptographic verification succeeded and whose validity window is acceptable.

Current bounded offline source policy:

```text
maximum assertion issue-to-validity window = 72 hours
```

A user-editable local flag, raw Play purchase state, query parameter, localStorage value or SharedPreferences value must never permanently unlock Plus or Max.

The source-level policy is covered by:

```text
src/lib/subscriptionPlanPolicy.test.ts
src/lib/subscriptionEntitlementPolicy.test.ts
scripts/check-subscription-safety.ts
```

This policy is not proof that backend signature verification is implemented or executed.

## Current Google Play Billing source boundary

The Android source currently includes Google Play Billing Library **9.1.0** and a deliberately read-only Capacitor bridge:

```text
ScrollShieldBillingPlugin.java
src/lib/nativeBilling.ts
```

Current allowed behavior:

```text
connect to Google Play Billing
query current SUBS purchases
include suspended subscriptions
preserve purchased / pending / suspended diagnostics
return purchaseToken for secure backend verification
```

Current intentionally blocked behavior:

```text
no production launchBillingFlow()
no client acknowledgePurchase()
no local Plus/Max grant from Play purchase state
```

A `PURCHASED` Play record is still **not** an entitlement. Its purchase token must first cross the secure backend verification boundary.

## Billing implementation gate

Do not add a production purchase button, price, trial countdown, `Plus active` or `Max active` badge until every item below is complete on the exact release candidate.

### 1. Google Play Billing client

- maintained Google Play Billing integration exists;
- product/base-plan identifiers come from release configuration, not demo constants;
- purchases are acknowledged correctly after secure processing;
- `PENDING` never grants Plus/Max;
- cancelled, expired, suspended, refunded and revoked states are represented explicitly;
- plan upgrades/downgrades are handled deterministically.

### 2. Secure backend entitlement verification

Because subscription security is a release priority, paid entitlement must not rely only on a modifiable client-side state.

Required architecture before paid release:

```text
Google Play purchase token
→ secure backend verification with Google Play Developer API
→ server-side lifecycle/fraud checks
→ cryptographically verifiable bounded entitlement assertion
→ client-side signature verification
→ effective entitlement state
```

The backend must also support subscription lifecycle updates through Google Play Real-time Developer Notifications or an equivalently reliable server-side lifecycle mechanism.

Requirements:

- verify purchase/subscription state server-side before granting durable paid entitlement;
- never grant paid entitlement for `PENDING`;
- acknowledge eligible new purchase tokens only after secure processing;
- handle cancellation, expiry, suspension, refund, revocation and chargeback;
- prevent replay/duplicate purchase-token misuse;
- do not use `orderId` as the sole entitlement identity;
- billing/backend outage fails safely without corrupting protection data.

### 3. Entitlement source of truth

- one typed entitlement state is used by every premium gate;
- `free | plus | max` is the only plan set;
- local cache may support the bounded offline window, but cannot permanently manufacture paid access;
- malformed/unverified state resolves to Free;
- expiry/downgrade never deletes user-owned rules, history, statistics, exports, migration archives or recovery data.

### 4. Restore and reinstall

- `Restore purchases` works after reinstall and on another eligible device using the same Play account;
- restore is based on current Play purchase query + backend verification, not a local paid flag;
- restore is idempotent;
- restore cannot duplicate local rules/data;
- failed restore remains truthful and does not silently unlock paid access.

### 5. Offline and failure behavior

- previously verified paid entitlement has the currently bounded 72-hour assertion window unless this policy is deliberately revised;
- temporary network/backend failure during valid grace must not instantly destroy a user's configured protection state;
- expired assertion falls back to Free unless a new valid assertion is obtained;
- verified expiry/revocation must eventually downgrade deterministically;
- Free safety, export, migration and recovery remain available even when billing/backend is unavailable;
- protection service continues to use a valid local rule set instead of crashing because billing is unavailable.

### 6. Secure downgrade behavior

Downgrade must preserve data and avoid surprise destructive edits.

Required principles:

- never delete rules/profiles/history because a plan expires;
- preserve configuration data beyond the new limit as read-only/paused data until the user upgrades or chooses what remains active;
- communicate which apps remain protected before any verified entitlement downgrade changes active capacity;
- do not silently choose different protected apps in the background;
- if active apps exceed the new limit and no valid explicit selection exists, leave the previous durable configuration untouched until replacement can be committed atomically;
- a temporary verification outage is not the same as a verified subscription expiry;
- verified refund/revocation may remove paid entitlement, but must not remove user-owned historical data.

The exact active-app selection UX must be implemented and device-tested before plan enforcement ships.

### 7. Testing evidence

At minimum:

- Free launch with no billing account;
- Billing 9.1.0 Android compilation;
- Play Billing connection/disconnect/reconnect;
- Plus purchase with license tester;
- Max purchase with license tester;
- Plus → Max upgrade;
- Max → Plus downgrade;
- Plus/Max → Free expiry;
- pending purchase;
- cancelled purchase;
- suspended subscription query;
- refund/revocation;
- restore after reinstall;
- restore on another eligible device;
- replay/duplicate purchase callback/token;
- backend unavailable;
- Play unavailable;
- airplane-mode launch with previously verified entitlement;
- malformed/local-tampered cached plan → Free unless valid cryptographically verified grace applies;
- 72-hour assertion expiry boundary;
- downgrade with more configured apps than the lower plan permits, proving no data deletion and no silent unsafe app selection.

### 8. Store/legal readiness

- final price and period match Play Console exactly;
- trial terms, if any, match Play configuration exactly;
- cancellation/management path is clear;
- privacy policy describes billing/backend metadata truthfully;
- store screenshots show only features actually included in the reviewed build.

## Internal pricing hypothesis — not a release claim

Competitor research supports a useful Free tier and paid value in capacity/automation rather than basic blocking.

A reasonable internal starting hypothesis for testing is:

| Plan | Monthly hypothesis | Annual hypothesis |
| ---- | -----------------: | ----------------: |
| Free |                 €0 |                €0 |
| Plus |        about €2.99 |      about €19.99 |
| Max  |        about €4.99 |      about €29.99 |

These numbers are **not production prices**. Final prices must be decided only after the paid feature set, billing costs, taxes/store fees, retention data and current competitor pricing are revalidated.

## Current release decision

Until the billing/backend gate above is complete, ScrollShield remains a non-subscription release candidate.

The app may contain internal plan-policy, entitlement-policy and read-only Billing query code, but production UI must not offer checkout, trials, paid-status claims or hard-coded prices yet.
