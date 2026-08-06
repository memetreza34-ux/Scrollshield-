# ScrollShield - Pre-Launch Release Checkliste

Diese Checkliste dient der systematischen Prüfung aller kritischen App-Bereiche vor einem Produktions-Release (Launch) in den App Stores. Sie stellt sicher, dass ScrollShield professionell, stabil und richtlinienkonform veröffentlicht wird.

---

## 1. Allgemeine Release-Freigabe

- [x] **Versionsnummern:** `npm run check:version` synchronisiert `package.json`, Lockfile und `__APP_VERSION__`; sobald native Projekte existieren, prüft es zusätzlich Android `versionName` und iOS `MARKETING_VERSION`.
- [x] **Keine Platzhalter:** Außer den separat geführten Impressumsangaben enthält die Release-UI keine unfertigen Texte oder Testdaten; der Release-Check scannt alle sichtbaren Screens.
- [ ] **Impressum & Kontakt:** Die Platzhalter im `ImprintScreen` (Musterstraße, Max Mustermann) wurden durch die echten Unternehmensdaten ersetzt.
- [ ] **E-Mail-Routing:** Die Support-E-Mail (`support@scrollshield.app`) ist eingerichtet und empfängt Nachrichten.
- [x] **Kein veralteter ODR-Link:** Der frühere Link zur EU-Plattform für Online-Streitbeilegung ist nicht mehr in der Release-UI enthalten.
- [x] **Offline-Fähigkeit:** Der Produktions-Build wurde nach vollständigem Stoppen des lokalen Servers erfolgreich neu geladen; Startscreen und Assets erschienen ohne Browserfehler aus dem Service-Worker-Cache.

## 2. Apple App Store Submission (iOS)

- [ ] **Screen Time API Entitlement:** Das "Family Controls" (Screen Time) Entitlement wurde bei Apple offiziell beantragt und für das Developer-Konto freigeschaltet.
- [x] **Wording-Check iOS:** Die vorbereiteten Apple-Review-Texte sind von Google-Play-Hinweisen getrennt; der Release-Check verbietet dort Android- und Overlay-Begriffe.
- [ ] **Altersfreigabe:** Das Rating ist auf 4+ gesetzt (keine anstößigen Inhalte).
- [ ] **Privacy Nutrition Labels:** Im App Store Connect ist korrekt hinterlegt, dass keine Daten mit der Identität des Nutzers verknüpft werden ("Data Not Linked to You").
- [ ] **Review-Notizen:** Dem Apple-Review-Team wurde ein Test-Account (falls Login aktiv) und ein Video zur Verfügung gestellt, das zeigt, wie die Screen Time API in der App genutzt wird.

## 3. Google Play Submission (Android)

- [x] **Android-Projekt:** Ein Capacitor-Android-Wrapper existiert unter `android/`; Version, Backup- und Cleartext-Flags werden automatisch geprüft.
- [x] **Release-Härtung:** Android-Release-Builds nutzen R8-Minifizierung und Resource-Shrinking; der Release-Check schützt diese Flags.
- [x] **Signing-Schutz:** Android-Keystores und lokale `signing.properties` sind ignoriert; `android/signing.properties.example` dokumentiert den lokalen Signing-Pfad.
- [x] **Berechtigungs-Minimum:** Das aktuelle Android-Manifest fordert nur Internet an; sensible Enforcement-Berechtigungen sind bis zur nativen Implementierung blockiert.
- [ ] **Berechtigungs-Deklaration:** `PACKAGE_USAGE_STATS` (Nutzungsdaten) und `SYSTEM_ALERT_WINDOW` (Overlay) sind im Play Console Formular für sensible Berechtigungen deklariert und mit einem Video-Beweis des Use-Cases (Digital Wellbeing) begründet.
- [x] **Keine Accessibility API:** Die Release-UI enthält keinen Accessibility-API-Pfad; der Release-Check lehnt `BIND_ACCESSIBILITY_SERVICE` in einem künftigen Android-Manifest ab.
- [ ] **Altersfreigabe:** USK 0 / PEGI 3 Fragebogen in der Play Console korrekt ausgefüllt.
- [ ] **Data Safety Section:** Im Formular zur Datensicherheit ist angegeben, dass App-Aktivitäten lokal verarbeitet und nicht an Entwickler-Server gesendet werden.

## 4. Datenschutz- und Rechtstext-Prüfung

- [ ] **Datenschutzerklärung (Privacy Policy):** `public/privacy.html` ist auf der finalen Domain veröffentlicht und die URL ist in den App Stores sowie in der App verlinkt.
- [x] **DSGVO/GDPR-Prozesse:** Die Buttons für "Datenschutzanfrage" und "Datenlöschanfrage" im Support-Screen öffnen korrekt den E-Mail-Client mit dem passenden Betreff und einer Vorlage.
- [x] **Youth Safety:** Bei unbekanntem Alter und für Nutzer unter 16 Jahren erzwingt die Zustandsnormalisierung `strictPrivacyMode: true`; Version 1.0 erzwingt außerdem immer `localOnly: true`.
- [x] **Kein Tracking:** `npm run check:privacy` prüft Laufzeit-Abhängigkeiten, Netzwerk-APIs im Quellcode und bekannte Tracker-Marker im Produktionsbundle.

## 5. Barrierefreiheits-Prüfung (Accessibility)

- [x] **Kontraste:** Sekundärtexte verwenden mindestens Zinc 400; auf den Zinc-900/950-Flächen liegt der gemessene Kontrast bei mindestens 6,91:1 und damit über WCAG AA.
- [x] **Touch Targets:** Eine globale CSS-Regel erzwingt mindestens 44x44 Pixel für Bedienelemente; `npm run check:a11y` schützt die Regel vor Regressionen.
- [x] **Screenreader:** Icon-Buttons, Navigation, Zeitwähler und alle Schalter haben kontextbezogene Namen; zentrale Screens werden mit `axe-core` geprüft.
- [x] **Textskalierung:** Überschriften und Lauftexte dürfen umbrechen, feste Einzeiler sind aus der Release-UI entfernt und der Quellcode-Guard schützt diese Regeln.

## 6. Berechtigungs-Prüfung

- [x] **Transparenz:** Der `PermissionsScreen` erklärt Zweck und Einschränkungen in Alltagssprache; technische Begriffe stehen nur in den zusätzlichen Erklärungen.
- [x] **Graceful Degradation (Fallback):** Abgelehnte oder übersprungene Berechtigungen bleiben deaktiviert; die App zeigt den eingeschränkten Schutzstatus und bleibt bedienbar.
- [x] **Kein Zwang:** Ein Komponententest stellt sicher, dass Nutzer das Onboarding auch ohne erteilte Berechtigungen abschließen können.

## 7. Store-Text- und Screenshot-Prüfung

- [x] **Keine falschen Versprechen:** Die Store-Beschreibung positioniert ScrollShield als "Werkzeug zur Selbstkontrolle" und wird vom Release-Check auf riskante Garantien geprüft.
- [x] **Best-Effort-Kommunikation:** Der Kurzvideo-Schutz ist ausdrücklich als Best-Effort-Unterbrecher beschrieben, der keine vollständige Feed-Erkennung oder Sperre garantiert.
- [x] **Screenshots:** Sechs echte Produktions-PWA-Screenshots liegen unter `docs/store-assets`; sie zeigen nur vorhandene Funktionen und wurden visuell auf Überlagerungen geprüft.
- [x] **Keywords:** ADHS, Fokus, Bildschirmzeit, Digital Wellbeing und Prokrastination sind enthalten und werden vom Release-Check abgesichert.

## 8. Stabilitäts- und Crash-Prüfung

- [x] **Storage Fallback:** Tests mit korrupten Einstellungs- und Statistikdaten bestätigen, dass gültige Daten weiter geladen und beschädigte Chunks verworfen werden.
- [x] **Error Boundary:** Ein Komponententest löst absichtlich einen React-Fehler aus und bestätigt den Wiederherstellungsbildschirm.
- [x] **Hintergrund-Stabilität:** Fokus- und App-Sitzungen werden lokal gespeichert; Fokus-Restzeiten werden nach Hintergrundpause oder Neustart aus absoluten Zeitstempeln rekonstruiert und durch einen App-Neustarttest abgesichert.

## 9. Datenlösch-/Reset-Prüfung

- [x] **Datenexport:** Der Privacy-Screen kann lokale Regeln, Verlauf und Statistiken als JSON-Datei exportieren.
- [x] **Datenimport:** Unterstützte ScrollShield-JSON-Exporte werden validiert und importiert; echte Systemberechtigungen werden dabei nicht überschrieben.
- [x] **Lokaler Reset:** Der Button "App auf Werkseinstellungen zurücksetzen" löscht den `localStorage` (`scrollshield_*` Keys) restlos, setzt den Zustand auf `DEFAULT_STATE` zurück und führt zurück zum Onboarding.
- [x] **Cloud-Löschung (nicht anwendbar in v1.0):** Version 1.0 enthält weder Account noch Firebase/Auth-/Cloud-SDK; lokale Daten werden über den geprüften App-Reset gelöscht.

## 10. Spätere Premium-Fähigkeit (ohne aktive Paywall)

- [x] **Versteckte Premium-Features:** Zentrale `FEATURE_FLAGS` halten Cloud-Sync, Partner-/Familienmodus, Abos, KI und erweiterte Statistiken in Version 1.0 auf `false`; ein Test prüft dies.
- [x] **Keine toten Buttons:** Der Produktions-Versionshinweis ist nicht interaktiv; die Dashboard-Schnellaktion öffnet den Schutzablauf; es gibt keine sichtbaren Upgrade-/Paywall-Buttons.
- [x] **Architektur-Ready:** `SubscriptionScreen` und `SubscriptionPlan` sind getestet vorbereitet, aber nicht in die Release-Navigation importiert oder gebündelt.
