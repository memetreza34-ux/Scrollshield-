# ScrollShield Third-Party Notices

This file tracks direct third-party runtime components shipped with ScrollShield version 1.0. Development-only tools are excluded.

## Web / Capacitor runtime notices

These direct npm runtime dependencies are checked automatically against the installed package license metadata.

| Dependency           | License |
| -------------------- | ------- |
| `@capacitor/android` | MIT     |
| `@capacitor/core`    | MIT     |
| `lucide-react`       | ISC     |
| `motion`             | MIT     |
| `react`              | MIT     |
| `react-dom`          | MIT     |

## Direct Android runtime notice scope

The Android release also ships direct Maven dependencies that are not represented by `package.json` and therefore require separate Android/legal review:

| Dependency                                     | Notice / terms status                                              |
| ---------------------------------------------- | ------------------------------------------------------------------ |
| `androidx.appcompat:appcompat`                 | AndroidX / Apache-2.0 family; final bundled notice review required |
| `androidx.coordinatorlayout:coordinatorlayout` | AndroidX / Apache-2.0 family; final bundled notice review required |
| `androidx.core:core-splashscreen`              | AndroidX / Apache-2.0 family; final bundled notice review required |
| `com.android.billingclient:billing`            | Google Play SDK terms; final release/legal terms review required   |
| `com.google.android.play:integrity`            | Google Play SDK terms; final release/legal terms review required   |

This table is deliberately transparent about review status. It does **not** claim that the final signed AAB notice/license audit has already been completed.

## Release rule

Keep this file aligned with `docs/SDK_REGISTRY.md`, `package.json`, `android/app/build.gradle`, final Gradle dependency resolution and the signed candidate.

Before G5/G11/G13 can be treated as complete, the exact release candidate must have a final third-party notice/license/terms audit, including transitive Android dependencies and any notices actually required in the distributed binary or store/legal materials.
