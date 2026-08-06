# Native Android Status

ScrollShield uses Capacitor with the Android package id `app.scrollshield.mobile`.

## Implemented

- Capacitor Android project and local release-signing configuration
- Cleartext HTTP and Android app backup disabled
- R8 minification and resource shrinking for release builds
- Native Capacitor bridges for protection, diagnostics, and Android notification permission handling
- Real status checks and system-setting links for:
  - Usage Access
  - Display over other apps
  - Notifications
  - Battery optimization exemption
- Android 13+ runtime request for `POST_NOTIFICATIONS`
- Direct Android 8+ settings link to the `Aktiver App-Schutz` notification channel
- Reliable Android 7 fallback to the app-details settings screen
- Notification health checks at both app and protection-channel level
- Prominent in-app disclosure explaining which usage information is read and which content is never accessed
- Explicit user-controlled start and stop controls for the protection service
- Persisted user intent for protection-service recovery
- Recovery after device reboot and app-package replacement when all required permissions remain granted
- Failed boot or app-update recovery clears stale activation and records the exact missing prerequisite
- Automatic safe shutdown when Usage Access, overlay permission, notification visibility, active rules, or installed target apps disappear
- Required notification visibility before initial startup or boot recovery
- Android permission UI that marks notifications as required for visible foreground protection
- Foreground protection service with a persistent notification and direct stop action
- Explicit foreground-notification removal when the service ends
- Persistent protection lifecycle state:
  - `lastProtectionStartAt`
  - `lastProtectionStopAt`
  - `lastProtectionStopCode`
  - `lastProtectionStopMessage`
- Stable runtime stop codes for missing Usage Access, Overlay, notifications, active rules, and installed target apps
- Stable `recovery_*` codes for failed reboot or app-update recovery
- Stable `manual_app_stop`, `protection_disabled`, `start_failed`, and `migration_recovery` codes for other lifecycle paths
- Pure Java `ProtectionStopReasonPolicy` with JUnit coverage for system-warning classification
- Foreground-app detection through `UsageStatsManager`
- Local synchronization of selected app rules from TypeScript into Android `SharedPreferences`
- Periodic service-health validation for installed active protected apps
- Immediate cleanup of temporary access when a configured app is removed from the rules
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
- The running Android service executes the same pure Java `ProtectionRulePolicy` covered by local JUnit tests
- App-list presets for no schedule, balanced use, work/learning, evening/sleep, and very strict protection
- Batched native usage measurement while temporary access is active
- Local native event queue for blocks, warnings, intentional opens, permission loss, and emergency unlocks
- Import of native events and measured usage into React history and date-correct daily statistics
- Native Android device diagnostics for:
  - manufacturer, brand, model, and device code
  - Android release and SDK level
  - package id, installed version name, and installed version code
  - locale and time zone
  - Usage Access and overlay status
  - app-wide notification status
  - protection-channel creation and enabled status
  - combined protection-notification readiness
  - battery exemption
  - persisted activation, running service, and installed configured apps
  - last protection start and stop timestamps
  - last stable stop code and readable stop reason
- Copyable JSON diagnostic snapshot in the development screen
- Visible diagnostic rows for build identity, channel-specific failure analysis, and protection lifecycle analysis
- Pure Java protection-rule policy with local JUnit coverage for:
  - weekday schedule boundaries
  - weekend precedence
  - daytime and overnight blocked ranges
  - invalid range fallback
  - exact daily-limit boundaries
  - Anti-Binge thresholds
  - daily emergency-unlock limits
- React and TypeScript coverage for:
  - unavailable apps
  - weekly schedule presets
  - Android diagnostics
  - version/build, protection-channel, and lifecycle diagnostics
  - explicit native stop-reason routing
  - required notification startup
  - successful Android runtime permission prompt
  - denied-prompt settings fallback
  - routing to the exact protection channel
  - browser-preview no-op behavior
- Verify workflow prepared to:
  - run all JavaScript release checks and tests
  - run `testDebugUnitTest`
  - compile `assembleDebug`
  - upload the debug APK and Android test report
- External GitHub Actions pinned to immutable commit SHAs
- Weekly Dependabot coverage for npm, Capacitor, React, Gradle, and GitHub Actions
- Dedicated transparency check guarding the complete notification flow, visible service status, channel consistency, permission revocation, and direct stop action
- Dedicated lifecycle check guarding persistent timestamps, reason codes, recovery failures, UI visibility, tests, and device evidence
- Mandatory Android device matrix guarded by `npm run check:device-matrix`
- Explicit release approval manifest under `config/release-approval.json`
- Strict release gate before release APK or AAB generation

The browser/PWA build remains a preview and cannot block other installed apps. Only the installed Android build can use the native protection service.

## Lifecycle Diagnostic Semantics

The lifecycle values are local diagnostic state, not analytics and not a guarantee that Android will keep a process alive.

A protection start stores the attempted start time. Every known controlled stop stores a timestamp, stable machine-readable code, and human-readable message. When a generic deactivation is immediately followed by a more specific runtime warning, the specific reason replaces the generic fallback.

Examples:

- `manual_app_stop`: stopped through the ScrollShield UI
- `protection_disabled`: generic native or notification deactivation fallback
- `migration_recovery`: stopped before legacy-data recovery
- `notifications_missing`: notification permission or protection channel disappeared
- `usage_access_missing`: Usage Access disappeared
- `overlay_permission_missing`: Overlay access disappeared
- `no_active_rules`: all active protection rules disappeared
- `target_app_missing`: the final installed active target disappeared
- `start_failed`: Android rejected native service startup
- `recovery_*`: reboot or app-update recovery could not continue

These values appear in the Debug screen and copied diagnostic JSON. They must be confirmed on physical devices because source-level implementation alone cannot prove persistence across vendor process management, reboot, app update, or storage edge cases.

## Commands

```bash
npm run android:configure
npm run android:doctor
npm run android:sync
npm run android:open
npm run android:build
npm run check:device-matrix
npm run check:lifecycle
npm run check:release-approval
npm run release:gate
npm run android:release
npm run android:bundle
```

`android:build` creates the debug APK without requiring production approval. `android:release` and `android:bundle` first execute the strict release gate and therefore remain blocked while mandatory evidence is incomplete.

## Mandatory Real-Device Evidence

The complete plan is in `docs/ANDROID_DEVICE_TEST_MATRIX.md`. At minimum, the release candidate requires current-build evidence for:

- Google Pixel or another physical near-stock device
- Samsung Galaxy
- Xiaomi or Redmi
- OnePlus
- Motorola
- an Android tablet
- Android 7 / API 24 fallback behavior
- Android 8 / API 26 channel behavior
- Android 13+ notification runtime permission
- permission and channel revocation while protection runs
- final protected-app uninstall and final-rule removal
- manual, migration, permission, configuration, and recovery stop-reason persistence
- reboot, app update, process termination, force-stop, and manufacturer battery restrictions
- twelve-hour battery and service reliability
- midnight, time-zone, daylight-saving, and manual-clock transitions
- maximum font scaling, large displays, rotation, multi-window, and TalkBack smoke testing

Every result must identify the exact installed version and build and include copied diagnostic JSON. Emulator-only completion is insufficient.

## Release Blockers

1. Execute the complete JavaScript verification suite, Android JUnit tests, and debug compilation in a working CI or local Android environment.
2. Execute `ProtectionStopReasonPolicyTest`, native bridge tests, App migration tests, and Debug diagnostic tests.
3. Complete `docs/ANDROID_DEVICE_TEST_MATRIX.md` with physical-device evidence.
4. Verify lifecycle timestamps and stop reasons after reopening the app, reboot, app update, permission loss, channel loss, rule removal, target removal, manual stop, and migration recovery.
5. Verify recovery and shutdown after process termination, device restart, app update, battery saver, manufacturer task killers, permission revocation, protection-channel deactivation, rule removal, and protected-app uninstall.
6. Test weekly schedules across device time-zone changes, daylight-saving transitions, midnight boundaries, and manual clock changes.
7. Validate V0.7-compatible and previous-release-candidate migrations.
8. Add a custom per-day/per-app schedule editor if preset schedules are insufficient for the first public release.
9. Validate cloned apps, work-profile packages, manufacturer variants, and region-specific package names.
10. Replace legal placeholders and finalize Play Console declarations, reviewer instructions, and permission demonstration videos.
11. Expand Android tests from pure rule logic to instrumentation coverage for service lifecycle, permission loss, overlays, countdowns, usage import, boot recovery, and package availability.
12. Measure battery consumption over long sessions and tune the foreground-app polling and installed-app health intervals before production rollout.
13. Inspect the final signed binary against privacy, permission, SDK, and store declarations.
14. Complete every field in `config/release-approval.json`, then record the responsible approver and approval time.

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
