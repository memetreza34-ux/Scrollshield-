# ScrollShield – Native Persistence Audit

Status: **G8-Engineering-Audit; ACK + Retention + produktiver Usage-Flush-Worker im Source, reale Android-Evidence offen**

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

**Produktive Service-Verdrahtung ist im Source umgesetzt. Reale JUnit-/Gradle-/Geräte-Evidence fehlt weiterhin.**

Der frühere produktive Pfad führte etwa alle 10 Sekunden `SharedPreferences.Editor.commit()` direkt aus `ScrollShieldProtectionService.flushPendingUsage()` aus. Da Android-Services standardmäßig im Main Thread laufen, war das ein unnötiges Jank-/ANR-Risiko.

Ein blindes `commit()` → `apply()` wurde bewusst nicht verwendet: Tageslimits und Exportsemantik benötigen weiterhin beobachtbare Failure-/Durability-Grenzen.

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

Der produktive Writer besitzt:

- `Executors.newSingleThreadExecutor(...)`;
- ausschließlich serielles Schreiben eingefrorener Coordinator-Batches;
- weiterhin synchrones `SharedPreferences.commit()` **im Worker**, damit `false` als realer Persistenzfehler erkennbar bleibt;
- Commit-Failure → `completeFlush(batchId, false, ...)`;
- Runtime-Exception → Failure-Mergeback;
- `RejectedExecutionException` → aktiver Batch zurück in Pending Usage;
- erfolgreichen Write → Success an den Coordinator;
- normalen `close()`-Pfad mit orderly `executor.shutdown()`;
- `closeAfterDrainingPending()` für den Service-Shutdown;
- Final-Drain auf demselben seriellen Worker-Thread;
- Final-Drain verarbeitet Pending Usage, die während eines vorherigen In-Flight-Writes eingetroffen ist;
- ein fehlgeschlagener In-Flight-Write kann über den anschließenden Final-Drain einmal erneut versucht werden;
- `awaitTermination(timeoutMs)` bleibt für Tests und kontrollierte Diagnosepfade verfügbar.

### 2.3 Produktive Service-Integration

`ScrollShieldProtectionService` ist jetzt eng verdrahtet:

1. Coordinator + Worker werden nach erfolgreichem Service-Start initialisiert;
2. die frühere Service-eigene `pendingUsageMs`-Map ist entfernt;
3. der frühere Service-eigene `lastUsageFlushMs`-Timer ist entfernt;
4. `addPendingUsageBucket(...)` delegiert an `UsageFlushCoordinator.addPendingUsage(...)`;
5. `flushPendingUsage(...)` führt nur `beginFlush(...)` aus und submitted den Snapshot an den Worker;
6. `getDailyUsageMs(...)` addiert persistierte + Pending + In-Flight-Usage saturierend;
7. der periodische Service-Pfad enthält keinen direkten `SharedPreferences.commit()` mehr;
8. `onDestroy()` erfasst zuerst den letzten erlaubten Usage-Tick;
9. danach wird ein Force-Flush angefordert;
10. anschließend plant `closeAfterDrainingPending()` den seriellen Final-Drain vor dem Executor-Shutdown ein.

Damit ist der frühere Main-Thread-Write **im Source entfernt**. Das ist noch keine Behauptung, dass der Android-Build oder das Laufzeitverhalten bestanden wurde.

### 2.4 Tests / Source Gate

`UsageFlushCoordinatorTest.java` deckt State-Machine-Grenzen ab.

`UsageFlushWorkerTest.java` deckt ab:

- erfolgreichen Background-Write;
- `commit=false` → Mergeback;
- Writer-Exception → Mergeback;
- neue Usage bleibt während blockiertem Worker vollständig im Tageslimit sichtbar;
- Shutdown-Drain schreibt Usage, die während eines In-Flight-Writes neu eingetroffen ist;
- Shutdown-Drain versucht einen vorher fehlgeschlagenen In-Flight-Batch erneut;
- geschlossener Worker lehnt einen neuen Batch ab und gibt ihn an Pending zurück.

`scripts/check-usage-flush-worker.ts` ist jetzt ein Integrations-Gate. Es verlangt:

- Coordinator/Worker im Protection Service;
- Initialisierung beim Service-Start;
- Add-/Flush-/Daily-Limit-Verdrahtung;
- Shutdown-Drain;
- keinen direkten `SharedPreferences.commit()` im Protection Service;
- keine Rückkehr der alten Service-Pending-Map;
- keine Rückkehr des alten Service-Flush-Timers.

### 2.5 Noch offene NP-01-Evidence

Vor einer Release-Freigabe muss real bestätigt werden:

1. `UsageFlushCoordinatorTest` läuft auf dem exakten Head grün;
2. `UsageFlushWorkerTest` einschließlich Shutdown-Drain läuft grün;
3. Android kompiliert den verdrahteten Service (`assembleDebug`);
4. Service-Shutdown mit bereits laufendem In-Flight-Write funktioniert auf Android;
5. Process-Kill-/Restart-Fälle verlieren keine releasekritisch relevante Usage außerhalb der dokumentierten Durability-Grenzen;
6. Drain/ACK/Retention und Worker-Write erzeugen keine Doppelzählung oder Datenlöschung;
7. 12h-/OEM-Baseline zeigt keine neue CPU-/Batterie-Auffälligkeit.

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

**Nicht als bestanden belegt:** GitHub Actions stoppt weiterhin vor Step 1 wegen Billing/Spending-Limit. Der aktuelle Head hat deshalb keine echte Verify-/JUnit-/Gradle-/APK-Evidence.

## 7. NP-04 – Lifecycle-Diagnostik

Seltene Start-/Stop-Diagnostik verwendet teilweise bewusst synchrones `commit()`. Diese Durability-Writes werden nicht pauschal mit dem periodischen Usage-Pfad auf async umgestellt.

## 8. Release-Einstufung

### Im Source umgesetzt

- crash-sicherer Native Pending-Batch + ACK;
- React Dedup/Save-before-ACK;
- Factory-Reset-Tombstone;
- bestätigungsgebundene Retention;
- `UsageFlushCoordinator`;
- echter `UsageFlushWorker` mit Single-Thread-Executor und Failure-Mergeback;
- produktive Coordinator-/Worker-Verdrahtung im `ScrollShieldProtectionService`;
- kein direkter periodischer Usage-`commit()` mehr im Protection-Service-Main-Thread;
- serieller Shutdown-Drain;
- JUnit-/Source-Verträge für Coordinator, Worker und Service-Verdrahtung.

### Vor v1 weiterhin zwingend

- Coordinator-/Worker-/ACK-/Reset-/Retention-Tests real ausführen;
- `npm run verify` + Android JUnit + Instrumentation + `assembleDebug` erfolgreich durchführen;
- Shutdown/In-Flight/Drain-/Retention-Races real regressionsprüfen;
- Prozesskill-/Mitternacht-/DST-Fälle auf Gerät;
- 12h-/OEM-Batterie-/Reliability-Baseline.

## 9. Nächste Engineering-Schritte

1. Billing/Runner entsperren und den exakten Head real ausführen.
2. echte Compiler-/JUnit-/Source-Gate-Fehler beheben, bis Verify/JUnit/Debug-Build grün sind.
3. Android-Test für Service-Shutdown mit In-Flight-/Pending-Usage ergänzen bzw. real ausführen.
4. Drain/ACK gleichzeitig mit Worker-Write regressionsprüfen.
5. Process-Kill/Restart und Service-Neustart gegen Usage-Durability testen.
6. reale Process-Kill-/12h-/OEM-/Zeitgrenzen-Evidence erfassen.

Bis diese Punkte erledigt sind, bleibt G8 **TEILWEISE**.
