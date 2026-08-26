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
| G4 | Native Android Schutz | **TEILWEISE** | atomare Stops, persistenter Start-Handshake, generationgebundene durable Config, Candidate-Rollback, process-lokaler Config-Write-Certainty-State, stabile Rule-Snapshot-Publikation, serialisierte Dispatches und generationgebundene Notification-Stop-Aktionen sind im Source implementiert; reale Ausführung fehlt | Android JUnit + Instrumentation + `assembleDebug` + APP-07..09 + LIFE-12..15 + DISPATCH-01..05 + Process-Kill real |
| G5 | Security / Privacy / Supply Chain | **TEILWEISE** | Threat Model, Offline-First-Manifest, Privacy-Guard, gepinnter Gradle-SHA256 und `check:supply-chain` existieren; finaler Dependency/SBOM/Binary-Audit fehlt | echter Supply-Chain-Check + Dependency-/Manifest-Snapshot + finaler Binary-Audit + Threat-Review |
| G6 | Automatisierte Verifikation | **BLOCKIERT** | `npm run verify` inklusive `check:native-stop-atomicity`, `check:start-handshake`, `check:config-durability`, `check:lifecycle` und `check:android-instrumentation` ist vorbereitet; GitHub Runner liefert weiterhin keine ausgeführten Steps | kompletter echter Verify-Lauf auf exaktem Head |
| G7 | Android Instrumentation/E2E | **TEILWEISE** | App-/Notification-, Prerequisite-, Boot/Update-, Start-/Destroy-, Process-Loss-, Config-Durability-/Write-Certainty-, Start↔Stop-, Service-Dispatch- und stale-PendingIntent-Verträge existieren; echte Android-Ausführung fehlt | `connectedDebugAndroidTest` + APP-07..09 + LIFE-12..15 + DISPATCH-01..05 + Pre-/Post-Confirmation-Process-Kill real |
| G8 | Performance & Batterie | **TEILWEISE** | Worker/Coordinator-Architektur und Shutdown-Drain im Source; reale JUnit-/Instrumentation-/Gradle-/Device-Evidenz fehlt | Worker-/Coordinator-JUnit + Usage-Flush-Instrumentation real ausführen + `assembleDebug` + 12h-Baseline |
| G9 | Physical Device Matrix | **FEHLT** | Matrix inklusive APP-07..09 und LIFE-12..15 ist definiert; DISPATCH-01..05 sind spezifiziert, aber reale Geräte-Evidence fehlt | Pflichtgeräte/Szenarien mit Build-ID, Diagnose-JSON, Logcat und Screenrecord vollständig dokumentieren |
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

Der Service veröffentlicht neue Regeln erst nach zwei generationstreuen Lock-Grenzen:

```text
Snapshot configJson + configGeneration
→ lokal parsen
→ aktuelle configJson + configGeneration erneut prüfen
→ nur bei exakter Gleichheit rulesByPackage übernehmen
```

### Config Write Certainty

Process-lokal gilt:

```text
candidate=true                   → SICHER
candidate=false + rollback=true  → SICHER
candidate=false + rollback=false → UNSICHER
```

Bei `UNSICHER` dürfen im selben Prozess kein neuer App-Start, kein Boot-/Update-Startrequest und keine current Pending-/Confirmation-Entscheidung erfolgen. Erst ein späterer erfolgreicher Config-Commit setzt den Zustand wieder auf `SICHER`.

Diagnose/Debug exportiert bzw. zeigt:

```text
protectionConfigWriteStateCertain
SICHER / UNSICHER
```

### Lifecycle / Dispatch

- System-/Terminal-Stopps bleiben atomar und source-guarded.
- frischer Pending-Start ist nur mit aktueller, sicherer Config-Generation idempotent;
- `recordProtectionServiceStarted(...)` liefert `CONFIRMED`, `SUPERSEDED_BY_STOP` oder `FAILED_CLOSED`; nur `CONFIRMED` darf `RUNNING=true` erreichen;
- globale Dispatch-Reihenfolge: `ProtectionServiceDispatchGuard.LOCK → EVENT_LOCK`;
- Startpersistenz und Android-Startdispatch sowie Stop-Persistenz und `stopService()` werden gemeinsam serialisiert;
- Controlled-stop Destroy-Suppression ist process-lokal, one-shot und auf 30 Sekunden `System.nanoTime()` begrenzt;
- Same-Instance-Restart überträgt die aktuelle Request-Generation auf die lebende Service-Instanz;
- alte Notification-Stop-Aktionen dürfen neue Generationen nicht stoppen.

## Source-/Testvertrag

Pflichtbestandteile sind insbesondere:

- `check:config-durability`;
- `check:start-handshake`;
- `check:lifecycle`;
- `check:native-stop-atomicity`;
- `ProtectionConfigDurabilityStoreTest`;
- `ProtectionConfigWriteCertaintyPolicyTest`;
- `ProtectionConfigDurabilityInstrumentedTest`;
- `ProtectionServiceLifecyclePolicyTest`;
- `ProtectionServiceDispatchGuardTest`;
- `docs/PROTECTION_CONFIG_DURABILITY.md`;
- `docs/PROTECTION_SERVICE_DISPATCH_RACES.md`;
- `docs/ANDROID_DEVICE_TEST_MATRIX.md` mit APP-07..09 und LIFE-12..15.

## Aktueller Arbeitsfokus

1. G6 extern entsperren und `npm run verify` auf exaktem Head ausführen.
2. Android JUnit + `assembleDebug`.
3. `connectedDebugAndroidTest`.
4. APP-07 bis APP-09 real ausführen, einschließlich Candidate-/Rollback-Storage-Failure und `UNSICHER→SICHER`-Recovery.
5. LIFE-12 bis LIFE-15 real ausführen.
6. DISPATCH-01 bis DISPATCH-05 real ausführen.
7. Pre-/Post-Confirmation Process Loss real prüfen.
8. App-/Notification-/Start-/Destroy-/Boot-/Permission-/Target-App-Pfade real prüfen.
9. G8 Worker/Coordinator/Usage-Flush + 12h-Baseline.
10. G9 vollständige Physical Device Matrix.
11. G2/G5/G0/G3: Migration, Security-Audit, User Research und Accessibility-Evidence.

## Aktuelle CI-Grenze

GitHub Actions liefert auf diesem Draft-Branch weiterhin auf den zuletzt geprüften Heads einen `verify`-Job ohne ausgeführte Steps. **Exakte mutable Head-/Run-/Job-IDs werden ausschließlich in PR #8 geführt**.

Damit sind insbesondere **nicht als bestanden belegt**:

- `npm run verify`;
- `check:native-stop-atomicity`;
- `check:start-handshake`;
- `check:config-durability`;
- `check:lifecycle`;
- `check:android-instrumentation`;
- Android JUnit;
- `ProtectionConfigWriteCertaintyPolicyTest`;
- Android Instrumentation;
- Gradle Debug Build / APK;
- APP-07 bis APP-09;
- LIFE-12 bis LIFE-15;
- DISPATCH-01 bis DISPATCH-05;
- reale Storage-Failure-/`start-pending`-/`start-interrupted`-/`unclean-process-stop`-/PendingIntent-Evidence.

## Änderungsregel

Nach jedem größeren Repo-Block:

1. Gate-Status neu bewerten;
2. nur mit realer Evidenz auf `FERTIG` setzen;
3. neue Blocker konkret eintragen;
4. nächsten Arbeitsblock aus dem frühesten sinnvoll bearbeitbaren offenen Gate wählen;
5. PR bleibt Draft, bis die Release-Gates erfüllt sind.
