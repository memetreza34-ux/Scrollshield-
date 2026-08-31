# ScrollShield

ScrollShield is an offline-first digital wellbeing app for reducing impulsive social media use. The repository contains a production-oriented web/PWA experience and a Capacitor Android app.

## Start Here – Entwicklung von A bis Z

Wer ScrollShield entwickeln, prüfen oder veröffentlichen will, beginnt mit:

**[`docs/APP_DEVELOPMENT_A_TO_Z.md`](docs/APP_DEVELOPMENT_A_TO_Z.md)**

Das Master-Handbuch arbeitet mit **15 Entwicklungs-Gates** von Produktanforderungen bis Production Operations.

Der aktuelle Projektstatus steht in:

**[`docs/DEVELOPMENT_GATES_STATUS.md`](docs/DEVELOPMENT_GATES_STATUS.md)**

Wichtige neue Detailverträge:

- [`docs/PRODUCT_REQUIREMENTS.md`](docs/PRODUCT_REQUIREMENTS.md) – PR-01 bis PR-18, v1-Scope und Akzeptanzkriterien
- [`docs/THREAT_MODEL.md`](docs/THREAT_MODEL.md) – Trust Boundaries, Missbrauchs-/Fehlermodelle und P0–P3
- [`docs/SUPPLY_CHAIN_SECURITY.md`](docs/SUPPLY_CHAIN_SECURITY.md) – npm/Gradle/GitHub-Actions-/Dependency-Regeln
- [`docs/PERFORMANCE_RELIABILITY.md`](docs/PERFORMANCE_RELIABILITY.md) – Performance-, Batterie- und 12h-Messvertrag
- [`docs/INCIDENT_RESPONSE.md`](docs/INCIDENT_RESPONSE.md) – Rollout-Stopp, Triage und Hotfix-Prozess

Die übrigen Dokumente sind Detailquellen für einzelne Gates.

## Current Scope

- Android whole-app protection for user-selected supported apps
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
- Native session duration, daily limits, recurring weekly schedules, Anti-Binge thresholds, adaptive friction, and emergency-unlock counters
- Commitment mode with bounded voluntary configuration freeze and recovery access
- Scoped installed-app validation for supported Android packages
- Import of measured native usage and protection decisions into local React statistics and history
- Native Android diagnostics with device, OS, version name, build number, permission, protection-channel, service, installed-target, and lifecycle status
- Copyable diagnostic JSON for reproducible real-device reports
- React and TypeScript tests for critical setup, permission-prompt, channel-routing, diagnostic, lifecycle, migration, export, commitment, and browser-fallback behavior
- Mandatory Android device matrix with manufacturer, Android-version, migration, lifecycle, battery, time-boundary, tablet, accessibility, commitment, and adaptive-friction coverage
- Two-stage release gating: verified source/unit/debug evidence before a signed candidate build, then full candidate-bound evidence before final approval
- Exact signed APK/AAB SHA-256 recording so final approval validates retained candidate bytes instead of rebuilding after binary inspection
- Explicit Android cloud-backup and device-to-device exclusions across Android 7+ while user-controlled JSON export/import remains supported
- FileProvider restricted to ScrollShield-owned internal/app-specific storage rather than broad public external storage
- CI prepared to run web verification, Android JUnit tests, debug APK compilation, and artifact upload
- Dependency-free package manifest/lockfile preflight before `npm ci`
- SHA-bound local verification runner for reproducible source/unit/debug-build evidence when hosted CI is unavailable
- External GitHub Actions pinned to immutable commit SHAs
- Android v1 manifest intentionally omits `android.permission.INTERNET`; the privacy build check blocks undocumented network APIs, tracker markers, and silent reintroduction of that permission
- Offline Android v1 build intentionally omits the Google Services/Firebase Gradle hook; Google Play Billing and Play Integrity remain separate reviewed dependencies

The browser/PWA version cannot physically block other installed apps. Native whole-app protection is available only in the installed Android build and still requires successful compilation, real-device validation, battery testing, schedule edge-case testing, migration validation, legal completion, and Play Console review preparation before release.

The complete verification chain and Android compilation are prepared but have not yet executed successfully in a working runner or local Android environment. GitHub-hosted Actions are currently prevented from starting by an account billing/spending-limit restriction. A workflow job that never starts is not evidence that application tests passed or failed.

Reels-only protection remains outside the v1 production claim because Usage Access identifies the foreground app but not the exact short-video screen inside a third-party app.

For iOS, real enforcement requires the Screen Time / Family Controls entitlement and native Managed Settings integration and is not part of the Android-v1 release gate.

The Android app id is currently `app.scrollshield.mobile`. Confirm this id before the first Play Console upload because package names are difficult to change after release.

## Run Locally

Prerequisites: Node.js 22.12+ and npm 10+.

Before installing dependencies, validate that `package.json` and the root metadata in `package-lock.json` agree:

```bash
node scripts/check-package-lock-sync.mjs
npm ci
npm run dev
```

Open the local Vite URL shown in the terminal, usually `http://localhost:3000`.

## Quality Commands

```bash
npm run check:lock-sync
npm run lint
npm run test
npm run build
npm run verify
npm run verify:android
npm run verify:full
npm run verify:local-evidence
npm run check:device-matrix
npm run check:lifecycle
npm run check:migration
npm run check:release-approval
npm run readiness
```

`check:lock-sync` is dependency-free and also runs in CI before `npm ci`, so manifest/lock drift fails with a precise error before installation. `verify:android` executes Android JUnit tests and compiles the debug APK through the platform-correct Gradle wrapper. `verify:full` runs the complete web/source verification first and then Android unit tests plus `assembleDebug`.

`verify:local-evidence` is the preferred evidence-producing fallback while GitHub-hosted runners cannot start. It requires a clean tracked Git working tree, binds the run to the exact current commit SHA, performs lock validation and `npm ci`, checks the Android toolchain, runs the complete source verification, executes Android unit tests, compiles the debug APK, and writes per-step logs plus `verification-report.json` under the ignored `.scrollshield-verification/` directory. A successful local report proves only that executed source/unit/debug-build path; physical-device, battery, migration, store, signing, and production gates remain separate.

## Android

Prerequisites: Node.js, Java 21+, and an Android SDK installation.

```bash
npm run android:configure
npm run android:doctor
npm run android:sync
npm run android:open
npm run android:build
```

`android:sync` rebuilds the web app and copies it into the Capacitor Android project. `android:build` creates the debug APK and does not require production approval.

### Signed release candidate

Do not use the final release gate to create the first signed candidate. First freeze the exact source candidate in `config/release-approval.json` and retain real passing evidence for web/source verification, Android JUnit and the debug APK. Then:

```bash
npm run release:candidate-gate
npm run android:candidate:release
npm run android:candidate:bundle
```

The candidate commands require the frozen source SHA, required pre-binary evidence, a clean tracked working tree and valid local release signing. They build the signed release APK/AAB and record the artifact SHA-256, size, source candidate SHA and build HEAD in the ignored `.scrollshield-release-candidate/` directory.

The signed candidate is **not yet approved for production**. Use that exact retained APK/AAB for physical-device/OEM testing, migration, lifecycle, battery, accessibility, Play/reviewer work and binary inspection. `evidence.signedBinary.reference` must retain the exact SHA-256 produced by the candidate recorder.

### Final approval – no rebuild

After all real candidate-bound evidence is complete:

```bash
npm run release:gate
npm run android:release
npm run android:bundle
```

The final `android:release` and `android:bundle` commands do **not** invoke Gradle. They run the strict final approval gate and then verify that the already-inspected retained APK/AAB still has the exact recorded SHA-256, size, version, versionCode and candidate SHA. If the binary is rebuilt or its bytes change, the retained binary evidence is invalid and a new candidate must be recorded and inspected.

For Google Play, upload the retained AAB that passed this final identity check; do not rebuild another bundle after review evidence was collected.

## Product and Release References

- `docs/APP_DEVELOPMENT_A_TO_Z.md` – master process
- `docs/DEVELOPMENT_GATES_STATUS.md` – live project status
- `docs/PRODUCT_REQUIREMENTS.md`
- `docs/THREAT_MODEL.md`
- `docs/SUPPLY_CHAIN_SECURITY.md`
- `docs/PERFORMANCE_RELIABILITY.md`
- `docs/NATIVE_ANDROID.md`
- `docs/DATA_MIGRATION.md`
- `docs/ANDROID_DEVICE_TEST_MATRIX.md`
- `docs/ENGINEERING_CHECKS.md`
- `docs/RELEASE_CHECKLIST.md`
- `docs/RELEASE_EVIDENCE.md`
- `docs/STORE_SUBMISSION_PACKET.md`
- `docs/ROLLOUT_PLAN.md`
- `docs/INCIDENT_RESPONSE.md`
- `config/release-approval.json`

Before release, the exact candidate must pass the automatic verification chain, Android JUnit/compilation, critical instrumentation, the physical device matrix, V0.7 migration evidence, reliability/battery testing, final privacy/legal/store review, signed-binary inspection, candidate-bound evidence, and the strict release gate. Final publication must use the exact retained signed artifact whose identity was inspected and approved.
