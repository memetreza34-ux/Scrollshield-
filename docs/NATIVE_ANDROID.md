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
- Persisted user intent for protection-service recovery
- Recovery after device reboot and app-package replacement when all required permissions remain granted
- Automatic safe shutdown when Usage Access or overlay permission is revoked
- Required notification visibility before initial startup or boot recovery
- Android permission UI that marks notifications as required for visible foreground protection
- Foreground protection service with a persistent notification and direct stop action
- Foreground-app detection through `UsageStatsManager`
- Local synchronization of selected app rules from TypeScript into Android `SharedPreferences`
- Scoped Android package-visibility declarations instead of broad installed-app access
- Native validation of known package names before an app can be activated as protected
- App-list status for installed and unavailable apps, including disabled controls for unavailable apps
- Local warnings when an already active configuration points to an unavailable app
- Package mappings for the currently supported major social and entertainment apps
- Full-screen protection overlay with:
  - opening delay
  - strict blocking
  - return-to-home action
  - intentional temporary access
  - limited emergency access
- Native enforcement for:
  - focus-mode blocking
  - per-app session duration
  - daily usage limits
  - legacy blocked-hour ranges, including overnight ranges
  - recurring weekly morning, work/school, evening, night, and weekend windows
  - normal, strict, or block behavior per recurring window
  - Anti-Binge warning and blocking thresholds
  - per-app daily emergency-unlock limits
- App-list presets for no schedule, balanced use, work/learning, evening/sleep, and very strict protection
- Batched native usage measurement while temporary access is active
- Local native event queue for blocks, warnings, intentional opens, permission loss, and emergency unlocks
- Import of native events and measured usage into React history and date-correct daily statistics
- Native Android device diagnostics for:
  - manufacturer and model
  - Android release and SDK level
  - package id, locale, and time zone
  - Usage Access, overlay, notifications, and battery exemption
  - persisted activation, running service, and installed configured apps
- Copyable JSON diagnostic snapshot in the development screen
- Pure Java protection-rule policy with local JUnit coverage for:
  - weekday schedule boundaries
  - weekend precedence
  - daytime and overnight blocked ranges
  - invalid range fallback
  - exact daily-limit boundaries
  - Anti-Binge thresholds
  - daily emergency-unlock limits
- React coverage for unavailable apps, weekly schedule presets, Android diagnostics, and required notification startup
- Verify workflow prepared to:
  - run all JavaScript release checks and tests
  - run `testDebugUnitTest`
  - compile `assembleDebug`
  - upload the debug APK and Android test report
- External GitHub Actions pinned to immutable commit SHAs
- Weekly Dependabot coverage for npm, Capacitor, React, Gradle, and GitHub Actions
- Dedicated transparency check guarding visible service status and the direct stop action

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

1. Execute the complete JavaScript verification suite, Android JUnit tests, and debug compilation in a working CI or local Android environment.
2. Test foreground detection, overlays, schedules, daily limits, session expiry, and counters on Samsung, Google Pixel, Xiaomi, OnePlus, Motorola, and at least one Android tablet.
3. Verify recovery after process termination, device restart, app update, battery saver, manufacturer task killers, and permission revocation.
4. Test weekly schedules across device time-zone changes, daylight-saving transitions, midnight boundaries, and manual clock changes.
5. Add a custom per-day/per-app schedule editor if preset schedules are insufficient for the first public release.
6. Validate cloned apps, work-profile packages, manufacturer variants, and region-specific package names.
7. Replace legal placeholders and prepare Play Console declarations, reviewer instructions, and permission demonstration videos.
8. Expand Android tests from pure rule logic to service lifecycle, permission loss, overlays, countdowns, usage import, boot recovery, and package availability.
9. Measure battery consumption over long sessions and tune the foreground-app polling interval before production rollout.

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
