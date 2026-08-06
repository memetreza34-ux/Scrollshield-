# ScrollShield Store Review Risks

This document records the current platform and review risks for the first public release. It is not evidence of approval.

## Critical Release Risks

### 1. Android binary has not been compiled in a working runner

The GitHub workflow is configured for JavaScript verification, Android JUnit tests, and `assembleDebug`, but the account billing or spending-limit restriction prevents the hosted runner from starting. A job with no runner and `steps: []` does not validate or invalidate the code.

Mitigation:

- keep the pull request in draft
- keep all release-approval flags false
- run `npm run verify`, `testDebugUnitTest`, and `assembleDebug` in a working environment
- archive the exact APK and test report for the candidate build

### 2. Foreground service visibility and special-use review

ScrollShield relies on a user-started foreground service to identify user-selected foreground apps and apply local interventions. Google Play may scrutinize whether the use is user-benefiting, visible, interruptible, and accurately declared.

Mitigation:

- require app-wide notifications and the `Aktiver App-Schutz` channel
- use the Android 13+ runtime notification prompt
- show an ongoing notification with a direct `Schutz stoppen` action
- stop the service if notification visibility is revoked
- remove the foreground notification when the service ends
- provide the exact `FOREGROUND_SERVICE_SPECIAL_USE` declaration and reviewer video

### 3. Usage Access and overlay permissions

`PACKAGE_USAGE_STATS` and `SYSTEM_ALERT_WINDOW` are sensitive and must remain limited to the documented whole-app protection use case.

Mitigation:

- prominent in-app disclosure before permission use
- no reading of screen content, messages, input, or media
- no developer-server transmission of usage history
- protection remains user-selected and locally configured
- safe shutdown after either permission is revoked
- reviewer video demonstrates purpose and fallback behavior

### 4. Package visibility

Play review may reject unnecessarily broad installed-app access.

Mitigation:

- do not request `QUERY_ALL_PACKAGES`
- use finite `<queries>` entries for supported target apps
- use visibility only to show availability and prevent non-functional configurations
- do not collect, transmit, share, sell, or monetize an installed-app inventory

### 5. Manufacturer-specific background restrictions

Foreground-service, reboot, process-recovery, overlay, and battery behavior can differ across Pixel, Samsung, Xiaomi/Redmi, OnePlus, Motorola, and tablets.

Mitigation:

- complete `docs/ANDROID_DEVICE_TEST_MATRIX.md`
- record version name, version code, diagnostic JSON, screen evidence, and logs for failures
- test reboot, app update, process termination, force-stop, manufacturer battery saver, and twelve-hour operation
- do not claim reliable support for an untested manufacturer or package variant

### 6. Notification-channel-only deactivation

A user can leave app-wide notifications enabled while disabling only the ScrollShield protection channel. A simple app-wide check would falsely report readiness.

Mitigation:

- diagnose app-wide notification status separately from channel creation and channel importance
- prevent start when the protection channel is disabled
- stop the running service if the channel becomes invisible
- include the disabled-channel case in component and physical-device tests

### 7. Data migration and candidate identity

A release can appear functional while damaging existing V0.7-compatible profiles, rules, history, or statistics. Evidence from a different build is not valid for the current candidate.

Mitigation:

- expose installed version name and version code in native diagnostics
- copy diagnostic JSON for every test run
- test clean install, V0.7-compatible upgrade, previous-candidate upgrade, app update while protection is enabled, uninstall, and reinstall
- do not reuse evidence from another build number

### 8. Schedule and local-time boundaries

Daily counters, overnight ranges, recurring schedules, emergency limits, and temporary access can be affected by midnight, time-zone changes, daylight-saving transitions, and manual clock changes.

Mitigation:

- use the shared JUnit-tested `ProtectionRulePolicy` for deterministic rule boundaries
- complete the mandatory time-boundary matrix on devices
- verify that no negative usage or duplicated counters are stored

### 9. Claims and positioning

Claims of guaranteed Reels/Shorts detection, medical treatment, ADHD treatment, or universal blocking would exceed the current implementation and increase policy risk.

Mitigation:

- position version one as user-controlled whole-app digital-wellbeing and self-control tooling
- state that Usage Access identifies the foreground app, not a specific feed or sub-screen
- keep Reels-only detection as a future beta requiring separate design and review
- avoid medical, diagnostic, or treatment claims

### 10. Legal, support, and privacy placeholders

Store submission is blocked while legal identity, address, responsible person, support mailbox, privacy domain, declarations, and reviewer media remain incomplete.

Mitigation:

- complete every manual field in `docs/STORE_SUBMISSION_PACKET.md`
- verify the public privacy page and monitored support mailbox
- inspect the final signed binary against the exact Data Safety and permission declarations
- record reviewer videos using the uploaded candidate build

## iOS Risks

The current project does not contain an approved Family Controls entitlement or native Managed Settings enforcement. The PWA cannot replace Apple's Screen Time APIs.

Mitigation:

- do not submit iOS until entitlement approval and native implementation are present
- keep Apple review notes limited to functionality demonstrated by the exact binary
- test permission, shielding, recovery, and local data behavior on real iPhone/iPad devices

## Enforced Release Position

`config/release-approval.json` is intentionally incomplete. `npm run android:release` and `npm run android:bundle` execute the strict release gate before Gradle. Release output must remain blocked until verification, Android tests, debug compilation, physical-device matrix, battery reliability, migration, Play declarations, legal fields, reviewer videos, signed-binary inspection, approver identity, and approval time are complete for the exact candidate.
