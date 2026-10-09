> **HISTORISCHE PWA-FIRST-CHECKLISTE – NICHT DIE ANDROID-V1-RELEASE-FREIGABE.**  
> Dieses Dokument beschreibt einen früheren Web/PWA-Plan und enthält inzwischen überholte Aussagen zu Reels, Android und Premium.  
> **Gültig:** [V1-Masterplan](V1_MASTER_PLAN.md), [operativer V1-Ausführungsplan](V1_EXECUTION_PLAN.md) und dessen Release-Arbeitspakete SS-501–507.  
> Offene alte Checkboxen nicht als neue V1-Anforderungen interpretieren. Dieses Dokument bleibt vorerst nur zur Historie.
>
# ScrollShield - Web/PWA-First Release Checkliste

Diese Checkliste trennt den ersten oeffentlichen Webapp/PWA-Launch von der spaeteren nativen App-Store-Version. Version 1.0 soll zuerst als installierbare Webapp erscheinen; Android und iOS bleiben vorbereitet, aber sind nicht mehr Launch-Blocker fuer Phase 1.

---

## 1. Web/PWA Launch-Freigabe

- [x] **Versionsnummern:** `npm run check:version` synchronisiert `package.json`, Lockfile und `__APP_VERSION__`; vorhandene native Projekte werden mitgeprueft, blockieren den Weblaunch aber nicht.
- [x] **Keine Platzhalter in Kern-UI:** Ausser den separat gefuehrten Impressumsangaben enthaelt die Release-UI keine unfertigen Texte oder Testdaten; der Release-Check scannt alle sichtbaren Screens.
- [ ] **Impressum & Kontakt:** Die Platzhalter im Impressum wurden durch echte Anbieterangaben ersetzt.
- [ ] **E-Mail-Routing:** Die finale Support-E-Mail ist eingerichtet und empfaengt Nachrichten.
- [ ] **Finale Domain:** Die Webapp ist auf der finalen Domain erreichbar.
- [ ] **Datenschutzerklaerung:** `public/privacy.html` ist auf der finalen Domain veroeffentlicht und in der App verlinkt.
- [x] **Kein veralteter ODR-Link:** Der fruehere Link zur EU-Plattform fuer Online-Streitbeilegung ist nicht mehr in der Release-UI enthalten.
- [x] **Offline-Faehigkeit:** Der Produktions-Build wurde nach vollstaendigem Stoppen des lokalen Servers erfolgreich neu geladen; Startscreen und Assets erschienen ohne Browserfehler aus dem Service-Worker-Cache.
- [x] **Web-Build:** `npm run build` erzeugt ein statisches `dist/` fuer Webhosting.

## 2. Hosting und Betrieb der Webapp

- [ ] **Hosting-Anbieter gewaehlt:** Vercel, Netlify, Cloudflare Pages, GitHub Pages oder ein anderer statischer Host ist entschieden.
- [ ] **Domain verbunden:** DNS zeigt auf den Hosting-Anbieter und HTTPS ist aktiv.
- [ ] **Deployment-Check:** Die veroeffentlichte URL laedt Startscreen, Manifest, Icons, Service Worker und `privacy.html`.
- [ ] **Support-Prozess:** Support-, Datenschutz- und Loeschanfragen landen in einem aktiv ueberwachten Postfach.

## 3. Datenschutz- und Rechtstext-Pruefung

- [x] **DSGVO/GDPR-Prozesse:** Die Buttons fuer Datenschutzanfrage und Datenloeschanfrage im Support-Screen oeffnen korrekt den E-Mail-Client mit passendem Betreff und Vorlage.
- [x] **Youth Safety:** Bei unbekanntem Alter und fuer Nutzer unter 16 Jahren erzwingt die Zustandsnormalisierung `strictPrivacyMode: true`; Version 1.0 erzwingt ausserdem immer `localOnly: true`.
- [x] **Kein Tracking:** `npm run check:privacy` prueft Laufzeit-Abhaengigkeiten, Netzwerk-APIs im Quellcode und bekannte Tracker-Marker im Produktionsbundle.
- [x] **Lokale Datenhaltung:** Version 1.0 enthaelt keinen Account, keinen Cloud-Sync, keine Werbung und kein Tracking.

## 4. Barrierefreiheits-Pruefung

- [x] **Kontraste:** Sekundaertexte verwenden mindestens Zinc 400; auf den Zinc-900/950-Flaechen liegt der gemessene Kontrast ueber WCAG AA.
- [x] **Touch Targets:** Eine globale CSS-Regel erzwingt mindestens 44x44 Pixel fuer Bedienelemente; `npm run check:a11y` schuetzt die Regel vor Regressionen.
- [x] **Screenreader:** Icon-Buttons, Navigation, Zeitwaehler und alle Schalter haben kontextbezogene Namen; zentrale Screens werden mit `axe-core` geprueft.
- [x] **Textskalierung:** Ueberschriften und Lauftexte duerfen umbrechen, feste Einzeiler sind aus der Release-UI entfernt und der Quellcode-Guard schuetzt diese Regeln.

## 5. Berechtigungs- und Erwartungsmanagement

- [x] **Transparenz:** Der `PermissionsScreen` erklaert Zweck und Einschraenkungen in Alltagssprache; technische Begriffe stehen nur in zusaetzlichen Erklaerungen.
- [x] **Web/PWA-Grenze:** Die App kommuniziert, dass die Webversion andere installierte Apps nicht systemweit blockieren kann.
- [x] **Graceful Degradation:** Abgelehnte oder uebersprungene Berechtigungen bleiben deaktiviert; die App zeigt den eingeschraenkten Schutzstatus und bleibt bedienbar.
- [x] **Kein Zwang:** Ein Komponententest stellt sicher, dass Nutzer das Onboarding auch ohne erteilte Berechtigungen abschliessen koennen.

## 6. Web-Marketing- und Asset-Pruefung

- [x] **Keine falschen Versprechen:** Die Beschreibung positioniert ScrollShield als Werkzeug zur Selbstkontrolle und wird vom Release-Check auf riskante Garantien geprueft.
- [x] **Best-Effort-Kommunikation:** Der Kurzvideo-Schutz ist ausdruecklich als Best-Effort-Unterbrecher beschrieben, der keine vollstaendige Feed-Erkennung oder Sperre garantiert.
- [x] **Screenshots:** Sechs echte Produktions-PWA-Screenshots liegen unter `docs/store-assets`; sie zeigen nur vorhandene Funktionen und wurden visuell auf Ueberlagerungen geprueft.
- [x] **Keywords:** ADHS, Fokus, Bildschirmzeit, Digital Wellbeing und Prokrastination sind enthalten und werden vom Release-Check abgesichert.

## 7. Stabilitaets- und Crash-Pruefung

- [x] **Storage Fallback:** Tests mit korrupten Einstellungs- und Statistikdaten bestaetigen, dass gueltige Daten weiter geladen und beschaedigte Chunks verworfen werden.
- [x] **Error Boundary:** Ein Komponententest loest absichtlich einen React-Fehler aus und bestaetigt den Wiederherstellungsbildschirm.
- [x] **Hintergrund-Stabilitaet:** Fokus- und App-Sitzungen werden lokal gespeichert; Fokus-Restzeiten werden nach Hintergrundpause oder Neustart aus absoluten Zeitstempeln rekonstruiert und durch einen App-Neustarttest abgesichert.

## 8. Datenloesch-/Reset-Pruefung

- [x] **Datenexport:** Der Privacy-Screen kann lokale Regeln, Verlauf und Statistiken als JSON-Datei exportieren.
- [x] **Datenimport:** Unterstuetzte ScrollShield-JSON-Exporte werden validiert und importiert; echte Systemberechtigungen werden dabei nicht ueberschrieben.
- [x] **Lokaler Reset:** Der Button "App auf Werkseinstellungen zuruecksetzen" loescht den `localStorage` (`scrollshield_*` Keys) restlos, setzt den Zustand auf `DEFAULT_STATE` zurueck und fuehrt zurueck zum Onboarding.
- [x] **Cloud-Loeschung nicht anwendbar:** Version 1.0 enthaelt weder Account noch Firebase/Auth-/Cloud-SDK; lokale Daten werden ueber den geprueften App-Reset geloescht.

## 9. Spaetere native Android/iOS-App

Diese Punkte sind fuer Phase 2/3 relevant, aber keine Blocker fuer den ersten Web/PWA-Launch.

- [ ] **Android SDK/JDK:** Lokale Android-Toolchain installieren, wenn native Builds gebaut werden sollen.
- [ ] **Android Paketname:** `app.scrollshield.mobile` vor dem ersten Play-Console-Upload final bestaetigen.
- [ ] **Google Play:** Berechtigungsdeklarationen, USK/PEGI-Fragebogen, Data Safety Section und Review-Video vorbereiten.
- [ ] **iOS:** Apple Developer Account, Family Controls/Screen Time Entitlement, Privacy Nutrition Labels und Review-Video vorbereiten.
- [ ] **Native Enforcement:** Echte Android/iOS-Unterbrechung erst mit nativer Implementierung, Store-Deklaration und Tests aktivieren.

## 10. Spaetere Premium-Faehigkeit ohne aktive Paywall

- [x] **Versteckte Premium-Features:** Zentrale `FEATURE_FLAGS` halten Cloud-Sync, Partner-/Familienmodus, Abos, KI und erweiterte Statistiken in Version 1.0 auf `false`; ein Test prueft dies.
- [x] **Keine toten Buttons:** Der Produktions-Versionshinweis ist nicht interaktiv; die Dashboard-Schnellaktion oeffnet den Schutzablauf; es gibt keine sichtbaren Upgrade-/Paywall-Buttons.
- [x] **Architektur-Ready:** `SubscriptionScreen` und `SubscriptionPlan` sind getestet vorbereitet, aber nicht in die Release-Navigation importiert oder gebuendelt.
