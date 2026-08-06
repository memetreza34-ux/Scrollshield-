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
- native plugin and diagnostics registration
- explicit user activation and safe stop behavior
- installed-package validation
- recurring schedules, daily limits, Anti-Binge, and emergency counters
- permission-loss shutdown and boot-recovery prerequisites
- Java rule-policy tests and Android compile commands
- debug APK and unit-test report artifacts

## Protection Transparency Check

`npm run check:transparency` verifies that:

- Android protection cannot start while notifications are disabled
- reboot recovery does not restart an invisible service
- the ongoing foreground-service notification retains its direct `Schutz stoppen` action
- the permission screen marks notifications as required on Android
- the React start action blocks before native startup when the permission is absent
- a component test protects this behavior

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
