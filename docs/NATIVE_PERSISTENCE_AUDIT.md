# ScrollShield – Native Persistence Audit

Status: **G8-Engineering-Audit; ACK + Retention im Source implementiert, Ausführungsevidenz offen**

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
- Export-/Retention-Marker.

Primäre Dateien:

- `ScrollShieldProtectionService.java`
- `ScrollShieldNativePlugin.java`
- `NativeDrainBatchStore.java`
- `NativeCounterRetentionPolicy.java`
- `src/lib/nativeProtection.ts`
- `src/lib/nativeDrainJournal.ts`
- `src/App.tsx`
- `src/lib/storage.ts`

## 2. NP-01 – synchroner Usage-Commit im Service-Main-Thread

**Weiterhin offen.**

Aktueller Pfad:

- Polling: ca. alle 900 ms;
- Usage wird im Speicher gebündelt;
- `USAGE_FLUSH_INTERVAL_MS = 10_000L`;
- `flushPendingUsage()` führt `SharedPreferences.Editor.commit()` aus;
- der Service besitzt für diesen periodischen Flush noch keinen eigenen seriellen Worker.

Android-Services laufen standardmäßig im Main Thread. Der periodische synchrone Disk-I/O bleibt deshalb ein potenzielles Jank-/ANR-Risiko.

### Warum kein blindes `commit()` → `apply()`?

Die Werte beeinflussen Tageslimits und den Native→React-Export. Ein bloßer API-Austausch würde Persistenzfehler nicht mehr synchron sichtbar machen und könnte Crash-/Durability-Semantik verändern.

### Sichere Zielrichtung

1. periodische Usage-Persistenz auf einen dedizierten seriellen Worker verschieben;
2. nur einen Flush gleichzeitig zulassen;
3. In-Flight-Werte bei `getDailyUsageMs()` weiterhin berücksichtigen;
4. fehlgeschlagene Writes zurück in Pending Usage mergen;
5. finalen Service-Ende-Flush ohne Doppelzählung sicherstellen;
6. Prozesskill-/Crash-Grenzen testen.

Dieser 49-KB-Service wird nicht ohne erfolgreichen Java-/Gradle-Ausführungspfad großflächig umgebaut.

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

`NativeDrainBatchStore.cleanupConfirmedCounters(...)` ist jetzt **nach durablem ACK** verdrahtet.

Regeln:

- Raw-Usage-Retention: **30 lokale Kalendertage nach bestätigter Übergabe**;
- Open-/Emergency-Counter: aktueller + vorheriger lokaler Tag bleiben;
- alte `usage_ms_*`-Werte werden nur gelöscht, wenn der zugehörige `exported_usage_ms_*`-Wert exakt gleich ist;
- bei einem neueren/unbestätigten Delta bleibt das Paar unangetastet;
- beim Löschen bestätigter alter Usage werden Raw-Counter und Exportcursor gemeinsam entfernt;
- malformed/unrelated Keys bleiben unangetastet;
- Cleanup läuft erst, nachdem Pending-Batch-Entfernung und Exportcursor-ACK erfolgreich committed wurden;
- schlägt nur der Cleanup fehl, wird ein bereits erfolgreich bestätigter React-Batch nicht wieder „unbestätigt“ gemacht.

Damit kann Datenminimierung keinen neuen Doppelimport erzeugen.

### Tests/Checker

- `NativeCounterRetentionPolicyTest.java` – Pure-Java-Grenzfälle;
- `NativeRetentionInstrumentedTest.java` – aktuelle/Vortags-Counter, alte bestätigte Usage, unbestätigte Deltas, malformed Keys;
- `scripts/check-native-retention.ts`;
- `npm run check:native-retention` ist Bestandteil von `npm run verify`.

**Noch nicht real ausgeführt.**

## 4. NP-03 – Native→React-Drain/ACK im Source implementiert

Der frühere Datenweg war at-most-once-nah: Native leerte Event Queue und rückte Usage-Exportmarker bereits während des Drains vor. Ein Crash vor React-Persistenz konnte dadurch Daten verlieren.

Diese Architektur wurde ersetzt.

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

`src/lib/nativeDrainJournal.ts` verwendet den internen Settings-Metadatenschlüssel:

```text
__scrollshieldNativeDrain.lastProcessedBatchId
```

Der Marker liegt absichtlich **im bestehenden Settings-Chunk**. `StorageService.saveState()` staged, committed und verifiziert diesen Chunk in derselben State-Transaktion wie Stats/History.

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

Ein Vollreset darf keinen alten Pending-Batch oder finalen `onDestroy()`-Usage-Flush in den frischen App-State zurückbringen.

Native Reset verwendet:

```text
factory_reset_pending_v1
```

Ablauf:

1. `factoryResetProtectionData()` löscht Native-Preferences und setzt den Tombstone atomar;
2. danach wird der Schutzdienst gestoppt;
3. ein verspäteter finaler Service-Flush darf noch in dieselben Preferences schreiben;
4. vor jedem späteren Drain gewinnt der Tombstone und löscht diese Restdaten;
5. falls nach Reset bereits eine **frische** Schutzkonfiguration synchronisiert wurde, bleiben ausschließlich die neuen Config-/Unavailable-Werte erhalten;
6. Usage, Events, alte Lifecycle-Werte und Pending-Batches werden nicht wiederhergestellt.

React löscht Web-State und Commitment erst **nach** erfolgreicher Native-Reset-Bestätigung. Scheitert Native-Cleanup, wird der sichtbare Vollreset abgebrochen.

Native Config-Sync und Drain laufen außerdem erst nach abgeschlossenem Onboarding.

## 6. Test-/Source-Vertrag

Vorbereitet:

- `NativeDrainBatchInstrumentedTest.java`
  - Replay bis ACK;
  - falsches ACK;
  - neue Events während Pending-Batch;
  - Usage oberhalb Snapshot;
  - idempotentes ACK;
  - Reset-Tombstone gegen Late Writes;
  - Erhalt ausschließlich frischer Post-Reset-Konfiguration.
- `NativeRetentionInstrumentedTest.java`
  - Current/Previous-Day Retention;
  - alte vollständig bestätigte Usage;
  - unbestätigte Usage;
  - malformed/fremde Keys.
- `nativeDrainJournal.test.ts`
  - genau-einmalige React-Anwendung;
  - Batch-Wechsel;
  - Persistenz/Normalisierung;
  - malformed IDs.
- `nativeProtectionDrain.test.ts`
  - Bridge-Parsing;
  - ACK-ID;
  - invalid batch fail closed;
  - Factory-Reset-Bestätigung;
  - Browser-No-op.
- `App.nativeDrainAck.test.tsx`
  - Stats/History/Batch-ID vor ACK;
  - kein ACK bei fehlgeschlagener Persistenz.
- `App.commitmentActivation.test.tsx`
  - Vollreset verwendet Native Factory Reset;
  - Native-Reset-Fehler lässt Web-State/Commitment unangetastet.
- `scripts/check-native-drain-ack.ts`;
- `scripts/check-native-retention.ts`.

Beide Source-Gates sind Bestandteil von `npm run verify`.

**Wichtig:** Die Tests sind im Source vorhanden, aber aufgrund des GitHub-Actions-Billing-Blockers noch nicht real ausgeführt. Implementierung ist deshalb nicht gleich Release-Evidence.

## 7. NP-04 – Lifecycle-Diagnostik bewusst synchron

Start-/Stop-Diagnostik verwendet teilweise `commit()`.

Diese Writes sind selten und besitzen hohe Durability-Bedeutung. Sie werden nicht pauschal zusammen mit der periodischen Usage-Optimierung auf `apply()` umgestellt.

## 8. Release-Einstufung

### Im Source jetzt umgesetzt

- persistenter Native Pending-Batch;
- UUID-Batch-ID;
- Replay vor ACK;
- Usage-Cursor erst beim ACK;
- React-Dedup-Marker im transaktionalen Settings-Chunk;
- Save-before-ACK;
- Crash-Replay ohne Doppeladdition;
- Factory-Reset-Tombstone;
- Reset fail closed bei Native-Cleanup-Fehler;
- Retention für alte Ephemeral-Counter und vollständig bestätigte Raw-Usage;
- 30-Tage-Native-Raw-Usage-Horizont;
- Source-/Vitest-/Instrumentation-Verträge vorbereitet.

### Vor v1 weiterhin zwingend

- ACK-/Reset-/Retention-Tests real ausführen;
- `npm run verify` + Android JUnit + Instrumentation + `assembleDebug` erfolgreich durchführen;
- periodischen Main-Thread-Usage-Commit technisch entschärfen oder auf realen Geräten belastbar als unkritisch nachweisen;
- Prozesskill-/Mitternacht-/DST-Fälle auf Gerät ausführen;
- 12h-/OEM-Batterie-/Reliability-Baseline durchführen.

### Nicht kurz vor Release erzwingen

- vollständige Migration SharedPreferences → Room/DataStore ohne eigenen Migrations-/Regressionblock.

## 9. Nächste Engineering-Schritte

1. ACK-/Reset-/Retention-Kette auf einem echten Runner ausführen.
2. Fehler beheben, bis Verify/JUnit/Instrumentation/Debug-Build grün sind.
3. periodischen Usage-Flush als isolierten Worker-/In-Flight-Block umbauen.
4. Tageslimit-Korrektheit während In-Flight-Flush explizit testen.
5. reale Process-Kill-/Crash-Replay-Fälle durchführen.
6. 12h/OEM-/Mitternacht-/DST-Evidence erfassen.

Bis diese Punkte erledigt sind, bleibt G8 **TEILWEISE**.
