# ScrollShield Web Launch and Native Store Packet

This packet separates the first public web/PWA launch from the later native App Store / Play Store submission. Version
1.0 should launch as a web app first. The native store answers below are retained as prepared drafts for the later
Android/iOS phase and must be verified against the final native binary before submission.

## Web/PWA Launch Packet

- Public app URL: `https://[FINAL-DOMAIN]/`
- Public privacy URL: `https://[FINAL-DOMAIN]/privacy.html`
- Support address pending verification: `support@scrollshield.app`
- Legal name/entity: `[REQUIRED]`
- Address: `[REQUIRED]`
- Responsible person: `[REQUIRED]`
- Hosting provider: `[REQUIRED]`
- No account, login, cloud sync, advertising, analytics, tracking, or developer backend
- App rules, history, and statistics remain in local browser storage
- Local data can be exported, imported, or deleted with the in-app reset
- Web/PWA limitation: the browser version cannot physically block other installed apps

## Shared Facts

- No account, login, cloud sync, advertising, analytics, tracking, or developer backend
- App rules, history, and statistics remain on the device
- Local data can be exported, imported, or deleted with the in-app reset
- Public privacy page in the build: `/privacy.html`
- Support address pending verification: `support@scrollshield.app`
- Store screenshots: `docs/store-assets/`

## Later Native Store Submission

The following sections are not required for the first web/PWA launch. Use them when Android/iOS binaries are ready.

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

### `FOREGROUND_SERVICE_SPECIAL_USE` Declaration

> ScrollShield runs a user-visible foreground service while protection is active. The service checks which app is in the
> foreground so a user-configured delay or block screen can be shown at the moment a protected app is opened. No existing
> foreground service type covers self-control app interruption, which is why `specialUse` is declared with the subtype
> "App usage monitoring for parental and self-control purposes". The service is started only after the user enables
> protection for at least one app, shows a persistent notification for as long as it runs, and stops as soon as the last
> protected app is deactivated. It performs no network activity and reads no screen content.

Play Console requires this declaration to be reviewed manually. Submit it together with the permission videos below;
without an approved declaration the upload is rejected.

### Accessibility API Declaration (`ShortVideoWatchService`)

`IsAccessibilityTool`: **false**. ScrollShield is not an accessibility tool; it uses the API for a purpose the user
explicitly enables, which requires the declaration below plus the in-app prominent disclosure.

> ScrollShield uses the accessibility API for one purpose the user explicitly enables: recognising whether a
> short-video feed (Instagram Reels, YouTube Shorts, TikTok, Facebook Reels …) is currently on screen inside an app the
> user selected for protection, and counting the scroll events within it. This is what makes the user's own feed rules
> possible — "15 minutes of Reels per day", "pause after 10 swipes" — which cannot be implemented with Usage Access,
> since that reports package names only and not the surface inside an app.
>
> The service reads only technical identifiers of the displayed interface (`viewIdResourceName`) and window class
> names. It never reads text, content descriptions, messages, credentials or search input; those API calls are absent
> from the source. It does not request `canPerformGestures` and cannot tap or swipe inside another app. The single
> global action used is BACK, to leave the feed when the user configured a hard interruption.
>
> All counters remain in encrypted on-device storage. ScrollShield has no backend and performs no network requests.
> The service is inactive until the user enables it in Android settings after reading the in-app disclosure, and every
> other feature of the app works without it.

**Prominent disclosure:** shown on the "Kurzvideo-Erkennung" permission card in `PermissionsScreen.tsx` before the user
is sent to the system settings. It names what is read, what is not read, and that nothing leaves the device.

### Permission Video Shot List

1. Show onboarding before any permission request.
2. Open the permission explanation and show purpose and fallback text.
3. Grant Usage Access from Android settings and return to ScrollShield.
4. Grant display-over-apps permission and return.
5. Select a protected app and trigger the branded interruption.
6. Show the accessibility disclosure, enable the service, open a protected app's short-video feed, and show the
   swipe-based interruption.
7. Disable each permission and show that ScrollShield remains usable with a warning.

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
