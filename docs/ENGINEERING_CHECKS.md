# ScrollShield – Engineering Checks

Status: **verbindlicher technischer Verifikationsvertrag**

Letzte Aktualisierung: **16. August 2026**

ScrollShield verwendet einen zentralen Source-/Web-Verifikationsbefehl:

```bash
npm run verify
```

Dieser Befehl ist notwendig, aber nicht hinreichend für einen Release. Android-JUnit, Instrumentation, echte APK-Builds und physische Geräte-Evidence bleiben separate reale Nachweise.

## 1. Grundregel

Es gibt drei unterschiedliche Ebenen:

1. **Source Contract** – ein Checker bestätigt, dass ein verlangter Vertrag im Repository vorhanden ist.
2. **Executed Test** – ein Test/Build wurde tatsächlich auf dem exakten Commit ausgeführt.
3. **Release Evidence** – das Ergebnis ist eindeutig dem finalen Candidate-SHA, Version Name und Version Code zugeordnet.

Ein Source-Checker darf niemals als ausgeführter Android-Test dargestellt werden.

## 2. Aktuelle `verify`-Kette

`npm run verify` umfasst derzeit unter anderem:

- Runtime-Versionen;
- TypeScript;
- ESLint;
- Prettier;
- Version-Konsistenz;
- Android-Projektvertrag;
- Android-Instrumentation-Source-Vertrag;
- Supply-Chain-Integrität;
- **Native Drain/ACK-/Factory-Reset-Vertrag**;
- **Native Counter Retention**;
- **Usage-Flush-Worker-Foundation**;
- Device-Matrix-Vertrag;
- Lifecycle-Diagnostik;
- Diagnose-Normalisierung;
- Overlay-Accessibility;
- Native Usage Accounting;
- Protection Config;
- Release Surface;
- Commitment;
- Subscription Safety;
- V0.7-/Storage-Migration;
- Release Approval;
- Protection Transparency;
- SDK Registry;
- Third-Party Notices;
- Secret Scan;
- Store Assets/Copy;
- Release Readiness;
- Vitest;
- Accessibility Source Checks;
- Vite Production Build;
- PWA Output;
- Privacy-/Network-Build-Check;
- Bundle Budget.

## 3. Android Project Check

```bash
npm run check:android
```

Schützt unter anderem SDK-/Package-Vertrag, Release-Minification, Signing-Konfiguration, `allowBackup=false`, Cleartext-Verbot, FGS-/Boot-Receiver-Registrierung, scoped Package Visibility, Native Bridge, explizite Schutzaktivierung, Safe-Shutdown, Regeln/Zeiten/Daily-Limit/Anti-Binge/Emergency, Recovery und CI-Buildschritte.

Die tatsächliche Permission-Wahrheit wird zusätzlich durch `check:privacy` und die On-Device-Manifest-Instrumentation geschützt. Android v1 darf derzeit keine `android.permission.INTERNET` besitzen.

## 4. Android Instrumentation Contract

```bash
npm run check:android-instrumentation
```

Verbindlich vorhanden sind derzeit:

### `ProtectionStateInstrumentedTest.java`

- Protection default disabled;
- Startzeit erst durch tatsächlichen Service-Start-Record;
- Deaktivierung persistiert Lifecycle-Wahrheit;
- Diagnosewerte werden normalisiert;
- Ziel-App gilt nur bei installiertem/sichtbarem Package.

### `ManifestSecurityInstrumentedTest.java`

- freigegebener Android-v1-Permission-Satz;
- kein `android.permission.INTERNET`;
- Backup aus;
- Protection Service korrekt registriert/nicht exportiert;
- Boot Receiver korrekt registriert.

### `BootRecoveryInstrumentedTest.java`

- fremde Broadcasts verändern Aktivierung nicht;
- BOOT/App-Update ohne verfügbares Ziel endet fail-closed;
- stabiler Diagnosecode `recovery_target_app_missing`.

### `NativeDrainBatchInstrumentedTest.java`

- Replay bis ACK;
- falsches ACK;
- neue Events während Pending;
- neue Usage oberhalb Snapshot;
- idempotentes ACK;
- Factory-Reset-Tombstone gegen verspätete Writes;
- nur frische Post-Reset-Config darf erhalten bleiben.

### `NativeRetentionInstrumentedTest.java`

- aktuelle/Vortags-Ephemeral-Counter bleiben;
- alte vollständig bestätigte Raw-Usage wird gemeinsam mit Exportcursor entfernt;
- unbestätigte Usage bleibt;
- 30-Tage-Horizont;
- malformed/unrelated Keys bleiben.

Der frühere `ExampleInstrumentedTest.java` wurde entfernt.

G7 bleibt **TEILWEISE**, weil reale Instrumentation sowie Service-/Overlay-/Permission-Loss-/Notification-/OEM-End-to-End-Fälle noch fehlen.

## 5. Supply-Chain Check

```bash
npm run check:supply-chain
```

Schützt Lockfile-/Dependency-Vertrag, HTTPS-Auflösungen, Gradle-Distributionshost, SHA-256 und blockiert dynamische Gradle-Versionen/Plain-HTTP-Repositories.

Gradle 8.14.3 ist gepinnt auf:

```text
ed1a8d686605fd7c23bdf62c7fc7add1c5b23b2bbc3721e661934ef4a4911d7c
```

Das ersetzt keinen echten `npm ci`, Advisory-Review, Dependency Report, SBOM oder Binary Audit.

## 6. Native Drain / ACK / Reset Check

```bash
npm run check:native-drain-ack
```

Pflichtvertrag:

- `pending_protection_drain_v1` speichert einen unveränderlichen Pending-Batch;
- Event Queue wird nur zusammen mit dem Pending-Batch geleert;
- Usage-Exportcursor erst beim passenden ACK;
- falsches/inkonsistentes ACK fail-closed;
- neue Usage/Events bleiben für Folgebatches erhalten;
- React benötigt gültige UUID-Batch-ID;
- `__scrollshieldNativeDrain.lastProcessedBatchId` liegt im transaktionalen Settings-Chunk;
- Stats/History + Batch-ID müssen vor ACK erfolgreich gespeichert sein;
- Replay eines bereits gespeicherten Batch führt nur zum ACK;
- Factory Reset nutzt `factory_reset_pending_v1` und löscht Web-State erst nach Native-Bestätigung.

Die Source-/Testdateien sind noch keine Ausführungsevidence.

## 7. Native Counter Retention Check

```bash
npm run check:native-retention
```

Retention ist produktiv **hinter dem ACK-Gate** verdrahtet:

- aktuelle + vorherige Open-/Emergency-Partition bleiben;
- Raw Usage wird nach 30 lokalen Kalendertagen nur bei `current == exported` entfernt;
- unbestätigte/inkonsistente/malformed Usage bleibt;
- Raw-Counter + Exportcursor werden gemeinsam entfernt;
- Cleanup-Fehler dürfen einen bereits bestätigten React-Batch nicht rückgängig machen.

Tests/Verträge:

- `NativeCounterRetentionPolicyTest.java`;
- `NativeRetentionInstrumentedTest.java`;
- `scripts/check-native-retention.ts`.

## 8. Usage Flush Worker Foundation

```bash
npm run check:usage-flush-worker
```

Dieser neue Source-Checker schützt **noch nicht die fertige Service-Integration**, sondern die Korrektheitsbasis, die vor dem Thread-Umbau vorhanden sein muss.

### `UsageFlushCoordinator.java`

Der Pure-Java-Coordinator besitzt keine Android-I/O-Abhängigkeit und verwaltet synchronisiert:

- Pending Usage;
- genau einen unveränderlichen In-Flight-Snapshot;
- neue Usage, die während des Writes separat pending bleibt;
- Success-Completion nur für die passende Batch-ID;
- Failure-Mergeback ohne Datenverlust;
- Ablehnung stale Worker-Callbacks;
- `getUnpersistedUsageMs()` = Pending + In-Flight für Tageslimits;
- saturierende Addition gegen Long-Overflow;
- normales Flush-Intervall sowie Force-Start für einen späteren kontrollierten Shutdown-Pfad.

### `UsageFlushCoordinatorTest.java`

JUnit deckt ab:

- Intervall + Force;
- kein paralleler zweiter Flush;
- neue Usage während In-Flight;
- Success;
- Failure-Mergeback;
- stale Completion;
- Daily-Limit-View;
- invalid Input;
- Overflow.

### Bewusst noch offen

`ScrollShieldProtectionService.flushPendingUsage()` verwendet aktuell weiterhin synchrones `SharedPreferences.commit()` im Service-Main-Thread. Der Checker **erwartet und dokumentiert diese pre-integration Grenze ausdrücklich**, damit sie nicht fälschlich als gelöst dargestellt wird.

Nach realem Java-/Gradle-Pass muss der Checker verschärft werden und künftig verlangen:

- Single-Thread-Executor im Service;
- Coordinator als einzige Pending/In-Flight-Regelquelle;
- `commit()` nur im Worker;
- Daily-Limit = persisted + Coordinator unpersisted;
- Worker-Failure-Mergeback;
- sauber koordinierter Shutdown ohne parallelen/doppelten Flush.

## 9. Storage Migration Check

```bash
npm run check:migration
```

Schützt die V0.7-/Legacy-Datenmigration einschließlich `_pending`-Staging, exakter Read-Back-Verifikation, Recovery, bytegenauem Legacy-Archiv, sichere Alt-Ereignis-Konvertierung, Export/Import und Recovery-UI.

Reale V0.7-Geräte-Evidence bleibt Pflicht.

## 10. Lifecycle Diagnostics

```bash
npm run check:lifecycle
npm run check:diagnostic-normalization
```

Schützt Lifecycle-Wahrheit, stabile Stop-/Recovery-Codes, Bounds/Normalisierung und ehrliche React-Health-Klassifikation.

## 11. Native Usage Accounting

```bash
npm run check:usage-accounting
```

Schützt:

- Usage-Splitting an lokalen Tagesgrenzen;
- keine negative Usage bei rückwärts laufender Uhr;
- Pending Usage nach Tag + App;
- Flush verwendet den bereits bestimmten Bucket;
- Tageslimit berücksichtigt aktuelle unpersistierte Usage;
- Anti-Binge-Fenster über Mitternacht.

Nach Service-Integration wird dieser Checker zusammen mit `check:usage-flush-worker` auf die Coordinator-Semantik verschärft.

## 12. Device Matrix Contract

```bash
npm run check:device-matrix
```

Schützt den manuellen Testvertrag für Pixel, Samsung, Xiaomi/Redmi, OnePlus, Motorola, Tablet, API 24/26/Android 13+, Reboot, Permission-Verlust, Zeitgrenzen, Batterie/12h, Font Scaling, TalkBack, Commitment und Adaptive Friction.

## 13. Privacy / Offline-First

```bash
npm run check:privacy
```

Blockiert bekannte Tracking-/Netzwerkpfade und eine unbemerkte Wiedereinführung von `android.permission.INTERNET`.

## 14. Release Approval Gate

```bash
npm run check:release-approval
npm run release:gate
```

Schema v2 verlangt kandidatgebundene Evidence für Web, Android Tests/APK, Device Matrix, Lifecycle, Battery, Migration, Play/Legal/Reviewer, Signed Binary, Approver und exakte Candidate-SHA.

## 15. Android CI Stage

Nach `npm run verify` soll CI ausführen:

```bash
cd android
./gradlew testDebugUnitTest assembleDebug --no-daemon --stacktrace
```

Die `androidTest`-Suite benötigt zusätzlich reale Instrumentation auf Emulator/Gerät.

## 16. Aktuelle Ausführungsgrenze

GitHub-hosted Actions starten für dieses Repository derzeit wegen Billing-/Spending-Limit nicht und enden vor Step 1 mit `steps: null`.

Deshalb sind derzeit **nicht als bestanden belegt**:

- `npm run verify` auf aktuellem Head;
- `check:android-instrumentation`;
- `check:supply-chain`;
- `check:native-drain-ack`;
- `check:native-retention`;
- `check:usage-flush-worker`;
- TypeScript/Lint/Prettier;
- Vitest;
- Android JUnit einschließlich `UsageFlushCoordinatorTest`;
- Android Instrumentation;
- Gradle Debug Build;
- APK;
- physische Geräte-Matrix.

Eine isolierte lokale `javac`-Plausibilitätsprüfung des Coordinators ist **keine** Release-Evidence.

## 17. Verbindliche Reihenfolge nach Entsperrung

1. sauberer Checkout;
2. `npm ci`;
3. `npm run verify`;
4. Fehler beheben und wiederholen;
5. `./gradlew testDebugUnitTest assembleDebug`;
6. `UsageFlushCoordinatorTest` und bestehende Android-JUnit-Kette bestätigen;
7. Coordinator eng mit Single-Thread-Worker in den Service integrieren;
8. Verify/JUnit/Debug-Build erneut auf dem Integrations-Head;
9. Android Instrumentation;
10. Debug APK auf physischer Device Matrix;
11. erst danach Release-Evidence hochstufen.

Weitere Prozessreihenfolge: `docs/APP_DEVELOPMENT_A_TO_Z.md` und `docs/DEVELOPMENT_GATES_STATUS.md`.
