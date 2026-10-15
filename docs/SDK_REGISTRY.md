# ScrollShield SDK Registry

This registry covers production runtime dependencies in version 1.0. Development-only tools are excluded because they
are not shipped in the app bundle.

| Dependency                       | Purpose                                                                             | User data collected | Network use | Opt-out                                                               |
| -------------------------------- | ----------------------------------------------------------------------------------- | ------------------- | ----------- | --------------------------------------------------------------------- |
| `@capacitor/android`             | Android native app wrapper                                                          | None                | None        | Not applicable                                                        |
| `@capacitor/core`                | Capacitor WebView bridge                                                            | None                | None        | Not applicable                                                        |
| `@capacitor/local-notifications` | On-device reminders in the native app (focus end, evening summary, relapse warning) | None                | None        | Notification switches in the settings; system notification permission |
| `react`                          | User-interface runtime                                                              | None                | None        | Not applicable                                                        |
| `react-dom`                      | Browser rendering                                                                   | None                | None        | Not applicable                                                        |
| `lucide-react`                   | Local interface icons                                                               | None                | None        | Not applicable                                                        |
| `@fontsource-variable/geist`     | Interface font, bundled with the app                                                | None                | None        | Not applicable                                                        |

## Release Rule

Any new runtime dependency must be added to this registry and reviewed against `docs/SDK_POLICY.md` before release.
Tracking, advertising, analytics, crash-reporting, authentication, or cloud SDKs are not permitted in the offline-only
version 1.0.
