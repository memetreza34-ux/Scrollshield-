# ScrollShield - Pre-Launch Release Checkliste

Diese Checkliste dient der systematischen Prüfung aller kritischen App-Bereiche vor einem Produktions-Release (Launch) in den App Stores. Sie stellt sicher, dass ScrollShield professionell, stabil und richtlinienkonform veröffentlicht wird.

---

## 1. Allgemeine Release-Freigabe
- [ ] **Versionsnummern:** Version und Build-Nummer sind im Code (`src/screens/SupportScreen.tsx`), in der `package.json` und in den nativen Projekten (iOS/Android) synchronisiert.
- [ ] **Keine Platzhalter:** Alle "Lorem Ipsum"-Texte, Test-Daten und Platzhalter-Bilder sind aus der sichtbaren UI entfernt.
- [ ] **Impressum & Kontakt:** Die Platzhalter im `ImprintScreen` (Musterstraße, Max Mustermann) wurden durch die echten Unternehmensdaten ersetzt.
- [ ] **E-Mail-Routing:** Die Support-E-Mail (`support@scrollshield.app`) ist eingerichtet und empfängt Nachrichten.
- [ ] **Offline-Fähigkeit:** Die App startet und funktioniert fehlerfrei im Flugmodus (kein Hängenbleiben in Ladebildschirmen).

## 2. Apple App Store Submission (iOS)
- [ ] **Screen Time API Entitlement:** Das "Family Controls" (Screen Time) Entitlement wurde bei Apple offiziell beantragt und für das Developer-Konto freigeschaltet.
- [ ] **Wording-Check iOS:** In den iOS-Metadaten und Screenshots wird nicht von "Overlays" oder "Android-Blockern" gesprochen.
- [ ] **Altersfreigabe:** Das Rating ist auf 4+ gesetzt (keine anstößigen Inhalte).
- [ ] **Privacy Nutrition Labels:** Im App Store Connect ist korrekt hinterlegt, dass keine Daten mit der Identität des Nutzers verknüpft werden ("Data Not Linked to You").
- [ ] **Review-Notizen:** Dem Apple-Review-Team wurde ein Test-Account (falls Login aktiv) und ein Video zur Verfügung gestellt, das zeigt, wie die Screen Time API in der App genutzt wird.

## 3. Google Play Submission (Android)
- [ ] **Berechtigungs-Deklaration:** `PACKAGE_USAGE_STATS` (Nutzungsdaten) und `SYSTEM_ALERT_WINDOW` (Overlay) sind im Play Console Formular für sensible Berechtigungen deklariert und mit einem Video-Beweis des Use-Cases (Digital Wellbeing) begründet.
- [ ] **Keine Accessibility API:** Es ist sichergestellt, dass `BIND_ACCESSIBILITY_SERVICE` restlos aus dem Android-Manifest entfernt wurde, um eine sofortige Sperrung zu vermeiden.
- [ ] **Altersfreigabe:** USK 0 / PEGI 3 Fragebogen in der Play Console korrekt ausgefüllt.
- [ ] **Data Safety Section:** Im Formular zur Datensicherheit ist angegeben, dass App-Aktivitäten lokal verarbeitet und nicht an Entwickler-Server gesendet werden.

## 4. Datenschutz- und Rechtstext-Prüfung
- [ ] **Datenschutzerklärung (Privacy Policy):** Eine gültige Datenschutzerklärung ist auf einer externen Website gehostet und in den App Stores sowie in der App verlinkt.
- [ ] **DSGVO/GDPR-Prozesse:** Die Buttons für "Datenschutzanfrage" und "Datenlöschanfrage" im Support-Screen öffnen korrekt den E-Mail-Client mit dem passenden Betreff.
- [ ] **Youth Safety:** Die App erzwingt den "Strict Privacy Mode" für Nutzer unter 16 Jahren (falls das Alter abgefragt wird) oder wendet ihn standardmäßig an.
- [ ] **Kein Tracking:** Es sind keine versteckten Tracker (z.B. Facebook SDK) verbaut. Analytics (falls vorhanden) sind strikt Opt-in.

## 5. Barrierefreiheits-Prüfung (Accessibility)
- [ ] **Kontraste:** Alle Texte (besonders graue Texte auf dunklem Grund) erfüllen die WCAG AA Kontrastvorgaben.
- [ ] **Touch Targets:** Alle Buttons, Toggles und klickbaren Icons sind mindestens 44x44 Pixel groß (z.B. durch Padding), auch wenn das sichtbare Icon kleiner ist.
- [ ] **Screenreader:** Wichtige interaktive Elemente ohne Text (z.B. Icon-Buttons, Toggles) haben aussagekräftige `aria-label` Attribute.
- [ ] **Textskalierung:** Das UI bricht nicht komplett zusammen, wenn der Nutzer in den Systemeinstellungen eine sehr große Schriftart wählt.

## 6. Berechtigungs-Prüfung
- [ ] **Transparenz:** Der `PermissionsScreen` erklärt den Zweck jeder Berechtigung verständlich und ohne Fachjargon.
- [ ] **Graceful Degradation (Fallback):** Lehnt der Nutzer Berechtigungen ab, stürzt die App nicht ab, sondern bietet Fallbacks (z.B. nur Benachrichtigungen statt hartem Blocker).
- [ ] **Kein Zwang:** Nutzer können das Onboarding abschließen, auch wenn nicht alle Berechtigungen erteilt wurden.

## 7. Store-Text- und Screenshot-Prüfung
- [ ] **Keine falschen Versprechen:** Die Store-Beschreibung behauptet nicht, Apps "zu 100% unumgehbar zu blockieren". Es wird als "Werkzeug zur Selbstkontrolle" positioniert.
- [ ] **Best-Effort-Kommunikation:** Funktionen wie der "Reels/Shorts-Blocker" sind ehrlich als "Best-Effort" oder "Unterbrecher" beschrieben.
- [ ] **Screenshots:** Die Screenshots zeigen das echte UI (Dark Mode, Neon-Akzente) und keine simulierten, nicht existenten Features.
- [ ] **Keywords:** Relevante Suchbegriffe (ADHS, Fokus, Bildschirmzeit, Digital Wellbeing, Prokrastination) sind natürlich im Text verbaut.

## 8. Stabilitäts- und Crash-Prüfung
- [ ] **Storage Fallback:** Der `StorageService` wurde getestet, indem absichtlich korrupte Daten in den LocalStorage geschrieben wurden. Die App muss dies abfangen und auf Standardwerte zurückfallen, statt weiß zu bleiben.
- [ ] **Error Boundary:** Ein absichtlich herbeigeführter React-Fehler zeigt den sauberen Fallback-Screen der `ErrorBoundary` und nicht den "White Screen of Death".
- [ ] **Hintergrund-Stabilität:** Die App-Logik (Timer, Limits) funktioniert auch dann korrekt weiter, wenn die App aus dem Arbeitsspeicher geworfen und neu gestartet wird.

## 9. Datenlösch-/Reset-Prüfung
- [ ] **Lokaler Reset:** Der Button "App auf Werkseinstellungen zurücksetzen" löscht den `localStorage` (`scrollshield_*` Keys) restlos und setzt den Zustand auf `DEFAULT_STATE` zurück.
- [ ] **Cloud-Löschung (falls aktiv):** Wenn Firebase Auth genutzt wird, löscht die Account-Lösch-Funktion den Nutzer aus Firebase Authentication und entfernt das zugehörige Firestore-Dokument.

## 10. Spätere Premium-Fähigkeit (ohne aktive Paywall)
- [ ] **Versteckte Premium-Features:** Alle Premium-Features (z.B. Partner-Control, Cloud-Sync) sind im Code vorhanden, aber über Feature-Flags (`enablePartnerControl: false`) im UI unsichtbar geschaltet.
- [ ] **Keine toten Buttons:** Es gibt im aktuellen Release keine "Upgrade auf Pro"-Buttons, die ins Leere führen oder eine unfertige Paywall öffnen.
- [ ] **Architektur-Ready:** Die `SubscriptionScreen`-Komponente und die `SubscriptionPlan`-Typen sind im Code sauber vorbereitet, sodass sie in einem späteren Update per Flag aktiviert werden können, ohne die Basis-Logik umbauen zu müssen.
