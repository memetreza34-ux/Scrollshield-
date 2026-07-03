# ScrollShield

ScrollShield is an offline-first digital wellbeing app for reducing impulsive social media use. The current codebase includes the production web/PWA experience and an Android Capacitor shell; real blocking enforcement still requires native platform integrations.

## Current Scope

- App and short-video protection profiles
- Intentional opening delay and emergency unlock flows
- Focus sessions and local history/statistics
- Permission education screens for iOS and Android
- Local-only storage with migration support

The browser/PWA version does not physically block other installed apps. Real enforcement requires native platform work:

- iOS: Screen Time / Family Controls entitlement and native managed-settings integration
- Android: Usage Access, overlay handling, and background reliability work

The generated Android app id is currently `app.scrollshield.mobile`. Confirm this id before the first Play Console upload because package names are hard to change after release.

## Run Locally

Prerequisites: Node.js 22.12+ and npm 10+.

```bash
npm install
npm run dev
```

Open the local Vite URL shown in the terminal, usually `http://localhost:3000`.

## Useful Commands

```bash
npm run lint
npm run build
npm run verify
npm run clean
```

## Android Wrapper

Prerequisites: Node.js plus a local Java/Android SDK installation for Gradle builds.

```bash
npm run android:doctor
npm run android:sync
npm run android:open
npm run android:build
npm run android:release
npm run android:bundle
```

`android:doctor` checks the local Java/Android SDK setup. `android:sync` rebuilds the web app and syncs it into the Capacitor Android project. `android:build` creates a debug APK once Java and the Android SDK are installed locally. `android:bundle` creates the release AAB used for Play Console upload after signing is configured.

## Release Notes

Before a store release, replace legal placeholders in the imprint, connect real native permission status, remove visible demo/debug flows from production builds, and verify the release checklist in `docs/RELEASE_CHECKLIST.md`.
