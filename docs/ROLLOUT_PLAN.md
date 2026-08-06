# ScrollShield Android Rollout Plan

Dieser Rollout-Plan gilt erst, nachdem das strikte Release-Gate für exakt dieselbe Version und Build-Nummer bestanden wurde. Der aktuelle Branch befindet sich ausschließlich in der Vorbereitung von Phase 0.

## Phase 0 – Engineering Candidate

### Eintrittskriterien

- `npm run verify` besteht vollständig.
- Android `testDebugUnitTest` besteht.
- `assembleDebug` erzeugt eine installierbare APK.
- Die native Diagnose zeigt erwartete Versionsnummer und Build-Nummer.
- Kein Blocker oder kritischer Defekt ist offen.

### Umfang

- Entwickler und ausdrücklich benannte Tester
- direkte Debug-APK oder Installation über Android Studio
- keine öffentliche Vermarktung
- keine Store-Einreichung

### Pflichtnachweise

- CI- oder lokale Kommandoausgaben
- Prüfsumme der Debug-APK
- Android-Testbericht
- kopiertes Diagnose-JSON von mindestens einem physischen Gerät

## Phase 1 – Interne Geräte-Matrix

### Eintrittskriterien

- Phase 0 abgeschlossen
- aktueller Kandidat auf physischen Geräten installiert

### Pflichtgeräte

- Google Pixel oder anderes Near-Stock-Android-Gerät
- Samsung Galaxy
- Xiaomi oder Redmi
- OnePlus
- Motorola
- Android-Tablet
- Android 7 / API 24 für den Legacy-Fallback
- Android 8 / API 26 für Benachrichtigungskanal und Foreground Service
- Android 13+ für den Runtime-Benachrichtigungsdialog

### Pflichtszenarien

- Clean Install und V0.7-kompatible Migration
- Berechtigungserteilung, Ablehnung und Entzug
- ausschließliche Deaktivierung des Schutzkanals
- installierte und nicht verfügbare Ziel-Apps
- Deinstallation der letzten geschützten App
- Entfernung der letzten aktiven Regel
- Standardverzögerung, bewusste Sitzung, Sitzungsende, strikter Modus, Tageslimit, Zeitpläne, Anti-Binge, Fokus und Notfalllimit
- Prozessende, Force-Stop, Reboot, App-Update, Batteriesparmodus und zwölfstündiger Lauf
- Mitternacht, Zeitzonenwechsel, Sommerzeit und manuelle Uhränderung
- maximale Textskalierung, Tablet-Rotation, Multi-Window und TalkBack-Smoke-Test

### Austrittskriterien

- Jeder Pflichtpunkt in `docs/ANDROID_DEVICE_TEST_MATRIX.md` besitzt Nachweise für den aktuellen Build.
- Kein Blocker oder kritischer Defekt bleibt offen.
- Herstellerspezifische Ausschlüsse sind dokumentiert.

## Phase 2 – Google Play Internal Testing

### Eintrittskriterien

- interne physische Geräte-Matrix abgeschlossen
- rechtlicher Name, Adresse, Support-Mailbox und Datenschutzdomain final
- Play-Deklarationen gegen den tatsächlichen Kandidaten geprüft
- signierter AAB erst nach bestandenem `npm run release:gate` erzeugt

### Umfang

- Inhaber und vertrauenswürdige interne Tester
- Google-Play-Track „Interner Test“

### Validierung

- Installation und Update über Google Play
- Versions- und Build-Identität des signierten Builds
- Berechtigungsflüsse und sichtbare Dauerbenachrichtigung
- Overlay und Schutzregeln
- lokale Migration und Reset
- keine unerwarteten SDKs, Tracker, Berechtigungen oder Netzwerkziele

### Austrittskriterien

- signierte Binärdatei vollständig geprüft
- kein Store-Auslieferungsfehler
- Data Safety und sensible Berechtigungsdeklarationen stimmen weiterhin mit der Binärdatei überein

## Phase 3 – Geschlossener Test

### Eintrittskriterien

- interner Test abgeschlossen
- Reviewer-Videos mit exakt dem Kandidaten-Build aufgenommen
- Support- und Defekt-Triage-Prozess aktiv

### Empfohlene Testgruppe

- kleine eingeladene Gruppe mit unterschiedlichen Herstellern
- Nutzer für Standard-, strikte, Zeitplan- und Notfall-Szenarien

### Zu beobachten

- Abschluss der Einrichtung und Missverständnisse bei Berechtigungen
- unerwartet gestoppter Dienst
- Kanal- oder Benachrichtigungsfehler
- Overlay-Schleifen oder nicht erreichbare Aktionen
- Akkuverbrauch
- falsche Aktiv-Anzeige
- Migration oder lokaler Datenverlust
- herstellerspezifisches Prozessende

### Datenschutzfreundliche Fehleraufnahme

- keine automatische Analyse in Version 1
- Tester senden Diagnose-JSON und Reproduktionsschritte manuell
- persönliche Inhalte vor Weitergabe aus Bildschirmaufnahmen und Logs entfernen

### Austrittskriterien

- kein ungelöster Blocker oder kritischer Defekt
- schwere Defekte besitzen verifizierte Korrekturen auf den betroffenen Herstellern
- Reviewer-Anweisungen entsprechen dem getesteten Verhalten

## Phase 4 – Gestaffelter Produktions-Rollout

Nicht direkt mit 100 Prozent starten.

Empfohlene Stufen:

1. 5 Prozent für mindestens 48 Stunden
2. 10 Prozent für mindestens 48 Stunden
3. 25 Prozent für mindestens 72 Stunden
4. 50 Prozent für mindestens 72 Stunden
5. 100 Prozent erst nach ausdrücklicher Prüfung

### Kriterien zum Pausieren

- Crash- oder ANR-Verschlechterung
- wiederholte Meldungen, dass Schutz aktiv erscheint, obwohl der Dienst gestoppt ist
- fehlende Foreground-Benachrichtigung oder fehlende direkte Stop-Aktion
- Overlay lässt sich nicht schließen oder erzeugt eine Schleife
- erheblicher Akkuverbrauch
- Migration oder lokaler Datenverlust
- Problem mit Berechtigungs- oder Richtliniendeklaration
- kritischer herstellerspezifischer Fehler für einen relevanten Nutzeranteil

Bei jeder Stufe:

- aktiven Play-Build prüfen
- Supportfälle nach Hersteller und Android-Version auswerten
- Rollback-Fähigkeit erhalten
- Store-Deklarationen nie unabhängig von der Binärdatei ändern

## Rollback und Hotfix

### Rollback-Vorbereitung

- vorheriges signiertes Produktionsartefakt und Source-Tag aufbewahren
- Kompatibilität lokaler Datenmigration dokumentieren
- Android `versionCode` niemals reduzieren
- Kommunikation für eine vorübergehende Schutz-Deaktivierung vorbereiten

### Hotfix-Anforderungen

- neue Build-Nummer
- vollständige automatische Verifikation
- gezielter Reproduktionstest
- Regression-Smoke-Test auf der Pflichtgeräte-Gruppe
- aktualisierte Diagnose- und Reviewer-Nachweise
- neue strikte Release-Freigabe

## Verantwortlichkeiten vor dem Launch

Namentliche Verantwortliche festlegen für:

- Release-Freigabe
- Android-Build und Signing
- Play-Console-Deklarationen
- Datenschutz und Recht
- Geräte-Matrix
- Batterie- und Zuverlässigkeitstests
- Support-Mailbox
- Defekt-Triage
- Rollout-Überwachung
- Rollback-Entscheidung

## Aktueller Status

Das Repository befindet sich nur in der Vorbereitung von Phase 0. Die GitHub-Verifikation wird wegen einer Abrechnungs- beziehungsweise Spending-Limit-Sperre vor dem ersten Workflow-Schritt gestoppt. Das Release-Freigabemanifest ist absichtlich unvollständig; Release-APK und AAB müssen weiterhin blockiert bleiben.
