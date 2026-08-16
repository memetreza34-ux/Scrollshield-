# ScrollShield – Performance & Reliability v1

Status: **Release-Messvertrag für Android v1**

Letzte Aktualisierung: **16. August 2026**

ScrollShield ist eine dauerhafte Schutz-App. Deshalb reichen „App startet“ und „kein offensichtlicher Lag“ als Qualitätskriterium nicht aus. Dieses Dokument definiert, was vor v1 gemessen und belegt werden muss.

Der aktuelle native Persistenzbefund steht in `docs/NATIVE_PERSISTENCE_AUDIT.md`.

## 1. Grundsatz

Performance wird auf dem **exakten Release-Kandidaten** gemessen. Emulatorwerte allein reichen für Batterie, Prozessverhalten und Foreground-Service-Zuverlässigkeit nicht.

## 2. Messbereiche

### PERF-01 App-Start

Messen:

- Cold Start bis erste nutzbare Hauptansicht;
- Warm Start;
- Start mit vorhandenen Legacy-/großen lokalen Daten;
- Start während/nach Migration-Recovery.

Release-Kriterium:

- kein ANR;
- keine sichtbar blockierte UI durch lange synchrone Arbeit;
- Migration darf Datenintegrität nicht für Geschwindigkeit opfern.

### PERF-02 UI-Reaktion

Kritische Aktionen:

- App aktivieren/deaktivieren;
- Profilwechsel;
- Permission-Status aktualisieren;
- Commitment starten;
- Export/Reset;
- Overlay-Aktion.

Release-Kriterium:

- keine wiederholten Mehrfachaktionen durch fehlenden Busy-State;
- keine falsche Erfolgsanzeige während noch laufender Native-Operation.

### PERF-03 Overlay-Latenz

Messen:

- Zeit zwischen Erkennung einer geschützten Vordergrund-App und sichtbarer ScrollShield-Intervention;
- Verhalten nach Reboot, App-Update und längerer Laufzeit;
- Unterschiede nach OEM.

Release-Kriterium:

- keine reproduzierbare lange Lücke, die den Kernschutz praktisch wirkungslos macht;
- reale Werte pro Pflichtgerät dokumentieren.

### PERF-04 Foreground-Service CPU/Polling

Messen:

- CPU-Auslastung im Idle-Schutz;
- Polling-/Health-Intervalle;
- Verhalten während temporärer Freigabe;
- Verhalten bei mehreren geschützten Apps;
- Worker-Aktivität rund um den 10-Sekunden-Usage-Flush.

Release-Kriterium:

- keine dauerhaft auffällige CPU-Auslastung im Idle;
- Intervalle nur so aggressiv wie für den Produktnutzen nötig;
- Usage-Persistenz darf den Service-Main-Thread nicht periodisch mit synchronem Storage-I/O blockieren.

### PERF-05 Speicher

Messen:

- typischer RAM-Verbrauch;
- Langzeitlauf;
- wiederholte Overlay-/Freigabezyklen;
- Export/Import großer valider Backups;
- Service-Start/Stop-Zyklen mit Worker-Neuanlage und Shutdown-Drain.

Release-Kriterium:

- kein reproduzierbares ungebremstes Wachstum;
- keine OOM-/WebView-Crash-Serie in Normalnutzung;
- keine hängenbleibenden Worker-/Executor-Threads nach wiederholtem Schutz-Start/Stop.

### PERF-06 Native-Persistenz

Der Source-Pfad ist jetzt auf eine explizite Coordinator-/Worker-Architektur umgestellt:

- `ScrollShieldProtectionService` misst Usage weiterhin im Polling-Pfad;
- `UsageFlushCoordinator` verwaltet Pending + genau einen In-Flight-Batch;
- neue Usage während eines laufenden Writes bleibt separat pending;
- `UsageFlushWorker` verwendet `Executors.newSingleThreadExecutor(...)`;
- der periodische `SharedPreferences.commit()` läuft ausschließlich im Worker;
- der Protection Service besitzt keinen direkten periodischen Usage-`commit()` mehr;
- `commit=false`, Runtime-Exception und Executor-Rejection werden als Failure zurück an den Coordinator gemeldet;
- Failure-Batches werden wieder in Pending Usage aufgenommen;
- Tageslimits berücksichtigen persistierte + Pending + In-Flight-Usage;
- beim Service-Shutdown wird der letzte Usage-Tick erfasst, ein Force-Flush angefordert und danach ein serieller Final-Drain eingeplant;
- der Final-Drain verarbeitet Usage, die während eines bereits laufenden Writes neu entstanden ist;
- ein fehlgeschlagener In-Flight-Write kann beim Final-Drain einmal erneut geschrieben werden.

Wichtig:

Die Architektur ist **im Source umgesetzt**, aber wegen des GitHub-Actions-Billing-Blockers noch nicht real als Android-Build/JUnit/Device-Verhalten belegt.

Release-Kriterien:

- `UsageFlushCoordinatorTest` grün;
- `UsageFlushWorkerTest` inklusive Shutdown-Drain grün;
- `check:usage-flush-worker` grün;
- Android `assembleDebug`/später Release-Build kompiliert den verdrahteten Service;
- kein direkter periodischer `SharedPreferences.commit()` im Protection Service;
- keine verlorene Pending Usage beim kontrollierten Shutdown;
- keine Doppelzählung in Tageslimits bei normalen/In-Flight-/Shutdown-Szenarien;
- kein reproduzierbarer ANR/Jank durch den Persistenzpfad;
- Process-Kill-/Restart-Grenzen sind dokumentiert und auf Geräten getestet.

Ein pauschales `commit()` → `apply()` bleibt ausdrücklich **nicht** die Definition of Done, weil dadurch Fehlererkennung und Crash-/Durability-Semantik verändert würden.

Details: `docs/NATIVE_PERSISTENCE_AUDIT.md`.

### PERF-07 Storage-Retention

Der bestätigungsgebundene Native-Retention-Pfad ist im Source verdrahtet.

Betroffene datumsbezogene Native-Key-Familien:

- `usage_ms_<date>_<appId>`;
- `exported_usage_ms_<date>_<appId>`;
- `open_events_<date>_<appId>`;
- `emergency_count_<date>_<appId>`.

Aktuelle Regeln:

- `NativeCounterRetentionPolicy.java` entscheidet ohne Android-I/O über Löschbarkeit;
- Open-/Emergency-Counter behalten aktuellen + vorherigen lokalen Tag;
- bestätigte Raw Usage besitzt einen 30-Tage-Horizont;
- Usage wird nur gelöscht, wenn `current == exported`;
- unbestätigte, inkonsistente oder malformed Usage bleibt fail-closed erhalten;
- Retention läuft erst nach durablem Native→React-ACK;
- `usage_ms_*` und zugehörige `exported_usage_ms_*` werden gemeinsam bereinigt;
- `NativeCounterRetentionPolicyTest.java`, `NativeRetentionInstrumentedTest.java` und `check:native-retention` definieren den Testvertrag.

Release-Kriterium:

- Open-/Emergency-Counter werden nach der definierten Enforcement-Retention sicher bereinigt;
- Usage-/Export-Paare werden nur konservativ bereinigt, wenn kein nicht exportiertes Delta verloren gehen kann;
- Cleanup wird durch Policy/JUnit/Instrumentation abgesichert;
- Mitternacht/Zeitzone/DST werden berücksichtigt;
- die tatsächliche Verdrahtung ist real kompiliert und auf Android ausgeführt.

### PERF-08 12-Stunden-Batterietest

Pflicht auf mindestens:

- Pixel/Near Stock;
- Samsung;
- Xiaomi/Redmi oder vergleichbar aggressiver OEM.

Zusätzlich nach Möglichkeit OnePlus/Motorola.

Dokumentieren:

- exakte Build-ID;
- Gerätemodell/Android-Version;
- Start-/End-Akkustand und relevante Nutzung;
- Schutzdienst aktiv/inaktiv Vergleich, soweit praktikabel;
- auffällige Wärme/CPU/Prozessneustarts;
- Worker-/Persistenz-Auffälligkeiten;
- Diagnose-JSON am Ende.

Es gibt vor dem ersten Lauf bewusst noch keinen erfundenen Prozent-Grenzwert. Nach der ersten Baseline wird ein empirischer Budgetwert festgelegt und dieses Dokument aktualisiert.

### PERF-09 Prozesszuverlässigkeit

Testen:

- App in Hintergrund;
- Bildschirm aus/an;
- Batteriesparmodus;
- OEM-Task-Killer;
- Prozessende;
- kontrollierter Service-Stop während eines Usage-Writes;
- schneller Schutz-Neustart nach Stop;
- Reboot;
- App-Update;
- Notification-Channel-Änderung;
- Permission-Verlust.

Release-Kriterium:

- ScrollShield darf nie fälschlich einen aktiven Dienst behaupten;
- definierte Stops besitzen persistente Diagnosegründe;
- kontrollierter Shutdown verliert keine bereits erfasste Pending Usage außerhalb ausdrücklich dokumentierter Process-Kill-Grenzen;
- ein Neustart darf keinen doppelten oder konkurrierenden Persistenzpfad erzeugen.

### PERF-10 Zeitgrenzen

Testen:

- Mitternacht;
- Sommer-/Winterzeit;
- Zeitzonenwechsel;
- manuelle Uhränderung;
- über-Mitternacht-Schedule;
- Anti-Binge-Fenster über lokale Mitternacht;
- Usage-Flush unmittelbar vor/nach Tagesgrenze.

## 3. Web/PWA Performance

Vor Release weiter nutzen:

- `npm run check:bundle`;
- Produktions-Build;
- Bundle-Report bei auffälligem Wachstum.

Neue große Dependencies benötigen Begründung, wenn sie den Bundle-/Startpfad deutlich vergrößern.

## 4. Reliability Severity

### Blocker

- ANR/Crash im Permission-/Overlay-/Reset-/Migration-Hauptpfad;
- unkontrollierte Overlay-Schleife;
- Service wird häufig beendet und UI bleibt „aktiv“;
- Datenverlust;
- reproduzierbarer Usage-Verlust oder Doppelcount im Worker-/Shutdown-Pfad;
- extreme Batterie-/CPU-Auffälligkeit.

### Major

- reproduzierbar hohe Overlay-Latenz;
- Memory-Wachstum;
- fehlerhafte Counter nach Langzeitlauf;
- hängenbleibender Worker nach wiederholtem Service-Stop;
- OEM-spezifischer Schutzverlust ohne sichtbare Warnung.

## 5. Evidence-Format

Jeder physische Performance-Test enthält:

```text
Candidate SHA:
Version Name:
Version Code:
Device:
Android Version:
Scenario:
Duration:
Start State:
End State:
Battery Notes:
CPU/Memory Notes:
Lifecycle Code:
Diagnostic JSON Reference:
Result: PASS | FAIL | BLOCKED
```

## 6. Offene technische Arbeit

1. GitHub Actions Billing/Spending-Limit entsperren und den exakten Head real verifizieren.
2. `UsageFlushCoordinatorTest` + `UsageFlushWorkerTest` einschließlich Shutdown-Drain real ausführen.
3. Android-Kompilierung des produktiv verdrahteten Worker-Pfads bestätigen.
4. Shutdown/In-Flight/Process-Kill/Restart-Regressions auf Android ergänzen und ausführen.
5. Drain/ACK/Retention parallel zu Worker-Write regressionsprüfen.
6. erste echte 12h-Baseline erstellen.
7. daraus konkrete Batterie-/CPU-Budgets ableiten.
8. physische Overlay-Latenzwerte sammeln.
9. Memory-/Prozessstabilität bei wiederholten Freigabe- und Schutz-Start/Stop-Zyklen prüfen.
