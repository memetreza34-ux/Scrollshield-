# ScrollShield – Engineering Checks

Status: **verbindlicher technischer Verifikationsvertrag**

Letzte Aktualisierung: **25. August 2026**

## Grundregel

Es gibt drei Ebenen:

1. **Source Contract** – verlangter Vertrag ist im Repository vorhanden.
2. **Executed Test** – Test/Build wurde auf dem exakten Commit tatsächlich ausgeführt.
3. **Release Evidence** – Ergebnis ist eindeutig Candidate-SHA, Version Name und Version Code zugeordnet.

Ein Source-Checker ist niemals ein ausgeführter Android-Test.

## Zentrale Verify-Kette

```bash
npm run verify
```

Die Kette umfasst unter anderem:

- TypeScript/Lint/Prettier;
- Android Project + Instrumentation Source Contract;
- Supply Chain;
- Native Drain/ACK/Retention;
- Usage Flush Worker;
- Prerequisite/System-Stop-Codes;
- Lifecycle/Diagnostics;
- **repo-weiten Native-Stop-Atomicity-Guard**;
- **Android Protection Start Handshake**;
- Process-Loss + Protection-Recovery;
- Device Matrix;
- Migration/Release/Privacy/Store/Security Checks;
- Vitest, Build, PWA und Bundle Checks.

## Native Stop Atomicity

```bash
npm run check:native-stop-atomicity
```

Detaillierte Spezifikation: `docs/NATIVE_STOP_ATOMICITY.md`.

Der Checker scannt rekursiv alle produktiven Java-Dateien unter:

```text
android/app/src/main/java/app/scrollshield/mobile
```

Er erzwingt:

- außerhalb `ScrollShieldNativePlugin.java` keine direkten `setProtectionEnabled(...)`-Aufrufe;
- außerhalb `ScrollShieldNativePlugin.java` keine direkten `recordProtectionStop(...)`-Aufrufe;
- im Native Plugin genau zwei direkte Disable-Fallback-Writes;
- `recordProtectionStop(...)` nur als Deklaration plus die zwei zentralen Fallback-Aufrufe;
- beide Wrapper müssen `atomic primary -> commit failure -> direct fallback` einhalten.

Die zwei erlaubten Fallback-Wrapper sind:

```text
persistProtectionSystemStopWithFallback(...)
persistProtectionTerminalStopWithFallback(...)
```

System-Stops schreiben atomar `enabled=false + warning/system + timestamp + code + message`.
Explizite Terminal-Stopps schreiben atomar `enabled=false + timestamp + code + message` und verändern die Event-Queue nicht.

## Android Protection Start Handshake

```bash
npm run check:start-handshake
```

Detaillierte Spezifikation: `docs/PROTECTION_START_HANDSHAKE.md`.

Der Startvertrag trennt Aktivierungsabsicht und bestätigten Foreground-Start:

```text
recordProtectionStartRequested(...)
→ enabled=true + lastStartRequestAt in einem Commit
→ startForegroundService/startService
→ startForeground(...)
→ recordProtectionServiceStarted(...)
→ lastStartAt dauerhaft gespeichert
→ erst dann RUNNING=true
```

Pflichtgrenzen:

- kein separates `setProtectionEnabled(context, true)` im produktiven Startpfad;
- Request-Commit-Fehler → `START_FAILED`, fail-closed, kein Service-Start;
- bestätigter Start darf erst hinter erfolgreichem `startForeground(...)` persistiert werden;
- Confirmation-Commit-Fehler → `START_FAILED` + Exception vor `RUNNING=true`;
- bereits `running && enabled` → Native-Start ist idempotent;
- `lastStartRequestAt` wird separat im Native-Status an TypeScript geliefert.

Health-Klassifizierung:

```text
neuer Request, <= 15 s, noch keine Bestätigung
→ start-pending

neuer Request, > 15 s, keine Bestätigung, Dienst läuft nicht
→ start-interrupted

bestätigter lastStartAt > lastStopAt, Dienst später nicht mehr laufend
→ unclean-process-stop
```

Damit darf ein Prozessabbruch **vor** bestätigtem Foreground-Start nicht als echter Post-Start-Process-Kill erscheinen.

`check:start-handshake` ist Pflichtbestandteil von:

```text
npm run verify
npm run readiness
```

## Android Instrumentation

```bash
npm run check:android-instrumentation
cd android
./gradlew connectedDebugAndroidTest --no-daemon --stacktrace
```

Vorhandene Instrumentation-Verträge umfassen u. a.:

- `ProtectionStateInstrumentedTest.java`;
- `ManifestSecurityInstrumentedTest.java`;
- `BootRecoveryInstrumentedTest.java`;
- `NativeDrainBatchInstrumentedTest.java`;
- `NativeRetentionInstrumentedTest.java`;
- `UsageFlushInstrumentedTest.java`;
- `ProtectionDiagnosticsInstrumentedTest.java`.

`ProtectionDiagnosticsInstrumentedTest` schützt:

- getrennte Request-/Confirmed-Start-Evidence über `startRequestAndConfirmedStartPersistAsDistinctLifecycleEvidence`;
- atomare Prerequisite-/System-Stops;
- `START_FAILED`;
- `UNEXPECTED_SERVICE_DESTROY_CODE`;
- atomare `manual_app_stop`-/`notification_action_stop`-Terminal-Stopps;
- unveränderte Event-Queue bei bewussten Terminal-Stopps;
- stabile Stop-Codes unabhängig vom Meldungstext.

Der neue Start-Test beweist source-seitig den erwarteten Ablauf:

```text
kein Request / kein Start
→ recordProtectionStartRequested
→ enabled=true + requestAt > 0 + lastStartAt == 0
→ recordProtectionServiceStarted
→ lastStartAt >= requestAt
```

Erst ein real ausgeführter Instrumentation-Lauf macht daraus Evidence.

## Android JUnit / Build

```bash
cd android
./gradlew testDebugUnitTest assembleDebug --no-daemon --stacktrace
```

Dieser Lauf muss u. a. Coordinator-/Worker-/Stop-Code-/Lifecycle-Tests sowie den Debug-Build real ausführen.

## Process-Loss / Recovery

Ein harter Process-Kill bleibt getrennt von `unexpected_service_destroy` und von einem abgebrochenen Pre-Confirmation-Start.

### Abbruch vor bestätigtem Start

```text
running == false
enabled == true
lastStartRequestAt > max(lastStartAt, lastStopAt)
```

Innerhalb von 15 Sekunden: `start-pending`.
Danach: `start-interrupted`.

Dieser Pfad bietet einen normalen Neustart, nicht die Process-Loss-Recovery.

### Abbruch nach bestätigtem Start

```text
running == false
enabled == true
lastStartAt > 0
lastStartAt > lastStopAt
lastStartRequestAt <= lastStartAt
→ unclean-process-stop
```

Danach muss `Schutz wiederherstellen` real zu `running && enabled && health == active` führen.

## Aktuelle Ausführungsgrenze

GitHub Actions liefert auf diesem Draft-Branch weiterhin Verify-Jobs ohne ausgeführte Steps (`steps: null`). Die exakte Head-SHA und der zugehörige aktuelle Lauf werden in PR #8 geführt, ohne diesen technischen Vertrag mit jeder Commit-SHA neu schreiben zu müssen.

Deshalb sind aktuell **nicht als bestanden belegt**:

- `npm run verify`;
- `check:native-stop-atomicity`;
- `check:start-handshake`;
- `check:lifecycle`;
- `check:android-instrumentation`;
- `check:prerequisite-stop-codes`;
- `check:process-loss`;
- `check:protection-recovery`;
- Android JUnit;
- Android Instrumentation;
- Gradle Debug Build;
- APK;
- reale Start-Handshake-/Process-Kill-Evidence.

## Reihenfolge nach Entsperrung

1. `npm ci`;
2. `npm run verify`;
3. `./gradlew testDebugUnitTest assembleDebug --no-daemon --stacktrace`;
4. `./gradlew connectedDebugAndroidTest --no-daemon --stacktrace`;
5. Prozess zwischen `lastStartRequestAt` und `lastStartAt` beenden → `start-pending` → `start-interrupted` → normaler Retry → `active`;
6. Prozess **nach** bestätigtem `lastStartAt` hart beenden → `unclean-process-stop` → `Schutz wiederherstellen` → `active`;
7. realer App-Stopp → `manual_app_stop`, kein neues `warning/system`-Event;
8. realer Notification-Stopp → `notification_action_stop`, kein neues `warning/system`-Event;
9. reale Native-/Foreground-/Destroy-Systemfehler → exakter Code + Warn-Event;
10. Boot/App-Update, Permission-Loss, Target-App-Verlust;
11. Physical Device Matrix, V0.7-Migration, 12h/OEM/Batterie;
12. finaler Supply-Chain-/Binary-/Security-Audit;
13. erst danach Candidate Freeze und Release.
