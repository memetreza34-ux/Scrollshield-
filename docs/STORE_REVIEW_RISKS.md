# ScrollShield - Store Review Risiken & Gegenmaßnahmen

Diese Analyse identifiziert potenzielle Ablehnungsrisiken bei Apple App Store und Google Play. Sie ersetzt keine
rechtliche Beratung und muss vor jeder Einreichung mit dem tatsächlichen signierten Binary und den dann geltenden
Store-Regeln abgeglichen werden.

## 1. Besondere Android-Zugriffe

- **Risiko:** `PACKAGE_USAGE_STATS` und `SYSTEM_ALERT_WINDOW` ermöglichen einen weitreichenden Eingriff in die
  Gerätenutzung. Unklare oder übertriebene Verwendung kann zur Ablehnung führen.
- **Gegenmaßnahmen:**
  - Der Berechtigungsbildschirm erklärt Zweck, Umfang, lokale Verarbeitung und Funktion ohne Zugriff.
  - Die Berechtigungen werden nicht durch einen simulierten In-App-Schalter als erteilt dargestellt.
  - Der Nutzer gelangt in die echten Android-Systemeinstellungen und der Status wird anschließend erneut geprüft.
  - Wird ein Zugriff später entzogen, beendet ScrollShield den Schutzdienst sicher.
  - Jede Reviewer-Erklärung und jedes Video muss exakt den eingereichten Build zeigen.

## 2. Foreground Service `specialUse`

- **Risiko:** Google Play prüft `specialUse` einzeln. Eine unklare Begründung, ein unsichtbarer Dienst oder fehlende
  Nutzerkontrolle können zur Ablehnung führen.
- **Gegenmaßnahmen:**
  - Der Dienst startet erst nach einer ausdrücklichen Nutzeraktion.
  - Eine dauerhafte Benachrichtigung zeigt den aktiven Schutz an.
  - Die Benachrichtigung und die App enthalten eine direkte Stop-Aktion.
  - Manifest und Play Console erklären denselben konkreten Anwendungsfall.
  - Das Submission-Paket beschreibt Auswirkung einer Verzögerung und Unterbrechung und enthält eine Video-Shotlist.

## 3. Paketsichtbarkeit

- **Risiko:** Das Inventar installierter Apps gilt als sensible Information. Eine umfassende Abfrage über
  `QUERY_ALL_PACKAGES` wäre für den aktuellen Funktionsumfang unnötig und schwerer zu rechtfertigen.
- **Gegenmaßnahmen:**
  - ScrollShield fordert kein `QUERY_ALL_PACKAGES` an.
  - Das Manifest nutzt eine endliche Liste gezielter `<queries>` für unterstützte Apps.
  - Der Status wird nur verwendet, um funktionsfähige Schutzschalter anzuzeigen.
  - App-Inventardaten werden weder übertragen noch für Werbung oder Analyse monetarisiert.

## 4. Unklare Datenverarbeitung

- **Risiko:** Nutzungszeitpunkte und App-IDs sind sensible Verhaltensdaten, auch wenn sie nur lokal verarbeitet werden.
- **Gegenmaßnahmen:**
  - Lokale Speicherung als Standard.
  - Kein Account, Tracking, Werbe-SDK oder Entwickler-Backend in Version 1.0.
  - Datenexport, lokaler Reset und Löschung durch Deinstallation.
  - Store-Angaben erst nach Prüfung des finalen AAB und aller eingebundenen Abhängigkeiten bestätigen.

## 5. Irreführende Funktionsversprechen

- **Risiko:** Die App verspricht universelle oder selektive Reels-/Shorts-Blockierung, obwohl Version 1.0 auf Android
  zuverlässig nur ganze erkannte Apps unterbricht und iOS eine eigene native Integration benötigt.
- **Gegenmaßnahmen:**
  - Version 1 wird als Whole-App-Schutz beschrieben.
  - Reels-only wird nicht als garantierte Version-1-Funktion beworben.
  - Keine Aussagen über Dopamin, Gehirntraining, medizinische Wirkung oder garantierte Verhaltensänderung.

## 6. Eingriffe in andere Apps

- **Risiko:** Ein Overlay könnte als täuschend, manipulierend oder als unzulässige Veränderung einer fremden App bewertet
  werden.
- **Gegenmaßnahmen:**
  - Der Schutzbildschirm ist klar als ScrollShield gekennzeichnet.
  - Er liest, verändert oder klickt keine Inhalte der darunterliegenden App.
  - Er bietet eine Rückkehr zum Startbildschirm und eine begrenzte bewusste beziehungsweise Notfallfreigabe.
  - Der Nutzer kann den gesamten Dienst jederzeit stoppen.

## 7. Accessibility Service

- **Risiko:** Ein zukünftiger Reels-only-Modus könnte einen Accessibility Service benötigen. Nicht-barrierefreie
  Verwendungen unterliegen zusätzlichen Offenlegungs-, Einwilligungs- und Play-Console-Anforderungen und sind besonders
  prüfungsanfällig.
- **Gegenmaßnahmen:**
  - Version 1 verwendet keinen Accessibility Service.
  - Eine spätere Beta benötigt eine getrennte deutliche Offenlegung und Zustimmung.
  - Keine Erfassung von Nachrichten, Passwörtern, Tastatureingaben, Medien oder nicht benötigten Bildschirminhalten.
  - Deterministische Nutzerregeln, Reviewer-Video und technische Abschaltmöglichkeit bei inkompatiblen App-Versionen.

## 8. Unfertige oder simulierte Funktionen

- **Risiko:** Debug-Flows, Demo-Statistiken, tote Buttons oder sichtbare „Coming Soon“-Bereiche können zur Ablehnung führen.
- **Gegenmaßnahmen:**
  - Produktions-Build blendet den Debug-Screen aus.
  - Unfertige Cloud-, Partner-, Familien-, Abo- und KI-Funktionen bleiben über Feature Flags deaktiviert.
  - Release-Screens dürfen nur echte Systemzustände und messbare lokale Werte anzeigen.

## 9. Unstabile Hintergrundfunktion

- **Risiko:** Hersteller-Energiesparsysteme, Prozessabbruch, Neustart oder Berechtigungsentzug können den Schutz unbemerkt
  stoppen.
- **Gegenmaßnahmen:**
  - Wiederherstellung nach Neustart oder App-Update nur nach vorheriger Aktivierung durch den Nutzer.
  - Sichtbare Foreground-Service-Benachrichtigung.
  - Sicherer Stopp bei fehlenden Berechtigungen und lokaler Warnhinweis.
  - Pflicht-Testmatrix für Pixel, Samsung, Xiaomi, OnePlus, Motorola und Tablet.
  - Batterie- und Langzeittest vor Produktionsfreigabe.

## 10. Aggressive oder manipulative UX

- **Risiko:** Schuldzuweisungen, versteckte Abos oder schwer erreichbare Stop- und Löschfunktionen.
- **Gegenmaßnahmen:**
  - Neutrale Berechtigungssprache.
  - Kein Paywall-Zwang für Datenschutz, Export, Löschung oder Notfallzugang.
  - Deutlich sichtbare Stop-Aktion und vollständiger lokaler Reset.

## 11. Rechtliche und Store-Platzhalter

- **Risiko:** Fehlendes Impressum, nicht erreichbarer Support, nicht veröffentlichte Datenschutzseite oder inkonsistente
  Store-Formulare.
- **Gegenmaßnahmen:**
  - PR bleibt Draft, bis Name beziehungsweise Unternehmen, ladungsfähige Anschrift, verantwortliche Person,
    Support-Postfach und finale Datenschutz-Domain bestätigt sind.
  - Alle Angaben werden gegen das finale signierte Binary geprüft.

## 12. Build- und Testnachweis

- **Risiko:** Statische Codeprüfung ersetzt weder Kompilierung noch Gerätetests.
- **Gegenmaßnahmen:**
  - JavaScript-Verify-Suite, Android-Debug-APK und Release-AAB müssen erfolgreich gebaut werden.
  - GitHub Actions gilt erst als Nachweis, wenn der Runner tatsächlich Schritte ausgeführt hat.
  - Der aktuelle Draft darf nicht allein aufgrund eines mergebaren Git-Status veröffentlicht werden.
