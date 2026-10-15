# ScrollShield V1 – Master-Plan

Stand: 05.10.2026, ergänzt am 15.10.2026 (Ideen aus Play-Store-Rezensionen von one sec, ScreenZen und Opal). **Dieses Dokument ist die verbindliche Produktbeschreibung für Version 1.** Widerspricht ein
anderes Dokument diesem Plan, gilt dieser Plan; das andere Dokument wird angepasst oder als veraltet markiert.

Grundlage: externer Deep-Research-Bericht (Oktober 2026) plus eigene Markt- und Konkurrenzprüfung (Abschnitt 2). In
zwei Punkten weicht der Plan bewusst vom Bericht ab: **4 Tabs statt 3** und **Kurzvideo-Schutz gehört zu V1** (Gründe
in Abschnitt 2.3).

Dieser Plan beschreibt **Inhalt, Aufbau und Verhalten**, nicht das Aussehen. Das Design entsteht danach in Claude
Design auf Basis der fertig gebauten Inhalte (Abschnitt 13).

---

## 1. Positionierung

**Ein Satz:** ScrollShield lässt dich deine Apps behalten, aber nimmt dir den Sog: Instagram ja, Reels nein – und wer
immer wieder reflexhaft zurückkommt, bekommt mehr Widerstand.

**Store-Kurzbeschreibung (Entwurf):** „Instagram ja, Reels nein. Bremse Kurzvideo-Feeds und reflexhaftes Öffnen –
ohne Konto, alles bleibt auf dem Handy.“

ScrollShield ist **nicht**: ein Eltern-Kontrollprogramm, eine Pomodoro-App, ein Digital-Detox-Programm, ein KI-Coach,
eine Gamification-App.

**Plattform:** V1 ist eine Android-App. Die Webversion bleibt eine Vorschau ohne echte Sperren. iOS folgt nicht in V1.

### Die drei Säulen von V1

1. **Kurzvideo-Schutz (Aushängeschild).** Reels, Shorts und Co. begrenzen oder sperren, während der Rest der App
   (Nachrichten, Profile, Suche) normal nutzbar bleibt.
2. **Öffnungs-Bremse mit Wiederöffnungs-Schutz.** Eine kurze Pause vor dem Öffnen. Wer die App kurz nach dem
   Schließen wieder öffnet, bekommt eine längere Pause, danach eine Abkühlzeit.
3. **Fokus und Rescue.** Für Momente, in denen man sofort Ruhe braucht: Fokus mit Timer, Rescue als Sofort-Sperre.

### Die Verhaltens-Schleife

```
App wird geöffnet
  ↓
Bewusste Pause (Unterbrechungs-Bildschirm)
  ↓
Wahl: Zurück  oder  Weiter
  ↓
Sitzung in der App  (Kurzvideo-Feed wird gesondert überwacht)
  ↓
App verlassen
  ↓
Erneutes Öffnen kurz danach erkannt
  ↓
Mehr Widerstand (längere Pause → Abkühlzeit)
```

Diese Schleife ist wichtiger als jede zusätzliche Sperr-Funktion.

---

## 2. Markt und Konkurrenz

### 2.1 Die wichtigsten Mitbewerber (Stand Oktober 2026)

| App                                                      | Kern                                                                        | Preis                          |
| -------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------ |
| **ScreenZen**                                            | Pause vor dem Öffnen, Pause wächst mit jeder Öffnung am Tag, Tageslimits    | komplett kostenlos (Spenden)   |
| **one sec**                                              | Atem-Pause vor dem Öffnen, zählt Versuche, erneute Unterbrechung nach X Min | 1 App gratis, Pro 14,99 €/Jahr |
| **Android „Pause Point“**                                | 10 s Pause vor markierten Apps, direkt im System (Android 17)               | kostenlos, zuerst Pixel 11     |
| **Digital Wellbeing**                                    | App-Timer, Fokus-Modus mit Pausen                                           | kostenlos, im System           |
| **AppBlock**                                             | Sperren nach Zeitplan, Ort, WLAN, strenger Modus                            | ca. 30 $/Jahr                  |
| **Jomo**                                                 | Sperr-Vorlagen, Tagebuch                                                    | ca. 30 $/Jahr                  |
| **Opal**                                                 | Sitzungen, Statistiken; auf Android schwächer als auf iOS                   | ca. 100 $/Jahr                 |
| **Shortstop, Basta!, Shorts & Reels Blocker, WallHabit** | sperren nur Reels/Shorts über die Bedienungshilfe                           | meist gratis / klein           |

### 2.2 Was daraus folgt

- **Die einfache Pause wird Standard.** Google baut sie mit „Pause Point“ selbst ein. Eine Pause allein ist kein
  Grund mehr, ScrollShield zu installieren.
- **Steigende Pause ist nicht neu.** ScreenZen bietet sie kostenlos und ohne App-Grenze. Der Wiederöffnungs-Schutz
  ist für ScrollShield deshalb ein starkes Werkzeug, aber **nicht** das alleinige Alleinstellungsmerkmal.
- **Reels-Blocker gibt es viele, aber nur als Einzel-Tool.** Sie sperren den Feed hart und können sonst nichts.
- **Die Lücke:** Keine der großen Apps verbindet App-Bremse und Feed-Schutz in einer ruhigen, vertrauenswürdigen
  App. Genau dort steht ScrollShield.
- **Preis-Rahmen:** Der Markt liegt zwischen 0 € und 30 € im Jahr; one sec als nächster Vergleich bei 14,99 €.

### 2.3 Abweichungen vom Research-Bericht

| Bericht                                    | Dieser Plan                                                                     | Grund                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Wiederöffnungs-Schutz ist das Hauptmerkmal | Kurzvideo-Schutz ist das Aushängeschild, Wiederöffnungs-Schutz die zweite Säule | ScreenZen hat steigende Pausen gratis; Google baut die Pause ins System  |
| Reels/Shorts erst nach V1                  | Kurzvideo-Schutz in V1, mit klaren Grenzen (Abschnitt 6)                        | Einziger echter Unterschied zur Konkurrenz; Code dafür existiert bereits |
| 3 Tabs (Heute, Schutz, Einblicke)          | 4 Tabs (Heute, Schutz, Fokus, Einblicke)                                        | Entscheidung des Inhabers; Fokus bleibt schnell erreichbar               |
| 24,99 €/Jahr                               | 19,99 €/Jahr (Abschnitt 10)                                                     | Konkurrenz liegt bei 14,99–30 €; ScreenZen ist gratis                    |

Risiken dieser Entscheidung: Die Bedienungshilfe braucht eine Play-Console-Erklärung, einen deutlichen Hinweis in der
App und meist ein Demo-Video. Die Erkennung kann brechen, wenn Instagram oder YouTube ihre Oberfläche ändern. Deshalb
gilt: **ScrollShield muss auch ohne Bedienungshilfe voll nützlich sein**, und Kurzvideo-Schutz wird nur für Apps
beworben, deren Erkennung auf echten Geräten geprüft ist.

Quellen: [ScreenZen-Test](https://unhookd.app/blog/screenzen-worth-it-review),
[ScreenZen im Play Store](https://play.google.com/store/apps/details?id=com.screenzen),
[one sec FAQ](https://one-sec.app/faq/), [one-sec-Studie (PNAS)](https://www.pnas.org/doi/10.1073/pnas.2213114120),
[Pause Point (Digital Trends)](https://www.digitaltrends.com/phones/android-17s-new-digital-wellbeing-feature-to-curb-mindless-scrolling-is-currently-limited-to-the-pixel-11-series/),
[Reels-Blocker-Übersicht](https://applass.com/blog/how-to-block-reels-and-shorts-on-android-2026),
[Preisvergleich](https://habitdoom.com/blog/opal-alternatives).

---

## 3. Aufbau der App

### 3.1 Navigation

Vier Tabs unten, immer sichtbar nach dem Onboarding:

| Tab           | Zweck in einem Satz                                     |
| ------------- | ------------------------------------------------------- |
| **Heute**     | Ist der Schutz aktiv, und was ist heute passiert?       |
| **Schutz**    | Welche Apps sind wie geschützt, und wann?               |
| **Fokus**     | Jetzt konzentrieren: Fokus starten oder laufenden sehen |
| **Einblicke** | Was zeigen die echten Zahlen über Tage und Wochen?      |

**Einstellungen** sind kein Tab, sondern ein Zahnrad oben rechts auf allen vier Tabs.

**Rescue** ist kein Tab, sondern ein Knopf auf „Heute“ (und im Fokus-Tab).

### 3.2 Seitenbaum

```
SCROLLSHIELD
├── Onboarding (nur beim ersten Start)
│   ├── Willkommen
│   ├── Apps auswählen
│   ├── So funktioniert's
│   └── Berechtigungen
│
├── HEUTE (Tab 1)
│   ├── Schutz-Status
│   ├── Zahlen von heute
│   ├── [Fokus starten]  [Rescue PRO]
│   └── Beobachtungen pro App
│
├── SCHUTZ (Tab 2)
│   ├── Geschützte Apps
│   │   └── App-Detail
│   │       ├── Voreinstellung (Sanft / Ausgewogen / Stark / Eigene)
│   │       ├── Öffnen (Pause)
│   │       ├── Wiederöffnungs-Schutz
│   │       ├── Kurzvideo-Schutz
│   │       ├── Sitzungs-Wächter [PRO]
│   │       ├── Tagesbudget [PRO]
│   │       ├── Zeitplan
│   │       └── Notfallfreigabe
│   ├── Zeitpläne
│   └── Selbstverpflichtung [PRO]
│
├── FOKUS (Tab 3)
│   ├── Fokus einrichten
│   └── Laufender Fokus (Vollbild)
│
├── EINBLICKE (Tab 4)
│   ├── Heute
│   ├── Woche [PRO]
│   ├── Wiederöffnungs-Muster [PRO]
│   └── App-Trends [PRO]
│
├── RESCUE [PRO] (Vollbild, von Heute aus)
│
├── UNTERBRECHUNG (nativer Bildschirm über der geschützten App)
│
└── EINSTELLUNGEN (Zahnrad)
    ├── ScrollShield Pro
    ├── Berechtigungen & Zustand
    ├── Benachrichtigungen
    ├── Datenschutz & Daten
    ├── Hilfe & Support
    └── Impressum & Lizenzen
```

---

## 4. Seiten im Detail

Für jede Seite: Zweck, Inhalt von oben nach unten, Zustände. Texte sind Entwürfe; der Ton ist ruhig, sachlich,
duzend, ohne Motivationssprüche.

### 4.1 Onboarding

Ziel: In unter zwei Minuten zum ersten echten Schutz. **Keine Paywall im Onboarding.**

1. **Willkommen.** Logo, Name, ein Satz („Instagram ja, Reels nein.“), drei kurze Punkte (kein Konto, Kurzvideos
   bremsen, reflexhaftes Öffnen bremsen), Knopf „Loslegen“, Hinweis „Für Nutzer ab 16 Jahren“.
2. **Apps auswählen.** Liste der unterstützten Apps mit Symbol (Android-Symbol, sonst Kürzel), Mehrfachauswahl, bis zu
   2 Apps (Free-Grenze, ohne Paywall: bei der dritten erscheint der Hinweis „In der kostenlosen Version 2 Apps. Mehr
   mit Pro – später in den Einstellungen.“).
3. **So funktioniert's.** Eine Seite mit der Schleife aus Abschnitt 1 in einfachen Worten. Voreinstellung
   „Ausgewogen“ ist gesetzt; Hinweis, dass man das pro App ändern kann.
4. **Berechtigungen.** Nur die nötigen, jede mit einem Satz Begründung und Knopf:
   - App-Nutzungszugriff (Pflicht für jeden Schutz)
   - Über anderen Apps einblenden (Pflicht für den Unterbrechungs-Bildschirm)
   - Benachrichtigungen (optional)
   - Akku-Ausnahme (empfohlen)
   - Steht eine Berechtigung nach dem Erlauben noch auf „Nicht erteilt“, prüft die App beim Zurückkehren neu. Bleibt
     es dabei, führt der Link „Schon erlaubt, aber nicht erkannt?“ zur Hilfe mit Hersteller-Besonderheiten.
   - Bedienungshilfe **nicht hier**: erst wenn der Nutzer Kurzvideo-Schutz einschaltet, mit eigenem Hinweis-Dialog.
     Ohne Pflicht-Berechtigungen kann man trotzdem weiter; „Heute“ zeigt dann deutlich „Schutz nicht aktiv“.

### 4.2 Heute (Tab 1)

Zweck: auf einen Blick sehen, ob alles läuft und was heute passiert ist.

**Oben (ohne Scrollen sichtbar):**

1. Kopfzeile: „ScrollShield“, Zahnrad rechts.
2. Schutz-Status: „Schutz aktiv“ / „Schutz eingeschränkt – 1 Berechtigung fehlt“ (antippbar → Berechtigungen) /
   „Schutz pausiert“.
3. „2 Apps geschützt“ (antippbar → Schutz-Tab).
4. **Eine Hauptzahl:** „7 Öffnungen heute unterbrochen“.
5. Zwei Knöpfe: **[Fokus starten]** (→ Fokus-Tab) und **[Rescue]** (Pro-Kennzeichen; Free → Paywall).

**Darunter:**

- Laufender Fokus oder Rescue (falls aktiv): Restzeit, Knopf „Ansehen“.
- Pro geschützter App eine Zeile: Symbol, Name, heutige Nutzung in Minuten, Öffnungen, Unterbrechungen, und – wenn
  vorhanden – eine konkrete Beobachtung, z. B. „4× wieder geöffnet innerhalb von 20 Minuten“ oder „Reels heute 12
  Minuten“.
- Nächster Zeitplan: „Ab 21:00 Abend-Schutz“.

**Zustände:**

- Keine App geschützt: kurzer Text, Knopf „App schützen“.
- Noch keine Daten heute: „Noch nichts passiert heute.“ statt Nullen-Wand.
- Kurzvideo-Erkennung reagiert nicht (Android hat die Bedienungshilfe beendet): Status „Reels-Erkennung reagiert
  nicht“ mit Uhrzeit und Knopf „Erkennung prüfen“; betroffene Werte zeigen „nicht gemessen seit 13:40“ statt einer
  Zahl. Die Pause beim Öffnen läuft weiter. Grund: Bei Mitbewerbern fällt der Kurzvideo-Schutz laut Rezensionen still
  aus.
- Webversion: Hinweis „Vorschau – echte Sperren nur in der Android-App“.

**Nicht zeigen:** gesparte Zeit, Produktivitäts-Punkte, Sprüche, Streaks, Deko-Diagramme.

### 4.3 Schutz (Tab 2)

**Übersicht, von oben nach unten:**

1. **Geschützte Apps:** je Zeile Symbol, Name, Voreinstellung („Ausgewogen“), Schalter an/aus. Darunter „+ App
   schützen“. Bei der dritten App in Free → Paywall (Haupt-Paywall-Moment).
2. **Zeitpläne:** Liste, z. B. „Abend 21:00–07:00 · Stark“. „+ Zeitplan“ (zweiter Zeitplan → Paywall).
3. **Selbstverpflichtung** [PRO]: kurzer Satz, was das ist, Knopf.

**App-Detail** (schrittweise aufklappend, nicht alles auf einmal):

1. Kopf: Symbol, Name, Schalter „Schutz an“.
2. **Voreinstellung:** Sanft · Ausgewogen · Stark [PRO] · Eigene [PRO] (Werte in Abschnitt 5).
3. Zusammenfassung der aktiven Regeln als lesbare Zeilen, jede antippbar:
   - Öffnen: „5 s Pause“
   - Wiederholtes Öffnen: „Adaptiv“ / „Aus“
   - Kurzvideos: „Reels gesperrt“ / „Reels 15 Min. pro Tag“ / „Aus“ (nur bei Apps mit geprüfter Erkennung)
   - Sitzungs-Wächter [PRO]: „10 Minuten“
   - Tagesbudget [PRO]: „30 Minuten“
   - Zeitplan: „Abends“
   - Notfallfreigabe: „Verfügbar (2× pro Tag)“
4. Eine Regel ändern, die nicht zur Voreinstellung passt, schaltet die Voreinstellung auf „Eigene“ (Pro) – in Free
   sind nur die Werte der Free-Voreinstellungen wählbar.

**Zeitplan-Editor:** Name, Start- und Endzeit, Wochentage, Stufe während des Zeitplans (Ausgewogen / Stark / Gesperrt),
für welche Apps.

**Selbstverpflichtung [PRO]:** Für eine gewählte Dauer (z. B. bis morgen 07:00) lassen sich Schutz-Einstellungen nicht
lockern und es gibt keine Notfallfreigabe. Vorher deutliche Bestätigung. Nie bei Notfallfreigabe-Bildschirmen werben.

### 4.4 Fokus (Tab 3)

**Fokus einrichten:**

1. Dauer: 15 · 30 · 60 Minuten (Free), „Eigene Dauer“ [PRO].
2. Welche Apps: standardmäßig alle geschützten, abwählbar.
3. Verhalten: Während Fokus sind die gewählten Apps gesperrt (nur „Zurück“). Strenger Fokus [PRO]: kein vorzeitiges
   Beenden, keine Notfallfreigabe.
4. Knopf **[Fokus starten]**.
5. Darunter: kleiner Bereich „Rescue“ mit Erklärung und Knopf (Pro).

**Laufender Fokus (Vollbild):** Restzeit groß, Liste der gesperrten Apps, „Fokus beenden“ (mit Rückfrage; bei
strengem Fokus nicht vorhanden). Am Ende: kurze, sachliche Zusammenfassung („30 Minuten Fokus · 2 Öffnungsversuche
unterbrochen“).

### 4.5 Einblicke (Tab 4)

Umschalter oben: **Heute** · Woche [PRO]. Nur Zahlen mit echter Quelle (Abschnitt 9).

- **Heute (Free):** Öffnungsversuche, Unterbrechungen, abgebrochene Öffnungen (Nutzer wählte „Zurück“),
  Wiederöffnungen, Nutzungszeit pro App, Kurzvideo-Zeit pro App, Fokus-Minuten. Darunter die Ereignis-Liste des Tages
  (Uhrzeit, App, was passiert ist).
- **Woche [PRO]:** Vergleich zur Vorwoche je Kennzahl, Balken pro Tag.
- **Wiederöffnungs-Muster [PRO]:** Zu welchen Uhrzeiten am häufigsten wieder geöffnet wird.
- **App-Trends [PRO]:** Nutzung und Kurzvideo-Zeit pro App über die Wochen.

Free-Nutzer sehen bei Woche/Trends eine ruhige Vorschau mit Pro-Hinweis, keine aufdringliche Sperre.

### 4.6 Rescue [PRO]

Ein Bildschirm, kein Regelwerk: „Ich muss mich jetzt konzentrieren.“ Dauer wählen: 15 · 30 · 60 Minuten · bis
Uhrzeit. Alle geschützten Apps werden sofort gesperrt (wie Stark mit Abkühlzeit). Knopf „Rescue starten“. Laufend:
Restzeit auf „Heute“ und im Fokus-Tab. Unterschied zu Fokus: kein Timer-Erlebnis, sondern Notbremse; kann nicht
vorzeitig beendet werden außer per Notfallfreigabe.

### 4.7 Unterbrechung (nativer Bildschirm)

Erscheint über der geschützten App. Inhalt:

1. App-Symbol und Name („Instagram“).
2. Grund in einem Satz: „Kurze Pause vor Instagram.“ / „Du hast Instagram vor 3 Minuten geschlossen. Längere Pause.“
   / „Reels-Limit für heute erreicht.“ / „Abend-Schutz bis 07:00.“ / „Fokus läuft noch 18 Minuten.“
3. Countdown, wenn eine Pause läuft.
4. Knöpfe: **„Zurück“** (immer, hervorgehoben) und **„Weiter zu Instagram“** (erst nach Ablauf der Pause; fehlt bei
   Sperre).
5. Bei Sperre: „Notfallfreigabe“ als kleiner Text-Link, falls verfügbar.
6. Falls gesetzt: der **eigene Satz** aus den Einstellungen unter dem Grund („Abends lieber lesen als scrollen.“).

Bei Kurzvideo-Schutz: Statt die ganze App zu sperren, führt „Zurück“ aus dem Feed heraus; der Rest der App bleibt
nutzbar.

**Regeln für jede Unterbrechung:**

- **Nie während eines Telefonats oder Video-Calls.** Gilt die Sperre danach noch, erscheint sie dann.
- **Vorwarnung:** Sperren, die mitten in der Nutzung beginnen (Zeitplan, Tagesbudget, Kurzvideo-Tageslimit), kündigen
  sich 1 Minute vorher an: kleiner Hinweis oben über der App („Abend-Schutz ab 21:00 · Instagram wird in 1 Minute
  gesperrt.“), 4 Sekunden, ohne Ton, schließbar. Läuft über die Einblende-Berechtigung, nicht als Benachrichtigung.

### 4.8 Notfallfreigabe

Für den Fall, dass man eine gesperrte App wirklich braucht. Ablauf: Grund wählen (Arbeit, Nachricht, Sonstiges) →
10 Sekunden warten → App für 5 Minuten frei. Höchstens 2× pro Tag und App (Free und Pro). Während Selbstverpflichtung
und strengem Fokus nicht verfügbar. **Hier nie eine Paywall oder Pro-Werbung.**

Hinweis: Heute existiert die Notfallfreigabe nur in der Web-Schicht; für V1 muss sie auf dem Handy funktionieren
(Abschnitt 12).

### 4.9 Einstellungen (Zahnrad)

Oben die Pro-Karte, darunter drei Gruppen mit kleiner Zwischenüberschrift.

1. **ScrollShield Pro:** Status, Vorteile, Abo verwalten, Käufe wiederherstellen.
2. **Gruppe „Schutz“:**
   - **Berechtigungen & Zustand:** jede Berechtigung mit Status und Knopf; Dienst-Zustand („Schutz-Dienst läuft“,
     „Bedienungshilfe aktiv“, „Akku-Ausnahme fehlt“); Knopf „Erkennung prüfen“ für Kurzvideos.
   - **Eigener Satz in der Pause:** ein selbst geschriebener Satz, der in jeder Pause unter dem Grund steht. Standard
     aus, auch in Free.
3. **Gruppe „Mitteilungen & Daten“:**
   - **Benachrichtigungen:** Fokus-Ende, Tageszusammenfassung (Standard aus), Wochenrückblick [PRO]. Keine
     Benachrichtigungen, die nur zum Öffnen von ScrollShield verleiten.
   - **Datenschutz & Daten:** was gespeichert wird (nur auf dem Gerät), Daten exportieren (JSON), alles löschen.
4. **Gruppe „Hilfe & Rechtliches“:**
   - **Hilfe & Support:** kurze Anleitung, Probleme mit Herstellern (Samsung, Xiaomi …), Kontakt.
   - **Impressum & Lizenzen.**

### 4.10 Paywall

Eine ruhige Seite: was Pro bringt (Liste aus Abschnitt 10), zwei Preise (Monat, Jahr mit 7 Tagen gratis), „Später“
gut sichtbar. Wird immer im Zusammenhang gezeigt („Für eine dritte App brauchst du Pro“).

---

## 5. Voreinstellungen

Die Werte sind **Produkt-Standards**, keine wissenschaftlich belegten Schwellen. Sie lassen sich später anpassen.

| Voreinstellung            | Pause beim Öffnen                | Wiederöffnungs-Schutz                                            | Sitzungs-Wächter | Verfügbar |
| ------------------------- | -------------------------------- | ---------------------------------------------------------------- | ---------------- | --------- |
| **Sanft**                 | 3 s, „Weiter“ sofort nach Ablauf | aus                                                              | aus              | Free      |
| **Ausgewogen** (Standard) | 5 s                              | Basis: erneutes Öffnen innerhalb 10 Min. → 15 s Pause            | aus              | Free      |
| **Stark**                 | 10 s                             | Erweitert: 2. Mal → 30 s, 3. Mal in 30 Min. → 15 Min. Abkühlzeit | 10 Min.          | Pro       |
| **Eigene Regeln**         | frei                             | frei                                                             | frei             | Pro       |

Kurzvideo-Schutz ist unabhängig von der Voreinstellung und wird pro App eingestellt (Abschnitt 6).

---

## 6. Kurzvideo-Schutz

**Was er tut:** Erkennt, ob in einer geschützten App gerade der Kurzvideo-Feed offen ist, und greift nur dort ein. Der
Rest der App bleibt frei.

**Optionen pro App:**

- **Aus**
- **Gesperrt:** Der Feed wird sofort unterbrochen („Zurück“ führt hinaus).
- **Tageslimit:** z. B. 15 Minuten Feed pro Tag, danach gesperrt. [Free: feste Werte 10/15/30 Min.]
- **Wisch-Unterbrecher [PRO]:** Unterbrechung nach X Wischern.
- **Feed-Sitzungslimit [PRO]:** maximal X Minuten am Stück.

**Welche Apps in V1:** Nur Apps, deren Erkennung vor dem Release auf echten Geräten geprüft wurde. Ziel: Instagram
Reels, YouTube Shorts, TikTok (ganze App zählt als Feed). Facebook Reels, Snapchat Spotlight, X, Reddit, Pinterest
bleiben bis zur Prüfung **unsichtbar** (nicht „Beta“ bewerben).

**Ehrlichkeit:** Store und App sagen klar, dass die Erkennung nicht in jedem Fall greift und nach App-Updates
ausfallen kann. Die Bedienungshilfe liest nur technische Kennungen, nie Texte (siehe `docs/SHORT_VIDEO_DETECTION.md`).

**Free:** Kurzvideo-Schutz (Gesperrt oder Tageslimit) für die bis zu 2 geschützten Apps. Er ist das Aushängeschild und
muss kostenlos erlebbar sein.

---

## 7. Wiederöffnungs-Schutz

- Erkannt wird: dieselbe App wird innerhalb eines Zeitfensters nach dem Verlassen wieder geöffnet.
- Der Zähler gilt pro App (alle Pakete einer App zusammen, z. B. Instagram und Instagram Lite).
- Stufen: normale Pause → längere Pause → Abkühlzeit (App gesperrt bis Ablauf). Werte je Voreinstellung (Abschnitt 5).
- Der Zähler setzt sich zurück, wenn die App eine Zeit lang (Standard: 30 Min.) nicht geöffnet wurde.
- Jede Stufe wird im Ereignis-Protokoll festgehalten und erscheint in „Heute“ und „Einblicke“.
- Die bisherige „Anti-Binge“-Logik ist die technische Grundlage und wird darin umbenannt.

---

## 8. Sitzungs-Wächter und Tagesbudget [PRO]

- **Sitzungs-Wächter:** Nach X Minuten am Stück in der App erscheint der Unterbrechungs-Bildschirm („10 Minuten
  Instagram. Weiter oder Schluss?“). Heute wird nur beim Öffnen geprüft – für den Sitzungs-Wächter muss der Dienst
  auch während der Nutzung prüfen.
- **Tagesbudget:** X Minuten pro Tag und App, danach gesperrt bis Mitternacht (Notfallfreigabe möglich).

---

## 9. Kennzahlen

Jede angezeigte Zahl hat eine von drei Qualitäten:

| Qualität            | Bedeutung                                      | Beispiel                                        |
| ------------------- | ---------------------------------------------- | ----------------------------------------------- |
| **Gemessen**        | direktes Ereignis oder Messung des Systems     | Unterbrechung gezeigt, Vordergrund-Sekunden     |
| **Abgeleitet**      | reine Rechnung aus gemessenen Werten           | Sekunden / 60 = Minuten; Vergleich zur Vorwoche |
| **Nicht verfügbar** | keine verlässliche Quelle → wird nicht gezeigt | „gesparte Zeit“                                 |

**Erlaubte Kennzahlen:** Öffnungsversuche, Unterbrechungen, abgebrochene Öffnungen („Zurück“ gewählt), Wiederöffnungen,
Abkühlzeiten, Nutzungszeit pro App (UsageStats), Kurzvideo-Zeit und Wischer (Bedienungshilfe), Sitzungen,
Fokus-Minuten, Notfallfreigaben.

**Verboten:** „Du hast X Minuten gespart“ (Sperren × geschätzte Minuten), Produktivitäts-Punkte, erfundene Prozent-Werte.
Ohne Messquelle (z. B. Bedienungshilfe aus) wird „nicht gemessen“ angezeigt, nicht 0.

---

## 10. Free und Pro

**Free muss dauerhaft nützlich sein.**

| Funktion                                     | Free                         | Pro                            |
| -------------------------------------------- | ---------------------------- | ------------------------------ |
| Geschützte Apps                              | 2                            | unbegrenzt                     |
| Pause beim Öffnen, Zurück/Weiter             | ✓ (Werte der Voreinstellung) | ✓ frei einstellbar             |
| Voreinstellungen                             | Sanft, Ausgewogen            | + Stark, Eigene Regeln         |
| Wiederöffnungs-Schutz                        | Basis                        | Erweitert, einstellbar         |
| Kurzvideo-Schutz: Gesperrt / Tageslimit      | ✓                            | ✓                              |
| Kurzvideo: Wisch-Unterbrecher, Sitzungslimit | –                            | ✓                              |
| Sitzungs-Wächter                             | –                            | ✓                              |
| Tagesbudget                                  | –                            | ✓                              |
| Zeitpläne                                    | 1                            | unbegrenzt                     |
| Fokus                                        | 15 / 30 / 60 Min.            | + eigene Dauer, strenger Fokus |
| Rescue                                       | –                            | ✓                              |
| Selbstverpflichtung                          | –                            | ✓                              |
| Notfallfreigabe                              | ✓                            | ✓                              |
| Eigener Satz, Vorwarnung vor Sperren         | ✓                            | ✓                              |
| Einblicke                                    | Heute                        | + Woche, Muster, Trends        |
| Berechtigungen & Zustand                     | ✓                            | ✓                              |
| Datenschutz (lokal), keine Werbung           | ✓                            | ✓                              |

**Paywall-Momente:**

- **Haupt-Moment:** Der Nutzer will eine **dritte** App schützen. Er kennt ScrollShield dann schon mit zwei Apps.
- **Im Zusammenhang:** Stark wählen, Eigene Regeln, Sitzungs-Wächter oder Tagesbudget einschalten, zweiten Zeitplan
  anlegen, Rescue öffnen, Woche/Trends öffnen, Wisch-Unterbrecher einschalten.
- **Nie:** direkt nach der Installation, vor den Berechtigungen, vor dem ersten Schutz-Erlebnis, während einer
  Notfallfreigabe oder auf dem Unterbrechungs-Bildschirm.

**Preise (Empfehlung zum Start):** 3,49 € im Monat, 19,99 € im Jahr; beim Jahresabo 7 Tage Pro gratis. Kein
Lebenszeit-Kauf zum Start. Preise kommen aus dem Play Store und stehen nicht im Code; die Freischalt-Logik fragt nur
„hat Pro?“, nie einen Preis ab.

---

## 11. Umfang von V1

### In V1

- App-Schutz mit nativem Unterbrechungs-Bildschirm und Zurück/Weiter
- Voreinstellungen Sanft, Ausgewogen, Stark, Eigene
- Wiederöffnungs-Schutz (Basis und erweitert)
- Kurzvideo-Schutz für geprüfte Apps
- Sitzungs-Wächter, Tagesbudget
- Zeitpläne
- Fokus, Rescue, Selbstverpflichtung
- Notfallfreigabe auf dem Handy
- Vorwarnung vor Sperren, keine Unterbrechung während Anrufen, eigener Satz in der Pause
- Heute-Zahlen und Einblicke mit echten Daten
- Berechtigungen & Dienst-Zustand, Warnung bei ausgefallener Kurzvideo-Erkennung
- Pro-Abo über Google Play (mit Testphase, Wiederherstellen, Verwalten)
- Daten-Export und Löschen, alles lokal

### Nach V1 (Prüfung später)

- Kurzvideo-Erkennung für weitere Apps (Facebook, Snapchat, X, Reddit, Pinterest)
- iOS-Version
- Ort- und WLAN-Regeln
- PDF/CSV-Berichte
- Cloud-Konto und Sync
- Partner- und Familien-Funktionen

### Nie

XP, Münzen, Abzeichen, Bestenlisten, Streak-Druck, Motivationszitate, Produktivitäts-Punkte, erfundene
Zeit-Ersparnis, KI-Chatbot, Benachrichtigungen nur zum Zurückholen in die App.

**Ziel:** Der Nutzer muss ScrollShield möglichst selten öffnen. Bindung entsteht dadurch, dass der Schutz von selbst
und zuverlässig läuft – nicht durch Druck.

---

## 12. Technik

### 12.1 Datenweg

```
AppConfig (Web)
  ↓
NativeProtectionConfig (versionierter Vertrag)
  ↓
Capacitor-Brücke
  ↓
Native Konfiguration (verschlüsselt gespeichert)
  ↓
Regel-Engine (pro App)
  ↓
Vordergrund-Erkennung  +  Kurzvideo-Erkennung
  ↓
Unterbrechungs-Engine
  ↓
Ereignis-Protokoll  →  Kennzahlen
```

### 12.2 Status-Stufen

Eine Funktion gilt erst als „fertig“, wenn alle Stufen erreicht sind. Ein Feld in TypeScript allein zählt nicht.

1. **Vertrag definiert** (Typ in `nativeBridge.ts`)
2. **Nativ gelesen** (Kotlin liest und prüft den Wert)
3. **Nativ durchgesetzt** (der Dienst handelt danach)
4. **Getestet** (Unit-Tests und auf echtem Gerät)
5. **Release-bereit** (Store-Erklärungen, Doku)

### 12.3 Stand heute (05.10.2026, nach dem Umbau der Seiten)

| Fähigkeit                      | 1   | 2   | 3   | 4 (Gerät) | Anmerkung                                                         |
| ------------------------------ | --- | --- | --- | --------- | ----------------------------------------------------------------- |
| Voreinstellungen               | ✓   | ✓   | ✓   | –         | schreiben Werte in die bestehenden Regelfelder                    |
| Pause beim Öffnen              | ✓   | ✓   | ✓   | –         |                                                                   |
| Wiederöffnungs-Schutz          | ✓   | ✓   | ✓   | –         | über Anti-Binge; „längere Pause“ statt gleicher Pause fehlt nativ |
| Abkühlzeit                     | ✓   | ✓   | ✓   | –         | Anti-Binge-Sperre nach 3 Öffnungen in 30 Min.                     |
| Kurzvideo-Schutz               | ✓   | ✓   | ✓   | –         | nur Instagram, YouTube, TikTok angeboten; Signaturen ungeprüft    |
| Tagesbudget                    | ✓   | ✓   | ✓   | –         | nur beim Öffnen geprüft                                           |
| Zeitpläne (frei, täglich)      | ✓   | ✓   | ✓   | –         | ganze Stunden; keine Wochentage                                   |
| Sitzungs-Wächter               | ✓   | –   | –   | –         | nur in der Web-Vorschau; Android prüft nicht während der Nutzung  |
| Fokus mit App-Auswahl          | ✓   | ✓   | ✓   | –         | endet nativ erst beim nächsten Sync nach Ablauf                   |
| Rescue                         | ✓   | ✓   | ✓   | –         | wie strenger Fokus über alle geschützten Apps                     |
| Selbstverpflichtung            | ✓   | –   | –   | –         | nur in der App-Oberfläche durchgesetzt                            |
| Notfallfreigabe auf dem Handy  | –   | –   | –   | –         | nur Web-Schicht                                                   |
| Ereignis-Protokoll, Kennzahlen | ✓   | ✓   | ✓   | –         | „gesparte Zeit“ entfernt                                          |
| App-Symbole                    | ✓   | ✓   | –   | –         | Android-Teil nicht gebaut                                         |
| Pro-Grenzen und Paywall        | ✓   | –   | –   | –         | Pro nur als Entwicklungs-Vorschau; keine Abrechnung               |

**Nichts davon lief bisher auf einem echten Gerät.** Das ist die größte offene Baustelle.

---

## 13. Design-Leitlinie „Ruhige Kontrolle“

Für Claude Design, sobald alle Inhalte gebaut sind.

- dunkel zuerst, zurückhaltend, hochwertig, wirkt wie eine echte Android-App, vertrauenswürdig, gut lesbar
- etwa 90 % Schwarz, Fast-Schwarz, Off-White, neutrales Grau; etwa 10 % ruhiges Smaragdgrün als Akzent
- Ordnung durch Abstände, Schrift, Anordnung und Inhalt, nicht durch Deko

Vermeiden: Neon, Cyberpunk, viele Verläufe, Leuchteffekte, Milchglas überall, Karten in Karten, riesige Rundungen
überall, Deko-Diagramme, sinnlose Animationen, Wellness-Klischees.

Übergabe an Claude Design: alle Seiten aus Abschnitt 4 in allen Zuständen (leer, normal, Fehler/Berechtigung fehlt,
Pro gesperrt), mit echten Texten.

---

## 14. Was am heutigen Stand geändert werden muss

Arbeitsliste für den Umbau (Schritt nach diesem Plan):

1. Tabs umbenennen und neu ordnen: Home/Apps/Fokus/Menü → Heute/Schutz/Fokus/Einblicke; Einstellungen als Zahnrad.
2. „Gesparte Zeit“ (Sperren × 5 Min.) überall entfernen; Kennzahlen nach Abschnitt 9.
3. Modi Sanft/Standard/Streng → Voreinstellungen Sanft/Ausgewogen/Stark/Eigene.
4. Reels-Seite in das App-Detail einordnen (Kurzvideo-Schutz pro App) statt eigener Bereich.
5. Feste Zeitfenster (Morgen, Arbeit, Abend, Nacht) → frei einstellbare Zeitpläne.
6. Fokus-Dauern 15/25/45/60/90/120 → 15/30/60 + eigene Dauer [PRO].
7. Anti-Binge → Wiederöffnungs-Schutz mit Stufen und Abkühlzeit (auch nativ).
8. Neu: Rescue, Selbstverpflichtung, Sitzungs-Wächter, Notfallfreigabe auf dem Handy.
9. Verlauf-Seite → Einblicke (Heute frei, Rest Pro).
10. Zentrale Pro-Abfrage („hat Pro?“) mit Free-Grenzen; Paywall-Seite; Abrechnung über Google Play.
11. Schutzprofile („Arbeit“, „Schlaf“ usw.) ersetzen durch Voreinstellungen + Zeitpläne.
12. Neu (15.10.): Vorwarnung 1 Minute vor Sperren; Anruf-Erkennung (keine Sperre während Telefonat oder Video-Call);
    Lebenszeichen der Kurzvideo-Erkennung mit Warnung auf „Heute“; eigener Satz in der Pause; Berechtigungen beim
    Zurückkehren in die App neu prüfen.

---

## 15. Offene Entscheidungen

- Endgültiger App-Name (siehe `OFFENE_PUNKTE.md`, Markenrecherche).
- Preise final festlegen (Empfehlung oben).
- Ob Kurzvideo-Tageslimit in Free frei einstellbar sein soll oder nur feste Werte.
- Mindestalter (16+) rechtlich bestätigen.
- one sec nennt im Play Store ein US-Patent (12,468,828 B2) auf seinen Ansatz. Vor einem Start in den USA von
  Fachleuten prüfen lassen.
