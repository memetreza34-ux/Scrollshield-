# ScrollShield – User Research Protocol v1

Status: **Testprotokoll vorbereitet; reale Nutzer-Evidenz noch ausstehend**

Letzte Aktualisierung: **16. August 2026**

Dieses Dokument verhindert, dass subjektives „gefällt mir“ als Produktvalidierung behandelt wird. G0 bleibt **TEILWEISE**, bis reale Nutzer ohne Projektvorwissen beobachtet wurden.

## 1. Ziel

Vor breitem Production-Rollout prüfen, ob neue Nutzer:

- das Produktversprechen verstehen;
- Whole-App-Schutz nicht mit Reels-only verwechseln;
- sensible Android-Berechtigungen nachvollziehen;
- den tatsächlichen Schutzstatus erkennen;
- eine App selbstständig schützen können;
- Emergency und Commitment korrekt verstehen;
- wissen, wie Schutz gestoppt/repariert wird;
- Privacy/Export/Reset finden können.

## 2. Mindestgruppe

Mindestens **5–8 Personen**, die ScrollShield bisher nicht entwickelt oder intensiv gesehen haben.

Bevorzugt gemischt:

- unterschiedliche Android-Erfahrung;
- mindestens zwei verschiedene Hersteller;
- Personen, die Social-/Video-Apps regelmäßig nutzen;
- nicht nur technisch versierte Tester.

Entwickler und Personen, denen der Flow vorher erklärt wurde, zählen nicht als vollständige Erstnutzungs-Evidenz.

## 3. Testbedingungen

- möglichst echter Android-Build, nicht nur Browser-Preview;
- exakte Version/Build dokumentieren;
- Moderator erklärt nicht, wo Buttons liegen;
- keine führenden Fragen;
- erst beobachten, danach nachfragen;
- keine privaten Inhalte fremder Apps in Testaufzeichnungen sammeln.

## 4. Aufgaben

### UR-01 Produktverständnis

Nach Welcome/Onboarding fragen:

> „Was glaubst du, macht ScrollShield und was macht es nicht?“

PASS-Signale:

- versteht, dass ausgewählte Apps bewusst verzögert/limitiert werden;
- erwartet keine medizinische Behandlung;
- erwartet keine heimliche Inhaltsanalyse.

### UR-02 Erste geschützte App

Aufgabe:

> „Schütze eine installierte App so, dass du vor dem Öffnen kurz warten musst.“

Beobachten:

- findet App-Auswahl;
- versteht Berechtigungen;
- erkennt fehlende Voraussetzung;
- kann Schutz starten;
- versteht sichtbare Foreground-Benachrichtigung.

### UR-03 Echten Status erkennen

Szenario:

- Schutzdienst aktiv;
- danach Dienst/Permission kontrolliert stoppen oder entziehen.

Frage:

> „Ist ScrollShield gerade wirklich aktiv? Woran erkennst du das?“

Kritischer Fehler:

- Nutzer glaubt aufgrund der UI, Schutz sei aktiv, obwohl Android `running=false` meldet.

### UR-04 Öffnungspause

Nutzer öffnet geschützte App.

Beobachten:

- versteht Countdown;
- findet Home-Rückweg;
- versteht „Bewusst öffnen“;
- keine Overlay-Trap.

### UR-05 Emergency

Szenario mit strengem Block und verfügbarem Emergency.

Frage:

> „Was passiert, wenn du die App aus einem wichtigen Grund trotzdem brauchst?“

PASS:

- Nutzer versteht Emergency als begrenzten Safety-Ausgang, nicht als normalen Bypass.

### UR-06 Commitment

Aufgabe:

> „Aktiviere Commitment für eine Stunde. Was glaubst du, kannst du danach noch ändern und was nicht?“

PASS:

- versteht freiwilliges Einfrieren von Schutzkonfiguration;
- erwartet keine unüberwindbare Geräte-Sperre;
- versteht, dass Recovery/Permissions/Reset als Safety-Pfade existieren.

### UR-07 Privacy/Export/Reset

Aufgabe:

> „Finde heraus, welche Daten ScrollShield nutzt und wie du deine lokalen Daten sichern oder löschen würdest.“

PASS:

- Privacy/Help auffindbar;
- Export/Reset verständlich;
- keine Erwartung eines Cloud-Kontos in v1.

## 5. Messwerte

Pro Person erfassen:

```text
Participant ID:
Device/Android:
Candidate Version/Build:
UR-01 PASS/FAIL + Notiz
UR-02 PASS/FAIL + Abbruchstelle
UR-03 PASS/FAIL
UR-04 PASS/FAIL
UR-05 PASS/FAIL
UR-06 PASS/FAIL
UR-07 PASS/FAIL
Setup ohne Hilfe abgeschlossen: JA/NEIN
Anzahl Moderator-Hilfen:
Größte Verwirrung:
Kritischer Missverständnis-Punkt:
Verbesserungsvorschlag:
```

Keine Klarnamen oder unnötigen personenbezogenen Details im Repo speichern.

## 6. Release-kritische Findings

G0/G3 dürfen bei folgenden Mustern nicht als ausreichend validiert gelten:

- mehrere Nutzer verstehen Whole-App vs. Reels-only falsch;
- Permission-Zweck wird als heimliche Überwachung verstanden;
- Schutzstatus wird systematisch falsch interpretiert;
- Home/Stop/Recovery ist nicht auffindbar;
- Emergency/Commitment wird als unüberwindbare Sperre verstanden;
- Reset wird versehentlich ausgelöst oder Datenwirkung ist unklar.

## 7. Auswertung

Nach 5–8 Sessions:

- wiederkehrende Probleme gruppieren;
- Severity vergeben;
- P0/P1-UX-/Safety-Findings vor Release beheben;
- geänderte Flows mit mindestens betroffenen Aufgaben erneut testen;
- Ergebnis-Summary mit Candidate Version/Build ergänzen.

## 8. Status

Aktuell: **PROTOKOLL VORBEREITET, KEINE REALE NUTZER-EVIDENZ**.

Dieses Dokument darf erst nach tatsächlichen Sessions um Ergebnisse ergänzt werden. Keine erfundenen PASS-Werte.
