# ScrollShield – Verify Checker Architecture Drift

Status: **verbindlicher Source-Vertrag; noch nicht ausgeführt**

Letzte Aktualisierung: **27. August 2026**

## Zweck

Die Android-Schutzarchitektur wurde schrittweise gehärtet: atomare Stopps, generationgebundener Start-Handshake, `ProtectionServiceDispatchGuard`, durable Config-Generationen, Runtime-Generation, durable Action-Evidence und jetzt lifecycle-snapshot-gebundene automatische Recovery.

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

Der aktuelle Vertrag ist:

```text
getStatus()
├─ start-pending        → kein Sync/Start, später erneut lesen
├─ start-interrupted    → kein Auto-Restart
├─ unclean-process-stop → recoverAfterProcessLoss(...)
└─ stale-activation     → syncCommitted(...)
                          → installed target prüfen
                          → startCommitted(generation, serviceStatus)
```

`recoverAfterProcessLoss(...)` selbst verwendet entsprechend:

```text
before = getStatus()
→ syncCommitted(...)
→ startCommitted(generation, before)
→ getStatus()
```

### Manual Stop gegen Auto-Recovery

Ein weiterer Race-Fall entstand zwischen Recovery-Entscheidung und Native-Start:

```text
stale/process-loss Status gelesen
→ Config synchronisiert
→ Nutzer stoppt bewusst
→ verspäteter Auto-Restart
```

Der aktuelle Source-Vertrag verlangt deshalb:

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

und zwar **vor** Config-Validation, Prerequisite-Stopps, Startrequest-Commit und Android-Service-Dispatch.

Snapshot-Mismatch bedeutet ausschließlich:

```text
resolve / no-op
```

Kein neuer Startrequest, kein `start_failed`, kein Überschreiben des neueren manuellen/Notification-Stops.

### Config Durability / Grants

Der alte Checker enthielt Grant-vor-Event-Reihenfolge. Aktuell gilt:

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

Aktuell:

```text
ProtectionServiceDispatchGuard.LOCK
→ EVENT_LOCK
→ factory reset tombstone
→ dispatchControlledStop(...)
```

### Notification-Prerequisite

Aktuell:

```text
NOTIFICATIONS_MISSING
→ persistProtectionSystemStopWithFallback(...)
→ dispatchControlledStop(...)
→ call.reject(...)
```

### Migration

Der Migration-Checker arbeitet fail-closed und verlangt jetzt explizit den durable Recovery-Sync statt eines zufälligen Regex-Präfix-Treffers:

```text
if (!isLoaded || migrationBlocked) return;
...
NativeProtection.getStatus()
...
NativeProtection.syncCommitted(...)
```

Save, Native Recovery/Config-Sync und Native Drain bleiben bei blockierter Migration ausgesetzt.

## Permanente Meta-Guard-Invarianten

`check:checker-drift` liest besonders lifecycle-kritische Checker selbst ein und verlangt Marker für:

- atomaren generationgebundenen Startrequest;
- kontrollierten Android-Stop-Dispatch;
- `syncCommitted()` / `startCommitted()` statt generationlosem Start;
- `start-pending` / `start-interrupted` / `unclean-process-stop`;
- Lifecycle-Snapshot für automatische `stale-activation`- und Process-Loss-Recovery;
- Native Snapshot-No-op vor startkritischen Writes;
- durable Action-Evidence vor Grant;
- Factory-Reset-Tombstone vor controlled stop;
- atomare Notification-Prerequisite-Persistenz;
- expliziten durable Migration-Sync;
- Wiring in `verify` und `readiness`.

Der Meta-Guard ersetzt keine fachlichen Checker. Er verhindert, dass bekannte Architekturgrenzen später auf einen älteren Vertrag zurückfallen.

## Reale Evidence

`docs/ANDROID_DEVICE_TEST_MATRIX.md` führt jetzt zusätzlich:

```text
LIFE-16 — Manual stop wins against in-flight automatic app-open recovery
```

Der Fall muss sowohl `stale-activation` als auch `unclean-process-stop` abdecken.

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