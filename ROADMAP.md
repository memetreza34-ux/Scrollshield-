# ScrollShield — V1 Roadmap

**Updated:** 2026-10-07  
Authoritative feature scope: [docs/V1_MASTER_PLAN.md](docs/V1_MASTER_PLAN.md)

The roadmap intentionally prioritizes a small, reliable Android product over feature breadth.

## Phase 0 — Product Truth

Goal: repository, product spec, UI promises and store surfaces describe the same product.

- [x] 2-app Free allowance
- [x] 3 persistent tabs: Heute / Schutz / Einblicke
- [x] Focus moved to a full-screen action
- [x] fabricated saved-time display removed/deprecated
- [x] contextual Pro gates centralized
- [x] short-video capability demoted to Post-V1 research
- [x] Accessibility removed as a V1 production dependency
- [ ] finish documentation/privacy/store consistency audit
- [ ] remove remaining stale product claims and dead paths

## Phase 1 — Native Foundation

Goal: make the basic product promise reliably true on Android.

- versioned protection contract
- per-app rule lookup
- per-app opening delay
- reliable foreground transition detection
- native Return / Continue intervention
- config persistence
- permission/service health
- restart/reboot behavior
- JVM tests for parser/rules/transitions
- Android build succeeds on real toolchain
- first physical-device test

**Exit gate:** different protected apps can use different rules and the behavior is proven on a device.

## Phase 2 — Signature Engine

Goal: make Adaptive Reopen Protection the real differentiator.

- durable Reopen event ledger
- adaptive friction state machine
- bounded cooldown behavior
- Session Guard
- Emergency Unlock integration
- real intervention/open/session events
- measured/derived metrics only
- lifecycle/restart tests

**Exit gate:** repeated reopening demonstrably changes friction without continuous false retriggers.

## Phase 3 — Product UX

Goal: make the strong engine easy to understand.

- Heute hierarchy
- Schutz progressive disclosure
- presets: Sanft / Ausgewogen / Stark / Eigene
- schedule editor
- Focus full-screen flow
- Rescue
- Einblicke Today / Week / trends
- Calm Control design pass
- empty/error/permission/offline states
- accessibility checks

## Phase 4 — Monetization

Goal: charge for ongoing advanced value without damaging Free.

- Google Play Billing integration
- central Pro entitlement source
- third-app paywall
- contextual advanced-feature paywalls
- annual trial
- purchase / restore / pending / cancelled / expired states
- manage-subscription route
- store-provided price strings
- no client-side fake paid grant in production

## Phase 5 — Release Hardening

Goal: prove reliability before production.

- Android 12–16 test coverage where supported
- Pixel / Samsung / Xiaomi physical tests
- reboot
- process kill
- screen lock/unlock
- app update
- rapid app switching
- permission revoke/regrant
- Usage Access denied
- overlay denied
- notification denied
- 12–24 h service reliability/battery measurement
- migration from previous local state
- billing license-tester matrix
- current Google Play policy review
- closed beta
- production store assets and disclosures

## Post-V1 Research

Not part of the V1 release contract:

- Reels/Shorts/TikTok surface detection
- AccessibilityService-based content inspection
- iOS implementation
- cloud sync
- family/partner controls
- location/Wi-Fi rules
- AI coach/recommendations
- reports/export products
- social/gamified systems

Research code may remain in the repository behind explicit non-production flags. It must not silently become a release dependency.
