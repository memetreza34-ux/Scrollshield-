# ScrollShield – Process-Loss / Restart-Recovery

Status: **Source-Vertrag vorhanden, reale Android-Evidence offen**

Letzte Aktualisierung: **27. August 2026**

## Ziel

ScrollShield trennt drei unterschiedliche Fälle:

1. Startanforderung gespeichert, Foreground-Start noch nicht bestätigt;
2. bestätigter Foreground-Service verschwindet später ohne terminalen Stopp;
3. Nutzer/System erzeugt eine neuere terminale Stop-Evidence.

Detaillierter Startvertrag: `docs/PROTECTION_START_HANDSHAKE.md`.

## Persistente Lifecycle-Evidence

```text
lastStartRequestAt = Aktivierungsabsicht + Startanforderung durable
lastStartAt        = Foreground-Service-Start durable bestätigt
lastStopAt         = terminaler Stopp durable
```

Ein Request ist niemals gleichbedeutend mit einem bestätigten Dienststart.

## Nicht-Laufend-Zustände

### `start-pending`

```text
running=false
enabled=true
lastStartRequestAt > max(lastStartAt, lastStopAt)
Request-Alter <= 15 Sekunden
```

UI: `STARTET`, kein alter Stop-Grund, kein Doppelstart, Status später erneut lesen.

### `start-interrupted`

```text
running=false
enabled=true
lastStartRequestAt > max(lastStartAt, lastStopAt)
Request-Alter > 15 Sekunden
```

UI: `START ABGEBROCHEN`, normaler Retry `Schutz erneut starten`, keine Process-Loss-Recovery.

### `unclean-process-stop`

```text
running=false
enabled=true
lastStartAt > 0
lastStartAt > lastStopAt
lastStartRequestAt <= lastStartAt
```

Nur dieser Zustand bedeutet: Ein früherer Service-Start war bestätigt und verschwand später ohne terminalen Stopp.

UI: `PROZESS ABGEBROCHEN`, keine alte Stop-Evidence als aktuelle Ursache, Aktion `Schutz wiederherstellen`, Busy `Wiederherstellung läuft…`.

## Kontrollierte Process-Loss-Recovery

`NativeProtection.recoverAfterProcessLoss(appsConfig, focusMode)` muss:

1. Native-Status erneut lesen;
2. bei `running && enabled` sofort zurückkehren;
3. ausschließlich `unclean-process-stop` akzeptieren;
4. diesen Status als Lifecycle-Snapshot `before` behalten;
5. die Protection-Config genau einmal über `syncCommitted(...)` durable synchronisieren;
6. `startCommitted(configGeneration, before)` aufrufen;
7. Native darf erst nach erfolgreichem Snapshot-Match Config-/Permission-/Target-/Start-Evidence erzeugen;
8. bei nativer Rejection den Native-Status erneut lesen;
9. wenn neue terminale Evidence seit `before` existiert, diesen Status zurückgeben;
10. wenn keine neue terminale Evidence existiert, den ursprünglichen Fehler weiterwerfen;
11. bei akzeptiertem Start den Native-Status erneut lesen und zurückgeben.

Kernfluss:

```text
before = getStatus()
→ syncCommitted(...)
→ startCommitted(configGeneration, before)
→ getStatus()
```

Fehlerfluss:

```text
startCommitted(...) reject
→ afterFailure = getStatus()
├─ neue terminale Evidence seit before
│  → afterFailure zurückgeben
└─ keine neue terminale Evidence
   → Fehler weiterwerfen
```

Damit wird ein Transport-/Pluginfehler nicht als falscher erfolgreicher Fail-Closed-Status verschluckt.

## Native besitzt die Recovery-Fehler-Evidence

TypeScript schreibt für Process-Loss-Recovery **keinen proaktiven `target_app_missing`-Stop mehr**.

Warum: Ein TypeScript-Stop nach einem längeren Config-Sync könnte einen inzwischen neueren manuellen oder Notification-Stop überschreiben.

Stattdessen läuft jede automatische Recovery durch denselben snapshotgebundenen Native-Preflight:

```text
Lifecycle-Snapshot prüfen
↓
Config-Generation prüfen
↓
Usage Access prüfen
↓
Overlay prüfen
↓
Notifications prüfen
↓
installierte aktive Ziel-App prüfen
↓
Startrequest persistieren
↓
Service dispatchen
```

Ergebnis:

```text
Snapshot veraltet
→ No-op
→ neuere Lifecycle-Evidence bleibt Gewinner

Snapshot aktuell + Target fehlt
→ nativer target_app_missing System-Stop
→ React liest diese Evidence zurück

Snapshot aktuell + Permission fehlt
→ exakter nativer Permission-System-Stop
→ React liest diese Evidence zurück

Snapshot aktuell + alles okay
→ generationgebundener Startrequest
```

## Lifecycle-Snapshot: neuerer Stop gewinnt

Der Auto-Restart-Snapshot enthält:

```text
expectedEnabled
expectedLastStartRequestAt
expectedLastStartAt
expectedLastStopAt
```

Native prüft unter:

```text
ProtectionServiceDispatchGuard.LOCK
→ EVENT_LOCK
→ ProtectionStartHandshakePolicy.matchesLifecycleSnapshot(...)
```

und zwar **vor** Config-Fehler-, Prerequisite-, Target-, Startrequest- oder Service-Start-Evidence.

Bei Snapshot-Mismatch gilt:

```text
resolve / no-op
```

und ausdrücklich:

- kein neuer `lastStartRequestAt`;
- kein `enabled=true`;
- kein `start_failed`;
- kein `target_app_missing`;
- keine neue Permission-Stop-Evidence;
- kein Android-Service-Dispatch.

Das ist bewusst kein Fehler: Ein neuerer manueller Stop, aktueller Notification-Stop, anderer Start oder bereits geänderter Lifecycle ist neuere Wahrheit.

## App-Open-Recovery

```text
getStatus()
│
├─ start-pending
│  └─ kein Config-Sync, kein zweiter Start; nach 1 s erneut lesen
│
├─ unclean-process-stop
│  └─ recoverAfterProcessLoss(...)
│     └─ Single-Generation + Snapshot before + Native-Preflight-Evidence
│
├─ stale-activation
│  └─ syncCommitted(...)
│     └─ installierte aktive Ziele prüfen
│        └─ startCommitted(configGeneration, serviceStatus)
│
├─ start-interrupted
│  └─ kein Auto-Restart; sichtbarer Nutzer-Retry
│
└─ active / deliberately disabled / andere
   └─ kein automatischer Start
```

Für `stale-activation` verwendet der Auto-Start exakt die Config-Generation des App-Open-Syncs und den Lifecycle-Snapshot der Entscheidung.

## `LIFE-16` – Stop gegen laufende Auto-Recovery

Die reale Device Matrix verlangt `LIFE-16` für mindestens:

```text
stale-activation
unclean-process-stop
```

Basisablauf:

1. automatische App-Open-Recovery beginnt;
2. Status-Snapshot wird gelesen;
3. Config-Sync läuft oder ist abgeschlossen;
4. Nutzer stoppt bewusst über App oder aktuelle Notification;
5. verspäteter Auto-Start erreicht Native.

Erwartung:

```text
enabled=false bleibt bestehen
lastStopAt bleibt Gewinner
lastStopCode bleibt unverändert
lastStopMessage bleibt unverändert
kein neuer lastStartRequestAt
kein neues lastStartAt
kein start_failed
kein Auto-Reenable
```

Zusätzlicher Pflicht-Race für Process-Loss-Recovery:

```text
before = unclean-process-stop
→ syncCommitted läuft
→ Nutzer stoppt manuell
→ derselbe Sync ergibt anschließend: keine installierte aktive Ziel-App
→ startCommitted(configGeneration, before)
→ Snapshot mismatch
→ No-op
```

Auch dann muss **manual_app_stop / notification_action_stop** Gewinner bleiben. Das nachträglich festgestellte `target_app_missing` darf den neueren bewussten Stop nicht überschreiben.

Source-Vertrag vorhanden; reale Android-Evidence weiterhin offen.

## Persistenter Start-Handshake

```text
recordProtectionStartRequested(...)
→ enabled=true + lastStartRequestAt + startRequestConfigGeneration in einem Commit
→ startForegroundService/startService
```

Im Service:

```text
startForeground(...)
→ recordProtectionServiceStarted(...)
→ lastStartAt durable
→ RUNNING=true
```

Stop vor verspäteter Confirmation ergibt `SUPERSEDED_BY_STOP` und darf Stop-Evidence nicht überschreiben.

## Native Start-Preflight

Stabile Native-Blocker:

```text
usage_access_missing
overlay_permission_missing
notifications_missing
target_app_missing
```

Fehlt eine Voraussetzung bei **aktuellem** Snapshot, persistiert `rejectProtectionStartPrerequisite(...)` zuerst den atomaren System-Stop und lehnt danach den Capacitor-Aufruf ab.

Ist der Snapshot dagegen bereits veraltet, endet der Auto-Restart vorher als No-op und darf keine neue Fehler-Evidence erzeugen.

## Target-App-Recovery

`syncCommitted(...)` liefert weiterhin `unavailableAppIds` für UI-/Diagnosezwecke zusammen mit der durable Config-Generation.

Die finale Process-Loss-Startentscheidung bleibt jedoch Native-owned. Fehlt bei aktuellem Snapshot jede installierte aktive Ziel-App:

```text
Service-Start: NEIN
enabled=false
lastStopCode=target_app_missing
warning/system Event
```

Teilweise Unverfügbarkeit blockiert Native nicht, solange mindestens eine aktive installierte Ziel-App verbleibt.

## Permission-Recovery

Der Permissions-Screen liest vor Recovery die Pflichtzugriffe frisch:

```text
usageAccess
overlay
notifications
```

Native Stop-Codes werden stabil zurückgemappt:

```text
usage_access_missing       → usageAccess
overlay_permission_missing → overlay
notifications_missing      → notifications
```

Bei einem Recovery-Fehler bzw. nicht aktiven Rückgabestatus liest die UI aktuelle Permission- und Protection-Evidence und zeigt den konkreten Blocker.

## Erfolgsregel

Die UI darf `wiederhergestellt` nur melden bei:

```text
running=true
enabled=true
health=active
```

## Source-Verifikation

`npm run check:start-handshake` schützt:

- getrennte Request-/Confirmed-/Stop-Evidence;
- 15-Sekunden-Pending-Window;
- logisch monotone Lifecycle-Grenzen;
- atomaren generationgebundenen Startrequest;
- Stop-Winner gegen delayed Confirmation;
- Lifecycle-Snapshot-Matching vor automatischem Restart;
- Snapshot-Mismatch als No-op;
- Pure-Java-JUnit `autoRecoverySnapshotMatchesOnlyUnchangedLifecycleTruth`.

`npm run check:process-loss` schützt:

- Health-Klassifizierung;
- Recovery nur aus `unclean-process-stop`;
- genau einen `syncCommitted(...)`;
- `startCommitted(configGeneration, before)`;
- Native-owned Target-/Permission-/Start-Fail-Closed-Evidence;
- Verbot des alten TypeScript-`TARGET_APP_MISSING_STOP_REASON`;
- Rückgabe frischer nativer terminaler Evidence;
- Weiterwerfen eines Fehlers ohne neue terminale Evidence;
- neuerer manueller Stop gewinnt während Recovery;
- Status-/UI-/Prerequisite-Verträge.

`npm run check:protection-recovery` schützt den App-Open-Pfad, `check:checker-drift` verhindert die Rückkehr generationloser, snapshotloser oder TypeScript-owned Recovery-Stop-Verträge.

## Noch nicht bewiesen

Real offen bleiben:

- Pre-Confirmation-Prozessabbruch → `start-pending` → `start-interrupted`;
- echter Process-Kill nach bestätigtem Start → `unclean-process-stop`;
- erfolgreiche Recovery zu `active`;
- Permission-Races vor/zwischen Sync und Start;
- vollständige/partielle Target-App-Unverfügbarkeit;
- LIFE-16 inklusive „manueller Stop + danach Target fehlt“;
- OEM-/Background-Kill-Verhalten;
- Android JUnit-/Instrumentation-/Gradle-Ausführung auf dem exakten Kandidaten.

Die exakte aktuelle Candidate-SHA und CI-Evidence wird ausschließlich in PR #8 geführt.
