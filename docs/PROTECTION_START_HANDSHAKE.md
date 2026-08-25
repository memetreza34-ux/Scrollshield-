# Android Protection Start Handshake

Status: **verbindlicher Source-/Evidence-Vertrag**

Diese Spezifikation trennt eine angeforderte Android-Schutzaktivierung von einem tatsächlich bestätigten Foreground-Service-Start und definiert zusätzlich die Gewinnerregel für konkurrierende Start-/Stop-Lifecycle-Ereignisse.

## 1. Persistente Lifecycle-Grenzen

ScrollShield verwendet drei getrennte Zeitmarken:

- `protection_last_start_request_at` — eine Startanforderung wurde dauerhaft gespeichert;
- `protection_last_start_at` — der Foreground-Service wurde bestätigt;
- `protection_last_stop_at` — ein terminaler Stopp wurde dauerhaft gespeichert.

Diese Werte sind nicht nur Uhrzeiten, sondern **logische Lifecycle-Grenzen**.

`ProtectionStartHandshakePolicy.nextLifecycleTimestamp(...)` erzeugt jeden neuen Request-/Start-/Stop-Zeitpunkt mindestens eins größer als die höchste bereits gespeicherte Lifecycle-Grenze, sofern `Long.MAX_VALUE` nicht erreicht ist.

Damit gilt auch bei gleicher Millisekunde, sehr schnellem Stop → Restart und rückwärts verstellter Geräteuhr weiterhin eine eindeutige Reihenfolge.

## 2. Atomare Startanforderung

Vor `startForegroundService(...)` bzw. `startService(...)` muss `recordProtectionStartRequested(...)` in einem synchronen Commit speichern:

```text
enabled = true
lastStartRequestAt = nextLifecycleTimestamp(...)
```

Schlägt dieser Commit fehl:

```text
START_FAILED
→ atomarer System-Stop
→ enabled=false
→ warning/system
→ kein Service-Start
```

Ein separates produktives `setProtectionEnabled(context, true)` ist nicht erlaubt.

## 3. Doppelstart während Pending wird unterdrückt

Der Native-Start prüft zusätzlich:

```text
running && enabled
→ idempotent resolve
```

und:

```text
frische unbestätigte Startanforderung <= 15 Sekunden
→ idempotent resolve
```

Damit darf ein zweiter UI-/Bridge-Aufruf während `start-pending` den vorhandenen `lastStartRequestAt` nicht nach hinten verschieben und keine zusätzliche logische Startgeneration erzeugen.

## 4. Boot-/App-Update-Recovery nutzt denselben Handshake

`ScrollShieldBootReceiver` muss nach erfolgreichen Recovery-Prerequisites ebenfalls zuerst `recordProtectionStartRequested(context)` ausführen und darf erst danach `startForegroundService(...)` / `startService(...)` aufrufen.

Fehlt die persistierbare Startanforderung:

```text
recovery_start_failed
→ atomarer System-Stop
→ kein Recovery-Service-Start
```

## 5. Bestätigter Foreground-Start

Für eine neue Service-Instanz gilt:

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

Nur `CONFIRMED` darf zu `RUNNING=true` führen. Kann die bestätigte Start-Evidence nicht dauerhaft gespeichert werden, endet der Start fail-closed mit `START_FAILED`.

## 6. Stop gewinnt gegen verspätete Startbestätigung

Alle relevanten Native-Lifecycle-Writes werden unter `EVENT_LOCK` serialisiert.

Wenn nach einer Startanforderung zuerst ein terminaler Stop persistiert wird:

```text
R1 = lastStartRequestAt
S1 = lastStopAt > R1
```

und erst danach die verspätete Service-Bestätigung eintrifft, gilt:

```text
recordProtectionServiceStarted(...)
→ SUPERSEDED_BY_STOP
```

Dann darf der verspätete Start nicht `lastStartAt` fortschreiben, `enabled=true` wiederherstellen, Stop-Code/-Nachricht überschreiben oder die Event-Queue verändern.

## 7. Schneller Stop → Restart

Ein echter neuer Start nach einem Stopp erhält eine neue Generation:

```text
R1 < S1 < R2 < C2
```

Wenn die alte Service-Instanz noch existiert, kann der neue Start über `onStartCommand()` bei derselben Instanz ankommen. Der Service bestätigt die neue unbestätigte Generation und übernimmt danach:

```text
serviceStartRequestAtOnCreate = R2
```

## 8. Notification-Stop folgt derselben Generation

Die Foreground-Notification gehört zur aktuell bestätigten Request-Generation. Ihr Stop-`PendingIntent` trägt deshalb:

```text
EXTRA_STOP_START_REQUEST_AT = serviceStartRequestAtOnCreate
```

Ein `ACTION_STOP` ist nur gültig, wenn seine Generation gleichzeitig der Service-Ownership und dem aktuellsten `lastStartRequestAt` entspricht.

Nach einem Same-Instance-Restart auf `R2` wird die Notification neu veröffentlicht, nachdem die Instanz `R2` übernommen hat. Ein bereits verspätet zugestellter alter `R1`-Stop darf die bestätigte `R2`-Aktivierung nicht stoppen oder neue Stop-Evidence erzeugen.

Die vollständigen Dispatch-/PendingIntent-Race-Regeln stehen in `docs/PROTECTION_SERVICE_DISPATCH_RACES.md`.

## 9. Altes `onDestroy()` darf neuen Restart nicht überschreiben

Jede Service-Instanz merkt sich ihre aktuelle Ownership-Generation.

Kein `unexpected_service_destroy` wird für einen residualen alten kontrollierten Stop geschrieben, der eine neuere Generation überschreiben würde. Ein altes `explicitStopRequested=true` darf einen späteren echten Destroy dagegen nicht dauerhaft maskieren, sobald dieselbe Instanz eine neuere Generation bestätigt und übernommen hat.

## 10. Health-Zustände

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

## 11. Source-Gates

Pflichtchecks:

```text
npm run check:start-handshake
npm run check:lifecycle
```

Sie erzwingen unter anderem:

- `ProtectionStartHandshakePolicy` + Pure-Java-JUnit;
- 15-Sekunden-Grace-Window und 5-Sekunden-Future-Skew;
- logisch monotone Lifecycle-Zeitmarken;
- atomaren Request-Commit;
- Pending-Doppelstartunterdrückung;
- Request vor Plugin-/Boot-/Update-Service-Start;
- `CONFIRMED` / `SUPERSEDED_BY_STOP` / `FAILED_CLOSED`;
- Stop-Winner gegen verspätete Confirmation;
- `RUNNING=true` nur nach aktuellem bestätigtem Start;
- Same-Instance-Restart-Ownership;
- generationgebundenen Notification-Stop und Notification-Refresh;
- bounded controlled-stop Destroy-Suppression;
- UI-/Vitest-/Diagnose-/Instrumentation-Verträge.

## 12. Android-/Device-Testverträge

Vorhandene Persistenz-/Instrumentation-Verträge umfassen:

```text
startRequestAndConfirmedStartPersistAsDistinctLifecycleEvidence
terminalStopWinsAgainstDelayedStartConfirmationWithoutOverwrite
restartRequestAdvancesBeyondLatestStopBoundary
```

Reale Device-/System-Evidence muss zusätzlich LIFE-12 bis LIFE-15 sowie DISPATCH-01 bis DISPATCH-05 abdecken. Insbesondere ist die verspätete/queued alte Notification-Aktion ein echter Android-PendingIntent-E2E-Fall und darf nicht durch einen reinen Persistenztest ersetzt werden.

## 13. Diagnose-Evidence

Der native JSON-Snapshot und der Debug-Screen müssen sichtbar machen:

```text
lastProtectionStartRequestAt
lastProtectionStartAt
lastProtectionStopAt
lastProtectionStopCode
lastProtectionStopMessage
```

Die Reihenfolge der Lifecycle-Grenzen ist Teil des Prüfergebnisses.

## 14. Evidence-Regel

Source-Code, Source-Checker, JUnit-/Vitest-/Instrumentation-Quellcode sind **keine reale Android-Evidence**. G6/G7 dürfen erst hochgestuft werden, wenn die Checks und beschriebenen Race-/Lifecycle-Szenarien auf dem exakten Kandidaten tatsächlich ausgeführt und dokumentiert wurden.
