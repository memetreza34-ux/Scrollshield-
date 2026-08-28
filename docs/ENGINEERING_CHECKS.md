# ScrollShield – Engineering Checks

Status: **verbindlicher technischer Verifikationsvertrag**

Letzte Aktualisierung: **28. August 2026**

## Grundregel

Es gibt drei getrennte Evidenzstufen:

1. **Source Contract** – der verlangte Vertrag ist im Repository vorhanden.
2. **Executed Test** – Test oder Build wurde auf dem exakten Commit tatsächlich ausgeführt.
3. **Release Evidence** – Ergebnis ist eindeutig Candidate-SHA, Version Name und Version Code zugeordnet.

Source-Code, Source-Checker, vorbereitete JUnit-/Vitest-/Instrumentation-Tests und Dokumentation sind **keine ausgeführte Android-Evidence**.

Mutable Head-SHAs sowie Workflow-/Job-IDs gehören ausschließlich in PR #8 und nicht in committed Dokumente.

## Zentrale Verify-Kette

```bash
npm run verify
```

Die Kette umfasst unter anderem TypeScript, ESLint, Prettier, Vitest, Android-/Lifecycle-/Config-/Runtime-Source-Verträge, `check:checker-drift`, `check:subscription-safety`, Migration, Release, Privacy, Store, Supply Chain, Security, PWA und Bundle Checks.

## Subscription Security

```bash
npm run check:subscription-safety
```

Verbindliche Source-Grenze:

```text
Free → 1 geschützte unterstützte App
Plus → bis 3 geschützte unterstützte Apps
Max → keine Subscription-Anzahlgrenze für unterstützte Apps
```

Die aktuelle Engine schützt Android-Apps/Packages und behauptet keine getrennte Erkennung mehrerer Login-Accounts innerhalb derselben App.

Unverifizierte oder unbekannte Paid-Entitlements fallen auf `Free` zurück. Grundschutz, sicherer Exit/Emergency-Pfad, Permission-/Service-Diagnose, Migration/Recovery und Export/Import bleiben planunabhängig verfügbar.

Paid Release bleibt blockiert, bis Google Play Billing, sichere Backend-Verifikation, Restore, Pending/Expiry/Refund/Revocation, Offline-Grace sowie Free↔Plus↔Max Upgrade-/Downgrade-Verhalten real implementiert und getestet sind. Ein Downgrade darf keine Nutzerdaten löschen oder still entscheiden, welche Apps Schutz verlieren.

Spezifikationen:

```text
src/lib/subscriptionPlanPolicy.ts
src/lib/subscriptionPlanPolicy.test.ts
docs/SUBSCRIPTION_RELEASE_GATE.md
docs/COMPETITIVE_PRODUCT_STRATEGY.md
```

## Native Stop Atomicity

System- und terminale Stopps bleiben atomar; direkte produktive Disable-/Stop-Diagnose-Writes sind nur in den dokumentierten Commit-Failure-Fallbacks erlaubt.

## Android Start-Handshake

Persistente Lifecycle-Grenzen bleiben `lastStartRequestAt`, `lastStartAt`, `lastStopAt`. Automatische Recovery ist Config-Generation- und Lifecycle-Snapshot-gebunden. Ein neuerer Stop gewinnt gegen verspätete Confirmation oder Auto-Recovery.

## Durable Config / Runtime

Config-Sync, Candidate-Rollback, Write-Certainty, Runtime-Generation, G1→G2-Usage-Grenze und generationgebundene Grants/Overlays bleiben source-guarded.

## Durable Action Evidence

Intentional-Open-History bzw. Emergency-Tageszähler und Event-Evidence müssen vor temporärem Grant durable bestätigt sein.

## Process-Loss / App-Open Recovery

`start-pending`, `start-interrupted`, `unclean-process-stop` und `stale-activation` bleiben getrennte Zustände. Native besitzt Config-/Permission-/Target-Fail-Closed-Evidence für automatische Recovery.

## Reale Pflicht-Evidence

Ohne erfolgreichen exakten Lauf gelten insbesondere **nicht als bestanden**:

- `npm run verify`;
- `check:subscription-safety`;
- Subscription-Plan-Policy-Vitest;
- Google Play Billing / Backend Verification / RTDN / Restore / Refund-/Revocation-Tests;
- Free↔Plus↔Max Upgrade-/Downgrade-/Offline-Evidence;
- TypeScript / ESLint / Prettier / Vitest;
- Android JUnit / Instrumentation / Gradle Build;
- APP-07..10;
- RUNTIME-01..06;
- LIFE-12..16;
- DISPATCH-01..05;
- reale Physical-Device-/OEM-/Batterie-/Security-/Migration-Evidence.

Die exakte aktuelle Head-SHA und Workflow-/Job-IDs werden ausschließlich in PR #8 geführt.
