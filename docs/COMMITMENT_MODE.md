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

After activation there is no normal cancel button. The lock expires automatically at its deadline.

## What is frozen

While the lock is active, ScrollShield preserves the current:

- protected-app configuration;
- protection profiles;
- active profile;
- global protection level.

The visible app list disables app toggles, app-detail navigation, and recurring weekly-plan changes. The profile screen disables profile switching, creation, editing, and deletion. `App.tsx` independently guards those configuration writes so a missed UI control does not silently bypass the lock.

Runtime data continues to work normally. History, statistics, permission status, focus runtime, Android diagnostics, and native event draining are not frozen.

## Safety exits that must remain available

Commitment Mode must never remove:

- the Android overlay action that returns to the launcher/home screen;
- a configured bounded emergency unlock;
- Help and release disclosures;
- local data export and recovery tools;
- a complete ScrollShield app reset.

A complete reset intentionally clears the device-local commitment key together with all other `scrollshield_` storage. This destructive escape route is part of the safety contract, not a bug.

## Persistence and backup behavior

The active lock is stored locally as `scrollshield_commitment_lock_v1` and expires after at most 24 hours.

The lock is intentionally **not** part of a normal long-term ScrollShield backup. Restoring an old backup on another device must not resurrect a historical temporary lock. The raw recovery export can still capture ScrollShield-owned local keys when troubleshooting unresolved local data.

## Known anti-bypass limits

This version is not tamper-proof. Do not market it as impossible to bypass, parental control, device-owner enforcement, or an administrator lock.

Known escape or tamper paths include:

- full ScrollShield reset;
- clearing ScrollShield app data in Android settings;
- uninstalling ScrollShield;
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
2. persistence after closing and reopening ScrollShield;
3. app toggles, app details, weekly plans, and profile changes remaining read-only while active;
4. unrelated history/statistics/focus/runtime updates continuing normally;
5. automatic expiry at the configured deadline;
6. no normal cancel action during the active lock;
7. complete reset clearing the commitment key;
8. emergency/home safety exits remaining reachable in native protection;
9. manual-clock behavior documented rather than represented as tamper-proof.
