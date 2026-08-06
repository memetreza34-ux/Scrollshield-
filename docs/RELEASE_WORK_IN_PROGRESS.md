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
- documented competitor-led product priorities and platform limits

## Blocking release work

- successful JavaScript verification and Android compilation in a working build environment
- real-device reliability testing across major Android manufacturers
- native history/statistics event bridge
- native enforcement of schedules, daily limits, anti-binge rules, and emergency counters
- restart-after-boot and process-recovery validation
- legal placeholder replacement and final Play Console declarations
- Reels-only beta and iOS native implementation
