# ScrollShield Release Evidence Contract

Status: **mandatory for the strict Android release gate**.

## Why this exists

A boolean such as `physicalDeviceMatrixPassed: true` is not evidence by itself. Release approval must identify which exact source candidate was tested and where the retained evidence can be found.

`config/release-approval.json` therefore uses schema version 2.

## Candidate freeze

Before collecting final release evidence:

1. choose the exact Git commit to test;
2. do not modify product code, Android code, release text, migration logic, permissions, or build configuration while collecting final evidence;
3. record that exact 40-character lowercase Git SHA as `candidateCommitSha` only when evidence collection is real;
4. every evidence record marked passed must repeat the same `candidateCommitSha`.

The current manifest intentionally leaves `candidateCommitSha` empty and all evidence flags false until real execution/device evidence exists.

## Evidence records

Every release flag has a matching record with:

- `candidateCommitSha`: exact tested source commit;
- `reference`: retained evidence identifier.

A reference can identify, for example:

- a GitHub Actions run/artifact;
- an archived local test report;
- an APK/AAB hash record;
- a physical-device matrix evidence folder;
- a migration comparison report;
- Play Console declaration evidence;
- reviewer-video storage/reference;
- a signed-binary inspection report.

The gate does not invent or auto-fill these values. Empty evidence remains an explicit blocker.

## Flag integrity

If a flag is set to `true`:

- the global `candidateCommitSha` must be a valid 40-character SHA;
- its evidence record must contain the identical SHA;
- its evidence reference must be non-empty;
- the reference is bounded and control-character-free.

This prevents an accidental `true` from being treated as sufficient proof.

## Strict approval integrity

`npm run release:gate` performs an additional Git comparison between the tested `candidateCommitSha` and the current `HEAD`.

After final candidate testing starts, the only repository path allowed to differ is:

`config/release-approval.json`

If any product code, Android source, build configuration, release documentation, store content, or other repository path changed after the tested candidate, the strict gate fails and a **new candidate must be tested**.

A shallow/local checkout that cannot resolve the tested candidate also fails closed; fetch the required Git history before approval.

## Approval sequence

Recommended final sequence:

1. freeze candidate commit;
2. run `npm run verify`;
3. run Android JUnit and build candidate APK/AAB;
4. complete the exact-candidate physical/OEM matrix;
5. complete migration, lifecycle, Commitment, adaptive-friction, battery and accessibility evidence;
6. complete store/legal/reviewer/signed-binary evidence;
7. write candidate-bound references into `config/release-approval.json` and set only actually passed flags to `true`;
8. set `approvedBy` and `approvedAt`;
9. run `npm run release:gate` with Git history containing the tested candidate;
10. only if the gate passes may release/bundle commands proceed.

## No evidence fabrication

Do not place placeholder URLs, invented hashes, synthetic device results, or guessed CI run IDs into the approval manifest. A missing evidence item remains blank/false until it genuinely exists.
