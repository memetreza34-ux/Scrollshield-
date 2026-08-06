# Native Android Status

ScrollShield uses Capacitor with the Android package id `app.scrollshield.mobile`.

## Implemented

- Capacitor Android project and release signing configuration
- Cleartext HTTP and Android backup disabled
- R8 minification and resource shrinking for release builds
- Native `ScrollShieldNative` Capacitor plugin
- Real status checks for:
  - Usage Access
  - Display over other apps
  - Notifications
  - Battery optimization exemption
- Direct links to the relevant Android system settings
- Prominent in-app disclosure explaining what usage data is accessed and what is not read
- Manifest declarations for Usage Access, overlays, and notifications

The web/PWA preview still uses local preview state. Only the installed Android build can return real permission status.

## Commands

```bash
npm run android:configure
npm run android:doctor
npm run android:sync
npm run android:open
npm run android:build
npm run android:release
npm run android:bundle
```

## Required Before App Blocking Works

1. Implement a foreground-app detector based on Usage Access.
2. Add a background protection service with reboot and battery-reliability handling.
3. Trigger the existing TypeScript protection rules from native app-open events.
4. Display the ScrollShield interruption activity/overlay when a rule blocks or delays an app.
5. Add exact package mappings for every supported Android app.
6. Test on Samsung, Google Pixel, Xiaomi, OnePlus, and Motorola devices.
7. Prepare Play Console declarations and a reviewer video for every sensitive permission.

## Reels-only Protection

Whole-app protection is the stable first release target. Detecting only Reels, Shorts, or similar sections inside third-party apps may require an Accessibility Service because Usage Access only identifies the foreground app, not the current screen inside it.

Do not add an Accessibility Service until all of these are ready together:

- deterministic, user-defined rules only
- separate prominent disclosure and affirmative consent
- no message, password, keyboard, or media collection
- Play Console Accessibility declaration
- reviewer demonstration video
- resilient selectors and a remote kill switch for broken app versions

## Local Tooling

- Java 21 or newer
- Android Studio or command-line tools
- Android SDK Platform 36
- `android/local.properties`, based on `android/local.properties.example`
- local release keystore and ignored `android/signing.properties`

Never commit signing files, keystores, or Play credentials.
