# Engineering Checks

ScrollShield uses one primary verification command:

```bash
npm run verify
```

## JavaScript and Web Checks

The verification chain covers:

- supported Node and npm runtime
- TypeScript compilation
- ESLint
- Prettier formatting
- package/app/store version consistency
- release-approval schema and candidate-version consistency
- transactional and legacy-storage migration safeguards
- Android protection lifecycle and stop-reason diagnostics
- SDK registry and third-party notices
- committed-secret detection
- store copy, privacy declarations, and screenshot metadata
- release-readiness warnings
- Vitest component and logic tests
- accessibility source safeguards
- production Vite build
- PWA/service-worker output
- production privacy/network scan
- bundle-size budget

## Storage Migration Check

`npm run check:migration` protects the complete local-data migration contract:

- recognizes `scrollshield_state_v2` and the unversioned `scrollshield_state`
- recognizes former V0.7/PRO keys for brain state, events, rules, gamification, installation metadata, and old backups
- recognizes the former V0.7 backup-file structure and converts only safe values
- stages every current storage chunk under a `_pending` key before live data is replaced
- verifies staged and committed values byte-for-byte and returns explicit save success
- completes a whole pending transaction after a process interruption
- discards an incomplete pending set instead of replacing the last complete live state
- writes a byte-for-byte legacy archive before source deletion
- removes source keys only after both archive and normalized current-state writes are verified
- retains corrupted or unwritable legacy source data for retry or manual recovery
- converts only deterministic V0.7 events and saved-time values
- keeps obsolete generated rules archived and inactive
- preserves each converted event's original payload in history metadata
- includes the legacy archive in normal JSON exports and validates/restores it during import
- blocks normal saves, focus processing, native sync, and native draining while migration remains unresolved
- provides retry and local raw-data recovery actions
- requires regression tests for monolithic, unversioned, V0.7, write-failure, corrupted-source, pending-recovery, recovery-UI, and export/import cases

The implementation is in `src/lib/storage.ts`, `src/lib/dataExport.ts`, and `src/screens/MigrationRecoveryScreen.tsx`. The human validation contract is in `docs/DATA_MIGRATION.md`.

## Android Source Checks

`npm run check:android` guards:

- minimum, target, and compile SDK requirements
- package id and namespace
- release minification, resource shrinking, and signing configuration
- backup and cleartext-traffic restrictions
- approved Android permissions only
- foreground-service type and boot receiver registration
- scoped package visibility instead of broad installed-app access
- native protection and diagnostics registration
- explicit user activation and safe stop behavior
- installed-package validation and periodic runtime health checks
- recurring schedules, daily limits, Anti-Binge, and emergency counters
- actual service usage of the JUnit-tested `ProtectionRulePolicy`
- permission-loss, no-active-rule, removed-app, and boot-recovery safeguards
- explicit foreground-notification removal
- Java rule-policy tests and Android compile commands
- debug APK and unit-test report artifacts

## Protection Lifecycle Diagnostics Check

`npm run check:lifecycle` protects the complete Android start/stop diagnosis contract:

- native preferences retain the last protection start time
- native preferences retain the last stop time, stable stop code, and readable stop reason
- a generic deactivation reason is written first and may be replaced by a more specific system cause
- system warning events are classified by the pure Java `ProtectionStopReasonPolicy`
- JUnit tests cover Usage Access, Overlay, notification, missing-rule, missing-target, recovery, and unknown-warning codes
- Android service-start exceptions retain `start_failed`
- React may pass explicit stop reasons to Android
- normal manual stops retain `manual_app_stop`
- blocked data migration uses `migration_recovery`
- failed boot or app-update recovery clears persisted activation and records the exact `recovery_*` reason
- the native diagnostic snapshot exposes all lifecycle fields
- the TypeScript bridge preserves those fields
- the Debug screen displays start time, stop time, stop code, and stop message
- bridge, App-integration, and Debug-component tests protect the full route
- the physical-device matrix requires persistence evidence after reopening ScrollShield
- the reviewer flow must show the matching code and message in both the Debug rows and copied diagnostic JSON

The executable source contract is in `scripts/check-protection-lifecycle-diagnostics.ts`.

## Android Device-Matrix Check

`npm run check:device-matrix` protects the diagnostic and manual-test contract:

- installed Android version name and version code are exposed in the native diagnostic snapshot
- app-wide notification status and protection-channel status remain separately visible
- protection start/stop timestamps, stop code, and stop message remain visible and copyable
- the debug screen displays build identity, channel creation, channel enabled state, combined notification readiness, and lifecycle state
- the diagnostic component test covers a disabled-channel failure case and a stored stop reason
- required coverage includes Pixel, Samsung, Xiaomi/Redmi, OnePlus, Motorola, a tablet, Android 7, Android 8, and Android 13+
- mandatory scenarios include migration, runtime notification permission, channel revocation, permission loss, app uninstall, final-rule removal, reason persistence, reboot, long-run battery behavior, time-zone and daylight-saving changes, font scaling, tablet layout, and TalkBack
- every real-device result requires build identity, copied diagnostic JSON, screen evidence, logs for failures, and `PASS`, `FAIL`, or `BLOCKED` status

The executable source contract is in `scripts/check-android-device-matrix.ts`. The manual test plan is in `docs/ANDROID_DEVICE_TEST_MATRIX.md`.

## Protection Transparency Check

`npm run check:transparency` verifies the complete Android notification path:

- the dedicated notification plugin is registered in `MainActivity`
- `POST_NOTIFICATIONS` is declared through a Capacitor permission alias
- Android 13+ uses `requestPermissionForAlias` and a `PermissionCallback`
- Android 8+ opens the exact `Aktiver App-Schutz` channel when manual settings are needed
- Android 7 falls back to application details
- the protection service, status checker, and settings plugin share one channel id
- app-wide and channel-level notification disabling are detected
- Android protection cannot start while notifications are disabled
- reboot recovery does not restart an invisible service
- a running service stops, clears activation, records a warning, and preserves a diagnostic reason after notification revocation
- the foreground notification is removed when the service ends
- the ongoing foreground-service notification retains its direct `Schutz stoppen` action
- the permission screen marks notifications as required on Android
- the React start action blocks before native startup when the permission is absent
- the TypeScript bridge routes notification prompts and channel settings to the dedicated plugin
- other Android settings remain on the main native plugin
- browser preview calls remain no-ops
- component tests cover successful permission grant and denied-prompt fallback

## Release Approval Gate

`npm run check:release-approval` validates:

- approval-manifest schema version
- candidate version against `package.json`
- candidate version against Android `versionName`
- candidate build against Android `versionCode`

This non-strict check is included in `npm run verify` and reports the number of incomplete evidence items without pretending the release is approved.

`npm run release:gate` is strict. It blocks until all of the following are explicitly complete for the same candidate:

- complete web verification
- Android JUnit tests
- debug APK compilation and inspection
- physical-device matrix
- lifecycle reason persistence
- battery and process reliability
- V0.7 and previous-candidate migration
- final Play declarations
- final legal and support fields
- reviewer videos
- signed-binary inspection
- named approver and valid approval date

Both `npm run android:release` and `npm run android:bundle` execute this gate before Gradle. The current `config/release-approval.json` intentionally blocks release output.

## Android CI Stage

After the web verification passes, the GitHub workflow runs:

```bash
cd android
./gradlew testDebugUnitTest assembleDebug --no-daemon --stacktrace
```

A successful run uploads:

- the debug APK
- the local Android unit-test HTML report

All external GitHub Actions are pinned to immutable 40-character commit SHAs. Dependabot remains configured to propose controlled updates for GitHub Actions, npm, Capacitor, React, and Gradle.

## Current Execution Limitation

The workflow is configured but the repository account currently prevents GitHub-hosted runners from starting because of a billing or spending-limit restriction. Until a runner or local Android environment executes the commands above, compilation and test success remain unverified.

The new lifecycle source checker, JUnit policy test, TypeScript bridge test, App integration test, Debug component test, full TypeScript check, formatting check, and Android compilation have not executed successfully yet.

The lifecycle source and documentation block is frozen pending execution. Further source claims must not be treated as verified until the exact branch head completes the full verification chain and physical-device evidence.

A job with no runner and `steps: []` is an infrastructure block, not evidence that application code passed or failed.
