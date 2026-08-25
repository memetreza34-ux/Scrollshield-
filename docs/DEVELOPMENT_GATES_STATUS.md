# ScrollShield – Entwicklungs-Gates und Live-Status

Status: **lebende Projektsteuerung**

Letzte Aktualisierung: **25. August 2026**

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
| G4 | Native Android Schutz | **TEILWEISE** | atomare System-/Terminal-Stopps, repo-weiter Stop-Atomicity-Guard, persistenter Start-Handshake, logisch geordnete Lifecycle-Grenzen und serialisierte Android Start-/Stop-Dispatches mit bounded controlled-destroy Token sind im Source implementiert; reale Ausführung fehlt | Android JUnit + Instrumentation + `assembleDebug` + reale LIFE-12..14/DISPATCH-01..04/Process-Kill-Szenarien |
| G5 | Security / Privacy / Supply Chain | **TEILWEISE** | Threat Model, Offline-First-Manifest, Privacy-Guard, gepinnter Gradle-SHA256 und `check:supply-chain` existieren; finaler Dependency/SBOM/Binary-Audit fehlt | echter Supply-Chain-Check + Dependency-/Manifest-Snapshot + finaler Binary-Audit + Threat-Review |
| G6 | Automatisierte Verifikation | **BLOCKIERT** | `npm run verify` inklusive `check:native-stop-atomicity`, `check:start-handshake`, `check:lifecycle` und `check:android-instrumentation` ist vorbereitet; GitHub Runner liefert weiterhin keine ausgeführten Steps | kompletter echter Verify-Lauf auf exaktem Head |
| G7 | Android Instrumentation/E2E | **TEILWEISE** | App-/Notification-, Prerequisite-, Boot/Update-, Start-/Destroy-, Process-Loss-, Start↔Stop- und Service-Dispatch-Race-Verträge existieren. Persistenz-Gewinner, Pending-Doppelstart, Same-Instance-Restart, bounded Destroy-Token und Fast-Restart-Teardown sind source-seitig definiert; echte Android-Ausführung fehlt | `connectedDebugAndroidTest` + LIFE-12..14 + DISPATCH-01..04 + Pre-/Post-Confirmation-Process-Kill real ausführen |
| G8 | Performance & Batterie | **TEILWEISE** | Worker/Coordinator-Architektur und Shutdown-Drain im Source; reale JUnit-/Instrumentation-/Gradle-/Device-Evidenz fehlt | Worker-/Coordinator-JUnit + Usage-Flush-Instrumentation real ausführen + `assembleDebug` + 12h-Baseline |
| G9 | Physical Device Matrix | **FEHLT** | Matrix inklusive LIFE-12..14 ist definiert; zusätzliche Dispatch-Race-Evidence ist in `PROTECTION_SERVICE_DISPATCH_RACES.md` spezifiziert, aber reale Geräte-Evidence fehlt | Pflichtgeräte/Szenarien mit Build-ID, Diagnose-JSON, Logcat und Screenrecord vollständig dokumentieren |
| G10 | Release Candidate Freeze & Evidence | **BLOCKIERT** | Evidence-Schema v2 existiert; Candidate darf vor G6–G9 nicht final eingefroren werden | exakte Kandidaten-SHA + echte Referenzen |
| G11 | Legal / Privacy / Support | **TEILWEISE** | Dokumente/Struktur existieren; finale reale Identität, Support-Mailbox und öffentliche Privacy-Domain fehlen | keine Platzhalter + überprüfbare öffentliche Angaben |
| G12 | Store / Play Review | **TEILWEISE** | Submission Packet, Screenshots und Deklarationstexte vorbereitet; finaler AAB/Reviewer-Nachweis fehlt | gegen signierten AAB verifizierte Angaben + Videos |
| G13 | Signing / Binary / Internal & Closed Test | **BLOCKIERT** | Release-Gate blockiert bewusst; kein final signierter freigegebener Kandidat | Gate PASS → AAB → Internal/Closed Test |
| G14 | Production Rollout & Operations | **BLOCKIERT** | Rollout- und Incident-Response-Prozess existieren; Produktion darf vor G13 nicht beginnen | Produktionsfreigabe + gestaffelter Rollout + benannte Verantwortliche |

## Aktueller Native-Stop-Vertrag

- `recordProtectionSystemStop(...)`: atomar `enabled=false + warning/system + timestamp + code + message`.
- `recordProtectionTerminalStop(...)`: atomar `enabled=false + timestamp + code + message`, ohne Event-Queue-Änderung.
- `persistProtectionSystemStopWithFallback(...)` und `persistProtectionTerminalStopWithFallback(...)` sind die einzigen erlaubten Atomic-First-Fallback-Wrapper.
- Direkte produktive Disable-/Stop-Diagnose-Kombinationen außerhalb dieser Fallbacks sind durch `check:native-stop-atomicity` verboten.

## Aktueller Start-/Race-Vertrag

- `ProtectionStartHandshakePolicy.nextLifecycleTimestamp(...)` ordnet Request/Confirmed-Start/Stop logisch streng hinter die höchste bekannte Lifecycle-Grenze.
- `recordProtectionStartRequested(...)` persistiert `enabled=true + lastStartRequestAt` gemeinsam.
- Ein frischer unbestätigter Request innerhalb von 15 Sekunden wird nativ idempotent behandelt; ein zweiter Start erzeugt keine neue Generation.
- Materialer Wall-Clock-Rollback kann `start-pending` nicht unbegrenzt festhalten.
- `recordProtectionServiceStarted(...)` liefert `CONFIRMED`, `SUPERSEDED_BY_STOP` oder `FAILED_CLOSED`.
- Nur `CONFIRMED` darf `RUNNING=true` erreichen.
- Persistiert ein terminaler Stop vor einer verspäteten Confirmation, gewinnt der Stop: kein neues `lastStartAt`, kein Diagnose-/Event-Overwrite.
- Ein echter Restart nach Stop erhält `newRequestAt > lastStopAt`.

## Aktueller Service-Dispatch-Vertrag

Detaillierte Spezifikation: `docs/PROTECTION_SERVICE_DISPATCH_RACES.md`.

Globale Reihenfolge:

```text
ProtectionServiceDispatchGuard.LOCK
→ EVENT_LOCK
```

Damit werden dauerhafte Lifecycle-Evidence und der dazugehörige Android-Service-Dispatch gemeinsam geordnet.

- App-Start serialisiert Pending-Prüfung → Request-Commit → `startForegroundService/startService`.
- Boot/App-Update nutzt dieselbe Request→Dispatch-Grenze.
- App-/Notification-/Prerequisite-Stop serialisiert Stop-Persistenz → `stopService`.
- Factory Reset serialisiert Tombstone → `stopService` gegen konkurrierende Starts.
- Kontrollierte Stopps setzen nach erfolgreichem `stopService()` einen process-lokalen one-shot Destroy-Token.
- Dieser Token ist an `System.nanoTime()` gebunden und maximal 30 Sekunden gültig.
- Abgelaufener/negativer Token oder fehlgeschlagener Stop-Dispatch darf einen späteren echten Destroy nicht maskieren.
- `RUNNING=false` wird am Anfang der serialisierten `onDestroy()`-Grenze veröffentlicht, damit ein paralleler Restart nicht als bereits laufend wegoptimiert wird.
- Eine bereits existierende Service-Instanz übernimmt nach erfolgreicher Same-Instance-Restart-Confirmation die neue Request-Generation.
- Ein altes `explicitStopRequested=true` bleibt nur solange relevant, wie keine neuere bestätigte Generation von dieser Instanz übernommen wurde.
- `check:start-handshake` und `check:lifecycle` erzwingen diese Grenzen source-seitig.
- `ProtectionStartHandshakePolicyTest`, `ProtectionServiceLifecyclePolicyTest`, `ProtectionServiceDispatchGuardTest` und `ProtectionDiagnosticsInstrumentedTest` enthalten passende Testverträge.

## Aktueller Arbeitsfokus

1. **G6 extern entsperren:** vollständigen Verify-Lauf auf exaktem Head ausführen.
2. **G7 LIFE-12:** terminalen Stop zwischen Request und Confirmation gewinnen lassen; verspätete Confirmation darf nichts überschreiben.
3. **G7 LIFE-13:** zweiten Start während `start-pending` auslösen; Request-Generation darf nicht erneuert werden.
4. **G7 LIFE-14:** kontrollierter Stop → sofortiger Restart vor altem `onDestroy()`; neue Aktivierung muss bestehen bleiben.
5. **G7 DISPATCH-01:** Request-Commit gegen konkurrierenden Stop bis zum tatsächlichen Android-Startdispatch testen.
6. **G7 DISPATCH-02:** Stop-Persistenz gegen sofortigen Restart bis zum tatsächlichen `stopService()` testen.
7. **G7 DISPATCH-03:** residualen kontrollierten Destroy nach Fast-Restart testen.
8. **G7 DISPATCH-04:** abgelaufenen controlled-stop Token gegen späteren echten Destroy testen.
9. **G7 Pre-Confirmation-Abbruch:** `start-pending` → `start-interrupted` → normaler Retry → `active`.
10. **G7 Post-Start-Process-Kill:** bestätigter `lastStartAt` → harter Kill → `unclean-process-stop` → Recovery → `active`.
11. **G7 App-/Notification-/Start-/Destroy-/Boot-/Permission-/Target-App-Pfade real prüfen.**
12. **G8:** Worker-/Coordinator-JUnit, Usage-Flush-Instrumentation, Build und 12h-Baseline.
13. **G9:** vollständige Physical Device Matrix.
14. **G2/G5/G0/G3:** Migration, Security-Audit, User Research und Accessibility-Evidence.

## Aktuelle CI-Grenze

GitHub Actions liefert auf diesem Draft-Branch weiterhin auf den zuletzt geprüften Heads einen `verify`-Job ohne ausgeführte Steps. Die exakte aktuelle Head-SHA und der zugehörige Lauf werden im PR #8 synchronisiert.

Damit sind insbesondere **nicht als bestanden belegt**:

- `npm run verify`;
- `check:native-stop-atomicity`;
- `check:start-handshake`;
- `check:lifecycle`;
- `check:android-instrumentation`;
- `ProtectionStartHandshakePolicyTest`;
- `ProtectionServiceLifecyclePolicyTest`;
- `ProtectionServiceDispatchGuardTest`;
- neue Start↔Stop-/Dispatch-Race-Instrumentation;
- Android JUnit;
- Android Instrumentation;
- Gradle Debug Build;
- APK;
- LIFE-12 bis LIFE-14;
- DISPATCH-01 bis DISPATCH-04;
- reale `start-pending`-/`start-interrupted`-/`unclean-process-stop`-Evidence.

## Änderungsregel

Nach jedem größeren Repo-Block:

1. Gate-Status neu bewerten;
2. nur mit realer Evidenz auf `FERTIG` setzen;
3. neue Blocker konkret eintragen;
4. nächsten Arbeitsblock aus dem frühesten sinnvoll bearbeitbaren offenen Gate wählen;
5. PR bleibt Draft, bis die Release-Gates erfüllt sind.
