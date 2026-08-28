# ScrollShield – Engineering Checks

Status: **verbindlicher technischer Verifikationsvertrag**

Letzte Aktualisierung: **28. August 2026**

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

Veraltete Erwartungen wie produktives `setProtectionEnabled(context, true)`, `stopForMissingPermission(...)`, generationlose Starts, React-/TypeScript-owned Recovery-Blocker oder Service-`stopSelf()` sind nicht zulässig.

## Checker Architecture Drift

```bash
npm run check:checker-drift
```

Spezifikation: `docs/CHECKER_ARCHITECTURE_DRIFT.md`.

Der Meta-Guard schützt die Source-Checker vor Architekturdrift. Verbindliche Marker sind insbesondere:

```text
recordProtectionStartRequested(...)
ProtectionServiceDispatchGuard.dispatchControlledStop(...)
syncCommitted(...) → configGeneration
startCommitted(configGeneration, optionalLifecycleSnapshot)
start-pending / start-interrupted / unclean-process-stop
matchesLifecycleSnapshot(...)
hasNewTerminalEvidenceSince(...)
Native-owned Config/Permission/Target Fail-Closed-Evidence
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

TypeScript bindet Auto-Restart an:

```text
expectedEnabled
expectedLastStartRequestAt
expectedLastStartAt
expectedLastStopAt
```

Native prüft:

```text
ProtectionServiceDispatchGuard.LOCK
→ EVENT_LOCK
→ ProtectionStartHandshakePolicy.matchesLifecycleSnapshot(...)
```

**vor** Config-, Permission-, Target-, Startrequest- oder Service-Start-Evidence.

Snapshot-Mismatch:

```text
resolve / no-op
→ kein neuer Startrequest
→ kein Auto-Reenable
→ kein start_failed
→ kein target_app_missing
→ kein Permission-Stop
→ kein Service-Dispatch
```

Damit gewinnt neuere Lifecycle-Evidence gegen einen bereits laufenden automatischen Recovery-Versuch.

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

Bridge-Grenzen:

```text
syncCommitted(appsConfig, focusMode)
→ { unavailableAppIds, configGeneration }

startCommitted(configGeneration, optionalLifecycleSnapshot)
→ kein zweiter Config-Sync
```

Normaler bewusster Nutzer-Start:

```text
start(...)
→ syncCommitted(...)
→ startCommitted(configGeneration)
```

App-Open-`stale-activation`:

```text
serviceStatus = getStatus()
→ syncCommitted(...)
→ startCommitted(configGeneration, serviceStatus)
→ Native entscheidet Config / Permissions / installierte aktive Ziel-App
```

`unavailableAppIds` darf den stale-Recovery-Versuch im React-Layer nicht unterdrücken. Die Liste bleibt Diagnose-/UI-Information; fail-closed `target_app_missing`-/Permission-Evidence gehört dem aktuellen Native-Snapshot.

Process-Loss-Recovery:

```text
before = getStatus()
→ nur unclean-process-stop akzeptieren
→ syncCommitted(...)
→ startCommitted(configGeneration, before)
→ Native-Preflight besitzt Fail-Closed-Evidence
→ getStatus()
```

Damit erzeugt eine einzelne Recovery-Entscheidung nur eine neue durable Config-Generation.

### Native-owned Process-Loss-Fail-Closed-Evidence

Process-Loss-Recovery schreibt in TypeScript **keinen** proaktiven `target_app_missing`-Stop.

Native besitzt die Reihenfolge:

```text
Lifecycle-Snapshot
→ Config-Generation
→ Usage Access
→ Overlay
→ Notifications
→ installierte aktive Ziel-App
→ Startrequest
→ Service-Dispatch
```

Bei nativer Rejection liest TypeScript anschließend den Status:

```text
neue terminale Evidence seit before
→ Status zurückgeben

keine neue terminale Evidence
→ ursprünglichen Fehler weiterwerfen
```

So wird weder ein neuerer manueller Stop überschrieben noch ein reiner Transportfehler als persistierter Blocker maskiert.

### Candidate-/Rollback-Schreibfehler

Process-lokal gilt:

```text
candidate=true                   → SICHER
candidate=false + rollback=true  → SICHER
candidate=false + rollback=false → UNSICHER
```

Bei `UNSICHER` sind neue Start-/Recovery-/Pending-/Confirmation-Pfade blockiert, bis ein späterer erfolgreicher Config-Sync wieder `SICHER` herstellt. Ein laufender Service darf nur seine zuletzt veröffentlichte bestätigte Runtime-Regelbasis weiterverwenden.

## Runtime Config State

```bash
npm run check:runtime-config-state
```

Spezifikation: `docs/PROTECTION_RUNTIME_CONFIG_STATE.md`.

`ScrollShieldProtectionService.refreshConfiguration()` veröffentlicht nur eine Config, deren JSON und Generation vor und nach dem Parsen weiterhin exakt aktuell und deren Persistenzzustand sicher sind.

Diagnose-Evidence:

```text
protectionRuntimeConfigGeneration
```

Bei `G1 → G2`:

```text
G1-Usage-Tick schließen
→ G2-Regelbasis veröffentlichen
→ alte temporaryAccessUntil-Grants löschen
→ altes Overlay/Countdown entfernen
→ Runtime-Generation = G2
```

Eine stale G1-Aktion nach G2 darf weder Grant noch `open`-/`emergency`-Evidence erzeugen.

## Durable Action Evidence vor Grant

Normal:

```text
recordIntentionalOpen(...).commit() == true
→ appendProtectionEvent("open", ...).commit() == true
→ temporaryAccessUntil.put(...)
```

Emergency:

```text
incrementEmergencyCount(...).commit() == true
→ appendProtectionEvent("emergency", ...).commit() == true
→ temporaryAccessUntil.put(...)
```

Schlägt History/Counter oder Event-Persistenz fehl, wird **kein Zugang** gewährt.

## Usage Accounting / Flush

```bash
npm run check:usage-accounting
npm run check:usage-flush-worker
```

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

Alte Notification-Aktionen werden generationgebunden vor terminaler Stop-Persistenz verworfen.

## Process-Loss / App-Open Recovery

```text
getStatus()
├─ start-pending
│  → kein Config-Sync, kein zweiter Start; später erneut lesen
├─ unclean-process-stop
│  → recoverAfterProcessLoss(...)
│  → Single-Generation + Snapshot
│  → Native besitzt Config-/Target-/Permission-/Start-Fail-Closed-Evidence
├─ stale-activation
│  → syncCommitted(...)
│  → startCommitted(configGeneration, serviceStatus)
│  → Native besitzt Config-/Target-/Permission-/Start-Fail-Closed-Evidence
├─ start-interrupted
│  → kein Auto-Restart; Nutzer-Retry
└─ active / deliberately disabled / other
   → kein automatischer Start
```

Ein neuerer manueller Stop während Auto-Recovery gewinnt. Selbst wenn derselbe Config-Sync danach zusätzlich „keine Ziel-App verfügbar“ ergibt, darf der veraltete Recovery-Versuch keinen `target_app_missing` über den neueren Stop schreiben.

## Android JUnit / Instrumentation / Build

Source-Verträge existieren unter anderem für:

- `ProtectionStartHandshakePolicyTest` inklusive Lifecycle-Snapshot-Regel;
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
- `LIFE-16` – manueller/aktueller Notification-Stop gewinnt gegen bereits laufende automatische App-Open-Recovery, auch wenn danach Target-/Permission-Blocker sichtbar werden;
- `DISPATCH-01` bis `DISPATCH-05` – reale Android-Dispatch-/PendingIntent-Races.

LIFE-16 muss mindestens `stale-activation` und `unclean-process-stop` reproduzieren. Für Process-Loss zusätzlich Pflicht: Während des Recovery-Syncs bewusst stoppen und anschließend denselben Sync keine installierte aktive Ziel-App melden lassen; der bewusste Stop muss trotzdem final bleiben.

## Aktuelle Ausführungsgrenze

Die exakte aktuelle Head-SHA und der zugehörige GitHub-Actions-Status werden ausschließlich in PR #8 geführt.

Nicht als bestanden belegt sind ohne erfolgreichen exakten Lauf insbesondere:

- `npm run verify`;
- alle oben genannten Source-Checker;
- TypeScript / ESLint / Prettier / Vitest;
- App-Open-/Process-Loss-/Prepared-Start-Tests;
- Android JUnit;
- Android Instrumentation;
- Gradle Debug Build / APK;
- `APP-07` bis `APP-10`;
- `RUNTIME-01` bis `RUNTIME-06`;
- `LIFE-12` bis `LIFE-16`;
- `DISPATCH-01` bis `DISPATCH-05`;
- reale Storage-, Overlay-, Grant-, Usage-, Process-Kill-, Start-/Stop-/Auto-Recovery- und PendingIntent-Race-Evidence.

## Reihenfolge nach CI-/Runner-Entsperrung

1. `npm ci`;
2. `npm run verify`;
3. Android JUnit + `assembleDebug`;
4. `connectedDebugAndroidTest`;
5. App-Open-Recovery mit allen Health-Zuständen real prüfen;
6. LIFE-16 inklusive Target-missing-after-manual-stop-Race real ausführen;
7. `APP-07` bis `APP-10` real ausführen;
8. `RUNTIME-01` bis `RUNTIME-06` real ausführen;
9. `LIFE-12` bis `LIFE-15` und `DISPATCH-01` bis `DISPATCH-05` real ausführen;
10. Physical Device Matrix, V0.7-Migration, 12h/OEM/Batterie;
11. finaler Supply-Chain-/Binary-/Security-Audit;
12. erst danach Candidate Freeze und Release.