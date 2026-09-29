# ScrollShield - Store Listing Copy

Diese Texte sind bewusst vorsichtig formuliert: ScrollShield wird als Werkzeug zur Selbstkontrolle beschrieben, nicht
als technische Blockier-Garantie und nicht als Hilfe bei Krankheiten oder Abhängigkeit.

## Kurzbeschreibung

ScrollShield hilft dir, impulsives App-Öffnen und endloses Kurzvideo-Scrollen bewusster zu unterbrechen.

## Lange Beschreibung

ScrollShield unterstützt dich dabei, ablenkende Apps bewusster zu nutzen. Du wählst Apps aus, setzt Verzögerungen,
Tageslimits und Fokus-Sitzungen und bekommst eine kurze Unterbrechung, bevor du dich bewusst für die weitere Nutzung
entscheidest.

Die App ist für Menschen gedacht, die weniger Zeit in Social Media, Kurzvideos oder Prokrastination verlieren möchten,
ohne ihr Smartphone komplett unbrauchbar zu machen.

Funktionen:

- App-spezifische Schutzregeln und Profile
- Öffnungsverzögerung gegen Autopilot-Nutzung
- Tageslimits und Anti-Binge-Sperre
- Fokus-Sitzungen für Arbeit, Lernen und Schlafenszeit
- Kurzvideo-/Reels-Schutz mit bewussten Unterbrechungen
- Lokale Statistiken und Verlauf
- Offline-First: keine Serverübertragung deiner Nutzungsdaten in Version 1.0

Berechtigungen:

- Nutzungsdatenzugriff: erkennt, wann du eine geschützte App öffnest.
- Über anderen Apps einblenden: zeigt den Schutzbildschirm über dieser App.
- Bedienungshilfe (optional): ScrollShield nutzt die Bedienungshilfe-Schnittstelle von Android (Accessibility-API), um
  zu erkennen, ob in einer von dir geschützten App gerade ein Kurzvideo-Feed wie Reels, Shorts oder TikTok offen ist,
  und um deine Wischbewegungen darin zu zählen. Gelesen werden nur technische Kennungen der Oberfläche – keine Texte,
  Nachrichten oder Eingaben. Nichts verlässt dein Gerät. Du schaltest den Dienst selbst ein, nachdem die App dir erklärt
  hat, was er tut, und kannst ihn jederzeit abschalten. Alle anderen Funktionen laufen auch ohne ihn.

Wichtig: ScrollShield ist ein Werkzeug zur Selbstkontrolle. Je nach erteilten Berechtigungen kann die Schutzwirkung
unterschiedlich stark sein. Der Kurzvideo-Schutz arbeitet als Best-Effort-Unterbrecher: Er kann Scroll-Muster
unterbrechen, aber nicht garantieren, jeden Reels-, Shorts- oder TikTok-Feed technisch zu erkennen oder zu blockieren.

ScrollShield ist für Nutzer ab 16 Jahren gedacht. ScrollShield steht in keiner Verbindung zu Instagram, TikTok,
YouTube, Facebook, X, Snapchat, Reddit oder Pinterest; die Namen gehören ihren Inhabern und dienen nur zur Beschreibung,
welche Apps sich schützen lassen.

## Suchbegriffe

Google Play hat kein eigenes Stichwortfeld; diese Begriffe sollen in der Beschreibung natürlich vorkommen. Keine
Begriffe zu Krankheiten, Störungen oder Abhängigkeit: Sie klingen nach einem Gesundheitsversprechen
(`npm run check:store` prüft das).

Fokus, Bildschirmzeit, Digital Wellbeing, Selbstkontrolle, Social Media, Prokrastination, Kurzvideos, Reels, Shorts,
Konzentration, App-Limits

## Screenshot-Texte

- Stoppe den Autopiloten
- Setze klare App-Limits
- Schütze Fokuszeiten
- Unterbrich Kurzvideo-Schleifen
- Deine Daten bleiben lokal

## Review Notes - Apple

Entfällt: Es gibt keine iOS-App. Siehe `OFFENE_PUNKTE.md`, Abschnitt 5.

## Review Notes - Google Play

ScrollShield verarbeitet App-Regeln, Verlauf und Statistiken lokal auf dem Gerät. Version 1.0 enthält keinen Account,
keinen Cloud-Sync, keine Werbung, keine Käufe und kein Tracking; zum Testen sind keine Zugangsdaten nötig.

So lässt sich die App prüfen:

1. Onboarding durchlaufen, Instagram (oder eine andere installierte App) auswählen.
2. Auf der Seite „Setup“ den Nutzungsdatenzugriff und „Über anderen Apps einblenden“ erteilen.
3. Die geschützte App öffnen: Der ScrollShield-Schutzbildschirm erscheint.
4. Optional: Auf der Karte „Kurzvideo-Erkennung (Bedienungshilfe)“ auf „Aktivieren“ tippen. Vor den
   Android-Einstellungen erscheint der Hinweis zur Bedienungshilfe mit „Ablehnen“ und „Zustimmen“; erst nach „Zustimmen“
   öffnen sich die Einstellungen. Danach den Reels-Feed öffnen und wischen: Nach der eingestellten Zahl von Wischern
   unterbricht ScrollShield.

Die Bedienungshilfe liest nur technische Kennungen der Oberfläche (`viewIdResourceName`) und Fensterklassen, nie Texte.
Die einzige Aktion, die sie auslöst, ist „Zurück“, wenn der Nutzer für einen Feed eine harte Unterbrechung eingestellt
oder den Feed gesperrt hat. Details: `docs/STORE_SUBMISSION_PACKET.md`, Abschnitt „Accessibility API Declaration“.
