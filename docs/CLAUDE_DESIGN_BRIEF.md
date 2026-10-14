# ScrollShield – Brief für Claude Design

V1-Umfang (festgelegt am 14.10.2026): Pause vor der App, Anti-Binge, Reels-/Shorts-Sperre, Rescue, Fokus, Tages-/Sitzungslimits, Zeitfenster, Einblicke, Free/Pro, Onboarding, Schnelleinstellung-Kachel, Homescreen-Widget, Wochen-Benachrichtigung. Deutsch + Englisch. Nur Dunkelmodus.
Später: NFC, Wear OS, Desktop.

So benutzt du das: claude.ai → **Design** → neues Projekt „ScrollShield V1“. Prompts 1–5 einzeln nacheinander im selben Projekt schicken. Änderungen per Kommentar am Bildschirm, nicht neu anfangen.

---

## Prompt 1 – Design-System

```
Ich baue "ScrollShield", eine Android-App (Deutsch + Englisch, ab 16) gegen reflexhaftes Öffnen von Social-Media-Apps. Vor einer geschützten App kommt eine kurze Pause; wer sie gleich wieder öffnet, wartet länger ("Anti-Binge"). Reels und Shorts lassen sich pro App sperren oder begrenzen, der Rest der App bleibt frei. Alles bleibt auf dem Handy, kein Konto, keine Werbung.

Erstelle zuerst ein Design-System auf eigener Seite. Stil "Calm Control": ruhig, erwachsen, ehrlich, keine Gamification, keine Schuldgefühle.
Farben (90 % Neutral, 10 % Akzent): Hintergrund #09090B, Fläche #121215, erhöht #1C1C22, Linie #27272A, Text #F4F4F5 / #A1A1AA / #71717A, Akzent Smaragd #10B981, Pause Bernstein #F59E0B, strenge Grenze Rosé #F43F5E (sparsam).
Nur Dunkelmodus. Die App ist zweisprachig (Deutsch + Englisch): Layouts müssen bis zu 30 % längere Texte aushalten und große Systemschrift (bis 200 %) vertragen.
Regeln: keine Glows, kein Pulsieren, keine Verläufe auf Buttons, keine verschachtelten Karten, keine Emojis. Radius nur 12/16 px, 4-px-Raster, Touch-Ziele ≥ 48 px, Kontrast WCAG AA, moderne Sans-Serif (Vorschlag), Format 360×800.
Zeige: Farben, Typo-Skala, Abstände, neutrale Linien-Icons (keine Markenlogos), Buttons, Schalter, Segment-Auswahl (Sanft/Mittel/Stark), App-Zeile mit Status, Karte, Bottom-Sheet, Hinweis-Banner, Fortschrittspunkte, Tab-Leiste (4 Tabs), leerer Zustand, dezente Pro-Kennzeichnung.
```

## Prompt 2 – Onboarding

```
Jetzt das Onboarding für den ersten Start. Ziel: in unter 2 Minuten ist eine App geschützt und die Person versteht es. Ruhiger Ton, "du", Fortschrittspunkte, Zurück möglich.
1. Willkommen: ein Satz Versprechen, "Los geht's", klein "Ab 16 Jahren".
2. Welche App zieht dich am meisten rein? Neutrale Kacheln (Instagram, TikTok, YouTube, Snapchat, Facebook, X, Reddit, Andere). Free = genau 1 App, ehrlich sagen.
3. Wie stark soll die Bremse sein? Sanft 5 s / Mittel 10 s / Stark 15 s, Standard Mittel.
4. So fühlt es sich an: interaktive Mini-Pause mit Atemkreis, Countdown, "Doch nicht" / "Weiter zur App". Hinweis: gleich wieder öffnen = längere Pause.
5. Deine Daten: bleibt auf dem Handy, kein Konto, keine Werbung, Link Datenschutz.
6. Berechtigungen als Karten (was, warum, was wir NICHT tun, Status): Nutzungszugriff, Über anderen Apps anzeigen, Benachrichtigungen. Auch Zustand "abgelehnt" mit "Einstellungen öffnen".
6b. Nur wenn Reels/Shorts gebremst werden sollen: Bedienungshilfe. Vorher ein eigener, gut sichtbarer Hinweis-Bildschirm (Google verlangt das): was die Bedienungshilfe sieht (nur, ob gerade Reels/Shorts offen sind), was nicht (keine Texte, keine Nachrichten, nichts verlässt das Handy), Buttons "Zustimmen und einschalten" und gleichwertig "Nicht jetzt". Die App funktioniert auch ohne.
7. Nur Samsung/Xiaomi: kurzer Akku-Hinweis, "Später" gleichwertig.
8. Fertig: "Dein Schutz für Instagram ist aktiv. Öffne Instagram einmal, um die Pause zu sehen."
Keine Paywall im Onboarding, keine erfundenen Zahlen, keine Angst-Sprache.
```

## Prompt 3 – Die 4 Tabs

```
Jetzt die App: Tab-Leiste Heute, Schutz, Fokus, Einblicke. Oben Name, Status-Badge, Zahnrad.
Heute: ruhiger Status, heutige Öffnungsversuche, davon abgebrochen, echte Nutzungszeit; Rescue-Schnellstart 15/30/60 Min.
Schutz: Liste geschützter Apps, "App hinzufügen" (2. App → Pro-Hinweis), Detail als Bottom-Sheet mit Pausendauer, Anti-Binge-Stufen-Grafik (1×, 2×, 3,5×, Sperre), Tageslimit, Zeitfenster.
Fokus: 15/30/60/Eigene, Ziel-Apps, Streng-Modus (Pro), laufende Sitzung.
Einblicke: Tagesverlauf, meistgeöffnete Apps, abgebrochen vs. geöffnet, 7/30-Tage als dezenter Pro-Teaser.
Einstellungen: Notfall-Entsperrung, Berechtigungen, Datenschutz, Pro verwalten, Hilfe.
Jeden Tab einmal mit Daten und einmal leer (erster Tag).
Im App-Detail (nur bei Instagram, YouTube, TikTok, Facebook, Snapchat): "Reels & Shorts" mit Auswahl Aus / Sperren / Begrenzen (z. B. 10 Wischer oder 5 Min.). Ist die Bedienungshilfe aus: Hinweis-Zeile "Dafür braucht ScrollShield die Bedienungshilfe" mit "Einschalten".
```

## Prompt 4 – Pause-Bildschirm und Pro

```
1. Pause-Bildschirm (Vollbild über der App): Atemkreis, Countdown, "Doch nicht", nach Ablauf "Weiter zu Instagram".
2. Anti-Binge-Varianten: Stufe 2 ("Du hast Instagram vor 2 Minuten geschlossen. Sicher?", 20 s), Stufe 3 (35 s + Atemübung), Stufe 4 (15 Min. Pause, Bernstein, kleine Notfall-Entsperrung mit 60 s Wartezeit).
3. Notfall-Entsperrung mit bewusster Reibung (warten oder Satz tippen).
4. Pro-Seite: 3,99 €/Monat, 19,99 €/Jahr mit 7 Tagen gratis, Free-vs-Pro-Liste, "Käufe wiederherstellen", "Jederzeit kündbar". Kein Zeitdruck, keine Fake-Rabatte.
```

## Prompt 5 – Restliche Bildschirme

```
Jetzt alle restlichen Bildschirme und Zustände, damit V1 vollständig ist:

Sperr-Bildschirme (Vollbild über der App, gleiche Sprache wie die Pause):
1. Tageslimit erreicht ("Dein Limit für Instagram heute: 30 Min. erreicht. Morgen geht's weiter."), mit Notfall-Entsperrung klein.
2. Sitzungslimit erreicht ("10 Minuten am Stück – kurze Pause?"), mit Wartezeit.
3. App während Fokus-/Rescue-Sitzung geöffnet: Restzeit groß, "Zurück", bei Streng-Modus kein Ausweg außer Notfall.
3b. Reels/Shorts erkannt: "Reels sind gesperrt – der Rest von Instagram bleibt frei.", Button "Zurück zum Feed". Variante Begrenzen: "10 Reels geschaut. Kurze Pause?" mit Wartezeit.

Probleme:
4. Schutz läuft nicht (Berechtigung entzogen / Dienst von Android beendet): Banner auf "Heute" + eigener Hilfe-Bildschirm mit Schritt-für-Schritt-Reparatur.

Pro & Abo:
5. Kauf erfolgreich, Kauf fehlgeschlagen, Käufe wiederherstellen.
6. Pro abgelaufen: "Im Free-Tarif bleibt 1 App geschützt – welche?" Auswahl-Liste, die anderen werden pausiert, nicht gelöscht.

Einstellungen-Unterseiten:
7. Notfall-Entsperrung einstellen (Wartezeit oder Satz tippen, Anzahl pro Woche).
8. Zeitfenster-Editor (Tage wählen, Start/Ende, mehrere Fenster, z. B. "Arbeit Mo–Fr 9–17", "Schlaf 22–7").
9. Sprache (Deutsch / English), Benachrichtigungen (Wochen-Zusammenfassung an/aus).
10. Datenschutz, Impressum, Open-Source-Lizenzen, Hilfe & Kontakt.
11. "Alle Daten löschen" mit Bestätigung.

Außerhalb der App:
12. Dauerhafte Android-Benachrichtigung "ScrollShield aktiv" (mit Aktion "Rescue starten").
13. Schnelleinstellung-Kachel (Rescue): Zustände aus / aktiv mit Restzeit.
14. Homescreen-Widget klein (2×1: Status) und mittel (4×2: Status + heutige Versuche/Abgebrochen + Rescue-Button).
15. Wochen-Benachrichtigung: ruhig, nur echte Zahlen, z. B. "Diese Woche: 42 Öffnungen gebremst, 28 abgebrochen."

Marke:
16. App-Icon (Schild-Motiv, schlicht, funktioniert auf dunkel und hell und als Android-Adaptive-Icon), Startbildschirm, 5 Store-Screenshots mit kurzen Überschriften (DE + EN).

Zeige wichtige Bildschirme einmal auf Deutsch und einmal auf Englisch.
```

---

## Danach

Design in Claude Design exportieren und in Claude Code sagen „setz das Design um“.
