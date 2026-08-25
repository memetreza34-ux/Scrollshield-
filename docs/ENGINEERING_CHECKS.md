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

Die Kette umfasst unter anderem TypeScript/Lint/Prettier, Android Project/Instrumentation, Supply Chain, Native Drain/ACK/Retention, Usage Flush Worker, Stop-Codes, Lifecycle/Diagnostics, `check:native-stop-atomicity`, `check:start-handshake`, Process-Loss/Recovery, Device Matrix, Migration/Release/Privacy/Store/Security, Vitest, Build, PWA und Bundle Checks.

## Native Stop Atomicity

```bash
npm run check:native-stop-atomicity
```

Spezifikation: `docs/NATIVE_STOP_ATOMICITY.md`.

Direkte produktive Disable-/Stop-Diagnose-Writes sind nur in den zwei zentralen Commit-Failure-Fallbacks erlaubt:

```text
persistProtectionSystemStopWithFallback(...)
persistProtectionTerminalStopWithFallback(...)
```

System-Stops schreiben atomar `enabled=false + warning/system + timestamp + code + message`.
Explizite Terminal-Stopps schreiben atomar `enabled=false + timestamp + code + message` und verändern die Event-Queue nicht.

## Android Protection Start Handshake und Race Ordering

```bash
npm run check:start-handshake
```

Spezifikation: `docs/PROTECTION_START_HANDSHAKE.md`.

Der Startvertrag trennt:

```text
lastStartRequestAt  = Start angefordert
lastStartAt         = Foreground-Start bestätigt
lastStopAt          = terminaler Stopp
```

Alle relevanten Native-Lifecycle-Writes werden unter `EVENT_LOCK` serialisiert und über `ProtectionStartHandshakePolicy.nextLifecycleTimestamp(...)` logisch streng geordnet.

Wichtige Invarianten:

- kein separates `enabled=true` im produktiven Startpfad;
- Request vor Plugin-/Boot-/Update-Service-Start;
- frischer Pending-Start <= 15 s wird nativ idempotent behandelt und nicht erneut timestamped;
- `RUNNING=true` erst nach erfolgreichem `startForeground(...)` und `CONFIRMED`;
- verspätete Confirmation nach neuerem Stop → `SUPERSEDED_BY_STOP`;
- der Stop-Code, die Stop-Nachricht und Event-Evidence bleiben dabei unverändert;
- echter Restart nach Stop erhält strikt `newRequestAt > lastStopAt`;
- eine bereits existierende Service-Instanz bestätigt einen neuen Restart-Request in `onStartCommand()`;
- verspätetes `onDestroy()` einer alten Instanz darf eine neue Restart-Generation nicht als `unexpected_service_destroy` überschreiben;
- Confirmation-Persistenzfehler → `START_FAILED`, fail-closed.

Health-Klassifizierung:

```text
neuer unbestätigter Request <= 15 s → start-pending
neuer unbestätigter Request > 15 s  → start-interrupted
bestätigter Start später ohne Stopp  → unclean-process-stop
```

## Android Instrumentation

```bash
npm run check:android-instrumentation
cd android
./gradlew connectedDebugAndroidTest --no-daemon --stacktrace
```

`ProtectionDiagnosticsInstrumentedTest` schützt source-seitig jetzt insbesondere:

```text
startRequestAndConfirmedStartPersistAsDistinctLifecycleEvidence
terminalStopWinsAgainstDelayedStartConfirmationWithoutOverwrite
restartRequestAdvancesBeyondLatestStopBoundary
```

Damit wird verlangt:

- Confirmed-Start ist strikt neuer als sein Request;
- terminaler Stop ist strikt neuer als der vorherige Request;
- verspätete Confirmation liefert `SUPERSEDED_BY_STOP` und schreibt kein neues `lastStartAt`;
- Stop-Code/-Nachricht/Event-Queue bleiben unverändert;
- sofortiger Restart erzeugt eine strikt neuere Request-Generation und kann bestätigt werden.

Zusätzlich bleiben Prerequisite-/System-/Terminal-Stop-, Boot-Recovery-, Usage-Flush- und Manifest-Verträge bestehen.

## Android JUnit / Build

```bash
cd android
./gradlew testDebugUnitTest assembleDebug --no-daemon --stacktrace
```

Neu relevant sind:

- `ProtectionStartHandshakePolicyTest`;
- `ProtectionServiceLifecyclePolicyTest` mit Fast-Restart-/Pre-Confirmation-Grenzen;
- bestehende Coordinator-/Worker-/Stop-Code-/Lifecycle-Tests.

## Device-Evidence

`docs/ANDROID_DEVICE_TEST_MATRIX.md` verlangt zusätzlich:

- `LIFE-12`: terminaler Stop gewinnt vor verspäteter Confirmation;
- `LIFE-13`: Pending-Doppelstart erzeugt keine neue Generation;
- `LIFE-14`: sofortiger Stop→Restart wird nicht durch altes `onDestroy()` zerstört.

Der Debug-Screen und der kopierte Native-Snapshot müssen sichtbar enthalten:

```text
lastProtectionStartRequestAt
lastProtectionStartAt
lastProtectionStopAt
lastProtectionStopCode
lastProtectionStopMessage
```

## Process-Loss / Recovery

Pre-Confirmation-Abbruch und echter Post-Start-Process-Kill bleiben getrennt.

```text
lastStartRequestAt > max(lastStartAt,lastStopAt)
→ start-pending / start-interrupted
```

```text
lastStartAt > lastStopAt
lastStartRequestAt <= lastStartAt
running=false && enabled=true
→ unclean-process-stop
```

Nur der zweite Fall verwendet `Schutz wiederherstellen`.

## Aktuelle Ausführungsgrenze

GitHub Actions liefert auf diesem Draft-Branch weiterhin Verify-Jobs ohne ausgeführte Steps (`steps: null`). Die exakte aktuelle Head-SHA und der zugehörige Lauf werden in PR #8 geführt.

Deshalb sind aktuell **nicht als bestanden belegt**:

- `npm run verify`;
- `check:native-stop-atomicity`;
- `check:start-handshake`;
- `check:lifecycle`;
- `check:android-instrumentation`;
- Android JUnit;
- Android Instrumentation;
- Gradle Debug Build;
- APK;
- `LIFE-12` bis `LIFE-14`;
- reale Process-Kill-/Start-/Stop-Race-Evidence.

## Reihenfolge nach Entsperrung

1. `npm ci`;
2. `npm run verify`;
3. `./gradlew testDebugUnitTest assembleDebug --no-daemon --stacktrace`;
4. `./gradlew connectedDebugAndroidTest --no-daemon --stacktrace`;
5. `LIFE-12`: Stop vor verspäteter Confirmation;
6. `LIFE-13`: doppelter Start während `start-pending`;
7. `LIFE-14`: sofortiger Stop→Restart vor altem `onDestroy()`;
8. Pre-Confirmation-Abbruch → `start-interrupted` → Retry;
9. Post-Start-Process-Kill → `unclean-process-stop` → Recovery;
10. App-/Notification-Stopp, Start-/Foreground-/Destroy-Fehler, Boot/App-Update, Permission-Loss, Target-App-Verlust;
11. Physical Device Matrix, V0.7-Migration, 12h/OEM/Batterie;
12. finaler Supply-Chain-/Binary-/Security-Audit;
13. erst danach Candidate Freeze und Release.
