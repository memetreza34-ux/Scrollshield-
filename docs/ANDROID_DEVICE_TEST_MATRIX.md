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
- Screen recording for permission, overlay, notification, migration, lifecycle, recovery, commitment, adaptive-friction, and lifecycle-race scenarios
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
| APP-07 | Durable config sync before protection start | Start protection after changing active targets or rules. Native sync must return only after `configJson`, unavailable-app metadata, and a new `protectionConfigGeneration` are durably committed. The following start request must expose the same `startRequestConfigGeneration`; if the candidate commit is forced to fail but rollback succeeds, no Android service start may be dispatched and the previous durable config remains authoritative. |
| APP-08 | Config generation changes before start confirmation | Pause after a valid start request is persisted but before the foreground start is confirmed, then durably sync a different config generation. The delayed confirmation must fail closed with `start_failed`, must not advance `lastProtectionStartAt`, and must clear activation rather than running under an unbound configuration. |
| APP-09 | Candidate and rollback persistence both fail | Force the candidate config commit to fail and force restoration of the previous tuple to report failure too. `protectionConfigWriteStateCertain` must become `false` / Debug `UNSICHER`; no new app start, boot/update recovery start, pending-current acceptance, or foreground confirmation may be accepted in that process. A service that was already running must keep its last published confirmed rules and must not publish the rejected candidate. Restore storage, perform a clean successful config sync, verify `protectionConfigWriteStateCertain=true` / Debug `SICHER`, and only then allow a new generation-bound start. |
| APP-10 | Runtime grant and overlay invalidation across config generations | Under durable generation `G1`, obtain a normal temporary session or emergency release and separately leave an intervention overlay visible. Durably sync a changed generation `G2` that modifies, tightens, or disables the same rule. The old temporary grant must stop authorizing access as soon as `G2` is current, the `G1` overlay must be removed/rebuilt from `G2`, and an already-queued `G1` `Bewusst öffnen`/emergency action must not create a new temporary grant or append an `open`/`emergency` event after `G2`. During an APP-09 `UNSICHER` state, by contrast, the running service must continue only its last already-published confirmed generation until a clean sync succeeds. |

## Commitment Mode Lifecycle

| ID | Scenario | Acceptance criteria |
| --- | --- | --- |
| COMMIT-01 | Valid commitment activation | On native Android with at least one active installed target and a healthy service, the final confirmation reads the current native status, requires `running=true` and `enabled=true`, persists the selected 1 h / 8 h / 24 h deadline, and immediately makes app/profile/rule controls read-only. |
| COMMIT-02 | Invalid commitment prerequisites | iOS/non-native runtime, zero active rules, every active target unavailable, `running=false`, or `running=true` with `enabled=false` must leave Commitment inactive. The UI must direct the user to `Apps prüfen` or `Schutzstatus öffnen` where applicable and must not persist `scrollshield_commitment_lock_v1`. |
| COMMIT-03 | Native service stops after activation | After a valid Commitment starts, revoke a required permission or otherwise stop the service. The lock remains active and rules stay frozen, but the dashboard changes to `Commitment aktiv · Android-Schutz läuft nicht`, shows the latest stop code when available, and routes to protection status. Repairing permissions/restarting protection remains possible without weakening the frozen rules. |
| COMMIT-04 | Backup and reset while active | Normal JSON export remains available. Full backup import is disabled and centrally rejected atomically; no partial import is reported as success. A deliberately confirmed full app reset remains available, sends native stop reason `factory_reset`, stops protection, removes `scrollshield_commitment_lock_v1`, and clears local ScrollShield data. |
| COMMIT-05 | Expiry and restart | Close/reopen ScrollShield during the lock and verify the same deadline remains visible. At the exact deadline the lock clears automatically and rule editing becomes available again. Manual clock-change behavior is recorded separately and never described as tamper-proof. |
| COMMIT-06 | In-app service-stop bypass | With Commitment active and native protection running, `Schutzdienst stoppen` is not available; the panel shows `Stop während Commitment gesperrt`, and invoking the screen path must not call the native stop method. If the service is already stopped, `Schutzdienst starten` remains available for recovery. Android notification/system controls remain documented external bypasses rather than being described as impossible. |

## Adaptive Anti-Binge Friction

| ID | Scenario | Acceptance criteria |
| --- | --- | --- |
| ADAPT-01 | Disabled and below-threshold baseline | With Anti-Binge disabled, repeated intentional opens always use the configured base opening delay. With Anti-Binge enabled but recent successful `Bewusst öffnen` actions still below the warning threshold, the base delay is also unchanged. Merely showing the overlay or returning home must not increment the counter. |
| ADAPT-02 | Progressive warning friction | With a 10-second base delay and warning threshold 3, perform three successful intentional opens inside the warning window. The next normal opening waits exactly 15 seconds; the next counted repeat waits 20 seconds. Continue until the adaptive delay reaches 60 seconds and verify it never exceeds that cap. A manually configured base delay above 60 seconds must never be shortened. |
| ADAPT-03 | Strict threshold precedence | Reach the configured Anti-Binge block threshold inside its block window. The result must be the existing strict Anti-Binge block; adaptive friction must not turn that strict result back into a normal `Bewusst öffnen` path. |
| ADAPT-04 | Emergency and safety separation | Trigger adaptive friction and then separately trigger a strict emergency path. The adaptive opening count must not be incremented by the emergency unlock, the emergency countdown/reason/daily maximum remain governed by the emergency configuration, and `Zurück zum Startbildschirm` stays immediately reachable. |
| ADAPT-05 | Midnight and transparent evidence | Create successful intentional opens immediately before and after local midnight within the configured short warning window. The recent-open count must include eligible events across the day boundary, the exact effective adaptive delay must be shown in the overlay and local warning event, and no cloud/network dependency is required. |

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
| RULE-10 | Anti-Binge warning threshold | Warning appears at the configured recent-open count and adaptive normal-opening friction follows the ADAPT contract. |
| RULE-11 | Anti-Binge block threshold | Strict block appears at the configured recent-open count and takes precedence over adaptive normal-opening friction. |
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
| LIFE-08 | Protection lifecycle reason persistence | Trigger a manual app stop, migration-recovery stop, factory-reset stop, notification loss, Usage Access loss, Overlay loss, final-target removal, final-rule removal, notification-action stop, unexpected service destruction, and failed boot/app-update recovery. After each case and after reopening ScrollShield, `lastProtectionStartRequestAt`, `lastProtectionStartAt`, `lastProtectionStopAt`, `lastProtectionStopCode`, and `lastProtectionStopMessage` remain accurate and visible in both the debug report and copied JSON. |
| LIFE-09 | Stored activation without running service | Create or reproduce `enabled=true` with `running=false`. A fresh unconfirmed request must first show `STARTET`; after the 15-second confirmation window it must show `START ABGEBROCHEN` and offer `Schutz erneut starten`. A confirmed start that later disappears without terminal stop must instead show `PROZESS ABGEBROCHEN` and `Schutz wiederherstellen`. A running service with `enabled=false` must be labeled `INKONSISTENT`. |
| LIFE-10 | Notification action and unexpected service destroy | Stop protection with the persistent notification action and verify `lastProtectionStopCode=notification_action_stop`, activation clears, overlay disappears, and reopening the app shows a deliberate stop. Separately terminate the service through a path that invokes `onDestroy()` while the current confirmed activation is still enabled and no controlled stop was requested; verify activation clears, a local system warning is queued, and `lastProtectionStopCode=unexpected_service_destroy`. Controlled app, migration, permission, target, rule, factory-reset, pending-start, and stale-service shutdowns must retain their original/current generation and must never be overwritten by `unexpected_service_destroy`. |
| LIFE-11 | Emergency unlock friction and reason privacy | With a strict protected app and emergency access enabled, verify `requireCountdown=true` enforces the additional strict countdown before unlock; `requireReason=true` keeps the emergency action disabled for empty or two-character input and permits it only after a normalized reason of at least three characters. Verify the reason is bounded to 160 characters, appears only in the local emergency history event, and is not transmitted to a developer server. With `requireCountdown=false`, only the configured normal opening delay applies rather than a forced 30-second emergency delay. With `requireReason=false`, a reason is not required. The configured daily emergency maximum must still be enforced exactly, and returning home must always remain available instead of forcing an unlock. |
| LIFE-12 | Terminal stop wins before delayed start confirmation | Start protection and pause execution after `lastProtectionStartRequestAt` is persisted but before the foreground start is confirmed. Trigger a manual or notification terminal stop first, then allow the delayed service creation/confirmation to continue. `enabled` must remain false, `lastProtectionStartAt` must not advance for the stopped generation, the exact terminal stop code/message and event queue must remain unchanged, and no `start_failed` or `unexpected_service_destroy` may overwrite the winning stop. |
| LIFE-13 | Duplicate start while confirmation is pending | Issue a second start action while the first request is still inside the 15-second `start-pending` window. The native request generation must not be refreshed, only one logical start remains pending, no duplicate foreground notification/service instance is created, and the UI keeps `Start wird bestätigt…` disabled until native truth changes. |
| LIFE-14 | Immediate stop then restart before old service teardown | With a confirmed running service, issue a controlled app stop and immediately start protection again before the old instance has completed `onDestroy()`. The new `lastProtectionStartRequestAt` must be strictly greater than the stop timestamp, the new generation must reach a confirmed `lastProtectionStartAt`, and the old instance's later teardown must not write `unexpected_service_destroy`, clear the new activation, remove the new stop/start diagnosis, or leave the final service state falsely stopped. |
| LIFE-15 | Stale notification stop action after confirmed restart | Capture or queue the notification stop action while generation `R1` owns the foreground service. Perform a controlled stop and confirm a newer restart generation `R2`, then deliver/provoke the old `R1` action. The stale action must not change `enabled`, `lastProtectionStartRequestAt`, `lastProtectionStartAt`, stop code/message, or event history, and must not stop the `R2` service. Then use the currently visible `R2` notification action and verify it still stops normally with exact `lastProtectionStopCode=notification_action_stop`. |

## Time and Calendar Boundaries

| ID | Scenario | Acceptance criteria |
| --- | --- | --- |
| TIME-01 | Local midnight crossing | Daily usage, opens, and emergency counters move to the correct date. |
| TIME-02 | Time-zone change | Schedules and daily statistics use the new local zone without corrupting historical dates. |
| TIME-03 | Daylight-saving transition | Repeated or skipped clock time does not crash the service or duplicate counters. |
| TIME-04 | Manual clock change forward and backward | No negative usage is stored; temporary access and countdown behavior remain bounded. Lifecycle request/start/stop ordering must remain logically monotonic even when the wall clock moves backward. |
| TIME-05 | Weekend transition | Friday-to-Saturday and Sunday-to-Monday precedence is correct. |

## UI, Accessibility, and Large Screens

| ID | Scenario | Acceptance criteria |
| --- | --- | --- |
| UI-01 | Maximum Android font scaling | Core permission, start/stop, return, and emergency actions remain readable and reachable. |
| UI-02 | Display-size scaling | No critical action is clipped. |
| UI-03 | Tablet portrait and landscape | Debug report, permission flow, app list, and overlay remain usable. |
| UI-04 | Multi-window where supported | Overlay and service state do not enter a crash loop. |
| UI-05 | TalkBack smoke test | Permission and service controls expose understandable labels and state. |
| UI-06 | Small display, maximum font and software keyboard | On a strict block with emergency reason enabled, use the maximum font scale and a small-phone display, focus the reason field so the software keyboard is visible, and verify the overlay remains vertically scrollable. `Zurück zum Startbildschirm`, the reason field and the enabled `Notfall` action must remain reachable without closing the keyboard or rotating the device. Record a screen capture of the exact candidate. |

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
- `protectionConfigGeneration`
- `protectionConfigWriteStateCertain`
- `startRequestConfigGeneration`
- `lastProtectionStartRequestAt`
- `lastProtectionStartAt`
- `lastProtectionStopAt`
- `lastProtectionStopCode`
- `lastProtectionStopMessage`

The in-app Permissions status panel must derive its label from both persisted activation and live service state. It must not collapse `enabled` and `running` into one boolean.

Lifecycle-race evidence must capture diagnostic JSON before and after each boundary. The ordered relation between `lastProtectionStartRequestAt`, `lastProtectionStartAt`, and `lastProtectionStopAt` is part of acceptance, not just the visible button label.

For `APP-07` through `APP-10`, additionally capture `protectionConfigGeneration`, `protectionConfigWriteStateCertain`, and `startRequestConfigGeneration`. For `APP-10`, also capture event history before/after the stale overlay action and screen-record the visible overlay/grant transition across `G1 → G2`; no post-`G2` `open`/`emergency` event may be attributable to the stale `G1` action.

For `LIFE-15`, additionally capture the generation carried by the stale action if instrumentation/debug hooks are used, plus the current `lastProtectionStartRequestAt` before and after delivery. The stale action must produce no new terminal evidence.

Commitment evidence must show the exact native `running` and `enabled` state immediately before activation, the installed-target result, the persisted deadline, the blocked in-app stop action, recovery start availability, and the dashboard response if native protection later stops.

Adaptive-friction evidence must show the base delay, recent successful intentional-open count, warning threshold/window, resulting effective delay, the 60-second cap, strict-threshold precedence, and that emergency timing is unchanged. The overlay/local event must expose the effective escalation without claiming AI or cloud inference.

Emergency-friction evidence must additionally prove the exact candidate honors `requireCountdown` and `requireReason`, keeps the normalized reason local, bounds it to 160 characters, and never bypasses the daily emergency maximum.

Overlay-accessibility evidence must additionally prove that the exact candidate remains scrollable under maximum font scale and a visible software keyboard, and that both the safe return-home action and the emergency action remain reachable.

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
6. Lifecycle request/start/stop timestamps and stop codes persist correctly for manual, migration, factory-reset, notification-action, unexpected-destroy, permission, configuration, recovery, delayed-confirmation, immediate-restart, and stale-notification-action cases.
7. Controlled shutdown paths, terminal stop winners, newer restart generations, and current notification-action generations retain their specific evidence instead of being overwritten by delayed start confirmation, stale actions, or `unexpected_service_destroy`.
8. The Permissions screen correctly distinguishes `start-pending`, `start-interrupted`, `unclean-process-stop`, active, deliberately stopped, stale-activation, and running-without-activation states.
9. `LIFE-12` through `LIFE-15` pass on the exact candidate, including strict request/stop/restart ordering, old-service teardown isolation, and stale notification-action rejection.
10. `APP-07` through `APP-10` pass on the exact candidate, proving durable config commit before start, fail-closed behavior on config change before confirmation, start/recovery blocking during unresolved double-write uncertainty, preservation of the last published confirmed runtime state during uncertainty, and invalidation of old temporary grants/overlay actions after a new durable generation is published.
11. Emergency unlock countdown/reason friction and the daily maximum pass `LIFE-11` on the exact candidate without network transmission of the local reason.
12. `UI-06` proves the block overlay remains scrollable and both safe-return and emergency actions stay reachable with maximum font scaling and the software keyboard visible.
13. The copied diagnostic JSON matches the installed version and build under test.
14. GitHub or local verification successfully runs TypeScript, React tests, migration tests, Android JUnit tests, instrumentation, and `assembleDebug`.
15. Play reviewer videos demonstrate the same tested build.
16. `COMMIT-01` through `COMMIT-06` pass on the exact candidate, including refusal before live protection is ready, blocked in-app stop, restart recovery, explicit factory-reset shutdown, and honest dashboard recovery after a later native-service failure.
17. `ADAPT-01` through `ADAPT-05` pass on the exact candidate, including deterministic 5-second escalation, the 60-second cap, strict Anti-Binge precedence, non-counting safety paths, unchanged emergency timing, and local-midnight behavior.
