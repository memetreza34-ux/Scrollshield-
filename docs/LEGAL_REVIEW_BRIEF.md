# ScrollShield – Unterlagen für die rechtliche Prüfung

Stand: 24. September 2026. Dieses Dokument fasst für eine Anwältin oder einen Anwalt zusammen, was ScrollShield
technisch tut und welche Fragen vor der Veröffentlichung offen sind. Alle Angaben zu Datenflüssen sind am Quelltext
geprüft, nicht aus Konzeptpapieren übernommen.

## 1. Was ScrollShield ist

Eine App gegen impulsives Öffnen von Social-Media-Apps und endloses Scrollen in Kurzvideo-Feeds (Reels, Shorts, TikTok).
Sie verzögert oder sperrt geschützte Apps nach Regeln, die der Nutzer selbst festlegt, und zeigt ihm Statistiken über
sein Verhalten.

- **Plattformen:** Android-App (Capacitor) und Webversion (PWA). Eine iPhone-App gibt es nicht.
- **Kein Server, kein Konto, kein Tracking.** Die App enthält keinen Code, der Daten an den Anbieter oder Dritte
  sendet. Ein automatischer Check prüft bei jedem Build, dass im Code keine Netzwerkaufrufe und keine Tracker stecken.
- **Keine KI.** Die App arbeitet mit festen Regeln. Der EU AI Act ist nach technischer Einschätzung nicht einschlägig.
- **Geschäftsmodell:** [Vom Anbieter zu ergänzen: kostenlos, kostenpflichtig, Spenden? Privat oder gewerblich?]

## 2. Zu prüfende Unterlagen

| Unterlage                               | Ort                                               |
| --------------------------------------- | ------------------------------------------------- |
| Datenschutzerklärung (Entwurf)          | `public/privacy.html`                             |
| Impressum (noch Platzhalter)            | App → Hilfe → Impressum (`SupportScreen.tsx`)     |
| Hinweis vor Aktivierung Bedienungshilfe | App → Berechtigungen, Karte „Kurzvideo-Erkennung“ |
| Store-Datenschutzangaben                | `STORE_PRIVACY_LABELS.md`                         |
| Berechtigungen und ihr Zweck            | `PERMISSION_MATRIX.md`                            |
| Verarbeitungsverzeichnis                | `COMPLIANCE_ROPA.md`                              |
| Store-Texte                             | `docs/STORE_LISTING_COPY.md`                      |

## 3. Datenflüsse (am Code geprüft)

| Daten                                             | Wo                                     | Verlässt das Gerät?                |
| ------------------------------------------------- | -------------------------------------- | ---------------------------------- |
| Regeln, Profile, Einstellungen                    | Gerät, verschlüsselt                   | Nein                               |
| Verlauf (letzte 100 Ereignisse), Statistiken      | Gerät, unverschlüsselt in der Sandbox  | Nein                               |
| Freitext „Grund“ vor dem Öffnen einer App         | im Verlauf                             | Nein                               |
| Vordergrund-App (Android)                         | nur im Arbeitsspeicher                 | Nein, wird nicht gespeichert       |
| Unterbrechungen durch den Schutzbildschirm        | Gerät, verschlüsselt, dann im Verlauf  | Nein                               |
| Kurzvideo-Minuten, Oberflächenkennungen (Android) | Gerät, verschlüsselt                   | Nein                               |
| Benachrichtigungen                                | Gerät bzw. Android-System              | Nein                               |
| Datenexport (JSON)                                | Datei, die der Nutzer selbst speichert | Nur wenn der Nutzer sie weitergibt |
| Abruf der Webversion                              | Server-Logs des Hosters                | Ja: IP-Adresse usw. an den Hoster  |
| Support-E-Mail                                    | E-Mail-Postfach des Anbieters          | Ja, wenn der Nutzer schreibt       |
| Installation über Google Play                     | Google                                 | Ja, nach Googles Bedingungen       |

Die Bedienungshilfe liest ausschließlich technische Bezeichner von Bildschirmelementen und Fensterklassen sowie
Scroll-Ereignisse. Aufrufe, die Texte oder Beschreibungen lesen, kommen im Quelltext nicht vor.

## 4. Offene Fragen

1. **Verantwortlichkeit:** Ist der Anbieter Verantwortlicher im Sinne der DSGVO für Daten, die das Gerät des Nutzers
   nie verlassen? Wie sollte die Erklärung das formulieren?
2. **Rechtsgrundlagen:** Trägt Art. 6 Abs. 1 lit. b DSGVO (Nutzungsvertrag), obwohl es bisher keine
   Nutzungsbedingungen gibt? Braucht es welche? Ist die Einwilligung (lit. a) für die Bedienungshilfe richtig gewählt?
3. **§ 25 TDDDG:** Die App speichert Daten auf dem Endgerät und liest Nutzungsdaten aus. Fällt das unter die Ausnahme
   „unbedingt erforderlich“, oder ist eine gesonderte Einwilligung nötig?
4. **Hosting der Webversion:** Anbieter noch nicht gewählt. Welche Anforderungen gelten (Auftragsverarbeitungsvertrag,
   Drittlandübermittlung bei US-Anbietern, Speicherdauer der Server-Logs)?
5. **Impressum und Händlerstatus:** Welche Pflichtangaben nach § 5 DDG gelten für den Anbieter? Google Play verlangt die
   Angabe, ob der Anbieter Händler im Sinne des Digital Services Act ist; dann werden Name und Anschrift öffentlich
   angezeigt.
6. **Minderjährige:** Die App fragt kein Alter ab und ist ohne Altersgrenze nutzbar; sie behandelt jeden Nutzer mit den
   strengeren Datenschutz-Voreinstellungen. Gilt Art. 8 DSGVO für die Einwilligung in die
   Bedienungshilfe bei Nutzern unter 16? Welche Altersangabe sollte der Store-Eintrag haben?
7. **Freitext „Grund“:** Nutzer können dort beliebige, auch sensible Inhalte eintippen. Genügt der Hinweis in der
   Datenschutzerklärung?
8. **Store-Texte:** Frei von Heilversprechen (Stichwort Sucht)? Ist die Nennung von Instagram, TikTok, YouTube usw.
   zulässig, wie sie in App und Store-Texten vorkommt?
9. **Haftung:** Braucht es einen Hinweis, dass die App keine Garantie bietet, dass Sperren nicht umgangen werden können?

## 5. Was der Anbieter vor Release selbst erledigen muss

- Impressum und Verantwortlichen-Angaben ausfüllen (alle Stellen mit „Vor Release ergänzen“; der Befehl
  `npm run check:release:strict` listet sie auf).
- Die Domain `scrollshield.app` registrieren und E-Mail einrichten, oder eine eigene Support-Adresse eintragen. Die
  Domain hat derzeit keine DNS-Einträge; wer sie registriert, würde die Mails der Nutzer erhalten.
- Hosting-Anbieter für die Webversion wählen und in Abschnitt 3a der Datenschutzerklärung eintragen.
- Die geprüfte Datenschutzerklärung unter einer öffentlichen URL bereitstellen. Google Play verlangt den Link.
