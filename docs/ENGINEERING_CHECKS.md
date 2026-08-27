# ScrollShield – Engineering Checks

Status: **verbindlicher technischer Verifikationsvertrag**

Letzte Aktualisierung: **27. August 2026**

## Grundregel

Es gibt drei getrennte Evidenzstufen:

1. **Source Contract** – der verlangte Vertrag ist im Repository vorhanden.
2. **Executed Test** – Test oder Build wurde auf dem exakten Commit tatsächlich ausgeführt.
3. **Release Evidence** – Ergebnis ist eindeutig Candidate-SHA, Version Name und Version Code zugeordnet.

Source-Code, Source-Checker, vorbereitete JUnit-/Vitest-/Instrumentation-Tests und Dokumentation sind **keine ausgeführte Android-Evidence**.

Mutable Head-SHAs sowie Workflow-/Job-IDs gehören ausschließlich in PR #8 und nicht in committed Dokumente.

## Zentrale Verify-Kette

```bash
npm run verify
```

Die Kette umfasst unter anderem:

- TypeScript, ESLint, Prettier und Vitest;
- Android Project-/Instrumentation-Source-Verträge;
- `check:checker-drift`;
- `check:native-stop-atomicity`;
- `check:start-handshake`;
- `check:config-durability`;
- `check:runtime-config-state`;
- `check:usage-accounting`;
- `check:usage-flush-worker`;
- `check:process-loss`;
- `check:protection-recovery`;
- `check:device-matrix`;
- Migration, Release, Privacy, Store, Supply Chain, Security, PWA und Bundle Checks.

Die Source-Checker müssen die **aktuelle** Architektur prüfen. Veraltete Erwartungen wie produktives `setProtectionEnabled(context, true)`, `stopForMissingPermission(...)`, generationlose Starts oder Service-`stopSelf()` sind nicht zulässig.

## Checker Architecture Drift

```bash
npm run check:checker-drift
```

Spezifikation: `docs/CHECKER_ARCHITECTURE_DRIFT.md`.

Der Meta-Guard schützt die Source-Checker vor Architekturdrift. Aktuelle verpflichtende Marker sind insbesondere:

```text
recordProtectionStartRequested(...)
ProtectionServiceDispatchGuard.dispatchControlledStop(...)
syncCommitted(...) → configGeneration
startCommitted(configGeneration, optionalLifecycleSnapshot)
start-pending / start-interrupted / unclean-process-stop
matchesLifecycleSnapshot(...)
durable History/Counter + Event vor temporaryAccessUntil
Factory-Reset-Tombstone vor controlled stop
rejectProtectionStartPrerequisite(...)
fail-closed Migration-Guards
```

`check:checker-drift` ist Bestandteil von `verify` und `readiness`.

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

System-Stops persistieren atomar:

```text
enabled=false
+ warning/system Event
+ lastStopAt
+ exakter Stop-Code
+ Stop-Nachricht
```

Explizite Terminal-Stopps persistieren atomar:

```text
enabled=false
+ lastStopAt
+ exakter Stop-Code
+ Stop-Nachricht
```

und verändern die Event-Queue nicht.

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

Verbindliche Invarianten:

- kein separates produktives `enabled=true` vor dem Start;
- Request vor App-/Boot-/Update-Service-Dispatch;
- frischer Pending-Start <= 15 s ist nur mit aktueller Config-Generation idempotent;
- deutlicher Wall-Clock-Rollback kann `start-pending` nicht dauerhaft festhalten;
- `RUNNING=true` erst nach erfolgreichem `startForeground(...)` und `CONFIRMED`;
- Stop vor verspäteter Confirmation → `SUPERSEDED_BY_STOP`;
- Stop-Code, Stop-Nachricht und Event-Evidence bleiben dabei erhalten;
- echter Restart nach Stop erhält eine strikt neuere Request-Generation;
- automatische Recovery darf nur aus dem Lifecycle-Snapshot starten, auf dessen Basis sie beschlossen wurde.

### Snapshot-gebundene automatische Recovery

Automatische App-Open-/Process-Loss-Restarts unterscheiden sich bewusst von einem neuen bewussten Nutzer-Start.

TypeScript bindet einen Auto-Restart an:

```text
expectedEnabled
expectedLastStartRequestAt
expectedLastStartAt
expectedLastStopAt
```

Native prüft diese Werte unter der globalen Lock-Reihenfolge:

```text
ProtectionServiceDispatchGuard.LOCK
→ EVENT_LOCK
→ ProtectionStartHandshakePolicy.matchesLifecycleSnapshot(...)
```

und zwar **vor** Config-Fehler-, Prerequisite-, Startrequest- oder Service-Start-Evidence.

Wenn sich der Lifecycle seit der Recovery-Entscheidung verändert hat:

```text
Snapshot mismatch
→ resolve / no-op
→ kein neuer Startrequest
→ kein Auto-Reenable
→ kein start_failed
→ kein Android-Service-Dispatch
```

Damit gewinnt ein neuerer manueller oder aktueller Notification-Stop gegen einen bereits laufenden automatischen Recovery-Sync.

## Durable Config Generation / Single-Generation Start

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

Ein erfolgreicher Native-Sync verwendet einen synchronen `commit()` und liefert danach eine validierte UUID-Generation.

Bridge-Grenzen:

```text
syncCommitted(appsConfig, focusMode)
→ { unavailableAppIds, configGeneration }

startCommitted(configGeneration, optionalLifecycleSnapshot)
→ kein zweiter Config-Sync
```

Ein normaler bewusster Start bleibt selbständig:

```text
start(...)
→ syncCommitted(...)
→ startCommitted(configGeneration)
```

Der App-Open-`stale-activation`-Pfad verwendet dagegen exakt die bereits erzeugte Generation:

```text
serviceStatus = getStatus()
→ syncCommitted(...)
→ installierte aktive Ziele prüfen
→ startCommitted(configGeneration, serviceStatus)
```

Process-Loss-Recovery entsprechend:

```text
before = getStatus()
→ nur unclean-process-stop akzeptieren
→ syncCommitted(...)
→ installierte aktive Ziele prüfen
→ startCommitted(configGeneration, before)
→ getStatus()
```

Damit erzeugt eine einzelne Recovery-Entscheidung nicht zwei aufeinanderfolgende Config-Generationen.

### Candidate-/Rollback-Schreibfehler

Vor dem Config-Write wird der vorherige komplette Tupelzustand gesichert. Scheitert der Candidate-Commit, wird der vorherige Zustand synchron restauriert.

Process-lokal gilt:

```text
candidate=true                   → SICHER
candidate=false + rollback=true  → SICHER
candidate=false + rollback=false → UNSICHER
```

Bei `UNSICHER` sind neue Start-/Recovery-/Pending-/Confirmation-Pfade blockiert, bis ein späterer erfolgreicher Config-Sync wieder `SICHER` herstellt. Ein bereits laufender Service darf ausschließlich seine zuletzt veröffentlichte bestätigte Runtime-Regelbasis weiterverwenden.

## Runtime Config State

```bash
npm run check:runtime-config-state
```

Spezifikation: `docs/PROTECTION_RUNTIME_CONFIG_STATE.md`.

`ScrollShieldProtectionService.refreshConfiguration()` veröffentlicht nur eine Config, deren JSON und Generation vor und nach dem Parsen weiterhin exakt aktuell und deren Persistenzzustand sicher sind.

Die tatsächlich veröffentlichte Regelbasis wird separat als Evidence geführt:

```text
protectionRuntimeConfigGeneration
```

Bei einem bestätigten `G1 → G2` gilt:

```text
G1-Usage-Tick schließen
→ G2-Regelbasis veröffentlichen
→ alte temporaryAccessUntil-Grants löschen
→ altes Overlay/Countdown entfernen
→ Runtime-Generation = G2
```

Eine stale G1-Aktion nach G2 darf weder einen Grant setzen noch `open`-/`emergency`-Evidence erzeugen.

## Durable Action Evidence vor Grant

Normale Freigabe:

```text
recordIntentionalOpen(...).commit() == true
→ appendProtectionEvent("open", ...).commit() == true
→ temporaryAccessUntil.put(...)
```

Emergency-Freigabe:

```text
incrementEmergencyCount(...).commit() == true
→ appendProtectionEvent("emergency", ...).commit() == true
→ temporaryAccessUntil.put(...)
```

Schlägt History/Counter oder Event-Persistenz fehl, wird **kein Zugang** gewährt. Ein lokaler Persistenzfehler darf Schutz höchstens strenger, niemals schwächer machen.

## Usage Accounting / Flush

```bash
npm run check:usage-accounting
npm run check:usage-flush-worker
```

Ownership:

```text
ScrollShieldProtectionService
→ day + ruleId Bucket
→ UsageFlushCoordinator
→ UsageFlushWorker
→ SharedPreferences.commit()
```

Verbindlich:

- höchstens ein In-Flight-Batch;
- Pending + In-Flight bleiben für Daily-Limit sichtbar;
- fehlgeschlagene Writes werden zurückgemerged;
- stale Completion bestätigt keinen anderen Batch;
- Shutdown drainiert über denselben serialisierten Worker;
- G1-Usage wird vor G2-Regelveröffentlichung abgeschlossen.

## Android Service Dispatch Races

Spezifikation: `docs/PROTECTION_SERVICE_DISPATCH_RACES.md`.

Globale Lock-Reihenfolge:

```text
ProtectionServiceDispatchGuard.LOCK
→ EVENT_LOCK
```

Darunter werden Startrequest + Startdispatch, Stop-Persistenz + `stopService()`, Config Candidate-/Rollback-Grenzen, Factory Reset sowie kritische Service-/Overlay-Lifecycle-Grenzen serialisiert.

Ein erfolgreicher kontrollierter `stopService()` setzt einen bounded one-shot Destroy-Token. Alte oder fehlgeschlagene Stop-Dispatches dürfen einen späteren echten `unexpected_service_destroy` nicht unterdrücken.

Bei Same-Instance-Restart übernimmt der Service die neue Request-Generation. Die Foreground-Notification trägt diese Generation im Stop-PendingIntent; alte Notification-Aktionen werden vor terminaler Stop-Persistenz verworfen.

## Process-Loss / App-Open Recovery

`start-pending`, `start-interrupted`, `unclean-process-stop` und `stale-activation` bleiben getrennte Zustände.

App-Open:

```text
getStatus()
├─ start-pending
│  → kein Config-Sync, kein zweiter Start; später erneut lesen
├─ unclean-process-stop
│  → recoverAfterProcessLoss(...)
│  → eigener Single-Generation-Sync + Lifecycle-Snapshot
├─ stale-activation
│  → syncCommitted(...)
│  → installierte aktive Ziel-App prüfen
│  → startCommitted(configGeneration, serviceStatus)
├─ start-interrupted
│  → kein Auto-Restart; Nutzer-Retry
└─ active / deliberately disabled / other
   → kein automatischer Start
```

Ein App-Open darf einen frischen Pending-Request weder resynchronisieren noch duplizieren. Ein neuerer manueller Stop während Auto-Recovery gewinnt durch den Snapshot-Guard.

## Android JUnit / Instrumentation / Build

Source-Verträge existieren unter anderem für:

- `ProtectionStartHandshakePolicyTest` einschließlich Lifecycle-Snapshot-Regel;
- `ProtectionServiceLifecyclePolicyTest`;
- `ProtectionServiceDispatchGuardTest`;
- `ProtectionConfigDurabilityStoreTest`;
- `ProtectionConfigWriteCertaintyPolicyTest`;
- `ProtectionConfigRuntimePolicyTest`;
- `UsageAccountingPolicyTest`;
- `UsageFlushCoordinatorTest`;
- `UsageFlushWorkerTest`;
- Protection Diagnostics / Config Durability Instrumentation.

Auszuführende Android-Kommandos:

```bash
cd android
./gradlew testDebugUnitTest assembleDebug --no-daemon --stacktrace
./gradlew connectedDebugAndroidTest --no-daemon --stacktrace
```

Vor erfolgreicher realer Ausführung gelten diese Tests nicht als bestanden.

## Device-/E2E-Evidence

`docs/ANDROID_DEVICE_TEST_MATRIX.md` verlangt insbesondere:

- `APP-07` bis `APP-10` – Config Durability / Generation / Rollback / Runtime-Invalidierung;
- `RUNTIME-01` bis `RUNTIME-06` – generationgebundene Grants/Actions, Usage-Grenze, durable Intentional-/Emergency-Evidence;
- `LIFE-12` – terminaler Stop gewinnt vor delayed Confirmation;
- `LIFE-13` – Duplicate Start während Pending;
- `LIFE-14` – Stop → unmittelbarer Restart vor altem Teardown;
- `LIFE-15` – stale Notification-Stop nach bestätigtem Restart;
- `LIFE-16` – manueller/aktueller Notification-Stop gewinnt gegen bereits laufende automatische App-Open-Recovery;
- `DISPATCH-01` bis `DISPATCH-05` – reale Android-Dispatch-/PendingIntent-Races.

Für `LIFE-16` müssen mindestens `stale-activation` und `unclean-process-stop` real reproduziert werden. Zwischen Recovery-Entscheidung bzw. Config-Sync und Auto-Start wird bewusst gestoppt. Danach müssen `enabled=false`, Stop-Code/-Nachricht/-Zeitpunkt unverändert bleiben; es darf kein neuer Startrequest, kein `lastStartAt`, kein `start_failed` und kein Auto-Reenable entstehen.

## Aktuelle Ausführungsgrenze

Die exakte aktuelle Head-SHA und der zugehörige GitHub-Actions-Status werden ausschließlich in PR #8 geführt.

Solange kein vollständiger erfolgreicher Verify-/Android-Lauf auf dem exakten Kandidaten vorliegt, sind insbesondere **nicht als bestanden belegt**:

- `npm run verify`;
- alle oben genannten Source-Checker;
- TypeScript / ESLint / Prettier / Vitest;
- App-Open-Recovery-React-Tests;
- Android JUnit;
- Android Instrumentation;
- Gradle Debug Build / APK;
- `APP-07` bis `APP-10`;
- `RUNTIME-01` bis `RUNTIME-06`;
- `LIFE-12` bis `LIFE-16`;
- `DISPATCH-01` bis `DISPATCH-05`;
- reale Storage-Failure-, Overlay-, Grant-, Usage-, Process-Kill-, Start-/Stop-/Auto-Recovery- und PendingIntent-Race-Evidence.

## Reihenfolge nach CI-/Runner-Entsperrung

1. `npm ci`;
2. `npm run verify`;
3. Android JUnit + `assembleDebug`;
4. `connectedDebugAndroidTest`;
5. App-Open-Recovery mit `start-pending`, `start-interrupted`, `unclean-process-stop`, `stale-activation` real prüfen;
6. `APP-07` bis `APP-10` real ausführen;
7. `RUNTIME-01` bis `RUNTIME-06` real ausführen;
8. `LIFE-12` bis `LIFE-16` real ausführen;
9. `DISPATCH-01` bis `DISPATCH-05` real ausführen;
10. Physical Device Matrix, V0.7-Migration, 12h/OEM/Batterie;
11. finaler Supply-Chain-/Binary-/Security-Audit;
12. erst danach Candidate Freeze und Release.
