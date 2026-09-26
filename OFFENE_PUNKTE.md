# Offene Punkte

Merkliste für alles, was noch fehlt. Stand: 25. September 2026. Erledigtes hier abhaken oder löschen.

## Sofort – nur du kannst das

- [ ] **Alten Google-Schlüssel abschalten.** In der Git-Historie (Datei `firebase-applet-config.json`, entfernt in
      `e15ff43`) steht ein Firebase-API-Schlüssel des Google-Projekts `gen-lang-client-0871665296`, das Google AI Studio
      angelegt hat. Das Repo ist privat, aber der Schlüssel bleibt in jeder Kopie lesbar. In der Google Cloud Console
      unter „APIs & Dienste → Anmeldedaten“ löschen. Wird das Projekt nicht mehr gebraucht, das ganze Projekt löschen
      (Firebase Console → Projekteinstellungen); damit ist auch die alte Firestore-Datenbank weg.
- [ ] **Zwei-Faktor-Anmeldung** bei GitHub, Google (später Play Console), Apple-ID und deinem E-Mail-Konto einschalten.
- [ ] **Android-Signierschlüssel** sicher aufbewahren und ein Backup anlegen, sobald er erstellt ist. Ohne ihn keine
      Updates.

## Technik – vor dem Release

- [ ] Android-Teil bauen und auf einem echten Handy testen: `docs/DEVICE_TEST_CHECKLIST.md`.
- [ ] Tageslimit, Anti-Binge und Zeitfenster werden nur beim Öffnen einer App geprüft, nicht während man in ihr bleibt.
- [ ] Auf dem Handy gibt es keine Notfallfreigabe; eine Sperre lässt sich dort nicht vorzeitig aufheben.
- [ ] Endet eine Fokus-Sitzung bei geschlossener App, bleibt die Sperre bis zum nächsten Öffnen.

## Rechtliches – später

Details und die Fragen für eine anwaltliche Prüfung: `docs/LEGAL_REVIEW_BRIEF.md`. `npm run check:release:strict`
zeigt jede Stelle, an der noch Angaben fehlen.

- [ ] Klären: kostenlos oder mit Einnahmen? Davon hängen Impressum-Pflichten und der Händlerstatus bei Google Play ab.
- [ ] Impressum in der App ausfüllen (`src/screens/SupportScreen.tsx`).
- [ ] Datenschutzerklärung fertigstellen: Anbieterangaben und Hoster (`public/privacy.html`, markiert mit „Vor Release
      ergänzen“), danach den Entwurfs-Hinweis oben entfernen.
- [ ] Domain `scrollshield.app` registrieren und E-Mail einrichten, oder eine eigene Support-Adresse eintragen. Die
      Domain hat derzeit keine DNS-Einträge; wer sie registriert, bekäme die Mails der Nutzer.
- [ ] Hosting-Anbieter für die Webversion wählen.
- [ ] Datenschutzerklärung und Impressum prüfen lassen (Generator oder Anwalt), vor allem Bedienungshilfe, Jugendliche
      und Store-Texte.

## Stores – später

- [ ] Google Play: Erklärungen für Bedienungshilfe, Nutzungsdatenzugriff, Überlagerung und Vordergrunddienst, dazu
      Demo-Videos (`docs/STORE_SUBMISSION_PACKET.md`).
- [ ] iPhone: Es gibt keine iOS-App. Dafür wären eigener Swift-Code mit Apples Bildschirmzeit-Schnittstelle, Apples
      Sondergenehmigung dafür und ein Entwicklerkonto nötig.
