# Android Protection Start Handshake

Status: **verbindlicher Source-/Evidence-Vertrag**

Diese Spezifikation trennt eine angeforderte Android-Schutzaktivierung von einem tatsächlich bestätigten Foreground-Service-Start. Sie verhindert, dass ein Prozessabbruch zwischen `enabled=true` und `startForeground(...)` fälschlich als bestätigter Dienststart oder als späterer Process-Kill interpretiert wird.

## 1. Persistente Zeitmarken

ScrollShield verwendet drei getrennte Lifecycle-Zeitmarken:

- `protection_last_start_request_at` — eine Startanforderung wurde dauerhaft gespeichert;
- `protection_last_start_at` — der Foreground-Service wurde tatsächlich erstellt und der bestätigte Start konnte dauerhaft gespeichert werden;
- `protection_last_stop_at` — ein terminaler Stopp wurde dauerhaft gespeichert.

`lastStartRequestAt` und `lastStartAt` dürfen nicht dieselbe Bedeutung erhalten.

## 2. Atomare Startanforderung

Vor `startForegroundService(...)` bzw. `startService(...)` muss `recordProtectionStartRequested(...)` in **einem synchronen Commit** speichern:

```text
enabled = true
lastStartRequestAt = now
```

Schlägt dieser Commit im normalen App-/Recovery-Start fehl:

```text
START_FAILED
→ atomarer System-Stop
→ enabled=false
→ warning/system
→ Start wird nicht angefordert
```

Ein losgelöstes `setProtectionEnabled(context, true)` im produktiven Plugin-Startpfad ist nicht erlaubt.

## 3. Boot-/App-Update-Recovery nutzt denselben Handshake

`ScrollShieldBootReceiver` darf nach erfolgreichen Recovery-Prerequisites nicht direkt den Service anfordern.

Vor:

```text
startForegroundService(serviceIntent)
```

muss ebenfalls gelten:

```text
recordProtectionStartRequested(context)
```

Schlägt diese Persistenz fehl, endet die Recovery fail-closed mit:

```text
recovery_start_failed
```

und der Service wird nicht angefordert.

Damit erhält auch ein Recovery-Start nach `BOOT_COMPLETED` oder `MY_PACKAGE_REPLACED` eine neue `lastStartRequestAt`-Grenze. Ein Prozessabbruch zwischen Boot-/Update-Recovery-Anforderung und bestätigtem `lastStartAt` kann dadurch als `start-pending` bzw. `start-interrupted` erkannt werden, statt nur ältere Process-Loss-Evidence weiterzuverwenden.

## 4. Bestätigter Foreground-Start

Im Service gilt die Reihenfolge:

```text
startForeground(...)
↓
recordProtectionServiceStarted(...)
↓
RUNNING=true
```

`lastStartAt` darf erst nach erfolgreichem `startForeground(...)` geschrieben werden.

Kann `lastStartAt` danach nicht dauerhaft gespeichert werden, muss `recordProtectionServiceStarted(...)`:

1. mit `START_FAILED` fail-closed persistieren;
2. `enabled=false` sicherstellen;
3. ein `warning/system`-Event hinterlassen, sofern der atomare Primärcommit gelingt;
4. eine Exception auslösen, bevor `RUNNING=true` erreicht wird.

Damit existiert keine positive Laufzeit-Evidence ohne dauerhaft bestätigten Start.

## 5. Health-Zustände

Für `running=false && enabled=true` gelten folgende Grenzen.

### `start-pending`

```text
lastStartRequestAt > max(lastStartAt, lastStopAt)
UND
Alter der Startanforderung <= 15 Sekunden
```

Bedeutung: Android hat eine neue Startanforderung, der Foreground-Service hat sie aber noch nicht bestätigt. Diese kurze Phase ist noch kein Fehler.

UI:

```text
STARTET
Android bestätigt den Schutzstart
Start wird bestätigt…
```

Währenddessen wird ein doppelter Start über die Statuskarte blockiert.

### `start-interrupted`

```text
lastStartRequestAt > max(lastStartAt, lastStopAt)
UND
Alter der Startanforderung > 15 Sekunden
UND
running=false
```

Bedeutung: Die neueste Startanforderung wurde nie durch einen bestätigten Foreground-Service-Start abgeschlossen. Ein Prozess kann zwischen Startanforderung und Bestätigung beendet worden sein.

UI:

```text
START ABGEBROCHEN
Schutzstart wurde nicht bestätigt
Schutz erneut starten
```

Dieser Zustand verwendet **nicht** die Process-Kill-Recovery-Semantik.

### `unclean-process-stop`

```text
lastStartAt > 0
lastStartAt > lastStopAt
lastStartRequestAt <= lastStartAt
running=false
enabled=true
```

Bedeutung: Der Dienst hatte seinen Start bereits bestätigt und ist später ohne terminalen Stopp verschwunden. Erst dieser Zustand darf als bestätigter Prozessabbruch/System-Kill behandelt werden.

UI:

```text
PROZESS ABGEBROCHEN
Schutz wiederherstellen
```

## 6. Idempotenz

Wenn der Schutz bereits `running=true && enabled=true` ist, ist ein erneuter Native-Startaufruf idempotent und fordert keinen zweiten Service-Start an.

Die UI blockiert außerdem einen erneuten Start während `start-pending`.

## 7. Source-Gate

Pflichtcheck:

```text
npm run check:start-handshake
```

Der Checker erzwingt unter anderem:

- dedizierten `LAST_START_REQUEST_AT_KEY`;
- atomaren Request-Commit;
- Request vor `startForegroundService(...)` im Plugin;
- denselben Request-Handshake vor Boot-/App-Update-Recovery-Start;
- `recovery_start_failed`, falls die Recovery-Startanforderung nicht persistiert werden kann;
- kein separates `enabled=true` im Plugin-Startpfad;
- bestätigten Start erst nach `startForeground(...)`;
- `RUNNING=true` erst nach dauerhaft gespeichertem `lastStartAt`;
- Fail-closed bei Confirmation-Commit-Fehler;
- getrennte `start-pending`, `start-interrupted` und `unclean-process-stop`-Klassifizierung;
- UI- und Vitest-Verträge;
- Android-Instrumentation für Request-vs.-Confirmed-Start;
- `lastProtectionStartRequestAt` im exportierbaren Diagnose-Snapshot.

Der Check ist Pflichtbestandteil von `npm run verify` und `npm run readiness`.

## 8. Android-Instrumentation

`ProtectionDiagnosticsInstrumentedTest.startRequestAndConfirmedStartPersistAsDistinctLifecycleEvidence()` muss beweisen:

1. Ausgangszustand besitzt keine Request-/Start-Evidence;
2. `recordProtectionStartRequested(...)` setzt `enabled=true` und `lastStartRequestAt`;
3. danach bleibt `lastStartAt == 0`;
4. erst `recordProtectionServiceStarted(...)` erzeugt bestätigte Start-Evidence;
5. `lastStartAt >= lastStartRequestAt`.

Dieser Test ist vorbereitet, aber erst nach realer Ausführung Evidence.

## 9. Pflicht-E2E nach CI-Entsperrung

Auf Emulator/physischem Gerät müssen mindestens diese Crash-Grenzen separat getestet werden:

### A. Abbruch vor Startbestätigung aus der App

1. gültige Prerequisites + Ziel-App vorbereiten;
2. Startanforderung auslösen;
3. Prozess gezielt nach persistiertem `lastStartRequestAt`, aber **vor** bestätigtem `lastStartAt` beenden;
4. innerhalb der Grace-Phase `start-pending` beobachten;
5. nach Ablauf der Grace-Phase `start-interrupted` bestätigen;
6. prüfen, dass **nicht** `unclean-process-stop` angezeigt wird;
7. `Schutz erneut starten` ausführen und vollständige Aktivierung bestätigen.

### B. Abbruch vor Startbestätigung bei Boot/App-Update-Recovery

1. Schutz vorher aktiviert hinterlassen;
2. Boot oder `MY_PACKAGE_REPLACED` auslösen;
3. Recovery bis zur neuen `lastStartRequestAt`-Evidence gelangen lassen;
4. Prozess vor neuer bestätigter `lastStartAt`-Evidence beenden;
5. `start-pending` → nach Grace `start-interrupted` bestätigen;
6. sicherstellen, dass ein alter bestätigter Start nicht fälschlich als neuer `unclean-process-stop` verwendet wird.

### C. Abbruch nach bestätigtem Start

1. Dienst vollständig bis `lastStartAt` + `RUNNING=true` starten;
2. Prozess danach hart beenden, ohne einen `onDestroy()`-Callback vorauszusetzen;
3. `unclean-process-stop` bestätigen;
4. `Schutz wiederherstellen` ausführen;
5. erneut `active` bestätigen.

Damit bleiben App-/Recovery-Pre-Confirmation-Abbruch und echter Post-Start-Process-Kill beweisbar getrennt.

## 10. Evidence-Regel

Source-Code, Vitest-Verträge und Instrumentation-Quellcode sind **keine reale Android-Evidence**. G6/G7 dürfen erst hochgestuft werden, wenn die Checks und die beschriebenen Android-Szenarien auf dem exakten Kandidaten-Head tatsächlich ausgeführt und dokumentiert wurden.
