# ScrollShield Android V1 Store Submission Packet

This packet is for the **Android-first V1** release. The browser/PWA remains a development/demo surface and is not the paid protection product.

All declarations below are drafts until checked against the exact release binary and the current Google Play Console forms.

## Shared Facts

- No account, login, cloud sync, advertising, analytics, tracking, or developer backend
- App rules, history, and statistics remain on the device
- Local data can be exported, imported, or deleted with the in-app reset
- Public privacy page in the build: `/privacy.html`
- Support address pending verification: `support@scrollshield.app`
- Store screenshots: `docs/store-assets/`

## Android V1 Store Submission

## Google Play Console

### Data Safety

- Data collected: **No**
- Data shared: **No**
- Tracking: **No**
- Advertising: **No**
- Account creation: **No**
- Deletion mechanism: local app reset and uninstall

### `PACKAGE_USAGE_STATS` Declaration

> ScrollShield uses Usage Access only to determine whether a user-selected protected app is in the foreground. This
> enables user-configured delays, limits, and local statistics. The app does not inspect screen content and does not send
> usage history to developer servers. Without this permission, automatic app detection is disabled while the rest of the
> app remains usable.

### `SYSTEM_ALERT_WINDOW` Declaration

> Display over other apps is used only to show a clearly branded ScrollShield interruption when a protected app selected
> by the user is opened. The screen offers a return action and, unless the user locked the app, a "continue" button after
> the configured delay. It does not alter, click, or read the underlying app. Without this permission, overlay-based
> interruption is unavailable.

### `FOREGROUND_SERVICE_SPECIAL_USE` Declaration

> ScrollShield runs a user-visible foreground service while protection is active. The service checks which app is in the
> foreground so a user-configured delay or block screen can be shown at the moment a protected app is opened. No existing
> foreground service type covers self-control app interruption, which is why `specialUse` is declared with the subtype
> "Self-control: shows a pause screen when the user opens an app they chose to limit". The service is started only after
> the user enables protection for at least one app, shows a persistent notification for as long as it runs, and stops as
> soon as the last protected app is deactivated. It performs no network activity and reads no screen content.

Play Console requires this declaration to be reviewed manually. Submit it together with the permission videos below;
without an approved declaration the upload is rejected.

### Accessibility API — Not part of V1 submission

Production V1 does not register `ShortVideoWatchService` and does not request Accessibility access.

The V1 Play submission must not:

- claim feed-level Reels/Shorts/TikTok blocking,
- include Accessibility as a required V1 permission,
- submit an Accessibility declaration for a service that is not packaged in the Production manifest.

The research implementation remains documented in `docs/SHORT_VIDEO_DETECTION.md`. Any future activation requires a fresh policy review, disclosure/consent flow and real-device evidence.

### Permission Video Shot List

1. Complete onboarding and choose a protected app.
2. Show the Usage Access explanation and grant Usage Access.
3. Show the overlay explanation and grant display-over-other-apps.
4. Activate protection and show the persistent foreground-service notification.
5. Open the protected app and record the native Return / Continue intervention.
6. Return to ScrollShield and show that the event appears in Today/Insights.
7. Stop protection and show that the service/notification stops.

Do not demonstrate Accessibility or feed-level blocking in the V1 submission because they are not part of V1 production.

### Rating Target

- Target: **USK 0 / PEGI 3**
- Confirm no social communication, user-generated content, purchases, gambling, violence, or sexual content.

### Target Audience

- Age groups: **16–17 and 18+** only. Not directed at children, so the Families policy does not apply. The minimum
  age is stated in the store description and the privacy policy.
- Countries for the first release: EU/EEA. US states such as Texas (SB 2420) now have app-store age laws with duties
  for developers; add the US only after checking them.

## Manual Completion Fields

- Legal name/entity: `[REQUIRED]`
- Address: `[REQUIRED]`
- Responsible person: `[REQUIRED]`
- Verified support mailbox: `[REQUIRED]`
- Final privacy-policy domain: `[REQUIRED]`
- Google Play questionnaire confirmations: `[REQUIRED]`
- Native permission demonstration videos: `[REQUIRED]`
