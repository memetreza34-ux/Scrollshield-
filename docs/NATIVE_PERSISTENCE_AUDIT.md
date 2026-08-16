# ScrollShield – Native Persistence Audit

Status: **G8-Engineering-Audit; ACK + Retention + Flush-Worker-Bausteine im Source, Service-Verdrahtung offen**

Letzte Aktualisierung: **16. August 2026**

## 1. Scope

Geprüft werden die nativen Persistenzpfade für gemessene Nutzungszeit, Open-/Emergency-Counter, Event Queue, Lifecycle-Diagnostik, Native→React-Drain/ACK, Factory Reset, Retention und periodische Usage-Persistenz.

Primäre Dateien:

- `ScrollShieldProtectionService.java`
- `ScrollShieldNativePlugin.java`
- `NativeDrainBatchStore.java`
- `NativeCounterRetentionPolicy.java`
- `UsageFlushCoordinator.java`
- `UsageFlushWorker.java`
- `src/lib/nativeProtection.ts`
- `src/lib/nativeDrainJournal.ts`
- `src/App.tsx`
- `src/lib/storage.ts`

## 2. NP-01 – periodischer Usage-Commit

**Produktive Service-Verdrahtung weiterhin offen; Coordinator + echter serieller Writer sind vorbereitet.**

Der aktuelle produktive Service führt weiterhin etwa alle 10 Sekunden `SharedPreferences.Editor.commit()` direkt aus `flushPendingUsage()` aus. Da Android-Services standardmäßig im Main Thread laufen, bleibt das ein potenzielles Jank-/ANR-Risiko.

Ein blindes `commit()` → `apply()` bleibt ausgeschlossen: Tageslimits und Exportsemantik benötigen beobachtbare Failure-/Durability-Grenzen.

### 2.1 `UsageFlushCoordinator`

Die Pure-Java-State-Machine verwaltet synchronisiert:

- Pending Usage;
- genau einen unveränderlichen In-Flight-Snapshot;
- neue Usage während eines laufenden Writes separat pending;
- Success nur für die passende Batch-ID;
- Failure-Mergeback des kompletten Snapshots;
- Ablehnung stale Completion;
- `getUnpersistedUsageMs(bucket)` = Pending + In-Flight für Tageslimits;
- normales Intervall + Force-Pfad;
- saturierende Addition gegen Long-Overflow.

### 2.2 `UsageFlushWorker`

Der zweite Baustein existiert jetzt ebenfalls im Source:

- Produktionsfactory nutzt `Executors.newSingleThreadExecutor(...)`;
- eingefrorene Coordinator-Batches werden ausschließlich auf diesem seriellen Executor geschrieben;
- SharedPreferences verwendet weiterhin `commit()` **im Worker**, damit `false` als realer Persistenzfehler erkennbar bleibt;
- Commit-Failure meldet `completeFlush(batchId, false, ...)`;
- Runtime-Exception meldet ebenfalls Failure;
- `RejectedExecutionException` führt den aktiven Batch synchron zurück in Pending Usage;
- erfolgreicher Write meldet Success an den Coordinator;
- `close()` führt orderly `executor.shutdown()` aus;
- `awaitTermination(timeoutMs)` ist für einen späteren kontrollierten Shutdown-Pfad vorbereitet.

### 2.3 Tests

`UsageFlushCoordinatorTest.java` deckt State-Machine-Grenzen ab.

`UsageFlushWorkerTest.java` deckt zusätzlich ab:

- erfolgreichen Background-Write;
- `commit=false` → Mergeback;
- Writer-Exception → Mergeback;
- neue Usage bleibt während blockiertem Worker vollständig im Tageslimit sichtbar;
- geschlossener Worker lehnt einen Batch ab und gibt ihn an Pending zurück.

`scripts/check-usage-flush-worker.ts` schützt Coordinator **und** Worker. Der Checker hält die verbleibende Service-Grenze absichtlich fest: solange `ScrollShieldProtectionService.flushPendingUsage()` selbst `editor.commit()` enthält, ist NP-01 nicht abgeschlossen.

### 2.4 Noch fehlende Service-Integration

Vor Abschluss NP-01 muss `ScrollShieldProtectionService` eng verdrahtet werden:

1. Coordinator und Worker beim Service-Start initialisieren;
2. `addPendingUsageBucket(...)` an den Coordinator delegieren;
3. `flushPendingUsage(...)` nur `beginFlush(...)` auslösen und den Snapshot an den Worker submitten;
4. `getDailyUsageMs(...)` = persisted + `coordinator.getUnpersistedUsageMs(...)`;
5. kein `SharedPreferences.commit()` mehr im periodischen Main-Thread-Pfad;
6. kontrollierten Shutdown koordinieren: vorhandenen In-Flight-Write beenden, restliche Pending Usage forcieren, dann Worker schließen;
7. Write-Failure/Shutdown/Drain-ACK-Races auf Android regressionsprüfen.

Der 49-KB-Service wird nicht als unprüfbarer Vollersatz geschrieben. Die verbleibende Änderung muss ein kleiner, nachvollziehbarer Integrationspatch sein.

## 3. NP-02 – bestätigungsgebundene Retention

`NativeDrainBatchStore.cleanupConfirmedCounters(...)` läuft erst **nach durablem ACK**.

Regeln:

- Open-/Emergency-Counter behalten aktuellen + vorherigen lokalen Tag;
- bestätigte Raw Usage besitzt einen 30-Tage-Horizont;
- Raw Usage wird nur bei `current == exported` gelöscht;
- unbestätigte/inkonsistente/malformed Usage bleibt erhalten;
- `usage_ms_*` und `exported_usage_ms_*` werden gemeinsam entfernt;
- Cleanup-Fehler machen einen bereits bestätigten React-Batch nicht wieder unbestätigt.

Tests/Checker:

- `NativeCounterRetentionPolicyTest.java`;
- `NativeRetentionInstrumentedTest.java`;
- `check:native-retention`.

## 4. NP-03 – Native→React Drain/ACK

Der frühere at-most-once-nahe Drain wurde ersetzt.

### Native

- `pending_protection_drain_v1` hält einen unveränderlichen UUID-Batch;
- Event Queue wird nur zusammen mit dem Pending-Batch geleert;
- Usage-Cursor werden erst beim passenden ACK vorgerückt;
- falsches/inkonsistentes ACK ist fail-closed;
- neue Events und neue Usage bleiben für Folgebatches erhalten.

### React

Persistenter Marker:

```text
__scrollshieldNativeDrain.lastProcessedBatchId
```

Stats/History + Batch-ID werden in derselben `StorageService.saveState()`-Transaktion gespeichert. Erst danach sendet React ACK. Replay nach Crash zwischen Save und ACK führt deshalb nicht zur Doppeladdition.

Ablauf:

```text
Native Pending Batch
  ↓
React applyNativeDrainBatch(...)
  ↓
StorageService.saveState(...) === true
  ↓
Native ACK
  ↓
Cursor/Pending-Batch finalisieren
  ↓
Best-effort Retention
```

## 5. NP-03B – Factory Reset

`factory_reset_pending_v1` verhindert, dass ein verspäteter Service-Flush nach Vollreset wieder in den frischen React-State importiert wird.

- Native Reset muss vor Web-State-/Commitment-Löschung bestätigt werden;
- Tombstone gewinnt vor jedem späteren Drain;
- alte Usage/Event/Lifecycle/Pending-Daten werden entfernt;
- bereits frische Post-Reset-Config darf erhalten bleiben;
- Native Sync/Drain starten nach Reset erst wieder nach abgeschlossenem Onboarding.

## 6. Test-/Source-Vertrag

Vorbereitet sind unter anderem:

- `NativeDrainBatchInstrumentedTest.java`;
- `NativeRetentionInstrumentedTest.java`;
- `NativeCounterRetentionPolicyTest.java`;
- `UsageFlushCoordinatorTest.java`;
- `UsageFlushWorkerTest.java`;
- `nativeDrainJournal.test.ts`;
- `nativeProtectionDrain.test.ts`;
- `App.nativeDrainAck.test.tsx`;
- `App.commitmentActivation.test.tsx`;
- `check:native-drain-ack`;
- `check:native-retention`;
- `check:usage-flush-worker`.

**Nicht als bestanden belegt:** GitHub Actions stoppt weiter vor Step 1 wegen Billing/Spending-Limit. Eine isolierte lokale `javac`-Plausibilitätsprüfung des Coordinators ist keine Android-/Release-Evidence.

## 7. NP-04 – Lifecycle-Diagnostik

Seltene Start-/Stop-Diagnostik verwendet teilweise bewusst synchrones `commit()`. Diese Durability-Writes werden nicht pauschal mit dem periodischen Usage-Pfad auf async umgestellt.

## 8. Release-Einstufung

### Im Source umgesetzt/vorbereitet

- crash-sicherer Native Pending-Batch + ACK;
- React Dedup/Save-before-ACK;
- Factory-Reset-Tombstone;
- bestätigungsgebundene Retention;
- `UsageFlushCoordinator`;
- echter `UsageFlushWorker` mit Single-Thread-Executor und Failure-Mergeback;
- JUnit-/Source-Verträge für beide Worker-Bausteine.

### Vor v1 weiterhin zwingend

- Coordinator-/Worker-/ACK-/Reset-/Retention-Tests real ausführen;
- `npm run verify` + Android JUnit + Instrumentation + `assembleDebug` erfolgreich durchführen;
- Coordinator + Worker in `ScrollShieldProtectionService` integrieren;
- periodischen Main-Thread-`commit()` entfernen;
- Shutdown/In-Flight/Drain-Races regressionsprüfen;
- Prozesskill-/Mitternacht-/DST-Fälle auf Gerät;
- 12h-/OEM-Batterie-/Reliability-Baseline.

## 9. Nächste Engineering-Schritte

1. Billing/Runner entsperren und Worker-JUnit real ausführen.
2. Fehler beheben, bis Verify/JUnit/Debug-Build grün sind.
3. Coordinator + Worker als kleinen Patch in den Service verdrahten.
4. Main-Thread-`commit()` aus dem periodischen Flush entfernen.
5. Shutdown mit laufendem In-Flight-Flush testen.
6. Drain/ACK gleichzeitig mit Worker-Write testen.
7. reale Process-Kill-/12h-/OEM-/Zeitgrenzen-Evidence erfassen.

Bis diese Punkte erledigt sind, bleibt G8 **TEILWEISE**.
