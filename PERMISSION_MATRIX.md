# ScrollShield – Berechtigungs-Matrix v1

Status: **verbindliche Permission-Strategie für den Android-v1-Release**

Letzte Aktualisierung: **16. August 2026**

Ziel: ScrollShield fordert nur Systemzugriffe an, die für den tatsächlichen v1-Kernschutz nötig sind. UI-Erklärung, Android-Manifest, Runtime-Verhalten, Privacy Policy und Google-Play-Deklaration müssen dieselbe Geschichte erzählen.

## 1. Grundregeln

1. Keine sensible Berechtigung direkt beim ersten App-Start ohne Erklärung.
2. Erst Zweck erklären, dann Android-Systemdialog/-einstellung öffnen.
3. Nach Rückkehr immer den echten Systemzustand neu lesen.
4. Kein UI-Schalter simuliert eine Android-Berechtigung.
5. Wenn eine für laufenden Schutz notwendige Voraussetzung verloren geht, muss der Dienst sicher stoppen und die UI darf Schutz nicht weiter als aktiv darstellen.
6. Kein Zugriff auf Nachrichten, Passwörter, Tastatureingaben oder fremde App-Inhalte.
7. Keine Berechtigung nur „für später“ deklarieren.

---

## 2. `PACKAGE_USAGE_STATS` – Usage Access

- **Plattform:** Android
- **Status:** **Erforderlich für automatische Whole-App-Erkennung**
- **Zweck:** Erkennen, welche vom Nutzer ausgewählte App im Vordergrund ist.
- **Nicht verwendet für:** Inhalte der App, Nachrichten, Tastatureingaben oder Screen Scraping.
- **Ohne Zugriff:** ScrollShield-Konfiguration, lokale Daten und Teile der App bleiben nutzbar; automatische Erkennung/Intervention kann nicht zuverlässig laufen.
- **Runtime:** Nutzer öffnet die Android-Usage-Access-Einstellung und erteilt den Zugriff bewusst.
- **Laufender Schutz:** Entzug während des Betriebs führt zum definierten Safe-Shutdown mit Diagnosegrund `usage_access_missing`.
- **Play-Relevanz:** Zweck und lokale Verarbeitung müssen im Store-/Reviewer-Material erklärt werden.

---

## 3. `SYSTEM_ALERT_WINDOW` – Über anderen Apps einblenden

- **Plattform:** Android
- **Status:** **Erforderlich für den aktuellen Overlay-basierten Schutzbildschirm**
- **Zweck:** ScrollShield-Intervention über einer vom Nutzer geschützten App anzeigen.
- **Nicht verwendet für:** Lesen oder Bedienen der darunterliegenden Fremd-App.
- **Ohne Zugriff:** Kein verlässlicher ScrollShield-Overlay-Flow über anderen Apps.
- **Runtime:** Nutzer öffnet bewusst die Android-Einstellung „Über anderen Apps einblenden“.
- **Laufender Schutz:** Entzug während des Betriebs führt zum Safe-Shutdown mit `overlay_permission_missing`.
- **UX-Pflicht:** Home-Rückweg und sichere Recovery-/Exit-Wege bleiben erreichbar.

---

## 4. `POST_NOTIFICATIONS` – sichtbarer Foreground-Schutz

- **Plattform:** Android 13+
- **Status:** **Erforderlich für den aktuellen Android-v1-Schutzdienst**
- **Zweck:** Der laufende Foreground Service muss für den Nutzer sichtbar sein; die dauerhafte Schutzbenachrichtigung enthält Status/Stop-Kontrolle.
- **Wichtig:** Dies ist in v1 nicht nur eine optionale Erinnerungsfunktion.
- **Runtime:** ScrollShield fragt die Android-13+-Benachrichtigungsfreigabe erst im Schutz-Setup an.
- **Android 8+:** Zusätzlich wird der dedizierte Kanal `Aktiver App-Schutz` geprüft.
- **Ohne Zugriff/deaktiviertem Kanal:** Schutz startet nicht bzw. stoppt sicher; Aktivierungszustand wird bereinigt und ein lokaler Diagnosegrund gespeichert.
- **Typischer Diagnosegrund:** `notifications_missing`.

---

## 5. `FOREGROUND_SERVICE`

- **Plattform:** Android
- **Status:** **Erforderliche Manifest-Berechtigung für den laufenden Schutzdienst**
- **Zweck:** Android-Foreground-Service betreiben, der die vom Nutzer aktivierte Whole-App-Schutzfunktion ausführt.
- **Nutzerkontrolle:** sichtbare Notification; kontrollierte Stop-/Recovery-Pfade.
- **Store-Relevanz:** tatsächliches Verhalten muss zum Foreground-Service-Review passen.

---

## 6. `FOREGROUND_SERVICE_SPECIAL_USE`

- **Plattform:** moderne Android-Versionen / targetSdk 36
- **Status:** **Erforderlich für den aktuell deklarierten `specialUse`-Foreground-Service-Typ**
- **Manifest-Subtype:** `User-enabled monitoring of user-selected distracting apps to display local protection interventions.`
- **Store-Relevanz:** hoher Review-Fokus. Manifest, Play-Console-Erklärung und Demonstrationsvideo müssen exakt denselben Use Case zeigen.
- **Regel:** Keine Ausweitung des Service-Zwecks ohne erneuten Store-/Threat-Model-Audit.

---

## 7. `RECEIVE_BOOT_COMPLETED`

- **Plattform:** Android
- **Status:** **Erforderlich für kontrollierte Recovery nach Reboot**
- **Zweck:** Nach einem Neustart prüfen, ob ein zuvor bewusst aktivierter Schutz unter weiterhin gültigen Voraussetzungen wiederhergestellt werden darf.
- **Kein heimlicher Autostart:** Recovery wird nur versucht, wenn vorherige Aktivierung gespeichert ist und notwendige Voraussetzungen weiterhin vorhanden sind.
- **Fehlerfall:** Recovery räumt stale Aktivierung auf und speichert einen `recovery_*`-Grund.

---

## 8. Kein `INTERNET` in Android v1

- **Status:** **bewusst entfernt**
- **Grund:** ScrollShield v1 ist offline-first; der aktuelle Produktcode besitzt keine dokumentierte Runtime-Netzwerkfunktion.
- **Schutzvertrag:** `scripts/check-privacy-build.ts` blockiert Netzwerk-APIs/Tracker und schlägt fehl, wenn `android.permission.INTERNET` erneut ohne bewusste Privacy-/Store-Revision in das Manifest gelangt.
- **Folge:** Neue Cloud-, Analytics-, Remote-Config- oder Netzwerkfunktionen müssen zuerst Product Requirements, Threat Model, Privacy, Data Safety und Permission-Strategie ändern.

---

## 9. Akku-Optimierung / Battery Settings

- **Aktueller Manifest-Status:** **keine** `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`-Permission.
- **Aktuelle Funktion:** ScrollShield kann den Batterie-/Optimierungsstatus diagnostizieren und Nutzer zu relevanten Systemeinstellungen führen.
- **Warum:** OEM-Batteriemanagement kann Foreground-/Hintergrundzuverlässigkeit beeinflussen.
- **Regel:** Keine pauschale Behauptung „muss Akku-Optimierung umgehen dürfen“, solange die App diese besondere Permission nicht tatsächlich deklariert/nutzt.
- **Release-Evidenz:** 12h-/OEM-Tests in `docs/PERFORMANCE_RELIABILITY.md` und `docs/ANDROID_DEVICE_TEST_MATRIX.md`.

---

## 10. Package Visibility – `<queries>` statt `QUERY_ALL_PACKAGES`

- **Status:** **scoped**
- **Zweck:** Nur bekannte unterstützte Ziel-Pakete auf Verfügbarkeit prüfen.
- **Nicht verwendet:** vollständige Inventarisierung aller installierten Apps.
- **Manifest:** endliche `<queries>`-Liste.
- **Store-Relevanz:** Reviewer-Material erklärt die Verfügbarkeitsprüfung.

---

## 11. Accessibility Service

- **Status v1:** **nicht verwendet**
- **Grund:** Whole-App-Schutz basiert aktuell auf Usage Access + Overlay + Foreground Service.
- **Reels-only:** Eine spätere Accessibility-basierte Unterseiten-Erkennung wäre ein eigener Produkt-/Privacy-/Play-Risikoblock und darf nicht still in v1 einfließen.
- **Vor einer späteren Einführung erforderlich:** neue Disclosure/Consent, Threat Model, Play-Erklärung, robuste Selektoren, Datenschutzprüfung und physische Tests.

---

## 12. iOS / Family Controls

- **Status:** **nicht Teil des Android-v1-Release-Gates**
- Reale iOS-Enforcement-Funktion benötigt Apple Family Controls / Managed Settings und passende Entitlements.
- Keine Android-Funktion darf in Store-Texten als bereits verfügbare iOS-Parität erscheinen.

---

## 13. Permission Definition of Done

Eine neue oder geänderte Systemberechtigung ist erst akzeptiert, wenn:

- [ ] technische Notwendigkeit dokumentiert ist;
- [ ] weniger invasive Alternative geprüft wurde;
- [ ] Manifest/Native Code korrekt sind;
- [ ] In-App-Erklärung vorhanden ist;
- [ ] Ablehnung/Entzug sicher behandelt werden;
- [ ] UI echten Status anzeigt;
- [ ] Privacy/Data Safety neu geprüft wurden;
- [ ] Play-Deklaration/Reviewer-Anweisung aktualisiert wurden;
- [ ] passende Unit-/Integration-/Device-Tests existieren;
- [ ] final signierter AAB dieselbe Permission-Liste besitzt.
