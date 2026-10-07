# ScrollShield – Roadmap

Stand: 05.10.2026. Was in Version 1 steckt und warum, steht verbindlich in
[`docs/V1_MASTER_PLAN.md`](docs/V1_MASTER_PLAN.md). Diese Roadmap legt nur die Reihenfolge fest.

Die frühere Roadmap (Cloud-Sync, Partner- und Familienmodus, KI-Empfehlungen, Motivationszitate, Streak-System,
„gesparte Zeit“) ist ersetzt. Diese Punkte sind entweder nach V1 verschoben oder gestrichen (Master-Plan,
Abschnitt 11).

Arbeitsweise: erst alle Inhalte und Funktionen bauen (Phasen 0–3, schlichtes Aussehen), dann das Design in Claude
Design, dann Umsetzung des Designs, dann Abrechnung und Release.

---

## Phase 0 – Produkt-Wahrheit

- Master-Plan als einzige Quelle; widersprüchliche Dokumente anpassen oder als veraltet markieren
- Typen und Datenquellen aufräumen (eine Quelle pro Wert)
- erfundene Kennzahlen entfernen („gesparte Zeit“)
- Free/Pro-Aufteilung festgeschrieben (Master-Plan, Abschnitt 10)

## Phase 1 – Native Grundlage

- versionierter Schutz-Vertrag zwischen Web und Android
- Regel-Engine pro App auf dem Handy
- zuverlässige Erkennung, wann eine App in den Vordergrund kommt
- nativer Unterbrechungs-Bildschirm mit Zurück/Weiter
- Notfallfreigabe auf dem Handy
- Konfiguration bleibt über Neustarts erhalten
- Dienst-Zustand (läuft, Berechtigungen, Akku-Ausnahme) sichtbar
- **erster Test auf einem echten Gerät** (`docs/DEVICE_TEST_CHECKLIST.md`)

## Phase 2 – Kern-Engine

- Ereignis-Protokoll für alle Unterbrechungen, Öffnungen, Wiederöffnungen
- Wiederöffnungs-Schutz mit Stufen und Abkühlzeit
- Sitzungs-Wächter (Prüfung auch während der Nutzung)
- Kurzvideo-Schutz: Erkennung für Instagram Reels, YouTube Shorts und TikTok auf echten Geräten prüfen; nicht
  geprüfte Apps ausblenden
- Kennzahlen nur mit Messquelle (gemessen / abgeleitet / nicht verfügbar)

## Phase 3 – Produkt-Aufbau (Inhalte, noch ohne finales Design)

- 4 Tabs: Heute, Schutz, Fokus, Einblicke; Einstellungen als Zahnrad
- Heute nach Master-Plan 4.2
- Schutz mit App-Detail und Voreinstellungen (Sanft, Ausgewogen, Stark, Eigene)
- freie Zeitpläne statt fester Zeitfenster
- Fokus (15/30/60, eigene Dauer), Rescue, Selbstverpflichtung
- Einblicke (Heute, Woche, Muster, Trends)
- zentrale Pro-Abfrage mit Free-Grenzen, Paywall-Seite (noch ohne echte Abrechnung)

## Phase 3b – Design

- Übergabe aller Seiten und Zustände an Claude Design
- Design-Leitlinie „Ruhige Kontrolle“ (Master-Plan, Abschnitt 13)
- Umsetzung des Designs

## Phase 4 – Monetarisierung

- Google Play Billing anbinden
- Pro-Status aus dem Store, Testphase beim Jahresabo
- Käufe wiederherstellen, Abo verwalten
- Paywalls im Zusammenhang (Master-Plan, Abschnitt 10)

## Phase 5 – Release

- Test auf mehreren Android-Geräten und Herstellern (Samsung, Xiaomi, Pixel)
- Zuverlässigkeit der Berechtigungen und des Hintergrund-Dienstes
- Datenmigration aus älteren Versionen
- Abrechnung testen
- Play-Richtlinien prüfen (Bedienungshilfe, Overlay, Foreground-Service, Data Safety)
- geschlossene Beta
- Store-Eintrag und Screenshots (ohne fremde Logos)

---

## Leitlinien

1. Free bleibt dauerhaft nützlich; keine Paywall vor dem ersten Schutz-Erlebnis.
2. Eine Funktion ist erst fertig, wenn sie auf dem Handy durchgesetzt und auf einem Gerät getestet ist.
3. Alles bleibt lokal auf dem Gerät; kein Konto in V1.
4. Lieber weniger Funktionen, die zuverlässig laufen, als viele halbe.
