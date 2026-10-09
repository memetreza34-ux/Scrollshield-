# ScrollShield

ScrollShield is an **Android-first digital-wellbeing app** designed to interrupt impulsive app opening and increase friction when the user repeatedly returns to the same distracting app.

## Verbindliche Projektdokumente

- **Produktumfang:** [V1 Masterplan](docs/V1_MASTER_PLAN.md)
- **Umsetzung von Anfang bis Release:** [V1 Execution Plan](docs/V1_EXECUTION_PLAN.md)
- **Aufgaben-/Prüfworkflow für Agents:** [Engineering Workflow](docs/ENGINEERING_WORKFLOW.md)
- **Konkurrenz und Positionierung:** [Competitor Baseline](docs/COMPETITOR_BASELINE.md)
- **Kurzüberblick:** [Roadmap](ROADMAP.md)

Bei Widersprüchen entscheidet der Masterplan über **was** gebaut wird und der Execution Plan über **Reihenfolge, Task-IDs und Abnahme**. Der Code allein beweist keine Gerätetauglichkeit.

## V1 Product

The release direction is intentionally focused:

- per-app opening pause
- Return / Continue decision
- Adaptive Reopen Protection
- Session Guard
- schedules
- Focus
- Emergency Unlock
- Rescue [Pro]
- trustworthy Today/Week insights

Persistent navigation:

**Heute · Schutz · Einblicke**

Focus and Rescue are full-screen actions, not persistent bottom tabs.

## Android First

The paid protection product is Android. The browser/PWA build remains useful for development, UI review and graceful preview behavior, but a browser cannot enforce protection over installed Android apps.

The native layer lives under:

`android/app/src/main/java/app/scrollshield/mobile/`

It includes source-level work for foreground detection, per-app protection rules, native intervention, Reopen/session logic, local event logs and service recovery.

**Important:** source code is not device evidence. The latest native rewrite must still pass Android compilation, JVM/device tests and OEM reliability testing before any release claim is made.

## Short-Video Research

Feed-level Reels/Shorts detection is **not a V1 production feature**.

Research code such as `ShortVideoWatchService.kt` may remain in the repository, but production V1:

- does not register an AccessibilityService
- does not request Accessibility access
- does not serialize feed rules unless the explicit research feature flag is enabled
- does not advertise feed-level blocking

See [docs/SHORT_VIDEO_DETECTION.md](docs/SHORT_VIDEO_DETECTION.md).

## Privacy Direction

V1 is local-first:

- no user account
- no cloud sync
- no advertising
- no analytics SDK requirement
- protection configuration and local events stay on device

Only measured or mathematically derived metrics may be shown. Estimated “time saved” is not part of the product.

## Development

Requirements:

- Node.js 22.12+
- npm 10+
- Java/Android SDK for native Android verification

Install and run:

```bash
npm ci
npm run dev
```

Quality checks:

```bash
npm run test
npm run verify
```

Android tooling:

```bash
npm run android:doctor
npm run android:sync
npm run android:build
```

Do not report Android behavior as verified unless the corresponding Gradle/device checks actually ran.

## Release Rule

A capability is only a release feature when its implementation, permission behavior, migrations and device behavior are verified. Documentation and store copy must never promise research-only functionality.
