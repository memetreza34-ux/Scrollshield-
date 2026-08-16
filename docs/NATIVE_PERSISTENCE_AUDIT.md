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
- `usage_ms_*` wird beim Drain in React-Statistik exportiert.
- `exported_usage_ms_*` verhindert Doppelimport bereits übernommener Usage-Deltas.

### Retention darf keine Nutzungsdaten zerstören

Besonders `usage_ms_*` darf nicht einfach nach Alter gelöscht werden, solange kein sicherer Export-/ACK-Zustand belegt ist.

Sichere Zielrichtung:

- Open-/Emergency-Counter nach definierter Policy bereinigen, sobald sie für Enforcement nicht mehr benötigt werden;
- Usage/Exported-Paare nur bereinigen, wenn bereits vollständig exportiert und ein konservativer Retention-Horizont überschritten ist;
- bei neuem Delta niemals im selben Drain löschen;
- Cleanup mit Pure-Java-Policy + JUnit absichern;
- Mitternacht/Zeitzone/DST berücksichtigen.

## 4. Befund NP-03 – Drain arbeitet aktuell at-most-once-nah

`drainProtectionEvents()`:

- liest Event Queue;
- setzt Event Queue im selben Native-Schritt auf `[]`;
- markiert Usage als exportiert;
- gibt Daten danach an React zurück.

Wenn der Prozess nach Native-Commit, aber vor erfolgreicher React-Persistenz endet, kann die App keinen echten End-to-End-ACK nachweisen.

Das ist kein neu eingeführter Fehler, aber eine wichtige Architekturgrenze für zukünftige Zuverlässigkeit.

### Spätere stärkere Lösung

Für eine robustere Exactly-Once-/At-Least-Once-ähnliche Übergabe wäre ein explizites Native-Drain-ACK-Protokoll sinnvoll:

1. Native erstellt Batch-ID;
2. React liest Batch;
3. React persistiert lokal;
4. React bestätigt Batch-ID;
5. erst dann Native Queue/Export-Marker finalisieren.

Das ist eine größere Datenpfadänderung und wird **nicht** kurz vor Release ohne vollständige Migration-/Regressionstests eingebaut.

## 5. Befund NP-04 – Lifecycle-Diagnostik bewusst synchron

Start-/Stop-Diagnostik verwendet teilweise `commit()`.

Diese Writes sind deutlich seltener als der 10-Sekunden-Usage-Flush und besitzen höhere Durability-Bedeutung. Sie werden deshalb nicht zusammen mit der periodischen Usage-Optimierung pauschal auf `apply()` umgestellt.

## 6. Release-Einstufung

### Vor v1 zwingend

- periodischen Main-Thread-Usage-Commit entweder technisch entschärfen oder auf realen Geräten nachweisbar als unkritisch begrenzen;
- Retention-Strategie für datumsbezogene Native-Keys implementieren/testen;
- 12h-/OEM-Baseline durchführen.

### Nicht ohne Testinfrastruktur erzwingen

- große Migration SharedPreferences → DataStore/Room kurz vor v1;
- neues Drain-ACK-Protokoll ohne End-to-End-Regression.

## 7. Nächste Engineering-Schritte

1. Pure-Java-Retention-Policy + JUnit entwerfen.
2. Source-Contract für Retention ergänzen.
3. Usage-Flush-Worker-Design mit In-Flight-/Failure-Semantik implementieren.
4. JVM-/React-Drain-Regressionsfälle ergänzen.
5. `npm run verify` + Android JUnit/assembleDebug tatsächlich ausführen.
6. reale 12h-/Prozesskill-/Mitternacht-Tests durchführen.

Bis diese Punkte erledigt sind, bleibt G8 **TEILWEISE**.
