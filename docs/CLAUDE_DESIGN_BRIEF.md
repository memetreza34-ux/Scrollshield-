# Design-Auftrag für Claude Design

Diese Datei ist der Einstieg für Claude Design. Sie sagt, was zu gestalten ist und in welcher Reihenfolge.
Stand: 14. Oktober 2026.

## Quellen – in dieser Reihenfolge lesen

1. **Diese Datei** – Auftrag, Ergänzungen vom 14.10., Reihenfolge.
2. **`docs/V1_MASTER_PLAN.md`** – die Wahrheit über Funktionen und Seiten:
   - Abschnitt 3 (Navigation, Seitenbaum)
   - Abschnitt 4 (jede Seite: Inhalt, Zustände, Texte)
   - Abschnitte 5–10 (Voreinstellungen, Kurzvideo-Schutz, Wiederöffnungs-Schutz, Limits, Kennzahlen, Free/Pro)
   - Abschnitt 13 (Design-Leitlinie „Ruhige Kontrolle“)
3. **`src/screens/`** – der heutige Stand der Seiten. Nur als Referenz für Inhalte und Funktionen, **nicht** für das
   Aussehen. Das Design wird neu gemacht.

Bei Widerspruch gilt: diese Datei vor dem Master-Plan, der Master-Plan vor dem Code.

## Was gilt (Kurzfassung)

- Android-App, **nur Dunkelmodus**, Format 360 × 800, Touch-Ziele ≥ 48 px, Kontrast WCAG AA.
- **Zweisprachig: Deutsch und Englisch.** Layouts müssen bis zu 30 % längere Texte und große Systemschrift (bis
  200 %) aushalten. Wichtige Seiten einmal auf Deutsch, einmal auf Englisch zeigen.
- Ab 16 Jahren. Kein Konto, keine Werbung, alles bleibt auf dem Handy.
- „ScrollShield“ ist ein **Arbeitsname** und wird noch ersetzt (der Name ist im Play Store vergeben). Das Icon darf
  deshalb nicht vom Namen abhängen.
- Free: 2 Apps. Pro: 3,49 €/Monat oder 19,99 €/Jahr mit 7 Tagen gratis (Master-Plan Abschnitt 10).
- Voreinstellungen: Sanft, Ausgewogen, Stark, Eigene.
- Kurzvideo-Schutz in V1 für Instagram Reels, YouTube Shorts und TikTok (Master-Plan Abschnitt 6).
- Echte Zahlen only: keine „gesparte Zeit“, keine Punkte. Ohne Messquelle steht „nicht gemessen“, nicht 0.

### Farben (Master-Plan Abschnitt 13, konkretisiert)

| Rolle          | Wert      |
| -------------- | --------- |
| Hintergrund    | `#09090B` |
| Fläche         | `#121215` |
| Fläche erhöht  | `#1C1C22` |
| Linie          | `#27272A` |
| Text           | `#F4F4F5` |
| Text gedämpft  | `#A1A1AA` |
| Text leise     | `#71717A` |
| Akzent (Ruhe)  | `#10B981` |
| Pause/Reibung  | `#F59E0B` |
| Strenge Sperre | `#F43F5E` |

Etwa 90 % Neutral, 10 % Akzent. Radius 12 oder 16 px, 4-px-Raster. Keine Glows, kein Pulsieren, keine Verläufe auf
Knöpfen, keine Karten in Karten, keine Emojis, keine Markenlogos (neutrale Kürzel oder das Android-Symbol).

## Ergänzungen vom 14.10.2026 (stehen noch nicht im Master-Plan)

1. **Schnelleinstellung-Kachel** (Android-Schnellleiste): Rescue starten. Zustände: aus, aktiv mit Restzeit, Pro
   gesperrt.
2. **Homescreen-Widget:** klein (2×1: Schutz-Status), mittel (4×2: Status, heutige Öffnungsversuche und
   abgebrochene, Knopf Rescue).
3. **Benachrichtigungen:** Tageszusammenfassung (Standard aus) und Wochenrückblick [PRO], nur echte Zahlen, z. B.
   „Diese Woche: 42 Öffnungen unterbrochen, 28-mal Zurück.“ Dazu die dauerhafte Dienst-Benachrichtigung „Schutz
   aktiv“ mit Aktion „Rescue starten“.
4. **Sperre während der Nutzung:** Tagesbudget, Zeitplan und Fokus können eine App sperren, während man in ihr ist
   (nicht nur beim Öffnen). Der Unterbrechungs-Bildschirm braucht dafür passende Texte, z. B. „Dein Tagesbudget für
   Instagram ist aufgebraucht.“
5. **Hinweis vor der Bedienungshilfe** (Google verlangt das): eigener Bildschirm, bevor der Kurzvideo-Schutz die
   Bedienungshilfe einschaltet. Was sie sieht (ob gerade Reels/Shorts offen sind), was nicht (keine Texte, keine
   Nachrichten, nichts verlässt das Handy). Knöpfe „Zustimmen und einschalten“ und gleichwertig „Nicht jetzt“.
6. **Pro abgelaufen:** Waren mehr als 2 Apps geschützt, wählt man, welche 2 bleiben. Die anderen werden pausiert,
   nicht gelöscht.
7. **Marke:** App-Icon (schlicht, adaptives Android-Icon, ohne Namen), Startbildschirm, 5 Store-Screenshots mit
   kurzen Überschriften auf Deutsch und Englisch.

## Reihenfolge

1. **Design-System** auf einer eigenen Seite: Farben, Schrift (moderne Sans-Serif, Zahlen tabellarisch), Abstände,
   Icons, Knöpfe, Schalter, Segment-Auswahl, App-Zeile mit Status, Karte, Bottom-Sheet, Hinweis-Banner, Tab-Leiste,
   leerer Zustand, Pro-Kennzeichnung.
2. **Onboarding** (Master-Plan 4.1).
3. **Die vier Tabs** Heute, Schutz (mit App-Detail, Zeitpläne, Selbstverpflichtung), Fokus, Einblicke
   (Master-Plan 4.2–4.5).
4. **Unterbrechung, Notfallfreigabe, Rescue, Paywall** (Master-Plan 4.6–4.8 und 4.10), mit allen Gründen aus 4.7
   und den Stufen des Wiederöffnungs-Schutzes (Abschnitt 7).
5. **Einstellungen** (4.9) und **alle Ergänzungen vom 14.10.** (oben).

Jede Seite in allen Zuständen: leer (erster Tag), normal, Fehler / Berechtigung fehlt, Pro gesperrt. Mit echten Texten
aus dem Master-Plan.

## Danach

Design aus Claude Design exportieren und in Claude Code sagen: „Setz das Design um.“
