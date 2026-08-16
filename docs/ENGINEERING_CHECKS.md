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

Schützt unter anderem:

- SDK-Untergrenzen und Package-ID;
- Release-Minification und Resource Shrinking;
- Signing-Konfiguration;
- `allowBackup=false`;
- Cleartext-Verbot;
- Foreground-Service-Registrierung und `specialUse`;
- Boot Receiver;
- scoped Package Visibility;
- Native Protection-/Diagnostics-Bridge;
- explizite Nutzeraktivierung;
- Safe-Shutdown bei Permission-/Rule-/Target-Verlust;
- Schedule-/Daily-Limit-/Anti-Binge-/Emergency-Policy-Verknüpfung;
- Boot-/Update-Recovery-Vertrag;
- gepinnte externe GitHub Actions;
- Android Unit-Test-/Debug-Build-Schritte im Workflow.

Die tatsächliche Permission-Wahrheit wird zusätzlich durch `check:privacy` und die On-Device-Manifest-Instrumentation geschützt. Android v1 darf derzeit keine `android.permission.INTERNET` besitzen.

## 4. Android Instrumentation Contract

```bash
npm run check:android-instrumentation
```

Dieser Source-Checker verhindert, dass die Android-Instrumentation wieder auf den früheren Android-Studio-Platzhaltertest reduziert wird.

Verbindlich vorhanden sind derzeit:

### `ProtectionStateInstrumentedTest.java`

- Protection default disabled;
- `lastProtectionStartAt` erst durch tatsächlichen Start-Record;
- Deaktivierung persistiert Lifecycle-Wahrheit;
- Stop-Code/-Message werden normalisiert;
- aktive Ziel-App gilt nur bei installiertem/sichtbarem Package.

### `ManifestSecurityInstrumentedTest.java`

Prüft das installierte/zusammengeführte Manifest:

- freigegebener Android-v1-Permission-Satz;
- kein `android.permission.INTERNET`;
- Backup aus;
- Protection Service registriert/nicht exportiert;
- Boot Receiver korrekt registriert.

### `BootRecoveryInstrumentedTest.java`

- fremde Broadcasts verändern Aktivierung nicht;
- `BOOT_COMPLETED` ohne Ziel-App endet fail-closed;
- `MY_PACKAGE_REPLACED` ohne Ziel-App endet fail-closed;
- stabiler Diagnosecode `recovery_target_app_missing`.

### `NativeDrainBatchInstrumentedTest.java`

Prüft die neue Native-Persistenzgrenze:

- Pending Batch wird bis zum passenden ACK identisch wiedergegeben;
- falsches ACK verändert weder Cursor noch Pending Batch;
- Events nach Erstellung eines Pending-Batches bleiben für einen Folgebatch erhalten;
- neue Usage oberhalb des Snapshot-Werts bleibt nach ACK als neues Delta erhalten;
- ACK nach bereits erfolgreicher Finalisierung ist idempotent;
- Factory-Reset-Tombstone löscht verspätete Service-Writes vor jedem Replay;
- falls bereits eine frische Post-Reset-Config existiert, bleibt nur diese erhalten, nicht alte Usage/Event-Daten.

### `NativeRetentionInstrumentedTest.java`

Prüft die bestätigungsgebundene Retention:

- aktuelle und vorherige Open-/Emergency-Partition bleiben erhalten;
- ältere Ephemeral-Counter werden entfernt;
- alte vollständig bestätigte Raw-Usage und ihr Exportcursor werden gemeinsam entfernt;
- unbestätigte Usage bleibt erhalten;
- Raw-Usage innerhalb des 30-Tage-Fensters bleibt erhalten;
- malformed/unrelated Keys werden nicht gelöscht.

Der frühere `ExampleInstrumentedTest.java` wurde entfernt.

### Noch offen

G7 bleibt **TEILWEISE**. Offen sind insbesondere:

- real ausgeführte Instrumentation auf Emulator/Gerät;
- echter Service-Start mit erfüllten System-Permissions;
- Overlay-Rendering und Aktionen;
- Permission-Verlust während laufendem Schutz;
- Notification-Channel-Entzug;
- Countdown-/Session-Ende;
- komplette Boot-Recovery mit realem FGS-Start;
- OEM-/Prozesskiller-Verhalten.

## 5. Supply-Chain Check

```bash
npm run check:supply-chain
```

Schützt derzeit:

- `package.json` + `package-lock.json`;
- Lockfile-Version mindestens 3;
- keine direkten ungebundenen/Git/HTTP/File/Link-Dependency-Specifier;
- keine Plain-HTTP-Paketauflösungen;
- keine Git-/SSH-Lockfile-Auflösungen ohne Review;
- Gradle Wrapper über offiziellen HTTPS-Host;
- Distribution-SHA256;
- keine dynamischen Gradle-Versionen;
- keine Plain-HTTP-Gradle-Repositories.

Gradle 8.14.3 ist aktuell gepinnt auf:

```text
ed1a8d686605fd7c23bdf62c7fc7add1c5b23b2bbc3721e661934ef4a4911d7c
```

Das ersetzt keinen echten `npm ci`, Advisory-Review, Gradle Dependency Report, SBOM oder Binary Audit.

## 6. Native Drain / ACK / Reset Check

```bash
npm run check:native-drain-ack
```

Dieser Source-Checker schützt die Datenübergabe zwischen Native Android und React.

Pflichtvertrag:

### Native

- `pending_protection_drain_v1` speichert einen unveränderlichen Pending-Batch;
- Event Queue wird nur zusammen mit dem persistenten Pending-Batch geleert;
- Usage-Exportcursor werden **nicht beim Drain**, sondern erst beim passenden ACK vorgerückt;
- falsches ACK ist fail-closed;
- inkonsistente Usage-Cursor blockieren Finalisierung;
- neue Usage/Events oberhalb bzw. außerhalb des Pending-Snapshots bleiben erhalten.

### React

- Drain-Payload benötigt gültige UUID-Batch-ID;
- `__scrollshieldNativeDrain.lastProcessedBatchId` liegt im transaktionalen Settings-Chunk;
- gleicher Batch wird genau einmal angewendet;
- Usage/History + Batch-ID müssen erfolgreich durch `StorageService.saveState(...)` gespeichert sein;
- erst danach ACK;
- bereits gespeicherter Replay-Batch wird nicht erneut addiert;
- fehlgeschlagener Save blockiert ACK und wird erneut versucht.

### Factory Reset

- Android muss Native-Reset zuerst bestätigen;
- `factory_reset_pending_v1` verhindert, dass verspätete `onDestroy()`-Writes wieder in den neuen App-State gelangen;
- frische Post-Reset-Config darf erhalten bleiben;
- alte Usage/Event/Lifecycle-Daten nicht;
- Web-State/Commitment werden erst danach gelöscht;
- Native Sync/Drain laufen erst nach abgeschlossenem Onboarding.

Zusätzlich vorbereitet:

- `nativeDrainJournal.test.ts`;
- `nativeProtectionDrain.test.ts`;
- `App.nativeDrainAck.test.tsx`;
- aktualisierte Reset-Tests in `App.commitmentActivation.test.tsx`;
- `NativeDrainBatchInstrumentedTest.java`.

Diese Source-/Testdateien sind noch keine Ausführungsevidence.

## 7. Native Counter Retention Check

```bash
npm run check:native-retention
```

Retention ist jetzt im Source produktiv **hinter dem ACK-Gate** verdrahtet.

Vertrag:

- `NativeCounterRetentionPolicy.java` bleibt die Pure-Java-Regelquelle;
- Cleanup läuft erst, nachdem Exportcursor und Pending-Batch-Entfernung erfolgreich committed wurden;
- aktuelle + vorherige Open-/Emergency-Partition bleiben erhalten;
- Raw Usage wird nach **30 lokalen Kalendertagen** nur dann entfernt, wenn `current == exported` gilt;
- unbestätigte, inkonsistente oder malformed Usage bleibt erhalten;
- beim Löschen werden `usage_ms_*` und der zugehörige `exported_usage_ms_*` gemeinsam entfernt;
- Cleanup ist nach einem bereits erfolgreichen ACK best-effort: ein Prune-Fehler darf keinen bereits persistenten React-Batch wieder in einen unbestätigten Zustand versetzen.

Tests/Verträge:

- `NativeCounterRetentionPolicyTest.java`;
- `NativeRetentionInstrumentedTest.java`;
- `scripts/check-native-retention.ts`.

Die Implementierung ist vorhanden, aber noch nicht real durch Android-JUnit/Instrumentation bestätigt.

## 8. Storage Migration Check

```bash
npm run check:migration
```

Schützt die besonders kritische V0.7-/Legacy-Datenmigration:

- bekannte monolithische und V0.7-Keys;
- `_pending`-Staging;
- exakte Read-Back-Verifikation;
- Recovery vollständiger Pending-Transaktionen;
- Verwerfen unvollständiger Pending-Sets;
- bytegenaues Legacy-Archiv vor Quelllöschung;
- keine Aktivierung alter generierter Regeln;
- sichere Konvertierung deterministischer Alt-Ereignisse und Saved-Time-Werte;
- Export/Import des Legacy-Archivs;
- Blockierung normaler Saves bei ungelöster Legacy-Migration;
- Recovery-UI.

Reale V0.7-Geräte-Evidence bleibt trotzdem Pflicht.

## 9. Lifecycle Diagnostics

```bash
npm run check:lifecycle
npm run check:diagnostic-normalization
```

Schützt:

- `lastProtectionStartAt` erst nach erfolgreichem FGS-Start;
- letzte Stop-Zeit, Code und Message;
- stabile Stop-/Recovery-Codes;
- `unexpected_service_destroy` nur für unerwartete Zerstörung;
- `migration_recovery`;
- `notification_action_stop`;
- Recovery-Fehlercodes;
- Normalisierung und Bounds;
- React-Health-Klassifikation;
- ehrliche UI-Darstellung.

## 10. Native Usage Accounting

```bash
npm run check:usage-accounting
```

Schützt unabhängig vom Drain-ACK:

- Usage-Intervall-Splitting an lokalen Tagesgrenzen;
- keine negative Usage bei rückwärts laufender Uhr;
- Pending Usage wird nach Tag + App gebucketet;
- Flush verwendet den bereits bestimmten Bucket statt Flush-Zeitpunkt;
- Tageslimit berücksichtigt aktuelle Pending Usage;
- Anti-Binge-Fenster kann über Mitternacht auf den Vortag zugreifen.

Der Checker verlangt **nicht** die alte sofortige Exportcursor-Änderung und ist mit dem neuen ACK-Pfad kompatibel.

Der noch offene Performance-Punkt ist der periodische 10-Sekunden-`SharedPreferences.commit()` im Service-Main-Thread. Dieser wird nicht mit einem pauschalen `apply()`-Tausch gelöst; ein späterer Worker-Umbau muss In-Flight Usage weiterhin in Tageslimits berücksichtigen und fehlgeschlagene Writes verlustfrei zurückführen.

## 11. Device Matrix Contract

```bash
npm run check:device-matrix
```

Schützt den manuellen Testvertrag für Pixel, Samsung, Xiaomi/Redmi, OnePlus, Motorola, Tablet, API 24/26/Android 13+, Reboot, Permission-Verlust, Zeitgrenzen, Batterie/12h, Font Scaling, TalkBack, Commitment und Adaptive Friction.

Der Checker beweist die Existenz des Testplans, nicht dessen Durchführung.

## 12. Privacy / Offline-First

```bash
npm run check:privacy
```

Blockiert unter anderem bekannte Analytics-/Tracking-SDKs, `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`, Tracker-Marker und eine unbemerkte Wiedereinführung von `android.permission.INTERNET`.

## 13. Release Approval Gate

```bash
npm run check:release-approval
npm run release:gate
```

Schema v2 verlangt kandidatgebundene Evidence. Der strikte Gate benötigt unter anderem Web Verification, Android Unit Tests, APK, Device Matrix, Lifecycle, Battery, Migration, Play/Legal/Reviewer-Nachweise, Signed Binary, Approver und exakte Candidate-SHA.

## 14. Android CI Stage

Der bestehende Verify-Workflow soll nach `npm run verify` ausführen:

```bash
cd android
./gradlew testDebugUnitTest assembleDebug --no-daemon --stacktrace
```

Bei Erfolg werden Debug APK und Unit-Test-Report als Artifact vorgesehen.

Die `androidTest`-Suite benötigt zusätzlich eine reale Instrumentation-Ausführung auf Emulator/Gerät. `assembleDebug` allein ist kein Instrumentation-Pass.

## 15. Aktuelle Ausführungsgrenze

GitHub-hosted Actions starten für dieses Repository derzeit wegen Billing-/Spending-Limit nicht. Wiederholte Runs enden vor Step 1 mit `steps: null`.

Deshalb sind derzeit **nicht als bestanden belegt**:

- `npm run verify` auf aktuellem Head;
- `check:android-instrumentation`;
- `check:supply-chain`;
- `check:native-drain-ack`;
- `check:native-retention`;
- TypeScript/Lint/Prettier;
- Vitest inklusive ACK-/Reset-/Retention-Tests;
- Vite/PWA;
- Android JUnit;
- Android Instrumentation;
- Gradle Debug Build;
- APK;
- physische Geräte-Matrix.

Ein nicht gestarteter Runner ist ein Infrastrukturblocker und weder ein Code-Pass noch ein Code-Fail.

## 16. Verbindliche Reihenfolge nach Entsperrung

1. sauberer Checkout;
2. `npm ci`;
3. `npm run verify`;
4. Fehler beheben und wiederholen;
5. `./gradlew testDebugUnitTest assembleDebug`;
6. Android Instrumentation auf Emulator/Gerät;
7. ACK-/Reset-/Retention-Crash-Replay gezielt ausführen;
8. Debug APK auf physischer Device Matrix;
9. erst danach Release-Evidence hochstufen.

Weitere Prozessreihenfolge: `docs/APP_DEVELOPMENT_A_TO_Z.md` und `docs/DEVELOPMENT_GATES_STATUS.md`.
