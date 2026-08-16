# ScrollShield – Engineering Checks

Status: **verbindlicher technischer Verifikationsvertrag**

Letzte Aktualisierung: **16. August 2026**

Zentraler Source-/Web-Verifikationsbefehl:

```bash
npm run verify
```

`npm run verify` ist notwendig, aber nicht hinreichend für einen Release. Android-JUnit, Instrumentation, echte APK/AAB-Builds und physische Geräte-Evidence bleiben separate reale Nachweise.

## 1. Grundregel

Es gibt drei Ebenen:

1. **Source Contract** – verlangter Vertrag ist im Repository vorhanden.
2. **Executed Test** – Test/Build wurde auf dem exakten Commit tatsächlich ausgeführt.
3. **Release Evidence** – Ergebnis ist eindeutig Candidate-SHA, Version Name und Version Code zugeordnet.

Ein Source-Checker ist niemals ein ausgeführter Android-Test.

## 2. Aktuelle `verify`-Kette

`npm run verify` umfasst unter anderem:

- Runtime-Versionen;
- TypeScript / ESLint / Prettier;
- Version-Konsistenz;
- Android-Projektvertrag;
- Android-Instrumentation-Source-Vertrag;
- Supply Chain;
- Native Drain/ACK/Factory Reset;
- Native Retention;
- **Usage Flush Coordinator + Worker + produktive Service-Verdrahtung**;
- Device Matrix;
- Lifecycle/Diagnostik;
- Overlay Accessibility;
- Native Usage Accounting;
- Protection Config;
- Release Surface;
- Commitment;
- Subscription Safety;
- V0.7-Migration;
- Release Approval;
- Transparency;
- SDK Registry;
- Third-Party Notices;
- Secret Scan;
- Store Assets;
- Release Readiness;
- Vitest;
- Accessibility Source Checks;
- Vite/PWA/Privacy/Bundle Checks.

## 3. Android Project / Instrumentation

```bash
npm run check:android
npm run check:android-instrumentation
```

Der Android-Vertrag schützt unter anderem SDK-/Package-Konfiguration, Signing, `allowBackup=false`, Cleartext-Verbot, FGS/Boot Receiver, scoped Package Visibility, Native Bridge, explizite Schutzaktivierung, Safe-Shutdown und die Regel-/Recovery-Verknüpfung.

Vorhandene `androidTest`-Verträge:

- `ProtectionStateInstrumentedTest.java`;
- `ManifestSecurityInstrumentedTest.java`;
- `BootRecoveryInstrumentedTest.java`;
- `NativeDrainBatchInstrumentedTest.java`;
- `NativeRetentionInstrumentedTest.java`;
- `UsageFlushInstrumentedTest.java`.

`UsageFlushInstrumentedTest` verlangt auf Android:

- den Produktionsfactory-Pfad `UsageFlushWorker.forSharedPreferences(...)` gegen echte `SharedPreferences`;
- persistierten Coordinator-Batch nach Worker-Abschluss;
- Shutdown-Drain, während ein erster Write künstlich In-Flight gehalten wird;
- Erhalt und anschließende Persistenz von Usage, die während dieses In-Flight-Writes neu eintrifft.

`check:android-instrumentation` verlangt diese Methoden im Sourcevertrag ausdrücklich. Das ist noch keine ausgeführte Instrumentation.

G7 bleibt **TEILWEISE**, weil reale Instrumentation sowie verbleibende Service-/Overlay-/Permission-Loss-/Notification-/OEM-E2E-Fälle fehlen.

## 4. Supply Chain

```bash
npm run check:supply-chain
```

Schützt Lockfile-/Dependency-Vertrag, HTTPS-Auflösungen, Gradle-Distributionshost, SHA-256 und blockiert dynamische Gradle-Versionen/Plain-HTTP-Repositories.

Gradle 8.14.3:

```text
ed1a8d686605fd7c23bdf62c7fc7add1c5b23b2bbc3721e661934ef4a4911d7c
```

Finaler Advisory-Review, Dependency Report, SBOM und Binary Audit bleiben separat offen.

## 5. Native Drain / ACK / Reset

```bash
npm run check:native-drain-ack
```

Pflichtvertrag:

- `pending_protection_drain_v1` hält einen persistenten UUID-Batch;
- Event Queue wird nur zusammen mit dem Pending-Batch geleert;
- Usage-Cursor erst beim passenden ACK;
- falsches/inkonsistentes ACK fail-closed;
- neue Usage/Events bleiben für Folgebatches erhalten;
- React speichert Stats/History + `__scrollshieldNativeDrain.lastProcessedBatchId` vor ACK;
- Replay eines bereits gespeicherten Batch führt nicht zur Doppeladdition;
- `factory_reset_pending_v1` verhindert Wiederkehr verspäteter Native-Writes.

## 6. Native Retention

```bash
npm run check:native-retention
```

Vertrag:

- Cleanup erst nach durablem ACK;
- aktuelle + vorherige Open-/Emergency-Partition bleiben;
- Raw Usage nur außerhalb des 30-Tage-Horizonts und nur bei `current == exported`;
- unbestätigte/inkonsistente/malformed Usage bleibt;
- Raw-Counter + Exportcursor werden gemeinsam entfernt.

## 7. Usage Flush Coordinator + Worker

```bash
npm run check:usage-flush-worker
```

Dieser Checker schützt jetzt die **produktive Service-Integration** und nicht mehr nur eine vorbereitete Foundation.

### `UsageFlushCoordinator.java`

Pure-Java-State-Machine:

- synchronisierte Pending-/In-Flight-Verwaltung;
- maximal ein aktiver Flush;
- atomarer Snapshot aus Pending → In-Flight;
- Snapshot ist immutable;
- neue Usage während des Writes bleibt separat pending;
- Success nur für passende Batch-ID;
- Failure-Mergeback ohne Verlust;
- stale Completion wird ignoriert;
- `getUnpersistedUsageMs()` umfasst Pending + In-Flight;
- Intervall + Force-Pfad;
- saturierende Addition gegen Long-Overflow.

### `UsageFlushWorker.java`

Produktiver serieller Writer:

- `Executors.newSingleThreadExecutor(...)`;
- eingefrorene Batches werden im Worker geschrieben;
- SharedPreferences nutzt dort bewusst `commit()`, damit `false` beobachtbar bleibt;
- `commit=false` → Coordinator Failure/Mergeback;
- Runtime-Exception → Failure/Mergeback;
- `RejectedExecutionException` → Batch zurück nach Pending;
- `close()` → orderly `shutdown()`;
- `closeAfterDrainingPending()` queued einen finalen Drain vor dem Executor-Shutdown;
- der Final-Drain verarbeitet Pending Usage nach einem vorherigen In-Flight-Write;
- ein fehlgeschlagener In-Flight-Batch kann im Final-Drain erneut versucht werden;
- `awaitTermination(...)` steht für Tests/kontrollierte Diagnosepfade zur Verfügung.

### Produktive `ScrollShieldProtectionService`-Verdrahtung

Der Checker verlangt:

- Coordinator + Worker werden beim Start initialisiert;
- die alte Service-eigene `pendingUsageMs`-Map ist entfernt;
- der alte Service-eigene `lastUsageFlushMs`-Timer ist entfernt;
- `addPendingUsageBucket()` delegiert an den Coordinator;
- `flushPendingUsage()` startet nur einen Coordinator-Batch und submitted ihn an den Worker;
- Daily Limit = persisted + Coordinator Pending/In-Flight, saturierend;
- direkter periodischer `SharedPreferences.commit()` ist aus dem Protection Service entfernt;
- `onDestroy()` erfasst den letzten Tick, fordert einen Force-Flush an und startet den seriellen Shutdown-Drain.

### JUnit

`UsageFlushCoordinatorTest.java`:

- Intervall/Force;
- kein paralleler Flush;
- neue Usage während In-Flight;
- Success;
- Failure-Mergeback;
- stale Completion;
- Daily-Limit-View;
- invalid Input;
- Overflow.

`UsageFlushWorkerTest.java`:

- erfolgreicher Background-Write;
- Commit-Failure;
- Writer-Exception;
- blockierter Worker + gleichzeitig neue Usage;
- Shutdown-Drain mit neuer Pending Usage während In-Flight;
- Retry eines beim Shutdown fehlgeschlagenen In-Flight-Batches;
- Rejection nach Worker-Shutdown.

### Android Instrumentation

`UsageFlushInstrumentedTest.java` ergänzt den Pure-Java-Vertrag mit echten Android-`SharedPreferences`.

Noch offen ist die **reale Ausführung** dieser Tests sowie echte Service-/Process-Kill-/Restart-Evidence.

## 8. Storage Migration

```bash
npm run check:migration
```

Schützt V0.7-/Legacy-Migration inklusive `_pending`-Staging, exakter Read-Back-Verifikation, Recovery, bytegenauem Legacy-Archiv, Alt-Ereignis-Konvertierung, Export/Import und Recovery-UI.

Reale V0.7-Geräte-Evidence bleibt Pflicht.

## 9. Lifecycle / Usage Accounting

```bash
npm run check:lifecycle
npm run check:diagnostic-normalization
npm run check:usage-accounting
```

Schützt Lifecycle-Wahrheit, stabile Diagnosecodes, lokale Tagesgrenzen, keine negative Usage bei rückwärts laufender Uhr, Tag+App-Bucketing, Tageslimit und Anti-Binge über Mitternacht.

Die Worker-/Usage-Checker müssen gemeinsam verhindern, dass die neue Persistenzarchitektur Tageslimits während Pending/In-Flight-Zuständen unterzählt oder Usage bei kontrolliertem Shutdown verliert.

## 10. Device Matrix / Privacy / Release Gate

```bash
npm run check:device-matrix
npm run check:privacy
npm run check:release-approval
npm run release:gate
```

- Device-Matrix-Checker beweist nur den Testplan, nicht dessen Durchführung.
- Privacy blockiert Tracking-/Netzwerkpfade und `android.permission.INTERNET`.
- Release Approval Schema v2 verlangt kandidatgebundene Evidence.

## 11. Android CI Stage

Nach `npm run verify` soll CI ausführen:

```bash
cd android
./gradlew testDebugUnitTest assembleDebug --no-daemon --stacktrace
```

Damit werden die Coordinator-/Worker-JUnit und der Android-Debug-Build ausgeführt.

Instrumentation benötigt zusätzlich Emulator/Gerät, zum Beispiel:

```bash
cd android
./gradlew connectedDebugAndroidTest --no-daemon --stacktrace
```

Ein erfolgreicher Source-Checker ersetzt diesen Lauf nicht.

## 12. Aktuelle Ausführungsgrenze

GitHub-hosted Actions starten derzeit wegen Billing-/Spending-Limit nicht und enden vor Step 1 mit leerer Step-Liste und ohne Runner.

Deshalb sind aktuell **nicht als bestanden belegt**:

- `npm run verify`;
- `check:usage-flush-worker`;
- `check:android-instrumentation`;
- `UsageFlushCoordinatorTest`;
- `UsageFlushWorkerTest`;
- `UsageFlushInstrumentedTest`;
- TypeScript/Lint/Prettier/Vitest;
- Android JUnit/Instrumentation;
- Gradle Debug Build;
- APK;
- physische Geräte-Matrix.

## 13. Reihenfolge nach Entsperrung

1. sauberer Checkout + `npm ci`;
2. `npm run verify`;
3. `./gradlew testDebugUnitTest assembleDebug --no-daemon --stacktrace`;
4. Coordinator-/Worker-JUnit und Service-Kompilierung bestätigen;
5. reale Fehler beheben und erneut ausführen;
6. `./gradlew connectedDebugAndroidTest --no-daemon --stacktrace` auf Emulator/Gerät;
7. `UsageFlushInstrumentedTest` + Native Drain/Retention/Recovery-Instrumentation bestätigen;
8. Shutdown/In-Flight/Process-Kill/Restart-Races testen;
9. Debug APK auf Device Matrix;
10. erst danach Release-Evidence hochstufen.
