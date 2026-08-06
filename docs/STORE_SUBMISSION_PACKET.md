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

> Do not submit the iOS build until the Family Controls entitlement and native Screen Time enforcement are present in the
> reviewed binary. The future iOS build will require no account or test credentials. Rules, history, and statistics will
> remain local, and the review notes must describe only capabilities demonstrated in that exact binary.

### Review Video Shot List

1. Launch and complete onboarding without granting permission.
2. Show the reduced-protection dashboard warning.
3. Return to Permissions and grant Screen Time access in the native build.
4. Select one supported app and configure an opening delay.
5. Trigger the native shield/interruption.
6. Show local history, data export, and app reset.

## Google Play Console

### Data Safety

- Data collected: **No**
- Data shared: **No**
- Tracking: **No**
- Account creation: **No**
- Data collected by the developer or transmitted off-device: **No**
- Data shared with third parties: **No**
- Tracking or advertising: **No**
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

### `POST_NOTIFICATIONS` Explanation

> On Android 13 and newer, ScrollShield requests notification permission only after the user reaches the Android
> protection setup. The permission keeps the active foreground protection service visible and provides the direct
> `Schutz stoppen` action. ScrollShield also verifies that the dedicated `Aktiver App-Schutz` notification channel has
> not been disabled. If app notifications or this channel are disabled, protection does not start or stops locally and
> clears its persisted active state so it cannot continue as an invisible background service.

Reviewer demonstration:

1. Open Android protection setup on Android 13 or newer.
2. Tap `Benachrichtigungen erlauben` and show the native runtime permission dialog.
3. Grant access and show the permission status changing to `AKTIV`.
4. Open the channel settings and show the dedicated `Aktiver App-Schutz` channel.
5. Disable only that channel, return to ScrollShield, and show the permission status as missing.
6. Re-enable the channel before continuing the protection test.

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

### `FOREGROUND_SERVICE_SPECIAL_USE` Declaration

Manifest subtype description:

> User-enabled monitoring of user-selected distracting apps to display local protection interventions.

Play Console functionality description:

> ScrollShield runs a foreground service only after the user explicitly starts Android protection. The service checks
> which app is currently in the foreground and compares it with the user's locally selected protected apps. When a rule
> matches, ScrollShield displays a branded opening pause or block screen. A persistent notification clearly indicates
> that protection is active and includes a direct stop action. No app content is read or transmitted. During runtime,
> the service repeatedly verifies notification visibility, Usage Access, overlay access, active rules, and the presence
> of at least one installed configured target app. If one of these required conditions disappears, the service clears
> its active state, records a local warning, removes its foreground notification, and stops.

Impact if the task is deferred:

> Protection may not start immediately, so opening pauses, user-configured limits, and focus blocking may not be applied
> until Android starts the service. ScrollShield remains usable for configuration, history, and focus timing.

Impact if the task is interrupted:

> Automatic protection stops until Android restarts the service or the user starts it again. The underlying protected
> apps remain usable; ScrollShield does not lock the device. The app reports missing permissions or an inactive service
> when the user returns.

Foreground-service video shot list:

1. Complete the in-app disclosure and grant Usage Access and display-over-apps permission.
2. Grant notifications through the Android runtime dialog and show the dedicated protection channel.
3. Select an installed supported app.
4. Explicitly tap the in-app action to start Android protection.
5. Show the persistent notification and its `Schutz stoppen` action.
6. Open the selected app and show the ScrollShield intervention.
7. Stop protection from the notification and show that the service, overlay, and foreground notification stop.
8. Restart protection, reboot the test device, and show recovery only because the user previously enabled it and all
   required conditions remain valid.
9. While protection is running, disable the protection notification channel and show automatic service shutdown.
10. Re-enable protection, then deactivate all protected apps or uninstall the only protected test app and show automatic
    service shutdown.

### Permission and Protection Review Video Shot List

1. Show onboarding before any permission request.
2. Open the permission explanation and show purpose, local processing, and fallback text.
3. Grant Usage Access from Android settings and return to ScrollShield.
4. Grant display-over-apps permission and return.
5. Request notifications with the native Android dialog and show the dedicated protection channel.
6. Select an installed protected app and trigger the branded intervention.
7. Demonstrate an opening delay, a session expiry, a daily limit, and a strict block.
8. Demonstrate the limited emergency release and its local history entry.
9. Disable Usage Access, overlay access, app notifications, and the dedicated channel one at a time; show that protection
   shuts down safely while ScrollShield remains usable.
10. Remove or uninstall the final active protected app and show that the service stops instead of remaining idle.

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
