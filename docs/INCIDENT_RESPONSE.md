# ScrollShield – Incident Response & Hotfix v1

Status: **verbindlicher Betriebs- und Reaktionsprozess**

Letzte Aktualisierung: **16. August 2026**

Ein Store-Release beendet die Engineering-Verantwortung nicht. ScrollShield schützt Nutzerverhalten auf Systemebene; deshalb brauchen Fehlermeldungen zu Datenverlust, falschem Schutzstatus, Overlay-Traps und Batterieproblemen eine klare Reaktion.

## 1. Severity

### P0 – Critical

Beispiele:

- Datenverlust oder irreversible Legacy-Korruption;
- signifikante unerwartete Übertragung lokaler Daten;
- Overlay lässt keinen sicheren Exit zu;
- App zeigt Schutz als aktiv, obwohl der Dienst in einem relevanten Hauptpfad sicher nicht läuft;
- kompromittierter Signing-Key/Store-Credential;
- Store-/Permission-Verhalten verletzt gravierend die deklarierte Funktion.

Reaktion:

- Rollout sofort pausieren;
- betroffenen Release-Kandidaten sperren;
- falls nötig Store-Verfügbarkeit/Kommunikation anpassen;
- Ursache reproduzieren;
- Hotfix mit neuer VersionCode/Candidate SHA;
- relevante volle Regression + Device-Nachweis.

### P1 – High

Beispiele:

- häufige Service-Ausfälle auf relevantem OEM;
- kritische Permission-/Recovery-Schleife;
- Commitment blockiert Recovery;
- falsche Limit-/Emergency-Entscheidung;
- signifikanter ANR-/Crash-/Batterie-Anstieg.

Reaktion:

- laufenden Rollout pausieren oder nicht erhöhen;
- priorisierte Reproduktion innerhalb des Release-Prozesses;
- gezielter Hotfix oder dokumentierte Deaktivierung des betroffenen Features.

### P2 – Medium

Beispiele:

- nicht-kritische UX-Verwirrung;
- einzelner Hersteller-Sonderfall mit Workaround;
- inkorrekte Copy ohne falschen Sicherheitszustand.

Reaktion:

- Backlog mit Verantwortlichem und Zielversion;
- vor nächstem breiten Rollout bewerten.

### P3 – Low

- kosmetische Fehler;
- Animation/Spacing;
- kleine nicht-funktionale Inkonsistenzen.

## 2. Eingangskanäle

v1 ohne eigenes Analytics-SDK:

- Play Console Android Vitals;
- Support-Mailbox;
- Closed-Test-Feedback;
- freiwillig kopierte Diagnose-JSONs;
- reproduzierbare GitHub-Issues;
- Store-Bewertungen als Signal, nicht als alleinige technische Evidenz.

## 3. Mindestinformationen für technische Meldungen

Soweit verfügbar:

```text
Version Name:
Version Code:
Candidate/Commit (wenn Testbuild):
Gerät:
Android-Version:
Hersteller:
Schritte zur Reproduktion:
Erwartetes Verhalten:
Tatsächliches Verhalten:
lastProtectionStopCode:
lastProtectionStopMessage:
Diagnose-JSON-Referenz:
Screenshot/Video:
Häufigkeit:
```

Keine Nutzer auffordern, private Nachrichten, Passwörter oder unnötige fremde App-Inhalte zu teilen.

## 4. Triage-Ablauf

1. Meldung klassifizieren.
2. Prüfen, ob Daten-/Safety-/Store-Risiko besteht.
3. Exakte Version/Build bestimmen.
4. Reproduktion auf möglichst ähnlichem Gerät versuchen.
5. Lifecycle-/Permission-/Diagnosezustand prüfen.
6. Severity P0–P3 vergeben.
7. Owner benennen.
8. Fix oder bewusste Nicht-Fix-Entscheidung dokumentieren.
9. Regression definieren.
10. bei Release-Hotfix neue Candidate SHA und neue Evidence verwenden.

## 5. Rollout-Stoppkriterien

Rollout nicht erhöhen bzw. pausieren bei:

- P0;
- ungeklärter P1-Serie;
- Crash-/ANR-Verschlechterung;
- wiederholtem falschem „Schutz aktiv“-Status;
- fehlender Foreground-Notification/Stop-Kontrolle;
- Overlay-Exit-Problemen;
- ungewöhnlichem Batterie-/Wärmeproblem;
- Migration-/Datenverlustmeldungen;
- relevanter Play-Policy-/Permission-Abweichung.

## 6. Hotfix ist neuer Release-Kandidat

Ein Hotfix übernimmt **nicht** automatisch die Evidence des vorherigen Builds.

Pflicht:

- neuer `versionCode`;
- Fix-Commit;
- neue Candidate SHA;
- `npm run verify`;
- Android JUnit/Build;
- reproduzierter Fehler jetzt PASS;
- relevante Regressionen;
- betroffene Geräte erneut testen;
- aktualisierte Binary-/Store-Evidence, wenn Manifest/SDK/Permission betroffen;
- neuer Release-Gate.

## 7. Feature Kill / Degradation

ScrollShield v1 besitzt keinen Cloud-Remote-Kill-Switch. Deshalb müssen riskante native Funktionen konservativ eingeführt werden.

Wenn eine Funktion auf bestimmten Geräten unzuverlässig ist:

- nicht fälschlich als zuverlässig bewerben;
- ggf. lokale Konfiguration/Feature Flag im nächsten Hotfix deaktivieren;
- sicheren Basisbetrieb erhalten;
- Diagnose sichtbar machen.

Ein späterer Remote-Konfigurationsmechanismus wäre selbst ein Privacy-/Security-/Availability-System und benötigt eigenes Threat Model.

## 8. Postmortem bei P0/P1

Nach schwerem Vorfall dokumentieren:

- Was ist passiert?
- Welche Nutzer/Builds waren betroffen?
- Warum haben Tests/Gates es nicht verhindert?
- Welche unmittelbare Korrektur wurde vorgenommen?
- Welche dauerhafte Prävention wird ergänzt?
- Welcher Checker/Test/Device-Fall verhindert Wiederholung?
- Müssen Store-/Privacy-/Reviewer-Dokumente geändert werden?

Ziel ist Systemverbesserung, nicht Schuldzuweisung.

## 9. Verantwortlichkeiten vor Production

Vor G14 müssen namentlich feststehen:

- Release-Freigabe;
- Android Build/Signing;
- Play Console;
- Privacy/Legal;
- Support-Mailbox;
- Incident Triage;
- Rollout-Pause/Resume-Entscheidung;
- Hotfix-Koordination.
