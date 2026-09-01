# Android Protection Start Handshake

Status: **verbindlicher Source-/Evidence-Vertrag**

Diese Spezifikation trennt eine angeforderte Android-Schutzaktivierung von einem tatsächlich bestätigten Foreground-Service-Start und definiert die Gewinnerregeln für konkurrierende Start-/Stop-/Recovery-Ereignisse.

## 1. Persistente Lifecycle-Grenzen

ScrollShield verwendet drei getrennte Zeitmarken:

- `protection_last_start_request_at` — eine Startanforderung wurde dauerhaft gespeichert;
- `protection_last_start_at` — der Foreground-Service wurde bestätigt;
- `protection_last_stop_at` — ein terminaler Stopp wurde dauerhaft gespeichert.

Diese Werte sind nicht nur Uhrzeiten, sondern **logische Lifecycle-Grenzen**. `ProtectionStartHandshakePolicy.nextLifecycleTimestamp(...)` erzeugt jeden neuen Request-/Start-/Stop-Zeitpunkt mindestens eins größer als die höchste gespeicherte Grenze, sofern `Long.MAX_VALUE` nicht erreicht ist.

## 2. Atomare Startanforderung

Vor `startForegroundService(...)` bzw. `startService(...)` muss `recordProtectionStartRequested(...)` synchron speichern:

```text
enabled = true
lastStartRequestAt = nextLifecycleTimestamp(...)
startRequestConfigGeneration = current durable config generation
```

Schlägt dieser Commit fehl, folgt `START_FAILED` + atomarer System-Stop und es gibt keinen Service-Start. Ein separates produktives `setProtectionEnabled(context, true)` ist nicht erlaubt.

## 3. Doppelstart während Pending wird unterdrückt

```text
running && enabled
→ idempotent resolve
```

und:

```text
frische unbestätigte Startanforderung <= 15 Sekunden
+ aktuelle sichere Config-Generation
→ idempotent resolve
```

Ein zweiter UI-/Bridge-Aufruf darf den vorhandenen `lastStartRequestAt` nicht verschieben und keine zweite logische Startgeneration erzeugen.

## 4. Boot-/App-Update-Recovery nutzt denselben Handshake

`ScrollShieldBootReceiver` muss nach erfolgreichen Recovery-Prerequisites zuerst `recordProtectionStartRequested(context)` ausführen und darf erst danach Android-Service-Dispatch auslösen. Kann die Startanforderung nicht dauerhaft gebunden werden, endet Recovery mit `recovery_start_failed`.

## 5. Bestätigter Foreground-Start

```text
serviceStartRequestAtOnCreate = aktueller lastStartRequestAt
↓
startForeground(...)
↓
recordProtectionServiceStarted(...)
↓
CONFIRMED
↓
RUNNING=true
```

`recordProtectionServiceStarted(...)` liefert genau:

```text
CONFIRMED
SUPERSEDED_BY_STOP
FAILED_CLOSED
```

Nur `CONFIRMED` darf `RUNNING=true` erreichen.

## 6. Stop gewinnt gegen verspätete Startbestätigung

Wenn nach einer Startanforderung zuerst ein terminaler Stop persistiert wird:

```text
R1 = lastStartRequestAt
S1 = lastStopAt > R1
```

und danach die verspätete Bestätigung kommt:

```text
recordProtectionServiceStarted(...)
→ SUPERSEDED_BY_STOP
```

Dann darf der Start weder `lastStartAt` fortschreiben noch `enabled=true`, Stop-Diagnose oder Event-Evidence überschreiben.

## 7. Schneller Stop → Restart

Ein echter neuer Start nach einem Stopp erhält eine neue Generation:

```text
R1 < S1 < R2 < C2
```

Bei Same-Instance-Restart bestätigt `onStartCommand()` die neue Request-Generation, die lebende Service-Instanz übernimmt `R2`, und ihre Notification wird danach auf diese Generation aktualisiert.

## 8. Notification-Stop folgt derselben Generation

Der Stop-`PendingIntent` trägt:

```text
EXTRA_STOP_START_REQUEST_AT = serviceStartRequestAtOnCreate
```

Ein `ACTION_STOP` ist nur gültig, wenn Action-, Service- und aktuellste Request-Generation übereinstimmen. Eine alte `R1`-Aktion darf eine bestätigte `R2`-Aktivierung nicht stoppen.

## 9. Altes `onDestroy()` darf neuen Restart nicht überschreiben

Jede Service-Instanz besitzt ihre aktuelle Ownership-Generation. Residuale kontrollierte Destroy-Ereignisse dürfen keine neuere Generation als `unexpected_service_destroy` überschreiben. Umgekehrt darf ein altes `explicitStopRequested=true` einen echten Destroy nicht dauerhaft maskieren, sobald die Instanz eine neuere bestätigte Generation übernommen hat.

## 10. Automatische App-Open-Recovery ist snapshotgebunden

Automatische Recovery ist keine neue Nutzerentscheidung. Deshalb darf sie einen **nach ihrer Entscheidung entstandenen manuellen oder Notification-Stop niemals rückgängig machen**.

Der App-Open-Pfad liest zuerst Native Lifecycle Truth. Für `stale-activation` wird genau eine durable Config-Generation erzeugt:

```text
serviceStatus = getStatus()
↓
syncCommitted(...)
→ configGeneration G
↓
startCommitted(G, serviceStatus)
```

`recoverAfterProcessLoss(...)` verwendet entsprechend:

```text
before = getStatus() // unclean-process-stop
↓
syncCommitted(...)
↓
startCommitted(configGeneration, before)
```

`startCommitted(..., snapshot)` überträgt:

```text
requireLifecycleSnapshot = true
expectedEnabled
expectedLastStartRequestAt
expectedLastStartAt
expectedLastStopAt
```

Native prüft diesen Snapshot unter der Lock-Reihenfolge:

```text
ProtectionServiceDispatchGuard.LOCK
→ EVENT_LOCK
→ matchesLifecycleSnapshot(...)
```

**Diese Prüfung liegt vor Config-Validation, Prerequisite-Stopps, `recordProtectionStartRequested(...)` und Android-Service-Dispatch.**

Hat sich seit der Recovery-Entscheidung irgendeine Lifecycle-Grenze oder `enabled` geändert:

```text
Snapshot mismatch
→ call.resolve()
→ kein neuer Startrequest
→ kein Service-Dispatch
→ kein start_failed
→ keine neue Stop-Evidence
```

Damit bleibt eine neuere Nutzer-/Notification-Entscheidung Gewinner.

Wenn Auto-Recovery dagegen den Dispatch-Lock zuerst mit noch unverändertem Snapshot gewinnt, darf sie ihren Startrequest schreiben; ein unmittelbar danach ausgeführter manueller Stop gewinnt anschließend terminal über die bestehende Stop-Wins-Regel.

Normale **bewusste Nutzer-Starts** verwenden keinen Recovery-Snapshot und bleiben davon unberührt.

## 11. Health-Zustände

Für `running=false && enabled=true` gelten:

### `start-pending`

```text
lastStartRequestAt > max(lastStartAt, lastStopAt)
UND Request-Alter <= 15 Sekunden
```

### `start-interrupted`

```text
lastStartRequestAt > max(lastStartAt, lastStopAt)
UND Request-Alter > 15 Sekunden
```

### `unclean-process-stop`

```text
lastStartAt > 0
lastStartAt > lastStopAt
lastStartRequestAt <= lastStartAt
running=false
enabled=true
```

Nur dieser Zustand bedeutet: Der Dienst hatte seinen Start bestätigt und ist später ohne terminalen Stopp verschwunden.

## 12. Source-Gates

Pflichtchecks:

```text
npm run check:start-handshake
npm run check:process-loss
npm run check:protection-recovery
npm run check:lifecycle
npm run check:checker-drift
```

Sie erzwingen unter anderem:

- 15-Sekunden-Grace-Window und 5-Sekunden-Future-Skew;
- logisch monotone Lifecycle-Zeitmarken;
- atomaren generationgebundenen Request-Commit;
- Pending-Doppelstartunterdrückung;
- `CONFIRMED` / `SUPERSEDED_BY_STOP` / `FAILED_CLOSED`;
- Stop-Winner gegen verspätete Confirmation;
- Same-Instance-Restart-Ownership;
- generationgebundenen Notification-Stop;
- bounded controlled-stop Destroy-Suppression;
- `syncCommitted()` → `startCommitted()` ohne zweiten Config-Sync;
- Lifecycle-Snapshot-Forwarding für `stale-activation` und `unclean-process-stop`;
- native Snapshot-Prüfung **vor** jeder startkritischen Evidence;
- Snapshot-Mismatch als No-op;
- Pure-Java-JUnit `autoRecoverySnapshotMatchesOnlyUnchangedLifecycleTruth`;
- React-/Vitest-Verträge für die vorbereitete Startgeneration.

## 13. Android-/Device-Testverträge

Vorhandene Persistenz-/Instrumentation-Verträge umfassen:

```text
startRequestAndConfirmedStartPersistAsDistinctLifecycleEvidence
terminalStopWinsAgainstDelayedStartConfirmationWithoutOverwrite
restartRequestAdvancesBeyondLatestStopBoundary
```

Reale Device-/System-Evidence muss `LIFE-12` bis `LIFE-16` sowie `DISPATCH-01` bis `DISPATCH-05` abdecken.

`LIFE-16` muss beide automatischen Recovery-Arten testen:

```text
stale-activation auto restart
unclean-process-stop recovery
```

und jeweils einen manuellen/Notification-Stop zwischen Recovery-Snapshot/Config-Sync und Native-Startdispatch einschieben. Der Stop muss final bleiben und darf weder von einem neuen Startrequest noch `start_failed` überschrieben werden.

## 14. Diagnose-Evidence

Der native JSON-Snapshot und der Debug-Screen müssen sichtbar machen:

```text
lastProtectionStartRequestAt
lastProtectionStartAt
lastProtectionStopAt
lastProtectionStopCode
lastProtectionStopMessage
```

Für LIFE-16 werden Snapshot-vor-Recovery, Stop-Evidence und Post-No-op-Snapshot miteinander verglichen.

## 15. Evidence-Regel

Source-Code, Source-Checker, JUnit-/Vitest-/Instrumentation-Quellcode sind **keine reale Android-Evidence**. G6/G7 dürfen erst hochgestuft werden, wenn die Checks und beschriebenen Race-/Lifecycle-Szenarien auf dem exakten Kandidaten tatsächlich ausgeführt und dokumentiert wurden.
