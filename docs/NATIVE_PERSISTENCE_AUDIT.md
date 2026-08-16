# ScrollShield – Native Persistence Audit

Status: **offener G8-Engineering-Audit; keine ungeprüfte Persistenzmigration**

Letzte Aktualisierung: **16. August 2026**

## 1. Scope

Geprüft wurden die nativen Persistenzpfade für:

- gemessene temporär freigegebene Nutzungszeit;
- bewusste Öffnungsereignisse;
- Emergency-Tageszähler;
- Native Event Queue;
- Lifecycle-Diagnostik;
- Export-/Drain-Marker.

Primäre Dateien:

- `ScrollShieldProtectionService.java`
- `ScrollShieldNativePlugin.java`
- `src/lib/nativeProtection.ts`
- `src/App.tsx`
- `src/lib/storage.ts`

## 2. Befund NP-01 – synchroner Usage-Commit im Service-Main-Thread

Aktueller Pfad:

- Polling: ca. alle 900 ms;
- Usage wird im Speicher gebündelt;
- `USAGE_FLUSH_INTERVAL_MS = 10_000L`;
- `flushPendingUsage()` führt `SharedPreferences.Editor.commit()` aus;
- der Service besitzt keinen eigenen Worker-Thread für diesen Flush.

Android-Services laufen standardmäßig im Main Thread. Synchroner Disk-I/O über `commit()` ist deshalb ein potenzielles Jank-/ANR-Risiko.

### Warum nicht sofort blind auf `apply()` wechseln?

Die Usage-Werte beeinflussen auch lokale Tageslimits. `apply()` liefert keinen Persistenzfehler zurück und verschiebt den Disk-Write. Ein einfacher Austausch könnte Durability-/Crash-Verhalten verändern.

### Sichere Zielrichtung

Bevorzugt prüfen:

1. periodische Usage-Persistenz auf dedizierten seriellen Worker verschieben;
2. nur einen Flush gleichzeitig erlauben;
3. In-Flight-Werte weiterhin in `getDailyUsageMs()` berücksichtigen;
4. fehlgeschlagene Writes zurück in Pending Usage mergen;
5. beim kontrollierten Service-Ende finalen Flush ohne Doppelzählung sicherstellen;
6. Prozesskill-/Crash-Grenzen explizit testen.

Keine Änderung wird als fertig markiert, bevor JVM-/Integration-/Device-Regressionen die Usage-Korrektheit belegen.

## 3. Befund NP-02 – SharedPreferences als wachsende Counter-Datenbank

Aktuelle Schlüsseltypen:

```text
usage_ms_<yyyy-MM-dd>_<appId>
exported_usage_ms_<yyyy-MM-dd>_<appId>
open_events_<yyyy-MM-dd>_<appId>
emergency_count_<yyyy-MM-dd>_<appId>
```

Ohne Cleanup können datumsbezogene Keys über lange Nutzung wachsen.

### Semantik

- `open_events_*` wird für Anti-Binge nur für aktuellen und vorherigen lokalen Tag benötigt.
- `emergency_count_*` wird für den aktuellen Tag benötigt.
- `usage_ms_*` wird beim Drain in React-Statistik übergeben.
- `exported_usage_ms_*` verhindert im aktuellen Design Doppelimport bereits als abgeholt markierter Usage-Deltas.

### Retention darf keine Nutzungsdaten zerstören

`NativeCounterRetentionPolicy.java` und die zugehörigen JUnit-Tests definieren bereits konservative Löschregeln:

- aktuelle und vorherige Open-/Emergency-Tagespartitionen bleiben erhalten;
- malformed oder fremde Keys werden nie gelöscht;
- historische Usage wäre nur grundsätzlich löschbar, wenn `current == exported`, beide Werte gültig sind und ein konservativer Retention-Horizont überschritten wurde.

Diese letzte Usage-Regel wird **noch nicht an echten Cleanup verdrahtet**, weil `exported` im heutigen Native-Drain noch nicht beweist, dass React die Daten dauerhaft gespeichert hat.

Open-/Emergency-Counter können unabhängig davon später sicherer bereinigt werden, weil sie nur Enforcement-Fenster und Tagesgrenzen bedienen. Auch diese Verdrahtung wird erst nach einem realen Android-JUnit-/Build-Lauf abgeschlossen.

## 4. Befund NP-03 – aktueller Native→React-Drain besitzt kein End-to-End-ACK

Der aktuelle Datenweg ist:

```text
Native SharedPreferences
  ↓
drainProtectionEvents()
  ├─ Event Queue wird geleert
  ├─ Usage-Deltas werden als exportiert markiert
  └─ JSON wird an React zurückgegeben
       ↓
NativeProtection.drain()
       ↓
App.tsx setAppState(...)
       ↓
separater React-Effekt
       ↓
StorageService.saveState(appState)
```

`StorageService.saveState()` besitzt selbst eine starke transaktionale, verifizierte lokale Speicherung und liefert `boolean` zurück. Das schützt aber den Native→React-Übergang noch nicht, weil Native seinen Cursor **vor** dieser Speicherung verändert.

### Crash-Fenster A – Datenverlust

Wenn der Prozess nach dem Native-Commit, aber vor erfolgreicher React-Persistenz endet:

- Event Queue kann bereits leer sein;
- Usage kann bereits als exportiert markiert sein;
- React-Statistik/History kann die Daten noch nicht dauerhaft enthalten.

### Warum ein einfaches ACK danach ebenfalls nicht reicht

Ein naiver Umbau auf:

```text
Native liefert Daten
→ React saveState()
→ React sendet ACK
```

hat noch ein zweites Crash-Fenster:

- `saveState()` kann erfolgreich sein;
- Prozess stirbt vor ACK;
- Native liefert denselben Batch erneut;
- React würde ihn nach Neustart ein zweites Mal addieren.

Deshalb reicht ein ACK allein nicht für genau-einmalige Anwendung.

## 5. Zielarchitektur NP-03A – persistente Batch-ID + atomare React-Anwendung + ACK

Die robuste Zielsemantik für ScrollShield lautet:

### Native

1. Native bildet einen unveränderlichen Pending-Batch.
2. Batch erhält eine eindeutige `batchId`.
3. Events und Usage-Cursor werden noch **nicht** final entfernt/verschoben.
4. Solange kein ACK vorliegt, liefert `drain` denselben Pending-Batch erneut.

### React

5. React prüft, ob `batchId` bereits in seinem dauerhaft gespeicherten Zustand verarbeitet wurde.
6. Falls nein: Usage/Events genau einmal in State anwenden.
7. Dieselbe transaktionale `StorageService.saveState(...)`-Operation speichert gleichzeitig:
   - neue Statistik;
   - neue History;
   - die verarbeitete `batchId`.
8. Erst bei `saveState(...) === true` wird Native ACK aufgerufen.

### Native ACK

9. Native akzeptiert ACK nur für den aktuell ausstehenden Batch.
10. Erst jetzt:
   - passenden Event-Prefix entfernen;
   - Usage-Exportcursor auf die im Batch eingefrorenen Snapshot-Werte vorrücken;
   - Pending-Batch löschen;
   - letzte bestätigte Batch-ID optional für idempotentes ACK merken.

### Crash-Fälle

**Crash vor React-Save:**

- Batch-ID nicht im AppState;
- Native liefert denselben Batch erneut;
- React verarbeitet ihn einmal.

**Crash nach React-Save, vor ACK:**

- Batch-ID ist bereits zusammen mit den Daten gespeichert;
- Native liefert denselben Batch erneut;
- React erkennt die Batch-ID und addiert nichts erneut;
- React sendet nur ACK.

Damit lassen sich sowohl Datenverlust als auch Doppelzählung vermeiden.

## 6. AppState-Anforderung für genau-einmalige Batch-Anwendung

Vorgesehener persistenter State-Bestandteil:

```text
processedNativeDrainBatchIds: string[]
```

Regeln:

- bounded, z. B. letzte 50 IDs;
- über `normalizeAppState()` rückwärtskompatibel defaulten;
- im gleichen transaktionalen V3-State wie Statistik/History persistieren;
- niemals als Nutzerdaten-Migrationsblocker behandeln;
- erst entfernen, wenn die native ACK-/Replay-Grenze sicher überschritten ist.

Die endgültige Feldbezeichnung darf bei Implementierung angepasst werden, die Semantik nicht.

## 7. Befund NP-04 – Lifecycle-Diagnostik bewusst synchron

Start-/Stop-Diagnostik verwendet teilweise `commit()`.

Diese Writes sind deutlich seltener als der 10-Sekunden-Usage-Flush und besitzen höhere Durability-Bedeutung. Sie werden deshalb nicht zusammen mit der periodischen Usage-Optimierung pauschal auf `apply()` umgestellt.

## 8. Release-Einstufung

### Vor v1 zwingend

- periodischen Main-Thread-Usage-Commit entweder technisch entschärfen oder auf realen Geräten nachweisbar als unkritisch begrenzen;
- Retention-Strategie für datumsbezogene Native-Keys implementieren/testen;
- Native→React-Drain so härten, dass ein Prozessabbruch zwischen Übergabe und Persistenz weder stille Datenverluste noch Doppelzählung erzeugt;
- 12h-/OEM-Baseline durchführen.

### Nicht ohne Testinfrastruktur erzwingen

- große Migration SharedPreferences → DataStore/Room kurz vor v1;
- Datenpfad-Umbau ohne JVM-/TypeScript-/Android-/Crash-Replay-Regressionen.

## 9. Nächste Engineering-Schritte

1. vorhandene `NativeCounterRetentionPolicy` real per Android JUnit ausführen.
2. persistente Native-Drain-Batch-Struktur und ACK-Methoden implementieren.
3. `processedNativeDrainBatchIds` rückwärtskompatibel im AppState integrieren.
4. React-Drain auf explizites Apply → transaktionales Save → ACK umbauen.
5. Tests für beide kritischen Crash-Fenster ergänzen.
6. erst danach historische Usage-/Exported-Paare bereinigen.
7. Usage-Flush-Worker-Design mit In-Flight-/Failure-Semantik implementieren.
8. `npm run verify` + Android JUnit/Instrumentation/`assembleDebug` tatsächlich ausführen.
9. reale 12h-/Prozesskill-/Mitternacht-Tests durchführen.

Bis diese Punkte erledigt sind, bleibt G8 **TEILWEISE**.
