# Native Android Status

ScrollShield uses Capacitor with the Android package id `app.scrollshield.mobile`.

## Implemented

- Capacitor Android project and local release-signing configuration
- Cleartext HTTP and Android app backup disabled
- R8 minification and resource shrinking for release builds
- Native `ScrollShieldNative` Capacitor plugin
- Real status checks and system-setting links for:
  - Usage Access
  - Display over other apps
  - Notifications
  - Battery optimization exemption
- Prominent in-app disclosure explaining which usage information is read and which content is never accessed
- Explicit user-controlled start and stop controls for the protection service
- Foreground protection service with a persistent notification and stop action
- Foreground-app detection through `UsageStatsManager`
- Local synchronization of selected app rules from TypeScript into Android `SharedPreferences`
- Package mappings for the currently supported major social and entertainment apps
- Full-screen protection overlay with:
  - opening delay
  - strict blocking
  - return-to-home action
  - intentional temporary access
  - limited emergency access
- Native focus-mode blocking behavior for selected apps
- Local native event queue for blocks, warnings, intentional opens, and emergency unlocks
- Import of native events into React history and daily statistics

The browser/PWA build remains a preview and cannot block other installed apps. Only the installed Android build can use the native protection service.

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

## Release Blockers

1. Compile the Android project and run the complete JavaScript verification suite in a working CI or local environment.
2. Test foreground detection and overlays on Samsung, Google Pixel, Xiaomi, OnePlus, Motorola, and at least one Android tablet.
3. Add boot/restart handling and verify behavior after process termination, device restart, battery saver, and permission revocation.
4. Port daily limits, schedules, anti-binge thresholds, and emergency-unlock counters into the native enforcement layer.
5. Measure real session duration and feed it into usage statistics rather than recording only protection decisions.
6. Verify every Android package mapping and handle unavailable or region-specific app packages.
7. Replace legal placeholders and prepare Play Console declarations, reviewer instructions, and permission demonstration videos.
8. Add automated Android tests for permission loss, service restarts, overlays, countdowns, event import, and emergency access.

## Reels-only Protection

Whole-app protection is the stable first-release target. Usage Access identifies the foreground app but not the exact Reels, Shorts, or feed screen inside that app.

A future Reels-only Android beta may require an Accessibility Service. Do not add one until all of these are ready together:

- deterministic, user-defined rules only
- separate prominent disclosure and affirmative consent
- no collection of messages, passwords, keyboard input, media, or unrelated screen content
- Play Console Accessibility declaration and reviewer demonstration video
- resilient selectors for different languages and app experiments
- a remote kill switch for broken third-party app versions

## Local Tooling

- Java 21 or newer
- Android Studio or command-line tools
- Android SDK Platform 36
- `android/local.properties`, based on `android/local.properties.example`
- local release keystore and ignored `android/signing.properties`

Never commit signing files, keystores, or Play credentials.
