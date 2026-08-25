# ScrollShield – Process-Loss / Restart-Recovery

Status: **Source-Vertrag vorhanden, reale Android-Evidence offen**

Letzte Aktualisierung: **25. August 2026**

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
4. die aktuelle Protection-Config neu synchronisieren;
5. die von Android zurückgegebenen `unavailableAppIds` gegen die aktuell aktiven Android-Ziele prüfen;
6. fail-closed mit `target_app_missing` stoppen, falls **kein aktives installiertes Ziel** mehr übrig ist;
7. nur wenn mindestens ein aktives Ziel verfügbar bleibt, den nativen Service-Start ausführen;
8. den Native-Status danach erneut lesen und zurückgeben.

`start-pending` und `start-interrupted` dürfen nicht in diese Recovery-Funktion umgeleitet werden.

Der Permissions-Screen prüft zusätzlich vor dem Recovery-Aufruf die aktuell sichtbaren Pflichtzugriffe und mindestens eine aktive App-Auswahl.

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

Damit kann ein fehlgeschlagener Native-Start nicht lediglich einen JavaScript-Fehler werfen, während eine frühere Aktivierung und ein alter Stop-Grund stehen bleiben.

Der gleiche Persistenzvertrag gilt auch beim normalen First Start, wenn `enabled` vor dem Versuch bereits `false` war. Ein fehlgeschlagener Start erhält trotzdem einen neuen terminalen Stop-Zeitpunkt, exakten Code und Warn-Event.

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

Damit kann ScrollShield mehrere unterschiedliche Timing-Fälle präzise behandeln.

### 1. Zugriff fehlt bereits vor Recovery

Vor `recoverAfterProcessLoss(...)` wird `NativePermissions.getAndroidStatus()` frisch gelesen und in den sichtbaren App-State übernommen. Fehlt ein Pflichtzugriff, wird **kein Native-Start versucht**.

Beispiele:

```text
Wiederherstellung blockiert: App-Nutzungszugriff fehlt.
Wiederherstellung blockiert: Hinweis über anderen Apps fehlt.
Wiederherstellung blockiert: Benachrichtigungsfreigabe fehlt.
```

### 2. Zugriff geht zwischen Vorprüfung und Start verloren

Wenn der Recovery-Aufruf einen Fehler wirft, liest der Screen erneut parallel:

- `NativePermissions.getAndroidStatus()`;
- `NativeProtection.getStatus()`.

Dadurch wird ein Permission-Race nicht auf eine generische Fehlermeldung reduziert. Ein inzwischen entzogener Zugriff wird konkret benannt und der sichtbare Permission-State wird aktualisiert.

Durch den atomaren Native-Start-Preflight liegt in diesem Race zusätzlich ein frischer persistierter Stop-Code vor, sofern der Plugin-Preflight den Verlust erkennt.

### 3. Native-Start wurde angenommen, Service stoppt sofort wieder

Falls `recoverAfterProcessLoss(...)` einen neuen Native-Status zurückliefert, der nicht `active` ist, wird dessen frischer `lastStopCode` ausgewertet. Ein stabiler Prerequisite-Code wird sofort auf den zugehörigen Zugriff gemappt und als Recovery-Blocker angezeigt.

Ein frischer `start-pending`-Status ist dagegen noch keine terminale Stoppdiagnose. Er bedeutet nur, dass Androids bestätigte Start-Evidence noch fehlt.

Damit deckt der Source-Vertrag auch das Fenster ab, in dem die Plugin-Vorprüfung erfolgreich war, der gestartete Service die Berechtigung aber unmittelbar danach als verloren erkennt.

### 4. Alle aktiven Ziel-Apps sind inzwischen deinstalliert oder unsichtbar

`syncProtectionConfig()` liefert Androids aktuelle `unavailableAppIds`. Der Recovery-Wrapper vergleicht diese Liste mit den **aktiv konfigurierten Android-App-IDs**.

Wenn alle aktiven Ziele unavailable sind – oder keine gültige aktive Android-Ziel-App mehr vorhanden ist – gilt:

```text
Service-Start: NEIN
Protection enabled: false
lastStopCode: target_app_missing
```

Der Stopp wird über den vorhandenen Native-Stop-Pfad persistiert und der Status anschließend erneut gelesen. Die Statuskarte zeigt dauerhaft:

```text
ZIEL-APP FEHLT
Keine installierte Ziel-App verfügbar
```

mit der Anweisung, mindestens eine installierte geschützte App auszuwählen.

Wichtig: **Teilweise** Unverfügbarkeit blockiert Recovery nicht. Wenn zum Beispiel Instagram fehlt, TikTok aber ebenfalls aktiv konfiguriert und installiert ist, darf der Schutz für das verbleibende Ziel wieder anlaufen.

Zusätzlich prüft `startProtectionService()` die installierte Ziel-App nochmals nativ. Verändert sich der Zustand zwischen Config-Sync und Start, persistiert dieser zweite Preflight ebenfalls `target_app_missing` atomar, bevor der Aufruf abgelehnt wird.

## Erfolgsregel

Die UI darf `wiederhergestellt` nur melden, wenn der zurückgelesene Zustand gleichzeitig erfüllt:

```text
running == true
enabled == true
health == active
```

Andernfalls wird entweder ein konkreter Prerequisite-/Ziel-App-Blocker oder ein noch nicht bestätigter Recovery-Status angezeigt.

## Source-Verifikation

`npm run check:start-handshake` schützt:

- `lastStartRequestAt` als eigene persistente Evidence;
- atomaren Request-Commit aus `enabled=true + timestamp`;
- Request vor `startForegroundService(...)`;
- das Verbot des alten nackten `setProtectionEnabled(context, true)` im Startpfad;
- bestätigte `lastStartAt`-Evidence erst hinter `startForeground(...)`;
- Fail-closed `START_FAILED`, wenn bestätigte Start-Evidence nicht persistiert werden kann;
- `RUNNING=true` erst hinter bestätigter Start-Evidence;
- `start-pending` / `start-interrupted` / `unclean-process-stop` als getrennte Zustände;
- 15-Sekunden-Grace-Window;
- UI-Doppelstartschutz und normalen Retry nach unterbrochenem Start;
- zugehörige Vitest-/Instrumentation-Source-Verträge.

`npm run check:process-loss` schützt weiterhin:

- bestätigte Process-Loss-Klassifizierung;
- den eigenen Health-State;
- die eigene Recovery-UI;
- `recoverAfterProcessLoss(...)`;
- Doppelstart-Schutz;
- fail-closed Recovery aus falschem Zustand;
- Config-Resync;
- Auswertung aktiver Android-Ziele gegen `unavailableAppIds`;
- `target_app_missing` ohne Service-Start, wenn alle aktiven Ziele fehlen;
- Weiterlauf bei nur teilweise unavailable aktiven Zielen;
- Status-Readback;
- persistente UI-Darstellung `ZIEL-APP FEHLT`;
- zentrale Prerequisite-Policy und stabile Reihenfolge;
- Mapping der nativen Permission-Stop-Codes auf UI-Prerequisites;
- konkreten Precheck-Block vor Recovery;
- Permission-Recheck nach Recovery-Fehler;
- Auswertung eines frischen Native-Prerequisite-Stop-Codes;
- Permissions-Screen-Verdrahtung;
- zugehörige Vitest-/Component-Verträge.

`npm run check:prerequisite-stop-codes` schützt zusätzlich:

- die atomare System-Stop-Transaktion;
- die Service-Runtime-Verdrahtung;
- die vier atomaren Native-Start-Preflight-Codes;
- den `rejectProtectionStartPrerequisite(...)`-Fallback;
- das Verbot alter nackter Prerequisite-`call.reject()`-Pfade;
- den Instrumentation-Vertrag für bereits deaktivierte First-Start-Fehler.

Diese Checker sind Bestandteil von `npm run verify`; `check:start-handshake` und die zentralen Lifecycle-/Recovery-Checks laufen ebenfalls im Readiness-Report.

## Noch nicht bewiesen

Dieser Source-Vertrag ersetzt keine reale Android-Evidence. Weiter offen:

- Prozess gezielt **nach** persistiertem `lastStartRequestAt`, aber **vor** bestätigtem `lastStartAt` beenden;
- innerhalb der Grace-Phase `start-pending` beobachten;
- nach Ablauf der Grace-Phase `start-interrupted` beobachten;
- bestätigen, dass dieser Fall **nicht** als `unclean-process-stop` erscheint;
- `Schutz erneut starten` ausführen und `active` bestätigen;
- separaten Prozess **nach bestätigtem Dienststart** hart beenden;
- sicherstellen, dass `onDestroy()` dabei nicht als Voraussetzung für die Erkennung benötigt wird;
- App erneut öffnen und `unclean-process-stop` beobachten;
- `Schutz wiederherstellen` ausführen;
- **Native First-Start-Preflight real prüfen:** Usage Access, Overlay, Notifications und Ziel-App jeweils fehlen lassen und `enabled=false + Warn-Event + exakten Stop-Code` bestätigen;
- Usage Access vor Recovery real entziehen und exakten Blocker beobachten;
- Overlay vor/zwischen Recovery-Prüfung und Start real entziehen;
- Notifications vor/zwischen Recovery-Prüfung und Start real entziehen;
- frischen nativen Prerequisite-Stop nach angenommenem Start beobachten;
- aktive Ziel-App nach bestätigtem Dienststart deinstallieren und `target_app_missing` bei Recovery real bestätigen;
- mehrere aktive Ziele testen: eines deinstalliert, mindestens eines installiert → Recovery muss weiterlaufen;
- erfolgreichen Übergang zu `active` bestätigen;
- OEM-/Background-Kill-Verhalten auf der Device Matrix prüfen.
