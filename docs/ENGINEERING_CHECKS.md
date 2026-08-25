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

Der Checker ist Pflichtbestandteil von:

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

- atomare Prerequisite-/System-Stops;
- `START_FAILED`;
- `UNEXPECTED_SERVICE_DESTROY_CODE`;
- atomare `manual_app_stop`-/`notification_action_stop`-Terminal-Stopps;
- unveränderte Event-Queue bei bewussten Terminal-Stopps;
- stabile Stop-Codes unabhängig vom Meldungstext.

## Android JUnit / Build

```bash
cd android
./gradlew testDebugUnitTest assembleDebug --no-daemon --stacktrace
```

Dieser Lauf muss u. a. Coordinator-/Worker-/Stop-Code-/Lifecycle-Tests sowie den Debug-Build real ausführen.

## Process-Loss / Recovery

Ein harter Process-Kill bleibt getrennt von `unexpected_service_destroy`.

```text
running == false
enabled == true
lastStartAt > 0
lastStartAt > lastStopAt
→ unclean-process-stop
```

Danach muss `Schutz wiederherstellen` real zu `running && enabled && health == active` führen.

## Aktuelle Ausführungsgrenze

Aktueller Head:

```text
51ff9f3b243ebb4209ebdbb14b71f742e8d721ad
```

Verify **#1294** (`32807979640`) wurde für diesen Head registriert. Job `verify` (`97681680254`) endete mit `steps: null`.

Deshalb sind aktuell **nicht als bestanden belegt**:

- `npm run verify`;
- `check:native-stop-atomicity`;
- `check:lifecycle`;
- `check:android-instrumentation`;
- `check:prerequisite-stop-codes`;
- `check:process-loss`;
- `check:protection-recovery`;
- Android JUnit;
- Android Instrumentation;
- Gradle Debug Build;
- APK.

## Reihenfolge nach Entsperrung

1. `npm ci`;
2. `npm run verify`;
3. `./gradlew testDebugUnitTest assembleDebug --no-daemon --stacktrace`;
4. `./gradlew connectedDebugAndroidTest --no-daemon --stacktrace`;
5. realer App-Stopp → `manual_app_stop`, kein neues `warning/system`-Event;
6. realer Notification-Stopp → `notification_action_stop`, kein neues `warning/system`-Event;
7. reale Start-/Foreground-/Destroy-Systemfehler → exakter Code + Warn-Event;
8. echter Process-Kill → `unclean-process-stop` → Recovery;
9. Boot/App-Update, Permission-Loss, Target-App-Verlust;
10. Physical Device Matrix, V0.7-Migration, 12h/OEM/Batterie;
11. finaler Supply-Chain-/Binary-/Security-Audit;
12. erst danach Candidate Freeze und Release.
