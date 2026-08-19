# ScrollShield – Process-Loss / Restart-Recovery

Status: **Source-Vertrag vorhanden, reale Android-Evidence offen**

Letzte Aktualisierung: **19. August 2026**

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
5. den vorhandenen nativen Startpfad aufrufen;
6. dadurch Usage Access, Overlay, Notifications und installierte Ziel-App erneut nativ prüfen lassen;
7. den Native-Status nach dem Start erneut lesen und zurückgeben.

Der Permissions-Screen prüft zusätzlich vor dem Recovery-Aufruf die aktuell sichtbaren Pflichtzugriffe und mindestens eine aktive App.

## Erfolgsregel

Die UI darf `wiederhergestellt` nur melden, wenn der zurückgelesene Zustand gleichzeitig erfüllt:

```text
running == true
enabled == true
health == active
```

Andernfalls wird nur gemeldet, dass die Wiederherstellung angefordert wurde, aber noch nicht als aktiv bestätigt ist.

## Source-Verifikation

`npm run check:process-loss` schützt:

- die Zeitstempel-Klassifizierung;
- den eigenen Health-State;
- die eigene Recovery-UI;
- `recoverAfterProcessLoss(...)`;
- Doppelstart-Schutz;
- fail-closed Recovery aus falschem Zustand;
- Config-Resync + nativen Startpfad;
- Status-Readback;
- Permissions-Screen-Verdrahtung;
- zugehörige Vitest-/Component-Verträge.

`check:process-loss` ist Bestandteil von `npm run verify` und des Readiness-Reports.

## Noch nicht bewiesen

Dieser Source-Vertrag ersetzt keine reale Android-Evidence. Weiter offen:

- echten Prozess nach bestätigtem Dienststart hart beenden;
- sicherstellen, dass `onDestroy()` dabei nicht als Voraussetzung für die Erkennung benötigt wird;
- App erneut öffnen und `unclean-process-stop` beobachten;
- `Schutz wiederherstellen` ausführen;
- reale Native-Prerequisite-Checks bestätigen;
- erfolgreichen Übergang zu `active` bestätigen;
- fehlende Berechtigung während Recovery separat prüfen;
- OEM-/Background-Kill-Verhalten auf der Device Matrix prüfen.
