# ScrollShield Data Migration Contract

This document defines the data-preservation requirements for upgrading older ScrollShield installations to the current local storage architecture.

## Supported legacy sources

The migration layer recognizes all known historical storage formats:

- `scrollshield_state_v2`: previous monolithic application state
- `scrollshield_state`: unversioned monolithic application state
- `scrollshield_brainState`: V0.7 / former PRO brain-state data
- `scrollshield_events`: V0.7 impulse events
- `scrollshield_rules`: V0.7 generated rules
- `scrollshield_game`: V0.7 gamification data
- `scrollshield_installed_at`: V0.7 installation metadata
- `scrollshield_backup_v15`: former backup payload, when present

The current version uses separated V3 chunks for settings, profiles, statistics, history, and metadata.

## Transactional write protocol

Every current-format save follows this sequence:

1. Serialize every required chunk in memory.
2. Write all chunks to matching `_pending` keys.
3. Read every pending value back and compare it byte-for-byte.
4. Commit every live chunk, with the metadata chunk included in the same verified transaction.
5. Read every live value back and compare it byte-for-byte.
6. Remove the pending keys only after the complete commit succeeds.

At startup, ScrollShield checks pending keys before reading live state:

- a complete pending set is committed again, allowing recovery after a process interruption;
- an incomplete pending set is discarded without replacing the last complete live state.

`saveState` returns an explicit Boolean success result. Migration code must never assume that a caught storage exception means the write succeeded.

## V0.7 conversion rules

Values that have a safe current equivalent are converted:

- legacy impulse events become current history events;
- Instagram, TikTok, YouTube, Facebook, Snapchat, and exact X/Twitter names map to current app identifiers;
- blocked, delayed-opened, emergency-unlocked, and reflection-cancelled outcomes retain their semantic event type;
- the former `savedTimeMinutesToday` value is retained in current local statistics;
- a local migration history entry states how many events and rules were discovered.

Values without a deterministic current equivalent remain archived:

- old generated AI rules are **not** automatically activated;
- old gamification state is not presented as current progress;
- obsolete brain metrics are not converted into medical, behavioural, or effectiveness claims;
- every converted event retains its original payload in history metadata.

A previous user is treated as having already used the application, so V0.7 migration does not force them through a destructive first-run reset.

## Lossless archive

Before legacy source keys are removed, ScrollShield writes their exact original string values to:

`scrollshield_legacy_v07_archive_v1`

The archive records:

- source format;
- capture time;
- every original key;
- every original value without reparsing or reformatting.

Legacy source keys are removed only when both conditions are true:

1. the archive was written and read back exactly;
2. the normalized current state was written and read back successfully.

If either operation fails, the original legacy source remains untouched for a later retry or manual recovery. Corrupted monolithic JSON is never deleted automatically.

The normal ScrollShield JSON export includes this archive when present. Import validates its complete structure and restores it only after validation succeeds.

## Release-candidate validation

For each release candidate, use the exact candidate version and build number and verify:

1. Start with only `scrollshield_state_v2`; confirm settings, goals, history, and statistics survive.
2. Repeat with only `scrollshield_state`.
3. Start with the V0.7 separated keys and confirm converted history, saved time, emergency entries, and the migration notice.
4. Confirm old generated rules remain inactive.
5. Compare every archived raw value byte-for-byte with its source value.
6. Simulate a storage write failure and confirm the source key remains.
7. Simulate a complete pending transaction with a damaged live chunk and confirm startup recovery.
8. Simulate an incomplete pending set and confirm it does not replace the last complete state.
9. Export the migrated installation, clear local data, import the export, and compare the restored archive.
10. Upgrade a physical Android installation containing representative V0.7 WebView data and capture the copied diagnostic JSON plus screenshots of retained history/statistics.

`config/release-approval.json` must keep `migrationValidationPassed` set to `false` until these checks have passed on the exact signed release candidate.

## Deliberate limitations

- The archive preserves old data; it does not make obsolete features part of version 1.0.
- No former AI rule is trusted as an executable current protection rule.
- No old metric is used to claim treatment, diagnosis, addiction recovery, or guaranteed behavioural outcomes.
- A user-triggered factory reset deletes current data, pending data, legacy source keys, and the legacy archive by design.
