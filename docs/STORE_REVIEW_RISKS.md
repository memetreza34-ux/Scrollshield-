> **SCOPE-HINWEIS:** Frühere Reels-/Accessibility-Risiken sind historischer Kontext, kein Auftrag zur Einführung solcher Funktionen in Android V1. Die aktuelle Store-Prüfung folgt dem [Masterplan](V1_MASTER_PLAN.md) und [Compliance-Review](V1_COMPLIANCE_REVIEW.md).

# ScrollShield - Store Review Risiken & Gegenmaßnahmen

Diese Analyse identifiziert potenzielle Ablehnungsrisiken bei den App-Store-Reviews von Apple (App Store) und Google (Play Store) und definiert konkrete Gegenmaßnahmen, die in die Architektur und das UI-Design von ScrollShield eingeflossen sind.

## 1. Übergriffige Berechtigungen (Overreaching Permissions)

- **Risiko:** Google lehnt Apps ab, die `SYSTEM_ALERT_WINDOW` (Overlay) oder `PACKAGE_USAGE_STATS` ohne triftigen Grund anfordern. Apple ist extrem restriktiv bei der Freigabe der `Family Controls` (Screen Time API) Entitlement.
- **Gegenmaßnahme:**
  - **Transparenz im UI:** Der `PermissionsScreen` erklärt _genau_, warum jede Berechtigung benötigt wird und was passiert, wenn sie fehlt (Fallback-Szenarien).
  - **Kein Zwang:** Die App funktioniert auch ohne alle Berechtigungen (z.B. nur mit Benachrichtigungen als Fallback).
  - **Apple Entitlement:** Für iOS muss ein offizieller Antrag bei Apple gestellt werden, der den Fokus auf "Digital Wellbeing" und "Produktivität" (nicht Kindersicherung) legt.

## 2. Unklare Datenverarbeitung

- **Risiko:** Ablehnung wegen fehlender oder unklarer Privacy Policy, besonders wenn Nutzungsdaten (welche Apps geöffnet werden) verarbeitet werden.
- **Gegenmaßnahme:**
  - Lokale Speicherung als Standard (`localOnly: true`).
  - Keine Übertragung von App-Nutzungsdaten an unsere Server.
  - Klare Deklaration im Privacy Screen und in den Store-Metadaten ("Data Not Linked to You").

## 3. Irreführende Funktionsversprechen

- **Risiko:** Die App verspricht, Apps "komplett zu blockieren", was technisch (besonders auf iOS ohne Screen Time API) unmöglich ist. Apple lehnt Apps ab, die Systemfunktionen vortäuschen.
- **Gegenmaßnahme:**
  - Wording anpassen: Statt "Wir blockieren deine Apps" -> "Wir helfen dir, deine Bildschirmzeit zu kontrollieren" oder "Wir unterbrechen ablenkende Muster".
  - Klarstellung, dass es sich um ein Tool zur _Selbstkontrolle_ handelt.

## 4. Eingriffe in andere Apps

- **Risiko:** Google Play verbietet Apps, die die Funktionalität anderer Apps stören oder verändern (Interfering with Apps).
- **Gegenmaßnahme:**
  - Das Overlay darf die ablenkende App nicht "kaputt machen", sondern muss als klar erkennbarer ScrollShield-Screen darüberliegen, der dem Nutzer die Wahl lässt (Schließen oder Notfall-Freigabe).
  - Keine Nutzung von Accessibility-Diensten, um Klicks in anderen Apps zu simulieren oder zu verhindern.

## 5. Problematische Nutzung von Accessibility

- **Risiko:** Google Play erlaubt die Accessibility API nur noch für echte Barrierefreiheit. App-Blocker, die Accessibility nutzen, werden oft gesperrt.
- **Gegenmaßnahme:**
  - **Verzicht auf Accessibility API.** ScrollShield nutzt stattdessen `PACKAGE_USAGE_STATS` (um zu erkennen, welche App im Vordergrund ist) und `SYSTEM_ALERT_WINDOW` (um den Blocker anzuzeigen). Dies ist der von Google akzeptierte Weg für Digital Wellbeing Apps.

## 6. Unfertige Screens

- **Risiko:** Platzhalter-Texte ("Lorem Ipsum"), leere Screens oder "Coming Soon"-Buttons führen zur sofortigen Ablehnung (Guideline 2.2 - Buggy Apps).
- **Gegenmaßnahme:**
  - Alle Premium-Features, die noch nicht fertig sind, sind im Code versteckt (`enablePartnerControl: false`) und im UI nicht sichtbar.
  - Keine "Demnächst"-Buttons in der Release-Version.

## 7. Missverständliche Store-Beschreibung

- **Risiko:** Keyword-Spamming oder falsche Kategorisierung.
- **Gegenmaßnahme:**
  - Klare, ehrliche Beschreibung. Fokus auf "Produktivität", "Fokus", "ADHS-Hilfe", "Digital Wellbeing".

## 8. Unstimmige Datenschutzangaben

- **Risiko:** Die Angaben im App Store Connect (Privacy Nutrition Labels) stimmen nicht mit dem tatsächlichen App-Verhalten überein.
- **Gegenmaßnahme:**
  - Strikte Einhaltung der `SDK_POLICY.md`. Wenn Analytics optional ist, muss dies in den Store-Angaben exakt so deklariert werden.

## 9. Aggressive oder manipulative UX (Dark Patterns)

- **Risiko:** Versteckte Abos, schwer auffindbare Kündigungs-Buttons, "Guilt-Tripping" beim Ablehnen von Berechtigungen.
- **Gegenmaßnahme:**
  - Neutrale Sprache im Permissions-Screen.
  - Transparente Abo-Struktur (wie im `SubscriptionScreen` vorbereitet).

## 10. Unstabile erste Version

- **Risiko:** Abstürze beim Start oder auf bestimmten Geräten (Guideline 2.1 - Performance).
- **Gegenmaßnahme:**
  - Robuster `StorageService` mit Fallbacks.
  - `ErrorBoundary` fängt React-Crashes ab und zeigt ein sauberes Fallback-UI.
