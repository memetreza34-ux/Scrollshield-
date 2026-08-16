# ScrollShield – App-Entwicklung von A bis Z

Status: **verbindliches Master-Handbuch für Entwicklung, Test, Store-Vorbereitung und Veröffentlichung**

Letzte fachliche Aktualisierung: **16. August 2026**

Dieses Dokument beantwortet eine einzige Frage:

> **Was müssen wir von der ersten Produktidee bis zur veröffentlichten, überprüfbaren und wartbaren ScrollShield-App tun – und in welcher Reihenfolge?**

Es ist die oberste Prozess-Anleitung des Repositories. Bestehende Spezialdokumente bleiben die Detailquelle für einzelne Bereiche. Dieses Dokument legt dagegen die **Reihenfolge, Eintrittskriterien, Austrittskriterien und Release-Grenzen** fest.

---

# 0. Grundregel

ScrollShield wird nicht veröffentlicht, weil der Code "fertig aussieht".

Eine Phase ist nur abgeschlossen, wenn drei Dinge zusammen vorliegen:

1. **Implementierung** – die Funktion existiert im tatsächlichen Produktcode.
2. **Verifikation** – automatisierte oder manuelle Tests belegen das Verhalten.
3. **Evidenz** – der Nachweis gehört eindeutig zu derselben Version, Build-Nummer und Commit-SHA.

Quellcode, Dokumentation oder ein grüner UI-Zustand allein gelten nicht als Release-Nachweis.

---

# 1. Aktueller technischer Ausgangspunkt

ScrollShield ist aktuell keine leere Idee mehr. Das Repository enthält bereits eine umfangreiche Release-Basis.

## Web-/UI-Stack

- React 19
- TypeScript 5.8
- Vite 8
- Tailwind CSS 4
- Motion
- Vitest + Testing Library
- PWA / Service Worker

## Mobile-Stack

- Capacitor 8
- natives Android-Projekt
- Java 21 für Android-Build/CI
- Android `minSdkVersion = 24`
- Android `compileSdkVersion = 36`
- Android `targetSdkVersion = 36`
- Package-ID: `app.scrollshield.mobile`

## Architektur

- Offline-first
- kein Account in v1
- kein Entwickler-Backend in v1
- keine Werbung in v1
- kein Analytics-/Tracking-SDK in v1
- lokale Regeln, Historie, Statistik und Diagnostik
- Web/PWA als UI-/Preview-Basis
- Android Native Layer für tatsächlichen App-Schutz

## Bereits vorhandene Native-Funktionen

- Usage Access
- Overlay-Berechtigung
- Android-13+-Benachrichtigungsfreigabe
- Foreground Service
- sichtbare Dauerbenachrichtigung
- direkte Stop-Aktion
- Vordergrund-App-Erkennung
- App-Verfügbarkeitsprüfung
- Öffnungsverzögerung
- Session-Limit
- Tageslimit
- Wochen-/Zeitregeln
- Fokus-Verhalten
- Anti-Binge
- adaptive Anti-Binge-Reibung
- Strict Mode
- begrenzter Notfallzugang
- Commitment-Modus
- Boot-/App-Update-Recovery
- Lifecycle-Diagnostik
- lokale Nutzungszeit- und Event-Übernahme

## Bereits vorhandene Release-Infrastruktur

- `npm run verify`
- TypeScript/Lint/Format-Checks
- Vitest
- Android-Source-Checks
- Migration-Checks
- Privacy-/Secret-/Store-Checks
- Android JUnit-Struktur
- GitHub Actions Workflow
- Android Debug-APK-Build-Schritt
- Device-Test-Matrix
- Store Submission Packet
- Release Checklist
- Release Evidence Gate
- Rollout Plan

## Aktuelle große Blocker

- GitHub Actions Runner startet wegen Billing/Spending-Limit aktuell nicht.
- Der komplette Verifikationslauf besitzt deshalb noch keinen gültigen CI-Erfolgsnachweis.
- Android JUnit und `assembleDebug` müssen für den exakten Release-Kandidaten real laufen.
- Physische OEM-Geräte-Matrix ist noch nicht vollständig ausgeführt.
- V0.7-Migration muss auf realen Alt-Daten bytegenau validiert werden.
- Batterie-/Langzeittest fehlt als Release-Evidenz.
- Rechtliche Pflichtfelder und finale Support-/Privacy-Domain sind noch nicht vollständig bestätigt.
- Play-Console-Deklarationen und Reviewer-Videos müssen mit dem finalen AAB übereinstimmen.
- iOS Native Enforcement ist noch kein Release-Ziel für v1.

---

# 2. Phase A – Produktidee und Problem definieren

Bevor Code geschrieben wird, muss klar sein, welches Problem die App löst.

## Für ScrollShield

**Problem:** Nutzer öffnen Social-/Entertainment-Apps häufig impulsiv und verbringen dort mehr Zeit als beabsichtigt.

**Kernlösung:** ScrollShield baut zwischen Impuls und App-Nutzung eine sichtbare, vom Nutzer konfigurierte Entscheidungsebene ein.

## Pflichtfragen

- Wer ist die primäre Zielgruppe?
- Welches konkrete Verhalten soll verbessert werden?
- Warum reicht Android Digital Wellbeing für diese Zielgruppe nicht?
- Was ist der zentrale Nutzen nach 30 Sekunden App-Nutzung?
- Was ist der zentrale Nutzen nach sieben Tagen?
- Was darf die App ausdrücklich **nicht** behaupten?

## ScrollShield-v1-Antwort

Die App darf als Produktivitäts-/Digital-Wellbeing-Werkzeug auftreten.

Sie darf nicht behaupten:

- Sucht medizinisch zu behandeln;
- ADHS zu behandeln;
- Menschen psychologisch zu diagnostizieren;
- Reels/Shorts-Unterseiten zuverlässig zu erkennen, solange nur Whole-App-Erkennung technisch vorhanden ist;
- manipulationssicher oder unmöglich zu umgehen zu sein;
- auf iOS bereits denselben nativen Schutz wie Android zu besitzen.

## Austrittskriterium

Die Produktbeschreibung muss in einem Satz formulierbar sein, ohne eine Funktion zu versprechen, die nicht im Release-Build existiert.

---

# 3. Phase B – MVP und Release-Scope festlegen

Nicht alles, was langfristig sinnvoll ist, gehört in Version 1.

## ScrollShield v1 – Release-Scope

### Muss enthalten

- Android Whole-App-Schutz
- klare Berechtigungsführung
- App-Auswahl
- bewusste Öffnungspause
- Session-Limit
- Tageslimit
- Strict Mode
- Fokus-Modus
- Wochen-/Zeitregeln
- Anti-Binge
- begrenzter Emergency Flow
- transparente Service-/Permission-Anzeige
- lokale Historie/Statistik
- Export/Import
- sichere V0.7-Migration
- lokale Diagnose
- Help/Privacy/Support

### Kann enthalten, wenn vollständig verifiziert

- Commitment
- adaptive Anti-Binge-Reibung
- tiefere lokale Insights
- zusätzliche Automatisierung

### Nicht als v1-Release-Voraussetzung behandeln

- iOS Family Controls
- Cloud-Sync
- Account-System
- Social-/Partner-Funktionen
- Reels-only-Erkennung
- KI-Empfehlungen
- käufliches Pro-Abo ohne Billing-/Entitlement-Lifecycle

## Regel

Ein zukünftiges Feature darf nicht den Release des stabilen Kernprodukts blockieren, außer es wurde bewusst in den v1-Scope aufgenommen.

---

# 4. Phase C – Technische Architektur festlegen

Architektur wird vor Feature-Coding entschieden, nicht nachträglich erraten.

## ScrollShield-Architektur

```text
React / TypeScript UI
        |
        v
lokale State-/Storage-Schicht
        |
        +--------------------------+
        |                          |
        v                          v
PWA/Web Preview              Capacitor Bridge
                                   |
                                   v
                           Native Android Java
                                   |
                +------------------+------------------+
                |                  |                  |
                v                  v                  v
          UsageStats         Overlay UI       Foreground Service
                |                  |                  |
                +------------------+------------------+
                                   |
                                   v
                         lokale Native-Daten
```

## Trennung der Verantwortlichkeiten

### React/TypeScript

Verantwortlich für:

- Navigation
- Einstellungen
- Profile
- Dashboards
- Historie
- lokale State-Normalisierung
- Backup/Restore
- Migration-Orchestrierung
- verständliche Statusdarstellung

### Native Android

Verantwortlich für:

- echte Android-Berechtigungen
- Vordergrund-App-Erkennung
- laufenden Schutzdienst
- Overlay
- Android-Systemzustand
- Boot-/Update-Recovery
- native Nutzungszeit
- echte Runtime-Schutzentscheidungen

### Regel

Die Web-PWA darf nie so tun, als könne sie installierte Fremd-Apps blockieren.

---

# 5. Phase D – Repository und Entwicklungsprozess

## Hauptstruktur

```text
src/                      React/TypeScript Produktcode
src/screens/              Screens
src/components/           wiederverwendbare UI
src/lib/                  Logik, Storage, Native Bridges, Policies
android/                  natives Android-Projekt
scripts/                  statische/verbindliche Release-Checks
docs/                     Produkt-, Technik-, Test- und Release-Dokumentation
config/                   Release-Freigabestatus
.github/workflows/         CI
```

## Branch-Regel

Produktänderungen nicht direkt unkontrolliert auf `main` entwickeln.

Für den aktuellen Release gilt:

```text
main
  ^
  |
Draft PR #8
  ^
  |
agent/release-foundation
```

## Vor jeder Änderung

- Ziel definieren.
- Betroffene Datenmodelle bestimmen.
- Native Auswirkungen prüfen.
- Migrationsrisiko prüfen.
- Datenschutz-/Store-Auswirkung prüfen.
- Tests definieren, bevor die Änderung als fertig gilt.

## Nach jeder Änderung

- Quelltests ergänzen.
- bestehende Release-Checker nicht umgehen.
- Dokumentation aktualisieren.
- keine Release-Evidence auf `true` setzen, solange sie nicht real existiert.

---

# 6. Phase E – Entwicklungsumgebung

## Web Voraussetzungen

- Node.js >= 22.12
- npm >= 10

```bash
npm ci
npm run dev
```

## Android Voraussetzungen

- Java 21+
- Android Studio oder Android Command Line Tools
- Android SDK Platform 36
- gültiges `android/local.properties`

```bash
npm run android:configure
npm run android:doctor
npm run android:sync
npm run android:open
```

## Geheimnisse

Nie committen:

- Keystore
- Keystore-Passwörter
- `signing.properties`
- Play API Credentials
- private Tokens
- reale Secrets in `.env`

---

# 7. Phase F – Datenmodell vor UI

Bevor ein Screen gebaut wird, muss klar sein, welche Daten er verändert.

## Für jede neue Funktion definieren

- TypeScript-Datentyp
- Default-Wert
- Validierungsgrenzen
- Verhalten bei alten Daten
- Export-/Import-Verhalten
- Reset-Verhalten
- Native-Synchronisierung
- Verhalten bei Downgrade/Feature-Deaktivierung

## ScrollShield-Sonderregel

Alte V0.7-Daten besitzen hohen Schutzstatus.

Eine neue Funktion darf niemals:

- Legacy-Daten still löschen;
- beschädigte Migration als Erfolg markieren;
- alte generierte Regeln automatisch aktivieren;
- ein bytegenaues Legacy-Archiv überschreiben;
- normale Saves während ungelöster Migration erzwingen.

Details: `docs/DATA_MIGRATION.md`.

---

# 8. Phase G – UI/UX entwickeln

## Reihenfolge pro Feature

1. Zustand definieren.
2. Happy Path zeichnen.
3. Fehlerzustände definieren.
4. Loading-/Busy-Zustand definieren.
5. Empty State definieren.
6. Accessibility prüfen.
7. Erst dann Animation/Polish hinzufügen.

## ScrollShield-Designprinzipien

- ruhig
- minimal
- nicht aggressiv
- keine Fake-Erfolgsmeldungen
- echte Systemzustände statt simulierte Schalter
- kritische Aktionen klar erreichbar
- keine Trap-UX

## Kritische UI-Wahrheit

Wenn Android sagt:

```text
running = false
```

Darf die UI niemals `AKTIV` anzeigen.

Wenn ein Stop angefordert wurde, Android aber noch `running=true` meldet, darf die UI nur den angeforderten – nicht den bestätigten – Stop melden.

---

# 9. Phase H – Kernfeature implementieren

Für jedes Feature gilt dieselbe Definition of Done.

## Beispiel

Feature: Öffnungsverzögerung

### Produkt

- Nutzer aktiviert eine App.
- Nutzer legt Delay fest.
- geschützte App wird erkannt.
- Overlay erscheint.
- Countdown läuft.
- Nutzer kann zurück zum Home-Screen.
- nach Countdown ist bewusste Öffnung möglich.

### Technik

- React-Konfiguration
- Normalisierung
- Native JSON Sync
- Android Parsing
- Runtime Policy
- Overlay
- Event
- History

### Tests

- TypeScript Unit Test
- React Integration Test
- Java Policy Test
- Android Device Test

Das Feature gilt erst dann als Release-fähig.

---

# 10. Phase I – Native Android sauber entwickeln

Native Android ist der sicherheitskritische Teil von ScrollShield.

## Pflichtprinzipien

### Nutzer-initiiert

Der Schutzdienst startet nicht heimlich.

### Nutzer-wahrnehmbar

Ein laufender Foreground Service besitzt eine sichtbare Benachrichtigung.

### Nutzer-kontrollierbar

Ein sicherer Stop-/Exit-Weg bleibt vorhanden.

### Fail closed bei falscher Schutzanzeige

Wenn Voraussetzungen fehlen, darf ScrollShield nicht so tun, als sei Schutz aktiv.

## Aktuelle Android-Permissions

- `INTERNET`
- `RECEIVE_BOOT_COMPLETED`
- `PACKAGE_USAGE_STATS`
- `SYSTEM_ALERT_WINDOW`
- `POST_NOTIFICATIONS`
- `FOREGROUND_SERVICE`
- `FOREGROUND_SERVICE_SPECIAL_USE`

## Vor Release jede Permission prüfen

Für jede Permission dokumentieren:

- Warum wird sie benötigt?
- Welche Funktion fällt ohne sie aus?
- Wann wird sie angefragt?
- Wird sie im Store deklariert?
- Ist die Erklärung in der App verständlich?
- Existiert eine weniger invasive Alternative?

Details: `PERMISSION_MATRIX.md` und `docs/NATIVE_ANDROID.md`.

---

# 11. Phase J – Android Foreground Service

ScrollShield verwendet einen `specialUse` Foreground Service.

Das ist store-sensibel und muss besonders sauber umgesetzt werden.

## Der Service muss

- eine Kernfunktion bereitstellen;
- durch den Nutzer gestartet bzw. klar wahrgenommen werden;
- sichtbar bleiben;
- stoppbar sein;
- nur mit benötigten Berechtigungen laufen;
- sich bei Verlust kritischer Voraussetzungen sauber beenden;
- den tatsächlichen Zustand diagnostizierbar machen.

## Play-Review benötigt

- Funktionsbeschreibung
- Nutzer-Auswirkung, wenn Start verzögert wird
- Nutzer-Auswirkung, wenn Service unterbrochen wird
- Video des vollständigen Flows
- passenden Foreground-Service-Typ

Details: `docs/STORE_SUBMISSION_PACKET.md`.

---

# 12. Phase K – Berechtigungsflow

Berechtigungen sind Produkt-UX, nicht nur Android-Code.

## Richtige Reihenfolge

1. Nutzer versteht die Funktion.
2. ScrollShield erklärt, warum Zugriff benötigt wird.
3. Systemdialog/Systemeinstellung wird geöffnet.
4. Nach Rückkehr wird der echte Systemzustand neu gelesen.
5. Schutz startet erst, wenn alles erfüllt ist.

## Keine Fake-Permission-Toggles

Ein UI-Schalter darf niemals eine Systemberechtigung simulieren.

---

# 13. Phase L – Datenschutz und lokale Daten

## v1-Prinzip

So wenig externe Datenverarbeitung wie möglich.

## Prüfen

- Welche Daten entstehen?
- Wo liegen sie?
- Werden sie übertragen?
- Welche Drittanbieter-SDKs sehen sie?
- Können Nutzer exportieren?
- Können Nutzer löschen?
- Was bleibt nach Reset?
- Was bleibt nach Deinstallation?

## ScrollShield v1

Geplant/angegeben:

- keine Entwickler-Cloud
- kein Login
- keine Werbung
- keine Analytics
- kein Tracking
- lokale Regeln
- lokale Historie
- lokale Diagnostik

Diese Aussage muss gegen den **final signierten AAB** geprüft werden, nicht nur gegen TypeScript-Quellcode.

---

# 14. Phase M – Privacy Policy

Google Play verlangt auch für Apps ohne Datenerhebung eine Datenschutzerklärung.

## Sie muss

- öffentlich erreichbar sein;
- in der App erreichbar sein;
- in Play Console verlinkt sein;
- App/Entwickler identifizieren;
- Datenzugriffe erklären;
- Erhebung, Nutzung und Weitergabe erklären;
- zu Data Safety passen.

Für Google Play darf die finale Privacy-URL nicht nur ein lokales Repo-Dokument sein.

Vor Release benötigt ScrollShield eine finale öffentliche Domain statt Platzhalter.

---

# 15. Phase N – Migration und Update-Sicherheit

Eine App ist nicht releasefähig, wenn Updates Nutzerdaten zerstören können.

## Testpfade

- Clean Install
- Update vom letzten Release Candidate
- Update aus V0.7
- beschädigte Alt-Daten
- Speicherfehler während Migration
- unterbrochener Schreibvorgang
- Export → Reset → Import
- App-Update bei laufendem Schutz

## ScrollShield-Sonderanforderung

V0.7-Rohdaten werden vor Löschung bytegenau archiviert.

Dieser Punkt muss auf einem echten Android-Gerät mit repräsentativen Alt-Daten nachgewiesen werden.

---

# 16. Phase O – Tests als Pyramide

## Ebene 1 – Pure Logic

Beispiele:

- Limits
- Anti-Binge
- Adaptive Friction
- Emergency Policy
- Lifecycle Classification
- Migration Normalisierung

Schnell, deterministisch, sehr viele Fälle.

## Ebene 2 – React/TypeScript Integration

Beispiele:

- Permissions Screen
- Commitment
- Dashboard Health
- App Config
- Migration Recovery
- Backup Import

## Ebene 3 – Android JVM Tests

Beispiele:

- `ProtectionRulePolicy`
- `ProtectionStopReasonPolicy`
- `ProtectionServiceLifecyclePolicy`
- `EmergencyUnlockPolicy`
- `AdaptiveFrictionPolicy`
- `ProtectionDiagnosticPolicy`

## Ebene 4 – Android Instrumentation

Muss weiter ausgebaut werden.

Besonders wichtig:

- Service Lifecycle
- reale Overlay-Interaktion
- Permission-Verlust
- Countdown
- Session-Ende
- Usage Import
- Boot-/Update-Recovery

## Ebene 5 – echte Geräte

Unersetzbar für:

- Samsung
- Xiaomi/Redmi
- OnePlus
- Motorola
- Pixel/Near Stock
- Tablet
- Batterie
- Prozesskiller
- Reboot
- Accessibility

---

# 17. Phase P – zentrale Verifikation

Der wichtigste Entwicklerbefehl ist:

```bash
npm run verify
```

Er umfasst unter anderem:

- Runtime
- TypeScript
- ESLint
- Prettier
- Versionen
- Android-Source-Vertrag
- Device-Matrix-Vertrag
- Lifecycle
- Diagnose-Normalisierung
- Overlay Accessibility
- Usage Accounting
- Protection Config
- Release Surface
- Commitment
- Subscription Safety
- Migration
- Release Approval
- Transparency
- SDK/Notices
- Secrets
- Store
- Release Readiness
- Vitest
- Accessibility
- Production Build
- PWA
- Privacy
- Bundle Budget

## Regel

Ein Source-Checker beweist, dass der Vertrag im Source existiert.

Er ersetzt **keinen** realen Android-Lauf.

---

# 18. Phase Q – CI

GitHub Actions soll bei Push und Pull Request automatisch laufen.

Geplanter Flow:

```text
Checkout
  ↓
Node
  ↓
Java 21
  ↓
npm ci
  ↓
npm run verify
  ↓
Android testDebugUnitTest
  ↓
Android assembleDebug
  ↓
APK + Testreport als Artifact
```

## Aktueller Blocker

Der Workflow ist vorhanden, der GitHub-hosted Runner startet aktuell jedoch aufgrund Billing-/Spending-Limit nicht.

Bis der Runner reale Schritte ausgeführt hat, ist CI **nicht bestanden**.

---

# 19. Phase R – Debug APK erstellen

Vor Store-Arbeit muss ein echtes Android-Artefakt existieren.

```bash
npm run android:sync
npm run android:build
```

Danach prüfen:

- installierbar?
- startet?
- Version korrekt?
- Package-ID korrekt?
- Permissions korrekt?
- Overlay korrekt?
- Foreground Service korrekt?
- kein Crash beim ersten Start?

---

# 20. Phase S – Device-Matrix

Die vollständige Matrix steht in:

`docs/ANDROID_DEVICE_TEST_MATRIX.md`

Mindestens erforderlich:

- Pixel/Near Stock
- Samsung
- Xiaomi/Redmi
- OnePlus
- Motorola
- Tablet
- API 24
- API 26
- Android 13+

## Zusätzlich testen

- maximale Schriftgröße
- Display Scaling
- Tastatur im Emergency Overlay
- Rotation
- Multi Window
- TalkBack Smoke Test
- 12-Stunden-Lauf
- Battery Saver
- Reboot
- Force Stop
- App Update
- Uhrzeit-/Zeitzonenwechsel
- Mitternacht
- Sommerzeit

Jeder Test gehört zu einer exakten Build-Nummer.

---

# 21. Phase T – Release Candidate einfrieren

Sobald ein Kandidat ernsthaft getestet wird:

- `versionName` festlegen
- `versionCode` festlegen
- Commit-SHA festhalten
- danach keine heimlichen Codeänderungen

ScrollShield verwendet dafür:

`config/release-approval.json`

## Evidence Schema v2

Für jeden positiven Release-Nachweis müssen vorhanden sein:

- `candidateCommitSha`
- konkrete Evidenzreferenz

Beispiel:

```text
physicalDeviceMatrixPassed = true
candidate SHA = abc...
reference = Link/Ordner/Testreport
```

Ein Boolean ohne Evidenz ist kein ausreichender Release-Nachweis.

Details: `docs/RELEASE_EVIDENCE.md`.

---

# 22. Phase U – Signing

Vor Produktion benötigt Android ein dauerhaftes Release-Signing.

## Regeln

- Keystore sicher außerhalb des Repos speichern.
- Backup des Keystores anlegen.
- Passwörter nicht im Repo.
- `signing.properties` nicht committen.
- Play App Signing korrekt einrichten.
- Signing-Verantwortung dokumentieren.

## Kritisch

Die Package-ID `app.scrollshield.mobile` muss vor dem ersten echten Play-Release endgültig bestätigt werden.

---

# 23. Phase V – Android App Bundle

Für neue Apps bei Google Play ist das Android App Bundle das Veröffentlichungsformat.

ScrollShield besitzt bereits:

```bash
npm run android:bundle
```

Dieser Befehl darf erst funktionieren, wenn der strikte Release-Gate bestanden ist.

AAB und APK nicht verwechseln:

- APK = direkt installierbares Android-Paket
- AAB = Store-Veröffentlichungsbundle; Google Play erzeugt daraus gerätespezifische APKs

---

# 24. Phase W – Play Console Entwicklerkonto

Vor Veröffentlichung benötigt der Eigentümer ein vollständig verifiziertes Play-Console-Konto.

## Prüfen

- Konto-Typ: privat oder Organisation
- Entwicklername
- verifizierte Kontakt-E-Mail
- ggf. verifizierte Telefonnummer
- Zahlungs-/Identitätsstatus
- reales Android-Gerät für Kontoverifikation, falls Google dies für das Konto verlangt

## Neue private Konten

Für private Entwicklerkonten, die nach dem 13. November 2023 erstellt wurden, verlangt Google Play aktuell vor Produktionszugriff einen geschlossenen Test mit mindestens:

- **12 Testern**
- **14 aufeinanderfolgenden Tagen Opt-in**

Diese Regel ist kontoabhängig und muss in der eigenen Play Console erneut bestätigt werden.

---

# 25. Phase X – Google Play App anlegen

Erst wenn Package-ID und Produktname feststehen.

## Benötigt

- App-Name
- Standardsprache
- App/Spiel
- kostenlos/kostenpflichtig
- Entwicklerkontakt
- Kategorie
- Store Listing
- Datenschutzerklärung
- Content Rating
- Data Safety
- App Access
- Ads Declaration
- Target Audience
- Permission-/Foreground-Service-Erklärungen

Keine Store-Angabe darf von der tatsächlichen Binärdatei abweichen.

---

# 26. Phase Y – Store Listing

## Benötigt

- App-Name
- kurze Beschreibung
- vollständige Beschreibung
- App-Icon
- Feature Graphic, falls gefordert/verwendet
- Phone Screenshots
- ggf. Tablet Screenshots
- Support-E-Mail
- Privacy URL

ScrollShield besitzt bereits vorbereitete Assets unter:

`docs/store-assets/`

Sie müssen aber mit dem finalen Release-Build verglichen und ggf. neu aufgenommen werden.

## Marketingregel

Nie Funktionen bewerben, die nur in Roadmap oder Demo existieren.

---

# 27. Phase Z1 – Data Safety

Google verlangt eine Data-Safety-Erklärung auch dann, wenn keine Daten an den Entwickler gesendet werden.

Für ScrollShield ist aktuell vorbereitet:

- keine Entwickler-Datenerhebung
- keine Weitergabe
- kein Tracking
- kein Account

Aber:

Die Antworten müssen nach dem finalen Dependency-/Binary-Audit erneut bestätigt werden.

Eine einzige neue SDK-Abhängigkeit kann Data Safety verändern.

---

# 28. Phase Z2 – sensible Android-Erklärungen

ScrollShield benötigt zusätzliche Review-Aufmerksamkeit wegen:

- Usage Access
- Overlay
- Foreground Service `specialUse`
- Notification Runtime Permission
- Package Visibility

## Reviewer muss verstehen

- Nutzer wählt geschützte Apps selbst.
- ScrollShield liest keine Inhalte aus Fremd-Apps.
- ScrollShield überwacht nicht heimlich Nachrichten/Tastatureingaben.
- Schutz ist sichtbar.
- Schutz kann beendet werden.
- Daten bleiben in v1 lokal.

Vorbereitete Texte: `docs/STORE_SUBMISSION_PACKET.md`.

---

# 29. Phase Z3 – aktuelle Target-API-Anforderung

Stand 16. August 2026:

Google Play verlangt ab **31. August 2026** für neue normale Android-Apps und App-Updates Target **Android 16 / API 36** oder höher.

ScrollShield verwendet aktuell bereits:

```text
targetSdkVersion = 36
compileSdkVersion = 36
```

Damit ist die technische Zielversion für die bevorstehende Frist bereits korrekt vorbereitet.

Vor jedem zukünftigen Release muss die dann aktuelle Google-Play-Anforderung neu geprüft werden.

---

# 30. Phase Z4 – Internal Testing

Nicht direkt Produktion veröffentlichen.

## Zuerst

Google Play Internal Testing.

Prüfen:

- Store-Installation
- Play App Signing
- Updatepfad
- echtes AAB
- Berechtigungen
- Overlay
- Service
- Diagnose
- Migration
- Reset

Details: `docs/ROLLOUT_PLAN.md`.

---

# 31. Phase Z5 – Closed Testing

Danach geschlossener Test.

## Ziele

- echte Nutzer verstehen Onboarding;
- Permissions werden verstanden;
- keine OEM-Probleme;
- kein Batteriedrama;
- keine Overlay-Schleifen;
- keine falsche Aktiv-Anzeige;
- keine Datenverluste.

## Bei betroffenen neuen privaten Play-Konten

Mindestens 12 Tester müssen mindestens 14 Tage fortlaufend angemeldet bleiben, bevor Produktionszugriff beantragt werden kann.

Tester nicht erst am Ende organisieren – diese Phase früh einplanen.

---

# 32. Phase Z6 – Reviewer-Videos

Videos gehören zum Release-Nachweis.

Mindestens zeigen:

- Onboarding
- Permission-Erklärung
- Usage Access
- Overlay
- Notification Permission
- Protection Channel
- Start des Services
- sichtbare Benachrichtigung
- Stop-Aktion
- geschützte App öffnen
- Delay/Block
- Emergency
- Berechtigung entziehen
- sichere Service-Abschaltung
- Diagnosecode
- kopiertes Diagnose-JSON

Video muss denselben Build zeigen, der eingereicht wird.

---

# 33. Phase Z7 – finaler Binary Audit

Vor Upload den final signierten AAB prüfen.

## Prüffragen

- Welche Permissions sind wirklich enthalten?
- Welche SDKs sind wirklich enthalten?
- Existieren Tracker?
- Existieren unerwartete Netzwerkziele?
- Ist Debug-Code enthalten?
- Ist Logging angemessen?
- Ist Package-ID korrekt?
- Version Name korrekt?
- Version Code korrekt?
- Privacy-/Data-Safety-Angaben noch korrekt?

Erst danach:

`signedBinaryInspected = true`

mit Evidenzreferenz.

---

# 34. Phase Z8 – Release Gate

Vor AAB/Release:

```bash
npm run release:gate
```

Der Gate muss fail-closed arbeiten.

Er darf erst grün sein, wenn mindestens belegt sind:

- Web Verification
- Android Unit Tests
- Debug APK
- Device Matrix
- Lifecycle
- Battery Reliability
- Migration
- Play Declarations
- Legal Fields
- Reviewer Videos
- Signed Binary
- Approver
- Approval Time

---

# 35. Phase Z9 – Produktion veröffentlichen

Nicht sofort 100 % ausrollen.

Empfohlener Ablauf laut bestehendem Rollout-Plan:

1. kleiner Prozentsatz
2. beobachten
3. erhöhen
4. bei kritischem Fehler pausieren
5. erst nach Stabilität vollständig ausrollen

Details: `docs/ROLLOUT_PLAN.md`.

---

# 36. Nach Veröffentlichung

Release ist nicht das Ende der Entwicklung.

## Direkt beobachten

- Play Console Android Vitals
- Crashes
- ANRs
- Bewertungen
- Support-Mailbox
- Permission-Probleme
- Herstellerprobleme
- Batterieprobleme
- Migration-/Update-Probleme

## Ohne Analytics-SDK möglich

v1 kann weiterhin ohne eingebautes Tracking arbeiten und trotzdem:

- Play Store technische Qualitätsdaten verwenden;
- Supportfälle auswerten;
- freiwillig geteilte Diagnose-JSONs untersuchen;
- reproduzierbare GitHub-Issues führen.

---

# 37. Hotfix-Prozess

Ein Hotfix ist ein neuer Release-Kandidat.

Nicht einfach Code ändern und altes Test-Evidence behalten.

## Erforderlich

- neuer `versionCode`
- reproduzierter Fehler
- Fix
- gezielter Regressionstest
- vollständige automatische Verifikation
- relevante physische Geräte erneut testen
- neue Kandidaten-SHA
- neue Evidence
- neuer Gate

---

# 38. Versionsstrategie

Beispiel:

```text
1.0.0  erster öffentlicher Release
1.0.1  kleiner Bugfix
1.1.0  neue kompatible Funktionen
2.0.0  große Architektur-/Produktänderung
```

Android `versionCode` muss bei jedem Store-Release steigen.

Beispiel:

```text
1.0.0 → versionCode 1
1.0.1 → versionCode 2
1.1.0 → versionCode 3
```

Nie einen bereits veröffentlichten `versionCode` wiederverwenden.

---

# 39. Definition of Done für ein einzelnes Feature

Ein Feature ist erst fertig, wenn:

- [ ] Problem und gewünschtes Verhalten dokumentiert sind.
- [ ] Datenmodell definiert ist.
- [ ] Default-/Fallback-Verhalten definiert ist.
- [ ] UI Happy Path funktioniert.
- [ ] Fehlerzustände funktionieren.
- [ ] Accessibility berücksichtigt ist.
- [ ] Persistenz funktioniert.
- [ ] Import/Export berücksichtigt ist.
- [ ] Migration berücksichtigt ist.
- [ ] Native Android-Auswirkung berücksichtigt ist.
- [ ] Datenschutz-/Permission-Auswirkung berücksichtigt ist.
- [ ] Unit Tests vorhanden sind.
- [ ] Integrations-Tests vorhanden sind.
- [ ] Native Policy Tests vorhanden sind, wenn nötig.
- [ ] Device-Test definiert ist, wenn nötig.
- [ ] Dokumentation aktualisiert ist.
- [ ] `npm run verify` weiterhin besteht.

---

# 40. Definition of Done für einen Release

Ein Release ist erst fertig, wenn:

- [ ] Scope eingefroren ist.
- [ ] Package-ID final ist.
- [ ] Version Name final ist.
- [ ] Version Code final ist.
- [ ] `npm ci` erfolgreich ist.
- [ ] `npm run verify` vollständig erfolgreich ist.
- [ ] Android JUnit erfolgreich ist.
- [ ] `assembleDebug` erfolgreich ist.
- [ ] Debug APK auf echter Hardware läuft.
- [ ] Device Matrix vollständig ist.
- [ ] Lifecycle Matrix vollständig ist.
- [ ] Adaptive-Friction-Matrix vollständig ist, falls im Release aktiv.
- [ ] Commitment-Matrix vollständig ist, falls im Release aktiv.
- [ ] V0.7-Migration real validiert ist.
- [ ] Export/Reset/Import real validiert ist.
- [ ] Batterie-Langzeittest bestanden ist.
- [ ] Privacy Policy final öffentlich erreichbar ist.
- [ ] Support-Adresse funktioniert.
- [ ] rechtliche Angaben final sind.
- [ ] Store Listing final ist.
- [ ] Screenshots final sind.
- [ ] Data Safety gegen Binary geprüft ist.
- [ ] Foreground-Service-Deklaration final ist.
- [ ] Permission-Deklarationen final sind.
- [ ] Reviewer-Videos final sind.
- [ ] signierter AAB geprüft ist.
- [ ] Closed-Test-Anforderung des eigenen Play-Kontos erfüllt ist.
- [ ] Release Evidence vollständig ist.
- [ ] `npm run release:gate` erfolgreich ist.
- [ ] verantwortliche Person freigegeben hat.
- [ ] Rollback-/Hotfix-Plan vorhanden ist.

---

# 41. Bestehende Spezialdokumente – wann welches lesen?

## Produkt

- `ROADMAP.md`
- `docs/COMPETITIVE_PRODUCT_STRATEGY.md`
- `docs/COMPETITOR_PRODUCT_BLUEPRINT.md`

## Android

- `docs/NATIVE_ANDROID.md`
- `PERMISSION_MATRIX.md`

## Daten

- `docs/DATA_MIGRATION.md`

## Commitment / Anti-Binge

- `docs/COMMITMENT_MODE.md`
- `docs/ADAPTIVE_FRICTION.md`

## Engineering

- `docs/ENGINEERING_CHECKS.md`

## physische Tests

- `docs/ANDROID_DEVICE_TEST_MATRIX.md`

## Release

- `docs/RELEASE_CHECKLIST.md`
- `docs/RELEASE_EVIDENCE.md`
- `config/release-approval.json`

## Store

- `docs/STORE_SUBMISSION_PACKET.md`
- `docs/store-assets/`

## Rollout

- `docs/ROLLOUT_PLAN.md`

---

# 42. Aktuelle Repo-Audit-Befunde

## Stark

- ungewöhnlich ausführliche Release-Checks vorhanden
- sehr starke Legacy-Datenrettung
- Native-Service-Zustand wird nicht nur aus React-State abgeleitet
- Permission-Verlust wird aktiv behandelt
- Whole-App-v1-Scope wurde von nicht belegbaren Reels-Versprechen getrennt
- Device-Matrix existiert bereits
- Release-Gate besitzt kandidatgebundene Evidence-Struktur
- CI ist fachlich vorbereitet
- targetSdk 36 ist bereits vorbereitet

## Noch verbessern

### 1. Echte Ausführung statt nur Source Contracts

Größte Lücke.

Die vielen Source-Checks sind wertvoll, aber CI/Gradle/physische Tests müssen real laufen.

### 2. Android Instrumentation

Unter `androidTest` existiert derzeit hauptsächlich die Grundstruktur. Der kritische Service-/Overlay-Flow braucht mehr Instrumentation/E2E-Nachweis.

### 3. Dokumentationsdrift vermeiden

Einige ältere Texte können nach Code-Härtungen veralten. Dieses Master-Dokument soll künftig die Prozesswahrheit liefern; technische Details müssen weiterhin bei jeder Semantikänderung mitgeändert werden.

### 4. Rechtliche Release-Daten

Finale reale Angaben fehlen noch als bestätigte Release-Evidence.

### 5. Store-Policy-Risiko Foreground Service

`specialUse` ist überprüfungspflichtig. Die technische Implementierung und Reviewer-Erklärung müssen exakt zusammenpassen.

### 6. INTERNET-Permission auditieren

ScrollShield ist offline-first, besitzt aber die normale Android-`INTERNET`-Permission. Vor Release muss bestätigt werden, welche Runtime-Komponenten sie benötigen und dass der signierte Build trotzdem keine unerwartete Übertragung enthält.

### 7. iOS getrennt behandeln

iOS darf erst veröffentlicht werden, wenn Family Controls/Managed Settings tatsächlich integriert, genehmigt und auf realen Geräten getestet sind.

---

# 43. Aktuelle Google-Play-Regeln, die vor Release erneut geprüft werden müssen

Dieser Abschnitt ist bewusst datiert und darf nicht als dauerhaft unveränderliche Wahrheit behandelt werden.

Stand: **16. August 2026**

## Target API

Ab 31. August 2026 müssen neue normale Android-Apps und Updates bei Google Play Android 16 / API 36 oder höher targeten.

Offizielle Quelle:

https://support.google.com/googleplay/android-developer/answer/11926878

## Android App Bundle

Neue Google-Play-Apps werden als Android App Bundle veröffentlicht.

Offizielle Quelle:

https://developer.android.com/guide/app-bundle

## Neue private Entwicklerkonten

Private Konten, die nach dem 13. November 2023 erstellt wurden, müssen aktuell einen geschlossenen Test mit mindestens 12 Testern über mindestens 14 fortlaufende Opt-in-Tage durchführen, bevor Produktionszugriff beantragt werden kann.

Offizielle Quelle:

https://support.google.com/googleplay/android-developer/answer/14151465

## Device Verification

Neue private Entwicklerkonten können vor Veröffentlichung den Besitz/Zugriff auf ein echtes Android-Gerät über die Play Console App verifizieren müssen.

Offizielle Quelle:

https://support.google.com/googleplay/android-developer/answer/14316361

## Data Safety

Auch Apps ohne Entwickler-Datenerhebung müssen die Data-Safety-Angaben korrekt ausfüllen. Geschlossene/offene/Produktions-Tracks fallen grundsätzlich in diesen Prozess; ausschließlich interne Tests haben Sonderregeln.

Offizielle Quelle:

https://support.google.com/googleplay/android-developer/answer/10787469

## Privacy Policy

Jede App benötigt eine umfassende öffentlich zugängliche Datenschutzerklärung; sie muss auch in der App erreichbar sein.

Offizielle Quelle:

https://support.google.com/googleplay/android-developer/answer/17190352

## Foreground Service

Bei Android 14+ müssen Foreground-Service-Typen im Manifest und in Play Console korrekt deklariert werden. Google verlangt je Typ Erklärung, Nutzerwirkung und Demonstrationsvideo.

Offizielle Quellen:

https://support.google.com/googleplay/android-developer/answer/13392821

https://support.google.com/googleplay/android-developer/answer/16559646

---

# 44. Die verbindliche Reihenfolge für ScrollShield ab jetzt

Keine neuen großen Produktblöcke beginnen, bevor die jeweils vorherige Stufe ausreichend stabil ist.

## Stufe 1 – Source-Basis abschließen

- aktuelle offenen Source-/Dokumentationsfehler beheben
- keine Fake-Paywall
- keine neuen Store-Risiken ohne Grund

## Stufe 2 – komplette lokale/CI-Verifikation

```bash
npm ci
npm run verify
cd android
./gradlew testDebugUnitTest assembleDebug
```

## Stufe 3 – kritische Fehler aus Testlauf beheben

Dann erneut Stufe 2.

## Stufe 4 – echte Debug APK

Auf physischen Android-Geräten installieren.

## Stufe 5 – Device Matrix

Vollständig durchführen und Evidenz sammeln.

## Stufe 6 – V0.7-Migration

Mit echten Alt-Daten durchführen.

## Stufe 7 – Battery/Lifecycle Langzeit

Mindestens relevante OEM-/12h-Fälle.

## Stufe 8 – Release Candidate Freeze

Exakte Commit-SHA festlegen.

## Stufe 9 – Legal/Privacy/Store finalisieren

Keine Platzhalter mehr.

## Stufe 10 – signierter AAB

Erst nach bestandenem Gate.

## Stufe 11 – Play Internal Testing

Store-Auslieferung testen.

## Stufe 12 – Closed Testing

Falls Konto die 12/14-Regel verlangt, vollständig erfüllen.

## Stufe 13 – finaler Production Access / Review

Reviewer-Evidence einreichen.

## Stufe 14 – gestaffelter Produktionsrollout

Nicht sofort 100 %.

## Stufe 15 – Monitoring und Hotfix-Bereitschaft

Release aktiv begleiten.

---

# 45. Wichtigster Grundsatz für das Projekt

ScrollShield soll nicht möglichst schnell "im Store sein".

ScrollShield soll so veröffentlicht werden, dass wir später sagen können:

> **Wir wissen, welche Funktionen im Build sind, warum jede sensible Berechtigung existiert, welche Daten verarbeitet werden, wie jede kritische Schutzfunktion getestet wurde und welcher konkrete Kandidat diese Tests bestanden hat.**

Erst dann ist aus einem App-Projekt ein veröffentlichbares Produkt geworden.
