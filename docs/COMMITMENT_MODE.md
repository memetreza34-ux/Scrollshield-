# ScrollShield Commitment Mode

Status: **implemented as a bounded local anti-impulse control; not a tamper-proof parental-control lock**.

## Purpose

Commitment Mode freezes the current protection configuration for a deliberately chosen short period. Its purpose is to make an impulsive "just turn the blocker off" action harder after the user has already decided on their rules.

It is not intended to trap the user in another app, remove emergency access, or pretend that ScrollShield has device-owner privileges that it does not have.

## Supported durations

The release UI offers only:

- 1 hour
- 8 hours
- 24 hours

There is no unlimited or multi-day lock in this first implementation.

## Deliberate activation

Activation is two-step:

1. choose the duration;
2. read the warning and press `Verbindlich starten`.

Selecting a duration alone does not activate the lock.

The final confirmation performs a live readiness check before the local lock is written. Commitment may start only when all of the following are true:

- the installed runtime is native Android;
- at least one protection rule is active;
- at least one active target app is actually installed/available on the device;
- the native protection service reports `running=true`;
- persisted native activation reports `enabled=true`.

If installation state cannot be checked, the service is stopped, or `running` and `enabled` are inconsistent, Commitment remains inactive and the UI routes the user toward either app selection or the protection-status screen. This prevents a frozen configuration from being presented as meaningful protection when the Android enforcement service is not actually active.

After activation there is no normal cancel button. The lock expires automatically at its deadline.

## What is frozen

While the lock is active, ScrollShield preserves the current:

- protected-app configuration;
- protection profiles;
- active profile;
- global protection level.

The visible app list disables app toggles, app-detail navigation, and recurring weekly-plan changes. The profile screen disables profile switching, creation, editing, and deletion. `App.tsx` independently guards those configuration writes so a missed UI control does not silently bypass the lock.

The normal **in-app service stop is also disabled while the native service is running during Commitment**. The status screen continues to show the real service state, but its normal stop action becomes read-only. This closes the easiest in-app bypass without pretending that ScrollShield controls Android itself.

Runtime data continues to work normally. History, statistics, permission status, focus runtime, Android diagnostics, and native event draining are not frozen.

## Recovery while Commitment is active

The activation gate requires a live service only at the moment Commitment begins. Android can still revoke a permission, kill a process, disable notifications, or lose a target later.

Commitment must therefore **not** freeze recovery controls. While rules remain read-only, the user may still:

- open the protection-status screen;
- grant/re-grant Usage Access, overlay, and notification access;
- restart the Android protection service when prerequisites are valid;
- reinstall the same configured target app;
- use the documented emergency/home safety exits;
- perform a complete ScrollShield reset if recovery is impossible.

A stopped service may be **started** again during Commitment; only the normal in-app stop of an already-running service is blocked. A later service failure must be displayed honestly through the normal lifecycle diagnostics. The mere presence of an active Commitment lock must never cause the UI to claim that native protection is still running.

## Safety exits that must remain available

Commitment Mode must never remove:

- the Android overlay action that returns to the launcher/home screen;
- a configured bounded emergency unlock;
- Help and release disclosures;
- local data export and migration/recovery evidence;
- a complete ScrollShield app reset.

A complete reset intentionally sends an explicit native stop with lifecycle code `factory_reset`, then clears the device-local Commitment key together with all other `scrollshield_` storage. The factory reset is treated as a deliberate neutral stop rather than a service failure. This destructive escape route is part of the safety contract, not a bug.

## Android-system controls remain outside the lock

Commitment v1 does not own the Android operating system. Android may still expose system-level controls capable of ending the foreground service, including notification/system service controls, force-stop, app-data clearing, or uninstall.

The ScrollShield UI must state this honestly. Blocking the normal in-app stop is deliberate anti-impulse friction; it is not evidence of device-owner enforcement or an impossible-to-bypass lock.

## Backup import during Commitment

Normal **export stays available** while Commitment is active so the user can always preserve owned data.

A full JSON **import is temporarily disabled** until the Commitment expires or the user deliberately performs a complete app reset. Import can replace protected-app rules and profiles, so allowing it during Commitment would either bypass the lock or create a misleading partial restore.

The central commitment guard therefore rejects full-state replacements atomically while active, and the release privacy surface disables the file input. It must never report a partial imported state as a successful restore.

## Persistence and backup behavior

The active lock is stored locally as `scrollshield_commitment_lock_v1` and expires after at most 24 hours.

The lock is intentionally **not** part of a normal long-term ScrollShield backup. Restoring an old backup on another device must not resurrect a historical temporary lock. The raw recovery export can still capture ScrollShield-owned local keys when troubleshooting unresolved local data.

## Known anti-bypass limits

This version is not tamper-proof. Do not market it as impossible to bypass, parental control, device-owner enforcement, or an administrator lock.

Known escape or tamper paths include:

- full ScrollShield reset;
- Android notification/system controls that can end the foreground service;
- clearing ScrollShield app data in Android settings;
- force-stopping or uninstalling ScrollShield;
- sufficiently manipulating wall-clock time because the first implementation uses a bounded local timestamp;
- modifying the application/runtime on a rooted or otherwise compromised device.

A later stronger Android commitment implementation can use native monotonic/boot-aware timing and additional anti-tamper evidence, but only after it has a safe recovery design and physical-device testing.

## Subscription policy

Commitment is a strong candidate for a future paid tier only after purchase, restore, refund/revocation, offline entitlement, and downgrade behavior are implemented and tested.

Until that billing lifecycle exists, ScrollShield must not present Commitment Mode as a paid entitlement or claim that a Pro purchase can unlock it.

Core safety exits, data rescue, diagnostics, export, migration archives, and user-owned existing data must remain usable independently of subscription state.

## Required verification

Before calling Commitment Mode release-verified, evidence must cover:

1. the two-step activation flow;
2. refusal on the iOS preview/non-native runtime;
3. refusal when no protection app is active;
4. refusal when every active target app is unavailable/uninstalled;
5. refusal when the native service is stopped or `running`/`enabled` are inconsistent;
6. successful activation only with at least one installed active app and `running=true`, `enabled=true`;
7. persistence after closing and reopening ScrollShield;
8. app toggles, app details, weekly plans, profile changes, and the normal in-app service stop remaining read-only while active;
9. unrelated history/statistics/focus/runtime updates continuing normally;
10. protection permissions/status remaining repairable and a stopped service remaining restartable after a later service failure;
11. automatic expiry at the configured deadline;
12. no normal cancel action during the active lock;
13. complete reset issuing `factory_reset`, stopping native protection, and clearing the Commitment key;
14. emergency/home safety exits remaining reachable in native protection;
15. export remaining available while full backup import is disabled and atomically rejected;
16. Android system-level stop/data-clear/uninstall bypasses documented rather than represented as impossible;
17. manual-clock behavior documented rather than represented as tamper-proof.
