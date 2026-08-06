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
- connected the running Android service to the JUnit-tested `ProtectionRulePolicy`
- added native session duration, daily limits, Anti-Binge thresholds, and emergency counters
- added recurring weekly morning, work/school, evening, night, and weekend enforcement
- added selectable weekly presets that update all active protected apps
- retained the existing blocked-hour range as a backward-compatible fallback
- added native history, decision, and measured-usage import into local React statistics
- added scoped package visibility and native installed-app validation
- added availability-aware app selection that disables unavailable Android apps
- added periodic runtime validation for removed or uninstalled protected apps
- added native device, permission, service, locale, and time-zone diagnostics with copyable JSON output
- added component tests for unavailable-app activation prevention, weekly preset updates, diagnostics, required notifications, runtime prompt success, and denied-prompt fallback
- added direct TypeScript bridge tests for notification prompt routing, protection-channel settings, other Android settings, and browser no-op behavior
- added a pure Java protection-rule policy with JUnit boundary coverage
- prepared CI to run Android unit tests and compile the debug APK
- prepared successful CI runs to publish the debug APK and Android test report as downloadable workflow artifacts
- pinned every external GitHub Action to an immutable commit SHA
- expanded weekly Dependabot coverage to npm, Capacitor, React, Gradle, and GitHub Actions
- expanded static project checks to guard native service, transparency, channel consistency, diagnostics, schedule, package, boot-recovery, rule-test, workflow-pin, and artifact requirements
- aligned release and store checkers with the honest version-one whole-app scope and non-medical positioning
- aligned the store submission packet with exact Data Safety and `FOREGROUND_SERVICE_SPECIAL_USE` declarations
- documented competitor-led product priorities and platform limits

## Blocking release work

- successful execution of JavaScript verification, Android JUnit tests, and debug compilation in a working runner or local Android environment
- real-device reliability and battery testing across major Android manufacturers
- time-zone, daylight-saving, midnight, and manual-clock tests for recurring schedules
- optional custom per-day/per-app schedule editor if presets are insufficient
- cloned-app, work-profile, manufacturer, and regional package validation
- process-recovery, reboot, app-update, battery-saver, runtime-notification, channel-deactivation, protected-app-uninstall, and permission-loss test matrix
- Android instrumentation tests for service lifecycle and overlays beyond the current pure rule-policy and React coverage
- legal placeholder replacement and final Play Console declarations
- Reels-only beta and iOS native implementation
