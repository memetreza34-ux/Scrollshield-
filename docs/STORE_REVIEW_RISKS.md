# ScrollShield - Store Review Risiken & Gegenmaßnahmen

Diese Analyse identifiziert potenzielle Ablehnungsrisiken bei den App-Store-Reviews von Apple (App Store) und Google (Play Store) und definiert konkrete Gegenmaßnahmen, die in die Architektur und das UI-Design von ScrollShield eingeflossen sind.

## 1. Übergriffige Berechtigungen (Overreaching Permissions)

- **Risiko:** Google lehnt Apps ab, die `SYSTEM_ALERT_WINDOW` (Overlay) oder `PACKAGE_USAGE_STATS` ohne triftigen Grund anfordern. Apple ist extrem restriktiv bei der Freigabe des `Family Controls`-Entitlements.
- **Gegenmaßnahme:**
  - Der `PermissionsScreen` erklärt genau, warum jede Berechtigung benötigt wird und was passiert, wenn sie fehlt.
  - Ohne die erforderlichen Android-Zugriffe startet der automatische Schutzdienst nicht; die übrige App bleibt für Konfiguration, Verlauf und Fokus-Timer nutzbar.
  - Für iOS muss vor einer Einreichung ein offizieller Family-Controls-Antrag genehmigt und die native Screen-Time-Integration vollständig umgesetzt sein.

## 2. Unklare Datenverarbeitung

- **Risiko:** Ablehnung wegen fehlender oder unklarer Privacy Policy, besonders wenn Nutzungsdaten verarbeitet werden.
- **Gegenmaßnahme:**
  - Lokale Speicherung als Standard (`localOnly: true`).
  - Keine Übertragung von App-Nutzungsdaten an Entwickler-Server.
  - Klare Deklaration im Privacy Screen und in den Store-Metadaten.

## 3. Irreführende Funktionsversprechen

- **Risiko:** Die App verspricht universelle oder perfekte Blockierung, die auf unterschiedlichen Plattformen und Herstellergeräten nicht nachgewiesen wurde.
- **Gegenmaßnahme:**
  - Version 1 wird als Android-Whole-App-Schutz für ausgewählte installierte Apps beschrieben.
  - Reels-/Shorts-Erkennung wird nicht als verfügbare oder garantierte Version-1-Systemfunktion beworben.
  - ScrollShield wird als Werkzeug zur Selbstkontrolle und nicht als medizinisches Produkt beschrieben.

## 4. Eingriffe in andere Apps

- **Risiko:** Google Play verbietet Apps, die andere Apps unzulässig verändern, fernsteuern oder täuschend überlagern.
- **Gegenmaßnahme:**
  - Das Overlay ist ein klar gebrandeter ScrollShield-Schutzbildschirm mit Rückkehr- und begrenzter Notfalloption.
  - ScrollShield liest, verändert oder klickt keine Inhalte der darunterliegenden App.
  - Es wird kein Accessibility Service verwendet.

## 5. Unsichtbarer Foreground Service

- **Risiko:** Auf Android 13+ kann ein Foreground Service trotz verweigerter Benachrichtigungsfreigabe laufen, während seine Meldung nicht im normalen Benachrichtigungsbereich erscheint. Dadurch wäre die direkte Stop-Aktion weniger sichtbar.
- **Gegenmaßnahme:**
  - Benachrichtigungen sind für den Android-Schutzdienst eine Startvoraussetzung.
  - Der Dienst wird nach Neustart nur wiederhergestellt, wenn Benachrichtigungen weiterhin aktiviert sind.
  - Die Berechtigungsoberfläche markiert den Zugriff auf Android als erforderlich und erklärt die sichtbare Stop-Aktion.
  - Ein eigener Quell- und Komponententest schützt diesen Ablauf.

## 6. Breiter Zugriff auf installierte Apps

- **Risiko:** `QUERY_ALL_PACKAGES` oder eine unnötige App-Inventarisierung kann zur Ablehnung führen.
- **Gegenmaßnahme:**
  - Kein `QUERY_ALL_PACKAGES`.
  - Nur gezielte `<queries>` für ausdrücklich unterstützte Apps.
  - Installationsstatus wird ausschließlich lokal genutzt, um nicht funktionsfähige Schutzkonfigurationen zu verhindern.

## 7. Unfertige Screens

- **Risiko:** Platzhalter-Texte, leere Screens oder „Coming Soon“-Buttons führen zur Ablehnung.
- **Gegenmaßnahme:**
  - Unfertige Premium- oder Reels-only-Funktionen werden nicht als fertige Store-Funktion dargestellt.
  - Der Release-Checker sucht nach unfertigen UI-Begriffen und rechtlichen Platzhaltern.

## 8. Unstimmige Datenschutzangaben

- **Risiko:** Die Store-Angaben stimmen nicht mit dem tatsächlichen Binary oder seinen SDKs überein.
- **Gegenmaßnahme:**
  - Strikte SDK-Registry und Drittanbieterhinweise.
  - Data-Safety-Antworten werden vor Einreichung gegen das signierte AAB und den Dependency-Report geprüft.
  - Keine Analytics-, Werbe- oder Tracking-SDKs in Version 1.

## 9. Aggressive oder manipulative UX

- **Risiko:** Versteckte Abos, schwer auffindbare Kündigungsmöglichkeiten oder Druck bei Berechtigungsablehnung.
- **Gegenmaßnahme:**
  - Neutrale Sprache im Permissions-Screen.
  - Keine Berechtigung wird automatisch erteilt.
  - Der Schutz kann über App und Dauerbenachrichtigung gestoppt werden.
  - Kernfunktionen für Datenschutz, Export und Notfallzugang werden nicht künstlich versteckt.

## 10. Unstabile erste Version

- **Risiko:** Abstürze, Herstellerunterschiede, aggressive Akkuoptimierung oder fehlerhafte Zeitgrenzen.
- **Gegenmaßnahme:**
  - Robuster lokaler Speicher mit Migration und Fallbacks.
  - React Error Boundary.
  - Pure Java Tests für Zeit- und Regelschwellen.
  - Native Geräte- und Berechtigungsdiagnose mit kopierbarem JSON-Bericht.
  - Vorgesehene Tests auf Samsung, Pixel, Xiaomi, OnePlus, Motorola und Tablet.
  - Release bleibt gesperrt, bis JavaScript-Verifikation, Android-Kompilierung und reale Gerätetests nachweislich durchgeführt wurden.
