# ScrollShield – Entwicklung von A bis Z

Status: **verbindliches Master-Handbuch für Entwicklung, Verifikation und Veröffentlichung**

Letzte fachliche Aktualisierung: **16. August 2026**

Dieses Dokument ist der Einstiegspunkt für die gesamte ScrollShield-Entwicklung. Es beantwortet:

> **Was müssen wir von der Produktidee bis zur veröffentlichten und wartbaren App tun, in welcher Reihenfolge und welcher Nachweis beendet jede Stufe?**

Die frühere lange A–Z-Liste wurde bewusst zu **15 Entwicklungs-Gates** verdichtet. Spezialthemen besitzen eigene Detaildokumente. Dadurch bleibt der Prozess klar, während technische Tiefe nicht verloren geht.

Der aktuelle Live-Status aller Gates steht in `docs/DEVELOPMENT_GATES_STATUS.md`.

---

# 0. Nicht verhandelbare Grundregel

Eine Funktion oder Release-Stufe ist nur abgeschlossen, wenn drei Dinge zusammenpassen:

1. **Implementierung** – das Verhalten existiert im tatsächlichen Produktcode.
2. **Verifikation** – Tests oder reale Prüfung belegen das Verhalten.
3. **Evidenz** – der Nachweis gehört eindeutig zur selben Version, Build-Nummer und Commit-SHA.

Source-Code, Dokumentation, ein Source-Checker oder eine grüne UI-Anzeige allein sind kein vollständiger Release-Nachweis.

Für sicherheitsrelevante Zustände gilt zusätzlich:

> **Die UI darf niemals mehr Schutz behaupten, als Android tatsächlich bestätigt.**

---

# 1. ScrollShield v1 – Produktgrenze

## Problem

Nutzer öffnen Social-, Video- und Entertainment-Apps häufig impulsiv oder länger als beabsichtigt.

## Kernlösung

ScrollShield legt auf Android eine vom Nutzer konfigurierte Entscheidungsebene vor ausgewählte Apps und kann Öffnungspausen, Zeitlimits, Zeitpläne, Fokusregeln, Anti-Binge und weitere lokale Schutzregeln anwenden.

## v1-Plattform

- Android ist die reale Enforcement-Plattform.
- PWA/Web ist Preview-/UI-Basis und kann keine fremden installierten Apps physisch blockieren.
- iOS-Parität ist kein v1-Versprechen.

## Nicht behaupten

- medizinische Sucht-/ADHS-Behandlung;
- psychologische Diagnose;
- zuverlässige Reels-/Shorts-Unterseiten-Erkennung ohne entsprechende Technik;
- manipulationssichere oder unüberwindbare Sperre;
- heimliche Überwachung;
- bereits vorhandene iOS-Parität;
- AI-/ML-Suchtklassifikation;
- kaufbares Pro ohne vollständigen Billing-/Entitlement-Lifecycle.

Die prüfbaren Anforderungen stehen in `docs/PRODUCT_REQUIREMENTS.md`.

---

# 2. Aktuelle technische Basis

## Web/UI

- React 19
- TypeScript 5.8
- Vite 8
- Tailwind CSS 4
- Motion
- Vitest + Testing Library
- PWA / Service Worker

## Mobile

- Capacitor 8
- natives Android-Projekt
- Java 21
- minSdk 24
- compileSdk 36
- targetSdk 36
- Package-ID `app.scrollshield.mobile`

## Architektur

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

React verwaltet Produktzustand, Einstellungen, Historie, Backup und verständliche Darstellung. Native Android ist für echte Berechtigungen, Vordergrund-App-Erkennung, Overlay, laufenden Schutzdienst, Runtime-Entscheidungen und Android-Systemzustand verantwortlich.

---

# 3. Das 15-Gate-System

## G0 – Produkt & Requirements

### Ziel

Problem, Zielgruppe, v1-Scope, Nicht-Ziele, User Stories und messbare Akzeptanzkriterien festlegen.

### Pflicht

- Produktproblem in einem Satz;
- primäre Zielgruppe;
- Must-have-/Nicht-Ziel-Liste;
- jede v1-Kernfunktion mit Akzeptanzkriterien;
- keine Store-Claims ohne Build-Funktion;
- reale Nutzerforschung planen und später durchführen.

### ScrollShield-Dokumente

- `docs/PRODUCT_REQUIREMENTS.md`
- `ROADMAP.md`
- `docs/COMPETITIVE_PRODUCT_STRATEGY.md`

### Gate-Ende

Requirements sind formalisiert. G0 bleibt für v1 so lange **TEILWEISE**, bis reale Nutzerforschung mit neuen Nutzern dokumentiert wurde.

---

## G1 – Architektur & Repo-Prozess

### Ziel

Verantwortlichkeiten und Änderungspfad vor Feature-Coding festlegen.

### Repo-Struktur

```text
src/                      React/TypeScript Produktcode
src/screens/              Screens
src/components/           UI-Komponenten
src/lib/                  Storage, Policies, Bridges, Logik
android/                  natives Android-Projekt
scripts/                  überprüfbare Source-/Release-Verträge
docs/                     Produkt, Technik, Tests, Release
config/                   Release-Freigabe
.github/workflows/         CI
```

### Branch-Regel aktueller Release

```text
main
  ^
  |
Draft PR #8
  ^
  |
agent/release-foundation
```

Keine direkte Produktion aus einem ungetesteten Arbeitsstand. Keine Evidence auf `true`, solange sie nicht real existiert.

---

## G2 – Datenmodell & Migration

### Ziel

Datenverlust und stillen Schema-Drift verhindern.

Für jedes neue Feature vor UI-Arbeit definieren:

- TypeScript-Datentyp;
- Default;
- Validierungsgrenzen;
- alte Daten;
- Export/Import;
- Reset;
- Native-Sync;
- Downgrade-/Deaktivierungsverhalten.

### ScrollShield-Sonderregel

V0.7-/Legacy-Daten besitzen hohen Schutzstatus.

Nicht erlaubt:

- Legacy-Daten still löschen;
- beschädigte Migration als Erfolg markieren;
- alte generierte Regeln automatisch aktivieren;
- bytegenaues Legacy-Archiv überschreiben;
- normale Saves während ungelöster Migration erzwingen.

Details: `docs/DATA_MIGRATION.md`.

### Gate-Ende

Source-Migration + Regressionstests + realer V0.7-Gerätetest + bytegenaue Evidence.

---

## G3 – UI/UX & Accessibility

### Reihenfolge pro Feature

1. Zustand und Nutzerziel;
2. Happy Path;
3. Fehlerzustände;
4. Busy/Loading;
5. Empty State;
6. Accessibility;
7. erst danach Animation/Polish.

### ScrollShield-Prinzipien

- ruhig und klar;
- keine Fake-Erfolgsmeldung;
- reale Systemzustände statt simulierte Berechtigungen;
- kritische Exit-/Recovery-Aktionen erreichbar;
- keine Trap-UX.

### Kritische Statuswahrheit

`running=false` darf nie als aktiver Android-Schutz erscheinen. Ein Stop ist erst bestätigt, wenn Android den Dienst tatsächlich nicht mehr als laufend meldet.

### Pflicht-Evidenz

- React-/Source-A11y;
- große Schrift;
- Display Scaling;
- Tastatur im Emergency Flow;
- Rotation/Multi Window;
- TalkBack Smoke Test;
- neue Nutzer ohne Vorwissen.

---

## G4 – Native Android

Native Android ist der sicherheitskritischste Produktteil.

### Pflichtprinzipien

- Schutz wird bewusst eingerichtet;
- laufender Foreground Service ist sichtbar;
- sicherer Stop/Exit existiert;
- Permission-Verlust führt zu ehrlichem Zustand;
- Boot/App-Update-Recovery nur bei gültigen Voraussetzungen;
- keine breite Package-Inventarisierung;
- Whole-App-Scope ehrlich kommunizieren.

Aktuelle relevante Permissions:

- `INTERNET`
- `RECEIVE_BOOT_COMPLETED`
- `PACKAGE_USAGE_STATS`
- `SYSTEM_ALERT_WINDOW`
- `POST_NOTIFICATIONS`
- `FOREGROUND_SERVICE`
- `FOREGROUND_SERVICE_SPECIAL_USE`

Jede Permission muss technisch, in der UI und im Store dieselbe Begründung besitzen.

Details:

- `docs/NATIVE_ANDROID.md`
- `PERMISSION_MATRIX.md`
- `docs/COMMITMENT_MODE.md`
- `docs/ADAPTIVE_FRICTION.md`

---

## G5 – Security, Privacy & Supply Chain

### Ziel

Nicht nur Features bauen, sondern Trust Boundaries, Missbrauch, Dependencies und reale Privacy-Auswirkungen prüfen.

### Pflicht

- Threat Model;
- P0–P3-Sicherheitsseverity;
- Eingabe-/Import-Validierung;
- sichere Exit-Pfade;
- Secret-Schutz;
- minimale Permissions;
- Dependency-Prüfung;
- GitHub Actions pinnen;
- finaler Dependency-/Manifest-/Binary-Audit;
- Data Safety nach jeder relevanten SDK-Änderung neu prüfen.

Details:

- `docs/THREAT_MODEL.md`
- `docs/SUPPLY_CHAIN_SECURITY.md`
- `SECURITY.md`
- `PRIVACY_POLICY_STRUCTURE.md`
- `STORE_PRIVACY_LABELS.md`

### Besonderer offener Auditpunkt

ScrollShield ist offline-first, besitzt aber `INTERNET`. Vor v1 muss bewusst bestätigt werden, ob die Permission im finalen Android-Produkt technisch benötigt wird. Der signierte AAB darf keine unerwarteten Netzwerk-/SDK-Eigenschaften besitzen.

---

## G6 – Automatisierte Verifikation

Zentraler Befehl:

```bash
npm ci
npm run verify
```

Der Verify-Vertrag umfasst unter anderem:

- Runtime;
- TypeScript/ESLint/Prettier;
- Versionskonsistenz;
- Android-Source-Verträge;
- Device-Matrix-Vertrag;
- Lifecycle;
- Diagnose-Normalisierung;
- Overlay Accessibility;
- Usage Accounting;
- Protection Config;
- Commitment;
- Subscription Safety;
- Migration;
- Release Approval;
- Transparency;
- SDK/Notices/Secrets;
- Store/Privacy;
- Vitest;
- Production Build/PWA;
- Bundle Budget.

Danach Android:

```bash
cd android
./gradlew testDebugUnitTest assembleDebug --no-daemon --stacktrace
```

Ein Source-Checker beweist nur einen Source-Vertrag. Er ersetzt keine Android-Ausführung.

### Aktueller externer Blocker

GitHub Actions wird derzeit vor Step 1 wegen Account-Billing/Spending-Limit beendet. Solange kein echter Lauf stattgefunden hat, ist G6 **BLOCKIERT**, nicht bestanden.

Details: `docs/ENGINEERING_CHECKS.md`.

---

## G7 – Android Instrumentation / E2E

Pure Java-Policies und React-Tests reichen für kritische Android-Systemflüsse nicht allein.

Vor Production ausbauen für:

- Service Lifecycle;
- reale Overlay-Interaktion;
- Permission-Verlust;
- Notification Channel;
- Countdown/Session-Ende;
- Usage Import;
- Boot-/Update-Recovery;
- Package Availability.

`androidTest` darf nicht nur Beispielstruktur bleiben.

---

## G8 – Performance, Batterie & Reliability

Messbereiche:

- App-Start;
- Overlay-Latenz;
- CPU/Polling;
- Speicher;
- SharedPreferences-/Persistenzkosten;
- Retention/Cleanup;
- 12-Stunden-Batterie;
- OEM-Prozesskiller;
- Reboot/Update;
- Zeit-/Zeitzonen-/DST-Grenzen.

Keine erfundenen Batterie-Prozentbudgets. Erst reale Baseline, dann Grenzwert.

Details: `docs/PERFORMANCE_RELIABILITY.md`.

---

## G9 – Physical Device Matrix

Pflichtgeräte/-klassen:

- Pixel/Near Stock;
- Samsung;
- Xiaomi/Redmi;
- OnePlus;
- Motorola;
- Tablet;
- API 24;
- API 26;
- Android 13+.

Pflichtszenarien umfassen unter anderem:

- Permissions erteilen/entziehen;
- Notification Channel verlieren;
- letzte Ziel-App entfernen;
- letzte Regel entfernen;
- Reboot/App-Update/Force Stop;
- Migration;
- Commitment;
- Adaptive Friction;
- Emergency;
- Battery Saver/12h;
- Uhr/Zeitzone/DST;
- Accessibility.

Jeder Test gehört zu exakter Version, Build und Candidate SHA.

Details: `docs/ANDROID_DEVICE_TEST_MATRIX.md`.

---

## G10 – Release Candidate Freeze & Evidence

Sobald ernsthaft Release-Evidence gesammelt wird:

- `versionName` festlegen;
- `versionCode` festlegen;
- Candidate Commit SHA festhalten;
- danach keine heimlichen Produktänderungen.

`config/release-approval.json` verwendet Evidence-Schema v2.

Ein positives Flag braucht:

- passende Candidate SHA;
- konkrete Evidence-Referenz.

Nach finalem Candidate-Test darf nur die Approval-Datei fortgeschrieben werden. Jede andere Produkt-/Releaseänderung verlangt einen neuen Kandidaten und Retest.

Details: `docs/RELEASE_EVIDENCE.md`.

---

## G11 – Legal, Privacy & Support

Vor Store-Einreichung:

- reale Entwickler-/Verantwortlichenangaben;
- verifizierte Support-Mailbox;
- öffentliche Privacy URL;
- App-interner Privacy-Zugang;
- Daten-/Permission-Erklärungen;
- keine Platzhalter;
- finale Angaben gegen den signierten Build prüfen.

Keine Rechts-/Store-Aussage nur aus altem Quellcode übernehmen.

---

## G12 – Store / Google Play Review

Benötigt:

- App-Name und Kategorie;
- Store Listing;
- Icon/Screenshots/ggf. Feature Graphic;
- Content Rating;
- Data Safety;
- App Access;
- Ads Declaration;
- Target Audience;
- Privacy URL;
- Usage Access-/Overlay-/Package-Visibility-/Foreground-Service-Erklärungen;
- Reviewer-Videos.

Store-Marketing darf nur Funktionen des exakten eingereichten Builds bewerben.

Details:

- `docs/STORE_SUBMISSION_PACKET.md`
- `docs/store-assets/`

### Zeitabhängige Regeln

Play-Regeln ändern sich. Vor jedem Release erneut aktuelle offizielle Anforderungen prüfen. Der derzeit dokumentierte Stand ist auf 16. August 2026 datiert; targetSdk 36 ist für die unmittelbar bevorstehende API-Frist bereits vorbereitet.

---

## G13 – Signing, AAB, Internal & Closed Testing

### Signing

- Keystore niemals committen;
- sichere Backups;
- Play App Signing bewusst konfigurieren;
- Package-ID vor erstem öffentlichen Release endgültig bestätigen.

### Artefakte

- Debug APK zum Engineering-Test;
- signierter AAB für Play;
- finalen Manifest-/Dependency-/Permission-Snapshot archivieren.

### Testtracks

1. Internal Testing;
2. Closed Testing;
3. erst danach Production.

Für betroffene neue private Play-Konten muss die eigene Play Console bestätigen, ob die derzeit geltende 12-Tester-/14-Tage-Regel erfüllt werden muss.

---

## G14 – Production Rollout & Operations

Nicht direkt 100 % ausrollen.

### Production

- kleiner Rollout;
- Android Vitals/Support beobachten;
- bei kritischer Verschlechterung pausieren;
- stufenweise erhöhen.

### Incident Response

P0/P1 kann Rollout stoppen. Hotfix ist immer ein neuer Kandidat mit neuer `versionCode`, Candidate SHA und passender Regression/Evidence.

Details:

- `docs/ROLLOUT_PLAN.md`
- `docs/INCIDENT_RESPONSE.md`

---

# 4. Definition of Done – einzelnes Feature

Ein Feature ist erst fertig, wenn:

- [ ] Produktanforderung/User Story vorhanden oder Scope-Erweiterung bewusst dokumentiert ist.
- [ ] Akzeptanzkriterien definiert sind.
- [ ] Datenmodell/Default/Validierung definiert sind.
- [ ] Migrations-/Bestandsdatenwirkung geprüft ist.
- [ ] Happy Path funktioniert.
- [ ] Fehler-/Busy-/Empty-Zustände funktionieren.
- [ ] Accessibility berücksichtigt ist.
- [ ] Persistenz/Import/Export/Reset berücksichtigt sind.
- [ ] Native Android-Auswirkung geprüft ist.
- [ ] Security-/Threat-Model-Auswirkung geprüft ist.
- [ ] Privacy-/Permission-/Store-Auswirkung geprüft ist.
- [ ] Dependency-/Supply-Chain-Auswirkung geprüft ist.
- [ ] Unit-/Integration-/Native-Tests existieren.
- [ ] Instrumentation/Device-Test definiert ist, wenn Android-Systemverhalten betroffen ist.
- [ ] Performance-/Batterieauswirkung berücksichtigt ist, wenn Runtime-Pfade betroffen sind.
- [ ] Dokumentation aktualisiert ist.
- [ ] `npm run verify` auf einem funktionierenden Runner/Setup tatsächlich besteht.

---

# 5. Definition of Done – Release

Ein Release ist erst fertig, wenn:

- [ ] v1-Scope eingefroren ist.
- [ ] Package-ID final ist.
- [ ] Version Name/Code final sind.
- [ ] Requirements/Claims zum Build passen.
- [ ] `npm ci` erfolgreich ist.
- [ ] `npm run verify` vollständig erfolgreich ist.
- [ ] Android JUnit erfolgreich ist.
- [ ] `assembleDebug` erfolgreich ist.
- [ ] kritische Android-Instrumentation erfolgreich ist.
- [ ] Debug APK auf echter Hardware läuft.
- [ ] Physical Device Matrix vollständig ist.
- [ ] Lifecycle-/Commitment-/Adaptive-Fälle je aktivem Feature bestanden sind.
- [ ] V0.7-Migration real validiert ist.
- [ ] Export/Reset/Import real validiert ist.
- [ ] 12h-/Performance-/Reliability-Evidence vorliegt.
- [ ] Threat-Model-Blocker geschlossen sind.
- [ ] Dependency-/Manifest-/Supply-Chain-Audit vorliegt.
- [ ] Privacy Policy öffentlich erreichbar und final ist.
- [ ] Support-Adresse funktioniert.
- [ ] rechtliche Angaben final sind.
- [ ] Store Listing/Screenshots zum finalen Build passen.
- [ ] Data Safety gegen finalen Binary geprüft ist.
- [ ] Foreground-Service-/Permission-Deklarationen final sind.
- [ ] Reviewer-Videos denselben Kandidaten zeigen.
- [ ] signierter AAB geprüft ist.
- [ ] erforderliche Play-Testtrack-Bedingungen erfüllt sind.
- [ ] Release Evidence kandidatgebunden vollständig ist.
- [ ] `npm run release:gate` erfolgreich ist.
- [ ] verantwortliche Person freigegeben hat.
- [ ] Incident-/Rollback-/Hotfix-Bereitschaft besteht.

---

# 6. Pflichtdokumente und Zuständigkeit

## Master / Status

- `docs/APP_DEVELOPMENT_A_TO_Z.md` – Prozess und Reihenfolge
- `docs/DEVELOPMENT_GATES_STATUS.md` – aktueller Ist-Stand

## Produkt

- `docs/PRODUCT_REQUIREMENTS.md`
- `ROADMAP.md`
- `docs/COMPETITIVE_PRODUCT_STRATEGY.md`
- `docs/COMPETITOR_PRODUCT_BLUEPRINT.md`

## Daten

- `docs/DATA_MIGRATION.md`

## Android

- `docs/NATIVE_ANDROID.md`
- `PERMISSION_MATRIX.md`
- `docs/COMMITMENT_MODE.md`
- `docs/ADAPTIVE_FRICTION.md`

## Security / Privacy

- `docs/THREAT_MODEL.md`
- `docs/SUPPLY_CHAIN_SECURITY.md`
- `SECURITY.md`
- `PRIVACY_POLICY_STRUCTURE.md`
- `STORE_PRIVACY_LABELS.md`

## Performance

- `docs/PERFORMANCE_RELIABILITY.md`

## Engineering / Tests

- `docs/ENGINEERING_CHECKS.md`
- `docs/ANDROID_DEVICE_TEST_MATRIX.md`

## Release / Store

- `docs/RELEASE_CHECKLIST.md`
- `docs/RELEASE_EVIDENCE.md`
- `config/release-approval.json`
- `docs/STORE_SUBMISSION_PACKET.md`
- `docs/store-assets/`

## Operations

- `docs/ROLLOUT_PLAN.md`
- `docs/INCIDENT_RESPONSE.md`

---

# 7. Verbindliche Arbeitsreihenfolge ab jetzt

Der nächste Arbeitsblock kommt grundsätzlich aus dem **frühesten offenen Gate**, nicht aus dem spannendsten neuen Feature.

Aktuelle Reihenfolge:

1. G0 Requirements formal halten und User-Research-Evidence vorbereiten.
2. G5 Security/Supply-Chain-Audit weiter schließen.
3. G8 Performance-/Retention-Messvertrag in Source/Tests übersetzen.
4. G6 GitHub-Actions-Blocker extern beheben und vollständigen Verify-Lauf ausführen.
5. Fehler aus G6 reparieren und wiederholen.
6. G7 kritische Android-Instrumentation ausbauen.
7. G9 reale Device-Matrix durchführen.
8. G2 reale V0.7-Migration bytegenau belegen.
9. G8 12h-/OEM-Batterie und Reliability durchführen.
10. erst danach G10 finalen Candidate einfrieren.
11. G11/G12 finale Legal-/Privacy-/Store-Angaben gegen den Kandidaten abschließen.
12. G13 signierten AAB und Play-Testtracks durchführen.
13. G14 gestaffelt veröffentlichen und aktiv begleiten.

Bis G6–G9 belastbar sind, keine unnötigen großen Produktblöcke beginnen, die den Release weiter verschieben.

---

# 8. Wichtigster Projektgrundsatz

ScrollShield soll nicht nur „im Store sein“.

Das Ziel ist:

> **Wir wissen, welche Funktionen im Build sind, welche Anforderungen sie erfüllen, welche Daten und Berechtigungen sie berühren, welche Risiken existieren, wie jede kritische Funktion getestet wurde und welcher konkrete Kandidat diese Nachweise bestanden hat.**

Erst dann ist ScrollShield ein veröffentlichbares und wartbares Produkt.
