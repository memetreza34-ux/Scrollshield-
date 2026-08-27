# ScrollShield – Process-Loss / Restart-Recovery

Status: **Source-Vertrag vorhanden, reale Android-Evidence offen**

Letzte Aktualisierung: **27. August 2026**

## Ziel

ScrollShield muss drei unterschiedliche Fälle sauber trennen:

1. eine Startanforderung wurde gespeichert, aber noch nicht bestätigt;
2. ein Foreground-Service-Start wurde bestätigt und der Prozess verschwindet später ohne terminalen Stopp;
3. der Nutzer oder das System stoppt Schutz bewusst/terminal.

Detaillierter Startvertrag: `docs/PROTECTION_START_HANDSHAKE.md`.

## Persistente Lifecycle-Evidence

Native führt getrennt:

```text
lastStartRequestAt
lastStartAt
lastStopAt
```

Bedeutung:

```text
lastStartRequestAt = Aktivierungsabsicht + Startanforderung dauerhaft gespeichert
lastStartAt        = Foreground-Service-Start dauerhaft bestätigt
lastStopAt         = terminaler Stopp dauerhaft gespeichert
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

UI:

- `STARTET`;
- kein alter Stop-Grund als aktuelle Ursache;
- kein Doppelstart;
- Status später erneut lesen.

### `start-interrupted`

```text
running=false
enabled=true
lastStartRequestAt > max(lastStartAt, lastStopAt)
Request-Alter > 15 Sekunden
```

UI:

- `START ABGEBROCHEN`;
- normaler Retry `Schutz erneut starten`;
- keine Process-Loss-Recovery.

### `unclean-process-stop`

```text
running=false
enabled=true
lastStartAt > 0
lastStartAt > lastStopAt
lastStartRequestAt <= lastStartAt
```

Nur dieser Zustand bedeutet: Ein früherer Service-Start war bestätigt und verschwand später ohne terminalen Stopp.

UI:

- `PROZESS ABGEBROCHEN`;
- kein älterer Stop-Grund als aktuelle Ursache;
- Aktion `Schutz wiederherstellen`;
- Busy `Wiederherstellung läuft…`.

## Kontrollierte Process-Loss-Recovery

`NativeProtection.recoverAfterProcessLoss(appsConfig, focusMode)` muss:

1. Native-Status erneut lesen;
2. bei `running && enabled` sofort zurückkehren;
3. ausschließlich `unclean-process-stop` akzeptieren;
4. diesen Status als **Lifecycle-Snapshot `before`** behalten;
5. die aktuelle Protection-Config genau einmal über `syncCommitted(...)` durable synchronisieren;
6. aktive Android-Ziele gegen `unavailableAppIds` prüfen;
7. bei keinem installierten aktiven Ziel fail-closed mit `target_app_missing` stoppen;
8. ansonsten `startCommitted(configGeneration, before)` aufrufen;
9. Native-Status anschließend erneut lesen und zurückgeben.

Damit gilt:

```text
before = getStatus()
→ syncCommitted(...)
→ startCommitted(configGeneration, before)
→ getStatus()
```

Es entsteht pro Recovery-Entscheidung nur **eine** neue durable Config-Generation.

## Lifecycle-Snapshot: neuerer Stop gewinnt

Zwischen Status-Read und automatischem Start können Zeit und Nutzeraktionen liegen. Deshalb darf ein Auto-Restart nicht nur an die Config-Generation gebunden sein.

Der Snapshot enthält:

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

ob der aktuelle Lifecycle noch exakt der Recovery-Entscheidung entspricht.

### Snapshot stimmt

Dann läuft der normale generationgebundene Native-Start-Preflight weiter.

### Snapshot stimmt nicht

Dann gilt:

```text
resolve / no-op
```

und ausdrücklich:

- kein neuer `lastStartRequestAt`;
- kein `enabled=true`;
- kein `start_failed`;
- keine neue Stop-Evidence;
- kein `startForegroundService(...)` / `startService(...)`.

Das ist bewusst kein Fehler: Ein neuerer manueller Stop, aktueller Notification-Stop, anderer Start oder bereits geänderter Lifecycle ist neuere Wahrheit und darf nicht durch verspätete Auto-Recovery überschrieben werden.

## App-Open-Recovery

`src/App.tsx` liest beim App-Open zuerst den Native-Status.

```text
getStatus()
│
├─ start-pending
│  └─ kein Config-Sync, kein zweiter Start; nach 1 s erneut lesen
│
├─ unclean-process-stop
│  └─ recoverAfterProcessLoss(...)
│     └─ Single-Generation + Snapshot before
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

Damit gilt auch für `stale-activation`: Der Start verwendet exakt die Config-Generation, die der App-Open-Sync gerade durable erzeugt hat, und exakt den Lifecycle-Snapshot, auf dessen Basis die automatische Wiederherstellung entschieden wurde.

## `LIFE-16` – Stop gegen laufende Auto-Recovery

Die reale Device Matrix verlangt jetzt ausdrücklich:

```text
LIFE-16
```

Pflichtvarianten:

```text
stale-activation
unclean-process-stop
```

Ablauf:

1. automatische App-Open-Recovery beginnt;
2. Status-Snapshot wird gelesen;
3. Config-Sync darf bereits laufen oder abgeschlossen sein;
4. Nutzer stoppt Schutz bewusst über App oder aktuelle Notification;
5. verspäteter Auto-Start erreicht Native.

Erwartung:

```text
enabled=false bleibt bestehen
lastStopAt bleibt der Gewinner
lastStopCode bleibt unverändert
lastStopMessage bleibt unverändert
kein neuer lastStartRequestAt
kein neues lastStartAt
kein start_failed
kein Auto-Reenable
```

Das ist Source-seitig über Snapshot-Bindung gehärtet, aber noch nicht als reale Android-Evidence bewiesen.

## Persistenter Start-Handshake

Vor jeder neuen echten Service-Anforderung gilt:

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

Der Native-Plugin-Pfad ist die letzte Sicherheitsgrenze. Relevante stabile Blocker:

```text
usage_access_missing
overlay_permission_missing
notifications_missing
target_app_missing
```

Fehlt eine Voraussetzung, persistiert `rejectProtectionStartPrerequisite(...)` zuerst den atomaren System-Stop und lehnt erst danach den Capacitor-Aufruf ab.

Für Auto-Recovery gilt zusätzlich: Der Lifecycle-Snapshot wird **vor** diesen Fehlerpfaden geprüft. Ist der Snapshot veraltet, darf ein verspäteter Auto-Restart deshalb auch keinen falschen neuen Prerequisite-/`start_failed`-Stop über einen neueren bewussten Stop schreiben.

## Target-App-Recovery

`syncCommitted(...)` liefert `unavailableAppIds` zusammen mit der durable Config-Generation.

Wenn alle aktiven Android-Ziele fehlen oder keine gültige aktive Ziel-App existiert:

```text
Service-Start: NEIN
enabled=false
lastStopCode=target_app_missing
```

Teilweise Unverfügbarkeit blockiert Recovery nicht, solange mindestens eine aktive installierte Ziel-App verbleibt.

## Permission-Recovery

Der Permissions-Screen liest vor dem Recovery-Aufruf die Pflichtzugriffe frisch:

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

Bei einem Recovery-Fehler liest die UI sowohl Permissions als auch Protection-Status erneut, damit Permission-Races konkret benannt werden können.

## Erfolgsregel

Die UI darf `wiederhergestellt` nur melden, wenn der zurückgelesene Status gleichzeitig erfüllt:

```text
running=true
enabled=true
health=active
```

## Source-Verifikation

`npm run check:start-handshake` schützt unter anderem:

- getrennte Request-/Confirmed-/Stop-Evidence;
- 15-Sekunden-Pending-Window;
- logisch monotone Lifecycle-Grenzen;
- atomaren generationgebundenen Startrequest;
- Stop-Winner gegen delayed Confirmation;
- Lifecycle-Snapshot-Matching vor automatischem Restart;
- Snapshot-Mismatch als No-op;
- Pure-Java-JUnit `autoRecoverySnapshotMatchesOnlyUnchangedLifecycleTruth`.

`npm run check:process-loss` schützt unter anderem:

- Health-Klassifizierung;
- `recoverAfterProcessLoss(...)` nur für `unclean-process-stop`;
- `syncCommitted(...)` genau einmal;
- `startCommitted(configGeneration, before)`;
- Snapshot-Felder im Native-Dispatch;
- `target_app_missing` bei vollständig fehlenden aktiven Zielen;
- partielle Ziel-Unverfügbarkeit;
- Status-Readback;
- Prerequisite-UI und stabile Stop-Code-Zuordnung.

`npm run check:protection-recovery` schützt den App-Open-Pfad:

- `start-pending` vor jedem Config-Sync;
- direkte Process-Loss-Recovery;
- Single-Generation `stale-activation`-Recovery;
- `startCommitted(configGeneration, serviceStatus)`;
- kein Auto-Restart bei `start-interrupted`, deliberate disabled oder fehlenden Zielen.

`check:checker-drift` verhindert, dass diese Checker später wieder auf generationlose oder snapshotlose Recovery-Verträge zurückfallen.

## Noch nicht bewiesen

Trotz vorhandener Source-/Testverträge sind real noch offen:

- Pre-Confirmation-Prozessabbruch → `start-pending` → `start-interrupted`;
- echter Process-Kill nach bestätigtem Start → `unclean-process-stop`;
- erfolgreiche Recovery zu `active`;
- Permission-Races vor/zwischen Sync und Start;
- vollständige/partielle Target-App-Unverfügbarkeit;
- LIFE-16 für `stale-activation` und `unclean-process-stop`;
- OEM-/Background-Kill-Verhalten;
- reale Android JUnit-/Instrumentation-/Gradle-Ausführung auf dem exakten Kandidaten.

Die exakte aktuelle Candidate-SHA und CI-Evidence wird ausschließlich in PR #8 geführt.
