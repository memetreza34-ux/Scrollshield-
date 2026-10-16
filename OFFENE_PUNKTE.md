# Offene Punkte – Fahrplan bis zur Veröffentlichung

Stand: 15. Oktober 2026. Reihenfolge = Arbeitsreihenfolge. **[Du]** kannst nur du erledigen, **[Claude]** kann im
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
- [x] **App bauen** (15.10.): Java 21, Android SDK 36 und Build-Tools sind auf dem Mac installiert (ohne Android
      Studio). Die App kompiliert ohne Fehler, Android-Lint meldet 0 Fehler. Bauen: `npm run android:sync`, dann
      `cd android && ./gradlew assembleDebug` (vorher `JAVA_HOME` auf Java 21 setzen). Die Test-App liegt danach in
      `android/app/build/outputs/apk/debug/app-debug.apk`.
- [ ] **[Du] Auf einem echten Handy testen:** `docs/DEVICE_TEST_CHECKLIST.md`.
- [x] **Funde vom 28.09.2026 behoben** (29.09.): App-Symbol und Startbild waren das Logo von Capacitor – jetzt das
      eigene Schild (`npm run generate:android-icons`). Die gespielte „Instagram autorisieren … Filter-Hook
      aktiviert“-Animation ist entfernt. Store-Texte korrigiert: Bedienungshilfe in Beschreibung und Prüfer-Notiz,
      kein „ADHS“; `npm run check:store` prüft das jetzt. Dazu: „Mehr erfahren“ auf dem Startbildschirm sprang sofort
      zurück.
- [x] **Mindestalter 16+** (Empfehlung übernommen, 29.09.; änderbar): Hinweis auf dem Startbildschirm, in
      Store-Beschreibung und Datenschutzerklärung; Unterlagen angeglichen. In der Play Console **[Du]** Zielgruppe
      „16–17“ und „18+“ wählen und für den Anfang nur EU-Länder freigeben (in Texas gilt seit 2026 ein Alters-Gesetz
      für App-Stores, weitere US-Staaten folgen).

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

- [x] **Kostenlos oder mit Einnahmen?** Entschieden: Free + Pro-Abo (Master-Plan Abschnitt 10). Damit gelten die
      Punkte zu Gewerbe und Steuern unten.
- [ ] **[Du] Pro-Abo in der Play Console anlegen** (Monetarisieren → Abos), sobald die App dort angelegt ist:
  - Abo mit der Produkt-ID **`pro`** (genau so, die App fragt danach).
  - Basis-Abo **`yearly`** (jährlich, automatisch verlängert) mit einem Angebot „7 Tage kostenlos“ nur für neue Kunden.
  - Basis-Abo **`monthly`** (monatlich, automatisch verlängert).
  - Preise festlegen (Plan: 19,99 € / Jahr, 3,49 € / Monat). Die App zeigt die Preise, die Google Play liefert.
  - Unter „Lizenztests“ deine Google-Adresse eintragen: Dann kannst du kaufen, ohne zu zahlen.
  - **[Claude]** Die Abrechnung ist seit 16.10. eingebaut (Googles eigene Bibliothek, kein Fremdanbieter). Testen geht
    erst, wenn die App im Play Store (geschlossener Test) liegt und das Abo dort angelegt ist.
- [ ] **[Du] Datensicherheit-Formular wegen Pro:** Käufe laufen über Google Play, die App sendet nichts an uns. Ob
      der Kauf über Google Play im Formular als „erfasst“ gilt, beim Ausfüllen in Googles Hilfe zum Formular nachlesen
      (nicht geprüft).
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
- [x] **Fremde Logos:** Die App zeigte die echten Logos von Instagram, TikTok, YouTube usw. Ersetzt durch neutrale
      Kürzel (IG, TT, YT …); der App-Name steht daneben. Seit 03.10. zeigt die Android-App für installierte Apps das
      Symbol, das Android selbst liefert (wie auf dem Startbildschirm); die App enthält weiterhin keine fremden Logos.
- [ ] **[Du] Screenshots neu aufnehmen** (`docs/store-assets`): Die alten zeigen noch die Logos und den alten Namen.
      Am besten nach der Umbenennung. Wichtig: Auf einem Handy mit Instagram & Co. zeigen die Screenshots jetzt deren
      echte Symbole. Für den Store ein Testhandy ohne diese Apps nehmen oder die Webversion, sonst stehen fremde
      Marken in deinem Store-Eintrag.
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
- [ ] **[Du] Bildschirmzeit auf „Start“ (seit 16.10.):** Die App liest jetzt die Nutzungszeit _aller_ Apps (gesamt, pro
      Stunde, die fünf meistgenutzten mit Namen) und die Entsperrungen. Alles bleibt auf dem Handy, die
      Datenschutzerklärung ist angepasst. Für die App-Namen und -Symbole sieht die App alle Apps mit Startbildschirm-
      Symbol (`<queries>` im Manifest, nicht die eingeschränkte Berechtigung QUERY_ALL_PACKAGES). Im
      Datensicherheit-Formular „App-Aktivität“ prüfen: nichts verlässt das Gerät.
- [ ] **[Du] Inhaltseinstufung** (Fragebogen), Zielgruppe, Werbung „nein“, und die weiteren Fragen unter
      „App-Inhalte“ ehrlich beantworten.
- [ ] **[Du] Anleitung für die Prüfer:** wie man die App ohne Konto testet und welche Berechtigungen nötig sind.
- [ ] **[Du] Store-Eintrag:** Name, Kurz- und Langbeschreibung, Screenshots (vorhanden in `docs/store-assets`, ggf. neu
      ohne fremde Logos), Symbol 512 × 512, Grafik 1024 × 500, Kategorie „Produktivität“.
- [ ] **[Du] Mit einer Ablehnung rechnen.** Apps mit Bedienungshilfe fallen oft beim ersten Mal durch. Die Begründung
      von Google genau lesen und nachbessern.

## 5. Technik vor dem Release

- [ ] **[Du]** Release-Build erzeugen (`npm run android:bundle`), in den geschlossenen Test hochladen, 14 Tage laufen
      lassen, Abstürze in der Play Console (Android Vitals) ansehen.
- [ ] Bekannte Grenzen, bewusst in Kauf genommen oder später lösen:
  - Anti-Binge wird nur beim Öffnen geprüft (gewollt). Tageslimit, Zeitfenster und Fokus werden seit 14.10. auch
    geprüft, während man in der App bleibt – alle 30 Sekunden, damit der Akku geschont wird. **[Du]** auf dem Handy
    testen: Tageslimit 1 Min., App offen lassen, nach spätestens 30 Sekunden über dem Limit muss die Sperre kommen.
  - Endet eine Fokus-Sitzung bei geschlossener App, bleibt die Sperre bis zum nächsten Öffnen.
  - **Seit 15.10.: keine Unterbrechung während Anrufen.** Klingelt das Telefon oder läuft ein Telefonat oder
    Video-Call (WhatsApp, Zoom …), zeigt die App nichts an und schließt einen offenen Pause-Bildschirm. Danach erscheint
    die Pause oder Sperre, wenn sie noch gilt. Grenze: Apps, die denselben Gesprächsmodus nutzen (z. B. ein
    Discord-Sprachkanal), schalten die Unterbrechung ebenfalls ab. **[Du]** testen: während eines Anrufs Instagram
    öffnen → keine Pause; auflegen → Pause erscheint.
  - **Seit 15.10.: Vorwarnung vor Sperren.** Zeitplan und Tagesbudget kündigen sich mit einem kleinen Hinweis oben an
    (4 Sekunden, ohne Ton, antippen schließt ihn): Zeitplan 30–60 Sekunden vorher, Tagesbudget ein bis zwei Minuten
    vorher. **[Claude]** Das Kurzvideo-Tageslimit hat noch keine Vorwarnung. **[Du]** testen: Zeitplan zur nächsten
    vollen Stunde, kurz vorher in der App bleiben.
- [x] **Englisch für die Android-Teile** (15.10.): `values-en/strings.xml`. Handys auf Englisch zeigen Pause-Bildschirm,
      Vorwarnung und Benachrichtigung auf Englisch, alle anderen Sprachen auf Deutsch. Die App-Oberfläche selbst (Web-Teil)
      ist noch nur Deutsch – das kommt mit der Umsetzung des Designs.
- [ ] **[Claude] Rest der Ergänzungen vom 15.10.** (Master-Plan): Lebenszeichen der Reels-Erkennung mit Warnung auf
      „Heute“, eigener Satz in der Pause, Berechtigungen beim Zurückkehren neu prüfen.
- [x] **Fehler aus der Code-Analyse vom 27.09.2026** behoben (28.09.): Profilwechsel schaltete den Schutz aus, Profil
      „Kein Endlos-Swipe“ sperrte die ganze App, Export ging in der Android-App nicht, App-Reset ließ Android-Daten
      liegen, Zurück-Taste schloss die App, Schein-Schalter „Schutz im Hintergrund“, falsche Plattform im Handy-Browser,
      Bedienungshilfe ohne Zustimmungs-Dialog, übersprungene Wartezeit nach Anti-Binge, falscher Sperrgrund,
      wegklickbarer gesperrter Feed, Absturz auf Android 7, zu hoch gezähltes Tageslimit, Service Worker in der App.
  - [ ] **[Du]** Auf dem Handy mitprüfen (`docs/DEVICE_TEST_CHECKLIST.md`): Export speichert eine Datei, Zurück-Taste
        geht einen Bildschirm zurück, „App zurücksetzen“ stoppt den Schutz, Akku-Knopf öffnet die Akku-Liste,
        Zustimmungs-Dialog erscheint vor der Bedienungshilfe.
- [ ] **iPhone:** Es gibt keine iOS-App. Dafür wären eigener Swift-Code mit Apples Bildschirmzeit-Schnittstelle, Apples
      Sondergenehmigung dafür, ein Mac mit Xcode und ein Apple-Entwicklerkonto (99 US-Dollar pro Jahr) nötig.

## 6. Nach der Veröffentlichung

- [ ] Support-Mails beantworten; Google verlangt eine funktionierende Kontaktadresse.
- [ ] Einmal im Jahr die Ziel-Android-Version anheben (Google verlangt eine aktuelle), sonst verschwindet die App für
      neue Nutzer.
- [ ] E-Mails von Google Play zu Richtlinien lesen – Fristen dort sind ernst gemeint.
- [ ] Bei jedem neuen Feature: Datenschutzerklärung und Datensicherheit-Formular prüfen.
