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

Die Kette umfasst unter anderem TypeScript/Lint/Prettier, Android Project/Instrumentation, Supply Chain, Native Drain/ACK/Retention, Usage Flush Worker, Stop-Codes, Lifecycle/Diagnostics, `check:native-stop-atomicity`, `check:start-handshake`, Process-Loss/Recovery, Device Matrix, Migration/Release/Privacy/Store/Security, Vitest, Build, PWA und Bundle Checks.

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
- frischer Pending-Start <= 15 s ist idempotent;
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

## Android Service Dispatch Races

Spezifikation: `docs/PROTECTION_SERVICE_DISPATCH_RACES.md`.

Persistenz allein reicht nicht: Der zugehörige Android-Service-Dispatch muss dieselbe Reihenfolge einhalten.

Globale Lock-Reihenfolge:

```text
ProtectionServiceDispatchGuard.LOCK
→ EVENT_LOCK
```

Unter `ProtectionServiceDispatchGuard.LOCK` werden insbesondere serialisiert:

- App-Start: Pending-Prüfung → Request-Commit → `startForegroundService/startService`;
- Boot-/App-Update-Recovery: Request-Commit → Service-Start;
- App-/Notification-/Prerequisite-Stop: Stop-Persistenz → `stopService`;
- Factory Reset: Tombstone → `stopService`;
- Service `onCreate()` / `onStartCommand()` / kritische `onDestroy()`-Klassifizierung.

Damit darf kein konkurrierender Stop zwischen einem persistierten Request und dem dazugehörigen Android-Startdispatch einspringen und umgekehrt.

### Controlled-stop Destroy Token

Ein erfolgreicher kontrollierter `stopService()` setzt einen process-lokalen one-shot Token.

Vertrag:

```text
System.nanoTime()
Destroy-Fenster <= 30 s
exakt einmal konsumierbar
```

Ein abgelaufener Token, ein negativer monotonic age-Wert oder ein fehlgeschlagener Stop-Dispatch darf einen späteren echten `unexpected_service_destroy` nicht unterdrücken.

`ProtectionServiceDispatchGuardTest` deckt source-seitig ab:

```text
successfulControlledStopIsConsumedExactlyOnceByPromptDestroy
staleControlledStopTokenCannotSuppressLaterUnexpectedDestroy
backwardMonotonicInputFailsSafeInsteadOfSuppressingDestroy
failedStopDispatchDoesNotSuppressFutureUnexpectedDestroy
```

### Same-Instance Fast Restart

Wenn Android eine neue Startanforderung an dieselbe noch lebende Service-Instanz liefert, übernimmt diese nach erfolgreicher Confirmation die neue Request-Generation:

```text
serviceStartRequestAtOnCreate = lastStartRequestAt
```

Ein altes `explicitStopRequested=true` darf den späteren echten Destroy dieser **neu bestätigten** Generation nicht dauerhaft maskieren.

`ProtectionServiceLifecyclePolicy` unterscheidet daher:

```text
kein neuer bestätigter Request
→ altes explicitStopRequested darf Unexpected-Destroy unterdrücken

neuer Request von derselben Instanz übernommen und bestätigt
→ altes Flag ist stale
→ späterer echter Destroy wird wieder erkannt
```

Passende JUnit-Verträge:

```text
explicitStopWithoutNewConfirmedGenerationSuppressesUnexpectedDestroy
transferredRestartOwnershipRestoresUnexpectedDestroyDetection
transferredRestartOwnershipAlsoSupersedesStaleExplicitStopFlag
```

### Generation-bound Notification Stop

Die dauerhafte Foreground-Notification darf nicht zu einem generationslosen Stop-Kanal werden.

Der Stop-`PendingIntent` trägt deshalb:

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

Die Entscheidung liegt in `ProtectionServiceLifecyclePolicy.isCurrentNotificationStopGeneration(...)`.

Ein fehlender oder alter `ACTION_STOP` muss **vor** jeder `notification_action_stop`-Persistenz verworfen werden. Er darf weder `enabled`, Lifecycle-Zeitmarken, Stop-Code/-Nachricht noch Event-Historie verändern und darf den aktuellen Service nicht stoppen.

Nach erfolgreichem Same-Instance-Restart wird die Notification nach der Ownership-Übernahme neu veröffentlicht. Der aktuelle `PendingIntent` verwendet `FLAG_UPDATE_CURRENT | FLAG_IMMUTABLE` und trägt damit die neue Request-Generation.

JUnit-Vertrag:

```text
notificationStopIsAcceptedOnlyForCurrentLifecycleGeneration
```

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

Damit wird verlangt:

- Confirmed-Start ist strikt neuer als sein Request;
- terminaler Stop ist strikt neuer als der vorherige Request;
- verspätete Confirmation liefert `SUPERSEDED_BY_STOP`;
- Stop-Code/-Nachricht/Event-Queue bleiben unverändert;
- sofortiger Restart erzeugt eine strikt neuere Request-Generation und kann bestätigt werden.

Die tatsächliche Zustellung einer alten/queued Notification-`PendingIntent`-Aktion ist bewusst **Device-/System-E2E-Evidence** und wird nicht durch einen reinen Persistenz-Instrumentationstest ersetzt.

## Android JUnit / Build

```bash
cd android
./gradlew testDebugUnitTest assembleDebug --no-daemon --stacktrace
```

Relevant sind insbesondere:

- `ProtectionStartHandshakePolicyTest`;
- `ProtectionServiceLifecyclePolicyTest` inklusive Notification-Generation;
- `ProtectionServiceDispatchGuardTest`;
- bestehende Coordinator-/Worker-/Stop-Code-/Lifecycle-Tests.

## Device-/E2E-Evidence

`docs/ANDROID_DEVICE_TEST_MATRIX.md` verlangt:

- `LIFE-12`: terminaler Stop gewinnt vor verspäteter Confirmation;
- `LIFE-13`: Pending-Doppelstart erzeugt keine neue Generation;
- `LIFE-14`: sofortiger Stop→Restart wird nicht durch altes `onDestroy()` zerstört;
- `LIFE-15`: alte Notification-Stop-Aktion aus `R1` bleibt nach bestätigtem Restart `R2` wirkungslos; die aktuelle `R2`-Aktion stoppt weiterhin mit `notification_action_stop`.

Die Dispatch-Spezifikation verlangt zusätzlich real:

- `DISPATCH-01`: Stop darf nicht zwischen Request-Commit und Android-Startdispatch gewinnen;
- `DISPATCH-02`: Restart darf nicht zwischen Stop-Persistenz und altem `stopService()` verloren gehen;
- `DISPATCH-03`: residualer kontrollierter Destroy nach Fast-Restart darf die neue Generation nicht überschreiben;
- `DISPATCH-04`: ein alter/abgelaufener controlled-stop Token darf einen späteren echten Destroy nicht maskieren;
- `DISPATCH-05`: stale Notification-`ACTION_STOP` darf die neue Generation nicht stoppen.

Der Debug-Screen und der kopierte Native-Snapshot müssen sichtbar enthalten:

```text
lastProtectionStartRequestAt
lastProtectionStartAt
lastProtectionStopAt
lastProtectionStopCode
lastProtectionStopMessage
```

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

GitHub Actions liefert auf diesem Draft-Branch weiterhin Verify-Jobs ohne ausgeführte Steps. Die exakte aktuelle Head-SHA und der zugehörige Lauf werden in PR #8 geführt.

Deshalb sind aktuell **nicht als bestanden belegt**:

- `npm run verify`;
- `check:native-stop-atomicity`;
- `check:start-handshake`;
- `check:lifecycle`;
- `check:android-instrumentation`;
- Android JUnit;
- `ProtectionServiceLifecyclePolicyTest`;
- `ProtectionServiceDispatchGuardTest`;
- Android Instrumentation;
- Gradle Debug Build;
- APK;
- `LIFE-12` bis `LIFE-15`;
- `DISPATCH-01` bis `DISPATCH-05`;
- reale Process-Kill-/Start-/Stop-/PendingIntent-Race-Evidence.

## Reihenfolge nach Entsperrung

1. `npm ci`;
2. `npm run verify`;
3. `./gradlew testDebugUnitTest assembleDebug --no-daemon --stacktrace`;
4. `./gradlew connectedDebugAndroidTest --no-daemon --stacktrace`;
5. `LIFE-12`: Stop vor verspäteter Confirmation;
6. `LIFE-13`: doppelter Start während `start-pending`;
7. `LIFE-14`: sofortiger Stop→Restart vor altem `onDestroy()`;
8. `LIFE-15`: stale Notification-Stop-Aktion nach bestätigtem Restart;
9. `DISPATCH-01..05` mit Diagnose-JSON und Logcat ausführen;
10. Pre-Confirmation-Abbruch → `start-interrupted` → Retry;
11. Post-Start-Process-Kill → `unclean-process-stop` → Recovery;
12. App-/aktuelle Notification-Stopp-, Start-/Foreground-/Destroy-, Boot/App-Update-, Permission-Loss- und Target-App-Pfade;
13. Physical Device Matrix, V0.7-Migration, 12h/OEM/Batterie;
14. finaler Supply-Chain-/Binary-/Security-Audit;
15. erst danach Candidate Freeze und Release.
