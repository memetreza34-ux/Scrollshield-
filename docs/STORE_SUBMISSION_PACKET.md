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

- Data collected: **No**
- Data shared: **No**
- Tracking or advertising: **No**
- Account creation: **No**
- Deletion mechanism: local app reset and uninstall

### `PACKAGE_USAGE_STATS` Declaration

> ScrollShield uses Usage Access only to determine whether a user-selected protected app is in the foreground. This
> enables user-configured delays, limits, and local statistics. The app does not inspect screen content and does not send
> usage history to developer servers. Without this permission, automatic app detection is disabled while the rest of the
> app remains usable.

### `SYSTEM_ALERT_WINDOW` Declaration

> Display over other apps is used only to show a clearly branded ScrollShield interruption when a protected app selected
> by the user is opened. The screen offers a return action and, where configured, a deliberate emergency release. It does
> not alter, click, or read the underlying app. Without this permission, overlay-based interruption is unavailable.

### Permission Video Shot List

1. Show onboarding before any permission request.
2. Open the permission explanation and show purpose and fallback text.
3. Grant Usage Access from Android settings and return to ScrollShield.
4. Grant display-over-apps permission and return.
5. Select a protected app and trigger the branded interruption.
6. Disable each permission and show that ScrollShield remains usable with a warning.

### Rating Target

- Target: **USK 0 / PEGI 3**
- Confirm no social communication, user-generated content, purchases, gambling, violence, or sexual content.

## Manual Completion Fields

- Legal name/entity: `[REQUIRED]`
- Address: `[REQUIRED]`
- Responsible person: `[REQUIRED]`
- Verified support mailbox: `[REQUIRED]`
- Final privacy-policy domain: `[REQUIRED]`
- Apple entitlement approval: `[REQUIRED]`
- Apple and Google questionnaire confirmations: `[REQUIRED]`
- Native permission demonstration videos: `[REQUIRED]`
