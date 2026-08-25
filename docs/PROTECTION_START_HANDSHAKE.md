# Android Protection Start Handshake

Status: **verbindlicher Source-/Evidence-Vertrag**

Diese Spezifikation trennt Startanforderung, bestätigten Foreground-Service-Start und terminalen Stopp. Die tatsächliche Android-Dispatch-Schicht ist zusätzlich in `docs/PROTECTION_SERVICE_DISPATCH_RACES.md` definiert.

## 1. Persistente Lifecycle-Grenzen

ScrollShield verwendet drei getrennte persistente Grenzen:

- `protection_last_start_request_at` — Start wurde dauerhaft angefordert;
- `protection_last_start_at` — Foreground-Service-Start wurde dauerhaft bestätigt;
- `protection_last_stop_at` — terminaler Stopp wurde dauerhaft gespeichert.

`ProtectionStartHandshakePolicy.nextLifecycleTimestamp(...)` erzeugt eine neue Lifecycle-Grenze strikt hinter der höchsten bekannten Request-/Start-/Stop-Grenze, sofern `Long.MAX_VALUE` nicht erreicht ist.

Damit bleibt die logische Reihenfolge auch bei gleicher Millisekunde, schnellem Stop→Restart und rückwärts verstellter Geräteuhr eindeutig.

## 2. Atomare Startanforderung

Vor `startForegroundService(...)` bzw. `startService(...)` persistiert:

```text
recordProtectionStartRequested(...)
→ enabled=true
→ lastStartRequestAt=nextLifecycleTimestamp(...)
→ ein synchroner Commit
```

Schlägt der Commit fehl:

```text
START_FAILED
→ atomarer System-Stop
→ enabled=false
→ warning/system
→ kein erfolgreicher Start
```

Ein separates produktives `setProtectionEnabled(context, true)` ist nicht erlaubt.

## 3. Persistenz und Android-Dispatch sind serialisiert

`enabled=true + lastStartRequestAt` allein genügt nicht. Zwischen dieser Persistenz und `startForegroundService(...)` darf kein konkurrierender terminaler Stop einspringen.

Darum gilt für App-Start und Boot-/Update-Recovery:

```text
ProtectionServiceDispatchGuard.LOCK
↓
aktuellen Zustand prüfen
↓
recordProtectionStartRequested(...)
↓
startForegroundService(...) / startService(...)
↓
LOCK freigeben
```

Kontrollierte Stopps verwenden dieselbe Sperre für:

```text
Stop-Evidence persistieren
↓
dispatchControlledStop(...)
↓
Context.stopService(...)
```

So stimmen persistente Reihenfolge und tatsächlicher Android-Service-Dispatch überein.

Detaillierter Vertrag: `docs/PROTECTION_SERVICE_DISPATCH_RACES.md`.

## 4. Pending-Doppelstart wird unterdrückt

Native prüft:

```text
running && enabled
→ idempotent resolve
```

und:

```text
frischer unbestätigter Request <= 15 Sekunden
→ idempotent resolve
```

Ein zweiter Start darf den bestehenden `lastStartRequestAt` nicht erneuern und keine zweite logische Generation erzeugen.

## 5. Boot-/App-Update-Recovery

`ScrollShieldBootReceiver` verwendet denselben Dispatch-Lock und denselben Request-Handshake.

Nach gültigen Prerequisites:

```text
DispatchGuard.LOCK
→ active/pending prüfen
→ recordProtectionStartRequested(...)
→ startForegroundService/startService
```

Fehlende persistierbare Request-Evidence oder eine Android-Start-Exception endet mit `recovery_start_failed` und fail-closed System-Evidence.

## 6. Bestätigter Foreground-Start

Für eine neue Instanz gilt unter der Dispatch-Sperre:

```text
serviceStartRequestAtOnCreate = lastStartRequestAt
↓
startForeground(...)
↓
recordProtectionServiceStarted(...)
↓
CONFIRMED
↓
RUNNING=true
```

`recordProtectionServiceStarted(...)` liefert:

```text
CONFIRMED
SUPERSEDED_BY_STOP
FAILED_CLOSED
```

Nur `CONFIRMED` darf `RUNNING=true` erreichen.

Kann die Confirmed-Evidence nicht dauerhaft gespeichert werden, endet die Aktivierung fail-closed mit `START_FAILED`.

## 7. Stop gewinnt gegen verspätete Confirmation

Lifecycle-Persistenz ist unter `EVENT_LOCK` serialisiert.

Wenn:

```text
R1 = lastStartRequestAt
S1 = lastStopAt > R1
```

und erst danach eine verspätete Bestätigung eintrifft:

```text
recordProtectionServiceStarted(...)
→ SUPERSEDED_BY_STOP
```

Dann darf die verspätete Bestätigung nicht:

- `lastStartAt` fortschreiben;
- `enabled=true` wiederherstellen;
- Stop-Code oder Stop-Nachricht überschreiben;
- die Event-Queue verändern;
- künstlich `start_failed` erzeugen.

## 8. Schneller Stop → Restart

Ein echter Restart nach einem Stopp erhält:

```text
R1 < S1 < R2 < C2
```

- `R1`: alter Request;
- `S1`: terminaler Stop;
- `R2`: neuer Restart-Request;
- `C2`: neue Confirmation.

Die Dispatch-Sperre verhindert zusätzlich, dass ein verspäteter `stopService()` aus `S1` erst **nach** dem bereits gespeicherten/dispatchten `R2` ausgeführt wird.

## 9. Restart auf derselben Service-Instanz

Wenn Android die neue Startanforderung über `onStartCommand()` an eine noch existierende Instanz liefert, muss die Instanz:

1. die unbestätigte neue Generation erkennen;
2. `recordProtectionServiceStarted(...)` ausführen;
3. nur bei `CONFIRMED` sticky bleiben;
4. `serviceStartRequestAtOnCreate` auf den aktuellen neuen `lastStartRequestAt` übertragen.

Damit gehört die bestehende Instanz anschließend semantisch zur neuen Generation.

Ein altes `explicitStopRequested=true` aus der vorherigen kontrollierten Stop-Anforderung darf einen späteren echten Destroy **nicht dauerhaft maskieren**, sobald diese neuere Generation bestätigt wurde.

## 10. Kontrollierter residualer onDestroy

Ein erfolgreicher `Context.stopService(...)` kann einen `onDestroy()` auslösen, obwohl sehr schnell bereits eine neue Generation angefordert wurde.

`ProtectionServiceDispatchGuard` hält dafür process-lokal einen one-shot Token.

Er gilt höchstens:

```text
30 Sekunden nach erfolgreichem stopService()-Dispatch
```

und wird mit `System.nanoTime()` ausgewertet.

Nur:

```text
0 <= age <= 30 s
```

kann den residualen Destroy als kontrolliert klassifizieren. Der Token wird beim ersten Konsum gelöscht. Ein abgelaufener, rückwärts laufender oder nie erfolgreich gesetzter Token darf einen späteren echten Destroy nicht unterdrücken.

## 11. RUNNING-Grenze beim onDestroy

Unter `ProtectionServiceDispatchGuard.LOCK` muss `onDestroy()` zuerst:

```text
RUNNING=false
```

setzen.

Erst danach kann ein paralleler Restart ausgewertet werden. Dadurch darf ein sterbender Dienst nicht fälschlich als bereits aktiver `running && enabled`-Dienst einen echten Restart wegoptimieren.

## 12. Unexpected-Destroy-Generation

`unexpected_service_destroy` wird nur für die aktuelle relevante Aktivierung persistiert.

Kein Unexpected-Destroy wird geschrieben, wenn:

- Schutz bereits deaktiviert ist;
- die alte Instanz von einer neueren Request-Generation überholt wurde;
- nach ihrer ursprünglichen Request-Grenze bereits ein terminaler Stopp existiert;
- aktuell nur ein unbestätigter neuer Start vorliegt.

Ein altes Explicit-Stop-Flag bleibt ebenfalls nur solange ein Ausschlussgrund, wie keine neuere bestätigte Generation dieselbe Instanz übernommen hat.

## 13. Health-Zustände

### `start-pending`

```text
running=false
enabled=true
lastStartRequestAt > max(lastStartAt,lastStopAt)
Request-Alter <= 15 s
```

UI: `STARTET` / `Start wird bestätigt…`.

### `start-interrupted`

```text
running=false
enabled=true
lastStartRequestAt > max(lastStartAt,lastStopAt)
Request-Alter > 15 s
```

UI: `START ABGEBROCHEN` / `Schutz erneut starten`.

### Clock-Rollback

Bis 5 Sekunden Future-Skew werden toleriert. Liegt `lastStartRequestAt` mehr als 5 Sekunden in der Zukunft, darf Pending nicht dauerhaft bestehen bleiben:

```text
→ start-interrupted
```

### `unclean-process-stop`

```text
running=false
enabled=true
lastStartAt > 0
lastStartAt > lastStopAt
lastStartRequestAt <= lastStartAt
```

UI: `PROZESS ABGEBROCHEN` / `Schutz wiederherstellen`.

## 14. Source-Gates

Pflichtchecks:

```text
npm run check:start-handshake
npm run check:lifecycle
```

Sie erzwingen gemeinsam unter anderem:

- 15-s-Grace und 5-s-Clock-Skew;
- logisch monotone Lifecycle-Grenzen;
- atomaren Request-Commit;
- App-/Boot-Dispatch unter `ProtectionServiceDispatchGuard.LOCK`;
- Pending-Doppelstartunterdrückung;
- `CONFIRMED` / `SUPERSEDED_BY_STOP` / `FAILED_CLOSED`;
- Stop-Winner gegen verspätete Confirmation;
- kein produktives `stopSelf()` für kontrollierte Schutz-Stopps;
- kontrollierten `Context.stopService(...)` über den gemeinsamen Guard;
- bounded one-shot Destroy-Token;
- `RUNNING=false` am Anfang der serialisierten Destroy-Grenze;
- Same-Instance-Restart-Ownership;
- UI-/Vitest-/Instrumentation-Verträge;
- Diagnoseexport von `lastProtectionStartRequestAt`.

## 15. Android-Testverträge

`ProtectionStartHandshakePolicyTest` schützt:

- strikt steigende Lifecycle-Grenzen;
- 15-s-Pending-Fenster;
- begrenzten Clock-Rollback;
- Stop-Winner;
- Trennung unbestätigter Generationen.

`ProtectionServiceDispatchGuardTest` schützt:

- prompten one-shot controlled Destroy;
- abgelaufenen Token;
- rückwärts laufendes Monotonic-Testinput;
- fehlgeschlagenen Stop-Dispatch.

`ProtectionServiceLifecyclePolicyTest` schützt u. a.:

- alte Generation vs. Fast-Restart;
- übertragene Restart-Ownership;
- ein durch neue Confirmed-Evidence überholtes Explicit-Stop-Flag;
- Pre-Confirmation-Destroy.

`ProtectionDiagnosticsInstrumentedTest` enthält:

```text
startRequestAndConfirmedStartPersistAsDistinctLifecycleEvidence
terminalStopWinsAgainstDelayedStartConfirmationWithoutOverwrite
restartRequestAdvancesBeyondLatestStopBoundary
```

Diese Tests sind erst nach realer Ausführung Evidence.

## 16. Reale Android-Evidence

Neben LIFE-12 bis LIFE-14 sind die realen Dispatch-Races aus `PROTECTION_SERVICE_DISPATCH_RACES.md` auszuführen:

```text
DISPATCH-01 Stop zwischen Request und Android-Start
DISPATCH-02 Restart gegen alten Stop-Dispatch
DISPATCH-03 residualer Destroy nach Fast-Restart
DISPATCH-04 später echter Destroy darf nicht durch alten Token maskiert werden
```

Zusätzlich bleiben Pre-Confirmation-Abbruch und harter Post-Start-Process-Kill getrennt zu testen.

## 17. Diagnose-Evidence

JSON-Snapshot und Debug-Screen müssen sichtbar halten:

```text
lastProtectionStartRequestAt
lastProtectionStartAt
lastProtectionStopAt
lastProtectionStopCode
lastProtectionStopMessage
```

Die Relation dieser Grenzen gehört zum Prüfergebnis.

## 18. Evidence-Regel

Source-Code, Source-Checker, JUnit-/Vitest-/Instrumentation-Quellcode sind **keine reale Android-Evidence**. G4/G6/G7 dürfen erst entsprechend hochgestuft werden, wenn die jeweiligen Checks und realen Android-Szenarien auf dem exakten Kandidaten tatsächlich ausgeführt und dokumentiert wurden.
