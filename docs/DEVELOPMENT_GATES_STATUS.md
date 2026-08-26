# ScrollShield – Entwicklungs-Gates und Live-Status

Status: **lebende Projektsteuerung**

Letzte Aktualisierung: **26. August 2026**

Dieses Dokument beantwortet: **Wo steht ScrollShield jetzt, was ist belegt und was ist der nächste erlaubte Schritt?**

## Statusregeln

- **FERTIG** = Implementierung + passende Verifikation/Evidenz liegen für die Stufe ausreichend vor.
- **TEILWEISE** = wesentliche Arbeit existiert, aber mindestens ein Pflichtnachweis oder Teilbereich fehlt.
- **FEHLT** = die Stufe ist noch nicht ausreichend implementiert.
- **BLOCKIERT** = die Stufe kann aktuell nicht abgeschlossen werden, weil eine externe oder vorgelagerte Voraussetzung fehlt.

Ein Source-Checker oder vorbereiteter Test allein macht ein Gate nicht `FERTIG`, wenn reale Android-Ausführung gefordert ist.

## Gate-Übersicht

| Gate | Bereich | Status | Warum | Nächster konkreter Abschlussnachweis |
|---|---|---|---|---|
| G0 | Produktproblem & v1-Scope | **TEILWEISE** | `PRODUCT_REQUIREMENTS.md` formalisiert PR-01..18; `USER_RESEARCH.md` definiert echte Erstnutzungsaufgaben; reale Sessions fehlen | 5–8 beobachtete neue Nutzer + dokumentierte Ergebnisse |
| G1 | Architektur & Repo-Prozess | **FERTIG** | React/TS, lokale Daten, Capacitor/Native Android, Draft-PR-Prozess und Verantwortungsgrenzen sind dokumentiert | bei Architekturänderung erneut öffnen |
| G2 | Datenmodell & Migration | **TEILWEISE** | starke transaktionale/V0.7-Migration im Source; reale Alt-Daten-Evidenz fehlt | echter V0.7-Upgrade-Test + bytegenauer Archivvergleich |
| G3 | Kern-UI/UX & Accessibility | **TEILWEISE** | Release-Screens und Source-A11y-Checks existieren; reale Usability-/Large-Font-/TalkBack-Evidenz fehlt | physische Accessibility- und User-Research-Sessions |
| G4 | Native Android Schutz | **TEILWEISE** | atomare Stops, persistenter Start-Handshake, durable Config-Generation, Candidate-Rollback/Write-Certainty, getrennte Runtime-Generation, generationgebundene Grants/Overlays, G1→G2-Usage-Grenze, durable Intentional-/Emergency-Evidence vor jedem Grant sowie health-aware App-Open-Recovery sind source-seitig implementiert; reale Ausführung fehlt | Android JUnit + Instrumentation + `assembleDebug` + APP-07..10 + RUNTIME-01..06 + LIFE-12..15 + DISPATCH-01..05 + Process-Kill real |
| G5 | Security / Privacy / Supply Chain | **TEILWEISE** | Threat Model, Offline-First-Manifest, Privacy-Guard, gepinnter Gradle-SHA256 und `check:supply-chain` existieren; finaler Dependency/SBOM/Binary-Audit fehlt | echter Supply-Chain-Check + Dependency-/Manifest-Snapshot + finaler Binary-Audit + Threat-Review |
| G6 | Automatisierte Verifikation | **BLOCKIERT** | `npm run verify` inklusive aktualisierter Architektur-Checker und neuem `check:checker-drift`, `check:native-stop-atomicity`, `check:start-handshake`, `check:config-durability`, `check:runtime-config-state`, `check:usage-accounting`, `check:lifecycle`, `check:device-matrix` und `check:android-instrumentation` ist vorbereitet; echte Runner-Ausführung auf dem aktuellen Kandidaten fehlt | kompletter echter Verify-Lauf auf exaktem Head |
| G7 | Android Instrumentation/E2E | **TEILWEISE** | App-/Notification-, Prerequisite-, Boot/Update-, Start-/Destroy-, Process-Loss-, health-aware App-Open-Recovery-, Config-Durability-/Write-Certainty-/Runtime-Generation-/Usage-Boundary-/Action-Durability-, Start↔Stop-, Service-Dispatch- und stale-PendingIntent-Verträge existieren; echte Android-Ausführung fehlt | `connectedDebugAndroidTest` + APP-07..10 + RUNTIME-01..06 + LIFE-12..15 + DISPATCH-01..05 + Pre-/Post-Confirmation-Process-Kill real |
| G8 | Performance & Batterie | **TEILWEISE** | Usage-Accounting-Guard ist auf die reale `UsageFlushCoordinator`-/`UsageFlushWorker`-Architektur aktualisiert; Worker/Coordinator, Shutdown-Drain und Generation-Boundary sind source-guarded; reale JUnit-/Instrumentation-/Gradle-/Device-Evidenz fehlt | `UsageAccountingPolicyTest` + Coordinator-/Worker-JUnit + Usage-Flush-Instrumentation + RUNTIME-04 real + `assembleDebug` + 12h-Baseline |
| G9 | Physical Device Matrix | **FEHLT** | APP-07..10, RUNTIME-01..06, LIFE-12..15 und DISPATCH-01..05 sind als Pflichtszenarien spezifiziert; reale Geräte-Evidence fehlt | Pflichtgeräte/Szenarien mit Build-ID, Diagnose-JSON, Usage-/Action-Evidence, Logcat und Screenrecord vollständig dokumentieren |
| G10 | Release Candidate Freeze & Evidence | **BLOCKIERT** | Evidence-Schema v2 existiert; Candidate darf vor G6–G9 nicht final eingefroren werden | exakte Kandidaten-SHA + echte Referenzen |
| G11 | Legal / Privacy / Support | **TEILWEISE** | Dokumente/Struktur existieren; finale reale Identität, Support-Mailbox und öffentliche Privacy-Domain fehlen | keine Platzhalter + überprüfbare öffentliche Angaben |
| G12 | Store / Play Review | **TEILWEISE** | Submission Packet, Screenshots und Deklarationstexte vorbereitet; finaler AAB/Reviewer-Nachweis fehlt | gegen signierten AAB verifizierte Angaben + Videos |
| G13 | Signing / Binary / Internal & Closed Test | **BLOCKIERT** | Release-Gate blockiert bewusst; kein final signierter freigegebener Kandidat | Gate PASS → AAB → Internal/Closed Test |
| G14 | Production Rollout & Operations | **BLOCKIERT** | Rollout- und Incident-Response-Prozess existieren; Produktion darf vor G13 nicht beginnen | Produktionsfreigabe + gestaffelter Rollout + benannte Verantwortliche |

## Aktueller Config-/Lifecycle-Vertrag

### Durable Config

Ein erfolgreicher Config-Sync persistiert synchron:

```text
protection_config
unavailable_app_ids
unavailable_active_app_ids
protection_config_generation
```

TypeScript erhält die neue UUID erst nach erfolgreichem `commit()` und reicht sie beim Start als `expectedConfigGeneration` zurück. `recordProtectionStartRequested(...)` bindet die gleiche Generation an den Request.

### Candidate-Commit / Rollback

Vor einem Config-Write wird der alte Config-/Availability-/Generation-Tupelzustand gesichert. Scheitert der Candidate-Commit, wird dieser alte Zustand vor Freigabe des Dispatch-Locks wiederhergestellt und der neue Sync abgelehnt.

Ein bereits laufender Schutz arbeitet weiter mit seiner letzten bestätigten Regelbasis. Ein erster Start ohne durable Config bleibt blockiert.

### Config Write Certainty

Process-lokal gilt:

```text
candidate=true                   → SICHER
candidate=false + rollback=true  → SICHER
candidate=false + rollback=false → UNSICHER
```

Bei `UNSICHER` dürfen im selben Prozess kein neuer App-Start, kein Boot-/Update-Startrequest und keine current Pending-/Confirmation-Entscheidung erfolgen. Preference-basierte Config darf die bereits veröffentlichte Runtime-Regelbasis nicht ersetzen. Erst ein späterer erfolgreicher Config-Commit setzt den Zustand wieder auf `SICHER`.

### Published Runtime Config / Grants / Overlay

Die tatsächlich vom laufenden Dienst veröffentlichte Regelgeneration wird zusätzlich als Evidence geführt:

```text
protectionRuntimeConfigGeneration
```

Bei `UNSICHER` bleibt diese Generation auf der letzten bestätigten Runtime-Regelbasis.

Bei einem bestätigten `G1 → G2`-Publish gilt:

```text
laufenden G1-Usage-Tick mit G1-Regelbasis schließen
alte temporaryAccessUntil-Grants löschen
altes Overlay + Countdown entfernen
G2 als Runtime-Generation veröffentlichen
```

Overlay-Aktionen erfassen `actionConfigGeneration` und prüfen sie vor `WindowManager.addView(...)` sowie direkt vor `Bewusst öffnen`/Notfall-Freigabe erneut unter dem Dispatch-Lock. Eine stale `G1`-Aktion darf nach `G2` keinen neuen Grant und kein `open`-/`emergency`-Event erzeugen.

### Runtime Usage Boundary

Bei einem echten Generationwechsel wird die alte Messperiode geschlossen, **bevor** G2 die Rule-Map ersetzt:

```text
G1 rulesByPackage + G1 temporaryAccessUntil
→ generationBoundaryAt = System.currentTimeMillis()
→ recordAllowedUsage(null, generationBoundaryAt)
→ Usage wird noch über previousRule.id aus G1 gebucketet
→ cachedConfigGeneration = G2
→ rulesByPackage = G2
→ Grants/Overlay aus G1 invalidieren
→ nächste Messperiode startet frisch unter G2
```

Damit ist `RUNTIME-04` source-seitig gehärtet. Der reale Android-Bucket-Nachweis bleibt offen.

### Durable Action Evidence

Normale und Emergency-Autorisierung sind fail-closed an synchrone lokale Persistenz gekoppelt:

```text
Bewusst öffnen:
recordIntentionalOpen(...).commit() == true
→ appendProtectionEvent("open", ...).commit() == true
→ erst dann temporaryAccessUntil

Notfall:
incrementEmergencyCount(...).commit() == true
→ appendProtectionEvent("emergency", ...).commit() == true
→ erst dann temporaryAccessUntil
```

`appendProtectionEvent(...)` liefert den echten Commit-Erfolg zurück. Scheitert History/Counter oder Event, entsteht kein Grant. Ein bereits erfolgreicher erster Persistenzschritt wird bei einem Fehler im zweiten Schritt nicht zurückgenommen; das ist bewusst fail-closed und kann Schutz nur strenger, nicht schwächer machen.

Damit sind `RUNTIME-05` und `RUNTIME-06` source-seitig gehärtet. Der reale sofortige Process-/Service-Kill nach erfolgreicher Freigabe bleibt als Device-Evidence offen.

Diagnose/Debug zeigt:

```text
protectionConfigWriteStateCertain
protectionConfigGeneration
protectionRuntimeConfigGeneration
startRequestConfigGeneration
```

### Lifecycle / Dispatch

- System-/Terminal-Stopps bleiben atomar und source-guarded.
- Produktive Aktivierung läuft nur über `recordProtectionStartRequested(...)`; ein direktes `setProtectionEnabled(..., true)` ist nicht zulässig.
- frischer Pending-Start ist nur mit aktueller, sicherer Config-Generation idempotent;
- `recordProtectionServiceStarted(...)` liefert `CONFIRMED`, `SUPERSEDED_BY_STOP` oder `FAILED_CLOSED`; nur `CONFIRMED` darf `RUNNING=true` erreichen;
- globale Dispatch-Reihenfolge: `ProtectionServiceDispatchGuard.LOCK → EVENT_LOCK`;
- Startpersistenz und Android-Startdispatch sowie Stop-Persistenz und `stopService()` werden gemeinsam serialisiert;
- Service-Prerequisite- und Startfehlerpfade nutzen `ProtectionServiceDispatchGuard.dispatchControlledStop(...)`, nicht `stopSelf()`;
- Controlled-stop Destroy-Suppression ist process-lokal, one-shot und auf 30 Sekunden `System.nanoTime()` begrenzt;
- Same-Instance-Restart überträgt die aktuelle Request-Generation auf die lebende Service-Instanz;
- alte Notification-Stop-Aktionen dürfen neue Generationen nicht stoppen.

### App-Open Recovery

Der App-Start liest zuerst den nativen Health-State, bevor er neue Config schreibt oder einen Start auslöst:

```text
start-pending
→ kein Config-Sync
→ kein zweiter Start
→ Status nach kurzer Verzögerung erneut lesen

unclean-process-stop
→ direkt recoverAfterProcessLoss(...)
→ Recovery synchronisiert selbst durable Config + Generation

stale-activation
→ Config-Sync
→ installierte aktive Ziel-App prüfen
→ normaler generationgebundener Start

start-interrupted
→ kein automatischer Neustart
→ bestehender Nutzer-Retry bleibt zuständig
```

Damit darf ein App-Open insbesondere keinen frischen Pending-Start durch einen neuen Config-Sync selbst entwerten. Ein bestätigter Process-Loss wird nicht über den normalen Startpfad repariert.

## Checker-Architektur-Drift

`npm run check:checker-drift` (`scripts/check-checker-architecture.ts`) ist Teil von `verify` und `readiness`.

Der Meta-Guard schützt unter anderem, dass Source-Checker weiterhin die aktuelle Architektur verlangen:

- generationgebundener `recordProtectionStartRequested(...)` statt produktivem direkten `enabled=true`;
- `dispatchControlledStop(...)` statt Service-`stopSelf()`;
- generationgebundener Process-Loss-Recovery-Start;
- durable History/Event-/Emergency-Evidence **vor** temporärem Grant;
- Factory-Reset-Tombstone vor kontrolliertem Stop-Dispatch;
- atomare Prerequisite-Rejection über den gemeinsamen Helper;
- health-aware App-Open-Recovery statt pauschalem `enabled && !running`;
- fail-closed Migration-Save-Guard.

Spezifikation: `docs/CHECKER_ARCHITECTURE_DRIFT.md`.

## Usage Accounting Ownership

Aktuelle Architektur:

```text
ScrollShieldProtectionService
→ lokaler Tag + Rule-ID Bucket
→ UsageFlushCoordinator
→ UsageFlushWorker
→ SharedPreferences.commit()
```

`check:usage-accounting` ist auf diese Architektur aktualisiert. Es schützt Pending+In-Flight-Sichtbarkeit für Daily Limits, immutable one-in-flight Batches, Mergeback bei Fehlern, Shutdown-Drain, Midnight-Bucketing und die G1→G2-Usage-Grenze.

## Source-/Testvertrag

Pflichtbestandteile sind insbesondere:

- `check:checker-drift`;
- `check:android-project`;
- `check:prerequisite-stop-codes`;
- `check:protection-recovery`;
- `check:config-durability`;
- `check:runtime-config-state`;
- `check:usage-accounting`;
- `check:usage-flush-worker`;
- `check:start-handshake`;
- `check:lifecycle`;
- `check:device-matrix`;
- `check:native-stop-atomicity`;
- `ProtectionConfigDurabilityStoreTest`;
- `ProtectionConfigWriteCertaintyPolicyTest`;
- `ProtectionConfigRuntimePolicyTest`;
- `UsageAccountingPolicyTest`;
- `UsageFlushCoordinatorTest`;
- `UsageFlushWorkerTest`;
- `ProtectionConfigDurabilityInstrumentedTest`;
- `ProtectionServiceLifecyclePolicyTest`;
- `ProtectionServiceDispatchGuardTest`;
- `docs/CHECKER_ARCHITECTURE_DRIFT.md`;
- `docs/PROTECTION_CONFIG_DURABILITY.md`;
- `docs/PROTECTION_RUNTIME_CONFIG_STATE.md`;
- `docs/PROTECTION_SERVICE_DISPATCH_RACES.md`;
- `docs/ANDROID_DEVICE_TEST_MATRIX.md` mit APP-07..10, RUNTIME-01..06 und LIFE-12..15.

## Aktueller Arbeitsfokus

1. G6 extern entsperren und `npm run verify` auf exaktem Head ausführen.
2. Android JUnit + `assembleDebug`.
3. `connectedDebugAndroidTest`.
4. APP-07 bis APP-10 real ausführen, einschließlich Candidate-/Rollback-Storage-Failure, `UNSICHER→SICHER`, Runtime-Generation sowie stale Overlay-/Grant-Aktionen.
5. RUNTIME-01 bis RUNTIME-06 real ausführen; RUNTIME-04 mit explizitem G1-/G2-Bucketvergleich, RUNTIME-05/06 mit sofortigem Kill/Recovery nach erfolgreicher Freigabe.
6. LIFE-12 bis LIFE-15 real ausführen.
7. DISPATCH-01 bis DISPATCH-05 real ausführen.
8. Pre-/Post-Confirmation Process Loss und App-Open-Recovery-Grenzen real prüfen.
9. App-/Notification-/Start-/Destroy-/Boot-/Permission-/Target-App-Pfade real prüfen.
10. G8 Worker/Coordinator/Usage-Flush + 12h-Baseline.
11. G9 vollständige Physical Device Matrix.
12. G2/G5/G0/G3: Migration, Security-Audit, User Research und Accessibility-Evidence.

## Aktuelle CI-Grenze

Auf diesem Draft-Branch fehlt weiterhin ein vollständiger erfolgreicher Verify-Lauf. Manche jüngsten Zwischen-Heads haben keine registrierte Ausführung; andere registrierte Läufe erreichen keine belastbare vollständige Step-Evidence. **Exakte mutable Head-/Run-/Job-IDs werden ausschließlich in PR #8 geführt**.

Damit sind insbesondere **nicht als bestanden belegt**:

- `npm run verify`;
- `check:checker-drift`;
- `check:android-project`;
- `check:prerequisite-stop-codes`;
- `check:protection-recovery`;
- `check:native-stop-atomicity`;
- `check:start-handshake`;
- `check:config-durability`;
- `check:runtime-config-state`;
- `check:usage-accounting`;
- `check:usage-flush-worker`;
- `check:lifecycle`;
- `check:device-matrix`;
- `check:android-instrumentation`;
- Android JUnit;
- `ProtectionConfigWriteCertaintyPolicyTest`;
- `ProtectionConfigRuntimePolicyTest`;
- `UsageAccountingPolicyTest`;
- `UsageFlushCoordinatorTest`;
- `UsageFlushWorkerTest`;
- React/Vitest-App-Open-Recovery-Tests;
- Android Instrumentation;
- Gradle Debug Build / APK;
- APP-07 bis APP-10;
- RUNTIME-01 bis RUNTIME-06;
- LIFE-12 bis LIFE-15;
- DISPATCH-01 bis DISPATCH-05;
- reale Storage-Failure-/Overlay-/Grant-/Usage-Boundary-/Action-Commit-/`start-pending`-/`start-interrupted`-/`unclean-process-stop`-/App-Open-/PendingIntent-Evidence.

## Änderungsregel

Nach jedem größeren Repo-Block:

1. Gate-Status neu bewerten;
2. nur mit realer Evidenz auf `FERTIG` setzen;
3. neue Blocker konkret eintragen;
4. nächsten Arbeitsblock aus dem frühesten sinnvoll bearbeitbaren offenen Gate wählen;
5. PR bleibt Draft, bis die Release-Gates erfüllt sind.