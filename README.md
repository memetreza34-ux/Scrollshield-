# ScrollShield

ScrollShield is an offline-first digital wellbeing app for reducing impulsive social media use. The repository contains a production-oriented web/PWA experience and a Capacitor Android app.

## Start Here – Entwicklung von A bis Z

Wer ScrollShield entwickeln, prüfen oder veröffentlichen will, beginnt mit:

**[`docs/APP_DEVELOPMENT_A_TO_Z.md`](docs/APP_DEVELOPMENT_A_TO_Z.md)**

Das Master-Handbuch legt die verbindliche Reihenfolge vom Produktproblem über Architektur, UI, Daten, Native Android, Berechtigungen, Migration, Tests und CI bis zu Signing, Play Console, Closed Testing, Release-Evidence, Produktion, Rollout und Hotfix fest. Die übrigen Dokumente in `docs/` sind Detailquellen für einzelne Phasen.

## Current Scope

- App and short-video protection profiles
- Intentional opening delay and emergency unlock flows
- Focus sessions and local history/statistics
- Local-only storage with transactional saves, legacy migration, export, and reset support
- Recovery of complete interrupted storage transactions without replacing the last complete state with partial data
- Recognition of monolithic V2/unversioned state and the former V0.7/PRO storage keys
- Safe conversion of legacy events and saved-time data without automatically activating obsolete AI rules
- Byte-for-byte local archive of every discovered legacy value, included in normal JSON export/import
- PWA build, automated tests, CI and release-readiness checks
- Android native permission bridges with real Usage Access, overlay, notification, and battery-status checks
- Android 13+ runtime notification permission request and direct Android 8+ protection-channel settings
- Android whole-app protection using foreground-app detection, a foreground service, and a full-screen interruption overlay
- Explicit protection-service start/stop controls and a persistent stop action in the Android notification
- Required app-wide and protection-channel notification visibility before Android protection can start or recover after reboot
- Safe runtime shutdown after permission or notification-channel revocation, removal of all active rules, or loss of the final installed protected app
- Recovery of explicitly enabled protection after reboot or app update only while all required conditions remain valid
- Persistent protection lifecycle diagnostics with last start time, last stop time, stable stop code, and readable stop reason
- Explicit recovery failure codes for missing target apps, Usage Access, notifications, overlays, and Android service-start failures
- Explicit `migration_recovery` diagnostics when data recovery stops native protection
- Native session duration, daily limits, recurring weekly schedules, Anti-Binge thresholds, and emergency-unlock counters
- The running service uses the same pure Java rule policy covered by JUnit boundary tests
- Scoped installed-app validation for supported Android packages
- Import of measured native usage and protection decisions into local React statistics and history
- Native Android diagnostics with device, OS, version name, build number, permission, protection-channel, service, installed-target, and lifecycle status
- Copyable diagnostic JSON for reproducible real-device reports
- React and TypeScript tests for critical setup, permission-prompt, channel-routing, diagnostic, lifecycle, migration, export, and browser-fallback behavior
- Mandatory Android device matrix with manufacturer, Android-version, migration, lifecycle, battery, time-boundary, tablet, and accessibility coverage
- Explicit release approval manifest and strict gate before release APK or AAB generation
- CI prepared to run web verification, Android JUnit tests, debug APK compilation, and artifact upload
- External GitHub Actions pinned to immutable commit SHAs

The browser/PWA version cannot physically block other installed apps. Native whole-app protection is available only in the installed Android build and still requires successful compilation, real-device validation, battery testing, schedule edge-case testing, migration validation, legal completion, and Play Console review preparation before release.

The lifecycle implementation, JUnit classifier, TypeScript bridge tests, App integration tests, Debug component tests, complete verification chain, and Android compilation are prepared but have not yet executed successfully in a working runner or local Android environment. The lifecycle source block is frozen until that execution and physical-device evidence exist.

Reels-only protection remains an Android beta target because Usage Access identifies the foreground app but not the exact short-video screen inside a third-party app.

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
npm run check:device-matrix
npm run check:lifecycle
npm run check:migration
npm run check:release-approval
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
npm run release:gate
npm run android:release
npm run android:bundle
```

`android:sync` rebuilds the web app and copies it into the Capacitor Android project. `android:build` creates the debug APK and does not require production approval. `android:release` and `android:bundle` first execute the strict release gate. They remain blocked while `config/release-approval.json` contains incomplete evidence.

## Product and Release References

- `docs/APP_DEVELOPMENT_A_TO_Z.md` – master process from idea to production
- `docs/COMPETITOR_PRODUCT_BLUEPRINT.md`
- `docs/NATIVE_ANDROID.md`
- `docs/DATA_MIGRATION.md`
- `docs/ANDROID_DEVICE_TEST_MATRIX.md`
- `docs/RELEASE_CHECKLIST.md`
- `docs/RELEASE_EVIDENCE.md`
- `docs/ROLLOUT_PLAN.md`
- `docs/STORE_SUBMISSION_PACKET.md`
- `docs/ENGINEERING_CHECKS.md`
- `config/release-approval.json`

Before release, replace legal placeholders, run `npm run verify`, compile and inspect the Android debug build, validate lifecycle reason persistence, validate the legacy upgrade and export/import round trip on the exact candidate, complete the physical-device matrix with current-build diagnostic evidence, record reviewer evidence showing the matching Debug stop code and copied JSON, finalize store declarations and videos, inspect the signed binary, and complete the release approval manifest.
