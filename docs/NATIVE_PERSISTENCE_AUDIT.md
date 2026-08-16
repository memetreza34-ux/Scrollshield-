# ScrollShield – Native Persistence Audit

Status: **G8-Engineering-Audit; ACK + Retention + Flush-Worker-Foundation im Source, Ausführungsevidenz offen**

Letzte Aktualisierung: **16. August 2026**

## 1. Scope

Geprüft werden die nativen Persistenzpfade für:

- gemessene temporär freigegebene Nutzungszeit;
- bewusste Öffnungsereignisse;
- Emergency-Tageszähler;
- Native Event Queue;
- Lifecycle-Diagnostik;
- Native→React-Drain/ACK;
- Factory Reset;
- Export-/Retention-Marker;
- periodische Usage-Persistenz und In-Flight-Semantik.

Primäre Dateien:

- `ScrollShieldProtectionService.java`
- `ScrollShieldNativePlugin.java`
- `NativeDrainBatchStore.java`
- `NativeCounterRetentionPolicy.java`
- `UsageFlushCoordinator.java`
- `src/lib/nativeProtection.ts`
- `src/lib/nativeDrainJournal.ts`
- `src/App.tsx`
- `src/lib/storage.ts`

## 2. NP-01 – synchroner Usage-Commit im Service-Main-Thread

**Service-Verdrahtung weiterhin offen; Korrektheits-State-Machine jetzt vorbereitet.**

Aktueller produktiver Service-Pfad:

- Polling: ca. alle 900 ms;
- Usage wird im Service in `pendingUsageMs` gebündelt;
- `USAGE_FLUSH_INTERVAL_MS = 10_000L`;
- `flushPendingUsage()` führt weiterhin `SharedPreferences.Editor.commit()` aus;
- der Service besitzt für diesen periodischen Flush noch keinen eigenen seriellen Worker.

Android-Services laufen standardmäßig im Main Thread. Der periodische synchrone Disk-I/O bleibt deshalb ein potenzielles Jank-/ANR-Risiko.

### Warum kein blindes `commit()` → `apply()`?

Die Werte beeinflussen Tageslimits und den Native→React-Export. Ein bloßer API-Austausch würde Persistenzfehler nicht mehr synchron sichtbar machen und könnte Crash-/Durability-Semantik verändern.

### Neue Worker-Foundation: `UsageFlushCoordinator`

Die gefährliche Concurrency-/Accounting-Semantik wurde deshalb zuerst in eine kleine Android-unabhängige State-Machine ausgelagert.

`UsageFlushCoordinator.java` definiert:

1. **Pending Usage** – noch nicht an den Worker übergeben;
2. **genau einen In-Flight-Batch** – unveränderlicher Snapshot für einen seriellen Write;
3. **neue Usage während des Writes** – bleibt separat pending;
4. **Success** – nur der passende aktive Batch wird abgeschlossen;
5. **Failure** – der In-Flight-Snapshot wird mit zwischenzeitlich neuer Pending Usage verlustfrei zusammengeführt;
6. **stale Completion** – ein Callback mit fremder Batch-ID darf keinen Zustand verändern;
7. **Daily-Limit-View** – `getUnpersistedUsageMs(bucket)` umfasst Pending + In-Flight;
8. **Overflow-Schutz** – Addition saturiert auf `Long.MAX_VALUE`, statt in negative Usage überzulaufen.

Ein normaler Flush respektiert das 10-Sekunden-Intervall. Ein späterer kontrollierter Shutdown-Pfad kann `force=true` verwenden, ohne einen bereits laufenden Flush parallel zu starten.

### Tests für die State-Machine

`UsageFlushCoordinatorTest.java` deckt ab:

- Intervallblockierung + Force-Bypass;
- maximal einen In-Flight-Flush;
- neue Usage während eines Writes;
- Success entfernt nur den eigenen Snapshot;
- Failure-Mergeback ohne Verlust;
- stale Completion wird abgewiesen;
- Tageslimit sieht Pending + In-Flight;
- ungültige Keys/Dauern werden ignoriert;
- Overflow wird saturiert.

`scripts/check-usage-flush-worker.ts` schützt diese Source-Grenzen und ist als `npm run check:usage-flush-worker` Bestandteil von `npm run verify`.

### Noch fehlende produktive Verdrahtung

Der große `ScrollShieldProtectionService` verwendet aktuell **noch nicht** `UsageFlushCoordinator`. Vor Abschluss NP-01 muss die Integration eng und überprüfbar erfolgen:

1. einen dedizierten Single-Thread-Executor besitzen;
2. `addPendingUsageBucket(...)` an den Coordinator delegieren;
3. `flushPendingUsage(...)` nur einen Snapshot starten lassen und den `commit()` ausschließlich im Worker ausführen;
4. `getDailyUsageMs(...)` = persisted + Coordinator Pending/In-Flight;
5. Worker-Completion zurück an den Coordinator melden;
6. Write-Fehler sicher zurückführen;
7. kontrollierten Service-Shutdown so koordinieren, dass ein laufender Batch nicht doppelt oder verloren geschrieben wird;
8. Executor sauber herunterfahren;
9. Drain/ACK gleichzeitig gegen Usage-Write-Races regressionsprüfen.

Der 49-KB-Service wird nicht als unprüfbarer Vollersatz umgeschrieben. Die Integration bleibt ein kleiner separater Patch, sobald Java-/Gradle-Ausführung möglich ist bzw. die Änderung lokal exakt patchbar ist.

## 3. NP-02 – Retention datumsbezogener Counter im Source verdrahtet

Aktuelle Schlüsseltypen:

```text
usage_ms_<yyyy-MM-dd>_<appId>
exported_usage_ms_<yyyy-MM-dd>_<appId>
open_events_<yyyy-MM-dd>_<appId>
emergency_count_<yyyy-MM-dd>_<appId>
```

`NativeCounterRetentionPolicy.java` definiert konservative Regeln:

- aktuelle und vorherige Open-/Emergency-Partitionen bleiben;
- malformed/fremde Keys werden nicht gelöscht;
- historische Usage ist nur löschbar, wenn `current == exported`, beide Werte gültig sind und der Retention-Horizont überschritten ist.

### Runtime-Verdrahtung

`NativeDrainBatchStore.cleanupConfirmedCounters(...)` ist **nach durablem ACK** verdrahtet.

Regeln:

- Raw-Usage-Retention: **30 lokale Kalendertage nach bestätigter Übergabe**;
- Open-/Emergency-Counter: aktueller + vorheriger lokaler Tag bleiben;
- alte `usage_ms_*`-Werte werden nur gelöscht, wenn der zugehörige `exported_usage_ms_*`-Wert exakt gleich ist;
- bei einem neueren/unbestätigten Delta bleibt das Paar unangetastet;
- beim Löschen bestätigter alter Usage werden Raw-Counter und Exportcursor gemeinsam entfernt;
- malformed/unrelated Keys bleiben unangetastet;
- Cleanup läuft erst, nachdem Pending-Batch-Entfernung und Exportcursor-ACK erfolgreich committed wurden;
- schlägt nur der Cleanup fehl, wird ein bereits erfolgreich bestätigter React-Batch nicht wieder „unbestätigt“ gemacht.

### Tests/Checker

- `NativeCounterRetentionPolicyTest.java`;
- `NativeRetentionInstrumentedTest.java`;
- `scripts/check-native-retention.ts`;
- `npm run check:native-retention` ist Bestandteil von `npm run verify`.

**Noch nicht real ausgeführt.**

## 4. NP-03 – Native→React-Drain/ACK im Source implementiert

Der frühere Datenweg leerte Event Queue und rückte Usage-Exportmarker bereits während des Drains vor. Ein Crash vor React-Persistenz konnte dadurch Daten verlieren. Diese Architektur wurde ersetzt.

### 4.1 Native Pending Batch

`NativeDrainBatchStore.getOrCreate(...)`:

1. liefert einen bestehenden Pending-Batch unverändert erneut;
2. oder erzeugt einen neuen UUID-v4-Batch;
3. friert Event-Payload und Usage-Snapshot ein;
4. verschiebt Events in denselben persistenten Pending-Batch;
5. leert die Live-Event-Queue im **gleichen `SharedPreferences.commit()`**;
6. verändert die Usage-Exportcursor noch nicht.

Persistenter Schlüssel:

```text
pending_protection_drain_v1
```

Neue Events können während eines Pending-Batches weiter in der Live-Queue entstehen. Neue Usage kann weiter anwachsen.

### 4.2 Explizites ACK

`acknowledgeProtectionEvents(batchId)` akzeptiert nur den passenden Pending-Batch.

Vor Mutation werden Usage-Cursor validiert:

- Snapshot nicht negativ;
- aktueller Counter darf nicht unter Snapshot liegen;
- bereits exportierter Cursor darf nicht über Snapshot liegen.

Erst beim gültigen ACK:

- Exportcursor → eingefrorener Snapshot;
- Pending-Batch wird entfernt;
- neue Usage oberhalb des Snapshots bleibt für den nächsten Batch erhalten;
- danach darf die Retention bestätigte alte Rohdaten prüfen.

ACK nach bereits erfolgreicher Entfernung ist idempotent.

### 4.3 React genau-einmalige Anwendung

`src/lib/nativeDrainJournal.ts` verwendet:

```text
__scrollshieldNativeDrain.lastProcessedBatchId
```

Der Marker liegt im bestehenden Settings-Chunk. `StorageService.saveState()` staged, committed und verifiziert diesen Chunk in derselben State-Transaktion wie Stats/History.

`applyNativeDrainBatch(...)`:

- akzeptiert nur gültige UUID-Batch-IDs;
- addiert Usage und Events einmal;
- schreibt die Batch-ID gleichzeitig in Settings;
- versieht importierte History-Einträge mit `metadata.nativeDrainBatchId`;
- gibt bei Replay derselben Batch-ID den unveränderten State zurück.

### 4.4 Reihenfolge in `App.tsx`

```text
Native Pending Batch
  ↓
React applyNativeDrainBatch(...)
  ↓
StorageService.saveState(appState) === true
  ↓
NativeProtection.acknowledgeDrain(batchId)
  ↓
Native Exportcursor + Pending Batch finalisieren
  ↓
Best-effort Retention bestätigter alter Rohcounter
```

ACK wird **nicht** gesendet, wenn der Batch-tragende State nicht erfolgreich gespeichert wurde.

### 4.5 Crash-Fälle

**Crash vor React-Save**

- Native Pending-Batch bleibt;
- Batch-ID fehlt im dauerhaft gespeicherten AppState;
- beim Neustart wird der Batch erneut angewendet.

**Crash nach React-Save, vor ACK**

- Batch-ID ist zusammen mit Stats/History gespeichert;
- Native liefert denselben Pending-Batch erneut;
- React erkennt den bereits gespeicherten Marker;
- keine zweite Addition;
- nur ACK wird nachgeholt.

**Save-Fehler im laufenden Prozess**

- in-memory State kann Batch-ID bereits enthalten;
- App führt vor ACK einen expliziten erneuten `StorageService.saveState(currentState)` aus;
- ACK erst bei Erfolg.

## 5. NP-03B – Factory Reset gegen Native-Daten-Wiederkehr geschützt

Native Reset verwendet:

```text
factory_reset_pending_v1
```

Ablauf:

1. `factoryResetProtectionData()` löscht Native-Preferences und setzt den Tombstone atomar;
2. danach wird der Schutzdienst gestoppt;
3. ein verspäteter finaler Service-Flush darf noch in dieselben Preferences schreiben;
4. vor jedem späteren Drain gewinnt der Tombstone und löscht diese Restdaten;
5. falls nach Reset bereits eine frische Schutzkonfiguration synchronisiert wurde, bleiben ausschließlich die neuen Config-/Unavailable-Werte erhalten;
6. Usage, Events, alte Lifecycle-Werte und Pending-Batches werden nicht wiederhergestellt.

React löscht Web-State und Commitment erst nach erfolgreicher Native-Reset-Bestätigung. Scheitert Native-Cleanup, wird der sichtbare Vollreset abgebrochen.

## 6. Test-/Source-Vertrag

Vorbereitet:

- `NativeDrainBatchInstrumentedTest.java`;
- `NativeRetentionInstrumentedTest.java`;
- `NativeCounterRetentionPolicyTest.java`;
- `UsageFlushCoordinatorTest.java`;
- `nativeDrainJournal.test.ts`;
- `nativeProtectionDrain.test.ts`;
- `App.nativeDrainAck.test.tsx`;
- `App.commitmentActivation.test.tsx`;
- `scripts/check-native-drain-ack.ts`;
- `scripts/check-native-retention.ts`;
- `scripts/check-usage-flush-worker.ts`.

Die drei Source-Gates `check:native-drain-ack`, `check:native-retention` und `check:usage-flush-worker` sind Bestandteil von `npm run verify`.

**Wichtig:** Die Repo-Tests sind aufgrund des GitHub-Actions-Billing-Blockers noch nicht real ausgeführt. Eine isolierte lokale `javac`-Plausibilitätsprüfung des Pure-Java-Coordinators ersetzt weder Android JUnit noch Gradle-/CI-Evidence.

## 7. NP-04 – Lifecycle-Diagnostik bewusst synchron

Start-/Stop-Diagnostik verwendet teilweise `commit()`.

Diese Writes sind selten und besitzen hohe Durability-Bedeutung. Sie werden nicht pauschal zusammen mit der periodischen Usage-Optimierung auf `apply()` umgestellt.

## 8. Release-Einstufung

### Im Source umgesetzt bzw. vorbereitet

- persistenter Native Pending-Batch;
- UUID-Batch-ID;
- Replay vor ACK;
- Usage-Cursor erst beim ACK;
- React-Dedup-Marker im transaktionalen Settings-Chunk;
- Save-before-ACK;
- Crash-Replay ohne Doppeladdition;
- Factory-Reset-Tombstone;
- bestätigungsgebundene Retention;
- 30-Tage-Native-Raw-Usage-Horizont;
- **Pure-Java-Worker-State-Machine für Pending/In-Flight/Failure-Semantik**;
- JUnit-/Source-Verträge für die Worker-Foundation.

### Vor v1 weiterhin zwingend

- ACK-/Reset-/Retention-/Coordinator-Tests real ausführen;
- `npm run verify` + Android JUnit + Instrumentation + `assembleDebug` erfolgreich durchführen;
- `UsageFlushCoordinator` in den Service integrieren und den periodischen Main-Thread-`commit()` entfernen;
- Service-Shutdown/Worker-Race regressionsprüfen;
- Prozesskill-/Mitternacht-/DST-Fälle auf Gerät ausführen;
- 12h-/OEM-Batterie-/Reliability-Baseline durchführen.

### Nicht kurz vor Release erzwingen

- vollständige Migration SharedPreferences → Room/DataStore ohne eigenen Migrations-/Regressionblock.

## 9. Nächste Engineering-Schritte

1. Coordinator-/ACK-/Reset-/Retention-Kette auf einem echten Runner ausführen.
2. Fehler beheben, bis Verify/JUnit/Instrumentation/Debug-Build grün sind.
3. `UsageFlushCoordinator` mit Single-Thread-Executor in `ScrollShieldProtectionService` verdrahten.
4. synchronen periodischen Main-Thread-`commit()` entfernen.
5. Tageslimit während In-Flight-Flush und Write-Failure explizit auf Android regressionsprüfen.
6. kontrollierten Service-Shutdown + gleichzeitig laufenden Flush testen.
7. reale Process-Kill-/Crash-Replay-Fälle durchführen.
8. 12h/OEM-/Mitternacht-/DST-Evidence erfassen.

Bis diese Punkte erledigt sind, bleibt G8 **TEILWEISE**.
