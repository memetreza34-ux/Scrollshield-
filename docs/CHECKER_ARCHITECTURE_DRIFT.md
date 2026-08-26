# ScrollShield – Verify Checker Architecture Drift

Status: **verbindlicher Source-Vertrag; noch nicht ausgeführt**

Letzte Aktualisierung: **26. August 2026**

## Zweck

Die Android-Schutzarchitektur wurde in mehreren Schritten gehärtet: atomare Stopps, generationgebundener Start-Handshake, `ProtectionServiceDispatchGuard`, durable Config-Generationen, generationgebundener Runtime-State und durable Action-Evidence vor temporären Grants.

Ein Source-Checker darf dabei nicht auf einer älteren Architektur stehen bleiben. Sonst kann eine korrekte Implementierung bei wieder laufender CI fälschlich scheitern oder ein alter unsicherer Vertrag unbemerkt zurückkehren.

Darum existiert jetzt:

```bash
npm run check:checker-drift
```

Implementierung:

```text
scripts/check-checker-architecture.ts
```

Der Check ist verpflichtender Bestandteil von `npm run verify` und `scripts/readiness-report.ts`.

## Audit-Ergebnis

Der repo-weite Verify-Checker-Audit hat konkrete veraltete Verträge gefunden und korrigiert.

### `check:android`

Veraltet waren Erwartungen auf:

```text
setProtectionEnabled(context, true)
stopForMissingPermission(...)
```

Aktuell gilt:

```text
recordProtectionStartRequested(...)
stopForProtectionPrerequisite(...)
ProtectionServiceDispatchGuard.dispatchControlledStop(...)
```

Direkte produktive `enabled=true`-Writes bleiben verboten.

### `check:prerequisite-stop-codes`

Der alte Vertrag erwartete Service-Shutdown über `stopSelf()`.

Aktuell gilt:

```text
atomic system-stop evidence
→ controlled stop dispatch
```

`stopSelf()` ist im produktiven Schutz-Service kein erlaubter Lifecycle-Shutdown mehr.

### `check:process-loss`

Der alte Checker erwartete generationlosen Recovery-Start.

Aktuell gilt:

```text
syncCommittedConfig(...)
→ expectedConfigGeneration
→ startProtectionService({ expectedConfigGeneration })
```

Zusätzlich bleiben `start-pending`, `start-interrupted` und `unclean-process-stop` getrennte Zustände.

### `check:config-durability`

Der alte Checker enthielt noch eine Grant-vor-Event-Reihenfolge.

Aktuell gilt für normale Freigabe:

```text
Intentional-Open-History commit == true
→ open Event commit == true
→ temporaryAccessUntil
```

und für Notfallfreigabe:

```text
Emergency-Tageszähler commit == true
→ emergency Event commit == true
→ temporaryAccessUntil
```

Ein Persistenzfehler darf keinen temporären Zugang erzeugen.

### `check:transparency`

Benachrichtigungs-Prerequisite darf nicht über einen nackten `call.reject(...)` modelliert werden.

Aktuell gilt:

```text
NOTIFICATIONS_MISSING
→ persistProtectionSystemStopWithFallback(...)
→ dispatchControlledStop(...)
→ call.reject(...)
```

### `check:native-drain-ack`

Factory Reset darf keinen direkten unkoordinierten Service-Stopp voraussetzen.

Aktuell gilt:

```text
ProtectionServiceDispatchGuard.LOCK
→ EVENT_LOCK
→ factory reset tombstone
→ dispatchControlledStop(...)
```

### `check:migration`

Der Recovery-UI-Checker erwartete noch die alte positive Save-Bedingung.

Aktuell arbeitet `App.tsx` fail-closed:

```text
if (!isLoaded || migrationBlocked) return;
```

Save, Native Config Sync/Recovery und Native Drain bleiben während blockierter Migration ausgesetzt.

## App-Open Recovery – echter Architekturfehler aus dem Audit

Der Audit hat zusätzlich einen realen App-Pfadfehler sichtbar gemacht: der frühere App-Open-Recovery-Pfad war aus `App.tsx` verschwunden, während Tests und Checker ihn weiterhin voraussetzten. Die ältere Recovery-Policy hätte außerdem jedes `enabled=true && running=false` gleich behandelt und damit die neu eingeführten Start-Handshake-Zustände vermischt.

Der aktuelle Vertrag lautet:

```text
NativeProtection.getStatus()
│
├─ start-pending
│  └─ weder Config-Sync noch zweiter Start; Status später erneut lesen
│
├─ unclean-process-stop
│  └─ direkt recoverAfterProcessLoss(...)
│     └─ Recovery besitzt selbst durable Config-Sync + Generation-Bindung
│
├─ stale-activation
│  └─ Config sync
│     └─ mindestens eine installierte aktive Ziel-App
│        └─ normaler generationgebundener NativeProtection.start(...)
│
├─ start-interrupted
│  └─ kein automatischer Neustart; sichtbarer Retry-Pfad bleibt zuständig
│
└─ active / deliberately disabled / other
   └─ kein automatischer Start
```

Wichtig: `unclean-process-stop` wird **vor** dem generischen App-Level-Config-Sync abgefangen. Dadurch entsteht kein unnötiger doppelter Config-Generation-Wechsel; `recoverAfterProcessLoss(...)` führt seinen eigenen kontrollierten Sync aus.

## Permanente Meta-Guard-Invarianten

`check:checker-drift` liest die besonders lifecycle-kritischen Checker selbst ein und verlangt stabile Architekturmarker für:

- atomaren generationgebundenen Startrequest;
- explizite Ablehnung alter Direkt-Start-/Prerequisite-Pfade;
- kontrollierten Android-Stop-Dispatch;
- generationgebundenes Process-Loss-Recovery;
- durable Action-Evidence vor Grant;
- Factory-Reset-Tombstone vor kontrolliertem Stop;
- atomare Notification-Prerequisite-Persistenz;
- health-aware App-Open-Recovery ohne Doppel-Sync;
- fail-closed Migration-Guards;
- Wiring in `verify` und `readiness`.

Der Meta-Guard ersetzt keine fachlichen Checker. Er verhindert nur, dass diese bekannten Architekturgrenzen später wieder auf einen älteren Vertrag zurückfallen.

## Evidence-Grenze

Aktuell ist dies **Source Contract**.

Noch nicht als ausgeführt/bestanden belegt sind insbesondere:

```text
npm run check:checker-drift
npm run check:protection-recovery
npm run check:process-loss
npm run check:config-durability
npm run check:transparency
npm run check:native-drain-ack
npm run check:migration
npm run verify
Vitest
Android JUnit
Android Instrumentation
Gradle build
physical device recovery evidence
```

Solange GitHub Actions auf dem Draft-Branch einen Verify-Job ohne Steps liefert, darf aus diesen Source-Verträgen keine bestandene Release-Evidence abgeleitet werden.
