# ScrollShield V1 — Authoritative Product Specification

**Version:** 2.1  
**Status:** authoritative product source of truth  
**Updated:** 2026-10-07

If another product document conflicts with this file, this file wins until the conflict is resolved explicitly.

## 1. Product Positioning

ScrollShield is an **Android-first self-control app for impulsive app reopening**.

**One-sentence positioning:**

> ScrollShield interrupts impulsive app opening and increases friction when you repeatedly return to the same distracting app.

ScrollShield is not primarily a generic blocker, Pomodoro timer, parental-control product, AI coach, gamified wellness app, or short-video blocker.

The core promise is behaviorally simple:

```
Open app
  ↓
Intentional pause
  ↓
Return / Continue
  ↓
Short session
  ↓
Leave app
  ↓
Reopen detected
  ↓
More friction
```

### Primary differentiator

**Adaptive Reopen Protection**

Repeated returns inside a short time window increase friction. Exact thresholds are product defaults to be validated with real usage; they are not presented as scientifically proven absolutes.

### Secondary differentiators

1. **Session Guard** — contain a distracting session after entry.
2. **Rescue Mode** — immediate temporary stronger protection when the user needs focus now.

## 2. V1 Product Principles

1. **Native truth before UI promise.** A feature is not “implemented” because a TypeScript field or screen exists.
2. **Friction before punishment.** The normal flow gives the user a clear route back and avoids unnecessary hard lockouts.
3. **Measured data only.** No arbitrary “time saved”, productivity score, or fake behavioral estimate.
4. **Local-first.** V1 has no account, cloud sync, advertising tracker, or social layer.
5. **Simple surface, strong engine.** Hide advanced complexity until the user needs it.
6. **Android-first.** Web/PWA is a development/demo surface, not the paid protection product.
7. **Accessibility is not a V1 dependency.** Core release behavior must work without AccessibilityService.

## 3. Information Architecture

There are exactly **three persistent bottom-navigation tabs**:

### Heute

Answers: “Is protection working, and what happened today?”

Above the fold:

- protection/service status
- number of protected apps
- one trustworthy primary metric
- **Fokus starten**
- **Rescue [PRO]**

Below:

- measured app usage
- reopen observations
- active/next schedule
- active focus/rescue state

Do not show motivational quotes, fake saved-time numbers, decorative score cards, or forced streaks.

### Schutz

Answers: “What is protected and how?”

Contains:

- protected apps
- per-app preset and rules
- schedules
- focus rules
- Commitment / Strong Protection [PRO]

Per-app detail uses progressive disclosure:

- preset
- opening pause
- Reopen Protection
- Session Guard [PRO]
- daily budget [PRO]
- schedules
- Emergency Unlock

### Einblicke

Answers: “What changed?”

Free:

- Today
- opening attempts
- interventions
- abandoned opens
- reopens
- measured usage
- sessions
- focus time

Pro:

- week view
- comparison with previous week
- reopen-time patterns
- app trends

### Focus

Focus remains a full-screen experience but **is not a persistent tab**. It is launched primarily from Heute.

Free presets: 15 / 30 / 60 minutes.  
Pro: custom duration and Strict/Commitment Focus.

### Rescue

Rescue is a focused Pro action launched from Heute. It is not a tab and not a general rules editor.

## 4. Presets

### Sanft [FREE]

- short opening pause
- no aggressive escalation

### Ausgewogen [FREE, default]

- standard opening pause
- basic Reopen Protection

### Stark [PRO]

- stronger Reopen escalation
- Session Guard
- optional cooldown

### Eigene Regeln [PRO]

- custom delay
- advanced escalation
- limits
- schedules

Presets reduce configuration overload. Advanced rule editors stay behind progressive disclosure.

## 5. Free / Pro Contract

### Free — useful indefinitely

- up to **2 protected apps**
- standard opening pause
- explicit Return vs Continue decision
- basic Reopen Protection
- Sanft / Ausgewogen presets
- **1** recurring schedule
- Focus 15 / 30 / 60
- Emergency Unlock
- Today statistics from trustworthy sources
- permission/service health
- local privacy
- no ads

### Pro

- unlimited protected apps
- custom opening delays
- advanced Adaptive Reopen Protection
- Session Guard
- daily budgets
- unlimited schedules
- Stark / Eigene Regeln
- custom Focus duration
- Strict/Commitment Focus
- Rescue Mode
- weekly insights
- reopen trends
- app trends

### Paywall triggers

Primary:

- user attempts to protect a **third app**

Secondary contextual triggers:

- Session Guard
- second recurring schedule
- Stark / custom rules
- Rescue
- weekly insights
- advanced Reopen configuration

Never force a paywall before the first protection experience, during permission setup, or inside Emergency Unlock.

## 6. Pricing Direction

Planning target:

- **€3.99 / month**
- **€24.99 / year**
- **7-day trial on annual plan**
- no Lifetime plan at launch

These are product-planning targets only. When billing is enabled, the UI must render actual price/trial/renewal details from Google Play rather than hardcoded strings.

## 7. Trustworthy Metrics

Internal quality classes:

- **MEASURED** — directly observed event or OS measurement
- **DERIVED** — mathematically derived only from measured values
- **UNAVAILABLE** — no trustworthy source exists

Valid examples:

- seconds → minutes
- actual interventions today
- actual foreground usage

Invalid examples:

- blocked opens × guessed minutes saved
- “life regained”
- arbitrary productivity score

Legacy persisted fields such as `savedTimeMinutes` may remain temporarily for migration compatibility but must never be calculated or displayed.

## 8. Android V1 Architecture

Target flow:

```
AppConfig
  ↓
versioned native protection contract
  ↓
Capacitor bridge
  ↓
native config store
  ↓
per-app rule engine
  ↓
foreground transition detector
  ↓
native intervention
  ↓
event ledger
  ↓
trustworthy metrics
```

Implementation status must always distinguish:

- CONTRACT DEFINED
- PARSED NATIVELY
- ENFORCED NATIVELY
- TESTED
- DEVICE-VERIFIED
- RELEASE READY

No source-only change can be called device-verified.

### Current useful native work retained

The October 2026 native branch contains valuable source-level work for:

- per-app delay rules
- Reopen escalation
- Session Guard
- Emergency Unlock state
- focus/commitment state
- foreground usage
- interruption/open logs
- boot recovery
- native overlay improvements

This work remains subject to Android compilation and real-device verification.

## 9. Permissions and Release Risk

### Usage Access

Required for foreground/usage information. Explain why it is needed and degrade safely when absent.

### Display over other apps

Required for the native intervention overlay. It is a powerful user-granted permission; UX must explain the concrete purpose.

### Foreground Service

The protection service is core functionality. It must remain user-perceptible, user-controlled, and aligned with current Google Play foreground-service rules and declarations.

### Battery optimization

No direct battery-exemption permission is part of the V1 plan. Device-specific guidance may be offered only when reliability testing demonstrates a need.

### AccessibilityService

**Not part of V1 production.**

The repository may contain `ShortVideoWatchService.kt` and related signatures as research code, but:

- production V1 does not register the service in AndroidManifest
- production UI does not request Accessibility access
- production native rules do not depend on it
- V1 store listing does not promise feed-level blocking

## 10. Short-Video Protection

Status: **POST-V1 TECHNICAL RESEARCH**

Potential future targets include Instagram Reels, YouTube Shorts, TikTok feeds, Facebook Reels, and Snapchat Spotlight.

Reasons for deferral:

- surface detection is technically brittle
- host-app UI identifiers change
- likely AccessibilityService dependency
- extra Play policy/declaration burden
- device/OEM reliability must be empirically verified

This code may be developed behind `enableShortVideoResearch=false`, but it is not a V1 feature until explicitly promoted after policy and device validation.

## 11. Design Direction — Calm Control

Characteristics:

- dark-first
- near-black / neutral gray / off-white
- one calm emerald accent
- restrained motion
- Android-native feeling
- high information clarity

Avoid:

- neon/cyberpunk styling
- excessive gradients/glows
- glassmorphism everywhere
- nested cards without information purpose
- giant radii everywhere
- generic motivational copy
- decorative charts
- XP, coins, leaderboards, guilt loops

Hierarchy should come primarily from typography, spacing, content, and clear interaction states.

## 12. Explicitly Out of V1

- feed-level Reels/Shorts blocking
- production AccessibilityService
- Family / Partner control
- cloud account or sync
- location/Wi-Fi profiles
- AI coach/recommendations
- social leaderboards
- XP/coins
- PDF/CSV reports
- iOS parity

## 13. Development Order

### Phase 0 — Product Truth

- one authoritative product spec
- repository/source-of-truth cleanup
- 2-app Free contract
- no fabricated metrics
- release surfaces aligned

### Phase 1 — Native Foundation

- versioned native contract
- per-app rule engine
- reliable foreground transition detection
- native intervention
- config persistence
- service/permission health

### Phase 2 — Signature Engine

- Reopen ledger
- Adaptive Reopen escalation
- Session Guard
- local event ledger
- trustworthy metric aggregation

### Phase 3 — Product UX

- 3-tab navigation
- Heute
- Schutz progressive disclosure
- presets
- Focus full screen
- Rescue
- Einblicke

### Phase 4 — Monetization

- centralized entitlements
- Google Play billing integration
- contextual paywalls
- trial
- restore purchases
- manage subscription
- pending/cancelled/expired/offline states

### Phase 5 — Release Hardening

- Android build/toolchain green
- native JVM tests
- real-device tests
- Pixel/Samsung/Xiaomi matrix
- permission revoke/regrant
- reboot/update/process-kill
- battery benchmark
- migration tests
- billing tests
- current Play policy review
- closed beta
- store submission

## 14. Release Gate

V1 is not release-ready until all of the following are true:

- no fake KPI is shown
- per-app opening delay works on device
- Reopen Protection works across realistic lifecycle transitions
- Session Guard works reliably
- Emergency Unlock is safe and bounded
- Focus/Commitment state survives required lifecycle scenarios
- no production AccessibilityService dependency
- Usage Access and overlay denial/revocation fail safely
- foreground service behavior is policy-reviewed and device-tested
- migration preserves existing user configuration
- Free/Pro gates match this document
- real Google Play billing state drives paid access when monetization ships
- store copy promises only device-verified release behavior

## 15. Current Reality Check

As of this document update, the latest Claude source branch contains substantial new TypeScript and Kotlin work, but the commit itself explicitly stated that Android was **not compiled or run on a device in that environment**. Therefore native capabilities are source-level implementation, not release evidence.

The next engineering priority is verification and consolidation of the native protection engine — not adding more headline features.
