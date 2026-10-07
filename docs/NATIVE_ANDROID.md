# Native Android Status

ScrollShield V1 is Android-first. This document describes the current native implementation and its verification status.

The authoritative product scope is [V1_MASTER_PLAN.md](V1_MASTER_PLAN.md).

## Verification Levels

Use these terms consistently:

- **CONTRACT DEFINED** — represented in the web/native payload
- **PARSED NATIVELY** — Android reads and normalizes it
- **ENFORCED NATIVELY** — Android uses it in runtime decisions
- **CI COMPILED** — Kotlin/Android project compiles in GitHub Actions
- **DEVICE VERIFIED** — behavior confirmed on a physical Android device
- **RELEASE READY** — device matrix + policy + lifecycle checks complete

Source code alone is never “device verified”.

## Project Setup

- Capacitor app id: `app.scrollshield.mobile`
- Kotlin Android project under `android/`
- JVM target: 21
- compile/target SDK values from `android/variables.gradle`
- local encrypted native preferences via `SecurePrefs`
- cleartext HTTP disabled
- Android app backup disabled
- release builds use R8/resource shrinking

## Native Protection Contract

React builds the native rule snapshot in `src/lib/nativeBridge.ts`.

The payload is explicitly versioned:

```
contractVersion
generatedAt
monitoringEnabled
rules[]
```

Current contract version: **1**.

Android rejects unknown incoming non-matching contract versions. Persisted legacy version `0` remains readable for migration; unknown future persisted versions fail closed instead of executing rules with unknown semantics.

Per-package rules can include:

- app id
- mode
- opening delay
- daily budget
- Adaptive Reopen / anti-binge thresholds
- schedules
- focus end timestamp
- Session Guard duration
- Emergency Unlock policy
- emergency-lock timestamp for strict focus / commitment

Post-V1 short-video fields remain in research code but are not emitted by the production V1 path.

## Bridge

`ScrollShieldBridgePlugin.kt` currently exposes:

| Method | Purpose |
| --- | --- |
| `getPermissionStatus` | Usage Access, overlay, notifications and runtime service state |
| `requestUsageStatsPermission` | Opens Android Usage Access settings |
| `requestOverlayPermission` | Opens Android overlay permission settings |
| `getForegroundApp` | Diagnostic foreground-package lookup |
| `syncBlockedApps` | Validates and stores the versioned protection contract |
| `startMonitoring` | Starts `AppMonitorService` |
| `stopMonitoring` | Stops monitoring |
| `getInterruptionEvents` | Returns native intervention events not yet imported into web state |
| `getAppUsage` | Returns measured foreground minutes for protected packages |
| `getScreenTime` | Returns measured screen-time data when available |
| `acknowledgeInterruptionEvents` | Removes imported native events |
| `clearNativeData` | Clears native state and stops monitoring |
| `getAppIcons` | Reads installed launcher icons for supported packages |
| `saveTextFile` | Uses Android save dialog for text export |
| `minimizeApp` / back event | Native back handling for the Capacitor shell |

Research-only methods related to Accessibility/short-video calibration are not part of the V1 release contract.

## AppMonitorService

The monitor runs as a foreground service and evaluates the current protected foreground package.

### Main intervention order

For a protected app, Android evaluates roughly:

1. daily budget
2. Reopen cooldown
3. schedule lock
4. active Focus / Rescue
5. strict mode
6. Adaptive Reopen delay
7. normal opening delay

Hard locks override ordinary opening friction.

### Adaptive Reopen Protection

A successful Continue action records an opening.

If the user leaves the app and reopens it within the configured Reopen window, the next intervention can use a longer delay or cooldown.

Important V1 invariant:

**Every real foreground return to a protected app is evaluated again.**

The service already distinguishes a continuously running foreground session from a real app switch through `lastForegroundPackage`, so V1 does not use a multi-minute post-Continue grace window that could accidentally bypass opening friction.

### Session Guard

When enabled, the service tracks the start of the accepted foreground session and can interrupt again after the configured number of minutes even if the user never leaves the app.

### Focus / Rescue

Running Focus or Rescue sessions sync an absolute end timestamp to Android. The native layer therefore does not require the React webview to stay alive merely to know when the lock should expire.

Strict Focus / Commitment can also suppress Emergency Unlock until a specific timestamp.

### Emergency Unlock

For rules that allow it:

- bounded number per day
- countdown before activation
- temporary unlock duration
- disabled while strict Focus/Commitment forbids it
- native event is recorded

Emergency Unlock is part of the native rule engine, not merely a web-only flow.

## Metrics

Native events are imported into the app state and used for trustworthy metrics.

Allowed metric quality:

- **MEASURED**
- **DERIVED**
- **UNAVAILABLE**

Do not derive “saved time” from arbitrary multipliers.

## Permissions

### V1 production

Core Android V1 uses:

- Usage Access
- display-over-other-apps permission
- foreground service
- notifications when the user enables notification features

### Not a V1 dependency

AccessibilityService is **not** registered/requested as a production V1 requirement.

Battery-optimization exemption is also not a default V1 permission flow. Device-specific guidance may be revisited only if real-device reliability testing proves it necessary.

## Short-Video Research

`ShortVideoWatchService.kt`, signatures and calibration code may remain for research.

They are explicitly **Post-V1** because feed-level detection is brittle and likely introduces additional AccessibilityService / Play-policy burden.

Production V1 feature flags keep this path disabled.

## Current Known Limits

- foreground detection can lag by the polling interval
- overlay permission can be revoked externally
- OEM process management may affect long-running reliability
- daily budget accuracy depends on Android UsageStats behavior
- rapid app switching needs physical-device validation
- reboot/update/process-kill behavior still requires full device-matrix verification
- `EncryptedSharedPreferences`/Jetpack Security is maintenance-mode technology and should not be expanded casually
- Android policy acceptance cannot be inferred from local code alone

## CI

GitHub Actions runs:

- repository `npm run verify`
- Android `testDebugUnitTest`
- Android `assembleDebug`

A green CI build proves compilation/tests, not physical-device behavior.

## Required Device Matrix Before Release

At minimum verify on representative:

- Pixel / AOSP-like Android
- Samsung One UI
- Xiaomi / HyperOS-class aggressive background management

Scenarios:

- first permission grant
- permission revoke/regrant
- protected app switch
- immediate reopen
- repeated reopen escalation
- Session Guard
- Emergency Unlock
- Focus expiration while ScrollShield UI is closed
- reboot
- process kill
- screen lock/unlock
- app update
- 12–24 hour background reliability
- battery consumption

## Release Boundary

Do not market any native behavior that has not passed the relevant device checks.

Feed-level Reels/Shorts blocking, AccessibilityService-based inspection, iOS parity, cloud sync and family/partner controls remain outside V1.
