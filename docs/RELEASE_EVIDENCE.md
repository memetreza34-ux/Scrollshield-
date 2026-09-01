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

## Two-stage signed candidate model

The signed release artifact must exist **before** final binary inspection, reviewer evidence and final release approval can be completed. Therefore ScrollShield separates two different gates.

### Stage 1 – source candidate readiness

`npm run release:candidate-gate` is a pre-binary gate. It requires:

- a frozen exact `candidateCommitSha`;
- matching package version, Android `versionName` and `versionCode`;
- real candidate-bound `webVerificationPassed` evidence;
- real candidate-bound `androidUnitTestsPassed` evidence;
- real candidate-bound `debugApkCompiled` evidence;
- no release-affecting code/build drift after the source candidate was frozen;
- a clean tracked Git working tree.

It does **not** approve production and does not require the later physical-device, battery, legal, reviewer or signed-binary evidence.

After the candidate gate and local signing preflight pass, create the signed candidate with:

```bash
npm run android:candidate:release
npm run android:candidate:bundle
```

These commands build the signed release APK/AAB and then record the exact artifact identity under the ignored `.scrollshield-release-candidate/` directory.

Recorded metadata includes:

- source `candidateCommitSha`;
- build HEAD SHA;
- version name and version code;
- exact artifact path;
- SHA-256;
- byte size;
- recording timestamp.

The metadata is local evidence support, not a committed approval and not a substitute for the actual artifact.

## Mandatory signed-binary inspection

A recorded hash alone is **not** binary inspection. The retained artifact must be inspected with the dedicated commands before `signedBinaryInspected=true` can be justified:

```bash
npm run android:inspect:candidate:release
npm run android:inspect:candidate:bundle
```

### APK inspection

The APK inspector requires Android SDK Command-line Tools and uses the real `apkanalyzer` binary to read the packaged manifest and resolved permissions from the retained APK.

### AAB inspection

The AAB inspector requires a reviewed local Bundletool JAR supplied explicitly through:

```text
BUNDLETOOL_JAR=/absolute/path/to/bundletool.jar
```

ScrollShield does **not** download Bundletool automatically during inspection. Tool provenance/version must be reviewed and retained separately as part of release evidence.

### Fail-closed inspection rules

The inspection recalculates the exact candidate SHA-256 and fails if the bytes no longer match candidate metadata. It also:

- reads permissions from the actual APK/AAB manifest rather than trusting only source XML;
- uses an explicit permission allowlist for the current Android-v1 contract;
- fails on every unexpected binary permission until it is deliberately reviewed;
- explicitly rejects `android.permission.INTERNET` for the current offline-v1 contract;
- explicitly rejects advertising-ID permissions;
- rejects a debuggable release manifest;
- rejects cleartext-enabled release configuration;
- checks the archive listing for known tracker/analytics/cloud markers;
- records manifest, permission and archive outputs for review.

A transitive Android library adding a permission is therefore visible as a release blocker instead of silently changing the Play/Data-Safety contract.

The local inspection outputs are stored under the ignored `.scrollshield-release-candidate/` directory, including:

- `<type>-inspection.json`;
- `<type>-manifest.txt`;
- `<type>-permissions.txt`;
- `<type>-archive.txt`.

A passed inspection report is still only one part of signed-binary evidence. A human must retain/review the report and the exact artifact before setting `signedBinaryInspected=true`.

### Stage 2 – final candidate evidence and approval

All remaining evidence is collected against the retained signed candidate bytes. This includes physical/OEM testing, lifecycle, migration, battery, accessibility, Play/reviewer material and signed-binary inspection.

For `signedBinaryInspected=true`, `evidence.signedBinary.reference` must identify the retained inspection evidence **and contain the exact SHA-256 emitted by the candidate recorder/inspector**. This binds final binary evidence to the bytes that were actually inspected.

After all required evidence is complete, set only genuinely passed flags to `true`, fill `approvedBy` and `approvedAt`, then run:

```bash
npm run release:gate
npm run android:release
npm run android:bundle
```

The final `android:release` and `android:bundle` commands do **not** rebuild the APK/AAB. They require a local `status=passed` binary-inspection report and validate that report plus the retained candidate artifact against recorded SHA-256, byte size, source candidate, build HEAD, version and version code after the strict release gate has passed.

## Rebuilding invalidates binary evidence

A rebuilt release APK/AAB is a new binary, even when the source appears unchanged. Do not collect signed-binary or reviewer evidence and then invoke Gradle again for the final upload.

If the retained artifact is rebuilt, replaced, missing, changes hash/size, or no longer corresponds to the frozen source candidate:

1. treat prior signed-binary evidence as invalid for the new bytes;
2. build and record a new signed candidate;
3. rerun binary inspection;
4. repeat all other evidence that depends on the exact binary;
5. update candidate-bound references honestly;
6. rerun the final gate.

The Google Play upload must use the exact retained AAB whose recorded hash is referenced by final binary evidence.

## Strict approval integrity

`npm run release:gate` performs an additional Git comparison between the tested `candidateCommitSha` and the current `HEAD`.

After final candidate testing starts, the only repository path allowed to differ is:

`config/release-approval.json`

If any product code, Android source, build configuration, release documentation, store content, or other repository path changed after the tested candidate, the strict gate fails and a **new candidate must be tested**.

A shallow/local checkout that cannot resolve the tested candidate also fails closed; fetch the required Git history before approval.

## Approval sequence

Recommended final sequence:

1. execute `npm run verify` plus Android JUnit/debug compilation on the source intended for release;
2. freeze that exact source commit as `candidateCommitSha`;
3. retain real candidate-bound evidence for web verification, Android unit tests and debug APK compilation, then set only those three flags to `true`;
4. run `npm run release:candidate-gate`;
5. configure the ignored local release keystore/signing properties;
6. run `npm run android:candidate:bundle` and optionally `npm run android:candidate:release`;
7. retain the generated candidate artifact and its recorded SHA-256 metadata without rebuilding it;
8. configure/review Bundletool provenance and run `npm run android:inspect:candidate:bundle`; inspect the APK too when an APK candidate is retained;
9. retain the passed inspection report, manifest, resolved permissions, archive listing and exact artifact hash;
10. perform physical/OEM, migration, lifecycle, Commitment, adaptive-friction, battery, accessibility and Play/reviewer evidence against that same retained candidate;
11. place the exact retained artifact SHA-256 in `evidence.signedBinary.reference`, identify the retained inspection evidence, and complete remaining candidate-bound records only when real;
12. set `approvedBy` and `approvedAt`;
13. run `npm run release:gate` with Git history containing the tested candidate;
14. run `npm run android:bundle` or `npm run android:release` to validate the retained binary identity **and passed binary-inspection report**; these commands do not rebuild;
15. upload/distribute that exact retained validated artifact.

## No evidence fabrication

Do not place placeholder URLs, invented hashes, synthetic device results, guessed CI run IDs or synthetic binary-inspection outputs into the approval manifest. A missing evidence item remains blank/false until it genuinely exists.
