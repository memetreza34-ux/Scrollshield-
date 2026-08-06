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
- `scrollshield_backup_v15`: former locally stored backup payload, when present
- former exported backup files containing `schemaVersion`, `brainState`, `impulseEvents`, `aiRules`, and `userGamification`

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

If any legacy source remains unresolved, the public application save path returns `false`. Only the internal migration transaction may write current chunks while legacy data exists. This prevents the React default state from creating a valid V3 metadata marker after a failed migration.

Partially written current chunks are never sent through generic orphan-state normalization while a legacy source exists. A complete pending transaction must recover first, or the migration remains blocked.

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

After a recovered pending commit, source cleanup compares the current legacy value with the archived value again. A changed or mismatched source is never deleted. If the current state exists but an earlier archive attempt failed, ScrollShield retries the missing archive before cleanup.

The normal ScrollShield JSON export includes this archive when present. Import validates its complete structure and restores it only after validation succeeds.

## Former backup-file import

The current import parser also recognizes the former V0.7 backup-package shape:

- numeric `schemaVersion`;
- optional `appVersion` and `exportedAt`;
- object or null `brainState`;
- array `impulseEvents`;
- array `aiRules`;
- object or null `userGamification`.

A valid former backup is converted into the current supported ScrollShield export contract before the UI imports it. Safe event and saved-time values follow the same conversion rules as an installed V0.7 upgrade.

The complete original file string is stored under the archive entry `scrollshield_backup_v15_file`. The original generated rules and gamification payload remain inside that archive and are not executed or represented as current achievements.

Malformed former backup packages are rejected before any local archive is written.

## Blocked migration recovery UI

If startup still finds unresolved legacy data after the safe migration attempt, ScrollShield does not enter the normal application:

- automatic current-state saves remain paused;
- focus runtime updates remain paused;
- native configuration synchronization and native event draining remain paused;
- an existing Android protection service is stopped;
- the dedicated recovery screen explains that original data remains present;
- the screen does not offer reset or uninstall as a recovery action;
- the user can retry the migration;
- the user can download a local recovery package before taking any external support action.

The recovery package contains every local-storage entry whose key starts with `scrollshield_`, including original legacy sources, the exact archive, current chunks, and pending transaction chunks. Unrelated website or application keys are excluded.

The package is a recovery artifact, not a supported normal-state import. It exists to preserve evidence and enable manual reconstruction if automated migration cannot complete.

## Release-candidate validation

For each release candidate, use the exact candidate version and build number and verify:

1. Start with only `scrollshield_state_v2`; confirm settings, goals, history, and statistics survive.
2. Repeat with only `scrollshield_state`.
3. Start with the V0.7 separated keys and confirm converted history, saved time, emergency entries, and the migration notice.
4. Import a representative former V0.7 backup file and confirm the same safe conversion.
5. Confirm old generated rules remain inactive in both installed-upgrade and file-import flows.
6. Compare every archived raw value byte-for-byte with its source value.
7. Compare the archived former backup file string byte-for-byte with the selected file.
8. Simulate a storage staging failure and a partial live-commit failure; confirm the source remains and no default V3 save can run.
9. Confirm the blocked migration screen appears, stops native protection, pauses save/sync/drain, and creates a complete recovery package.
10. Simulate a complete pending transaction with a damaged live chunk and confirm startup recovery.
11. Simulate an incomplete pending set and confirm it does not replace the last complete state.
12. Export the migrated installation, clear local data, import the export, and compare the restored archive.
13. Upgrade a physical Android installation containing representative V0.7 WebView data and capture the copied diagnostic JSON plus screenshots of retained history/statistics.

`config/release-approval.json` must keep `migrationValidationPassed` set to `false` until these checks have passed on the exact signed release candidate.

## Deliberate limitations

- The archive preserves old data; it does not make obsolete features part of version 1.0.
- No former AI rule is trusted as an executable current protection rule.
- No old metric is used to claim treatment, diagnosis, addiction recovery, or guaranteed behavioural outcomes.
- A user-triggered factory reset deletes current data, pending data, legacy source keys, and the legacy archive by design.
