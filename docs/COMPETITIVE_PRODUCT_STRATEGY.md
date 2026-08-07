# ScrollShield Competitive Product Strategy

Research snapshot: 2026-08-07

This document is a product-planning reference, not store copy and not evidence that an unimplemented feature exists. Pricing and competitor features can change and must be rechecked before any commercial launch.

## Product Goal

ScrollShield should earn a paid subscription by providing a materially stronger commitment system, not by hiding basic safety, privacy, or data ownership behind a paywall.

The product promise for version one remains whole-app protection on supported Android targets. Reels-/Shorts-only detection must not be marketed until the exact technical behavior is implemented and validated.

## Current Competitor Pattern

| Product | Free / entry value | Paid-value pattern | Strategic lesson for ScrollShield |
| --- | --- | --- | --- |
| one sec | One-app breathing interruption | Unlimited apps, intentional switching, time tracking, website intervention, block sessions and other interventions. Germany FAQ currently lists €3.99 monthly, €14.99 annually and €99.99 lifetime; regional prices vary. | Intentional friction can justify payment when it is configurable, measurable and available across more apps. |
| Jomo | 1 session, 1 action/limit, 1 screen-time budget and reports | Annual plan currently lists $29.99 and adds up to 10 sessions/actions, Strict Mode, multiple budgets and other advanced controls. | A useful free tier plus a reasonably priced advanced-control tier is credible. |
| Freedom | Basic blocking, custom lists and unlimited devices | Scheduling, recurring/advance sessions, Locked Mode and longer sessions. Current public annual-equivalent price is $3.33/month, monthly $8.99, with a lifetime option also offered. | Automation and commitment protection are clearer premium value than simply raising a daily-minute cap. |
| AppBlock | Limited Quick Block, schedules, Strict Mode and statistics | Unlimited schedules/limits, all Strict Mode access conditions, Allowlist, backup, advanced statistics and anti-bypass options. | Anti-bypass, automation and advanced rule depth are subscription-grade features. |
| ScreenZen | Core app/website blocking, delays, scrolling interruptions, limits, schedules, strict blocking, lock settings and streaks are donation-supported/free | No normal software subscription; optional hardware/social features exist. | ScrollShield cannot justify a subscription merely by offering basic delays, limits, schedules or streaks. The paid tier has to go beyond that baseline. |
| Opal | Focus rules, timers, score-oriented feedback and blocking | Public product positioning emphasizes unlimited rules, advanced timers/soundscapes, Allow Only and stronger focus automation. | Polished feedback, automatic rules and a visible progress system increase perceived value, but ScrollShield should avoid premium pricing before comparable reliability and breadth are proven. |

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

## ScrollShield Free Principles

The following must remain available without Pro because they are core trust, safety, or data-ownership functions:

- protection for at least one supported app;
- a basic intentional-opening delay;
- a basic daily app limit;
- visible foreground-service notification and direct stop action;
- permission transparency and actual service-health status;
- a safe emergency path instead of trapping a user behind a block;
- local-only privacy controls;
- V0.7 migration and raw-data recovery;
- export/import of user-owned data and the legacy archive;
- reset and uninstall guidance;
- enough recent history to understand whether protection works.

No subscription expiry may delete configurations, history, statistics, exports, migration archives or recovery data.

## ScrollShield Pro Value

Pro should be a commitment and automation layer. Candidate premium capabilities, only after each is fully implemented and verified:

1. Unlimited protected apps and custom profiles.
2. Unlimited recurring schedules and more granular per-day time windows.
3. Advanced Strict / Commitment Mode that locks rule edits for a chosen period while preserving a safe emergency path.
4. Adaptive Friction: opening delay escalates after repeated impulsive opens and relaxes after healthy gaps.
5. Advanced Anti-Binge policies with separate warn, friction, strict-block and cooldown stages.
6. Emergency-friction customization: optional countdown and local reason entry, while the basic emergency path remains available in Free.
7. Advanced history and weekly review: trends, saved-time estimates, most-triggered rules and progress comparisons without cloud profiling.
8. More profiles and profile automation for Work, Study, Sleep and Personal modes.
9. Future accountability approval, only with explicit opt-in and a privacy design that does not expose browsing/app-content data.
10. Future cross-device protection only after genuine synchronization and conflict handling exist; never advertise it early.

## Current Differentiator Being Built

ScrollShield combines several mechanisms in one local Android flow:

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
- stale-service detection after Android lifecycle failures;
- lossless migration and local recovery.

The emergency reason is not a cloud-account feature. It must remain bounded, local, exportable as part of user-owned history, and covered by the privacy/network verification contract.

## Pricing Hypothesis — Not Final

Do not publish pricing until Play Billing, restore-purchase behavior, entitlement caching, expiry behavior and a real Pro feature set are implemented and tested.

A reasonable initial hypothesis for testing is:

- monthly: €3.99–€4.99;
- annual: €19.99–€29.99;
- 7-day annual trial;
- optional lifetime license later: approximately €79.99–€99.99 if long-term support economics permit it.

This intentionally sits closer to one sec/Jomo than premium-priced focus products. ScrollShield should not charge an aggressive annual price while Android build reliability, physical-device coverage, cross-device support and store evidence are still incomplete.

## Subscription Engineering Requirements

No production paywall should ship until all of these exist:

- Google Play Billing through a maintained, reviewable integration;
- purchase acknowledgement and reliable restore flow;
- entitlement state derived from verified store purchases rather than a user-editable local flag;
- bounded offline entitlement cache/grace behavior;
- deterministic downgrade behavior when Pro expires;
- Free protection continues safely when billing is unavailable;
- no loss or corruption of Pro-created user data after downgrade;
- no accidental Pro unlock when billing/network calls fail;
- purchase, renewal, cancellation, refund, restore and account-change test cases;
- clear pricing/trial disclosure and subscription-management link;
- privacy review for any billing/account metadata introduced by the billing stack.

## Priority Roadmap

### P0 — Reliability before monetization

- get `npm run verify`, Android JUnit and `assembleDebug` running successfully;
- pass LIFE-08 through LIFE-11 on real devices;
- validate V0.7 migration on a physical upgrade path;
- complete manufacturer/device reliability evidence;
- remove or clearly disable any UI feature that is not truly enforced by the release engine.

### P1 — Make the protection meaningfully better

- finish user-facing controls for `requireCountdown` and `requireReason`;
- add adaptive friction as a pure, tested policy before UI wiring;
- add more granular schedule editing without weakening existing defaults;
- improve weekly insights using only local data;
- ensure all rule edits resync immediately and safely with the running native service.

### P2 — Build real Pro infrastructure

- integrate Google Play Billing;
- implement purchase/restore/manage flows;
- introduce a typed feature-entitlement registry;
- apply Free/Pro limits at configuration boundaries, not by deleting data;
- test entitlement downgrade/upgrade and offline behavior;
- only then add the paywall and trial UX.

### P3 — High-value differentiators

- commitment cooldown before weakening active strict rules;
- optional trusted-person approval;
- richer local progress insights;
- Android website protection only if technically reliable and store-policy compliant;
- cross-device only after a privacy-preserving sync architecture exists.

## Release Rule

A feature may appear in the paid comparison table only when it is implemented, tested on the exact candidate build, included in the release documentation and not contradicted by platform limitations. A roadmap feature is never a store-listing feature.
