# ScrollShield Competitive Product Strategy

Research snapshot: 2026-08-29

This document is a product-planning reference, not store copy and not evidence that an unimplemented feature exists. Pricing and competitor features can change and must be rechecked before any commercial launch.

## Product Goal

ScrollShield should earn paid plans by providing materially stronger capacity, automation and commitment depth, not by hiding basic safety, privacy or data ownership behind a paywall.

The product promise for version one remains whole-app protection on supported Android targets. Reels-/Shorts-only detection and multiple-login-account protection inside one Android package must not be marketed until exact technical behavior is implemented and validated.

## Current Competitor Pattern

| Product   | Free / entry value                                     | Paid-value pattern                                                            | Strategic lesson for ScrollShield                                                                              |
| --------- | ------------------------------------------------------ | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| one sec   | One-app breathing interruption                         | Unlimited apps plus additional intervention/automation features.              | A permanent one-app Free tier is commercially credible when paid tiers add real capacity and depth.            |
| Jomo      | Limited sessions/actions/budgets and reports           | More sessions/actions, Strict Mode, additional budgets and advanced controls. | Paid value can scale control depth without making the free product useless.                                    |
| Freedom   | Basic blocking                                         | Scheduling, recurring/advance sessions, Locked Mode and longer sessions.      | Automation and commitment are stronger premium value than merely raising a daily-minute cap.                   |
| AppBlock  | Limited Quick Block/schedules/Strict Mode/statistics   | More/unlimited controls, anti-bypass depth and advanced statistics.           | Stronger rule depth and anti-bypass workflows are subscription-grade value.                                    |
| ScreenZen | Broad free blocking/delay/limit/schedule functionality | Donation-supported core rather than a normal software subscription.           | Basic delays/limits alone are not enough to justify ScrollShield Max.                                          |
| Opal      | Focus rules/timers/progress feedback                   | More rules, advanced timers and stronger automation.                          | Polished automation and measurable progress increase paid value, but pricing should follow proven reliability. |

## Sources Used for This Snapshot

- https://one-sec.app/de/faq/
- https://web.one-sec.app/store
- https://jomo.so/pricing
- https://support.freedom.to/en/articles/13764747-what-s-included-in-free-and-premium-plans
- https://freedom.to/premium
- https://appblock.app/premium/
- https://appblock.app/help/android/strict-mode/
- https://screenzen.co/
- https://opal.so/

Revalidate all source pages and in-store prices immediately before pricing decisions or public comparisons.

## Approved Three-Tier Direction

The current technical engine protects supported Android **apps/packages**, not separate login accounts inside one package.

Therefore the approved source model is:

```text
Free → 1 protected app
Plus → up to 3 protected apps
Max  → unlimited supported protected apps
```

Additional planned capacity:

| Capability                |   Free |    Plus |       Max |
| ------------------------- | -----: | ------: | --------: |
| Profiles                  |      1 |       3 | Unlimited |
| Recurring schedules       |      1 |       5 | Unlimited |
| Local insight window      | 7 days | 30 days |   90 days |
| Advanced schedules        |      — |     Yes |       Yes |
| Advanced Anti-Binge       |      — |     Yes |       Yes |
| Custom emergency friction |      — |     Yes |       Yes |
| Advanced Commitment Mode  |      — |       — |       Yes |
| Adaptive Friction         |      — |       — |       Yes |
| Profile automation        |      — |       — |       Yes |

`Unlimited` means no subscription-count limit inside technically supported targets. It does not mean every app/platform/account is supported.

## ScrollShield Free Principles

The following must remain available without a paid entitlement because they are core trust, safety, or data-ownership functions:

- protection for one supported app;
- basic intentional-opening delay;
- basic session/daily limits;
- visible foreground-service notification and direct stop action;
- permission transparency and actual service-health status;
- a safe emergency path instead of trapping a user behind a block;
- local-only privacy controls;
- V0.7 migration and raw-data recovery;
- export/import of user-owned data and legacy archive;
- reset and uninstall guidance;
- enough recent history to understand whether protection works.

No subscription expiry may delete configurations, history, statistics, exports, migration archives or recovery data.

Free receives the same underlying reliability/safety engine. Paid plans buy capacity and advanced behavior, not fewer safety guarantees.

## Plus Value Target

Plus is the practical multi-app tier:

1. Up to 3 protected apps.
2. Up to 3 profiles.
3. Up to 5 recurring schedules.
4. 30-day local insights.
5. Advanced recurring schedule controls.
6. Advanced Anti-Binge controls.
7. Configurable emergency friction while the basic emergency path remains Free.

## Max Value Target

Max is the power-user commitment/automation tier:

1. Unlimited supported protected apps.
2. Unlimited profiles and recurring schedules.
3. 90-day local insights.
4. Everything in Plus.
5. Advanced Commitment Mode / rule-edit lock workflows with a documented safe exit.
6. Adaptive Friction.
7. Profile automation.
8. Future accountability/cross-device features only after separate privacy/security design and real implementation.

## Current Subscription Security Direction

Paid authorization is deliberately separate from plan capacity.

Current source contracts:

```text
src/lib/subscriptionPlanPolicy.ts
→ capacity/features only
→ no boolean paid-entitlement shortcut

src/lib/subscriptionEntitlementPolicy.ts
→ single effective entitlement resolver
→ cryptographic verification required
→ active/grace only
→ pending/expired/revoked/unknown → Free
→ bounded 72-hour offline assertion window

ScrollShieldBillingPlugin.java + src/lib/nativeBilling.ts
→ Google Play Billing 9.1.0 read-only purchase/status query
→ includes suspended subscriptions
→ raw Play purchase != entitlement
→ no launchBillingFlow() while release gate is blocked
→ no client acknowledgePurchase() before secure backend transaction exists
```

Detailed security contract: `docs/SUBSCRIPTION_ENTITLEMENT_ARCHITECTURE.md`.

## Secure Downgrade Product Rule

Downgrade must not delete or silently rewrite user configuration.

If a new verified plan limit is below the currently active app count:

```text
no silent winner selection
no rule/profile/history deletion
previous durable configuration stays untouched
→ user explicitly chooses the allowed active set
→ replacement configuration commits atomically
→ other configs remain paused/read-only
```

This UX is a release requirement, not merely a preference.

## Pricing Hypothesis — Not Final

Do not publish pricing until Play Billing, secure backend verification, restore behavior, entitlement signature verification, expiry behavior and a real paid feature set are implemented and tested.

Current internal hypothesis:

| Plan |     Monthly |       Annual |
| ---- | ----------: | -----------: |
| Free |          €0 |           €0 |
| Plus | about €2.99 | about €19.99 |
| Max  | about €4.99 | about €29.99 |

This intentionally keeps entry pricing competitive while product reliability and paid depth are still being proven.

## Subscription Engineering Requirements

No production paywall should ship until all of these exist:

- supported/current Google Play Billing integration;
- product/base-plan IDs from release configuration;
- secure backend purchase-token verification via Google Play Developer API;
- RTDN/subscription lifecycle processing;
- cryptographically verifiable bounded entitlement assertions;
- one typed effective entitlement state;
- purchase acknowledgement only after secure processing;
- reliable restore flow;
- bounded offline behavior;
- deterministic non-destructive downgrade behavior;
- no accidental paid unlock when billing/network/backend calls fail;
- purchase, pending, renewal, cancellation, suspension, refund, restore, replay and account-change test cases;
- clear pricing/trial disclosure and subscription-management link;
- privacy review for billing/account metadata.

## Priority Roadmap

### P0 — Reliability before monetization

- get `npm run verify`, Android JUnit and `assembleDebug` running successfully;
- complete real Android lifecycle/device evidence;
- validate migration and recovery on physical upgrade paths;
- remove or disable UI behavior that is not truly enforced.

### P1 — Subscription security foundation

Source-side foundation now includes:

- three-plan capacity policy;
- single fail-closed entitlement policy;
- 72-hour bounded offline assertion rule;
- explicit non-destructive downgrade planner;
- Play Billing 9.1.0 read-only current-purchase query;
- pending/suspended diagnostics;
- subscription source guard.

Still required as real implementation/evidence:

- backend purchase-token verification;
- signed assertion verifier in the app;
- RTDN lifecycle processing;
- secure acknowledgement;
- license-tester device evidence.

### P2 — Paid lifecycle

- configure Plus/Max products/base plans in Play Console;
- implement secure purchase launch only after backend is ready;
- purchase/restore/manage flows;
- upgrade/downgrade/replacement-token handling;
- offline assertion refresh;
- refund/revocation/suspension handling;
- explicit downgrade-selection UX.

### P3 — High-value paid differentiators

- commitment cooldown before weakening strict rules;
- Adaptive Friction;
- richer local progress insights;
- optional trusted-person approval after privacy review;
- cross-device only after privacy-preserving sync architecture exists.

## Release Rule

A feature may appear in a paid comparison table only when it is implemented, tested on the exact candidate build, included in release documentation and not contradicted by platform limitations.

A roadmap/source-contract feature is never automatically a store-listing feature.

A roadmap feature is never a store-listing feature. Store claims require separate release evidence and approval.
