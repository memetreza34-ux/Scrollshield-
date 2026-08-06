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
- Screen recording for permission, overlay, notification, and recovery scenarios
- Relevant `adb logcat` excerpt for failures
- Result: `PASS`, `FAIL`, or `BLOCKED`
- Defect or GitHub issue reference for every failure

Do not reuse evidence from a different build number.

## Installation and Migration

| ID | Scenario | Acceptance criteria |
| --- | --- | --- |
| INST-01 | Clean install | App starts without crash, onboarding is usable, and no permission is granted implicitly. |
| INST-02 | Upgrade from the last V0.7-compatible data set | Existing profiles, rules, history, statistics, and permission flags migrate without destructive reset. |
| INST-03 | Upgrade from the previous release candidate | App version and build number change while local data remains intact. |
| INST-04 | Reinstall after uninstall | Local app data is removed as Android specifies; app starts in a clean onboarding state. |
| INST-05 | App update while protection is explicitly enabled | Protection recovers only when all required permissions, notification visibility, and an installed active target remain valid. |

## Permission and Notification Lifecycle

| ID | Scenario | Acceptance criteria |
| --- | --- | --- |
| PERM-01 | Android 13+ notification runtime prompt granted | System prompt appears once, status becomes ready, and protection can start. |
| PERM-02 | Android 13+ notification runtime prompt denied | Protection remains stopped and ScrollShield opens the relevant notification settings only after denial. |
| PERM-03 | App-wide notifications disabled before startup | Start is blocked before the foreground service launches. |
| PERM-04 | Only the `Aktiver App-Schutz` channel is disabled | Diagnostics distinguish app-wide permission from the disabled protection channel; protection cannot start. |
| PERM-05 | Protection channel disabled while service runs | Service stops, persisted activation clears, overlay disappears, foreground notification is removed, and a local warning event is recorded. |
| PERM-06 | Usage Access revoked while service runs | Service stops safely and a local warning event is recorded. |
| PERM-07 | Overlay permission revoked while service runs | Service stops safely and any visible overlay is removed. |
| PERM-08 | Battery optimization exemption absent | App explains reduced reliability without falsely claiming the exemption is mandatory. |
| PERM-09 | Android 7 notification action | The app opens a supported app-details fallback without crashing. |
| PERM-10 | Android 8+ protection-channel action | The app opens the exact ScrollShield protection-channel settings. |

## Protected-App Configuration Lifecycle

| ID | Scenario | Acceptance criteria |
| --- | --- | --- |
| APP-01 | Activate an installed supported app | Configuration synchronizes and the selected package is protected. |
| APP-02 | Attempt to activate an unavailable app | Controls remain disabled and a clear unavailable status is shown. |
| APP-03 | Uninstall one of several protected apps | Remaining installed active targets continue to work; unavailable status refreshes locally. |
| APP-04 | Uninstall the final installed protected app | Running service stops within the configuration-health interval and persisted activation clears. |
| APP-05 | Disable the final active rule | Running service stops and no empty foreground service remains. |
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
| LIFE-04 | Device reboot | Previously enabled protection recovers only when all prerequisites remain valid. |
| LIFE-05 | Manufacturer battery saver | Failures are recorded by manufacturer and mitigation copy remains honest. |
| LIFE-06 | Extreme battery saver / restricted background mode | App reports degraded or stopped protection instead of showing a false active state. |
| LIFE-07 | Twelve-hour active run | No runaway battery use, repeated overlays, duplicated notifications, or unbounded event growth. |

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

## Exit Criteria

The Android release candidate remains blocked until:

1. Every mandatory scenario above has current-build evidence.
2. No open blocker or critical defect remains.
3. Manufacturer-specific failures have either a verified fix or explicit release exclusion.
4. Battery behavior has been measured on physical devices.
5. The copied diagnostic JSON matches the installed version and build under test.
6. GitHub or local verification successfully runs TypeScript, React tests, Android JUnit tests, and `assembleDebug`.
7. Play reviewer videos demonstrate the same tested build.
