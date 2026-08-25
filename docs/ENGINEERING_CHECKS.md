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

## Protection Config Durability

```bash
npm run check:config-durability
```

Spezifikation: `docs/PROTECTION_CONFIG_DURABILITY.md`.

Die startkritische Native-Konfiguration verwendet keinen asynchronen `SharedPreferences.apply()`-Write mehr. Ein erfolgreicher Sync persistiert in **einem synchronen `commit()`**:

```text
protection_config
unavailable_app_ids
unavailable_active_app_ids
protection_config_generation
```

Jeder erfolgreiche Config-Sync erhält eine neue UUID `configGeneration`.

TypeScript darf den Android-Schutz nur starten mit:

```text
startProtectionService({ expectedConfigGeneration })
```

Native akzeptiert den Start nur, wenn diese UUID noch exakt der aktuell durable gespeicherten Config entspricht.

Der Startrequest bindet anschließend atomar:

```text
enabled=true
lastStartRequestAt
startRequestConfigGeneration
```

Ein frischer Pending-Request ist nur dann idempotent, wenn zusätzlich gilt:

```text
startRequestConfigGeneration == protectionConfigGeneration
```

Ein frischer Request aus einer inzwischen älteren Config wird sofort fail-closed beendet statt als „bereits in Arbeit“ akzeptiert zu werden.

Die Foreground-Confirmation prüft die Config-Generation erneut. Ändert sich die Config zwischen Request und Confirmation:

```text
Config A commit
→ Request bindet A
→ Config B commit
→ verspätete Confirmation von A
```

gilt:

```text
FAILED_CLOSED
enabled=false
lastStartAt wird für A nicht fortgeschrieben
lastStopCode=start_failed
```

Für ältere Installationen darf Boot/App-Update eine fehlende Generation nur nachrüsten, wenn bereits eine gültige persistierte Config mit `apps`-Array vorhanden ist und auch der Generation-Write selbst erfolgreich committed wurde.

Diagnose-Evidence enthält:

```text
protectionConfigGeneration
startRequestConfigGeneration
```

## Android Start-Handshake

```bash
npm run check:start-handshake
```

Spezifikationen:

- `docs/PROTECTION_START_HANDSHAKE.md`
- `docs/PROTECTION_CONFIG_DURABILITY.md`

Persistente Lifecycle-Grenzen:

```text
lastStartRequestAt = Start angefordert
lastStartAt        = Foreground-Start bestätigt
lastStopAt         = terminaler Stopp
```

Wichtige Invarianten:

- kein separates produktives `enabled=true` vor dem Start;
- App-Start benötigt die exakt durable Config-Generation;
- Request vor App-/Boot-/Update-Service-Dispatch;
- frischer Pending-Start <= 15 s ist nur mit gleicher Config-Generation idempotent;
- deutlicher Wall-Clock-Rollback kann `start-pending` nicht dauerhaft festhalten;
- `RUNNING=true` erst nach erfolgreichem `startForeground(...)` und `CONFIRMED`;
- Stop vor verspäteter Confirmation → `SUPERSEDED_BY_STOP`;
- Config-Wechsel vor Confirmation → `FAILED_CLOSED`;
- Stop-Code, Stop-Nachricht und Event-Evidence bleiben bei einem terminalen Gewinner erhalten;
- echter Restart nach Stop erhält eine strikt neuere Request-Generation.

Health-Klassifizierung:

```text
neuer unbestätigter Request <= 15 s → start-pending
neuer unbestätigter Request > 15 s  → start-interrupted
bestätigter Start später ohne Stopp  → unclean-process-stop
```

## Android Service Dispatch Races

Spezifikation: `docs/PROTECTION_SERVICE_DISPATCH_RACES.md`.

Persistenz allein reicht nicht: Der zugehörige Android-Service-Dispatch muss dieselbe Reihenfolge einhalten.

Globale Lock-Reihenfolge:

```text
ProtectionServiceDispatchGuard.LOCK
→ EVENT_LOCK
```

Unter `ProtectionServiceDispatchGuard.LOCK` werden insbesondere serialisiert:

- Config-Sync: durable Config-Commit;
- App-Start: Config-Generation prüfen → Pending-Prüfung → Request-Commit → `startForegroundService/startService`;
- Boot-/App-Update-Recovery: durable Config-Bootstrap/Request → Service-Start;
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

### Same-Instance Fast Restart

Wenn Android eine neue Startanforderung an dieselbe noch lebende Service-Instanz liefert, übernimmt diese nach erfolgreicher Confirmation die neue Request-Generation und aktualisiert ihre Foreground-Notification.

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

Fehlende oder alte `ACTION_STOP`-Generationen werden **vor** jeder `notification_action_stop`-Persistenz ignoriert.

## Android Instrumentation

```bash
npm run check:android-instrumentation
cd android
./gradlew connectedDebugAndroidTest --no-daemon --stacktrace
```

`ProtectionDiagnosticsInstrumentedTest` schützt insbesondere:

```text
startRequestAndConfirmedStartPersistAsDistinctLifecycleEvidence
terminalStopWinsAgainstDelayedStartConfirmationWithoutOverwrite
restartRequestAdvancesBeyondLatestStopBoundary
```

Diese bestehenden Tests wurden auf den neuen Produktionsvertrag migriert und erzeugen vor jedem Start eine durable Config-Generation.

Neu ist:

```text
ProtectionConfigDurabilityInstrumentedTest
```

mit:

```text
durableConfigGenerationBindsStartRequestAndConfirmation
staleConfigGenerationCannotCreateStartRequest
freshPendingRequestFromPreviousConfigIsNotCurrent
configChangeBeforeConfirmationFailsClosedWithoutConfirmingOldRequest
legacyDurableConfigReceivesGenerationBeforeBootStyleStartRequest
```

Die tatsächliche Zustellung einer alten/queued Notification-`PendingIntent`-Aktion bleibt bewusst **Device-/System-E2E-Evidence**.

## Android JUnit / Build

```bash
cd android
./gradlew testDebugUnitTest assembleDebug --no-daemon --stacktrace
```

Relevant sind insbesondere:

- `ProtectionConfigDurabilityStoreTest`;
- `ProtectionStartHandshakePolicyTest`;
- `ProtectionServiceLifecyclePolicyTest` inklusive Notification-Generation;
- `ProtectionServiceDispatchGuardTest`;
- bestehende Coordinator-/Worker-/Stop-Code-/Lifecycle-Tests.

## Device-/E2E-Evidence

`docs/ANDROID_DEVICE_TEST_MATRIX.md` verlangt zusätzlich zum bisherigen Lifecycle-Vertrag:

- `APP-07`: Config-Sync ist durable bevor ein Schutzstart dispatched wird; Config- und Request-Generation stimmen überein;
- `APP-08`: Config-Wechsel zwischen Request und Foreground-Confirmation endet fail-closed ohne bestätigten alten Start;
- `LIFE-12`: terminaler Stop gewinnt vor verspäteter Confirmation;
- `LIFE-13`: Pending-Doppelstart erzeugt keine neue Generation;
- `LIFE-14`: sofortiger Stop→Restart wird nicht durch altes `onDestroy()` zerstört;
- `LIFE-15`: alte Notification-Stop-Aktion aus `R1` bleibt nach bestätigtem Restart `R2` wirkungslos.

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

Boot-/App-Update-Recovery darf einen frischen Pending-Request nur übernehmen, wenn dessen `startRequestConfigGeneration` weiterhin der aktuellen durable Config entspricht. Ein Mismatch endet `recovery_start_failed`.

## Aktuelle Ausführungsgrenze

GitHub Actions liefert auf diesem Draft-Branch weiterhin Verify-Jobs ohne ausgeführte Steps. Die **exakte aktuelle Head-SHA und der zugehörige Lauf werden ausschließlich in PR #8 geführt**, damit committed Dokumente nicht durch ihren eigenen Commit sofort veralten.

Deshalb sind aktuell **nicht als bestanden belegt**:

- `npm run verify`;
- `check:native-stop-atomicity`;
- `check:start-handshake`;
- `check:config-durability`;
- `check:lifecycle`;
- `check:android-instrumentation`;
- `ProtectionConfigDurabilityStoreTest`;
- `ProtectionConfigDurabilityInstrumentedTest`;
- Android JUnit;
- Android Instrumentation;
- Gradle Debug Build;
- APK;
- `APP-07` / `APP-08`;
- `LIFE-12` bis `LIFE-15`;
- `DISPATCH-01` bis `DISPATCH-05`;
- reale Process-Kill-/Start-/Stop-/PendingIntent-/Config-Durability-Evidence.

## Reihenfolge nach Entsperrung

1. `npm ci`;
2. `npm run verify`;
3. `./gradlew testDebugUnitTest assembleDebug --no-daemon --stacktrace`;
4. `./gradlew connectedDebugAndroidTest --no-daemon --stacktrace`;
5. `APP-07` und `APP-08` real ausführen;
6. `LIFE-12` bis `LIFE-15` real ausführen;
7. `DISPATCH-01` bis `DISPATCH-05` mit Diagnose-JSON und Logcat ausführen;
8. Pre-Confirmation-Abbruch → `start-interrupted` → Retry;
9. Post-Start-Process-Kill → `unclean-process-stop` → Recovery;
10. App-/aktuelle Notification-Stopp-, Start-/Foreground-/Destroy-, Boot/App-Update-, Permission-Loss- und Target-App-Pfade;
11. Physical Device Matrix, V0.7-Migration, 12h/OEM/Batterie;
12. finaler Supply-Chain-/Binary-/Security-Audit;
13. erst danach Candidate Freeze und Release.