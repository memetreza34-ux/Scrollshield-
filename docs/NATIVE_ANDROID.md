# Native Android Status

ScrollShield now has a Capacitor Android wrapper under `android/`.

## Implemented

- Capacitor app id: `app.scrollshield.mobile`
- Android `versionName` aligned with `package.json` version `1.0.0`
- Cleartext HTTP disabled in the Android manifest
- Android app backup disabled so local wellbeing data is not copied into device backups
- Android release builds use R8 minification and resource shrinking
- Current Android manifest only requests `android.permission.INTERNET`; sensitive enforcement permissions are
  intentionally absent until native implementation and Play Console declarations are ready
- Release signing is configured through ignored local files only: start from `android/signing.properties.example`
- Reproducible npm scripts for sync, Android Studio opening, and debug APK builds

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

## Still Native Work

- Implement Usage Access based app detection
- Implement overlay or interruption UI for protected apps
- Add background reliability handling for device reboot, battery optimization, and OEM restrictions
- Add sensitive Android permissions only together with the native feature, Play Console declaration text, and review
  video evidence
- Add Play Console sensitive permission declaration videos for `PACKAGE_USAGE_STATS` and any overlay permission if used
- Confirm the final package id before the first Play Console upload

## Local Tooling

The project requires free local tooling for Android builds:

- Java 21 or newer
- Android Studio or Android command-line tools with Android SDK Platform 36
- A configured `android/local.properties` pointing at the Android SDK. Start from `android/local.properties.example`.
- For release signing, copy `android/signing.properties.example` to `android/signing.properties` and point it at a
  local keystore. Do not commit `signing.properties`, `.jks`, or `.keystore` files.

Run `npm run android:configure` after installing Android tooling to auto-create `android/local.properties` when the SDK
is in a standard location. Run `npm run android:doctor` after that; it reports missing Java, SDK, and
`local.properties` setup before Gradle is started. If `android/signing.properties` exists, it also validates the
required signing fields and keystore path.
