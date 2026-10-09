> **V1-SCOPE-HINWEIS (09.10.2026):** Die historische Empfehlung für Neon-Akzente und die Begründung „16+ wegen Accessibility“ sind nicht der aktuelle Produktvertrag. Android V1 hat keinen produktiven AccessibilityService; die visuelle Vorgabe ist **Calm Control ohne Neon**. Die endgültige Alters-/Datenschutzbewertung ist offen. Maßgeblich: [Design System](V1_DESIGN_SYSTEM.md) und [Compliance-Review](V1_COMPLIANCE_REVIEW.md).

# ScrollShield - Jugendschutz & Youth Safety Policy

ScrollShield ist ein Werkzeug zur digitalen Selbstkontrolle. Da Themen wie Bildschirmzeit, Fokus und mentale Gesundheit besonders für Jugendliche (Schüler, Studenten) hochrelevant sind, muss die App "by design" sicher für Minderjährige sein.

Diese Richtlinie definiert den internen Standard für den Umgang mit jüngeren Zielgruppen.

## 1. Alterslogik & Einstufung

- **Mindestalter für Version 1.0: 16 Jahre.** Entschieden am 29.09.2026. Grund: Die optionale Bedienungshilfe stützt
  sich auf eine Einwilligung, und nach Art. 8 DSGVO braucht eine Einwilligung unter 16 in Deutschland die Zustimmung
  der Eltern. Ob das für eine rein lokale App überhaupt gilt, ist eine offene Frage für die rechtliche Prüfung
  (`docs/LEGAL_REVIEW_BRIEF.md`, Frage 6); 16+ umgeht sie. Umgesetzt als Zielgruppe „16–17 und 18+“ in der Play
  Console und als Hinweis in Store-Beschreibung und Datenschutzerklärung. Die App fragt kein Alter ab.
- **Veröffentlichung zuerst nur in der EU.** In US-Staaten wie Texas (SB 2420) gelten inzwischen Altersgesetze für
  App-Stores mit Pflichten für Entwickler.
- **Altersgruppen-Logik** (nur relevant, falls die Altersgrenze später gesenkt wird oder Online-Funktionen kommen):
  - **Unter 13:** Nutzung nur im reinen Offline-Modus (lokal) ohne jegliche Cloud- oder Social-Features erlaubt (Family-Link / Screen Time Integration durch Eltern).
  - **13 bis 15 Jahre (Teens):** "Strict Privacy Mode" ist aktiviert. Version 1.0 bleibt vollständig lokal und bietet keinen Cloud-Sync oder öffentliche Auffindbarkeit.
  - **16+ Jahre:** Standard-Erlebnis. Social-Features sind Opt-in.

## 2. Tone of Voice (Tonalität)

Der Ton der App muss für Jugendliche ansprechend, aber nicht anbiedernd sein.

- **Empowering & Respektvoll:** Wir belehren nicht ("Du bist zu viel am Handy!"), sondern bestärken ("Hol dir deine Zeit zurück").
- **Klar & Direkt:** Keine verschachtelten, akademischen Sätze. Kurze, prägnante Erklärungen.
- **Nicht kindisch:** Keine übertriebenen Emojis, kein erzwungener Slang ("Cringe", "Sus"), der schnell veraltet. Ein cleanes, technisches, aber warmes Design (Dark Mode, Neon-Akzente) spricht Jugendliche organisch an.
- **Ansprache:** Ein freundliches, respektvolles "Du".

## 3. Sensible Daten bei Minderjährigen

Folgende Daten sind bei Jugendlichen extrem kritisch und erfordern höchste Schutzmaßnahmen:

- **Nutzungsmuster:** Wann wird welche App genutzt? (Lässt Rückschlüsse auf Schlafenszeiten, Schulzeiten und Gewohnheiten zu).
- **Standortdaten:** ScrollShield sammelt **niemals** Standortdaten.
- **Klarnamen & Profilbilder:** Sollen vermieden werden. Avatare und Pseudonyme sind der Standard.
- **Geräte-IDs:** Werden für Analytics strikt gehasht oder weggelassen.

## 4. Schutz bei zukünftigen Online- & Community-Funktionen

Wenn ScrollShield später Accountability-Partner oder Gruppen (z.B. "Lern-Squads") einführt:

- **Keine globale Suche:** Nutzer können nicht nach Namen oder E-Mail-Adressen gesucht werden.
- **Invite-Only:** Verbindungen entstehen ausschließlich über direkte, temporäre Einladungslinks oder QR-Codes, die physisch oder über private Messenger geteilt werden.
- **Keine öffentlichen Profile:** Es gibt keine öffentlichen Leaderboards oder Feeds.
- **Kein Chat:** ScrollShield ist keine Messaging-App. Kommunikation beschränkt sich auf systemgenerierte Status-Updates (z.B. "Max hat einen 2-Stunden-Fokus beendet" oder "Sende einen Motivations-Ping"). Das schließt Cyberbullying, Grooming und Spam technisch aus.

## 5. Risikominimierung bei sozialen Funktionen

- **Asymmetrische Freigabe:** Ein Jugendlicher kann seinen Status (z.B. "Im Fokus-Modus") mit Eltern oder Freunden teilen, ohne dass diese die genauen App-Nutzungszeiten sehen.
- **Jederzeitiger Abbruch:** Verbindungen zu Accountability-Partnern können jederzeit ohne Benachrichtigung an die Gegenseite getrennt werden ("Ghosting" als Sicherheitsfeature).
- **Strict Privacy Mode:** Verhindert versehentliches Teilen von Statistiken.
- **Sichere Voreinstellung:** Solange keine Altersgruppe bekannt ist, behandelt die App den Zustand datenschutzseitig wie eine minderjährige Nutzung.

## 6. App Store Positionierung (Altersgerecht)

- **Altersfreigabe:** USK 0 / PEGI 3 für die Inhalte der App (Fragebogen in der Play Console). Das ist unabhängig vom
  Mindestalter 16, das über die Zielgruppe festgelegt wird.
- **Kategorie:** "Produktivität". Nicht "Gesundheit & Fitness": Das legt ein Gesundheitsversprechen nahe.
- **Beschreibung:** Fokus auf "Lernen", "Konzentration", "Fokus" und "Digital Wellbeing"; keine Werbung, die sich an
  Kinder richtet ("Hausaufgaben").
- **Datenschutz-Label:** "Keine Daten erhoben" muss das Ziel bleiben.
