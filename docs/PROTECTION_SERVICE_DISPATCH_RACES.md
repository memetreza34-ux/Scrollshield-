# Android Protection Service Dispatch Races

Status: **verbindlicher Source-/Evidence-Vertrag**

Diese Spezifikation ergänzt `PROTECTION_START_HANDSHAKE.md`. Sie beschreibt die Grenze zwischen dauerhaft gespeicherter Lifecycle-Evidence und dem tatsächlichen Android-Aufruf `startForegroundService(...)`, `startService(...)` bzw. `stopService(...)`.

## 1. Problem

Persistenz allein reicht nicht für Race-Sicherheit.

Ohne zusätzliche Serialisierung wäre beispielsweise möglich:

```text
R1 = enabled=true + lastStartRequestAt gespeichert
↓
S1 = manueller Stop gespeichert
↓
verspäteter startForegroundService() aus R1
```

oder umgekehrt:

```text
S1 = enabled=false + Stopdiagnose gespeichert
↓
R2 = neuer Start gespeichert
↓
verspäteter stopService() aus S1
```

In beiden Fällen wäre die Reihenfolge der Android-Service-Aufrufe nicht mehr dieselbe wie die dauerhaft gespeicherte Lifecycle-Reihenfolge.

Zusätzlich kann eine bereits erzeugte Notification-Aktion aus einer älteren Generation verspätet zugestellt werden. Ohne Generation-Bindung könnte ein alter `ACTION_STOP` nach einem erfolgreichen Restart die neue Aktivierung stoppen.

## 2. Gemeinsame Dispatch-Sperre

Alle produktiven Schutz-Service-Starts und kontrollierten Service-Stopps verwenden:

```text
ProtectionServiceDispatchGuard.LOCK
```

Unter dieser Sperre müssen jeweils zusammengehören:

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

Dadurch kann kein konkurrierender Start oder Stop zwischen Persistenz und zugehörigem Android-Dispatch einspringen.

## 3. Lock-Reihenfolge

Wenn beide Locks benötigt werden, ist die produktive Reihenfolge:

```text
ProtectionServiceDispatchGuard.LOCK
↓
EVENT_LOCK
```

`EVENT_LOCK` darf eigenständig für Event-/Lifecycle-Persistenz verwendet werden. Es darf aber kein produktiver Pfad entstehen, der zuerst `EVENT_LOCK` hält und danach auf `ProtectionServiceDispatchGuard.LOCK` wartet.

Diese Regel verhindert Lock-Inversion/Deadlocks.

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

Der exakte Stop-Code wird weiterhin vor dem Android-Stop-Dispatch dauerhaft gespeichert.

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

Diese Entscheidung liegt in:

```text
ProtectionServiceLifecyclePolicy.isCurrentNotificationStopGeneration(...)
```

Fehlt die Generation oder stammt die Aktion aus einer älteren Generation, gilt:

```text
stale ACTION_STOP
→ kein Stop-Code
→ keine Stop-Nachricht
→ kein stopService()
→ aktuelle Aktivierung bleibt bestehen
```

Nach erfolgreichem Same-Instance-Restart übernimmt die Instanz zuerst die neue Request-Generation und aktualisiert danach die Foreground-Notification. `FLAG_UPDATE_CURRENT` sorgt dafür, dass der aktuell sichtbare Stop-`PendingIntent` die neue Generation trägt. Eine bereits zuvor zugestellte alte Aktion bleibt durch die Policy trotzdem stale und wird ignoriert.

## 7. Residualer onDestroy nach kontrolliertem Stop

`Context.stopService(...)` kann erfolgreich angefordert werden, während fast unmittelbar danach schon eine neue Startgeneration entsteht.

Der spätere `onDestroy()` der alten Stop-Anforderung darf dann **nicht**:

- `unexpected_service_destroy` erzeugen;
- die neue Aktivierung löschen;
- die neue Request-/Start-Evidence überschreiben.

Dafür hält `ProtectionServiceDispatchGuard` process-lokal einen one-shot controlled-stop-Token.

## 8. Token ist bewusst begrenzt

Der Token verwendet `System.nanoTime()` und gilt höchstens:

```text
30 Sekunden
```

Akzeptiert wird nur:

```text
0 <= destroyAge <= 30 s
```

Danach wird der Token verworfen und darf einen späteren echten unerwarteten Destroy nicht mehr unterdrücken.

Der Token wird bei Konsum immer gelöscht. Ein fehlgeschlagener `stopService()`-Aufruf erzeugt keinen Token.

## 9. RUNNING-Grenze beim Destroy

`ScrollShieldProtectionService.onDestroy()` muss unter der Dispatch-Sperre zuerst:

```text
RUNNING=false
```

veröffentlichen.

Erst danach darf ein konkurrierender neuer Start ausgewertet werden. Dadurch kann ein Restart nicht fälschlich als bereits `running && enabled` wegoptimiert werden, obwohl die alte Instanz gerade stirbt.

## 10. Restart auf derselben Service-Instanz

Android kann einen neuen Start an eine noch existierende Instanz über `onStartCommand()` liefern.

Wird dort eine neue unbestätigte Request-Generation erfolgreich bestätigt, muss diese Instanz ihre Ownership-Grenze auf den neuen `lastStartRequestAt` übernehmen.

Danach gilt die Instanz als Besitzerin der neuen bestätigten Generation und aktualisiert die Foreground-Notification auf dieselbe Generation.

Ein altes `explicitStopRequested=true` aus einer vorherigen kontrollierten Stop-Anforderung darf einen späteren echten unerwarteten Destroy **nicht dauerhaft maskieren**, sobald die neue Generation dauerhaft bestätigt ist.

## 11. Pure-Java-Testvertrag

`ProtectionServiceDispatchGuardTest` muss mindestens beweisen:

- erfolgreicher kontrollierter Stop wird von genau einem prompten Destroy konsumiert;
- abgelaufener Token unterdrückt keinen späteren echten Destroy;
- rückwärts laufendes Monotonic-Testinput unterdrückt keinen Destroy;
- fehlgeschlagener Stop-Dispatch erzeugt keinen Suppression-Token.

`ProtectionServiceLifecyclePolicyTest` muss mindestens beweisen:

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

Die Checks müssen die gemeinsame Dispatch-Sperre, den begrenzten Destroy-Token, Restart-Ownership und die Generation-Bindung der Notification-Stop-Aktion prüfen.

## 13. Reale Android-Evidence

Source/JUnit-Verträge sind keine Device-Evidence.

Auf dem exakten Release-Kandidaten müssen mindestens folgende Races real provoziert werden:

### DISPATCH-01 — Stop zwischen Request und Android-Start

Versuche wiederholt, einen manuellen Stop unmittelbar nach dem persistierten Startrequest auszulösen. Es darf keinen verspäteten verwaisten Foreground-Service geben, der die terminale Wahrheit wieder aktiviert.

### DISPATCH-02 — Restart zwischen Stop-Persistenz und Android-Stop

Stoppe einen bestätigten Dienst und starte unmittelbar erneut. Persistenz- und Android-Dispatch-Reihenfolge müssen übereinstimmen; die neue Generation darf nicht durch einen verspäteten alten Stop verloren gehen.

### DISPATCH-03 — Residualer Destroy nach Fast-Restart

Provoziere Stop → sofortiger Restart → alten `onDestroy()`. Der residuale Destroy darf die neue Generation nicht als `unexpected_service_destroy` beenden.

### DISPATCH-04 — später echter Destroy nach Restart

Nach einem erfolgreichen Fast-Restart und nach Ablauf/Verbrauch des controlled-stop-Fensters einen echten unerwarteten Service-Destroy auslösen. Dieser muss wieder als `unexpected_service_destroy` bzw. bei hartem Process-Kill über die bestehende Process-Loss-Evidence sichtbar werden; der alte Stop-Token darf ihn nicht maskieren.

### DISPATCH-05 — alte Notification-Stop-Aktion nach Restart

Erzeuge eine Stop-Aktion aus Generation `R1`, führe anschließend Stop → Restart auf `R2` aus und liefere danach die alte Aktion `R1` aus bzw. provoziere die entsprechende queued-PendingIntent-Situation. Erwartung:

```text
R1 ACTION_STOP
R2 aktuelle Generation
→ R1 wird ignoriert
→ enabled bleibt true
→ lastStartRequestAt/lastStartAt bleiben R2
→ kein notification_action_stop
```

Danach muss die aktuell sichtbare Notification-Aktion von `R2` weiterhin normal stoppen und exakt `notification_action_stop` persistieren.

## 14. Gate-Regel

G4/G7 bleiben `TEILWEISE`, bis JUnit/Instrumentation und diese realen Android-Races auf dem exakten Kandidaten tatsächlich ausgeführt wurden.
