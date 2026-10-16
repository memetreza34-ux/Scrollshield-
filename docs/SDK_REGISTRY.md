# ScrollShield SDK Registry

This registry covers production runtime dependencies in version 1.0. Development-only tools are excluded because they
are not shipped in the app bundle.

| Dependency                       | Purpose                                                                             | User data collected | Network use | Opt-out                                                               |
| -------------------------------- | ----------------------------------------------------------------------------------- | ------------------- | ----------- | --------------------------------------------------------------------- |
| `@capacitor/android`             | Android native app wrapper                                                          | None                | None        | Not applicable                                                        |
| `@capacitor/core`                | Capacitor WebView bridge                                                            | None                | None        | Not applicable                                                        |
| `@capacitor/local-notifications` | On-device notifications in the native app (focus end, daily summary, weekly review) | None                | None        | Notification switches in the settings; system notification permission |
| `react`                          | User-interface runtime                                                              | None                | None        | Not applicable                                                        |
| `react-dom`                      | Browser rendering                                                                   | None                | None        | Not applicable                                                        |
| `lucide-react`                   | Local interface icons                                                               | None                | None        | Not applicable                                                        |
| `@fontsource-variable/geist`     | Interface font, bundled with the app                                                | None                | None        | Not applicable                                                        |

## Native Android libraries

Not npm packages, so outside the table above; added in `android/app/build.gradle`.

- Google Play Billing Library (com.android.billingclient:billing): ScrollShield Pro subscription through Google
  Play (`ProBillingPlugin.kt`). Payment data stays with Google Play; the app only asks whether Pro is active and
  acknowledges purchases. No data goes to a ScrollShield server. Opt-out: do not buy Pro.

## Release Rule

Any new runtime dependency must be added to this registry and reviewed against `docs/SDK_POLICY.md` before release.
Tracking, advertising, analytics, crash-reporting, authentication, or cloud SDKs are not permitted in the offline-only
version 1.0.
