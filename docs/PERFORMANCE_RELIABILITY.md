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
- Verhalten bei mehreren geschützten Apps.

Release-Kriterium:

- keine dauerhaft auffällige CPU-Auslastung im Idle;
- Intervalle nur so aggressiv wie für den Produktnutzen nötig.

### PERF-05 Speicher

Messen:

- typischer RAM-Verbrauch;
- Langzeitlauf;
- wiederholte Overlay-/Freigabezyklen;
- Export/Import großer valider Backups.

Release-Kriterium:

- kein reproduzierbares ungebremstes Wachstum;
- keine OOM-/WebView-Crash-Serie in Normalnutzung.

### PERF-06 Native-Persistenz

Der Source-Audit ist erfolgt und dokumentiert aktuell:

- Usage wird im Service im Speicher gebündelt;
- der periodische Flush läuft ungefähr alle 10 Sekunden;
- der aktuelle Flush verwendet synchrones `SharedPreferences.commit()`;
- der Service besitzt dafür aktuell keinen eigenen Worker-Thread;
- Lifecycle-Diagnosewrites sind seltener und haben andere Durability-Anforderungen als periodische Usage-Writes.

Ziel:

- sichere Datenpersistenz behalten;
- unnötige blockierende periodische Main-Thread-I/O vermeiden;
- Usage-Werte während In-Flight-Schreibvorgängen weiterhin korrekt in Tageslimits einrechnen;
- fehlgeschlagene Writes nicht still verlieren;
- keinen Doppelcount beim finalen Service-Flush erzeugen.

Ein pauschales `commit()` → `apply()` ist ausdrücklich **nicht** die Definition of Done, weil dadurch Fehlererkennung und Crash-/Durability-Semantik verändert würden.

Details: `docs/NATIVE_PERSISTENCE_AUDIT.md`.

### PERF-07 Storage-Retention

Der Audit hat folgende datumsbezogene Native-Key-Familien bestätigt:

- `usage_ms_<date>_<appId>`;
- `exported_usage_ms_<date>_<appId>`;
- `open_events_<date>_<appId>`;
- `emergency_count_<date>_<appId>`.

Die reine Policy-Schicht ist vorbereitet:

- `NativeCounterRetentionPolicy.java` entscheidet ohne Android-I/O, welche Counter grundsätzlich löschbar sind;
- `NativeCounterRetentionPolicyTest.java` deckt Current/Previous-Day, malformed Keys, unexportierte Usage-Deltas, inkonsistente Export-Marker und Retention-Cutoff-Grenzen ab;
- die Policy ist bewusst noch **nicht** an SharedPreferences-Cleanup verdrahtet, solange Android-JUnit/Build nicht real ausgeführt werden können.

Release-Kriterium:

- Open-/Emergency-Counter werden nach einer klaren Enforcement-Retention sicher bereinigt;
- Usage-/Export-Paare werden nur konservativ bereinigt, wenn kein nicht exportiertes Delta verloren gehen kann;
- Cleanup wird durch die Pure-Java-Policy/JUnit abgesichert;
- Mitternacht/Zeitzone/DST werden berücksichtigt;
- die tatsächliche Verdrahtung ist real kompiliert und getestet.

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
- Diagnose-JSON am Ende.

Es gibt vor dem ersten Lauf bewusst noch keinen erfundenen Prozent-Grenzwert. Nach der ersten Baseline wird ein empirischer Budgetwert festgelegt und dieses Dokument aktualisiert.

### PERF-09 Prozesszuverlässigkeit

Testen:

- App in Hintergrund;
- Bildschirm aus/an;
- Batteriesparmodus;
- OEM-Task-Killer;
- Prozessende;
- Reboot;
- App-Update;
- Notification-Channel-Änderung;
- Permission-Verlust.

Release-Kriterium:

- ScrollShield darf nie fälschlich einen aktiven Dienst behaupten;
- definierte Stops besitzen persistente Diagnosegründe.

### PERF-10 Zeitgrenzen

Testen:

- Mitternacht;
- Sommer-/Winterzeit;
- Zeitzonenwechsel;
- manuelle Uhränderung;
- über-Mitternacht-Schedule;
- Anti-Binge-Fenster über lokale Mitternacht.

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
- extreme Batterie-/CPU-Auffälligkeit.

### Major

- reproduzierbar hohe Overlay-Latenz;
- Memory-Wachstum;
- fehlerhafte Counter nach Langzeitlauf;
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

1. Retention-Policy erst nach realem Android-JUnit/Build an SharedPreferences-Cleanup verdrahten.
2. periodischen Usage-Flush so gestalten, dass blockierende Main-Thread-I/O reduziert wird, ohne Durability/Daily-Limit-Korrektheit zu verlieren.
3. Native Drain/React-Persistenz-Grenze langfristig auf explizite ACK-Semantik prüfen.
4. erste echte 12h-Baseline erstellen.
5. daraus konkrete Batterie-/CPU-Budgets ableiten.
6. physische Overlay-Latenzwerte sammeln.
7. Memory-/Prozessstabilität bei wiederholten Freigabezyklen prüfen.
