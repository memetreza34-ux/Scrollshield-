# ScrollShield – Entwicklungs-Gates und Live-Status

Status: **lebende Projektsteuerung**

Letzte Aktualisierung: **18. August 2026**

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
| G4 | Native Android Schutz | **TEILWEISE** | Usage Access, Overlay, FGS, Regeln, Recovery, Diagnostik, stabile atomar persistierte Prerequisite-Stop-Codes und crash-sicherer Native-Datentransfer sind im Source implementiert; reale Ausführung fehlt | Android JUnit + Instrumentation + `assembleDebug` + reale Geräte |
| G5 | Security / Privacy / Supply Chain | **TEILWEISE** | Threat Model, Offline-First-Manifest, Privacy-Guard, gepinnter Gradle-SHA256 und `check:supply-chain` existieren; finaler Dependency/SBOM/Binary-Audit fehlt | echter Supply-Chain-Check + Dependency-/Manifest-Snapshot + finaler Binary-Audit + Threat-Review |
| G6 | Automatisierte Verifikation | **BLOCKIERT** | `npm run verify` und Android-Stufen sind vorbereitet; GitHub Runner stoppt vor Step 1 wegen Billing/Spending-Limit | kompletter echter Verify-Lauf auf exaktem Head |
| G7 | Android Instrumentation/E2E | **TEILWEISE** | Runtime-State/Lifecycle, Manifest/Permissions, Boot-Recovery, Native-Drain/ACK/Reset, Retention, Android-SharedPreferences-Usage-Flush sowie sprachunabhängige und atomar persistierte Prerequisite-Stop-Codes besitzen Source-/`androidTest`-Verträge. Reale Permission-Loss-/Overlay-/Service-Ausführung fehlt | `connectedDebugAndroidTest` real ausführen + echte Berechtigungsentziehung während laufendem Service + Overlay-/Notification-/Service-Flows |
| G8 | Performance & Batterie | **TEILWEISE** | `ScrollShieldProtectionService` ist auf `UsageFlushCoordinator` + `UsageFlushWorker` verdrahtet. Periodische Usage-`commit()`-Writes laufen nicht mehr im Service-Main-Thread; Pending/In-Flight bleibt im Tageslimit sichtbar, Shutdown besitzt einen seriellen Final-Drain und `UsageFlushInstrumentedTest` prüft den Android-SharedPreferences-Pfad im Testvertrag. Reale JUnit-/Instrumentation-/Gradle-/Device-Evidenz fehlt weiterhin | Worker-/Coordinator-JUnit + Usage-Flush-Instrumentation real ausführen + `assembleDebug` + Process-Kill-Regressions + 12h-Baseline |
| G9 | Physical Device Matrix | **FEHLT** | Matrix ist definiert, aber nicht vollständig ausgeführt | Pflichtgeräte/Szenarien mit Build-ID/Evidenz vollständig dokumentieren |
| G10 | Release Candidate Freeze & Evidence | **BLOCKIERT** | Evidence-Schema v2 existiert; Candidate darf vor G6–G9 nicht final eingefroren werden | exakte Kandidaten-SHA + echte Referenzen |
| G11 | Legal / Privacy / Support | **TEILWEISE** | Dokumente/Struktur existieren; finale reale Identität, Support-Mailbox und öffentliche Privacy-Domain fehlen | keine Platzhalter + überprüfbare öffentliche Angaben |
| G12 | Store / Play Review | **TEILWEISE** | Submission Packet, Screenshots und Deklarationstexte vorbereitet; finaler AAB/Reviewer-Nachweis fehlt | gegen signierten AAB verifizierte Angaben + Videos |
| G13 | Signing / Binary / Internal & Closed Test | **BLOCKIERT** | Release-Gate blockiert bewusst; kein final signierter freigegebener Kandidat | Gate PASS → AAB → Internal/Closed Test |
| G14 | Production Rollout & Operations | **BLOCKIERT** | Rollout- und Incident-Response-Prozess existieren; Produktion darf vor G13 nicht beginnen | Produktionsfreigabe + gestaffelter Rollout + benannte Verantwortliche |

## Wichtige bisherige Fortschritte

- Masterprozess auf G0–G14 umgestellt.
- PR-01..PR-18, User-Research-Vertrag, Threat Model, Performance-/Supply-Chain-/Incident-Dokumente angelegt.
- Android-v1 bleibt offline-first; `android.permission.INTERNET` entfernt und durch mehrere Source-/Runtime-Verträge blockiert.
- Gradle Wrapper 8.14.3 mit offiziellem Distribution-SHA256 gepinnt.
- Android-Instrumentation vom Beispieltest auf reale Runtime-Verträge ausgebaut.
- V0.7-Migration bleibt transaktional und bytegenau archiviert.
- Native→React-Datentransfer gehärtet: persistenter Pending-Batch, UUID-Batch-ID, Save-before-ACK, Replay ohne Doppeladdition und fail-closed Cursorprüfung.
- Factory Reset mit `factory_reset_pending_v1` gegen verspätete Native-Writes gehärtet.
- Native Retention hinter durablem ACK verdrahtet; unbestätigte Usage bleibt erhalten.
- Usage-Persistenzpfad produktiv auf Worker umgestellt:
  - `UsageFlushCoordinator.java` verwaltet synchronisiert Pending/In-Flight/Failure-Semantik;
  - höchstens ein In-Flight-Flush;
  - Tageslimit berücksichtigt Pending + In-Flight;
  - Write-Failure merged verlustfrei zurück;
  - stale Completion wird ignoriert;
  - `UsageFlushWorker.java` besitzt einen echten `Executors.newSingleThreadExecutor(...)`;
  - SharedPreferences-`commit()` bleibt bewusst synchron **innerhalb des Workers**, damit `false` als Persistenzfehler sichtbar bleibt;
  - Runtime-Exception oder Executor-Rejection führen zu Failure-Mergeback;
  - `ScrollShieldProtectionService` besitzt keine eigene Pending-Usage-Map und keinen eigenen Flush-Timer mehr;
  - `addPendingUsageBucket()` schreibt in den Coordinator;
  - `flushPendingUsage()` friert einen Coordinator-Batch ein und übergibt ihn an den Worker;
  - `getDailyUsageMs()` addiert persistierte + pending + in-flight Usage saturierend;
  - beim Service-Shutdown wird der letzte Usage-Tick erfasst, ein Force-Flush angefordert und danach ein serieller Worker-Drain eingeplant;
  - der Shutdown-Drain verarbeitet Usage, die während eines früheren In-Flight-Writes neu eingetroffen ist, und kann einen fehlgeschlagenen In-Flight-Batch einmal über den finalen Drain erneut versuchen;
  - `UsageFlushCoordinatorTest.java` und `UsageFlushWorkerTest.java` decken State-Machine, Worker-Grenzen und Shutdown-Drain ab;
  - `UsageFlushInstrumentedTest.java` prüft den Produktions-Worker mit echten Android-`SharedPreferences` sowie Pending Usage während eines blockierten In-Flight-Writes;
  - `check:usage-flush-worker` verlangt die echte Service-Verdrahtung und verbietet einen direkten `SharedPreferences.commit()` im Protection Service;
  - `check:android-instrumentation` verlangt den Android-Usage-Flush-Testvertrag.
- Prerequisite-/Permission-Loss-Diagnostik gehärtet:
  - `ProtectionStopReasonPolicy` besitzt zentrale stabile Codes für Usage Access, Overlay, Notifications, aktive Regeln und Ziel-App;
  - `ScrollShieldProtectionService.onStartCommand()` verwendet diese Codes explizit bei fehlenden Startvoraussetzungen;
  - `enforceCurrentApp()` verwendet dieselben Codes bei Laufzeitverlust;
  - `ScrollShieldNativePlugin.recordProtectionPrerequisiteStop(...)` persistiert unter `EVENT_LOCK` in **einem** synchronen Commit: `enabled=false`, Warn-Event, Stop-Zeitpunkt, exakten Stop-Code und Stop-Nachricht;
  - dadurch existiert im Primärpfad kein Crash-Fenster mehr zwischen separaten Deaktivierungs-/Event-/Diagnose-Commits;
  - `stopForProtectionPrerequisite(reasonCode, description)` verwendet zuerst die atomare Native-Operation und greift nur bei `commit=false` auf einen expliziten Best-Effort-Fallback zurück;
  - lokalisierter Meldungstext entscheidet nicht mehr über den neuen produktiven Service-Stop-Code;
  - `classifySystemWarning(...)` bleibt nur als Legacy-/Kompatibilitäts-Fallback bestehen;
  - `ProtectionStopReasonPolicyTest.java` sperrt die stabilen Werte;
  - `ProtectionDiagnosticsInstrumentedTest.java` prüft die atomare Transaktion (`enabled=false`, Event-Queue, Code, Nachricht, Zeitstempel), anderssprachige Meldungstexte und den Legacy-Fallback;
  - `check:prerequisite-stop-codes` erzwingt die atomare Service-/Plugin-Verdrahtung und ist Teil von `npm run verify` sowie des Readiness-Reports;
  - `check:lifecycle` und `check:android-instrumentation` wurden auf denselben atomaren Vertrag umgestellt.
- `check:native-drain-ack`, `check:native-retention`, `check:usage-flush-worker`, `check:prerequisite-stop-codes` und `check:android-instrumentation` sind Bestandteil von `npm run verify`.

## Aktueller Arbeitsfokus

### Jetzt aktiv

1. **G6 extern entsperren:** GitHub Actions Billing/Spending-Limit korrigieren; danach vollständige Verify-/Android-JUnit-/Debug-Build-Kette real ausführen.
2. **G7 echte Permission-Loss-E2E:** auf Emulator/Gerät Schutz starten und Usage Access / Overlay / Notifications während laufendem Service entziehen; Stop-Code, Aktivierungsstatus, Event und UI-Recovery prüfen.
3. **G8 verifizieren:** Coordinator-/Worker-JUnit einschließlich Shutdown-Drain real ausführen, Android-Kompilierung bestätigen und `UsageFlushInstrumentedTest` auf Emulator/Gerät ausführen.
4. **G7:** echte Overlay-/Service-/Notification-End-to-End-Fälle ergänzen und anschließend `connectedDebugAndroidTest` real ausführen.
5. **G9:** stabilen Debug-Kandidaten auf der physischen Device Matrix testen.
6. **G2:** reale V0.7-Migration mit bytegenauer Evidence durchführen.
7. **G8/G9:** 12h/OEM-/Mitternacht-/DST-/Prozesskill-Evidence erfassen.
8. **G5:** finalen Dependency-/SBOM-/Manifest-Snapshot für Release-Evidence erzeugen.
9. **G0/G3:** reale User-Research-/Accessibility-Sessions mit stabilem APK durchführen.

### Nicht jetzt anfangen

- kaufbares Pro-Abo;
- Cloud-Sync;
- iOS-Parität;
- Reels-only Accessibility Service;
- neue große Produktblöcke, die G6–G9 weiter nach hinten schieben.

## Gate-Abhängigkeiten

```text
G0 Produkt
  ↓
G1 Architektur
  ↓
G2 Daten ──────────┐
G3 UX              │
G4 Native          │
G5 Security        │
  └──────┬─────────┘
         ↓
G6 Automatisierte Verifikation
         ↓
G7 Instrumentation
         ↓
G8 Performance/Batterie
         ↓
G9 Physical Device Matrix
         ↓
G10 Candidate Freeze + Evidence
         ↓
G11 Legal/Privacy/Support
         ↓
G12 Store/Play Review
         ↓
G13 Signing + Play Tests
         ↓
G14 Production + Operations
```

Parallelisierung ist möglich, aber ein späteres Gate darf kein fehlendes frühes Release-Gate umgehen.

## Änderungsregel

Nach jedem größeren Repo-Block:

1. Gate-Status neu bewerten;
2. nur mit realer Evidenz auf `FERTIG` setzen;
3. neue Blocker konkret eintragen;
4. nächsten Arbeitsblock aus dem frühesten sinnvoll bearbeitbaren offenen Gate wählen;
5. PR bleibt Draft, bis die Release-Gates erfüllt sind.
