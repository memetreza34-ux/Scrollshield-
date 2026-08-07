# Android Device Test Matrix

This matrix is mandatory before ScrollShield can leave draft-release status. Record the exact app version, build number, Android version, manufacturer software version, and copied native diagnostic JSON for every run.

## Required Device Coverage

| Device family | Required coverage | Primary risks |
| --- | --- | --- |
| Google Pixel | Current Pixel on the latest supported stable Android release | Baseline Android behavior, runtime permissions, foreground-service lifecycle |
| Samsung Galaxy | Current Galaxy phone with One UI | Background restrictions, battery management, overlays, notification channels |
| Xiaomi / Redmi | Current device with HyperOS or MIUI | Aggressive process termination, autostart behavior, overlays, battery saver |
| OnePlus | Current device with OxygenOS | Background activity controls, notification behavior, process recovery |
| Motorola | Current near-stock Android device | Minimum vendor customization baseline and lower-memory behavior |
| Android tablet | At least one tablet in portrait and landscape | Large-screen layout, rotation, overlay sizing, multi-window behavior |
| Minimum-SDK device | Android 7 / API 24 emulator or physical device | Legacy notification-settings fallback and service compatibility |
| Android 8 device | Android 8 / API 26 emulator or physical device | Notification-channel creation and foreground-service requirements |
| Android 13+ device | Android 13 or newer | `POST_NOTIFICATIONS` runtime prompt and denied-permission behavior |

A release candidate must pass on at least one physical Pixel or near-stock device and at least three physical manufacturer variants. Emulator-only completion is not sufficient.

## Build Identity and Evidence

Capture the following before each scenario:

- Date and tester
- Manufacturer, model, device code
- Android release, SDK level, manufacturer software version
- ScrollShield version name and version code
- Installation source: debug APK, internal testing, closed testing, or release candidate
- Clean install or upgrade path
- Copied Android diagnostic JSON
- Screen recording for permission, overlay, notification, migration, lifecycle, and recovery scenarios
- Relevant `adb logcat` excerpt for failures
- Result: `PASS`, `FAIL`, or `BLOCKED`
- Defect or GitHub issue reference for every failure

Do not reuse evidence from a different build number.

## Installation and Migration

| ID | Scenario | Acceptance criteria |
| --- | --- | --- |
| INST-01 | Clean install | App starts without crash, onboarding is usable, and no permission is granted implicitly. |
| INST-02 | Upgrade from installed V0.7/PRO local data | Former brain state, events, rules, gamification, installation metadata, and backup values are discovered. Safe events and saved time appear in current history/statistics; old generated rules remain inactive; every original value exists byte-for-byte in `scrollshield_legacy_v07_archive_v1` before old keys are removed. |
| INST-03 | Upgrade from the previous release candidate | App version and build number change while current profiles, rules, history, statistics, and settings remain intact. |
| INST-04 | Reinstall after uninstall | Local app data is removed as Android specifies; app starts in a clean onboarding state. |
| INST-05 | App update while protection is explicitly enabled | Protection recovers only when all required permissions, notification visibility, and an installed active target remain valid. |
| INST-06 | Import former V0.7 backup file | A valid package containing `brainState`, `impulseEvents`, `aiRules`, and `userGamification` converts safe events and saved time, leaves obsolete rules inactive, and archives the complete original file string. Malformed legacy files are rejected before local archive changes. |
| INST-07 | Migration write failure | Simulated quota/write failure leaves every original legacy source untouched and does not create a false successful metadata marker. |
| INST-08 | Interrupted storage commit | A complete `_pending` set repairs a damaged live chunk at startup; an incomplete pending set does not replace the last complete state. |
| INST-09 | Export-reset-import after migration | Current state and the byte-for-byte V0.7 archive survive normal export, factory reset, and validated import. |

## Permission and Notification Lifecycle

| ID | Scenario | Acceptance criteria |
| --- | --- | --- |
| PERM-01 | Android 13+ notification runtime prompt granted | System prompt appears once, status becomes ready, and protection can start. |
| PERM-02 | Android 13+ notification runtime prompt denied | Protection remains stopped and ScrollShield opens the relevant notification settings only after denial. |
| PERM-03 | App-wide notifications disabled before startup | Start is blocked before the foreground service launches. |
| PERM-04 | Only the `Aktiver App-Schutz` channel is disabled | Diagnostics distinguish app-wide permission from the disabled protection channel; protection cannot start. |
| PERM-05 | Protection channel disabled while service runs | Service stops, persisted activation clears, overlay disappears, foreground notification is removed, a local warning event is recorded, and `lastProtectionStopCode` is `notifications_missing`. |
| PERM-06 | Usage Access revoked while service runs | Service stops safely, a local warning event is recorded, and `lastProtectionStopCode` is `usage_access_missing`. |
| PERM-07 | Overlay permission revoked while service runs | Service stops safely, any visible overlay is removed, and `lastProtectionStopCode` is `overlay_permission_missing`. |
| PERM-08 | Battery optimization exemption absent | App explains reduced reliability without falsely claiming the exemption is mandatory. |
| PERM-09 | Android 7 notification action | The app opens a supported app-details fallback without crashing. |
| PERM-10 | Android 8+ protection-channel action | The app opens the exact ScrollShield protection-channel settings. |

## Protected-App Configuration Lifecycle

| ID | Scenario | Acceptance criteria |
| --- | --- | --- |
| APP-01 | Activate an installed supported app | Configuration synchronizes and the selected package is protected. |
| APP-02 | Attempt to activate an unavailable app | Controls remain disabled and a clear unavailable status is shown. |
| APP-03 | Uninstall one of several protected apps | Remaining installed active targets continue to work; unavailable status refreshes locally. |
| APP-04 | Uninstall the final installed protected app | Running service stops within the configuration-health interval, persisted activation clears, and diagnostics retain `target_app_missing`. |
| APP-05 | Disable the final active rule | Running service stops, no empty foreground service remains, and diagnostics retain `no_active_rules`. |
| APP-06 | Clone or work-profile variant | Record package visibility and behavior; do not mark supported unless the exact package is validated. |

## Protection Rule Matrix

| ID | Scenario | Acceptance criteria |
| --- | --- | --- |
| RULE-01 | Standard opening delay | Full-screen branded pause appears and countdown completes once. |
| RULE-02 | Return to home | Action removes the overlay and returns to the launcher. |
| RULE-03 | Intentional temporary session | Access lasts for the configured session duration and measured use is imported locally. |
| RULE-04 | Session expiry | The next protected foreground detection shows the intervention again. |
| RULE-05 | Strict mode | Normal continuation is unavailable; only an eligible emergency release can proceed. |
| RULE-06 | Daily limit exact boundary | Limit activates at the configured minute boundary, not one minute later. |
| RULE-07 | Daytime blocked range | Start is inclusive and end is exclusive. |
| RULE-08 | Overnight blocked range | Both sides of midnight are enforced correctly. |
| RULE-09 | Weekly morning, work, evening, night, and weekend rules | Each window activates at its documented boundary with weekend precedence. |
| RULE-10 | Anti-Binge warning threshold | Warning appears at the configured recent-open count. |
| RULE-11 | Anti-Binge block threshold | Strict block appears at the configured recent-open count. |
| RULE-12 | Emergency daily maximum | Releases stop exactly at the configured daily maximum and reset on the next local day. |
| RULE-13 | Focus-mode block behavior | Only apps configured for focus blocking are blocked during an active focus session. |

## Process, Reboot, and Battery Reliability

| ID | Scenario | Acceptance criteria |
| --- | --- | --- |
| LIFE-01 | Swipe ScrollShield away from recents | Behavior is documented per device; protection does not silently claim to run when stopped. |
| LIFE-02 | Force-stop from Android settings | Protection remains stopped until the user explicitly opens and re-enables it. |
| LIFE-03 | Normal process termination by Android | Service recovery follows Android rules and retains visible notification requirements. |
| LIFE-04 | Device reboot | Previously enabled protection recovers only when all prerequisites remain valid. A failed recovery clears persisted activation and records the exact `recovery_*` stop code. |
| LIFE-05 | Manufacturer battery saver | Failures are recorded by manufacturer and mitigation copy remains honest. |
| LIFE-06 | Extreme battery saver / restricted background mode | App reports degraded or stopped protection instead of showing a false active state. |
| LIFE-07 | Twelve-hour active run | No runaway battery use, repeated overlays, duplicated notifications, or unbounded event growth. |
| LIFE-08 | Protection lifecycle reason persistence | Trigger a manual app stop, migration-recovery stop, notification loss, Usage Access loss, Overlay loss, final-target removal, final-rule removal, notification-action stop, unexpected service destruction, and failed boot/app-update recovery. After each case and after reopening ScrollShield, `lastProtectionStartAt`, `lastProtectionStopAt`, `lastProtectionStopCode`, and `lastProtectionStopMessage` remain accurate and visible in both the debug report and copied JSON. |
| LIFE-09 | Stored activation without running service | Create or reproduce `enabled=true` with `running=false`. The Permissions screen must show `NEUSTART NÖTIG`, must display the exact last stop code and message when present, must offer `Schutzdienst starten`, and must never label the service `AKTIV`. A running service with `enabled=false` must be labeled `INKONSISTENT` and offer a stop action. |
| LIFE-10 | Notification action and unexpected service destroy | Stop protection with the persistent notification action and verify `lastProtectionStopCode=notification_action_stop`, activation clears, overlay disappears, and reopening the app shows a deliberate stop. Separately terminate the service through a path that invokes `onDestroy()` while protection is still enabled and no controlled stop was requested; verify activation clears, a local system warning is queued, and `lastProtectionStopCode=unexpected_service_destroy`. Controlled app, migration, permission, target, and rule shutdowns must retain their original codes and must never be overwritten by `unexpected_service_destroy`. |
| LIFE-11 | Emergency unlock friction and reason privacy | With a strict protected app and emergency access enabled, verify `requireCountdown=true` enforces the additional strict countdown before unlock; `requireReason=true` keeps the emergency action disabled for empty or two-character input and permits it only after a normalized reason of at least three characters. Verify the reason is bounded to 160 characters, appears only in the local emergency history event, and is not transmitted to a developer server. With `requireCountdown=false`, only the configured normal opening delay applies rather than a forced 30-second emergency delay. With `requireReason=false`, a reason is not required. The configured daily emergency maximum must still be enforced exactly, and returning home must always remain available instead of forcing an unlock. |

## Time and Calendar Boundaries

| ID | Scenario | Acceptance criteria |
| --- | --- | --- |
| TIME-01 | Local midnight crossing | Daily usage, opens, and emergency counters move to the correct date. |
| TIME-02 | Time-zone change | Schedules and daily statistics use the new local zone without corrupting historical dates. |
| TIME-03 | Daylight-saving transition | Repeated or skipped clock time does not crash the service or duplicate counters. |
| TIME-04 | Manual clock change forward and backward | No negative usage is stored; temporary access and countdown behavior remain bounded. |
| TIME-05 | Weekend transition | Friday-to-Saturday and Sunday-to-Monday precedence is correct. |

## UI, Accessibility, and Large Screens

| ID | Scenario | Acceptance criteria |
| --- | --- | --- |
| UI-01 | Maximum Android font scaling | Core permission, start/stop, return, and emergency actions remain readable and reachable. |
| UI-02 | Display-size scaling | No critical action is clipped. |
| UI-03 | Tablet portrait and landscape | Debug report, permission flow, app list, and overlay remain usable. |
| UI-04 | Multi-window where supported | Overlay and service state do not enter a crash loop. |
| UI-05 | TalkBack smoke test | Permission and service controls expose understandable labels and state. |

## Diagnostics Contract

Every copied diagnostic JSON must contain at least:

- `capturedAt`
- manufacturer, brand, model, and device
- Android release and SDK level
- package name, version name, and version code
- locale and time zone
- Usage Access and overlay status
- app-wide notification status
- protection-channel creation and enabled status
- combined protection-notification readiness
- battery optimization exemption
- persisted protection activation and live service state
- whether an installed configured target is available
- `lastProtectionStartAt`
- `lastProtectionStopAt`
- `lastProtectionStopCode`
- `lastProtectionStopMessage`

The in-app Permissions status panel must derive its label from both persisted activation and live service state. It must not collapse `enabled` and `running` into one boolean.

Emergency-friction evidence must additionally prove the exact candidate honors `requireCountdown` and `requireReason`, keeps the normalized reason local, bounds it to 160 characters, and never bypasses the daily emergency maximum.

Migration evidence must additionally include:

- exact list of source keys or the former backup filename;
- pre-upgrade source-value hashes or byte counts;
- post-upgrade archive-value hashes or byte counts;
- screenshots of converted history and statistics;
- confirmation that old generated rules are not active;
- exported archive comparison after reset and import.

## Exit Criteria

The Android release candidate remains blocked until:

1. Every mandatory scenario above has current-build evidence.
2. No open blocker or critical defect remains.
3. Manufacturer-specific failures have either a verified fix or explicit release exclusion.
4. Battery behavior has been measured on physical devices.
5. Installed V0.7 upgrade, direct former-backup import, write-failure retention, pending recovery, and export/import archive round trip have passed.
6. Lifecycle stop codes and timestamps persist correctly for manual, migration, notification-action, unexpected-destroy, permission, configuration, and recovery failures.
7. Controlled shutdown paths retain their specific reason instead of being overwritten by `unexpected_service_destroy`.
8. The Permissions screen correctly distinguishes active, deliberately stopped, stale-activation, and running-without-activation states.
9. Emergency unlock countdown/reason friction and the daily maximum pass `LIFE-11` on the exact candidate without network transmission of the local reason.
10. The copied diagnostic JSON matches the installed version and build under test.
11. GitHub or local verification successfully runs TypeScript, React tests, migration tests, Android JUnit tests, and `assembleDebug`.
12. Play reviewer videos demonstrate the same tested build.
