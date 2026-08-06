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
- restored explicitly enabled protection after reboot and app update
- added safe shutdown after permission revocation
- added native session duration, daily limits, Anti-Binge thresholds, and emergency counters
- added recurring weekly morning, work/school, evening, night, and weekend enforcement
- added selectable weekly presets that update all active protected apps
- retained the existing blocked-hour range as a backward-compatible fallback
- added native history, decision, and measured-usage import into local React statistics
- added scoped package visibility and native installed-app validation
- added availability-aware app selection that disables unavailable Android apps
- added component tests for unavailable-app activation prevention and weekly preset updates
- documented competitor-led product priorities and platform limits

## Blocking release work

- successful JavaScript verification and Android compilation in a working build environment
- real-device reliability and battery testing across major Android manufacturers
- time-zone, daylight-saving, midnight, and manual-clock tests for recurring schedules
- optional custom per-day/per-app schedule editor if presets are insufficient
- cloned-app, work-profile, manufacturer, and regional package validation
- process-recovery, reboot, app-update, battery-saver, and permission-loss test matrix
- automated Android tests for the native rule engine and overlay lifecycle
- legal placeholder replacement and final Play Console declarations
- Reels-only beta and iOS native implementation
