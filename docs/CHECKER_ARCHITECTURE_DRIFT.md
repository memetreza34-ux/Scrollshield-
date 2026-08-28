# ScrollShield – Verify Checker Architecture Drift

Status: **verbindlicher Source-Vertrag; noch nicht ausgeführt**

Letzte Aktualisierung: **28. August 2026**

## Zweck

Die Android-Schutzarchitektur wurde schrittweise gehärtet: atomare Stopps, generationgebundener Start-Handshake, `ProtectionServiceDispatchGuard`, durable Config-Generationen, Runtime-Generation, durable Action-Evidence, lifecycle-snapshot-gebundene automatische Recovery und Native-owned Fail-Closed-Recovery-Evidence.

Ein Source-Checker darf dabei nicht auf einer älteren Architektur stehen bleiben. Sonst kann korrekter gehärteter Code bei wieder laufender CI fälschlich scheitern oder ein unsicherer Altvertrag zurückkehren.

Darum existiert:

```bash
npm run check:checker-drift
```

Implementierung:

```text
scripts/check-checker-architecture.ts
```

Der Check ist Pflichtbestandteil von `npm run verify` und `scripts/readiness-report.ts`.

## Bisher gefundene reale Drift-Fälle

### Android Start / Prerequisites

Veraltete Erwartungen:

```text
setProtectionEnabled(context, true)
stopForMissingPermission(...)
stopSelf()
```

Aktuell:

```text
recordProtectionStartRequested(...)
stopForProtectionPrerequisite(...)
ProtectionServiceDispatchGuard.dispatchControlledStop(...)
```

### Process-Loss / Config Generation

Der alte Vertrag erwartete einen generationlosen Recovery-Start.

Aktuell:

```text
syncCommitted(...)
→ configGeneration
→ startCommitted(configGeneration, lifecycleSnapshot)
```

Für normale bewusste Starts bleibt:

```text
start(...)
→ syncCommitted(...)
→ startCommitted(configGeneration)
```

Damit gibt es genau einen durable Config-Sync pro Startentscheidung.

### Automatische App-Open-Recovery

Der Audit deckte zunächst auf, dass der App-Open-Recovery-Pfad aus `App.tsx` verschwunden war. Nach Wiederherstellung zeigte ein weiterer Audit einen Doppel-Sync:

```text
sync(...)
→ start(...)
→ start() synchronisiert erneut
```

Aktuell:

```text
getStatus()
├─ start-pending        → kein Sync/Start, später erneut lesen
├─ start-interrupted    → kein Auto-Restart
├─ unclean-process-stop → recoverAfterProcessLoss(...)
└─ stale-activation     → syncCommitted(...)
                          → startCommitted(generation, serviceStatus)
                          → Native entscheidet Target/Permissions/Config
```

Wichtig: `unavailableAppIds` darf im React-/Policy-Layer einen `stale-activation`-Recovery-Versuch nicht mehr unterdrücken. Selbst wenn der Sync alle aktiven Ziele als unavailable meldet, wird der snapshotgebundene Startversuch an Native weitergereicht. Nur dort darf aktuelle `target_app_missing`-/Permission-/Config-Evidence entstehen.

### Manual Stop gegen Auto-Recovery

Race:

```text
stale/process-loss Status gelesen
→ Config synchronisiert
→ Nutzer stoppt bewusst
→ verspäteter Auto-Restart
```

Vertrag:

```text
requireLifecycleSnapshot = true
expectedEnabled
expectedLastStartRequestAt
expectedLastStartAt
expectedLastStopAt
```

Native prüft unter:

```text
ProtectionServiceDispatchGuard.LOCK
→ EVENT_LOCK
→ matchesLifecycleSnapshot(...)
```

und zwar **vor** Config-Validation, Prerequisite-/Target-Stopps, Startrequest-Commit und Android-Service-Dispatch.

Snapshot-Mismatch bedeutet ausschließlich:

```text
resolve / no-op
```

Kein neuer Startrequest, kein `start_failed`, kein `target_app_missing`, kein Permission-Stop und kein Überschreiben der neueren Lifecycle-Evidence.

### Process-Loss Fail-Closed-Evidence muss Native-owned sein

Ein weiterer Audit fand folgenden Race:

```text
before = unclean-process-stop
→ syncCommitted läuft
→ Nutzer stoppt manuell
→ Sync meldet danach keine installierte aktive Ziel-App
→ alter TypeScript-Pfad schreibt target_app_missing
```

Damit hätte ein älterer Recovery-Versuch den neueren manuellen Stop überschreiben können.

Der alte Vertrag mit:

```text
TARGET_APP_MISSING_STOP_REASON
→ this.stop(...)
```

ist deshalb für Process-Loss-Recovery verboten.

Aktuell gilt:

```text
before = getStatus()
→ syncCommitted(...)
→ startCommitted(generation, before)
```

Native besitzt dann die komplette Reihenfolge:

```text
Lifecycle-Snapshot
→ Config-Generation
→ Usage Access
→ Overlay
→ Notifications
→ Target-App
→ Startrequest
→ Service-Dispatch
```

Bei nativer Rejection liest TypeScript Native Truth zurück:

```text
afterFailure = getStatus()
├─ neue terminale Evidence seit before
│  → Status zurückgeben
└─ keine neue terminale Evidence
   → ursprünglichen Fehler weiterwerfen
```

Damit gilt zugleich:

- ein neuerer manueller/Notification-Stop bleibt Gewinner;
- `target_app_missing` entsteht nur im aktuellen Native-Snapshot;
- Permission-Blocker bleiben Native-owned;
- ein Transport-/Pluginfehler ohne neue Stop-Evidence wird nicht verschluckt.

### Shared Snapshot Test Fixture

Der Start-Handshake-Checker erwartete Snapshot-Felder zunächst inline in einem einzelnen Vitest. Die Tests verwenden jetzt bewusst:

```text
expectedRecoveryStart
```

als gemeinsame exakte Fixture für mehrere Recovery-Races. `check:start-handshake` prüft daher die Definition dieser Fixture und deren Nutzung statt redundante Inline-Werte zu erzwingen.

### Config Durability / Grants

Aktuell gilt:

```text
Intentional-Open-History commit == true
→ open Event commit == true
→ temporaryAccessUntil
```

und:

```text
Emergency-Tageszähler commit == true
→ emergency Event commit == true
→ temporaryAccessUntil
```

### Factory Reset / Native Drain

```text
ProtectionServiceDispatchGuard.LOCK
→ EVENT_LOCK
→ factory reset tombstone
→ dispatchControlledStop(...)
```

### Notification-Prerequisite

```text
NOTIFICATIONS_MISSING
→ persistProtectionSystemStopWithFallback(...)
→ dispatchControlledStop(...)
→ call.reject(...)
```

### Migration

Der Migration-Checker arbeitet fail-closed und verlangt explizit den durable Recovery-Sync statt eines zufälligen Regex-Präfix-Treffers:

```text
if (!isLoaded || migrationBlocked) return;
...
NativeProtection.getStatus()
...
NativeProtection.syncCommitted(...)
```

Save, Native Recovery/Config-Sync und Native Drain bleiben bei blockierter Migration ausgesetzt.

## Permanente Meta-Guard-Invarianten

`check:checker-drift` verlangt Marker für:

- atomaren generationgebundenen Startrequest;
- kontrollierten Android-Stop-Dispatch;
- `syncCommitted()` / `startCommitted()` statt generationlosem Start;
- `start-pending` / `start-interrupted` / `unclean-process-stop`;
- Lifecycle-Snapshot für automatische `stale-activation`- und Process-Loss-Recovery;
- Native Snapshot-No-op vor startkritischen/Fail-Closed-Writes;
- stale Recovery darf Target-Verfügbarkeit nicht im React-Layer als Startverbot behandeln;
- Native besitzt Config-/Permission-/Target-Preflight-Evidence;
- `hasNewTerminalEvidenceSince(...)` im Process-Loss-Wrapper;
- Verbot des alten TypeScript-owned `TARGET_APP_MISSING_STOP_REASON`-Recovery-Pfads;
- Rückgabe frischer nativer terminaler Evidence;
- Weiterwerfen eines Fehlers ohne neue terminale Evidence;
- durable Action-Evidence vor Grant;
- Factory-Reset-Tombstone vor controlled stop;
- atomare Notification-Prerequisite-Persistenz;
- expliziten durable Migration-Sync;
- Wiring in `verify` und `readiness`.

Der Meta-Guard ersetzt keine fachlichen Checker. Er verhindert, dass bekannte Architekturgrenzen später auf einen älteren Vertrag zurückfallen.

## Reale Evidence

`docs/ANDROID_DEVICE_TEST_MATRIX.md` führt:

```text
LIFE-16 — Manual stop wins against in-flight automatic app-open recovery
```

Der Fall muss `stale-activation` und `unclean-process-stop` abdecken. Die technische LIFE-16-Spezifikation verlangt zusätzlich beim Process-Loss-Fall den Race, bei dem nach dem manuellen Stop derselbe laufende Config-Sync auch noch keine installierte aktive Ziel-App meldet. Trotzdem muss der bewusste Stop final bleiben.

## Evidence-Grenze

Aktuell ist dies **Source Contract**.

Noch nicht als ausgeführt/bestanden belegt sind insbesondere:

```text
npm run check:checker-drift
npm run check:start-handshake
npm run check:protection-recovery
npm run check:process-loss
npm run check:config-durability
npm run check:migration
npm run check:device-matrix
npm run verify
Vitest
Android JUnit
Android Instrumentation
Gradle build
LIFE-16 physical/device evidence
```

Solange auf dem exakten Kandidaten kein vollständiger erfolgreicher Verify-Lauf vorliegt – egal ob noch kein Workflow-Run registriert ist oder ein Run ohne belastbare ausgeführte Steps endet – darf aus diesen Source-Verträgen keine bestandene Release-Evidence abgeleitet werden.