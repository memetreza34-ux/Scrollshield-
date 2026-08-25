# ScrollShield – Engineering Checks

Status: **verbindlicher technischer Verifikationsvertrag**

Letzte Aktualisierung: **25. August 2026**

## Grundregel

Es gibt drei Ebenen:

1. **Source Contract** – verlangter Vertrag ist im Repository vorhanden.
2. **Executed Test** – Test/Build wurde auf dem exakten Commit tatsächlich ausgeführt.
3. **Release Evidence** – Ergebnis ist eindeutig Candidate-SHA, Version Name und Version Code zugeordnet.

Ein Source-Checker oder vorbereiteter Test ist niemals ein ausgeführter Android-Test.

## Zentrale Verify-Kette

```bash
npm run verify
```

Die Kette umfasst unter anderem TypeScript/Lint/Prettier, Android Project/Instrumentation, Supply Chain, Native Drain/ACK/Retention, Usage Flush Worker, Stop-Codes, Lifecycle/Diagnostics, `check:native-stop-atomicity`, `check:start-handshake`, `check:config-durability`, Process-Loss/Recovery, Device Matrix, Migration/Release/Privacy/Store/Security, Vitest, Build, PWA und Bundle Checks.

## Native Stop Atomicity

```bash
npm run check:native-stop-atomicity
```

Spezifikation: `docs/NATIVE_STOP_ATOMICITY.md`.

Direkte produktive Disable-/Stop-Diagnose-Writes sind nur in den zwei zentralen Commit-Failure-Fallbacks erlaubt:

```text
persistProtectionSystemStopWithFallback(...)
persistProtectionTerminalStopWithFallback(...)
```

System-Stops schreiben atomar `enabled=false + warning/system + timestamp + code + message`.
Explizite Terminal-Stopps schreiben atomar `enabled=false + timestamp + code + message` und verändern die Event-Queue nicht.

## Android Start-Handshake

```bash
npm run check:start-handshake
```

Spezifikation: `docs/PROTECTION_START_HANDSHAKE.md`.

Persistente Lifecycle-Grenzen:

```text
lastStartRequestAt = Start angefordert
lastStartAt        = Foreground-Start bestätigt
lastStopAt         = terminaler Stopp
```

Wichtige Invarianten:

- kein separates produktives `enabled=true` vor dem Start;
- Request vor App-/Boot-/Update-Service-Dispatch;
- frischer Pending-Start <= 15 s ist nur mit aktueller Config-Generation idempotent;
- deutlicher Wall-Clock-Rollback kann `start-pending` nicht dauerhaft festhalten;
- `RUNNING=true` erst nach erfolgreichem `startForeground(...)` und `CONFIRMED`;
- Stop vor verspäteter Confirmation → `SUPERSEDED_BY_STOP`;
- Stop-Code, Stop-Nachricht und Event-Evidence bleiben dabei erhalten;
- echter Restart nach Stop erhält eine strikt neuere Request-Generation.

Health-Klassifizierung:

```text
neuer unbestätigter Request <= 15 s → start-pending
neuer unbestätigter Request > 15 s  → start-interrupted
bestätigter Start später ohne Stopp  → unclean-process-stop
```

## Protection Config Durability

```bash
npm run check:config-durability
```

Spezifikation: `docs/PROTECTION_CONFIG_DURABILITY.md`.

Durable Config-Tupel:

```text
protection_config
unavailable_app_ids
unavailable_active_app_ids
protection_config_generation
```

Ein erfolgreicher Native-Sync verwendet einen synchronen `commit()` und liefert erst danach die neue UUID-Generation an TypeScript.

Der normale Start und Process-Loss-Recovery reichen genau diese UUID als `expectedConfigGeneration` zurück. Der Startrequest persistiert zusätzlich:

```text
startRequestConfigGeneration
```

und `recordProtectionServiceStarted()` bestätigt nur, wenn Request- und aktuelle Config-Generation noch identisch sind.

### Candidate-Commit-Fehler

Vor dem Config-Write wird der vorherige komplette Tupelzustand gesichert. Liefert der Candidate-Commit `false`, stellt `ProtectionConfigDurabilityStore` vor Freigabe des Dispatch-Locks den vorherigen Config-/Availability-/Generation-Zustand wieder her und der Native-Sync wird abgelehnt.

Für einen bereits laufenden Schutz gilt:

```text
Candidate nicht durable
→ Candidate nicht veröffentlichen
→ letzte durable Regelbasis weiterverwenden
```

Ein erster Start ohne erfolgreich durable Config bleibt blockiert.

### Stable Service Publication

`ScrollShieldProtectionService.refreshConfiguration()` verwendet zwei Lock-Grenzen:

```text
1. configJson + configGeneration snapshotten
2. lokal in nextRulesByPackage parsen
3. configJson + configGeneration erneut prüfen
4. nur bei exakter Gleichheit veröffentlichen
```

Damit darf weder ein fehlgeschlagener Candidate noch ein während des Parsens bereits überholter erfolgreicher Sync in `rulesByPackage` veröffentlicht werden.

Auch der periodische Target-App-Health-Check liest die Config nicht parallel zu Candidate-Commit/Rollback.

## Android Service Dispatch Races

Spezifikation: `docs/PROTECTION_SERVICE_DISPATCH_RACES.md`.

Persistenz allein reicht nicht: Der zugehörige Android-Service-Dispatch muss dieselbe Reihenfolge einhalten.

Globale Lock-Reihenfolge:

```text
ProtectionServiceDispatchGuard.LOCK
→ EVENT_LOCK
```

Unter `ProtectionServiceDispatchGuard.LOCK` werden insbesondere serialisiert:

- Config Candidate-Commit/Rollback und stabile Service-Publish-Grenzen;
- App-Start: Pending-Prüfung → Request-Commit → `startForegroundService/startService`;
- Boot-/App-Update-Recovery: Request-Commit → Service-Start;
- App-/Notification-/Prerequisite-Stop: Stop-Persistenz → `stopService`;
- Factory Reset: Tombstone → `stopService`;
- Service `onCreate()` / `onStartCommand()` / kritische `onDestroy()`-Klassifizierung.

### Controlled-stop Destroy Token

Ein erfolgreicher kontrollierter `stopService()` setzt einen process-lokalen one-shot Token:

```text
System.nanoTime()
Destroy-Fenster <= 30 s
exakt einmal konsumierbar
```

Ein abgelaufener Token, negativer monotonic age-Wert oder fehlgeschlagener Stop-Dispatch darf einen späteren echten `unexpected_service_destroy` nicht unterdrücken.

`ProtectionServiceDispatchGuardTest` deckt source-seitig Prompt-, stale-, backward-time- und failed-dispatch-Grenzen ab.

### Same-Instance Fast Restart

Wenn Android eine neue Startanforderung an dieselbe noch lebende Service-Instanz liefert, übernimmt diese nach erfolgreicher Confirmation die neue Request-Generation:

```text
serviceStartRequestAtOnCreate = lastStartRequestAt
```

Ein altes `explicitStopRequested=true` darf den späteren echten Destroy dieser neu bestätigten Generation nicht dauerhaft maskieren.

### Generation-bound Notification Stop

Die Foreground-Notification trägt:

```text
EXTRA_STOP_START_REQUEST_AT = serviceStartRequestAtOnCreate
```

Ein Notification-Stop ist nur aktuell, wenn:

```text
actionStartRequestAt > 0
UND
actionStartRequestAt == serviceStartRequestAtOnCreate
UND
actionStartRequestAt == latestStartRequestAt
```

Fehlende oder alte `ACTION_STOP`-Generationen werden vor jeder `notification_action_stop`-Persistenz ignoriert. Nach erfolgreichem Same-Instance-Restart wird die Notification mit der neuen Generation veröffentlicht.

## Android Instrumentation

```bash
npm run check:android-instrumentation
cd android
./gradlew connectedDebugAndroidTest --no-daemon --stacktrace
```

`ProtectionDiagnosticsInstrumentedTest` schützt source-seitig insbesondere:

```text
startRequestAndConfirmedStartPersistAsDistinctLifecycleEvidence
terminalStopWinsAgainstDelayedStartConfirmationWithoutOverwrite
restartRequestAdvancesBeyondLatestStopBoundary
```

`ProtectionConfigDurabilityInstrumentedTest` schützt source-seitig insbesondere:

```text
durableConfigGenerationBindsStartRequestAndConfirmation
staleConfigGenerationCannotCreateStartRequest
freshPendingRequestFromPreviousConfigIsNotCurrent
configChangeBeforeConfirmationFailsClosedWithoutConfirmingOldRequest
legacyDurableConfigReceivesGenerationBeforeBootStyleStartRequest
```

Die tatsächliche Zustellung einer alten/queued Notification-`PendingIntent`-Aktion sowie ein realer Storage-/Commit-Fehler sind bewusst Device-/System-E2E-Evidence. Ein reiner Source- oder Persistenztest darf nicht als Ersatz gewertet werden.

## Android JUnit / Build

```bash
cd android
./gradlew testDebugUnitTest assembleDebug --no-daemon --stacktrace
```

Relevant sind insbesondere:

- `ProtectionStartHandshakePolicyTest`;
- `ProtectionServiceLifecyclePolicyTest` inklusive Notification-Generation;
- `ProtectionServiceDispatchGuardTest`;
- `ProtectionConfigDurabilityStoreTest`;
- bestehende Coordinator-/Worker-/Stop-Code-/Lifecycle-Tests.

## Device-/E2E-Evidence

`docs/ANDROID_DEVICE_TEST_MATRIX.md` verlangt zusätzlich:

- `APP-07`: durable Config-Sync + gebundener Start; bei erzwungenem Commit-Fehler kein Candidate-Start und keine Candidate-Regel-Veröffentlichung;
- `APP-08`: Config-Wechsel zwischen Request und Confirmation endet `FAILED_CLOSED`/`start_failed`;
- `LIFE-12`: terminaler Stop gewinnt vor verspäteter Confirmation;
- `LIFE-13`: Pending-Doppelstart erzeugt keine neue Generation;
- `LIFE-14`: sofortiger Stop→Restart wird nicht durch altes `onDestroy()` zerstört;
- `LIFE-15`: alte Notification-Stop-Aktion aus `R1` bleibt nach bestätigtem Restart `R2` wirkungslos; die aktuelle `R2`-Aktion stoppt weiterhin mit `notification_action_stop`.

Die Dispatch-Spezifikation verlangt zusätzlich `DISPATCH-01` bis `DISPATCH-05`.

## Process-Loss / Recovery

Pre-Confirmation-Abbruch und echter Post-Start-Process-Kill bleiben getrennt.

```text
lastStartRequestAt > max(lastStartAt,lastStopAt)
→ start-pending / start-interrupted
```

```text
lastStartAt > lastStopAt
lastStartRequestAt <= lastStartAt
running=false && enabled=true
→ unclean-process-stop
```

Nur der zweite Fall verwendet `Schutz wiederherstellen`.

## Aktuelle Ausführungsgrenze

GitHub Actions liefert auf diesem Draft-Branch weiterhin Verify-Jobs ohne ausgeführte Steps. Die **exakte aktuelle Head-SHA und der zugehörige Lauf werden ausschließlich in PR #8 geführt**, damit committed Dokumente nicht durch ihren eigenen Commit sofort veralten.

Deshalb sind aktuell **nicht als bestanden belegt**:

- `npm run verify`;
- `check:native-stop-atomicity`;
- `check:start-handshake`;
- `check:config-durability`;
- `check:lifecycle`;
- `check:android-instrumentation`;
- Android JUnit;
- Android Instrumentation;
- Gradle Debug Build;
- APK;
- `APP-07` / `APP-08`;
- `LIFE-12` bis `LIFE-15`;
- `DISPATCH-01` bis `DISPATCH-05`;
- reale Storage-Failure-/Process-Kill-/Start-/Stop-/PendingIntent-Race-Evidence.

## Reihenfolge nach Entsperrung

1. `npm ci`;
2. `npm run verify`;
3. `./gradlew testDebugUnitTest assembleDebug --no-daemon --stacktrace`;
4. `./gradlew connectedDebugAndroidTest --no-daemon --stacktrace`;
5. `APP-07` / `APP-08` inklusive Storage-Failure-Fall real ausführen;
6. `LIFE-12` bis `LIFE-15` real ausführen;
7. `DISPATCH-01` bis `DISPATCH-05` mit Diagnose-JSON und Logcat ausführen;
8. Pre-Confirmation-Abbruch → `start-interrupted` → Retry;
9. Post-Start-Process-Kill → `unclean-process-stop` → Recovery;
10. App-/aktuelle Notification-Stopp-, Start-/Foreground-/Destroy-, Boot/App-Update-, Permission-Loss- und Target-App-Pfade;
11. Physical Device Matrix, V0.7-Migration, 12h/OEM/Batterie;
12. finaler Supply-Chain-/Binary-/Security-Audit;
13. erst danach Candidate Freeze und Release.
