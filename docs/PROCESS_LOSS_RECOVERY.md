# ScrollShield – Process-Loss / Restart-Recovery

Status: **Source-Vertrag vorhanden, reale Android-Evidence offen**

Letzte Aktualisierung: **23. August 2026**

## Ziel

Ein harter Android-Prozessabbruch darf nicht wie ein normaler manueller oder permission-bedingter Stopp behandelt werden. ScrollShield muss erkennen, wenn der Schutzdienst zuletzt erfolgreich gestartet wurde, danach aber kein sauberer terminaler Stop persistiert wurde und der Prozess nicht mehr läuft.

## Erkennung

Der Health-State `unclean-process-stop` gilt genau dann, wenn:

```text
running == false
enabled == true
lastStartAt > 0
lastStartAt > lastStopAt
```

Damit ist ein bestätigter Dienststart neuer als jede bekannte Stop-Evidence. Ein älterer Stop-Code darf in diesem Zustand nicht als aktuelle Ursache dargestellt werden.

## Nutzerführung

Für `unclean-process-stop` zeigt ScrollShield:

- Badge `PROZESS ABGEBROCHEN`;
- Erklärung, dass Prozessabbruch/System-Kill möglich ist;
- keine alte Stop-Evidence als aktuelle Ursache;
- Aktion `Schutz wiederherstellen` statt generischem `Schutzdienst starten`;
- Busy-Zustand `Wiederherstellung läuft…`.

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

Der Permissions-Screen prüft zusätzlich vor dem Recovery-Aufruf die aktuell sichtbaren Pflichtzugriffe und mindestens eine aktive App-Auswahl.

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

### 3. Native-Start wurde angenommen, Service stoppt sofort wieder

Falls `recoverAfterProcessLoss(...)` einen neuen Native-Status zurückliefert, der nicht `active` ist, wird dessen frischer `lastStopCode` ausgewertet. Ein stabiler Prerequisite-Code wird sofort auf den zugehörigen Zugriff gemappt und als Recovery-Blocker angezeigt.

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

## Erfolgsregel

Die UI darf `wiederhergestellt` nur melden, wenn der zurückgelesene Zustand gleichzeitig erfüllt:

```text
running == true
enabled == true
health == active
```

Andernfalls wird entweder ein konkreter Prerequisite-/Ziel-App-Blocker oder nur ein nicht bestätigter Recovery-Status angezeigt.

## Source-Verifikation

`npm run check:process-loss` schützt:

- die Zeitstempel-Klassifizierung;
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

`check:process-loss` ist Bestandteil von `npm run verify` und des Readiness-Reports.

## Noch nicht bewiesen

Dieser Source-Vertrag ersetzt keine reale Android-Evidence. Weiter offen:

- echten Prozess nach bestätigtem Dienststart hart beenden;
- sicherstellen, dass `onDestroy()` dabei nicht als Voraussetzung für die Erkennung benötigt wird;
- App erneut öffnen und `unclean-process-stop` beobachten;
- `Schutz wiederherstellen` ausführen;
- Usage Access vor Recovery real entziehen und exakten Blocker beobachten;
- Overlay vor/zwischen Recovery-Prüfung und Start real entziehen;
- Notifications vor/zwischen Recovery-Prüfung und Start real entziehen;
- frischen nativen Prerequisite-Stop nach angenommenem Start beobachten;
- aktive Ziel-App nach bestätigtem Dienststart deinstallieren und `target_app_missing` bei Recovery real bestätigen;
- mehrere aktive Ziele testen: eines deinstalliert, mindestens eines installiert → Recovery muss weiterlaufen;
- erfolgreichen Übergang zu `active` bestätigen;
- OEM-/Background-Kill-Verhalten auf der Device Matrix prüfen.
