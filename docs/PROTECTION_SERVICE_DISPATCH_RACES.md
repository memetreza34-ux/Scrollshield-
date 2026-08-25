# Android Protection Service Dispatch Races

Status: **verbindlicher Source-/Evidence-Vertrag**

Diese Spezifikation ergänzt `PROTECTION_START_HANDSHAKE.md`. Sie beschreibt die Grenze zwischen dauerhaft gespeicherter Lifecycle-Evidence und dem tatsächlichen Android-Aufruf `startForegroundService(...)`, `startService(...)` bzw. `stopService(...)`.

## 1. Problem

Persistenz allein reicht nicht für Race-Sicherheit.

Ohne zusätzliche Serialisierung wäre möglich:

```text
R1 = enabled=true + lastStartRequestAt gespeichert
↓
S1 = manueller Stop gespeichert
↓
verspäteter startForegroundService() aus R1
```

oder:

```text
S1 = enabled=false + Stopdiagnose gespeichert
↓
R2 = neuer Start gespeichert
↓
verspäteter stopService() aus S1
```

Zusätzlich kann eine bereits erzeugte Notification-Aktion aus einer älteren Generation verspätet zugestellt werden. Ohne Generation-Bindung könnte ein alter `ACTION_STOP` nach einem erfolgreichen Restart die neue Aktivierung stoppen.

## 2. Gemeinsame Dispatch-Sperre

Alle produktiven Schutz-Service-Starts und kontrollierten Service-Stopps verwenden:

```text
ProtectionServiceDispatchGuard.LOCK
```

Unter dieser Sperre gehören zusammen:

### Start

```text
aktuellen Zustand prüfen
↓
recordProtectionStartRequested(...)
↓
startForegroundService(...) / startService(...)
```

### Kontrollierter Stop

```text
System-/Terminal-Stop dauerhaft persistieren
↓
dispatchControlledStop(...)
↓
Context.stopService(...)
```

## 3. Lock-Reihenfolge

Wenn beide Locks benötigt werden:

```text
ProtectionServiceDispatchGuard.LOCK
↓
EVENT_LOCK
```

Es darf kein produktiver Pfad entstehen, der zuerst `EVENT_LOCK` hält und danach auf `ProtectionServiceDispatchGuard.LOCK` wartet.

## 4. Startpfade

Die Dispatch-Sperre gilt mindestens für:

- `ScrollShieldNativePlugin.startProtectionService(...)`;
- `ScrollShieldBootReceiver` nach `BOOT_COMPLETED`;
- `ScrollShieldBootReceiver` nach `MY_PACKAGE_REPLACED`;
- `ScrollShieldProtectionService.onCreate()` während Foreground-Erstellung und Startbestätigung;
- einen neueren Start, der über `onStartCommand()` auf eine bereits existierende Service-Instanz geliefert wird.

Ein frischer `start-pending`-Request darf keine zweite Request-Generation erzeugen.

## 5. Stoppfade

Kontrollierte Service-Stopps verwenden `ProtectionServiceDispatchGuard.dispatchControlledStop(...)` statt direktem `stopSelf()` bzw. produktiven direkten `Context.stopService(...)`-Aufrufen.

Dazu gehören mindestens:

- manueller App-Stopp;
- Notification-ACTION_STOP;
- Permission-/Prerequisite-Verlust;
- technische Startfehler;
- fehlgeschlagene Boot-/Update-Recovery;
- Factory-Reset-Service-Teardown.

Der exakte Stop-Code wird vor dem Android-Stop-Dispatch dauerhaft gespeichert.

## 6. Notification-Stop ist an die Lifecycle-Generation gebunden

Die permanente Foreground-Notification trägt in ihrem Stop-`PendingIntent`:

```text
EXTRA_STOP_START_REQUEST_AT = serviceStartRequestAtOnCreate
```

Ein `ACTION_STOP` darf nur akzeptiert werden, wenn:

```text
actionStartRequestAt > 0
UND
actionStartRequestAt == serviceStartRequestAtOnCreate
UND
actionStartRequestAt == latestStartRequestAt
```

Die Entscheidung liegt in:

```text
ProtectionServiceLifecyclePolicy.isCurrentNotificationStopGeneration(...)
```

Fehlt die Generation oder stammt die Aktion aus einer älteren Generation:

```text
stale ACTION_STOP
→ kein Stop-Code
→ keine Stop-Nachricht
→ kein stopService()
→ aktuelle Aktivierung bleibt bestehen
```

Nach erfolgreichem Same-Instance-Restart übernimmt die Instanz die neue Request-Generation und aktualisiert danach die Foreground-Notification. `FLAG_UPDATE_CURRENT | FLAG_IMMUTABLE` hält den aktuell sichtbaren Stop-`PendingIntent` an die neue Generation gebunden. Eine bereits zuvor zugestellte alte Aktion bleibt durch die Policy stale und wird ignoriert.

## 7. Residualer onDestroy nach kontrolliertem Stop

Ein verspäteter `onDestroy()` der alten Stop-Anforderung darf nicht `unexpected_service_destroy` erzeugen, die neue Aktivierung löschen oder neue Request-/Start-Evidence überschreiben.

Dafür hält `ProtectionServiceDispatchGuard` process-lokal einen one-shot controlled-stop Token.

## 8. Token ist bewusst begrenzt

Der Token verwendet `System.nanoTime()` und gilt höchstens:

```text
30 Sekunden
```

Akzeptiert wird nur:

```text
0 <= destroyAge <= 30 s
```

Danach wird der Token verworfen. Ein fehlgeschlagener `stopService()` erzeugt keinen Token.

## 9. RUNNING-Grenze beim Destroy

`ScrollShieldProtectionService.onDestroy()` muss unter der Dispatch-Sperre zuerst:

```text
RUNNING=false
```

veröffentlichen. Erst danach darf ein konkurrierender neuer Start ausgewertet werden.

## 10. Restart auf derselben Service-Instanz

Wird eine neue unbestätigte Request-Generation in `onStartCommand()` erfolgreich bestätigt, übernimmt die Instanz ihre Ownership-Grenze auf den neuen `lastStartRequestAt` und aktualisiert die Foreground-Notification auf dieselbe Generation.

Ein altes `explicitStopRequested=true` darf einen späteren echten unerwarteten Destroy nicht dauerhaft maskieren, sobald die neue Generation dauerhaft bestätigt ist.

## 11. Pure-Java-Testvertrag

`ProtectionServiceDispatchGuardTest` muss beweisen:

- prompten one-shot controlled Destroy;
- abgelaufener Token maskiert keinen späteren echten Destroy;
- rückwärts laufendes Monotonic-Testinput maskiert keinen Destroy;
- fehlgeschlagener Stop-Dispatch erzeugt keinen Suppression-Token.

`ProtectionServiceLifecyclePolicyTest` muss beweisen:

- Notification-Stop wird nur für exakt die aktuelle Lifecycle-Generation akzeptiert;
- fehlende Generation ist ungültig;
- alte Notification-Generation ist nach Restart ungültig;
- alte Service-Generation überschreibt Fast-Restart nicht;
- übertragene Restart-Ownership stellt echte Unexpected-Destroy-Erkennung wieder her;
- ein altes Explicit-Stop-Flag wird durch eine neuere bestätigte Restart-Generation semantisch überholt;
- Pre-Confirmation-Destroy bleibt `start-interrupted` statt `unexpected_service_destroy`.

## 12. Source-Gates

Pflichtchecks:

```text
npm run check:start-handshake
npm run check:lifecycle
```

Die Checks müssen Dispatch-Sperre, bounded Destroy-Token, Restart-Ownership und Generation-Bindung der Notification-Stop-Aktion prüfen.

## 13. Reale Android-Evidence

Source/JUnit-Verträge sind keine Device-Evidence. Exakte mutable Candidate-SHA-/Run-/Job-IDs werden ausschließlich in PR #8 geführt.

Auf dem exakten Release-Kandidaten müssen mindestens folgende Races real provoziert werden:

### DISPATCH-01 — Stop zwischen Request und Android-Start

Kein verspäteter Foreground-Service darf eine bereits terminal gestoppte Generation wieder aktivieren.

### DISPATCH-02 — Restart zwischen Stop-Persistenz und Android-Stop

Die neue Generation darf nicht durch einen verspäteten alten Stop verloren gehen.

### DISPATCH-03 — Residualer Destroy nach Fast-Restart

Der residuale Destroy darf die neue Generation nicht als `unexpected_service_destroy` beenden.

### DISPATCH-04 — später echter Destroy nach Restart

Ein alter/abgelaufener controlled-stop Token darf einen späteren echten Destroy nicht maskieren.

### DISPATCH-05 — alte Notification-Stop-Aktion nach Restart

Erzeuge eine Stop-Aktion aus Generation `R1`, führe Stop → bestätigten Restart auf `R2` aus und provoziere danach die alte/queued `R1`-Aktion.

Erwartung:

```text
R1 ACTION_STOP
R2 aktuelle Generation
→ R1 wird ignoriert
→ enabled bleibt true
→ lastStartRequestAt/lastStartAt bleiben R2
→ kein notification_action_stop
```

Danach muss die aktuell sichtbare `R2`-Notification-Aktion normal stoppen und exakt `notification_action_stop` persistieren.

## 14. Gate-Regel

G4/G7 bleiben `TEILWEISE`, bis JUnit/Instrumentation und diese realen Android-Races auf dem exakten Kandidaten tatsächlich ausgeführt wurden.
