# ScrollShield – Native Stop Atomicity

Status: **verbindlicher Source-Vertrag; reale Android-Ausführung ausstehend**

## Ziel

Jeder produktive Android-Schutzstopp muss zuerst über eine atomare Persistenztransaktion laufen. Direkte Kombinationen aus `setProtectionEnabled(..., false)` und `recordProtectionStop(...)` dürfen nicht wieder in Service-, Receiver- oder Plugin-Aufrufern entstehen.

## Zwei erlaubte Stop-Klassen

### System-Stop

`recordProtectionSystemStop(...)` schreibt in einem synchronen Commit:

- `enabled=false`;
- `warning/system`-Event;
- Stop-Zeitpunkt;
- stabilen Stop-Code;
- Stop-Nachricht.

Produktive System-Aufrufer verwenden `persistProtectionSystemStopWithFallback(...)`.

### Expliziter Terminal-Stop

`recordProtectionTerminalStop(...)` schreibt in einem synchronen Commit:

- `enabled=false`;
- Stop-Zeitpunkt;
- stabilen Stop-Code;
- Stop-Nachricht.

Die Event-Queue bleibt unverändert. Produktive bewusste/caller-supplied Stopps verwenden `persistProtectionTerminalStopWithFallback(...)`.

## Einzige erlaubte direkte Fallback-Writes

Nur wenn der jeweilige atomare `SharedPreferences.commit()` `false` liefert, dürfen die beiden zentralen Wrapper als Best-Effort-Fallback direkt ausführen:

```text
setProtectionEnabled(context, false)
recordProtectionStop(context, reasonCode, description)
```

Diese zwei Fallback-Blöcke sind die einzigen produktiv erlaubten direkten Disable-/Stop-Diagnose-Kombinationen.

## Repo-weite Guardrail

```bash
npm run check:native-stop-atomicity
```

`scripts/check-native-stop-atomicity.ts`:

1. scannt rekursiv alle `.java`-Dateien unter `android/app/src/main/java/app/scrollshield/mobile`;
2. verbietet `setProtectionEnabled(...)` in allen produktiven Java-Dateien außerhalb `ScrollShieldNativePlugin.java`;
3. verbietet `recordProtectionStop(...)` in allen produktiven Java-Dateien außerhalb `ScrollShieldNativePlugin.java`;
4. erwartet im Native Plugin genau zwei direkte Disable-Fallback-Writes;
5. erwartet `recordProtectionStop(...)` nur als Methodendeklaration plus die zwei zentralen Fallback-Aufrufe;
6. prüft für System- und Terminal-Wrapper die Reihenfolge `atomic primary -> commit failure -> direct fallback`.

Der Check ist Pflichtbestandteil von:

- `npm run verify`;
- `npm run readiness`.

## Aktueller Audit-Stand

Die produktiven Native-Aufrufer verwenden derzeit:

- `ScrollShieldBootReceiver` -> atomarer System-Stop-Wrapper;
- `ScrollShieldProtectionService` -> System- oder Terminal-Stop-Wrapper je nach Semantik;
- `ScrollShieldNativePlugin.stopProtectionService(...)` -> atomarer Terminal-Stop-Wrapper;
- `ScrollShieldDiagnosticsPlugin` -> read-only;
- `ScrollShieldNotificationPlugin` -> Permission/Settings-only.

Damit ist im aktuellen Source kein weiterer absichtlicher produktiver Drei-/Zwei-Write-Stop-Pfad vorgesehen.

## Evidence-Grenze

Dieser Checker ist **Source Evidence**, keine ausgeführte Android-Evidence. Solange GitHub Actions vor Step 1 blockiert sind, ist nicht belegt, dass der Checker, Android JUnit, Instrumentation oder der Gradle-Build auf dem aktuellen Head erfolgreich laufen.

Nach CI-Entsperrung müssen mindestens folgen:

1. `npm run verify`;
2. `./gradlew testDebugUnitTest assembleDebug --no-daemon --stacktrace`;
3. `./gradlew connectedDebugAndroidTest --no-daemon --stacktrace`;
4. realer App-Stopp und Notification-Stopp ohne neues `warning/system`-Event;
5. reale Systemstopps mit exaktem Warn-Event/Code;
6. Process-Kill separat über `unclean-process-stop` validieren.
