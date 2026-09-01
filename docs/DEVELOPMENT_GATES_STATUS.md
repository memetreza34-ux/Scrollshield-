# ScrollShield – Entwicklungs-Gates und Live-Status

Status: **lebende Projektsteuerung**

Letzte Aktualisierung: **28. August 2026**

Dieses Dokument beantwortet: **Wo steht ScrollShield jetzt, was ist belegt und was ist der nächste erlaubte Schritt?**

## Statusregeln

- **FERTIG** = Implementierung und die für das Gate erforderliche reale Verifikation/Evidenz liegen vor.
- **TEILWEISE** = wesentliche Arbeit existiert, mindestens ein Pflichtnachweis fehlt.
- **FEHLT** = die Stufe ist noch nicht ausreichend implementiert.
- **BLOCKIERT** = eine externe oder vorgelagerte Voraussetzung verhindert den Abschluss.

Ein Source-Checker oder vorbereiteter Test allein macht ein Gate nicht `FERTIG`, wenn echte Android-/Device-/Billing-Ausführung gefordert ist.

## Gate-Übersicht

| Gate | Bereich                                   | Status        | Warum                                                                                                                                                                                                                                     | Nächster Abschlussnachweis                                                                                                          |
| ---- | ----------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| G0   | Produktproblem & v1-Scope                 | **TEILWEISE** | Produktanforderungen und User-Research-Aufgaben existieren; reale Erstnutzer-Sessions fehlen                                                                                                                                              | 5–8 beobachtete neue Nutzer + dokumentierte Ergebnisse                                                                              |
| G1   | Architektur & Repo-Prozess                | **FERTIG**    | React/TS, lokale Daten, Native Android, Draft-PR-Prozess und Architekturverträge sind dokumentiert                                                                                                                                        | bei Architekturänderung erneut öffnen                                                                                               |
| G2   | Datenmodell & Migration                   | **TEILWEISE** | transaktionale/V0.7-Migration und Recovery existieren source-seitig; reale Alt-Daten-Evidence fehlt                                                                                                                                       | echter V0.7-Upgrade-Test + bytegenauer Archivvergleich                                                                              |
| G3   | Kern-UI/UX & Accessibility                | **TEILWEISE** | Release-Screens und Source-A11y-Verträge existieren; reale Usability-/TalkBack-/Large-Font-Evidence fehlt                                                                                                                                 | physische Accessibility- und User-Research-Sessions                                                                                 |
| G4   | Native Android Schutz                     | **TEILWEISE** | atomare Stops, Start-Handshake, durable Config-/Runtime-Generation, Usage-Grenze, durable Grants, Dispatch-/PendingIntent-Races und lifecycle-snapshot-gebundene Auto-Recovery sind source-seitig gehärtet                                | Android JUnit + Instrumentation + `assembleDebug` + APP-07..10 + RUNTIME-01..06 + LIFE-12..16 + DISPATCH-01..05 + Process-Kill real |
| G5   | Security / Privacy / Supply Chain         | **TEILWEISE** | Threat Model, Offline-First, Privacy/Supply-Chain-Guards und fail-closed Subscription-Plan-Policy existieren; finaler Dependency/SBOM/Binary-/Billing-Backend-Audit fehlt                                                                 | echter Supply-Chain-/Dependency-/Binary-Audit + Threat Review + Billing-Backend-Security-Evidence                                   |
| G6   | Automatisierte Verifikation               | **BLOCKIERT** | `npm run verify` ist inklusive `check:checker-drift`, `check:subscription-safety`, Start-/Config-/Runtime-/Lifecycle-/Device-Checks vorbereitet; auf dem aktuellen Draft-Head liegt noch kein vollständiger erfolgreicher Verify-Lauf vor | kompletter echter `npm run verify` auf exaktem Head                                                                                 |
| G7   | Android Instrumentation/E2E               | **TEILWEISE** | Start-/Stop-/Process-Loss-/Config-/Runtime-/Usage-/Dispatch-/Notification-/Auto-Recovery-Verträge existieren; echte Android-Ausführung fehlt                                                                                              | `connectedDebugAndroidTest` + APP-07..10 + RUNTIME-01..06 + LIFE-12..16 + DISPATCH-01..05 + Pre-/Post-Confirmation-Kill real        |
| G8   | Performance & Batterie                    | **TEILWEISE** | UsageFlushCoordinator/Worker, Shutdown-Drain und Generation-Boundary sind source-guarded; reale JUnit-/Device-/12h-Evidence fehlt                                                                                                         | Usage-JUnit + Instrumentation + `assembleDebug` + RUNTIME-04 real + 12h-Baseline                                                    |
| G9   | Physical Device Matrix                    | **FEHLT**     | Pflichtszenarien sind spezifiziert, inklusive LIFE-16; reale Geräte-Evidence fehlt                                                                                                                                                        | Pflichtgeräte mit Build-ID, Diagnose-JSON, Logcat und Screenrecord vollständig dokumentieren                                        |
| G10  | Release Candidate Freeze & Evidence       | **BLOCKIERT** | Candidate darf vor G6–G9 und vor sicherer finaler Monetarisierungsentscheidung nicht final eingefroren werden                                                                                                                             | exakte Candidate-SHA + echte Referenzen                                                                                             |
| G11  | Legal / Privacy / Support                 | **TEILWEISE** | Struktur/Dokumente existieren; finale reale Identität, Support-Mailbox, öffentliche Privacy-Domain und spätere Billing-Datenschutzhinweise fehlen                                                                                         | keine Platzhalter + überprüfbare öffentliche Angaben + Billing-Metadaten geprüft                                                    |
| G12  | Store / Play Review                       | **TEILWEISE** | Submission Packet und Texte sind vorbereitet; Billing/Paywall bleibt bewusst deaktiviert, bis sichere Play-/Backend-/Restore-Evidence existiert; finaler AAB-/Reviewer-Nachweis fehlt                                                     | Angaben gegen signierten AAB + ggf. Billing-Produkte/Preise + Reviewer-Videos verifizieren                                          |
| G13  | Signing / Binary / Internal & Closed Test | **BLOCKIERT** | Release-Gate blockiert bewusst; kein final freigegebener Kandidat                                                                                                                                                                         | Gate PASS → AAB → Internal/Closed Test                                                                                              |
| G14  | Production Rollout & Operations           | **BLOCKIERT** | Rollout-/Incident-Prozess existiert; Produktion darf vor G13 nicht starten                                                                                                                                                                | Produktionsfreigabe + gestaffelter Rollout                                                                                          |

## Subscription-/Monetarisierungs-Vertrag

Aktuell existiert **keine freigegebene Kaufoberfläche**. Die Planarchitektur ist Source Contract:

```text
ScrollShield Free → 1 geschützte unterstützte Android-App
ScrollShield Plus → bis zu 3 geschützte unterstützte Android-Apps
ScrollShield Max  → keine Subscription-Anzahlgrenze für unterstützte Android-Apps
```

Die aktuelle Engine unterscheidet keine separaten Login-Accounts innerhalb derselben Android-App. Deshalb darf Store-/Paywall-Copy nicht von „3 Instagram-Accounts“ oder ähnlicher Account-Level-Erkennung sprechen.

Verbindliche Sicherheitsregeln:

```text
unverifiziertes / unbekanntes Paid-Entitlement → Free
PENDING purchase → kein Paid-Entitlement
Safety / Recovery / Diagnostics / Export → nicht paywallbar
Downgrade → keine Datenlöschung
Downgrade über Kapazitätsgrenze → keine stille Auswahl der aktiv bleibenden Apps
```

Bevor Plus/Max kaufbar werden, sind mindestens erforderlich:

```text
Google Play Billing
→ Purchase Token
→ sichere Backend-Verifikation via Google Play Developer API
→ RTDN / zuverlässiger Subscription-Lifecycle
→ Restore
→ bounded Offline-Grace
→ Pending / Cancel / Expiry / Refund / Revocation
→ Free↔Plus↔Max Upgrade-/Downgrade-Evidence
```

Die Produktions-UI darf bis dahin keine echten Preise, Trials, Kaufbuttons oder Plus-/Max-Aktiv-Behauptungen anzeigen.

## Aktueller Native-Lifecycle-Vertrag

### Start / Stop

```text
Config durable commit
→ configGeneration
→ recordProtectionStartRequested(configGeneration)
→ Android service dispatch
→ startForeground(...)
→ durable confirmation
→ RUNNING=true
```

Terminale/System-Stopps bleiben atomar. Start-/Stop-Dispatch wird unter `ProtectionServiceDispatchGuard.LOCK` serialisiert; Lifecycle-Persistenz nutzt danach `EVENT_LOCK`.

### Health-Zustände

```text
start-pending
start-interrupted
unclean-process-stop
stale-activation
```

werden getrennt behandelt. Ein frischer Pending-Start wird nicht durch einen App-Open-Sync entwertet. `start-interrupted` startet nicht automatisch neu.

### Single-Generation App-Open Recovery

Für `stale-activation`:

```text
serviceStatus = NativeProtection.getStatus()
→ NativeProtection.syncCommitted(...)
→ NativeProtection.startCommitted(configGeneration, serviceStatus)
→ Native entscheidet Config / Permissions / Target-App
```

Für bestätigten Process Loss:

```text
before = getStatus()
→ recoverAfterProcessLoss(...)
   → syncCommitted(...)
   → startCommitted(configGeneration, before)
   → getStatus()
```

### Lifecycle-Snapshot: neuerer Stop gewinnt

Automatische Starts senden:

```text
expectedEnabled
expectedLastStartRequestAt
expectedLastStartAt
expectedLastStopAt
```

Native prüft unter `ProtectionServiceDispatchGuard.LOCK → EVENT_LOCK → matchesLifecycleSnapshot(...)` vor Config-Validation, Prerequisite-Stopps, Startrequest und Service-Dispatch.

Snapshot-Mismatch ist No-op; neuerer manueller/Notification-Stop bleibt Gewinner. Realer Pflichtfall: `LIFE-16`.

## Config-/Runtime-Vertrag

- Config-Sync liefert UUID erst nach synchron bestätigtem Commit.
- Candidate-Commit-Fehler rollt auf das vorige Tupel zurück.
- Candidate + Rollback fehlgeschlagen → process-lokal `UNSICHER`; neue Starts/Recovery sind blockiert.
- Laufender Dienst behält bei `UNSICHER` seine zuletzt veröffentlichte bestätigte Runtime-Generation.
- bestätigter `G1 → G2`-Wechsel schließt G1-Usage vor Rule-Publish, invalidiert alte Grants und entfernt alte Overlays.
- `Bewusst öffnen`: History commit → Event commit → Grant.
- Emergency: Tageszähler commit → Event commit → Grant.

## Checker-Architektur

Pflichtbestandteile der Verify-Kette umfassen insbesondere:

```text
check:checker-drift
check:subscription-safety
check:android
check:prerequisite-stop-codes
check:process-loss
check:protection-recovery
check:native-stop-atomicity
check:start-handshake
check:config-durability
check:runtime-config-state
check:usage-accounting
check:usage-flush-worker
check:lifecycle
check:device-matrix
check:android-instrumentation
check:migration
```

`check:subscription-safety` ist außerdem im Readiness-Report `required=true`.

## Reale Pflicht-Evidence

### Config / Runtime

```text
APP-07 .. APP-10
RUNTIME-01 .. RUNTIME-06
```

### Lifecycle

```text
LIFE-12 .. LIFE-16
DISPATCH-01 .. DISPATCH-05
```

### Subscription (vor Paid Release)

```text
Free launch ohne Billing
Plus purchase
Max purchase
Plus↔Max plan change
Paid→Free expiry
pending purchase
cancel / refund / revocation
restore after reinstall
tampered cache fails closed
backend / Play outage
offline grace
non-destructive downgrade above capacity
```

## Aktuelle Ausführungsgrenze

Source-Code, Checker und Testquellcode sind **keine Executed Evidence**. Mutable exakte Head-/Workflow-/Job-IDs werden ausschließlich in PR #8 geführt.

Nicht als bestanden belegt sind insbesondere:

- `npm run verify`;
- `check:subscription-safety`;
- Subscription-Plan-Policy-Vitest;
- TypeScript / ESLint / Prettier / Vitest;
- Android JUnit;
- Android Instrumentation;
- Gradle Debug Build / APK;
- Google Play Billing-/Backend-/RTDN-/Restore-Evidence;
- APP-07 bis APP-10;
- RUNTIME-01 bis RUNTIME-06;
- LIFE-12 bis LIFE-16;
- DISPATCH-01 bis DISPATCH-05;
- reale Auto-Recovery-/Subscription-/Device-Evidence.

## Nächster erlaubter Abschlussweg

1. G6 Runner/Actions-Ausführung entsperren bzw. echten lokalen Verify-Lauf auf exaktem Head durchführen.
2. `npm ci` + `npm run verify`.
3. Android JUnit + `assembleDebug`.
4. `connectedDebugAndroidTest`.
5. APP-07..10 und RUNTIME-01..06 real ausführen.
6. LIFE-12..16 und DISPATCH-01..05 real ausführen.
7. Physical Device Matrix + 12h/OEM/Batterie.
8. Migration, Security-/Supply-Chain-/Binary-Audit, User Research und Accessibility abschließen.
9. Erst danach Billing-/Backend-Implementierung sicher integrieren und vollständige Free/Plus/Max-Lifecycle-Evidence erzeugen.
10. Erst nach bestandener Subscription-Evidence Kaufoberfläche/Preise aktivieren.
11. Erst danach Candidate Freeze und Release.

## Änderungsregel

Nach jedem größeren Repo-Block:

1. Gate-Status neu bewerten;
2. nur mit realer Evidenz auf `FERTIG` setzen;
3. neue Blocker konkret dokumentieren;
4. nächsten Arbeitsblock aus dem frühesten sinnvoll bearbeitbaren offenen Gate wählen;
5. PR bleibt Draft, bis die Release-Gates erfüllt sind.
