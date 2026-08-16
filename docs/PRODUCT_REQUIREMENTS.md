# ScrollShield – Product Requirements v1

Status: **verbindliche Produktanforderungen für Android v1**

Letzte Aktualisierung: **16. August 2026**

Dieses Dokument übersetzt die Produktidee in prüfbare Anforderungen. Eine Funktion gilt nicht als fertig, weil sie sichtbar ist, sondern erst wenn ihre Akzeptanzkriterien auf dem tatsächlichen Android-Build erfüllt sind.

## 1. Produktproblem

ScrollShield richtet sich an Nutzer, die Social-, Video- und Entertainment-Apps häufiger oder länger öffnen als beabsichtigt. Das Produkt soll den Impuls vor der Nutzung unterbrechen und den Nutzer zu einer bewussten Entscheidung führen.

ScrollShield v1 ist **kein medizinisches Produkt**, kein Diagnosesystem, kein manipulationssicheres Device-Management-System und kein heimliches Überwachungswerkzeug.

## 2. Kernversprechen

> ScrollShield legt auf Android eine vom Nutzer konfigurierte Entscheidungsebene vor ausgewählte Apps und kann Öffnungspausen, Zeitlimits, Zeitpläne, Fokusregeln und lokale Anti-Binge-Regeln anwenden.

Nur Funktionen, die im exakten Release-Build technisch vorhanden und getestet sind, dürfen Store- oder In-App-Versprechen werden.

## 3. Primäre Zielgruppe v1

Primär:

- Android-Nutzer, die impulsive App-Öffnungen reduzieren wollen;
- Nutzer, die keine Cloud oder keinen Account für diese Grundfunktion benötigen;
- Nutzer, die Regeln selbst festlegen und jederzeit den tatsächlichen Schutzstatus sehen wollen.

Nicht primär in v1:

- Eltern-/Kinder-Fernverwaltung;
- Unternehmen/MDM;
- medizinische Behandlung;
- iOS-Nutzer mit erwartetem Android-Paritätsumfang;
- Nutzer, die eine technisch unüberwindbare Sperre erwarten.

## 4. v1 Must-have Scope

### PR-01 Onboarding und Produktwahrheit

Der Nutzer versteht vor sensiblen Berechtigungen:

- was ScrollShield schützt;
- dass v1 Whole-App-Schutz nutzt;
- welche Android-Zugriffe benötigt werden;
- dass Inhalte fremder Apps nicht gelesen werden;
- dass lokale Schutzdaten standardmäßig auf dem Gerät bleiben.

**Akzeptanz:** Keine Berechtigung wird als bereits aktiv dargestellt, bevor Android dies bestätigt.

### PR-02 Geschützte Apps auswählen

Der Nutzer kann unterstützte, tatsächlich installierte Apps aktivieren/deaktivieren.

**Akzeptanz:** Eine nicht installierte Ziel-App darf nicht als funktional geschützt aktiviert werden.

### PR-03 Öffnungspause

Für eine konfigurierte App kann vor normalem Zugriff eine bewusste Pause erscheinen.

**Akzeptanz:** Countdown, Home-Rückweg und Freigabe entsprechen der gespeicherten Regel. Ein längerer manueller Delay wird durch adaptive Logik nie verkürzt.

### PR-04 Session-Limit

Eine bewusste Freigabe darf zeitlich begrenzt sein.

**Akzeptanz:** Nach Ablauf der Session greift der Schutz beim nächsten relevanten Zugriff wieder entsprechend der aktiven Regel.

### PR-05 Tageslimit

Eine geschützte App kann nach Erreichen eines lokalen Tageslimits blockiert werden.

**Akzeptanz:** Exakte Grenzwerte und Tageswechsel werden von derselben nativen Policy bewertet, die durch JVM-Tests geschützt ist.

### PR-06 Zeitpläne

Der Nutzer kann vordefinierte Schutzfenster für typische Tages-/Wochenphasen verwenden.

**Akzeptanz:** Wochenend-, Nacht- und über-Mitternacht-Fälle sind deterministisch definiert und besitzen Testfälle.

### PR-07 Fokusmodus

Ein aktiver Fokusmodus kann ausgewählte Apps strenger behandeln.

**Akzeptanz:** React-Anzeige und nativer Schutz verwenden denselben aktiven Fokuszustand.

### PR-08 Anti-Binge

Wiederholte bewusste Öffnungen können zuerst Warn-/Reibungsstufen und anschließend eine harte Schwelle auslösen.

**Akzeptanz:** Nur definierte erfolgreiche Öffnungen zählen. Die harte Sperrschwelle hat Vorrang vor adaptiver Normalfreigabe.

### PR-09 Adaptive Friction

Ab der konfigurierten Anti-Binge-Warnschwelle kann die normale Öffnungspause deterministisch steigen.

**Akzeptanz:** Aktuelles v1-Verhalten: +5 Sekunden je weiterem gezählten Öffnungsvorgang, maximal 60 Sekunden; Notfall-Countdowns werden dadurch nicht verlängert.

### PR-10 Emergency Flow

Der Nutzer behält einen begrenzten sicheren Notfallweg.

**Akzeptanz:** Notfallregeln, Tagesmaximum und eigener Countdown bleiben von normaler adaptiver Reibung getrennt.

### PR-11 Commitment Mode

Der Nutzer kann freiwillig Konfigurationsänderungen für 1 h, 8 h oder 24 h einfrieren.

**Akzeptanz:** Aktivierung erst nach bestätigter installierter Ziel-App und gesundem nativen Schutzdienst (`running=true`, `enabled=true`). Normaler App-interner Stop ist während aktivem Commitment gesperrt; Reparatur, Notfall-/Safety-Wege und vollständiger Reset bleiben möglich. Kein Versprechen von Manipulationssicherheit.

### PR-12 Echte Schutzstatusanzeige

ScrollShield unterscheidet Konfiguration von tatsächlichem Android-Servicezustand.

**Akzeptanz:** `running=false` darf nicht als aktiver Schutz dargestellt werden. Ein angeforderter Stop wird erst als abgeschlossen bestätigt, wenn Android `running=false` meldet.

### PR-13 Berechtigungsverlust

Wenn kritische Voraussetzungen verschwinden, darf Schutz nicht unsichtbar weiterlaufen oder fälschlich aktiv erscheinen.

**Akzeptanz:** Verlust von Usage Access, Overlay, Notifications/Schutzkanal, letzter aktiver Regel oder letzter installierter Ziel-App führt zum definierten Safe-Shutdown mit lokaler Diagnose.

### PR-14 Reboot/App-Update Recovery

Ein zuvor bewusst aktivierter Schutz darf nur wiederhergestellt werden, wenn alle Voraussetzungen weiterhin erfüllt sind.

**Akzeptanz:** Fehlende Voraussetzung erzeugt einen eindeutigen `recovery_*`-Grund und keine stale Aktiv-Anzeige.

### PR-15 Lokale Historie und Statistik

Schutzentscheidungen und gemessene bewusste Nutzungszeit können lokal sichtbar werden.

**Akzeptanz:** Keine Store-/UI-Kennzahl darf aus erfundenen Nutzungsdaten entstehen.

### PR-16 Export, Import und Reset

Nutzer können lokale Daten exportieren, valide Backups importieren und vollständig zurücksetzen.

**Akzeptanz:** Import ist validiert und größenbegrenzt. Vollreset stoppt nativen Schutz mit `factory_reset` und entfernt ScrollShield-eigene Persistenz einschließlich Commitment Lock.

### PR-17 V0.7-Datenrettung

Bestehende V0.7-/Legacy-Daten dürfen nicht still verloren gehen.

**Akzeptanz:** Vor Quelllöschung existiert ein verifiziertes bytegenaues Legacy-Archiv; ungelöste Migration blockiert normale Schreibpfade. Details: `docs/DATA_MIGRATION.md`.

### PR-18 Privacy/Support/Help

Der Nutzer kann vor und nach Setup nachvollziehen, welche Zugriffe verwendet werden und wie Daten exportiert/gelöscht werden können.

**Akzeptanz:** Release-Build, Privacy Policy und Play-Angaben dürfen einander nicht widersprechen.

## 5. Explizite Nicht-Ziele v1

Nicht als v1-Funktion versprechen:

- zuverlässige Reels-/Shorts-Unterseiten-Erkennung;
- iOS-Parität;
- Cloud-Sync;
- Nutzerkonto;
- Social-/Partner-Fernsteuerung;
- versteckte Überwachung;
- medizinische Wirkung;
- AI-/ML-Suchtklassifikation;
- manipulationssichere oder unüberwindbare Sperre;
- kaufbares Pro ohne vollständigen Billing-/Entitlement-Lifecycle.

## 6. Qualitätsanforderungen

### QR-01 Datenintegrität

Keine neue Funktion darf Legacy-/Bestandsdaten ohne validierten Migrationspfad zerstören.

### QR-02 Offline-First

Die v1-Kernschutzfunktion darf nicht von einem ScrollShield-Backend abhängig sein.

### QR-03 Statuswahrheit

UI-Zustand muss bei sicherheitsrelevanten Statuswerten aus dem echten Android-Zustand ableitbar sein.

### QR-04 Safe Exit

ScrollShield darf das Gerät nicht in einen Zustand bringen, aus dem der Nutzer ohne Systemeingriff nicht sicher herauskommt.

### QR-05 Accessibility

Kritische Setup-, Overlay-, Stop-, Recovery- und Emergency-Aktionen müssen mit großer Schrift und grundlegendem TalkBack-Smoke-Test erreichbar bleiben.

### QR-06 Performance/Batterie

Der Foreground-Schutz muss auf realen Geräten über längere Laufzeit gemessen werden; reine Source-Annahmen reichen nicht.

### QR-07 Privacy

Neue SDKs, Netzwerkziele oder Telemetrie verändern die Privacy-/Data-Safety-Annahmen und benötigen vor Integration eine bewusste Prüfung.

## 7. Produktmetriken ohne Tracking-SDK

Für v1 keine heimliche Nutzungsanalyse einführen. Produktqualität kann zunächst über folgende Quellen beurteilt werden:

- Play Android Vitals;
- freiwillige Tester-/Supportmeldungen;
- lokal kopierte Diagnose-JSONs;
- strukturierte Closed-Test-Fragebögen;
- reproduzierbare GitHub-Issues.

## 8. Nutzerforschung – noch offene Evidenz

Die technische Produktthese ist gut definiert, aber reale Nutzerforschung ist noch nicht ausreichend belegt.

Vor breitem Production-Rollout mindestens:

- 5–8 neue Nutzer ohne Vorwissen beobachten;
- messen, ob sie Berechtigungssetup und Schutzstatus verstehen;
- prüfen, ob Emergency/Commitment nicht missverstanden werden;
- erfassen, welche Regeln tatsächlich genutzt werden;
- dokumentieren, wo Nutzer abbrechen oder falsche Erwartungen haben.

Ergebnisse gehören später in `docs/USER_RESEARCH.md`. Bis dahin ist User Research **TEILWEISE**, nicht `FERTIG`.

## 9. Feature-Definition-of-Done

Jede neue Funktion benötigt vor Merge mindestens:

1. verknüpfte Produktanforderung oder bewusst dokumentierte Scope-Erweiterung;
2. Daten-/Migrationsentscheidung;
3. Happy Path + Fehlerzustände;
4. Privacy-/Permission-Auswirkungsprüfung;
5. passende Unit-/Integration-/Native-Tests;
6. reale Device-Szenarien, wenn Android-Systemverhalten betroffen ist;
7. aktualisierte Dokumentation;
8. keine positive Release-Evidence ohne reale Ausführung.
