# ScrollShield — Google Play Store Copy (V1 Draft)

This file describes only the production V1 contract. Research-only capabilities must not be advertised.

## Kurzbeschreibung

ScrollShield bremst impulsives App-Öffnen und erhöht die Pause, wenn du immer wieder zurückkehrst.

## Lange Beschreibung

ScrollShield hilft dir, ablenkende Apps bewusster zu nutzen, ohne sie komplett aus deinem Alltag zu verbannen.

Du entscheidest selbst, welche Apps geschützt werden. Beim Öffnen unterbricht ScrollShield den Autopiloten mit einer kurzen Pause und einer klaren Wahl: zurück oder bewusst weiter. Wenn du eine App kurz danach wieder öffnest, kann der Wiederöffnungs-Schutz mehr Reibung aufbauen.

### Funktionen

- Schutzregeln pro App
- bewusste Pause vor dem Öffnen
- Wiederöffnungs-Schutz gegen reflexartiges Zurückkehren
- Zeitpläne
- Fokus-Sitzungen
- Session Guard und erweiterte Regeln in Pro
- sichere Notfallfreigabe
- lokale Heute-/Trenddaten aus tatsächlichen Ereignissen und Nutzungswerten
- Local-first-Verarbeitung der Schutz- und Nutzungsdaten
- keine Werbung

ScrollShield zeigt keine geschätzte „gesparte Lebenszeit“ und keinen künstlichen Produktivitätsscore.

### Berechtigungen auf Android

**Nutzungsdatenzugriff:** ScrollShield benötigt diesen Zugriff, um zu erkennen, wann eine von dir geschützte App in den Vordergrund kommt und um Nutzungszeiten geschützter Apps zu messen.

**Über anderen Apps einblenden:** Damit kann ScrollShield den Schutzbildschirm über einer geschützten App anzeigen.

**Benachrichtigungen (optional):** Für Fokus-Ende und andere von dir aktivierte Erinnerungen.

Der aktive Schutz verwendet einen sichtbaren Android-Vordergrunddienst mit dauerhafter Benachrichtigung. Du kannst den Schutz in ScrollShield beenden.

### Datenschutz

V1 benötigt keinen ScrollShield-Account und keinen Cloud-Sync für deine Schutzdaten. Regeln, Ereignisse und Statistiken werden lokal auf deinem Gerät verarbeitet.

ScrollShield verkauft keine Nutzungsdaten und enthält keine Werbung.

### Wichtige Grenze

ScrollShield ist ein Werkzeug zur Selbstkontrolle. Die genaue Zuverlässigkeit kann je nach Android-Version, Gerätehersteller und erteilten Systemberechtigungen variieren.

Feed-spezifisches Blockieren von Instagram Reels, YouTube Shorts oder ähnlichen Oberflächen ist **kein Bestandteil der V1-Produktzusage**.

### Marken

ScrollShield steht in keiner Verbindung zu Instagram, TikTok, YouTube, Facebook, X, Snapchat, Reddit oder Pinterest. Namen dienen ausschließlich dazu, Apps zu beschreiben, die Nutzer selbst zum Schutz auswählen können.

## Suchbegriffe / Themen

Fokus, Bildschirmzeit, Digital Wellbeing, Selbstkontrolle, Social Media, App-Limits, App-Öffnen, Fokusmodus, Zeitplan

## Screenshot-Texte

- Stoppe den Autopiloten
- Mehr Reibung bei wiederholtem Öffnen
- Setze klare App-Regeln
- Starte Fokus in einem Tap
- Verstehe deine echten Nutzungsdaten
- Deine Schutzdaten bleiben lokal

## Review Notes — Google Play

ScrollShield V1 schützt vom Nutzer ausgewählte Apps über Usage Access und eine native Overlay-Intervention.

Prüfflow:

1. Onboarding durchlaufen und eine installierte unterstützte App schützen.
2. Nutzungsdatenzugriff erteilen.
3. „Über anderen Apps einblenden“ erteilen.
4. Schutz aktivieren.
5. Die geschützte App öffnen.
6. Der native ScrollShield-Unterbrechungsbildschirm erscheint.
7. „Zurück“ beendet den Öffnungsversuch; nach Ablauf der Pause kann der Nutzer bewusst fortfahren.
8. App verlassen und innerhalb des Reopen-Fensters erneut öffnen, um die adaptive Reibung zu prüfen.
9. In ScrollShield unter „Heute“ die lokal erfassten Interventionen/Nutzungswerte prüfen.

V1 registriert **keinen AccessibilityService**. Research-Code für mögliche spätere Feed-Erkennung ist nicht Teil des Production-Manifests und nicht Teil dieser Store-Zusage.

## Vor Einreichung manuell ergänzen

- finaler Supportkontakt
- finale Datenschutz-URL
- finaler Preis/Trial direkt aus Play Billing
- echte Geräte-Screenshots
- Foreground-Service- und sonstige Play-Console-Erklärungen gemäß aktuellem Formular
