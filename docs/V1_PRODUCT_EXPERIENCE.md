# V1 Product Experience — Nutzerperspektive und vollständige Interaktionsspezifikation

**Stand:** 2026-10-09 · **Auftrag:** Produktverantwortung + UX-Design + Entwicklung.  
**Priorität:** [Masterplan](V1_MASTER_PLAN.md) → [Execution Plan](V1_EXECUTION_PLAN.md) → dieser UX-Vertrag. Kein neues Feature außerhalb V1.

> Frage vor jeder Entscheidung: „Wenn ich ScrollShield zum ersten Mal installiere, weiß ich ohne Erklärung, was es für mich tut – und kann ich ihm vertrauen?“

## A. Wer die App benutzt und was diese Menschen wirklich brauchen

| Situation | Nutzererwartung | Produktantwort |
| --- | --- | --- |
| „Ich öffne Instagram automatisch.“ | Erkennbare Unterbrechung **bevor** ich weiter scrolle | Native Öffnungs-Pause; klar beschriftet: **Zurück** / **Trotzdem öffnen** |
| „Zehn Sekunden später bin ich wieder da.“ | Die App merkt **Wiederöffnen**, nicht nur Nutzungsdauer | Adaptive Reopen mit nachvollziehbar stärker werdender Pause |
| „Ich will jetzt 30 Minuten lernen.“ | Ein Knopf, Start, klare Restzeit, kein Konfigurationslabyrinth | Hauptaktion **Fokus starten** von Heute; 15/30/60 für Free |
| „Ich muss dringend in eine gesperrte App.“ | Echte Notfalllösung statt Paywall oder Panik | Emergency Unlock gemäß Grenzen, ohne Kaufzwang |
| „Ich will wissen, ob das etwas bringt.“ | Ehrliche, einfache Zahlen, keine erfundenen Erfolge | „Öffnungsversuche“, „bewusst abgebrochen“, gemessene Minuten; bei fehlender Berechtigung „Nicht verfügbar“ |
| „Ich möchte bezahlen / kündigen.“ | Eindeutiger Mehrwert, Preis, Trial, Verlängerung, jederzeit auffindbare Verwaltung | Kontext-Paywall, sichtbares Free, Store-Preis, Restore/Manage |
| „Die App funktioniert gerade nicht.“ | Grund und konkrete Lösung, kein grünes „aktiv“-Signal | Servicegesundheit, Permission-Status und klare Wiederherstellungsschritte |

**Zielgruppe:** Menschen ab der final bestätigten Store-Zielgruppe (bisher 16+ vorgesehen), die Ablenkung reduzieren wollen. Nicht als medizinisches Angebot, Behandlung für ADHS oder Suchttherapie positionieren. Keine Beschämung, Strafsprache, „Du hast versagt“ oder unrealistische Erfolgsversprechen.

**Nutzerversprechen in einem Satz:** „Öffne bewusst statt automatisch. ScrollShield unterbricht impulsive App-Starts und erhöht die Pause, wenn du schnell wieder zurückkommst.“

## B. Die ersten 90 Sekunden — Onboarding Journey

| Schritt | Was Nutzer sehen/tun | Produkt-/Testanforderung |
| --- | --- | --- |
| 1. Willkommen | Schild-Identität, 1 Satz Nutzen, eine Hauptaktion „Schutz einrichten“ und „Wie funktioniert das?“ | Kein „KI analysiert dein Verhalten“, kein Scroll-Feed-Versprechen |
| 2. Aha-Moment | Ein sehr kurzes, **klar als Vorschau bezeichnetes** Beispiel: Instagram → 5s Pause → Zurück/Weiter → erneutes Öffnen stärker | Der Demo-Flow darf nicht suggerieren, bereits Apps systemweit zu blockieren |
| 3. Apps wählen | Unterstützte Apps als klare Liste mit Logo/neutralem Fallback, Such-/Kategoriezugriff soweit vorhanden, Free-Zähler 0/2, dann 1/2 und 2/2 | Auswahl darf nicht unsichtbar Pro aktivieren; null/keine installierte App als verständlicher Zustand |
| 4. Schutz wählen | Empfohlen „Ausgewogen“, optional „Sanft“, knappes Beispiel aus dem Alltag | Erweitertes Regelmenü zunächst verborgen; sofort startklar |
| 5. Berechtigungen | Android Usage Access und „Über anderen Apps“ **nacheinander**, jeweils mit konkretem Nutzen und OS-Einstellungssprung | Nach OS-Rückkehr echten Status neu abfragen; Verweigern erlauben und ehrlich als eingeschränkt zeigen |
| 6. Fertig | „Schutz eingerichtet“ **nur wenn** Berechtigungen und Dienst tatsächlich bereit; sonst „Noch ein Schritt“ | Heute zeigt Status, 2 Apps, Fokus-Start, nächste Aktion |
| 7. Erste echte Intervention | Countdown, App-Name, positive Alternative | Niemals Statusleisten-/Systemdialog-Nachahmung oder verdeckte Kosten |

Nutzer können jederzeit zurückgehen oder die Konfiguration später ändern. Kein Kaufdialog in Onboarding/Berechtigungen; kein Fake-Einrichtungsfortschritt. Zustände „übersprungen“ und „Berechtigung abgelehnt“ müssen die App weiter bedienbar lassen.

## C. Navigation und Struktur

**Exakt drei dauerhafte Tabs:** Heute · Schutz · Einblicke.  
**Oben:** kontextabhängiger Titel, diskretes Einstellungen-Symbol; Hauptaktionen sinnvoll erreichbar.  
**Außerhalb Tabs:** Onboarding, App-Details, Schedule-Editor, Fokus-Session, Rescue, Notfall-Unterbrechung, Paywall, Berechtigungen, Einstellungen, Support, Datenschutz und Diagnose.

Android Back darf **niemals** versehentlich eine Strict-Session aufheben. Falscher Back-Sprung, verlorene Änderungen und überlagerte Dialoge sind Release-Blocker.

## D. Screen-by-Screen-Beschreibung — Zielzustand

### D1. Heute — in 3 Sekunden verständlich

**Oberste Inhalte in dieser Reihenfolge:** Header → ehrlicher Schutzstatus („Aktiv“, „Eingeschränkt“ oder „Nicht eingerichtet“) → große Fokus-CTA → sekundäre Rescue-Aktion mit Pro-Markierung → **eine** vertrauenswürdige Kennzahl des Tages → geschützte Apps → Wiederöffnungs-Hinweise und nächster Zeitplan.

- **Aktiv:** dezent emerald, nie pauschal, wenn Berechtigung/Monitordienst fehlt.
- **Kein Schutz:** „Wähle zwei Apps, die dich besonders ablenken.“ → „Apps auswählen“.
- **Permission fehlt:** „App-Zugriff fehlt“ → „Berechtigung prüfen“; kein grünes Sicherheitsgefühl.
- **Keine Statistik:** „Noch keine Unterbrechung heute“ statt Demo-Wert.
- **Läuft Fokus:** Restzeit und eindeutige Sitzungsaktion; nicht zusätzlich „Fokus starten“ wie bei Nullzustand.
- **Pro-Vorschau:** Rescue ist sichtbar als Pro, aber Free-Nutzer bleibt auf Heute sinnvoll handlungsfähig.

**Erfolgstest:** Testnutzer erkennt ohne Erklärung in unter 5 Sekunden, ob Schutz aktiv ist und wie ein Fokus gestartet wird. Dieser Wert ist **ein UX-Testziel**, keine bereits erreichte Messung.

### D2. Schutz — einfach zuerst, mächtig bei Bedarf

Oben „Deine Apps“, Free-Kontingent verständlich „1 von 2 geschützt“. Darunter App-Liste mit Status. Tippen öffnet Detailansicht.

**App Detail** in progressiver Reihenfolge: Name/aktiv → Preset (Sanft/Ausgewogen/Stark Pro/Eigene Pro) → Beispiel-Formulierung → unter „Weitere Regeln“ Reopen-Intensität, Öffnungspause, Session Guard Pro, Tagesbudget Pro, Notfallfreigabe, Zeitplan-Verknüpfung. **Keine** Reels-, Shorts- oder Accessibility-Funktion in V1.

- Beim dritten App-Versuch: Kontext-Paywall mit klarer Free-Alternative und Rückweg.
- Nicht installierte Apps/alternative Paketnamen verständlich behandeln; keine „geschützt“-Behauptung ohne Systembezug.
- Wechsel des Presets: Konsequenz als Text, keine versteckte Sperrverschärfung.
- Gefährliches Setting: Bestätigung mit Möglichkeit zur Korrektur, keine rote Panikgestaltung.
- Änderungen werden deterministisch im nativen Contract übernommen; Offline-Browser ist nur Demo.

### D3. Zeitplan — Kalendergefühl statt Technikformular

Ein Zeitplan: Name (optional, vernünftiger Default), Beginn, Ende, betroffene Apps, aktiv/inaktiv, konkrete Zusammenfassung „Täglich von 21:00 bis 07:00“. Über-Mitternacht-Regel klar.

- Invalid: gleiche Start-/Ende-Stunde nicht stillschweigend 24h sperren; eindeutiger Fehler/Abschalten nach finalem Produktentscheid.
- Überlappungen und Fokus-Präzedenz vorhersehbar.
- Free: 1 Zeitplan; zweiter löst Pro-Paywall aus, bestehender bleibt bearbeitbar.
- Systemzeit/DST: Darstellung muss dem tatsächlichen Android-Regelverhalten entsprechen.

### D4. Fokus / Rescue / aktive Sitzung

**Fokus-Start:** 15 / 30 / 60 Minuten (Free), ausgewählte geschützte Apps kurz anzeigen, starke primäre „Fokus starten“-Aktion. Keine komplizierten täglichen Ziele.

**Laufend:** große Zeit, sichtbarer Status „Fokus läuft“, geschützte Apps, verständlicher Hinweis was passiert, wenn die App geschlossen wird. Bei erlaubtem vorzeitigen Ende Bestätigung; bei strenger/Rescue-Sitzung korrekte Einschränkung plus erlaubter Notfallweg.

**Fokus-Ende:** neutrale Abschlussmeldung; nur reale Sitzungsdauer und echte Interventionen, keine erfundene „gerettete Zeit“. Keine aufdringliche Bewertungsanfrage.

**Rescue Pro:** Ein klar abgegrenzter schneller Schutzmodus, keine zweite App-Konfigurationsseite. Ablauf und „nicht vorzeitig beendbar“-Konsequenz **vor** dem Start erklären, keine überraschenden Sperren.

### D5. Native Unterbrechung — die wichtigste Oberfläche

Jede Intervention muss aus Android/Kotlin heraus **auch bei geschlossener React-WebView** sinnvoll funktionieren.

**Visuelle Hierarchie:**
1. vertrauenswürdige ScrollShield-Identität (keine Android-Systemdialog-Imitation)
2. App-Name und knappes „Kurz prüfen: Willst du wirklich öffnen?“
3. Countdown/Progress mit guter Lesbarkeit, korrektem Delay
4. stärkere Reopen-Erklärung nur wenn zutreffend: „Du hast diese App vor Kurzem erneut geöffnet.“
5. **Zurück** als leichte, aber gut erreichbare Handlung; **Trotzdem öffnen** nach der zulässigen Pause
6. separater, nachvollziehbarer Emergency-Unlock-Weg sofern gestattet

**Gefahrenfälle:** falsche App im Vordergrund; schnelle Switches; App nicht mehr installiert; Lockscreen; Overlay-Permission entzogen; Service gestoppt; TalkBack; Multifenster; Gesture Back; Anruf, Notruf, Systemoberfläche; Absturz. Ergebnis muss sicher sein: kein veraltetes Overlay auf einer fremden App, keine Behinderung grundlegender Gerätefunktionen, kein versperrter System-Rückweg. Harte Ausnahmeliste/OS-Policy separat prüfen, nicht blind behaupten.

### D6. Einblicke — datenbasiert ohne erfundene Motivation

Free: Heute, echte Öffnungsversuche, abgebrochene/akzeptierte Öffnungen, Reopens, gemessene Nutzung und Fokus. Pro: Woche, Vorwochenvergleich, sinnvolle Muster je App.

Jede Zahl kennzeichnen als **MEASURED / DERIVED / UNAVAILABLE**. Keine aus Interventionszahl geschätzten Minutenersparnisse, keine sinnlosen Streak-Belohnungen. Graph nur, wenn ausreichend echte Daten vorhanden.

Nullzustand: „Nach deiner ersten Unterbrechung siehst du hier …“. Permission entzogen: Daten „Nicht verfügbar“ und Ursache angeben. Nie künstlich Demo-Daten als Nutzerverhalten ausgeben.

### D7. Einstellungen, Datenschutz, Support und Hilfe

Oberflächenstruktur: **Schutzstatus und Berechtigungen** → Benachrichtigungen → Datenschutz (lokale Daten, Export/Import, löschen) → Pro/Käufe (Planstatus, wiederherstellen, verwalten) → Hilfe, Rechtliches, App-Version.

- Reset löscht auch native Regeln/Logs, stoppt den Monitor und führt zum Onboarding; Bestätigung und danach Nachweis.
- Export/Import: Dateiformat/Privatsphäre erklären; fehlerhafte Datei erzeugt sichere Fehlermeldung ohne Datenverlust.
- Hilfe: konkrete „Warum wurde die Unterbrechung nicht angezeigt?“-Diagnose.
- Links nur auf echte, kontrollierte Ziele. Keine Platzhalter-E-Mail in Release.
- Pro verwalten und kündigen leicht auffindbar, nicht im Untermenü verstecken.

### D8. Pro-Paywall

Siehe [Billing-Spezifikation](V1_BILLING_EXPERIENCE.md). Kontext zuerst („Du möchtest eine dritte App schützen“), dann **anhaltender Nutzen**, zwei Pläne, präzise Preise und Trial-Bedingungen. Sichtbares „Kostenlos weiter“, Restore und später Manage. Keine Schuldgefühle, Countdown-Verkaufstricks oder absichtlich schwer schließbaren Dialoge.

## E. Vollständige Zustandsmatrix für jeden Bildschirm

Jeder Screen braucht vor „done“ mindestens:

- **First run / no content** (keine geschützten Apps, keine Statistik, kein Zeitplan)
- **Normal mit Daten**
- **Lädt** (ohne flackernde Layoutsprünge)
- **Permission fehlt / entzogen**
- **Android/Native Bridge nicht verfügbar** (Webdemo klar gekennzeichnet)
- **Fehler / Timeout** mit Wiederholaktion
- **Offline** (Basic-Schutz bleibt lokal)
- **Free / Pro / Pro verloren** jeweils ohne gestohlene Funktion oder verlorene gespeicherte Konfiguration
- **Große Schrift, kleine Displays, TalkBack, Landscape, Gestensteuerung**
- **Background/Resume**, insbesondere nach OS-Systemeinstellungen

**QA-Nachweis:** Screenshots für „Empty“, „Normal“, „Error“, „Free“, „Pro“ auf zwei Gerätebreiten; Interaktionsaufzeichnung für Öffnungs-Pause und Reopen.

## F. Mikrotext- und UX-Regeln

- Einfaches Deutsch („Zurück“, „Trotzdem öffnen“, „Schutz aktiv“, „Berechtigung fehlt“). Keine technischen Begriffe als Haupttext.
- Nicht behaupten „Du hast X Minuten gespart“, wenn es keine Messung gibt.
- Nicht „App 100 % blockiert“ sagen; Android kann Berechtigungen und Prozesse jederzeit verändern.
- Notfall-Unlock darf nicht durch Werbung, Rating-Anfrage oder Kauf unterbrochen werden.
- Strenger Fokus muss vorher auf Risiken und Ablauf hinweisen; kein dauerhaftes Lockout.
- Keine OS-Permission-Screens oder Fremd-App-Oberflächen nachahmen.
- Nicht jeden Screen mit Pro-Badges überladen: Kosten sichtbar erst bei tatsächlicher Interaktion.

## G. Zehn realistische Akzeptanzszenarien

1. Installation → App wählen → Permission verleihen → erste echte Unterbrechung ohne Entwicklerhilfe.
2. App öffnen → Weiter → Home → zurück → längere Reopen-Pause; niemals 5-Minuten-Freipass.
3. Schnell von Instagram zu YouTube wechseln → kein Instagram-Overlay über YouTube.
4. Permission im OS entziehen → Heute zeigt eingeschränkten Schutz → nach Regrant wieder korrekt.
5. Erstes Tagesereignis → ehrliche Statistik, kein Dummywert; App-Neustart verdoppelt nichts.
6. Free-Nutzer versucht dritte App → Kontext-Paywall → schließen → bestehende zwei Apps bleiben geschützt.
7. Fokus starten → App schließen → Session läuft und endet im Native-Regelwerk korrekt.
8. Notfallfreigabe bei zulässiger Regel → Countdown → befristeter Zugang → Kontingent gezählt.
9. Pro wird nach verifiziertem Ablauf entzogen → kostenlose zwei Apps bleiben nutzbar, gespeicherte Extras werden nicht gelöscht.
10. Alle Berechtigungen verweigert → App navigierbar, klare Erklärung, keine irreführende „Schutz aktiv“-Anzeige.

## H. Nicht verhandelte Abnahme

Die funktionalen E2E- und Gerätechecks aus [V1 Execution Plan](V1_EXECUTION_PLAN.md) gelten zusammen mit dieser UX-Spezifikation. Kein Screen wird durch „sieht auf meinem Rechner gut aus“ freigegeben. **Code, visuelle Prüfung, echte Zustände und Gerätetest** müssen zusammenpassen.
