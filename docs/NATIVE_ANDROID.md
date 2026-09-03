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

## Known Limits

- **Daily limits, anti-binge windows, session limits and emergency unlocks are evaluated in the web layer only.** The
  native service receives the resulting mode and delay, nothing else. An app whose daily limit is exhausted is not
  blocked natively until the web layer marks it `strict`.
- Detection lags an app switch by up to one poll interval (1.5 s).
- The overlay does not prevent the user from leaving through system gestures. It reappears on the next foreground
  transition of the protected app.
- Background reliability under Doze and OEM battery managers (Xiaomi, Samsung, Huawei) is **untested**.
- `EncryptedSharedPreferences` comes from Jetpack Security, which is in maintenance mode. Revisit before extending its
  use.

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
