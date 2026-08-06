# ScrollShield

ScrollShield is an offline-first digital wellbeing app for reducing impulsive social media use. The repository contains a production-oriented web/PWA experience and a Capacitor Android app.

## Current Scope

- App and short-video protection profiles
- Intentional opening delay and emergency unlock flows
- Focus sessions and local history/statistics
- Local-only storage with migration and export support
- PWA build, automated tests, CI and release-readiness checks
- Android native permission bridges with real Usage Access, overlay, notification, and battery-status checks
- Android 13+ runtime notification permission request and direct Android 8+ protection-channel settings
- Android whole-app protection using foreground-app detection, a foreground service, and a full-screen interruption overlay
- Explicit protection-service start/stop controls and a persistent stop action in the Android notification
- Required app-wide and protection-channel notification visibility before Android protection can start or recover after reboot
- Safe runtime shutdown after permission or notification-channel revocation, removal of all active rules, or loss of the final installed protected app
- Recovery of explicitly enabled protection after reboot or app update only while all required conditions remain valid
- Native session duration, daily limits, recurring weekly schedules, Anti-Binge thresholds, and emergency-unlock counters
- The running service uses the same pure Java rule policy covered by JUnit boundary tests
- Scoped installed-app validation for supported Android packages
- Import of measured native usage and protection decisions into local React statistics and history
- Native Android device and permission diagnostics with copyable JSON output
- React and TypeScript tests for critical setup, permission-prompt, channel-routing, and browser-fallback behavior
- CI prepared to run web verification, Android JUnit tests, debug APK compilation, and artifact upload
- External GitHub Actions pinned to immutable commit SHAs

The browser/PWA version cannot physically block other installed apps. Native whole-app protection is available only in the installed Android build and still requires successful compilation, real-device validation, battery testing, schedule edge-case testing, and Play Console review preparation before release.

Reels-only protection remains an Android beta target because Usage Access identifies the foreground app but not the exact short-video screen inside a third-party app.

For iOS, real enforcement requires the Screen Time / Family Controls entitlement and native Managed Settings integration.

The Android app id is currently `app.scrollshield.mobile`. Confirm this id before the first Play Console upload because package names are difficult to change after release.

## Run Locally

Prerequisites: Node.js 22.12+ and npm 10+.

```bash
npm install
npm run dev
```

Open the local Vite URL shown in the terminal, usually `http://localhost:3000`.

## Quality Commands

```bash
npm run lint
npm run test
npm run build
npm run verify
npm run readiness
```

## Android

Prerequisites: Node.js, Java 21+, and an Android SDK installation.

```bash
npm run android:configure
npm run android:doctor
npm run android:sync
npm run android:open
npm run android:build
npm run android:release
npm run android:bundle
```

`android:sync` rebuilds the web app and copies it into the Capacitor Android project. `android:build` creates a debug APK. `android:bundle` creates the signed release AAB after local signing is configured.

## Product and Release References

- `docs/COMPETITOR_PRODUCT_BLUEPRINT.md`
- `docs/NATIVE_ANDROID.md`
- `docs/RELEASE_CHECKLIST.md`
- `docs/ROLLOUT_PLAN.md`
- `docs/STORE_SUBMISSION_PACKET.md`

Before release, replace legal placeholders, run `npm run verify`, compile the Android project, validate the complete native rule and service-lifecycle matrix on real devices, and execute the store-review checklist.
