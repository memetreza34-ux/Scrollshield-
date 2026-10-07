# ScrollShield

ScrollShield is an **Android-first, local-first digital wellbeing app** designed to interrupt impulsive app opening and add more friction when a user repeatedly returns to the same distracting app.

The authoritative V1 product specification is [docs/V1_MASTER_PLAN.md](docs/V1_MASTER_PLAN.md).

## V1 Product

The V1 product is built around three persistent areas:

- **Heute** — protection status and trustworthy metrics from today
- **Schutz** — protected apps, presets, schedules and advanced rules
- **Einblicke** — measured behavior and trends

Focus is a full-screen action launched from Heute, not a persistent tab.

The core behavior is:

```
Open protected app
  ↓
Intentional pause
  ↓
Return / Continue
  ↓
Use app
  ↓
Leave app
  ↓
Reopen detected
  ↓
More friction
```

### V1 Core

- per-app opening delay
- Return / Continue intervention
- Adaptive Reopen Protection
- Session Guard
- schedules
- Focus
- Emergency Unlock
- Rescue Mode [Pro]
- measured/derived usage and intervention metrics
- local-only configuration and history

### Free / Pro

**Free**
- up to 2 protected apps
- Sanft / Ausgewogen
- basic Reopen Protection
- 1 recurring schedule
- Focus 15 / 30 / 60
- Emergency Unlock
- Today statistics
- no ads

**Pro**
- unlimited apps
- custom delays
- advanced Reopen Protection
- Session Guard
- daily budgets
- unlimited schedules
- Stark / Eigene Regeln
- custom/strict Focus
- Rescue
- weekly insights and trends

Planning price direction: **€3.99/month** or **€24.99/year**, with a 7-day annual trial. Billing UI must ultimately use store-provided prices.

## Platform Strategy

V1 is an **Android product**.

The web/PWA build remains useful for:
- development
- UI preview
- automated tests
- product demonstrations

It cannot physically intercept or restrict other installed apps and is not the paid protection product.

iOS parity is explicitly outside V1 and requires a separate Screen Time / FamilyControls architecture.

## Native Android Status

The repository contains a real Android protection layer under `android/`:

- `ScrollShieldBridgePlugin.kt` bridges React state to Android
- `AppMonitorService.kt` monitors protected foreground apps
- rules are persisted locally
- the intervention UI uses a native overlay
- per-app rules include opening delay, schedules, focus state, Reopen Protection, Session Guard and Emergency Unlock
- the protection payload uses an explicit versioned native contract

Source-level implementation is **not the same as device verification**.

GitHub CI now compiles/tests the Android project, but release claims still require real-device validation on Pixel, Samsung and Xiaomi-class devices.

## Short-Video / Reels Research

Feed-level detection for Reels, Shorts, TikTok feeds and similar surfaces is **Post-V1 technical research**.

Research code may remain in the repository, but production V1:

- does not depend on AccessibilityService
- does not request Accessibility access
- does not send short-video rules to the native engine
- does not market feed-level blocking as a V1 feature

See [docs/V1_MASTER_PLAN.md](docs/V1_MASTER_PLAN.md) for the release contract.

## Run Locally

Prerequisites: Node.js 24 and npm compatible with the repository lockfile.

```bash
npm ci
npm run dev
```

Common checks:

```bash
npm run lint
npm run test
npm run build
npm run verify
```

## Android Development

Local Android development requires Java 21 and Android SDK Platform 36.

```bash
npm run android:doctor
npm run android:sync
npm run android:open
npm run android:build
npm run android:release
npm run android:bundle
```

The generated Android application id is currently:

```
app.scrollshield.mobile
```

Confirm the package id before the first Play Console production upload.

## Release Rule

A capability is only release-ready when it is:

1. defined in the product contract
2. implemented in the native engine
3. covered by automated checks where practical
4. compiled successfully
5. tested on real Android devices
6. reviewed against current Google Play policy

Do not describe source-only functionality as device-verified.
