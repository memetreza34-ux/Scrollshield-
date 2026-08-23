# ScrollShield – Entwicklungs-Gates und Live-Status

Status: **lebende Projektsteuerung**

Letzte Aktualisierung: **23. August 2026**

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
| G4 | Native Android Schutz | **TEILWEISE** | Usage Access, Overlay, FGS, Regeln, Recovery, Diagnostik, atomare System-Stops mit Warn-Event, atomare explizite Terminal-Stopps ohne Warn-Event und crash-sicherer Native-Datentransfer sind im Source implementiert; reale Ausführung fehlt | Android JUnit + Instrumentation + `assembleDebug` + reale Geräte |
| G5 | Security / Privacy / Supply Chain | **TEILWEISE** | Threat Model, Offline-First-Manifest, Privacy-Guard, gepinnter Gradle-SHA256 und `check:supply-chain` existieren; finaler Dependency/SBOM/Binary-Audit fehlt | echter Supply-Chain-Check + Dependency-/Manifest-Snapshot + finaler Binary-Audit + Threat-Review |
| G6 | Automatisierte Verifikation | **BLOCKIERT** | `npm run verify` und Android-Stufen sind vorbereitet; GitHub Runner stoppt vor Step 1 wegen Billing/Spending-Limit | kompletter echter Verify-Lauf auf exaktem Head |
| G7 | Android Instrumentation/E2E | **TEILWEISE** | Runtime-State/Lifecycle, Manifest/Permissions, atomare Boot-/App-Update-Recovery, Native-Drain/ACK/Reset, Retention, Android-SharedPreferences-Usage-Flush, atomare Runtime-/Native-Start-Prerequisites, technische `start_failed`-Pfade, atomarer `unexpected_service_destroy` sowie atomare `manual_app_stop`-/`notification_action_stop`-Terminalpfade ohne Warn-Event besitzen Source-/Testverträge. `unclean-process-stop` besitzt kontrollierten Restart-Recovery. Reale App-/Notification-Stop-, Permission-Loss-, Process-Kill-, Boot-Recovery-, Start-/Destroy-, Ziel-App-Deinstallations-, Overlay- und Service-Ausführung fehlt | `connectedDebugAndroidTest` real ausführen + App-/Notification-Stopp + echten Boot/Update-/Prozesskill-/Start-/Destroy-Pfad + `Schutz wiederherstellen` + Permissions + Ziel-App-Verlust bestätigen |
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
- Native System- und Terminal-Stop-Diagnostik gehärtet:
  - `ProtectionStopReasonPolicy` besitzt zentrale stabile Codes für Usage Access, Overlay, Notifications, aktive Regeln, Ziel-App und `START_FAILED = "start_failed"`;
  - `ProtectionServiceLifecyclePolicy` hält zusätzlich `MANUAL_APP_STOP_CODE = "manual_app_stop"`, `NOTIFICATION_ACTION_STOP_CODE = "notification_action_stop"` und `UNEXPECTED_SERVICE_DESTROY_CODE = "unexpected_service_destroy"`;
  - `ScrollShieldNativePlugin.recordProtectionSystemStop(...)` ist die generische atomare System-Transaktion unter `EVENT_LOCK` und persistiert in **einem** synchronen Commit: `enabled=false`, `warning/system`, Stop-Zeitpunkt, exakten Stop-Code und Stop-Nachricht;
  - `recordProtectionPrerequisiteStop(...)` bleibt als kompatibler Alias auf diese generische Transaktion bestehen;
  - `persistProtectionSystemStopWithFallback(...)` zentralisiert den Atomic-First-Pfad und führt nur bei `commit=false` `setProtectionEnabled(false)` + `recordProtectionStop(...)` als Best-Effort-Fallback aus;
  - `ScrollShieldNativePlugin.recordProtectionTerminalStop(...)` ist die getrennte atomare Transaktion für bewusste/caller-supplied Terminal-Stopps: `enabled=false`, Stop-Zeitpunkt, exakter Code und Nachricht werden in **einem** Commit gespeichert;
  - dieser Terminal-Stop schreibt bewusst **nicht** `EVENT_QUEUE_KEY` und erzeugt kein `warning/system`-Event;
  - `persistProtectionTerminalStopWithFallback(...)` zentralisiert dafür ebenfalls Atomic-First + Best-Effort-Fallback nur bei `commit=false`;
  - `ScrollShieldNativePlugin.stopProtectionService(...)` verwendet den Terminal-Wrapper und `MANUAL_APP_STOP_CODE` als stabilen Default; explizite React→Native-Gründe bleiben erhalten, werden aber jetzt gemeinsam mit `enabled=false` atomar persistiert;
  - der Notification-Button `ACTION_STOP` verwendet denselben Terminal-Wrapper mit `NOTIFICATION_ACTION_STOP_CODE`, bevor `stopSelf()` ausgeführt wird;
  - `explicitStopRequested=true` bleibt gesetzt, sodass ein folgender `onDestroy()` keinen falschen Systemfehler erzeugt;
  - `ScrollShieldProtectionService.onStartCommand()` und `enforceCurrentApp()` verwenden weiterhin explizite stabile Prerequisite-Codes;
  - `stopForProtectionPrerequisite(...)` delegiert vollständig an den zentralen System-Stop-Wrapper;
  - `ScrollShieldNativePlugin.startProtectionService()` verwendet bei fehlenden Permissions/Ziel-App weiterhin `rejectProtectionStartPrerequisite(...)`, der vor `call.reject()` den zentralen System-Stop-Wrapper ausführt;
  - **technische Native-Start-Exception:** wirft `startForegroundService/startService`, wird `START_FAILED` atomar über denselben System-Wrapper persistiert;
  - **technische Service-Start-Exception:** wirft `startForeground()` in `onCreate()`, wird ebenfalls `START_FAILED` atomar persistiert; `explicitStopRequested=true` verhindert, dass `onDestroy()` den kontrollierten Startfehler als `unexpected_service_destroy` überschreibt;
  - **unerwarteter Lifecycle-Destroy:** wird `onDestroy()` bei weiterhin aktivierter Protection ohne expliziten Stop aufgerufen, persistiert der Service `UNEXPECTED_SERVICE_DESTROY_CODE` über `persistProtectionSystemStopWithFallback(...)`;
  - der Lifecycle-Checker isoliert App-, Notification- und Destroy-Pfade und verbietet dort die jeweils früheren direkten `setProtectionEnabled(false)`-/`recordProtectionStop(...)`-Einzelwrites; beim System-Destroy bleibt zusätzlich ein getrenntes Warn-Event verboten, weil der gemeinsame System-Wrapper es atomar übernimmt;
  - harte Prozessbeendigung bleibt davon getrennt: Android garantiert bei Process-Kill kein `onDestroy()`; dieser Fall wird weiter über `unclean-process-stop` nach dem nächsten Status-Read erkannt;
  - lokalisierter Meldungstext entscheidet nicht über die produktiven stabilen Codes; `classifySystemWarning(...)` bleibt Legacy-/Kompatibilitäts-Fallback;
  - `ProtectionStopReasonPolicyTest.java` sperrt `start_failed`; `ProtectionServiceLifecyclePolicyTest.java` sperrt alle drei Lifecycle-Codes inklusive `manual_app_stop`;
  - `ProtectionDiagnosticsInstrumentedTest.java` prüft die System-Transaktion direkt mit `START_FAILED` und `UNEXPECTED_SERVICE_DESTROY_CODE`;
  - derselbe Instrumentation-Vertrag prüft `manual_app_stop` und `notification_action_stop` über `recordProtectionTerminalStop(...)` und verlangt, dass die bestehende `protection_events`-Queue unverändert bleibt;
  - `check:prerequisite-stop-codes`, `check:lifecycle` und `check:android-instrumentation` erzwingen diese getrennte atomare System-/Terminal-Architektur.
- Process-Kill-/Restart-/Boot-Recovery gehärtet:
  - `NativeProtectionHealth` besitzt den eigenen Zustand `unclean-process-stop`;
  - Bedingung: Schutz ist weiterhin gespeichert aktiv, der Dienst läuft nicht, und `lastStartAt` ist neuer als `lastStopAt`;
  - damit wird ein fehlender Dienst nach einem bestätigten neueren Start nicht länger mit gewöhnlicher `stale-activation` vermischt;
  - die UI zeigt dafür `PROZESS ABGEBROCHEN`, verwendet bewusst **keinen älteren Stop-Grund** als aktuelle Erklärung und bietet `Schutz wiederherstellen` an;
  - `NativeProtection.recoverAfterProcessLoss(...)` liest vor Recovery erneut den echten Native-Status;
  - ein bereits wieder laufender Dienst wird nicht doppelt gestartet;
  - Recovery aus einem anderen Zustand als `unclean-process-stop` wird abgelehnt;
  - vor Neustart wird die aktuelle Config neu synchronisiert;
  - `syncProtectionConfig()` liefert `unavailableAppIds`, die gegen die aktiv konfigurierten Android-Ziele geprüft werden;
  - sind **alle** aktiven Android-Ziele unavailable oder existiert kein gültiges aktives Android-Ziel mehr, wird vor Service-Start fail-closed mit `target_app_missing` gestoppt und der Status erneut gelesen;
  - teilweise Unverfügbarkeit blockiert nicht, solange mindestens ein aktives Ziel installiert bleibt;
  - `target_app_missing` wird in der Statuskarte persistent als `ZIEL-APP FEHLT` / `Keine installierte Ziel-App verfügbar` dargestellt;
  - bei verbleibendem Ziel läuft der native Start über den atomar diagnostizierenden Preflight;
  - `ScrollShieldBootReceiver.stopRecovery(...)` delegiert ebenfalls an `persistProtectionSystemStopWithFallback(...)`, statt einen eigenen Atomik-/Fallback-Pfad zu duplizieren;
  - `BootRecoveryInstrumentedTest.java` prüft deaktivierten Zustand, exakten `recovery_target_app_missing`-Code, Nachricht, Zeitstempel und persistiertes System-Warn-Event; `ACTION_MY_PACKAGE_REPLACED` bleibt abgedeckt;
  - `check:protection-recovery` erzwingt die Delegation an den zentralen System-Stop-Wrapper und die Instrumentation-Evidence-Struktur;
  - der Checker ist Pflichtbestandteil von `verify` und `readiness`;
  - nach Recovery wird der Native-Status erneut gelesen;
  - die UI meldet `wiederhergestellt` nur bei `running && enabled && health == active`;
  - `androidProtectionPrerequisites.ts`, `PermissionsScreen.test.tsx`, `nativeProtection.test.ts`, `nativeProtectionHealth.test.ts` und `NativeProtectionStatusPanel.test.tsx` schützen Permission-/Target-App-/Process-Loss-Grenzen;
  - `docs/PROCESS_LOSS_RECOVERY.md` dokumentiert den vollständigen Vertrag und die noch fehlende reale Android-Evidence.
- `check:native-drain-ack`, `check:native-retention`, `check:usage-flush-worker`, `check:prerequisite-stop-codes`, `check:process-loss`, `check:protection-recovery`, `check:lifecycle` und `check:android-instrumentation` sind Bestandteil von `npm run verify`.

## Aktueller Arbeitsfokus

### Jetzt aktiv

1. **G6 extern entsperren:** GitHub Actions Billing/Spending-Limit korrigieren; danach vollständige Verify-/Android-JUnit-/Debug-Build-Kette real ausführen.
2. **G7 App-/Notification-Stopp real prüfen:** normalen App-Stopp und `Schutz stoppen` aus der Dauerbenachrichtigung separat ausführen; `enabled=false`, `manual_app_stop` bzw. `notification_action_stop`, exakte Nachricht und **kein neues `warning/system`-Event** bestätigen.
3. **G7 technische Start-/Destroy-Fehler real prüfen:** Native Service-Start und Foreground-Start gezielt fehlschlagen lassen; zusätzlich einen unerwarteten Lifecycle-Destroy bei `enabled=true && explicitStopRequested=false` auslösen. `enabled=false`, `start_failed` bzw. `unexpected_service_destroy`, Warn-Event und kein Diagnose-Overwrite bestätigen.
4. **G7 echte Boot-/App-Update-Recovery-Evidence:** aktivierten Schutz mit gültigem Ziel vorbereiten, Boot/`MY_PACKAGE_REPLACED` real auslösen und bei gezielt fehlender Voraussetzung `enabled=false`, exakten Recovery-Code, Warn-Event und UI-Diagnose bestätigen.
5. **G7 echte Process-Kill-/Recovery-Evidence:** laufenden Schutz mit bestätigtem `lastStartAt` hart beenden, danach ohne vorausgesetzten `onDestroy()`-Callback `unclean-process-stop` beobachten und `Schutz wiederherstellen` real ausführen.
6. **G7 Native-Start-Preflight real prüfen:** Usage Access / Overlay / Notifications bzw. installierte Ziel-App jeweils vor Start fehlen lassen und `enabled=false`, exakten Stop-Code sowie Warn-Event auf Android bestätigen.
7. **G7 echte Target-App-Recovery-Evidence:** nach bestätigtem Dienststart alle aktiven Ziel-Apps deinstallieren → `target_app_missing`/`ZIEL-APP FEHLT` bestätigen; danach Mehrziel-Fall testen, bei dem nur eine aktive App fehlt und mindestens eine installiert bleibt.
8. **G7 echte Permission-Loss-E2E:** Usage Access / Overlay / Notifications vor bzw. während Recovery und während laufendem Service einzeln entziehen; Stop-Code, Aktivierungsstatus, Event und konkrete UI-Diagnose prüfen.
9. **G8 verifizieren:** Coordinator-/Worker-JUnit einschließlich Shutdown-Drain real ausführen, Android-Kompilierung bestätigen und `UsageFlushInstrumentedTest` auf Emulator/Gerät ausführen.
10. **G9:** stabilen Debug-Kandidaten auf der physischen Device Matrix testen.
11. **G2:** reale V0.7-Migration mit bytegenauer Evidence durchführen.
12. **G8/G9:** 12h/OEM-/Mitternacht-/DST-/Prozesskill-Evidence erfassen.
13. **G5:** finalen Dependency-/SBOM-/Manifest-Snapshot für Release-Evidence erzeugen.
14. **G0/G3:** reale User-Research-/Accessibility-Sessions mit stabilem APK durchführen.

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
