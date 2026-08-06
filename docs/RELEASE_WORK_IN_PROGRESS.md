# Release Work in Progress

This branch is the active ScrollShield release foundation.

## Completed in this change set

- restored the production-oriented app codebase
- restored PWA, Android wrapper, tests, CI, release checks, and store documentation
- replaced Android demo permission toggles with real system status and settings links
- added a user-controlled Android foreground protection service
- added foreground-app detection based on Usage Access
- added a full-screen local protection overlay with delay, strict blocking, return-to-home, and temporary access
- synchronized selected app configurations and focus-mode state into the native Android layer
- added persistent notification and direct stop action
- required enabled notifications before initial service startup or boot recovery so protection cannot run without its normal visible stop control
- added the Android 13+ runtime notification prompt using Capacitor's native permission callback flow
- added direct Android 8+ navigation to the `Aktiver App-Schutz` notification channel and an Android 7 app-details fallback
- added app-wide and channel-level notification health checks
- updated the permission UI to mark notifications as required on Android, request them directly, and block startup before the native call
- added safe runtime shutdown when notifications, Usage Access, overlay access, active rules, or installed target apps disappear
- explicitly removes the foreground notification when the service stops
- restored explicitly enabled protection after reboot and app update only while all required conditions remain valid
- failed reboot or app-update recovery now clears stale activation and records the exact missing prerequisite
- added persistent lifecycle diagnostics for last start time, last stop time, stable stop code, and readable stop message
- added stable runtime codes for missing Usage Access, Overlay, notifications, active rules, and installed target apps
- added stable recovery codes for missing reboot/app-update prerequisites and native service-start failure
- added explicit `migration_recovery` stop diagnostics before blocked legacy-data recovery
- exposed lifecycle fields through native diagnostics, TypeScript types, visible Debug rows, and copied diagnostic JSON
- added pure Java `ProtectionStopReasonPolicy` and JUnit classification coverage
- added TypeScript native-stop routing tests, App migration integration assertions, and Debug lifecycle rendering tests
- added `check:lifecycle` to `npm run verify` and the readiness report
- added mandatory physical-device lifecycle persistence scenario `LIFE-08`
- connected the running Android service to the JUnit-tested `ProtectionRulePolicy`
- added native session duration, daily limits, Anti-Binge thresholds, and emergency counters
- added recurring weekly morning, work/school, evening, night, and weekend enforcement
- added selectable weekly presets that update all active protected apps
- retained the existing blocked-hour range as a backward-compatible fallback
- added native history, decision, and measured-usage import into local React statistics
- added scoped package visibility and native installed-app validation
- added availability-aware app selection that disables unavailable Android apps
- added periodic runtime validation for removed or uninstalled protected apps
- expanded native diagnostics with installed version name, version code, app-wide notification status, protection-channel creation, channel enabled state, combined notification readiness, and lifecycle state
- added visible build, notification-channel, and lifecycle diagnostics with copyable JSON output
- added component tests for unavailable-app activation prevention, weekly preset updates, expanded diagnostics, required notifications, runtime prompt success, and denied-prompt fallback
- added direct TypeScript bridge tests for notification prompt routing, protection-channel settings, native stop reasons, other Android settings, and browser no-op behavior
- added a pure Java protection-rule policy with JUnit boundary coverage
- added a mandatory Android device matrix covering manufacturers, Android generations, migration, permissions, service lifecycle, stop-reason persistence, rule boundaries, battery, time changes, large screens, and accessibility
- added `check:device-matrix` to guard the diagnostic contract, required scenarios, and evidence fields
- added an explicit release approval manifest tied to Android and package versions
- added a non-strict approval schema check to `npm run verify`
- added a strict `release:gate` before release APK and AAB generation
- added transactional local saves with verified `_pending` staging and startup recovery after an interrupted commit
- added explicit Boolean save success so migrations cannot delete old data after a hidden storage failure
- added migration support for `scrollshield_state_v2`, unversioned `scrollshield_state`, and the former V0.7/PRO key set
- added safe V0.7 conversion for legacy events and saved time without automatically activating obsolete generated rules
- added direct conversion of former V0.7 backup files while archiving the complete original file string
- added a byte-for-byte local archive of every discovered legacy value before source deletion
- added archive preservation through normal ScrollShield JSON export and validated import
- added a blocked-migration recovery screen with retry, local raw-data backup, and deliberate native protection shutdown
- blocked normal saves, focus updates, native sync, and native draining while legacy data remains unresolved
- added regression tests for monolithic, unversioned, V0.7, failed-write, corrupted-source, interrupted-transaction, recovery UI, lifecycle stop reason, and archive round-trip cases
- added `check:migration` to `npm run verify` and the readiness report
- documented the complete data-preservation contract in `docs/DATA_MIGRATION.md`
- replaced the obsolete release checklist with the actual native permissions, testing, legal, store, migration, lifecycle, and device requirements
- prepared CI to run Android unit tests and compile the debug APK
- prepared successful CI runs to publish the debug APK and Android test report as downloadable workflow artifacts
- pinned every external GitHub Action to an immutable commit SHA
- expanded weekly Dependabot coverage to npm, Capacitor, React, Gradle, and GitHub Actions
- expanded static project checks to guard native service, transparency, channel consistency, diagnostics, lifecycle, migration, schedule, package, boot recovery, rule tests, workflow pins, artifacts, device matrix, and release approval requirements
- aligned release and store checkers with the honest version-one whole-app scope and non-medical positioning
- aligned the store submission packet with exact Data Safety and `FOREGROUND_SERVICE_SPECIAL_USE` declarations
- documented competitor-led product priorities and platform limits

## Blocking release work

- successful execution of JavaScript verification, Android JUnit tests, and debug compilation in a working runner or local Android environment
- actual execution of the new lifecycle, migration, export, and storage-failure regression tests
- actual Android compilation of `ProtectionStopReasonPolicy`, updated native plugins, BootReceiver, and diagnostics bridge
- physical validation that lifecycle timestamps and codes survive app reopening, reboot, app update, and manufacturer process management
- physical Android upgrade validation using representative V0.7 WebView/local-storage data
- byte-for-byte comparison of the migrated legacy archive after export, reset, and import on the exact candidate build
- completed physical-device evidence from `docs/ANDROID_DEVICE_TEST_MATRIX.md`
- real-device reliability and battery testing across major Android manufacturers
- time-zone, daylight-saving, midnight, and manual-clock tests for recurring schedules
- previous-candidate migration validation
- optional custom per-day/per-app schedule editor if presets are insufficient
- cloned-app, work-profile, manufacturer, and regional package validation
- process-recovery, reboot, app-update, battery-saver, runtime-notification, channel-deactivation, protected-app-uninstall, permission-loss, and lifecycle-reason testing
- Android instrumentation tests for service lifecycle and overlays beyond the current pure policy, JVM, TypeScript, and React coverage
- legal placeholder replacement and final Play Console declarations
- reviewer videos recorded with the exact candidate build
- signed binary inspection against privacy and store declarations
- completion of all release approval flags, approver identity, and approval time
- Reels-only beta and iOS native implementation

`config/release-approval.json` intentionally keeps `migrationValidationPassed` and the other evidence flags incomplete. Release APK and AAB commands must continue to fail until the blockers above have evidence for the exact candidate version and build.
