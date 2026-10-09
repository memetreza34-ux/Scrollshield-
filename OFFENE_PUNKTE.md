# ScrollShield V1 — offene Punkte vor Veröffentlichung

**Stand: 8. Oktober 2026.** Maßgeblich für den Produktumfang ist
[docs/V1_MASTER_PLAN.md](docs/V1_MASTER_PLAN.md).
Diese Liste ist ein **Release-Gate**, keine Aufzählung aller Ideen. Hake nichts als
fertig ab, das nur im Quellcode existiert und noch nicht am echten Gerät überprüft wurde.

## Stand der Entwicklung

- [x] Android-first V1-Architektur, drei Tabs: Heute / Schutz / Einblicke
- [x] Free-Grenze: zwei Apps; Pro-Feature-Gates in der Benutzeroberfläche
- [x] Short-Video-/Accessibility-Forschung aus dem Produktionsumfang entfernt
- [x] Versionierter Native-Protection-Contract
- [x] Native Reopen-Eskalation, Session Guard, Zeitfenster und Notfallfreigabe implementiert
- [x] Android-Quellcode in GitHub Actions kompiliert und mit Unit-Tests geprüft
- [x] Web-/TypeScript-/UI-Tests und automatisierte Repository-Checks im Integrations-PR erfolgreich
- [ ] **Echtes Android-Gerät:** Schutz zuverlässig nachweisen; CI allein reicht nicht
- [ ] **Subscription Billing:** Play-Kauf, Belegprüfung, Wiederherstellung und Ablauf testen
- [ ] **Produktname und Paket-ID:** vor dem ersten Store-Upload verbindlich entscheiden
- [ ] **Rechtstexte, Support-Kontakt und Store-Deklarationen** abschließen

## 1. Entscheidungen und Konten — vom Herausgeber erforderlich

- [ ] **Neuer Produktname oder belegbare Freigabe des bestehenden Namens.** Auf
      Google Play existieren bereits Apps mit dem Namen „ScrollShield“ im
      Screen-Time-/Reels-Segment. Vor einer Umbenennung: Play Store, DPMA,
      EUIPO und gegebenenfalls Domain prüfen. Keine Markenfreiheit behaupten,
      nur weil eine gewünschte Domain frei ist.
- [ ] **Android Application ID vor dem allerersten Store-Upload bestätigen.**
      Aktuell: `app.scrollshield.mobile`. Nach Erstveröffentlichung nicht
      leichtfertig änderbar.
- [ ] **Google-Play-Entwicklerkonto** einrichten/verifizieren und App anlegen;
      Produkt-ID(s), Basispläne/Angebote und Testkonten für Abonnements konfigurieren.
- [ ] **Support-E-Mail und Impressums-/Anbieterangaben** bereitstellen. Die
      öffentliche Adresse muss tatsächlich kontrolliert werden.
- [ ] **Alte Cloud-/Firebase-Zugangsdaten prüfen und bei Bedarf widerrufen.**
      Frühere Git-Historie kann auch nach Entfernung einer Datei sichtbar bleiben.
- [ ] **Upload-Schlüssel sicher erstellen und außerhalb des Repos sichern.**
      Niemals `.jks`, Zugangsdaten oder Cloud-Schlüssel committen.

## 2. Native Android — technische Veröffentlichungssperren

- [ ] Pixel/AOSP, Samsung One UI und Xiaomi/HyperOS auf echten Geräten testen.
- [ ] Berechtigungen erteilen, entziehen, nachträglich erneut erteilen;
      Schutzstatus darf nicht als „aktiv“ dargestellt werden, wenn die
      benötigte Berechtigung oder der Monitor fehlt.
- [ ] Öffnen/Verlassen/Wiederöffnen, schnelle App-Wechsel, 2 geschützte Apps
      mit unterschiedlichen Regeln und Verhalten nach Bildschirm-Sperre testen.
- [ ] Adaptive Reopen: Eskalation, Abkühlzeit und falsche Auslöser prüfen.
- [ ] Session Guard: Sessionstart nach „Weiter“, exakte Minuten,
      Bildschirm aus/an, Uhrzeitänderung und App-Wechsel prüfen.
- [ ] Zeitpläne: Nachtfenster 21:00–07:00, Wochenenden, lokale Uhrzeit,
      Sommer-/Winterzeit testen.
- [ ] Emergency Unlock: Tagesgrenze, Sperrfrist, Focus/Commitment und
      Wiederanlauf nach Prozess-Kill prüfen.
- [ ] Neustart, App-Update, Hintergrund-Kill und mindestens ein
      längerer Strom-/Batterie-Test (inklusive OEM-Energiesparen).
- [ ] Android CI inkl. Debug-Build **und** reales Gerät beide erfolgreich
      dokumentieren: `docs/DEVICE_TEST_CHECKLIST.md`.

## 3. Monetarisierung — derzeit nicht produktionsfertig

- [ ] Kauf und Restore per Google Play Billing integrieren und prüfen;
      **Play-Produkte/Preise/Probephase nur aus Google Play beziehen.**
- [ ] Pro erst nach bestätigtem Kauf freischalten. Ausstehende,
      abgebrochene, erstattete und abgelaufene Abonnements dürfen kein
      dauerhaftes Pro gewähren.
- [ ] Kaufbelege vertrauenswürdig prüfen (bevorzugt serverseitig bzw.
      über einen verlässlichen Entitlement-Dienst); niemals lokale
      `pro.active`-Flags als Zahlungsnachweis behandeln.
- [ ] Testkäufe mit Lizenztestern, Wiederherstellung, Abbruch,
      Erstattung, Gerätewechsel und Abo-Verwaltung durchführen.
- [ ] Erst wenn diese Tests bestanden sind, den deaktivierten
      Kaufbutton in der Pro-Ansicht freigeben.
- [ ] Preisrichtung der Produktplanung: 3,99 €/Monat, 24,99 €/Jahr,
      7 Tage Testphase; endgültig sind die tatsächlich konfigurierten
      und lokalisierten Store-Angebote.

## 4. Google Play, Recht und Kommunikation

- [ ] Google-Play-Regeln für `PACKAGE_USAGE_STATS`,
      `SYSTEM_ALERT_WINDOW` und `FOREGROUND_SERVICE_SPECIAL_USE`
      anhand der **zum Einreichungstag gültigen** Dokumentation prüfen.
- [ ] Benötigte Erklärungen, Demonstrationsvideo, Data-Safety-Fragen,
      Zielgruppe, Alterskennzeichnung und Content Rating vollständig ausfüllen.
- [ ] Datenschutzrichtlinie und Impressum mit tatsächlichem Anbieter,
      Kontakt und öffentlicher URL versehen; juristisch prüfen lassen.
- [ ] Store-Texte/Screenshots/Icons nach der Namensentscheidung neu
      abgleichen. Kein spezifisches Reels-/Shorts-Blocking in V1 behaupten.
- [ ] Play-Console-Testkanal gemäß aktuell geltenden Kontoanforderungen
      durchführen, Testerfeedback und Crash-Berichte bearbeiten.
- [ ] Erst nach erfolgreichem Release-Checklist-/Store-Review veröffentlichen.

## Was ausdrücklich nicht zum V1-Release gehört

Reels-/Shorts-spezifische Feed-Erkennung, AccessibilityService,
Cloud-Synchronisation, iOS, AI-Coach, Gamification und Familienkontrolle
bleiben Post-V1-Forschung. Diese Themen blockieren die Android-V1
**nicht**, solange keine entsprechenden Versprechen oder Berechtigungen
im Release auftauchen.

## Nächster technischer Schwerpunkt

1. Alle Änderungen aus geprüften PRs im Hauptbranch konsolidieren.
2. Native Zuverlässigkeit per Testmatrix belegen.
3. Play Billing mit verifizierter Entitlement-Quelle anbinden.
4. Letzte Datenschutz-, UI- und Store-Prüfung ausführen.
5. Geschlossenen Betatest mit echten Nutzern starten.
