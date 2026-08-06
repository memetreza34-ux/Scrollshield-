# ScrollShield Store Submission Packet

This packet is prepared for version 1.0.0. Replace bracketed fields and verify every answer against the final native
binary before submission.

## Shared Facts

- No account, login, cloud sync, advertising, analytics, tracking, or developer backend
- App rules, history, and statistics remain on the device
- Local data can be exported, imported, or deleted with the in-app reset
- Public privacy page in the build: `/privacy.html`
- Support address pending verification: `support@scrollshield.app`
- Store screenshots: `docs/store-assets/`

## Apple App Store Connect

### App Privacy

- Data collected: **No**
- Tracking: **No**
- Privacy-policy URL: `https://[FINAL-DOMAIN]/privacy.html`

### Rating Target

- Target: **4+**
- Confirm the questionnaire contains no user-generated content, gambling, violence, sexual content, or unrestricted web
  access.

### Family Controls Entitlement Request

> ScrollShield is a digital-wellbeing and productivity app that helps users interrupt impulsive app opening. Users
> explicitly select apps and configure their own limits. Family Controls is used only to apply those user-selected
> restrictions through Apple's supported Screen Time mechanisms. ScrollShield does not read content from other apps,
> does not provide covert monitoring, and does not transmit usage history to developer servers.

### Review Notes

> Version 1.0 requires no account or test credentials. Complete onboarding, select one or more apps, and open the
> permission screen to review the Screen Time explanation. The dashboard remains usable when permission is declined and
> clearly reports reduced protection. Rules, history, and statistics are processed locally. Short-video protection is a
> best-effort interruption and is not presented as a guaranteed system block.

### Review Video Shot List

1. Launch and complete onboarding without granting permission.
2. Show the reduced-protection dashboard warning.
3. Return to Permissions and grant Screen Time access in the native build.
4. Select Instagram and configure an opening delay.
5. Trigger the native shield/interruption.
6. Show local history, data export, and app reset.

## Google Play Console

### Data Safety

- Data collected by the developer or transmitted off-device: **No**
- Data shared with third parties: **No**
- Tracking or advertising: **No**
- Account creation: **No**
- Deletion mechanism: local app reset and uninstall
- Reconfirm these answers after inspecting the final signed AAB and dependency report.

### `PACKAGE_USAGE_STATS` Declaration

> ScrollShield uses Usage Access only to determine whether a user-selected protected app is in the foreground. This
> enables user-configured delays, session limits, daily limits, focus rules, and local statistics. The app does not
> inspect screen content and does not send usage history to developer servers. Without this permission, automatic app
> detection is disabled while the rest of the app remains usable.

### `SYSTEM_ALERT_WINDOW` Declaration

> Display over other apps is used only to show a clearly branded ScrollShield interruption when a protected app selected
> by the user is opened. The screen offers a return action and, where configured, a deliberate temporary or emergency
> release. It does not alter, click, or read the underlying app. Without this permission, overlay-based interruption is
> unavailable.

### Package Visibility Explanation

> ScrollShield does not request `QUERY_ALL_PACKAGES`. The Android manifest contains a finite list of targeted package
> queries for apps that ScrollShield can protect. Package visibility is used only to show whether a supported app is
> installed and to prevent users from enabling a non-functional protection configuration. The app does not build,
> transmit, sell, share, or monetize an inventory of installed apps.

Reviewer demonstration:

1. Open the protected-app list.
2. Show installed supported apps as available.
3. Show a supported but uninstalled app as unavailable with disabled controls.
4. Install or uninstall one supported test app and use the refresh action to update the local status.

### Foreground Service `specialUse` Declaration

Manifest subtype description:

> User-enabled monitoring of user-selected distracting apps to display local protection interventions.

Play Console functionality description:

> ScrollShield runs a foreground service only after the user explicitly starts Android protection. The service checks
> which app is currently in the foreground and compares it with the user's locally selected protected apps. When a rule
> matches, ScrollShield displays a branded opening pause or block screen. A persistent notification clearly indicates
> that protection is active and includes a direct stop action. No app content is read or transmitted.

Impact if the task is deferred:

> Protection may not start immediately, so opening pauses, user-configured limits, and focus blocking may not be applied
> until Android starts the service. ScrollShield remains usable for configuration, history, and focus timing.

Impact if the task is interrupted:

> Automatic protection stops until Android restarts the service or the user starts it again. The underlying protected
> apps remain usable; ScrollShield does not lock the device. The app reports missing permissions or an inactive service
> when the user returns.

Foreground-service video shot list:

1. Complete the in-app disclosure and grant Usage Access and display-over-apps permission.
2. Select an installed supported app.
3. Explicitly tap the in-app action to start Android protection.
4. Show the persistent notification and its `Schutz stoppen` action.
5. Open the selected app and show the ScrollShield intervention.
6. Stop protection from the notification and show that the service and overlay stop.
7. Restart protection, reboot the test device, and show recovery only because the user previously enabled it.

### Permission and Protection Review Video Shot List

1. Show onboarding before any permission request.
2. Open the permission explanation and show purpose, local processing, and fallback text.
3. Grant Usage Access from Android settings and return to ScrollShield.
4. Grant display-over-apps permission and return.
5. Select an installed protected app and trigger the branded intervention.
6. Demonstrate an opening delay, a session expiry, a daily limit, and a strict block.
7. Demonstrate the limited emergency release and its local history entry.
8. Disable each permission and show that protection shuts down safely while ScrollShield remains usable.

### Rating Target

- Target: **USK 0 / PEGI 3**
- Confirm no social communication, user-generated content, gambling, violence, sexual content, or unrestricted web
  access.

## Manual Completion Fields

- Legal name/entity: `[REQUIRED]`
- Address: `[REQUIRED]`
- Responsible person: `[REQUIRED]`
- Verified support mailbox: `[REQUIRED]`
- Final privacy-policy domain: `[REQUIRED]`
- Apple entitlement approval: `[REQUIRED]`
- Apple and Google questionnaire confirmations: `[REQUIRED]`
- Native permission and foreground-service demonstration videos: `[REQUIRED]`
- Signed binary verification against every declaration above: `[REQUIRED]`
