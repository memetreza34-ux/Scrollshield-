# ScrollShield

ScrollShield is an offline-first digital wellbeing app for reducing impulsive social media use. The project is now planned as a **web/PWA-first launch**: version 1.0 should ship as a public installable web app before the native Android/iOS store release.

## Current Scope

- App and short-video protection profiles
- Intentional opening delay and emergency unlock flows
- Focus sessions and local history/statistics
- Permission education screens with clear platform limits
- Local-only storage with migration support

The web/PWA version does not physically block other installed apps. It is positioned as a self-control and focus tool with intentional delays, local rules, focus sessions, and reflection. Real enforcement remains a later native phase:

- iOS: Screen Time / Family Controls entitlement and native managed-settings integration
- Android: Usage Access, overlay handling, and background reliability work

The generated Android app id is currently `app.scrollshield.mobile`. Confirm this id before the first Play Console upload because package names are hard to change after release. It is not a blocker for the first web/PWA launch.

## Native Android Alpha

The repository also contains a native interruption layer (`ScrollShieldBridgePlugin.kt`, `AppMonitorService.kt`) that
detects protected apps through Usage Access and shows an overlay. It is **not part of the v1.0 web/PWA release**: it has
not been compiled in CI, not been run on a device, and its Play Console permission declarations are still open. Daily
limits and anti-binge rules remain web-only — the native layer receives just the resulting mode and delay. See
`docs/NATIVE_ANDROID.md` for the exact state and limits.

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

## Web/PWA Launch

The first public release can be hosted as a static web app after these manual items are complete:

- Final domain
- Final imprint/legal provider details
- Verified support email address
- Published privacy policy URL
- Hosting target selected and connected

The production build is created with:

```bash
npm run build
```

The output is written to `dist/` and can be deployed to a static host such as Vercel, Netlify, Cloudflare Pages, or GitHub Pages.

## Android Wrapper

The Android wrapper is kept for the later native app phase. Prerequisites: Node.js plus a local Java/Android SDK installation for Gradle builds.

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

Before the web/PWA launch, replace legal placeholders in the imprint, publish the privacy policy on the final domain, verify the support address, and run `npm run verify`. Before a later store release, connect real native permission status and verify the native sections in `docs/RELEASE_CHECKLIST.md`.
