# ScrollShield – Engineering Checks

Status: **verbindlicher technischer Verifikationsvertrag**

Letzte Aktualisierung: **23. August 2026**

Zentraler Source-/Web-Verifikationsbefehl:

```bash
npm run verify
```

`npm run verify` ist notwendig, aber nicht hinreichend für einen Release. Android-JUnit, Instrumentation, echte APK/AAB-Builds und physische Geräte-Evidence bleiben separate reale Nachweise.

## 1. Grundregel

Es gibt drei Ebenen:

1. **Source Contract** – verlangter Vertrag ist im Repository vorhanden.
2. **Executed Test** – Test/Build wurde auf dem exakten Commit tatsächlich ausgeführt.
3. **Release Evidence** – Ergebnis ist eindeutig Candidate-SHA, Version Name und Version Code zugeordnet.

Ein Source-Checker ist niemals ein ausgeführter Android-Test.

## 2. Aktuelle `verify`-Kette

`npm run verify` umfasst unter anderem:

- Runtime-Versionen;
- TypeScript / ESLint / Prettier;
- Version-Konsistenz;
- Android-Projektvertrag;
- Android-Instrumentation-Source-Vertrag;
- Supply Chain;
- Native Drain/ACK/Factory Reset;
- Native Retention;
- **Usage Flush Coordinator + Worker + produktive Service-Verdrahtung**;
- **explizite stabile und atomar persistierte Prerequisite-Stop-Codes für Service-Runtime und Native-Start-Preflight**;
- **Process-Loss-Erkennung + kontrollierter Restart-Recovery**;
- Device Matrix;
- Lifecycle/Diagnostik;
- Overlay Accessibility;
- Native Usage Accounting;
- Protection Config;
- Release Surface;
- Commitment;
- Subscription Safety;
- V0.7-Migration;
- Release Approval;
- Transparency;
- SDK Registry;
- Third-Party Notices;
- Secret Scan;
- Store Assets;
- Release Readiness;
- Vitest;
- Accessibility Source Checks;
- Vite/PWA/Privacy/Bundle Checks.

## 3. Android Project / Instrumentation

```bash
npm run check:android
npm run check:android-instrumentation
```

Der Android-Vertrag schützt unter anderem SDK-/Package-Konfiguration, Signing, `allowBackup=false`, Cleartext-Verbot, FGS/Boot Receiver, scoped Package Visibility, Native Bridge, explizite Schutzaktivierung, Safe-Shutdown und die Regel-/Recovery-Verknüpfung.

Vorhandene `androidTest`-Verträge:

- `ProtectionStateInstrumentedTest.java`;
- `ManifestSecurityInstrumentedTest.java`;
- `BootRecoveryInstrumentedTest.java`;
- `NativeDrainBatchInstrumentedTest.java`;
- `NativeRetentionInstrumentedTest.java`;
- `UsageFlushInstrumentedTest.java`;
- `ProtectionDiagnosticsInstrumentedTest.java`.

`UsageFlushInstrumentedTest` verlangt auf Android:

- den Produktionsfactory-Pfad `UsageFlushWorker.forSharedPreferences(...)` gegen echte `SharedPreferences`;
- persistierten Coordinator-Batch nach Worker-Abschluss;
- Shutdown-Drain, während ein erster Write künstlich In-Flight gehalten wird;
- Erhalt und anschließende Persistenz von Usage, die während dieses In-Flight-Writes neu eintrifft.

`ProtectionDiagnosticsInstrumentedTest` verlangt auf Android:

- explizite stabile Codes für entzogenen Nutzungszugriff;
- explizite stabile Codes für verlorene Overlay-Berechtigung;
- explizite stabile Codes für verlorene Benachrichtigungen;
- explizite stabile Codes für fehlende aktive Regeln und fehlende Ziel-App;
- eine atomare Prerequisite-Stop-Transaktion, die deaktivierten Zustand, Warn-Event, Stop-Zeitpunkt, exakten Code und Nachricht gemeinsam persistiert;
- Nachweis, dass der gespeicherte Code **nicht von der Sprache des Meldungstexts abhängt**;
- Nachweis, dass dieselbe atomare Persistenz auch funktioniert, wenn `enabled` vor einem fehlgeschlagenen First-Start bereits `false` war;
- Legacy-Systemwarnungen behalten als Kompatibilitätsweg die bisherige Textklassifizierung;
- app-spezifische Warnungen dürfen einen bereits gespeicherten terminalen Stop-Grund nicht überschreiben.

`check:android-instrumentation` verlangt diese Methoden und Konstanten im Sourcevertrag ausdrücklich. Das ist noch keine ausgeführte Instrumentation.

G7 bleibt **TEILWEISE**, weil reale Instrumentation sowie verbleibende echte Service-/Overlay-/Permission-Loss-/Process-Kill-/Notification-/Target-App-/OEM-E2E-Fälle fehlen.

## 4. Supply Chain

```bash
npm run check:supply-chain
```

Schützt Lockfile-/Dependency-Vertrag, HTTPS-Auflösungen, Gradle-Distributionshost, SHA-256 und blockiert dynamische Gradle-Versionen/Plain-HTTP-Repositories.

Gradle 8.14.3:

```text
ed1a8d686605fd7c23bdf62c7fc7add1c5b23b2bbc3721e661934ef4a4911d7c
```

Finaler Advisory-Review, Dependency Report, SBOM und Binary Audit bleiben separat offen.

## 5. Native Drain / ACK / Reset

```bash
npm run check:native-drain-ack
```

Pflichtvertrag:

- `pending_protection_drain_v1` hält einen persistenten UUID-Batch;
- Event Queue wird nur zusammen mit dem Pending-Batch geleert;
- Usage-Cursor erst beim passenden ACK;
- falsches/inkonsistentes ACK fail-closed;
- neue Usage/Events bleiben für Folgebatches erhalten;
- React speichert Stats/History + `__scrollshieldNativeDrain.lastProcessedBatchId` vor ACK;
- Replay eines bereits gespeicherten Batch führt nicht zur Doppeladdition;
- `factory_reset_pending_v1` verhindert Wiederkehr verspäteter Native-Writes.

## 6. Native Retention

```bash
npm run check:native-retention
```

Vertrag:

- Cleanup erst nach durablem ACK;
- aktuelle + vorherige Open-/Emergency-Partition bleiben;
- Raw Usage nur außerhalb des 30-Tage-Horizonts und nur bei `current == exported`;
- unbestätigte/inkonsistente/malformed Usage bleibt;
- Raw-Counter + Exportcursor werden gemeinsam entfernt.

## 7. Usage Flush Coordinator + Worker

```bash
npm run check:usage-flush-worker
```

Dieser Checker schützt jetzt die **produktive Service-Integration** und nicht mehr nur eine vorbereitete Foundation.

### `UsageFlushCoordinator.java`

Pure-Java-State-Machine:

- synchronisierte Pending-/In-Flight-Verwaltung;
- maximal ein aktiver Flush;
- atomarer Snapshot aus Pending → In-Flight;
- Snapshot ist immutable;
- neue Usage während des Writes bleibt separat pending;
- Success nur für passende Batch-ID;
- Failure-Mergeback ohne Verlust;
- stale Completion wird ignoriert;
- `getUnpersistedUsageMs()` umfasst Pending + In-Flight;
- Intervall + Force-Pfad;
- saturierende Addition gegen Long-Overflow.

### `UsageFlushWorker.java`

Produktiver serieller Writer:

- `Executors.newSingleThreadExecutor(...)`;
- eingefrorene Batches werden im Worker geschrieben;
- SharedPreferences nutzt dort bewusst `commit()`, damit `false` beobachtbar bleibt;
- `commit=false` → Coordinator Failure/Mergeback;
- Runtime-Exception → Failure/Mergeback;
- `RejectedExecutionException` → Batch zurück nach Pending;
- `close()` → orderly `shutdown()`;
- `closeAfterDrainingPending()` queued einen finalen Drain vor dem Executor-Shutdown;
- der Final-Drain verarbeitet Pending Usage nach einem vorherigen In-Flight-Write;
- ein fehlgeschlagener In-Flight-Batch kann im Final-Drain erneut versucht werden;
- `awaitTermination(...)` steht für Tests/kontrollierte Diagnosepfade zur Verfügung.

### Produktive `ScrollShieldProtectionService`-Verdrahtung

Der Checker verlangt:

- Coordinator + Worker werden beim Start initialisiert;
- die alte Service-eigene `pendingUsageMs`-Map ist entfernt;
- der alte Service-eigene `lastUsageFlushMs`-Timer ist entfernt;
- `addPendingUsageBucket()` delegiert an den Coordinator;
- `flushPendingUsage()` startet nur einen Coordinator-Batch und submitted ihn an den Worker;
- Daily Limit = persisted + Coordinator Pending/In-Flight, saturierend;
- direkter periodischer `SharedPreferences.commit()` ist aus dem Protection Service entfernt;
- `onDestroy()` erfasst den letzten Tick, fordert einen Force-Flush an und startet den seriellen Shutdown-Drain.

### JUnit

`UsageFlushCoordinatorTest.java`:

- Intervall/Force;
- kein paralleler Flush;
- neue Usage während In-Flight;
- Success;
- Failure-Mergeback;
- stale Completion;
- Daily-Limit-View;
- invalid Input;
- Overflow.

`UsageFlushWorkerTest.java`:

- erfolgreicher Background-Write;
- Commit-Failure;
- Writer-Exception;
- blockierter Worker + gleichzeitig neue Usage;
- Shutdown-Drain mit neuer Pending Usage während In-Flight;
- Retry eines beim Shutdown fehlgeschlagenen In-Flight-Batches;
- Rejection nach Worker-Shutdown.

### Android Instrumentation

`UsageFlushInstrumentedTest.java` ergänzt den Pure-Java-Vertrag mit echten Android-`SharedPreferences`.

Noch offen ist die **reale Ausführung** dieser Tests sowie echte Service-/Process-Kill-/Restart-Evidence.

## 8. Explizite und atomare Prerequisite-Stop-Codes

```bash
npm run check:prerequisite-stop-codes
```

Der produktive Protection Service und der Native-Start-Preflight leiten terminale Prerequisite-Gründe nicht mehr aus lokalisiertem Meldungstext ab.

Stabile Codes:

```text
usage_access_missing
overlay_permission_missing
notifications_missing
no_active_rules
target_app_missing
```

Vertrag:

- `ProtectionStopReasonPolicy` hält die stabilen Konstanten zentral;
- `ScrollShieldProtectionService.onStartCommand()` verwendet die Konstanten für fehlende Service-Startvoraussetzungen;
- `enforceCurrentApp()` verwendet dieselben Konstanten bei Laufzeitverlust;
- `ScrollShieldNativePlugin.recordProtectionPrerequisiteStop(...)` läuft unter `EVENT_LOCK` und schreibt in **einem synchronen `SharedPreferences.commit()`**:
  - `SERVICE_ENABLED_KEY=false`;
  - die aktualisierte `protection_events`-Queue mit `warning/system`;
  - `LAST_STOP_AT_KEY`;
  - den explizit normalisierten `LAST_STOP_CODE_KEY`;
  - `LAST_STOP_MESSAGE_KEY`;
- damit gibt es im Primärpfad kein Crash-Fenster mehr zwischen Deaktivierung, Warn-Event und exaktem Stop-Code;
- `stopForProtectionPrerequisite(reasonCode, description)` ruft für den laufenden Service zuerst diese atomare Operation auf;
- `ScrollShieldNativePlugin.startProtectionService()` verwendet für Usage Access, Overlay, Notifications und fehlende installierte Ziel-App `rejectProtectionStartPrerequisite(...)`;
- `rejectProtectionStartPrerequisite(...)` ruft ebenfalls zuerst `recordProtectionPrerequisiteStop(...)` auf und führt `call.reject(...)` erst **nach** der Persistenz aus;
- nur bei `commit=false` folgt in Service und Plugin ein Best-Effort-Fallback aus `setProtectionEnabled(false)` + `recordProtectionStop(...)`;
- dadurch hinterlässt auch ein fehlgeschlagener First Start oder Recovery-Start einen exakten terminalen Zustand, selbst wenn `enabled` vor dem Versuch bereits `false` war;
- `onDestroy()` darf einen kontrollierten Service-Stopp nicht als `unexpected_service_destroy` überschreiben;
- `classifySystemWarning(description)` bleibt nur als Kompatibilitäts-Fallback für ältere/sonstige Systemwarnungen bestehen;
- Pure-Java-JUnit sperrt die konstanten Code-Werte gegen versehentliche Änderung;
- Android-Instrumentation prüft die atomare Transaktion inklusive `enabled=false`, Event-Queue, exaktem Code, Nachricht und Zeitstempel;
- dieselbe Instrumentation prüft einen bereits deaktivierten First-Start-Zustand und mit englischen Meldungstexten, dass der Code nicht von lokalisierter Prosa abhängt.

`check:prerequisite-stop-codes` erzwingt die atomare Native-Transaktion, die Service-Verdrahtung, die vier Plugin-Preflight-Codes, den Helper-Fallback, das Verbot nackter Prerequisite-`call.reject()`-Pfade und den Instrumentation-Vertrag. Der Checker ist Bestandteil von `npm run verify` und als Pflichtschritt im `readiness`-Report eingetragen.

## 9. Process-Loss / kontrollierter Restart-Recovery

```bash
npm run check:process-loss
```

`unclean-process-stop` wird ausschließlich aus persistierter Lifecycle-Wahrheit abgeleitet:

```text
running == false
enabled == true
lastStartAt > 0
lastStartAt > lastStopAt
```

Der Vertrag verlangt:

- Process-Loss bleibt getrennt von gewöhnlicher `stale-activation`;
- ältere Stop-Evidence wird nicht als aktuelle Ursache dargestellt;
- UI-Aktion lautet `Schutz wiederherstellen`;
- `NativeProtection.recoverAfterProcessLoss(...)` liest den Native-Status vor dem Recovery erneut;
- ist der Dienst inzwischen `running && enabled`, wird kein zweiter Start ausgelöst;
- jeder Zustand außer `unclean-process-stop` wird für diesen Recovery-Pfad abgelehnt;
- aktuelle Protection-Config wird neu synchronisiert;
- `unavailableAppIds` werden gegen aktive Android-Ziele geprüft;
- fehlen alle aktiven Ziele, wird vor Service-Start mit `target_app_missing` fail-closed gestoppt;
- teilweise Target-Unverfügbarkeit blockiert nicht, solange mindestens ein aktives installiertes Ziel übrig ist;
- der vorhandene Native-Startpfad wird verwendet, sodass Usage Access, Overlay, Notifications und installierte Ziel-App erneut geprüft und Preflight-Fehler atomar persistiert werden;
- nach dem Start wird Native-Wahrheit erneut gelesen;
- die UI meldet Erfolg nur bei `running && enabled && health == active`;
- Bridge-, Health-, StatusPanel- und Permissions-Tests schützen diesen Ablauf;
- `docs/PROCESS_LOSS_RECOVERY.md` hält Source-Vertrag und reale Evidence-Grenze fest.

Der Source-Vertrag beweist keinen echten Android-Prozesskill. Reale Kill/Restart-Evidence bleibt für G7/G8/G9 verpflichtend.

## 10. Storage Migration

```bash
npm run check:migration
```

Schützt V0.7-/Legacy-Migration inklusive `_pending`-Staging, exakter Read-Back-Verifikation, Recovery, bytegenauem Legacy-Archiv, Alt-Ereignis-Konvertierung, Export/Import und Recovery-UI.

Reale V0.7-Geräte-Evidence bleibt Pflicht.

## 11. Lifecycle / Usage Accounting

```bash
npm run check:lifecycle
npm run check:prerequisite-stop-codes
npm run check:process-loss
npm run check:diagnostic-normalization
npm run check:usage-accounting
```

Schützt Lifecycle-Wahrheit, strukturierte stabile und atomar gespeicherte Prerequisite-Stop-Codes inklusive Native-Start-Preflight, Process-Loss-/Recovery-Grenzen, lokale Tagesgrenzen, keine negative Usage bei rückwärts laufender Uhr, Tag+App-Bucketing, Tageslimit und Anti-Binge über Mitternacht.

`ProtectionDiagnosticsInstrumentedTest.java` schützt zusätzlich den realen Android-Persistenzpfad. Die eigentliche Berechtigungsentziehung während eines laufenden Services, der reale Native-Start mit fehlender Voraussetzung sowie ein echter Prozesskill bleiben separate E2E-Fälle und dürfen durch Source-/Component-Tests nicht als erledigt gelten.

Die Worker-/Usage-Checker müssen gemeinsam verhindern, dass die neue Persistenzarchitektur Tageslimits während Pending/In-Flight-Zuständen unterzählt oder Usage bei kontrolliertem Shutdown verliert.

## 12. Device Matrix / Privacy / Release Gate

```bash
npm run check:device-matrix
npm run check:privacy
npm run check:release-approval
npm run release:gate
```

- Device-Matrix-Checker beweist nur den Testplan, nicht dessen Durchführung.
- Privacy blockiert Tracking-/Netzwerkpfade und `android.permission.INTERNET`.
- Release Approval Schema v2 verlangt kandidatgebundene Evidence.

## 13. Android CI Stage

Nach `npm run verify` soll CI ausführen:

```bash
cd android
./gradlew testDebugUnitTest assembleDebug --no-daemon --stacktrace
```

Damit werden die Coordinator-/Worker-JUnit und der Android-Debug-Build ausgeführt.

Instrumentation benötigt zusätzlich Emulator/Gerät, zum Beispiel:

```bash
cd android
./gradlew connectedDebugAndroidTest --no-daemon --stacktrace
```

Ein erfolgreicher Source-Checker ersetzt diesen Lauf nicht.

## 14. Aktuelle Ausführungsgrenze

GitHub-hosted Actions starten derzeit wegen Billing-/Spending-Limit nicht und enden vor Step 1 mit leerer Step-Liste und ohne Runner.

Deshalb sind aktuell **nicht als bestanden belegt**:

- `npm run verify`;
- `check:usage-flush-worker`;
- `check:prerequisite-stop-codes`;
- `check:process-loss`;
- `check:android-instrumentation`;
- `UsageFlushCoordinatorTest`;
- `UsageFlushWorkerTest`;
- `ProtectionStopReasonPolicyTest`;
- Process-Loss-/Restart-Recovery-/Target-App-Vitest- und Component-Tests;
- `UsageFlushInstrumentedTest`;
- `ProtectionDiagnosticsInstrumentedTest` inklusive neuem First-Start-Preflight-Fall;
- TypeScript/Lint/Prettier/Vitest;
- Android JUnit/Instrumentation;
- Gradle Debug Build;
- APK;
- physische Geräte-Matrix.

## 15. Reihenfolge nach Entsperrung

1. sauberer Checkout + `npm ci`;
2. `npm run verify`;
3. `./gradlew testDebugUnitTest assembleDebug --no-daemon --stacktrace`;
4. Coordinator-/Worker-/Stop-Code-JUnit und Service-/Plugin-Kompilierung bestätigen;
5. reale Fehler beheben und erneut ausführen;
6. `./gradlew connectedDebugAndroidTest --no-daemon --stacktrace` auf Emulator/Gerät;
7. `UsageFlushInstrumentedTest`, `ProtectionDiagnosticsInstrumentedTest` + Native Drain/Retention/Recovery-Instrumentation bestätigen;
8. Native First-Start-Preflight real mit fehlendem Usage Access, Overlay, Notifications und Ziel-App prüfen;
9. echten Process-Kill nach bestätigtem Dienststart reproduzieren und `unclean-process-stop` → `Schutz wiederherstellen` → `active` auf Android belegen;
10. Target-App-Deinstallation vollständig/teilweise während Recovery testen;
11. echte Permission-Loss-/Overlay-/Service-E2E-Fälle ausführen;
12. Shutdown/In-Flight/Process-Kill/Restart-Races testen;
13. Debug APK auf Device Matrix;
14. erst danach Release-Evidence hochstufen.