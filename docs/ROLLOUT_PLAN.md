# ScrollShield - Web/PWA-First Rollout Plan

Dieser Plan definiert die Markteinfuehrung von ScrollShield mit einem ersten Webapp/PWA-Launch. Die native Android-/iOS-App bleibt vorbereitet, kommt aber erst nach dem oeffentlichen Webtest.

Die oberste Maxime bleibt: **Die erste oeffentliche Version muss klein, stabil und ehrlich kommuniziert sein.** Version 1.0 verspricht keine systemweite App-Sperre, sondern Selbstkontrolle, bewusste Pausen, lokale Regeln, Fokus-Sessions und transparente Grenzen.

---

## Phase 1: Interne Web-Alpha

**Ziel:** Grundlegende technische Stabilitaet und Happy-Path-Pruefung im Browser.
**Tester:** Kernteam und enge Freunde, ca. 5-10 Personen.

- Onboarding abschliessen und App als PWA installieren.
- Regeln, Oeffnungsverzoegerung, Notfallfreigabe und Fokusmodus testen.
- Empty States am ersten Tag pruefen.
- Reset, Datenexport und Datenimport pruefen.
- Offline-Neuladen nach gestopptem Dev-/Hosting-Server testen.

## Phase 2: Geschlossene Web-Beta

**Ziel:** Echte Nutzung auf verschiedenen Geraeten, Browsern und Bildschirmgroessen pruefen.
**Tester:** 20-50 ausgewaehlte Nutzer mit Chrome, Edge, Safari und mobilen Browsern.

- PWA-Installation auf Android, iOS und Desktop testen.
- Verhalten ohne native Berechtigungen pruefen: keine Sackgassen, klare Hinweise, App bleibt nutzbar.
- Datenschutz- und Support-Flows testen.
- Fokus auf UI-Glitches, lokale Datenhaltung, Service-Worker-Cache und Verstaendlichkeit.
- Feedback ueber den Support-Screen sammeln.

## Phase 3: Oeffentlicher Web-Soft-Launch

**Ziel:** Mit wenigen echten Nutzern pruefen, ob ScrollShield als Webapp Mehrwert liefert.
**Tester:** 100-500 echte Nutzer aus einer klaren Zielgruppe, z. B. Produktivitaet, Fokus, ADHS oder Digital Wellbeing.

- Nutzung nach 3-7 Tagen auswerten: Sind Statistiken, Verlauf und Fokusmodus hilfreich?
- Pruefen, ob die Nutzer die Web/PWA-Grenzen verstehen.
- Support-Anfragen aktiv beobachten.
- Texte verbessern, wenn Nutzer systemweites Blocking erwarten.
- Erst kleine organische Kanaele nutzen; noch keine grosse bezahlte Kampagne.

## Phase 4: Web Release Candidate und oeffentlicher Launch

**Ziel:** Finaler Feinschliff und stabile Veroeffentlichung auf der finalen Domain.

### Go/No-Go-Kriterien

1. **Stabilitaet:** Keine bekannten Crash- oder Datenverlustfehler.
2. **Rechtliches:** Impressum, Datenschutzerklaerung, Support-Adresse und Domain sind final.
3. **Kommunikation:** Die Webapp verspricht keine native/systemweite Sperre.
4. **Datenschutz:** Keine Accounts, kein Cloud-Sync, keine Werbung, kein Tracking.
5. **Support-Readiness:** Das finale Support-Postfach wird aktiv ueberwacht.
6. **Technik:** `npm run verify` ist gruen und der Produktions-Build laeuft auf der Hosting-URL.

**Launch-Strategie:**
Nach dem Web-RC wird ScrollShield oeffentlich als Webapp/PWA geschaltet. Marketing wird schrittweise erhoeht, sobald Support, Feedback und Stabilitaet im echten Betrieb passen.

## Phase 5: Native Android-App

Diese Phase startet erst nach dem Web-Launch.

- Android SDK/JDK lokal einrichten.
- Paketname final bestaetigen.
- Native Berechtigungen und echte Unterbrechung implementieren.
- Play Console Formulare, Data Safety, Altersfreigabe und Review-Video vorbereiten.
- Interne Play-Tests starten, bevor die App oeffentlich wird.

## Phase 6: Native iOS-App

Diese Phase startet nach oder parallel zur Android-Native-Phase.

- Apple Developer Account und Entitlements klaeren.
- Screen Time / Family Controls beantragen.
- Native iOS-Unterbrechung implementieren.
- App Store Connect Privacy Labels, Review Notes und Review-Video vorbereiten.
- TestFlight-Beta starten.

---

Premium-Features wie Cloud-Sync, Partner-/Familienmodus, KI oder Paywall bleiben bis nach dem Weblaunch deaktiviert.
