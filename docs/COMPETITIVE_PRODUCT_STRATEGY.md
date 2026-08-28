# ScrollShield Competitive Product Strategy

Research snapshot: **2026-08-28**

This document is a product-planning reference, not store copy and not evidence that an unimplemented feature exists. Pricing and competitor features change; recheck public/store pricing immediately before commercial launch.

## Product goal

ScrollShield should earn payment through **capacity, automation, commitment depth and richer local insight**, not by hiding basic safety, privacy or user-owned data behind a paywall.

The v1 protection promise remains whole-app protection on technically supported Android targets. The current engine does **not** reliably distinguish separate login accounts inside the same Android app, so plan limits must be described as protected apps, not social-media accounts.

## Current competitor pattern

| Product | Free / entry value | Paid-value pattern | Strategic lesson for ScrollShield |
| --- | --- | --- | --- |
| one sec | Free targets one app. | Pro unlocks unlimited apps plus broader interventions, intentional switching, tracking and other advanced features. German FAQ currently lists €3.99 monthly, €14.99 annually and €99.99 lifetime, with regional variation. | The user's requested `1 app free → more apps paid` structure is proven and easy to understand. |
| Jomo | Free includes one session, one action/limit, one screen-time budget and reports. | Current annual plan lists $29.99 and adds more sessions/actions, Strict Mode, multiple budgets and deeper controls. | Middle-tier value can be capacity + advanced controls rather than an all-or-nothing Pro wall. |
| Freedom | Free includes app/site blocking, custom blocklists and core focus tools. | Premium adds recurring/advance scheduling, Locked Mode and longer sessions; current public annual price is $39.99. | Automation and commitment are clearer premium value than charging for basic blocking itself. |
| ScreenZen | Core app/site blocking, delays, limits, schedules and lock behavior are free/donation-supported. | No normal software subscription for the core app; optional hardware/social extensions exist. | Basic delay/limits/schedules alone are not enough to justify a high subscription price. ScrollShield paid tiers need meaningful extra depth. |
| AppBlock | Entry/free use is limited. | Premium centers on broader schedules/limits, stricter anti-bypass options, allowlists/backups and advanced statistics. | Advanced anti-bypass and automation can justify higher-tier value. |
| Opal | Free/entry experience emphasizes focus/blocking and feedback. | Paid positioning emphasizes broader rule depth and stronger automation. | Premium polish matters, but ScrollShield should not charge premium-market pricing before equivalent reliability/device evidence exists. |

## Sources revalidated for this snapshot

- https://one-sec.app/de/faq/
- https://tutorials.one-sec.app/en/articles/3036418
- https://jomo.so/pricing
- https://support.freedom.to/en/articles/13764747-what-s-included-in-free-and-premium-plans
- https://freedom.to/premium
- https://screenzen.co/
- https://appblock.app/
- https://opal.so/

## Strategic conclusion

The strongest structure for ScrollShield is **three plans**, because it combines the simple one-sec-style app limit with a meaningful middle tier:

```text
Free → 1 protected app
Plus → up to 3 protected apps
Max  → unlimited supported protected apps
```

The plan model is source-defined in:

```text
src/lib/subscriptionPlanPolicy.ts
```

This is architecture only until verified billing exists.

## ScrollShield Free

Free must remain genuinely useful.

Capacity target:

```text
1 protected app
1 profile
1 recurring schedule
7-day local insights
```

Always included:

- reliable whole-app protection for one supported app;
- basic intentional-opening delay;
- basic session and daily limits;
- safe return-home / stop action;
- bounded emergency path;
- permission transparency and truthful service-health diagnostics;
- local migration/recovery;
- export/import of user-owned data;
- privacy/support/reset functions.

Free should remain ad-free unless a future product decision explicitly reopens that question. Advertising inside an intervention product would conflict with the trust model and is not part of the current strategy.

## ScrollShield Plus

Plus is the practical paid tier for users with several distracting apps.

Capacity target:

```text
up to 3 protected apps
up to 3 profiles
up to 5 recurring schedules
30-day local insights
```

Paid-value target, only when implemented and verified:

1. Advanced recurring schedule controls.
2. Richer local 30-day insights.
3. Advanced Anti-Binge controls.
4. Configurable emergency friction such as optional countdown/reason behavior.
5. Everything from Free, with the same safety/recovery quality.

This tier is intentionally simpler and cheaper than Max.

## ScrollShield Max

Max is the power-user tier.

Capacity target:

```text
unlimited supported protected apps
unlimited profiles
unlimited recurring schedules
90-day local insight window
```

Paid-value target, only when implemented and verified:

1. Everything in Plus.
2. Advanced Commitment Mode / rule-edit lock workflows with a documented safe exit.
3. Adaptive Friction based on repeated impulsive opens.
4. Profile automation for contexts such as Work, Study and Sleep.
5. Deepest local behavior insights available in the shipped version.
6. Future trusted-person/accountability workflows only after explicit privacy/security review.
7. Future cross-device protection only after genuine secure synchronization and conflict handling exist.

`Unlimited` never means unsupported apps, unsupported websites or per-login-account detection. It means no subscription count cap among targets the release actually supports.

## Safety must not be a paid feature

The following remain available independently of paid entitlement because they are safety/trust/data-ownership functions:

- protection for at least one supported app;
- safe return-home action;
- bounded emergency access;
- permission transparency;
- actual native service-health status and diagnostics;
- migration/data rescue;
- export/import;
- reset/uninstall guidance;
- privacy disclosures.

The underlying Android protection engine must not deliberately become less reliable for Free users.

No subscription expiry may delete configurations, history, statistics, exports, migration archives or recovery data.

## Secure entitlement strategy

Security is a release priority. A paid entitlement must not be trusted simply because a local variable says `plus` or `max`.

Source-level fail-closed rule:

```text
unverified / malformed paid plan
→ Free
```

Before commercial release, the intended trust chain is:

```text
Google Play purchase token
→ secure backend verification through Google Play Developer API
→ subscription lifecycle updates / RTDN
→ verified Free / Plus / Max entitlement
→ bounded local offline cache/grace
```

Important rules:

- `PENDING` never grants paid access;
- new eligible purchases/tokens are acknowledged correctly;
- refund/revocation/expiry must eventually remove paid entitlement;
- replay/duplicate callbacks must not create duplicate access;
- network/backend failure must not delete user data or break Free safety;
- a temporary verification outage is different from a verified expiry;
- user-editable local storage cannot permanently unlock Plus/Max.

See `docs/SUBSCRIPTION_RELEASE_GATE.md` for the release gate.

## Downgrade policy

Plan enforcement must occur at controlled configuration boundaries, never through destructive data deletion.

Example Max → Free:

```text
10 stored app configurations remain stored
→ entitlement becomes verified Free
→ user is clearly asked which 1 app remains actively protected
→ excess configurations remain preserved/read-only or paused
→ nothing is silently deleted
```

A temporary billing outage must not be treated as an immediate verified downgrade.

Exact downgrade UX and the transition of active protection must be device-tested before release because silently turning off protection for arbitrary apps would violate the safety principle.

## Internal pricing hypothesis — not final

Based on the current competitive range and the fact that ScrollShield is Android-first without proven cross-device breadth yet, an initial test hypothesis is:

| Plan | Monthly hypothesis | Annual hypothesis | Positioning |
| --- | ---: | ---: | --- |
| Free | €0 | €0 | permanent useful entry plan |
| Plus | ~€2.99 | ~€19.99 | 3-app practical tier |
| Max | ~€4.99 | ~€29.99 | unlimited + advanced commitment/automation |

These are **not store prices** and must not appear in production UI until Play Billing, backend verification, restore behavior, entitlement lifecycle and the actual feature set are complete.

A 7-day Max/annual trial can be tested later, but it is not an approved release promise yet.

## Current differentiator being built

ScrollShield already combines or is hardening several mechanisms in one local Android flow:

- intentional opening delay;
- session limit;
- daily limit;
- recurring rule windows;
- Anti-Binge open-count detection;
- strict blocking;
- limited emergency releases;
- optional emergency countdown;
- optional emergency reason stored in local history;
- exact service stop diagnostics;
- stale/process-loss recovery;
- durable config generations;
- generation-bound overlays/grants;
- lossless migration and local recovery.

The strongest product advantage should be **reliable local enforcement + transparent privacy + meaningful commitment automation**, not simply a larger list of flashy features.

## Subscription engineering requirements

No production paywall should ship until all of these exist:

- Google Play Billing through a maintained integration;
- secure server-side purchase/subscription verification;
- purchase acknowledgement;
- reliable restore flow;
- RTDN or equivalently reliable lifecycle synchronization;
- one typed verified entitlement state for `free | plus | max`;
- bounded offline grace;
- deterministic secure downgrade behavior;
- no accidental paid unlock on billing/network errors;
- no data loss on expiry/downgrade;
- purchase, pending, renewal, cancellation, suspension, refund, revocation, restore and plan-change tests;
- exact store pricing/trial disclosure;
- privacy review for billing/backend metadata.

## Priority roadmap

### P0 — reliability before monetization

- get `npm run verify`, Android JUnit and `assembleDebug` truly running successfully;
- pass required lifecycle/runtime/device cases;
- validate V0.7 migration physically;
- complete OEM/device reliability evidence.

### P1 — lock the three-plan entitlement model

- keep `subscriptionPlanPolicy.ts` and tests as the single product-limit contract;
- enforce protected-app limits only after verified entitlement infrastructure exists;
- design non-destructive downgrade selection UX;
- ensure Free safety paths never depend on billing availability.

### P2 — real billing/security infrastructure

- integrate Google Play Billing;
- implement secure backend verification and RTDN processing;
- purchase/restore/manage flows;
- offline grace and tamper-safe entitlement cache;
- Plus ↔ Max ↔ Free lifecycle tests;
- only then expose the paywall.

### P3 — paid feature depth

- Plus: advanced schedules, 30-day insights, advanced Anti-Binge, emergency-friction customization;
- Max: commitment cooldown/locks, adaptive friction, unlimited profiles/schedules/apps, deeper insights and automation;
- accountability/cross-device only after separate security/privacy designs.

## Release rule

A feature may appear in the paid comparison table only when it is implemented, tested on the exact candidate build, included in release documentation and not contradicted by platform limitations.

A roadmap feature is never a store-listing feature.
