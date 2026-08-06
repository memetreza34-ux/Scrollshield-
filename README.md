# ScrollShield

ScrollShield is an offline-first digital wellbeing app for reducing impulsive social media use. The repository contains a production-oriented web/PWA experience and a Capacitor Android shell.

## Current Scope

- App and short-video protection profiles
- Intentional opening delay and emergency unlock flows
- Focus sessions and local history/statistics
- Local-only storage with migration and export support
- PWA build, automated tests, CI and release-readiness checks
- Android native permission bridge for real Usage Access, overlay, notification and battery-status checks

The browser/PWA version cannot physically block other installed apps. The Android build now opens the real system settings and verifies their status, but complete blocking enforcement still requires the foreground-app monitor and interruption service described in `docs/NATIVE_ANDROID.md`.

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

Before release, replace legal placeholders in the imprint, complete real blocking enforcement, remove all demo-only entry points from production, run `npm run verify`, and execute the device test matrix.
