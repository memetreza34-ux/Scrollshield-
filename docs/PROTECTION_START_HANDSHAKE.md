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

Damit gilt auch bei:

- gleicher Millisekunde;
- sehr schnellem Stop → Restart;
- rückwärts verstellter Geräteuhr;

weiterhin eine eindeutige Reihenfolge.

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

`ScrollShieldBootReceiver` muss nach erfolgreichen Recovery-Prerequisites ebenfalls zuerst:

```text
recordProtectionStartRequested(context)
```

ausführen und darf erst danach `startForegroundService(...)` / `startService(...)` aufrufen.

Fehlt die persistierbare Startanforderung:

```text
recovery_start_failed
→ atomarer System-Stop
→ kein Recovery-Service-Start
```

Damit erhalten `BOOT_COMPLETED` und `MY_PACKAGE_REPLACED` dieselbe Request-vs.-Confirmation-Grenze wie ein normaler App-Start.

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

`recordProtectionServiceStarted(...)` liefert genau einen dieser Zustände:

```text
CONFIRMED
SUPERSEDED_BY_STOP
FAILED_CLOSED
```

Nur `CONFIRMED` darf zu `RUNNING=true` führen.

Kann die bestätigte Start-Evidence nicht dauerhaft gespeichert werden, endet der Start fail-closed mit `START_FAILED`.

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

Dann darf der verspätete Start ausdrücklich **nicht**:

- `lastStartAt` fortschreiben;
- `enabled=true` wiederherstellen;
- den Stop-Code überschreiben;
- die Stop-Nachricht überschreiben;
- die Event-Queue verändern;
- stattdessen künstlich `start_failed` erzeugen.

Der bereits persistierte terminale Stopp bleibt die aktuelle Wahrheit.

## 7. Schneller Stop → Restart

Ein echter neuer Start nach einem Stopp erhält eine neue Generation:

```text
R1 < S1 < R2 < C2
```

mit:

- `R1` = alte Startanforderung;
- `S1` = terminaler Stopp;
- `R2` = neuer Restart-Request;
- `C2` = bestätigter neuer Start.

`R2` muss strikt größer als `S1` sein, selbst wenn beide im selben Millisekunden-Zeitfenster entstehen.

Wenn die alte Service-Instanz noch existiert, kann der neue Start über `onStartCommand()` bei derselben Instanz ankommen. Der Service bestätigt dann die neue unbestätigte Generation über `recordProtectionServiceStarted(...)`, bevor er `START_STICKY` zurückgibt.

## 8. Altes `onDestroy()` darf neuen Restart nicht überschreiben

Jede Service-Instanz merkt sich beim `onCreate()`:

```text
serviceStartRequestAtOnCreate
```

Beim `onDestroy()` wird `unexpected_service_destroy` nur geschrieben, wenn die Instanz noch zur **aktuellen bestätigten Aktivierung** gehört.

Kein `unexpected_service_destroy` wird geschrieben, wenn:

- Schutz bereits deaktiviert ist;
- ein expliziter Stop angefordert wurde;
- seit der Request-Generation dieser Instanz bereits ein terminaler Stop persistiert wurde;
- aktuell eine neuere unbestätigte Startgeneration existiert.

Dadurch kann folgende Reihenfolge nicht mehr die neue Aktivierung zerstören:

```text
alte Instanz R1 aktiv
→ Stop S1
→ sofort neuer Start R2
→ R2/C2 wird neue Wahrheit
→ altes onDestroy() von R1 kommt verspätet
→ kein unexpected_service_destroy
```

## 9. Health-Zustände

Für `running=false && enabled=true` gelten:

### `start-pending`

```text
lastStartRequestAt > max(lastStartAt, lastStopAt)
UND
Request-Alter <= 15 Sekunden
```

UI:

```text
STARTET
Android bestätigt den Schutzstart
Start wird bestätigt…
```

### `start-interrupted`

```text
lastStartRequestAt > max(lastStartAt, lastStopAt)
UND
Request-Alter > 15 Sekunden
```

UI:

```text
START ABGEBROCHEN
Schutzstart wurde nicht bestätigt
Schutz erneut starten
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

UI:

```text
PROZESS ABGEBROCHEN
Schutz wiederherstellen
```

## 10. Source-Gates

Pflichtcheck:

```text
npm run check:start-handshake
```

Er erzwingt unter anderem:

- `ProtectionStartHandshakePolicy` + Pure-Java-JUnit;
- 15-Sekunden-Grace-Window;
- logisch monotone Lifecycle-Zeitmarken;
- atomaren Request-Commit;
- Pending-Doppelstartunterdrückung;
- Request vor Plugin-/Boot-/Update-Service-Start;
- `CONFIRMED` / `SUPERSEDED_BY_STOP` / `FAILED_CLOSED`;
- Stop-Winner gegen verspätete Confirmation;
- `RUNNING=true` nur nach aktuellem bestätigtem Start;
- Bestätigung einer neuen Generation in `onStartCommand()`;
- alte-Service-`onDestroy()`-Isolation bei Fast-Restart;
- UI-/Vitest-Verträge;
- Android-Instrumentation;
- Diagnoseexport von `lastProtectionStartRequestAt`.

Zusätzlich erzwingt `npm run check:lifecycle` dieselben Generation-Grenzen im breiteren Lifecycle-/Diagnosevertrag.

Beide sind Bestandteil von `npm run verify`; `check:start-handshake` und `check:lifecycle` laufen außerdem im Readiness-Report.

## 11. Android-Testverträge

`ProtectionStartHandshakePolicyTest` deckt source-seitig ab:

- strikt steigende Lifecycle-Grenzen;
- frisches Pending-Window;
- Stop-Winner gegen verspätete Confirmation;
- Trennung unbestätigter von bestätigter/gestoppter Generation.

`ProtectionDiagnosticsInstrumentedTest` enthält insbesondere:

```text
startRequestAndConfirmedStartPersistAsDistinctLifecycleEvidence
terminalStopWinsAgainstDelayedStartConfirmationWithoutOverwrite
restartRequestAdvancesBeyondLatestStopBoundary
```

Der Vertrag verlangt damit:

1. Request-Evidence existiert vor Confirmed-Evidence;
2. bestätigter Start ist strikt neuer als sein Request;
3. ein terminaler Stop ist strikt neuer als der vorherige Request;
4. eine verspätete Confirmation liefert `SUPERSEDED_BY_STOP` und verändert die Stop-Evidence nicht;
5. ein echter Restart erzeugt wiederum eine strikt neuere Request-Generation und kann bestätigt werden.

Diese Tests sind vorbereitet, aber erst ihre reale Ausführung ist Evidence.

## 12. Pflicht-E2E nach CI-Entsperrung

Zusätzlich zu normalem Start, Boot/Update und Post-Start-Process-Kill müssen folgende Race-Fälle real ausgeführt werden:

### A. Pre-Confirmation-Abbruch

`lastStartRequestAt` persistieren, Prozess vor `lastStartAt` beenden, `start-pending` → `start-interrupted` beobachten und anschließend normal neu starten.

### B. Terminaler Stop vor verspäteter Confirmation

Start zwischen Request und Confirmation anhalten, terminal stoppen, verspätete Confirmation freigeben. Stop-Code/-Nachricht/Event müssen unverändert bleiben und `lastStartAt` darf für diese Generation nicht fortgeschrieben werden.

### C. Pending-Doppelstart

Während `start-pending` erneut Start auslösen. `lastStartRequestAt` darf nicht erneuert werden und es darf keine doppelte logische Service-Aktivierung entstehen.

### D. Sofortiger Stop → Restart vor altem `onDestroy()`

Nach bestätigtem Start kontrolliert stoppen und sofort wieder starten, bevor die alte Instanz vollständig abgebaut ist. Neuer Request/Start müssen gewinnen; verspätetes altes `onDestroy()` darf kein `unexpected_service_destroy` erzeugen.

### E. Post-Start-Process-Kill

Nach bestätigtem `lastStartAt` Prozess hart beenden, ohne `onDestroy()` vorauszusetzen. Danach muss `unclean-process-stop` → `Schutz wiederherstellen` → `active` funktionieren.

Die Device-Matrix führt diese Fälle als `LIFE-12` bis `LIFE-14` sowie die bestehenden Process-Loss-Szenarien.

## 13. Diagnose-Evidence

Der native JSON-Snapshot und der Debug-Screen müssen gemeinsam sichtbar machen:

```text
lastProtectionStartRequestAt
lastProtectionStartAt
lastProtectionStopAt
lastProtectionStopCode
lastProtectionStopMessage
```

Die Reihenfolge dieser drei Zeitgrenzen ist Teil des Prüfergebnisses.

## 14. Evidence-Regel

Source-Code, Source-Checker, JUnit-/Vitest-/Instrumentation-Quellcode sind **keine reale Android-Evidence**. G6/G7 dürfen erst hochgestuft werden, wenn die Checks und die beschriebenen Race-/Lifecycle-Szenarien auf dem exakten Kandidaten-Head tatsächlich ausgeführt und dokumentiert wurden.
