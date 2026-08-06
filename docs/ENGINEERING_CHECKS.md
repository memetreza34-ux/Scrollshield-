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
- a running service stops, clears activation, and records a warning after notification revocation
- the foreground notification is removed when the service ends
- the ongoing foreground-service notification retains its direct `Schutz stoppen` action
- the permission screen marks notifications as required on Android
- the React start action blocks before native startup when the permission is absent
- the TypeScript bridge routes notification prompts and channel settings to the dedicated plugin
- other Android settings remain on the main native plugin
- browser preview calls remain no-ops
- component tests cover successful permission grant and denied-prompt fallback

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
