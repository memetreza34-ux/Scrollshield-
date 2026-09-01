# ScrollShield SDK Registry

This registry covers **direct production runtime dependencies** shipped by version 1.0 across the web/Capacitor layer and the Android Maven layer. Development-only tooling and transitive dependencies are excluded here but remain subject to lockfile, Gradle, binary and signed-candidate inspection.

## Web / Capacitor runtime

| Dependency           | Purpose                    | User data collected | Network use | Opt-out        |
| -------------------- | -------------------------- | ------------------- | ----------- | -------------- |
| `@capacitor/android` | Android native app wrapper | None                | None        | Not applicable |
| `@capacitor/core`    | Capacitor WebView bridge   | None                | None        | Not applicable |
| `react`              | User-interface runtime     | None                | None        | Not applicable |
| `react-dom`          | Browser rendering          | None                | None        | Not applicable |
| `motion`             | Local UI animations        | None                | None        | Not applicable |
| `lucide-react`       | Local interface icons      | None                | None        | Not applicable |

## Direct Android Maven runtime

| Dependency                                     | Purpose                                                     | User data collected / processed when invoked                                                        | Network / service use            | Release note                                                                                                   |
| ---------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `androidx.appcompat:appcompat`                 | Android UI compatibility                                    | None                                                                                                | None                             | Platform support library                                                                                       |
| `androidx.coordinatorlayout:coordinatorlayout` | Android layout support                                      | None                                                                                                | None                             | Platform support library                                                                                       |
| `androidx.core:core-splashscreen`              | Native splash screen compatibility                          | None                                                                                                | None                             | Platform support library                                                                                       |
| `com.android.billingclient:billing`            | Google Play subscription query / future purchase foundation | Google Play purchase state and purchase token material only when the Billing API is invoked         | Google Play / Play Store service | Current production UI does not grant paid access from local Play state; backend verification remains mandatory |
| `com.google.android.play:integrity`            | Future server-verified subscription integrity proof         | App/device integrity request material and verdict processing only when the Integrity API is invoked | Google Play services             | Client verdict alone never grants Plus/Max; backend verification remains mandatory                             |

## Important offline-v1 distinction

The Android v1 manifest intentionally omits `android.permission.INTERNET`, and ScrollShield does not ship analytics, ads, crash reporting, cloud sync or a developer tracking endpoint. However, the Billing and Play Integrity libraries are **still embedded direct Android runtime SDKs** and can communicate through Google Play platform services when their APIs are actually invoked. They must therefore remain visible in this registry, store/privacy review and final signed-binary inspection instead of being described as if they did not exist.

The subscription UI and production purchase grant remain release-gated. A raw Play purchase or client Integrity result is not a ScrollShield paid entitlement.

## Release Rule

Any new direct web runtime dependency or direct Android Maven `implementation` dependency must be added to this registry and reviewed against `docs/SDK_POLICY.md` before release.

Tracking, advertising, analytics, crash-reporting, authentication or general cloud SDKs are not permitted in the offline-first version 1.0 without an explicit architecture/privacy/store-contract change. The signed candidate must also pass binary inspection for unexpected permissions, tracker markers and SDK drift.
