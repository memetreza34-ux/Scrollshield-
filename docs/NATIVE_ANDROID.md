# Native Android Status

ScrollShield has a Capacitor Android wrapper under `android/`. The native interruption layer is **implemented but not
yet verified on a device** — it has never been compiled in CI, and no Play Console declaration has been filed. Treat it
as an alpha that is separate from the web/PWA launch described in `README.md`.

## Project Setup

- Capacitor app id: `app.scrollshield.mobile`
- Android `versionName` aligned with `package.json` version `1.0.0`
- Kotlin (`org.jetbrains.kotlin.android`, JVM target 21) alongside the generated Java sources
- Cleartext HTTP disabled in the Android manifest
- Android app backup disabled so local wellbeing data is not copied into device backups
- Android release builds use R8 minification and resource shrinking
- Release signing is configured through ignored local files only: start from `android/signing.properties.example`

`npm run check:android` guards these invariants, including the declared permission list and the presence of the Kotlin
toolchain whenever Kotlin sources exist.

## Implemented Native Behaviour

`ScrollShieldBridgePlugin.kt` exposes to the web layer:

| Method                        | Purpose                                                     |
| ----------------------------- | ----------------------------------------------------------- |
| `getPermissionStatus`         | Usage Access, overlay, notifications, service running state |
| `requestUsageStatsPermission` | Opens the system Usage Access screen                        |
| `requestOverlayPermission`    | Opens the system overlay screen                             |
| `getForegroundApp`            | Current foreground package (diagnostics)                    |
| `syncBlockedApps`             | Writes the per-app rule set                                 |
| `startMonitoring`             | Starts `AppMonitorService`                                  |
| `stopMonitoring`              | Stops it and clears the master switch                       |

`AppMonitorService.kt` runs as a foreground service, reads the foreground app from the `UsageStatsManager` **event**
stream every 1.5 s, and shows a full-screen overlay when a protected package appears:

| Rule mode  | Overlay behaviour                                               |
| ---------- | --------------------------------------------------------------- |
| `soft`     | Reminder, "continue" available immediately                      |
| `standard` | Countdown of the app's own `openDelay`, then "continue" unlocks |
| `strict`   | No "continue"; only "back to home screen"                       |

Rules are synced from `src/lib/nativeBridge.ts` (`buildNativeProtectionRules`), which also escalates an app to `strict`
while a focus session is running. Choosing "continue" grants a five-minute grace period so the overlay does not
immediately reappear.

Time windows travel down as a schedule (hours from `TIME_WINDOWS` in `src/lib/timeWindows.ts`) and are evaluated by the
service on every app switch, because the web layer may not be running when a window starts. A window set to `strict` or
`block` locks the app like `strict` mode and overrides the grace period; the native side has no emergency unlock that
would tell the two apart.

The short-video minutes measured by the accessibility service are read back by the web layer once a minute and on every
return to the app, and flow into the daily stats (dashboard, insights, in-app feed limit).

Reminders use `@capacitor/local-notifications`. Two have a fixed text and are scheduled with the system, so they arrive
even when the app is closed: the focus-end reminder (when a session starts, withdrawn if it is stopped early) and the
evening reminder at 22:00 (a daily alarm, rescheduled on every app start). The daily summary (from 20:00), the weekly
review (Sundays from 20:00, instead of the daily summary) and the relapse warning depend on the day's data and need the
running app. Alarms are inexact: `SCHEDULE_EXACT_ALARM`, `RECEIVE_BOOT_COMPLETED` and `WAKE_LOCK`, which the plugin
declares, are removed from the merged manifest.

## Short-Video Detection

`ShortVideoWatchService` (accessibility) recognises whether a protected app's short-video feed is on screen, counts
scroll events in it, and triggers the overlay when a feed rule is hit. It reads view ids and class names only — never
text. Detection signatures live in `src/lib/shortVideoSignatures.ts` and are synced down with the rules, so a renamed
view id is a TypeScript fix rather than a Kotlin one.

Full mechanism, privacy boundary, calibration procedure and Play Console requirements: `docs/SHORT_VIDEO_DETECTION.md`.

## Known Limits

- **Anti-binge windows, app-level daily limits and emergency unlocks are evaluated in the web layer only.** The native
  service receives mode, delay, time-window schedule and feed rule, nothing else.
- **Native interruptions are not recorded.** The overlay writes nothing to the history, so the dashboard, statistics,
  anti-binge, app-level daily limits, the relapse warning and the summaries only reflect what happens inside
  ScrollShield. Short-video minutes are the exception; they are read back from the device.
- **No restart after a reboot.** There is no boot receiver, so `AppMonitorService` only runs again once ScrollShield is
  opened. The accessibility service is rebound by the system on its own.
- A focus session is folded into the synced mode. If it ends while the app is not running, the native rules stay `strict`
  until ScrollShield is opened again and re-syncs.
- Scheduled reminders may arrive a few minutes late (inexact alarms). A reboot drops them until ScrollShield is opened
  again.
- Feed detection is heuristic and breaks silently when a host app renames its view ids. Re-verify per platform before
  each release.
- Detection lags an app switch by up to one poll interval (1.5 s).
- The overlay does not prevent the user from leaving through system gestures. It reappears on the next foreground
  transition of the protected app.
- Background reliability under Doze and OEM battery managers (Xiaomi, Samsung, Huawei) is **untested**.
- `EncryptedSharedPreferences` comes from Jetpack Security, which is in maintenance mode. Revisit before extending its
  use.
- **iOS cannot do feed-level rules at all.** Screen Time blocks whole apps or categories; no API exposes a surface
  inside another app. The UI must not offer Reels rules on iOS.

## Still Open Before a Store Release

- Compile and run the Android build on a real device; nothing here has been executed yet
- Verify service survival after reboot, battery optimisation and OEM task killers
- Record the Play Console permission demonstration videos (`PACKAGE_USAGE_STATS`, `SYSTEM_ALERT_WINDOW`)
- File the `FOREGROUND_SERVICE_SPECIAL_USE` declaration (see `docs/STORE_SUBMISSION_PACKET.md`)
- Confirm the final package id before the first Play Console upload
- Decide whether daily limits should move into the native layer or stay web-only

## Commands

```bash
npm run android:configure
npm run android:doctor
npm run android:sync
npm run android:open
npm run android:build
npm run android:release
npm run android:bundle
```

## Local Tooling

The project requires free local tooling for Android builds:

- Java 21 or newer
- Android Studio or Android command-line tools with Android SDK Platform 36
- A configured `android/local.properties` pointing at the Android SDK. Start from `android/local.properties.example`.
- For release signing, copy `android/signing.properties.example` to `android/signing.properties` and point it at a
  local keystore. Do not commit `signing.properties`, `.jks`, or `.keystore` files.

Run `npm run android:configure` after installing Android tooling to auto-create `android/local.properties` when the SDK
is in a standard location. Run `npm run android:doctor` after that; it reports missing Java, SDK, and
`local.properties` setup before Gradle is started. If `android/signing.properties` exists, it also validates the
required signing fields and keystore path.
