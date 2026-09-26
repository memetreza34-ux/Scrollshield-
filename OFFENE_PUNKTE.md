# Offene Punkte – Fahrplan bis zur Veröffentlichung

Stand: 26. September 2026. Reihenfolge = Arbeitsreihenfolge. **[Du]** kannst nur du erledigen, **[Claude]** kann im
Code erledigt werden. Erledigtes abhaken oder löschen. Keine Rechtsberatung – die rechtlichen Punkte sind eine
technische Einschätzung; Details und Fragen für eine Prüfung stehen in `docs/LEGAL_REVIEW_BRIEF.md`.

## 1. Blocker – vor allem anderen

- [ ] **[Du] Name klären.** „ScrollShield“ ist vergeben: Im Play Store gibt es „ScrollShield: Reel Blocker“
      (`com.techinnate.android.scrollshield`), eine App mit derselben Funktion (Reels blockieren per Bedienungshilfe),
      dazu „ScrollShield: Screen Time Lock“ im App Store und eine Chrome-Erweiterung „Scroll Shield“. Gleicher Name in
      derselben Kategorie heißt: Verwechslung, schlechte Auffindbarkeit und Risiko einer Markenbeschwerde. Neuen Namen
      suchen, in DPMA und EUIPO (Markenrecherche), Play Store und bei Domains prüfen. Danach **[Claude]** Name in App,
      Texten, Paket-ID und Domain ersetzen. Die Paket-ID lässt sich nach dem ersten Upload nie mehr ändern.
- [ ] **[Du] Alten Google-Schlüssel abschalten.** In der Git-Historie (Datei `firebase-applet-config.json`, entfernt in
      `e15ff43`) steht ein Firebase-API-Schlüssel des Google-Projekts `gen-lang-client-0871665296`, das Google AI Studio
      angelegt hat. Google Cloud Console → „APIs & Dienste → Anmeldedaten“ → löschen. Wird das Projekt nicht gebraucht,
      ganz löschen (Firebase Console → Projekteinstellungen); damit ist auch die alte Datenbank weg.
- [ ] **[Du] Android Studio installieren** und die App bauen. Der Android-Teil ist noch nie kompiliert worden. Danach
      **[Claude]** Kompilierfehler beheben.
- [ ] **[Du] Auf einem echten Handy testen:** `docs/DEVICE_TEST_CHECKLIST.md`.

## 2. Konten und Sicherheit

- [ ] **[Du] Zwei-Faktor-Anmeldung** bei GitHub, Google, später Play Console, und deinem E-Mail-Konto.
- [ ] **[Du] Eigene Support-E-Mail** anlegen (nicht deine private). Google zeigt die Kontakt-E-Mail öffentlich im Store.
- [ ] **[Du] Google-Play-Entwicklerkonto** (einmalig 25 US-Dollar, Identitätsprüfung). Entscheidung:
  - **Privates Konto:** Vor der Veröffentlichung ein geschlossener Test mit **mindestens 12 Testern über 14 Tage am
    Stück** (gilt für private Konten ab 13.11.2023). Tester früh organisieren.
  - **Organisationskonto:** kein Tester-Zwang, braucht aber eine Firma und eine D-U-N-S-Nummer.
- [ ] **[Du] Händlerstatus (EU-Gesetz über digitale Dienste)** in der Play Console angeben. Als Händler werden
      Adresse, Telefon und E-Mail öffentlich angezeigt. Wer seine Wohnadresse nicht zeigen will, braucht eine
      Geschäftsadresse.
- [ ] **[Du] Signierschlüssel:** Beim ersten Upload „Play App Signing“ nutzen. Den eigenen Upload-Schlüssel (`.jks`)
      doppelt sichern (z. B. Passwortmanager und verschlüsselter USB-Stick). Nie ins Repo.

## 3. Recht und Geld

- [ ] **[Du] Klären: kostenlos oder mit Einnahmen?** Davon hängen fast alle folgenden Punkte ab.
- [ ] **Bei Einnahmen [Du]:** Gewerbe anmelden, Finanzamt (Fragebogen zur steuerlichen Erfassung), Kleinunternehmer-
      regelung prüfen, Steuerangaben in der Play Console. IHK oder Steuerberater fragen.
- [ ] **[Du] Impressum** ausfüllen (`src/screens/SupportScreen.tsx`). Ob es auch für eine kostenlose App Pflicht ist,
      ist selbst eine Rechtsfrage – im Zweifel ausfüllen.
- [ ] **[Du] Datenschutzerklärung fertigstellen:** Anbieterangaben und Hoster in `public/privacy.html` (markiert mit
      „Vor Release ergänzen“), dann den Entwurfs-Hinweis entfernen. Sie muss unter einer öffentlichen URL erreichbar
      sein – Google verlangt den Link.
- [ ] **[Du] Domain und Hosting:** Eigene Domain registrieren und E-Mail einrichten; `scrollshield.app` hat keine
      DNS-Einträge, wer sie registriert, bekäme die Mails der Nutzer. Für die Webversion einen Hoster wählen (in der EU
      ist der Datenschutz am einfachsten).
- [ ] **[Du] Keine Heilversprechen.** App und Store-Texte nicht als Behandlung von „Sucht“ darstellen, sonst droht die
      Einstufung als Medizinprodukt. Als Produktivitäts- bzw. Selbstkontroll-App beschreiben. Der Release-Check blockt
      schon einige Formulierungen.
- [ ] **[Du] Fremde Logos:** Die App zeigt die echten Logos von Instagram, TikTok, YouTube usw. (in `src/types.tsx`).
      Das kann bei der Store-Prüfung oder bei den Markeninhabern Ärger geben, vor allem auf Screenshots. Prüfen lassen
      oder **[Claude]** durch neutrale Symbole ersetzen.
- [ ] **[Du] Zielgruppe festlegen.** Mit Zielgruppe unter 13 gelten Googles strenge Familien-Richtlinien. Einfachster
      Weg für Version 1: 16+ oder 18+. Mit Anwalt klären, ob Jugendliche die Bedienungshilfe selbst erlauben dürfen.
- [ ] **[Du] Rechtstexte prüfen lassen** (Generator einer Kanzlei oder Erstberatung), vor allem Bedienungshilfe,
      Jugendliche, Store-Texte. Fragen: `docs/LEGAL_REVIEW_BRIEF.md`.
- [x] **EU AI Act:** betrifft die App nicht, sie enthält keine KI.
- [x] **Open-Source-Lizenzen:** werden bei jedem Build als `third-party-licenses.txt` erzeugt und in der App verlinkt.

## 4. Play-Store-Unterlagen

Vorlagen: `docs/STORE_SUBMISSION_PACKET.md`, `docs/STORE_LISTING_COPY.md`, `STORE_PRIVACY_LABELS.md`.

- [ ] **[Du] Datensicherheit-Formular:** Es werden keine Daten erfasst oder geteilt (alles bleibt auf dem Gerät).
- [ ] **[Du] Erklärung zur Bedienungshilfe** (Accessibility-API) mit Demo-Video: Hinweis vor dem Einschalten zeigen,
      dann den Nutzen.
- [ ] **[Du] Erklärung zum Vordergrunddienst** (`specialUse`) mit Demo-Video.
- [ ] **[Du] Nutzungsdatenzugriff und Überlagerung** im Video zeigen und in der Beschreibung erklären.
- [ ] **[Du] Inhaltseinstufung** (Fragebogen), Zielgruppe, Werbung „nein“, und die weiteren Fragen unter
      „App-Inhalte“ ehrlich beantworten.
- [ ] **[Du] Anleitung für die Prüfer:** wie man die App ohne Konto testet und welche Berechtigungen nötig sind.
- [ ] **[Du] Store-Eintrag:** Name, Kurz- und Langbeschreibung, Screenshots (vorhanden in `docs/store-assets`, ggf. neu
      ohne fremde Logos), Symbol 512 × 512, Grafik 1024 × 500, Kategorie „Produktivität“.
- [ ] **[Du] Mit einer Ablehnung rechnen.** Apps mit Bedienungshilfe fallen oft beim ersten Mal durch. Die Begründung
      von Google genau lesen und nachbessern.

## 5. Technik vor dem Release

- [ ] **[Claude]** Kompilierfehler beheben, sobald Android Studio läuft.
- [ ] **[Du]** Release-Build erzeugen (`npm run android:bundle`), in den geschlossenen Test hochladen, 14 Tage laufen
      lassen, Abstürze in der Play Console (Android Vitals) ansehen.
- [ ] Bekannte Grenzen, bewusst in Kauf genommen oder später lösen:
  - Tageslimit, Anti-Binge und Zeitfenster werden nur beim Öffnen einer App geprüft, nicht während man in ihr bleibt.
  - Auf dem Handy gibt es keine Notfallfreigabe.
  - Endet eine Fokus-Sitzung bei geschlossener App, bleibt die Sperre bis zum nächsten Öffnen.
  - Die Modus-Knöpfe heißen „soft / standard / strict“ (englisch) in einer sonst deutschen App.
- [ ] **iPhone:** Es gibt keine iOS-App. Dafür wären eigener Swift-Code mit Apples Bildschirmzeit-Schnittstelle, Apples
      Sondergenehmigung dafür, ein Mac mit Xcode und ein Apple-Entwicklerkonto (99 US-Dollar pro Jahr) nötig.

## 6. Nach der Veröffentlichung

- [ ] Support-Mails beantworten; Google verlangt eine funktionierende Kontaktadresse.
- [ ] Einmal im Jahr die Ziel-Android-Version anheben (Google verlangt eine aktuelle), sonst verschwindet die App für
      neue Nutzer.
- [ ] E-Mails von Google Play zu Richtlinien lesen – Fristen dort sind ernst gemeint.
- [ ] Bei jedem neuen Feature: Datenschutzerklärung und Datensicherheit-Formular prüfen.
