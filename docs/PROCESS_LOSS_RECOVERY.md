# ScrollShield – Process-Loss / Restart-Recovery

Status: **Source-Vertrag vorhanden, reale Android-Evidence offen**

Letzte Aktualisierung: **28. August 2026**

## Ziel

Ein harter Android-Prozessabbruch darf nicht wie ein normaler manueller oder permission-bedingter Stopp behandelt werden. Zusätzlich darf ein Prozessabbruch **vor** einem bestätigten Foreground-Service-Start nicht wie ein späterer Kill eines bereits laufenden Schutzdienstes aussehen.

ScrollShield trennt deshalb:

1. persistierte Startanforderung;
2. bestätigten Foreground-Service-Start;
3. späteren terminalen Stopp.

Detaillierter Startvertrag: `docs/PROTECTION_START_HANDSHAKE.md`.

## Persistente Start-Evidence

Der Native-Layer führt getrennt:

```text
lastStartRequestAt
lastStartAt
lastStopAt
```

`lastStartRequestAt` bedeutet nur: Aktivierungsabsicht + Startanforderung wurden dauerhaft gespeichert.

`lastStartAt` bedeutet stärker: `startForeground(...)` war erfolgreich und die bestätigte Start-Evidence wurde danach ebenfalls dauerhaft gespeichert.

Ein Request darf daher nie als tatsächlicher Dienststart interpretiert werden.

## Drei relevante Nicht-Laufend-Zustände

### 1. `start-pending`

Gilt bei:

```text
running == false
enabled == true
lastStartRequestAt > max(lastStartAt, lastStopAt)
Alter der Anfrage <= 15 Sekunden
```

Die Startanforderung ist frisch und darf noch auf Androids Foreground-Bestätigung warten.

UI:

- Badge `STARTET`;
- kein alter Stop-Grund als aktuelle Ursache;
- Doppelstart in der Statuskarte blockiert;
- Aktion zeigt `Start wird bestätigt…`.

### 2. `start-interrupted`

Gilt bei:

```text
running == false
enabled == true
lastStartRequestAt > max(lastStartAt, lastStopAt)
Alter der Anfrage > 15 Sekunden
```

Die neueste Startanforderung wurde nicht durch einen bestätigten `lastStartAt` abgeschlossen. Der Prozess kann zwischen Startanforderung und Foreground-Bestätigung beendet worden sein.

UI:

- Badge `START ABGEBROCHEN`;
- kein älterer Stop-Grund als aktuelle Ursache;
- normaler Retry `Schutz erneut starten`;
- **keine** Process-Loss-Recovery.

### 3. `unclean-process-stop`

Der Health-State `unclean-process-stop` gilt nur bei bestätigtem früheren Dienststart:

```text
running == false
enabled == true
lastStartAt > 0
lastStartAt > lastStopAt
lastStartRequestAt <= lastStartAt
```

Damit ist ein **bestätigter** Dienststart neuer als jede bekannte Stop-Evidence. Ein älterer Stop-Code darf in diesem Zustand nicht als aktuelle Ursache dargestellt werden.

## Nutzerführung für bestätigten Process-Loss

Für `unclean-process-stop` zeigt ScrollShield:

- Badge `PROZESS ABGEBROCHEN`;
- Erklärung, dass Prozessabbruch/System-Kill möglich ist;
- keine alte Stop-Evidence als aktuelle Ursache;
- Aktion `Schutz wiederherstellen` statt generischem `Schutzdienst starten`;
- Busy-Zustand `Wiederherstellung läuft…`.

Diese Recovery-Aktion ist bewusst nur für einen vorher **bestätigten** Dienststart vorgesehen.

## Kontrollierte Recovery

`NativeProtection.recoverAfterProcessLoss(appsConfig, focusMode)` muss:

1. den echten Native-Status erneut lesen;
2. sofort zurückkehren, falls der Dienst inzwischen bereits `running && enabled` ist;
3. ansonsten ausschließlich `unclean-process-stop` akzeptieren;
4. die aktuelle Protection-Config **genau einmal durable** synchronisieren;
5. die exakt zurückgegebene `configGeneration` zusammen mit dem ursprünglichen Lifecycle-Snapshot an `startCommitted(...)` übergeben;
6. Target-/Permission-/Config-/Start-Blocker ausschließlich dem aktuellen Native-Preflight überlassen;
7. nach nativer Rejection den Native-Status erneut lesen;
8. neue terminale Native-Evidence zurückgeben, falls sie seit dem ursprünglichen Snapshot entstanden ist;
9. den ursprünglichen Fehler weiterwerfen, falls keine neue terminale Evidence persistiert wurde;
10. bei erfolgreichem Start den Native-Status erneut lesen und zurückgeben.

`start-pending` und `start-interrupted` dürfen nicht in diese Recovery-Funktion umgeleitet werden.

Der Permissions-Screen prüft weiterhin vor dem Recovery-Aufruf die aktuell sichtbaren Pflichtzugriffe und mindestens eine aktive App-Auswahl für Nutzerführung. Diese React-Vorprüfung besitzt jedoch **nicht** die finale Fail-Closed-Evidence.

## Native-owned Fail-Closed-Evidence

Automatische Recovery – sowohl `unclean-process-stop` als auch App-Open-`stale-activation` – muss am selben Native-Preflight enden:

```text
Lifecycle-Snapshot
→ Config-Generation
→ Usage Access
→ Overlay
→ Notifications
→ installierte aktive Ziel-App
→ Startrequest
→ Service-Dispatch
```

`unavailableAppIds` darf einen `stale-activation`-Versuch im React-Layer nicht lokal unterdrücken. Auch wenn der vorherige Config-Sync alle aktiven Ziele als unavailable meldet, wird die committed Generation zusammen mit dem alten Lifecycle-Snapshot an Native übergeben. Nur Native darf daraus `target_app_missing` oder einen anderen aktuellen Prerequisite-Stop erzeugen.

Dadurch gilt auch im Race:

```text
Recovery liest alten Snapshot
→ Config-Sync läuft
→ Nutzer stoppt bewusst
→ Sync meldet danach Target/Permission-Problem
→ startCommitted(generation, alterSnapshot)
→ Native sieht Snapshot-Mismatch
→ No-op
```

Der neuere manuelle/Notification-Stop bleibt final und wird nicht durch `target_app_missing`, `start_failed` oder einen Permission-Stop überschrieben.

## Persistenter Start-Handshake

Vor der eigentlichen Service-Anforderung gilt:

```text
recordProtectionStartRequested(...)
→ enabled=true + lastStartRequestAt in einem Commit
→ startForegroundService/startService
```

Schlägt dieser Request-Commit fehl, wird mit `START_FAILED` fail-closed gestoppt und Android erhält keinen Service-Startauftrag.

Im Service gilt danach:

```text
startForeground(...)
→ recordProtectionServiceStarted(...)
→ lastStartAt dauerhaft gespeichert
→ RUNNING=true
```

Kann `lastStartAt` nicht dauerhaft gespeichert werden, persistiert der Native-Layer `START_FAILED` und wirft eine Exception, bevor `RUNNING=true` erreicht wird.

Damit bleibt ein abgebrochener Start vor der Bestätigung eindeutig von einem späteren Kill eines bestätigten Dienstes unterscheidbar.

## Atomarer Native-Start-Preflight

Der Capacitor-Plugin-Pfad `ScrollShieldNativePlugin.startProtectionService()` ist selbst eine Sicherheitsgrenze. React-Vorprüfungen dienen nur der Nutzerführung und dürfen nicht die letzte Wahrheit sein.

Für diese vier nativen Startvoraussetzungen gilt derselbe stabile Vertrag:

```text
usage_access_missing
overlay_permission_missing
notifications_missing
target_app_missing
```

Fehlt eine davon, ruft `startProtectionService()` `rejectProtectionStartPrerequisite(...)` auf. Dieser Helper:

1. ruft den zentralen System-Stop-Wrapper auf;
2. persistiert im Primärpfad unter `EVENT_LOCK` in **einem** synchronen Commit:
   - `enabled=false`;
   - `warning/system` in der Event-Queue;
   - Stop-Zeitpunkt;
   - exakten stabilen Stop-Code;
   - Stop-Nachricht;
3. verwendet nur bei `commit=false` den Best-Effort-Fallback aus `setProtectionEnabled(false)` + `recordProtectionStop(...)`;
4. lehnt **erst danach** den Capacitor-Aufruf über `call.reject(...)` ab.

Bei automatischer Recovery wird vor dieser gesamten Fail-Closed-Kette zusätzlich der Lifecycle-Snapshot unter `ProtectionServiceDispatchGuard.LOCK → EVENT_LOCK` geprüft. Snapshot-Mismatch bedeutet ausschließlich No-op und darf **keine** neue Prerequisite-/Target-/Startfehler-Evidence erzeugen.

## Exakte Prerequisite-Diagnose

Die UI verwendet eine zentrale Pure-TypeScript-Policy in `androidProtectionPrerequisites.ts`.

Pflichtzugriffe werden in stabiler Reihenfolge ausgewertet:

```text
usageAccess
overlay
notifications
```

Die stabilen nativen Stop-Codes werden auf dieselben UI-Prerequisites zurückgeführt:

```text
usage_access_missing       -> usageAccess
overlay_permission_missing -> overlay
notifications_missing      -> notifications
```

### Vorprüfung und Race

Vor `recoverAfterProcessLoss(...)` wird `NativePermissions.getAndroidStatus()` frisch gelesen und in den sichtbaren App-State übernommen. Fehlt ein Pflichtzugriff, wird aus UX-Gründen kein Recovery-Aufruf versucht.

Wenn sich der Zustand **nach** dieser Vorprüfung ändert, besitzt Native die finale Wahrheit. Bei Recovery-Fehler liest der Screen erneut Permission- und Service-Status, damit ein frisch persistierter Native-Prerequisite-Stop konkret angezeigt wird.

## Ziel-App-Vertrag

Die React-/TypeScript-Schicht darf `unavailableAppIds` für Hinweise und UX verwenden, aber bei automatischer stale-/process-loss-Recovery keine eigene terminale Target-Evidence schreiben.

Native prüft die installierte aktive Ziel-App unmittelbar vor Startrequest-Persistenz. Verändert sich der Zustand zwischen Config-Sync und Start, entsteht bei unverändertem Lifecycle-Snapshot exakt `target_app_missing`; hat dagegen inzwischen ein neuerer manueller/Notification-Stop gewonnen, endet die Recovery als Snapshot-No-op.

## Erfolgsregel

Die UI darf `wiederhergestellt` nur melden, wenn der zurückgelesene Zustand gleichzeitig erfüllt:

```text
running == true
enabled == true
health == active
```

Andernfalls wird entweder ein konkreter Native-Prerequisite-/Ziel-App-Blocker, ein noch nicht bestätigter Recovery-Status oder der neuere absichtliche Stop angezeigt.

## Source-Verifikation

`npm run check:start-handshake` schützt unter anderem:

- getrennte Request-/Start-/Stop-Evidence;
- atomaren generationgebundenen Request-Commit;
- bestätigte Foreground-Evidence;
- Stop-wins-Confirmation;
- Lifecycle-Snapshot-No-op vor Fail-Closed-Writes;
- `start-pending` / `start-interrupted` / `unclean-process-stop` als getrennte Zustände.

`npm run check:process-loss` schützt unter anderem:

- bestätigte Process-Loss-Klassifizierung;
- Single-Generation-Recovery;
- Snapshot-Weitergabe;
- Verbot des alten TypeScript-owned `TARGET_APP_MISSING_STOP_REASON`-Recovery-Pfads;
- `hasNewTerminalEvidenceSince(...)`;
- Rückgabe frischer nativer terminaler Evidence;
- Weiterwerfen eines Fehlers ohne neue terminale Evidence.

`npm run check:protection-recovery` schützt zusätzlich:

- `start-pending` ohne Sync/Start;
- stale-Recovery auch bei unavailable Targets bis zum Native-Preflight;
- Native-Reihenfolge Snapshot → Config → Permissions → Target → Startrequest;
- App-/Policy-Tests, die unavailable Targets nicht mehr als lokales Startverbot behandeln;
- Boot-/Update-Recovery-Fail-Closed-Vertrag.

Diese Checker sind Bestandteil von `npm run verify`; die zentralen Lifecycle-/Recovery-Checks laufen ebenfalls im Readiness-Report.

## Noch nicht bewiesen

Dieser Source-Vertrag ersetzt keine reale Android-Evidence. Weiter offen:

- Prozess nach `lastStartRequestAt`, aber vor `lastStartAt` beenden;
- `start-pending` und `start-interrupted` real beobachten;
- bestätigten Process-Kill und `unclean-process-stop` real beobachten;
- `Schutz wiederherstellen` ausführen;
- Native First-Start-/Recovery-Preflight für Usage, Overlay, Notifications und Target real prüfen;
- stale-activation mit unavailable Ziel-App real bis zum nativen `target_app_missing`-Preflight führen;
- manuellen/Notification-Stop während stale-/process-loss-Recovery gewinnen lassen;
- dabei zusätzlich Target-/Permission-Zustand nach dem Sync ändern und bestätigen, dass der neuere bewusste Stop final bleibt;
- mehrere aktive Ziele testen: eines fehlt, mindestens eines installiert → Recovery muss weiterlaufen;
- erfolgreichen Übergang zu `active` bestätigen;
- OEM-/Background-Kill-Verhalten auf der Device Matrix prüfen.