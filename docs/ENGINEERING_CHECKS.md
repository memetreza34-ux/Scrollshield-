# ScrollShield – Engineering Checks

Status: **verbindlicher technischer Verifikationsvertrag**

Letzte Aktualisierung: **26. August 2026**

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

Ein erfolgreicher Native-Sync verwendet einen synchronen `commit()` und liefert erst danach die neue UUID-Generation an TypeScript. Der normale Start und Process-Loss-Recovery reichen genau diese UUID als `expectedConfigGeneration` zurück; der Startrequest persistiert `startRequestConfigGeneration`.

### Candidate-Commit-Fehler

Vor dem Config-Write wird der vorherige komplette Tupelzustand gesichert. Liefert der Candidate-Commit `false`, stellt `ProtectionConfigDurabilityStore` vor Freigabe des Dispatch-Locks den vorherigen Config-/Availability-/Generation-Zustand wieder her und lehnt den Sync ab.

Für einen bereits laufenden Schutz gilt:

```text
Candidate nicht durable
→ Candidate nicht veröffentlichen
→ letzte bestätigte Regelbasis weiterverwenden
```

### Doppelter Schreibfehler / Certainty State

Zusätzlich existiert process-lokal:

```text
writeStateCertain
```

`ProtectionConfigWriteCertaintyPolicy` erzwingt:

```text
candidate=true                  → SICHER
candidate=false + rollback=true → SICHER
candidate=false + rollback=false→ UNSICHER
```

Bei `UNSICHER` gilt im selben Prozess:

- `matchesCurrentGeneration(...)` liefert false;
- `isCurrentRequestGeneration(...)` liefert false;
- Boot-/Update-Generation-Bootstrap ist blockiert;
- `recordProtectionStartRequested(...)` ist blockiert;
- eine Foreground-Confirmation kann nicht als current durchgehen;
- preference-basierte Runtime-Config und Target-App-Prüfung werden nicht neu veröffentlicht/ausgewertet;
- erst ein späterer erfolgreicher Config-Commit setzt den Zustand wieder auf `SICHER`.

Ein bereits laufender Dienst darf seine zuvor veröffentlichte bestätigte Regelbasis weiterverwenden.

### Stable Service Publication / Runtime Generation

`ScrollShieldProtectionService.refreshConfiguration()` verwendet zwei Lock-Grenzen:

```text
1. writeStateCertain prüfen und configJson + configGeneration snapshotten
2. lokal in nextRulesByPackage parsen
3. writeStateCertain sowie configJson + configGeneration erneut prüfen
4. nur bei exakter Gleichheit veröffentlichen
```

Damit darf weder ein fehlgeschlagener Candidate noch ein während des Parsens überholter erfolgreicher Sync in `rulesByPackage` veröffentlicht werden.

Die tatsächlich veröffentlichte Service-Regelbasis wird separat als Diagnose-Evidence geführt:

```text
protectionRuntimeConfigGeneration
```

Sie ist **Evidence**, nicht die Persistenzquelle. Die Schutzentscheidung verwendet weiterhin `cachedConfigGeneration` plus `ProtectionConfigRuntimePolicy`.

Bei `UNSICHER` bleibt nur die zuletzt veröffentlichte bestätigte Runtime-Generation nutzbar. Preferences dürfen diese Regelbasis nicht ersetzen.

### Runtime Grants / Overlay Generation

Bei einem bestätigten Generationwechsel `G1 → G2` gilt:

```text
alte temporaryAccessUntil-Grants löschen
altes Overlay/Countdown entfernen
G2 als Runtime-Generation veröffentlichen
```

Ein Overlay bindet sich beim Aufbau an `actionConfigGeneration`. Vor `WindowManager.addView(...)` und direkt vor jeder normalen oder Notfall-Freigabe wird diese Generation unter dem Dispatch-Lock erneut geprüft.

Eine stale `G1`-Action nach `G2` darf daher weder:

- `temporaryAccessUntil` neu setzen;
- ein `open`-Event schreiben;
- ein `emergency`-Event schreiben;
- ein altes warning/block-Overlay neu veröffentlichen.

Pure-Java-Vertrag:

```text
ProtectionConfigRuntimePolicyTest
```

Er trennt ausdrücklich bestimmte Persistenz, `UNSICHER` mit letzter veröffentlichter Generation sowie bestätigte Generationwechsel.

Der Debug-/Diagnosevertrag exportiert:

```text
protectionConfigGeneration
protectionConfigWriteStateCertain
protectionRuntimeConfigGeneration
startRequestConfigGeneration
```

und zeigt im Debug-Screen `SICHER`/`UNSICHER` sowie `Config-Generation`, `Runtime-Config` und `Startrequest-Config`.

## Android Service Dispatch Races

Spezifikation: `docs/PROTECTION_SERVICE_DISPATCH_RACES.md`.

Globale Lock-Reihenfolge:

```text
ProtectionServiceDispatchGuard.LOCK
→ EVENT_LOCK
```

Unter dem Dispatch-Lock werden Config Candidate-Commit/Rollback, Startrequest + Android-Startdispatch, Stop-Persistenz + `stopService()`, Factory Reset sowie kritische Service-Lifecycle- und Overlay-Action-Grenzen serialisiert.

### Controlled-stop Destroy Token

Ein erfolgreicher kontrollierter `stopService()` setzt einen process-lokalen one-shot Token auf Basis von `System.nanoTime()`, maximal 30 Sekunden gültig. Ein abgelaufener Token, negativer monotonic age-Wert oder fehlgeschlagener Stop-Dispatch darf einen späteren echten `unexpected_service_destroy` nicht unterdrücken.

### Same-Instance Fast Restart / Notification Stop

Bei Same-Instance-Restart übernimmt die lebende Service-Instanz nach erfolgreicher Confirmation die neue Request-Generation. Die Foreground-Notification trägt diese Generation im Stop-`PendingIntent`; fehlende oder alte `ACTION_STOP`-Generationen werden vor jeder `notification_action_stop`-Persistenz ignoriert.

## Android Instrumentation

```bash
npm run check:android-instrumentation
cd android
./gradlew connectedDebugAndroidTest --no-daemon --stacktrace
```

`ProtectionConfigDurabilityInstrumentedTest` schützt source-seitig insbesondere:

```text
durableConfigGenerationBindsStartRequestAndConfirmation
staleConfigGenerationCannotCreateStartRequest
freshPendingRequestFromPreviousConfigIsNotCurrent
configChangeBeforeConfirmationFailsClosedWithoutConfirmingOldRequest
legacyDurableConfigReceivesGenerationBeforeBootStyleStartRequest
```

Die tatsächliche Lebensdauer eines WindowManager-Overlays, bereits gequeueete UI-Aktionen, alte Notification-`PendingIntent`-Aktionen sowie reale Storage-/Commit-/Rollback-Fehler sind Device-/System-E2E-Evidence. Ein Source- oder Persistenztest darf nicht als Ersatz gewertet werden.

## Android JUnit / Build

```bash
cd android
./gradlew testDebugUnitTest assembleDebug --no-daemon --stacktrace
```

Relevant sind insbesondere:

- `ProtectionStartHandshakePolicyTest`;
- `ProtectionServiceLifecyclePolicyTest`;
- `ProtectionServiceDispatchGuardTest`;
- `ProtectionConfigDurabilityStoreTest`;
- `ProtectionConfigWriteCertaintyPolicyTest`;
- `ProtectionConfigRuntimePolicyTest`;
- bestehende Coordinator-/Worker-/Stop-Code-/Lifecycle-Tests.

## Device-/E2E-Evidence

`docs/ANDROID_DEVICE_TEST_MATRIX.md` verlangt zusätzlich:

- `APP-07`: durable Config-Sync + gebundener Start; Candidate-Fehler darf keine Candidate-Regel veröffentlichen;
- `APP-08`: Config-Wechsel zwischen Request und Confirmation endet `FAILED_CLOSED`/`start_failed`;
- `APP-09`: Candidate- und Rollback-Commit schlagen fehl → `UNSICHER`, neuer Start/Recovery blockiert, `protectionRuntimeConfigGeneration` bleibt auf letzter veröffentlichter Regelbasis, erfolgreicher späterer Sync stellt `SICHER` wieder her;
- `APP-10`: bestätigter `G1 → G2`-Wechsel invalidiert alte temporäre Grants und alte Overlay-Aktionen; stale `G1` darf nach `G2` keinen Grant oder `open`/`emergency`-Event erzeugen;
- `LIFE-12` bis `LIFE-15`: Start-/Stop-/Restart-/Notification-Races.

Die Dispatch-Spezifikation verlangt zusätzlich `DISPATCH-01` bis `DISPATCH-05`.

## Process-Loss / Recovery

Pre-Confirmation-Abbruch und echter Post-Start-Process-Kill bleiben getrennt. Nur ein bestätigter Start, der später ohne terminalen Stopp verschwindet, wird als `unclean-process-stop` behandelt.

## Aktuelle Ausführungsgrenze

GitHub Actions liefert auf diesem Draft-Branch weiterhin Verify-Jobs ohne ausgeführte Steps. Die exakte aktuelle Head-SHA und der zugehörige Lauf werden ausschließlich in PR #8 geführt.

Deshalb sind aktuell **nicht als bestanden belegt**:

- `npm run verify`;
- `check:native-stop-atomicity`;
- `check:start-handshake`;
- `check:config-durability`;
- `check:lifecycle`;
- `check:device-matrix`;
- `check:android-instrumentation`;
- Android JUnit;
- `ProtectionConfigWriteCertaintyPolicyTest`;
- `ProtectionConfigRuntimePolicyTest`;
- Android Instrumentation;
- Gradle Debug Build / APK;
- `APP-07` bis `APP-10`;
- `LIFE-12` bis `LIFE-15`;
- `DISPATCH-01` bis `DISPATCH-05`;
- reale Storage-Failure-/Overlay-/Grant-/Process-Kill-/Start-/Stop-/PendingIntent-Race-Evidence.

## Reihenfolge nach Entsperrung

1. `npm ci`;
2. `npm run verify`;
3. `./gradlew testDebugUnitTest assembleDebug --no-daemon --stacktrace`;
4. `./gradlew connectedDebugAndroidTest --no-daemon --stacktrace`;
5. `APP-07` bis `APP-10` inklusive Storage-/Rollback-Failure und stale Overlay-/Grant-Aktionen real ausführen;
6. `LIFE-12` bis `LIFE-15` real ausführen;
7. `DISPATCH-01` bis `DISPATCH-05` mit Diagnose-JSON und Logcat ausführen;
8. Pre-/Post-Confirmation Process Loss real prüfen;
9. App-/Notification-/Start-/Foreground-/Destroy-/Boot-/Permission-/Target-App-Pfade real prüfen;
10. Physical Device Matrix, V0.7-Migration, 12h/OEM/Batterie;
11. finaler Supply-Chain-/Binary-/Security-Audit;
12. erst danach Candidate Freeze und Release.
