# ScrollShield – Entwicklung von A bis Z

Status: **verbindliches Master-Handbuch für Entwicklung, Verifikation und Veröffentlichung**

Letzte fachliche Aktualisierung: **16. August 2026**

Dieses Dokument ist der Einstiegspunkt für die gesamte ScrollShield-Entwicklung. Es beantwortet:

> **Was müssen wir von der Produktidee bis zur veröffentlichten und wartbaren App tun, in welcher Reihenfolge und welcher Nachweis beendet jede Stufe?**

ScrollShield arbeitet mit **15 Entwicklungs-Gates**. Der aktuelle Ist-Stand steht in `docs/DEVELOPMENT_GATES_STATUS.md`. Detailthemen besitzen eigene Spezialdokumente, damit dieses Master-Handbuch kurz genug bleibt, um tatsächlich benutzt zu werden.

---

# 0. Grundregel

Eine Funktion oder Release-Stufe ist nur abgeschlossen, wenn drei Dinge zusammenpassen:

1. **Implementierung** – das Verhalten existiert im tatsächlichen Produktcode.
2. **Verifikation** – Tests oder reale Prüfung belegen das Verhalten.
3. **Evidenz** – der Nachweis gehört eindeutig zur selben Version, Build-Nummer und Commit-SHA.

Source-Code, Dokumentation, ein Source-Checker oder eine grüne UI-Anzeige allein sind kein vollständiger Release-Nachweis.

Für sicherheitsrelevante Zustände gilt:

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

Prüfbare Anforderungen: `docs/PRODUCT_REQUIREMENTS.md`.

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

# 3. Die 15 Entwicklungs-Gates

## G0 – Produkt & Requirements

**Ziel:** Problem, Zielgruppe, v1-Scope, Nicht-Ziele, User Stories und Akzeptanzkriterien festlegen.

Pflicht:

- Produktproblem und Zielgruppe;
- Must-have-/Nicht-Ziele;
- jede v1-Kernfunktion mit messbaren Akzeptanzkriterien;
- keine Store-Claims ohne Build-Funktion;
- reale Nutzerforschung vor breitem Production-Rollout.

Dokumente:

- `docs/PRODUCT_REQUIREMENTS.md`
- `ROADMAP.md`
- `docs/COMPETITIVE_PRODUCT_STRATEGY.md`

G0 bleibt für v1 **TEILWEISE**, bis echte Nutzerforschung dokumentiert ist.

---

## G1 – Architektur & Repo-Prozess

**Ziel:** Verantwortlichkeiten und Änderungspfad vor Feature-Coding festlegen.

```text
src/                      React/TypeScript Produktcode
src/screens/              Screens
src/components/           UI-Komponenten
src/lib/                  Storage, Policies, Bridges, Logik
android/                  natives Android-Projekt
scripts/                  Source-/Release-Verträge
docs/                     Produkt, Technik, Tests, Release
config/                   Release-Freigabe
.github/workflows/         CI
```

Aktueller Release-Pfad:

```text
main
  ^
  |
Draft PR #8
  ^
  |
agent/release-foundation
```

Keine positive Release-Evidence ohne reale Ausführung.

---

## G2 – Datenmodell & Migration

**Ziel:** Datenverlust und stillen Schema-Drift verhindern.

Für neue Funktionen definieren:

- Datentyp/Default/Validierung;
- Verhalten alter Daten;
- Export/Import/Reset;
- Native-Sync;
- Downgrade-/Feature-Deaktivierung.

ScrollShield-Sonderregel: V0.7-/Legacy-Daten dürfen nicht still verloren gehen. Source-Migration, Recovery und bytegenaues Archiv sind bereits stark; das Gate endet erst nach realem V0.7-Gerätetest mit Evidence.

Detail: `docs/DATA_MIGRATION.md`.

---

## G3 – UI/UX & Accessibility

Reihenfolge pro Feature:

1. Zustand und Nutzerziel;
2. Happy Path;
3. Fehlerzustände;
4. Busy/Loading;
5. Empty State;
6. Accessibility;
7. erst danach Animation/Polish.

Prinzipien:

- keine Fake-Erfolgsmeldungen;
- echte Systemzustände statt simulierte Berechtigungen;
- kritische Exit-/Recovery-Aktionen erreichbar;
- keine Trap-UX.

Pflicht-Evidenz umfasst große Schrift, Display Scaling, Tastatur im Emergency Flow, Rotation/Multi Window, TalkBack-Smoke-Test und Beobachtung neuer Nutzer.

---

## G4 – Native Android

Native Android ist der sicherheitskritischste Produktteil.

Aktuell notwendige Manifest-Berechtigungen:

- `RECEIVE_BOOT_COMPLETED`
- `PACKAGE_USAGE_STATS`
- `SYSTEM_ALERT_WINDOW`
- `POST_NOTIFICATIONS`
- `FOREGROUND_SERVICE`
- `FOREGROUND_SERVICE_SPECIAL_USE`

**Bewusste v1-Entscheidung:** `android.permission.INTERNET` ist aus dem Android-Manifest entfernt. ScrollShield v1 besitzt keine dokumentierte Runtime-Netzwerkfunktion; der Privacy-Checker verhindert eine stille Wiedereinführung ohne vorherige Revision des Privacy-/Store-Vertrags.

Weitere Regeln:

- Schutz wird bewusst eingerichtet;
- Foreground Service ist sichtbar;
- sicherer Stop/Exit existiert;
- Permission-Verlust führt zu ehrlichem Zustand;
- Boot/App-Update-Recovery nur bei gültigen Voraussetzungen;
- scoped Package Visibility statt `QUERY_ALL_PACKAGES`;
- kein Accessibility Service in Android v1;
- Whole-App-Scope ehrlich kommunizieren.

Details:

- `docs/NATIVE_ANDROID.md`
- `PERMISSION_MATRIX.md`
- `docs/COMMITMENT_MODE.md`
- `docs/ADAPTIVE_FRICTION.md`

---

## G5 – Security, Privacy & Supply Chain

Pflicht:

- Threat Model;
- P0–P3-Sicherheitsseverity;
- Import-/Eingabevalidierung;
- sichere Exit-Pfade;
- Secret-Schutz;
- minimale Permissions;
- Dependency-Prüfung;
- GitHub Actions auf immutable SHA;
- finaler Dependency-/Manifest-/Binary-Audit;
- Data Safety nach relevanten SDK-Änderungen neu prüfen.

Aktuelle Offline-First-Härtung:

- keine `INTERNET`-Permission im Android-v1-Manifest;
- Production-CSP `connect-src 'self'`;
- Privacy-Checker blockiert `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`, bekannte Tracking-SDKs/-Marker und die erneute Android-INTERNET-Permission.

Details:

- `docs/THREAT_MODEL.md`
- `docs/SUPPLY_CHAIN_SECURITY.md`
- `SECURITY.md`
- `PRIVACY_POLICY_STRUCTURE.md`
- `STORE_PRIVACY_LABELS.md`

---

## G6 – Automatisierte Verifikation

Zentrale Befehle:

```bash
npm ci
npm run verify
cd android
./gradlew testDebugUnitTest assembleDebug --no-daemon --stacktrace
```

`npm run verify` schützt unter anderem Runtime, TypeScript, Lint/Format, Android-Verträge, Lifecycle, Diagnose, Usage Accounting, Protection Config, Commitment, Subscription Safety, Migration, Release Approval, Transparency, SDKs/Notices/Secrets, Store/Privacy, Tests, Production Build, PWA und Bundle Budget.

Ein Source-Checker ersetzt keine Android-Ausführung.

**Aktueller externer Blocker:** GitHub Actions wird derzeit vor Step 1 wegen Account-Billing/Spending-Limit beendet. Bis ein echter Lauf existiert, ist G6 **BLOCKIERT**, nicht bestanden.

Detail: `docs/ENGINEERING_CHECKS.md`.

---

## G7 – Android Instrumentation / E2E

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

Detail: `docs/PERFORMANCE_RELIABILITY.md`.

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

Pflichtszenarien: Permissions, Channel-Verlust, letzte Ziel-App/Regel, Reboot/App-Update/Force Stop, Migration, Commitment, Adaptive Friction, Emergency, 12h/Battery Saver, Uhr/Zeitzone/DST und Accessibility.

Jeder Test gehört zu exakter Version, Build und Candidate SHA.

Detail: `docs/ANDROID_DEVICE_TEST_MATRIX.md`.

---

## G10 – Release Candidate Freeze & Evidence

Sobald Release-Evidence gesammelt wird:

- `versionName` festlegen;
- `versionCode` festlegen;
- Candidate Commit SHA festhalten;
- danach keine heimlichen Produktänderungen.

`config/release-approval.json` verwendet Evidence-Schema v2. Ein positives Flag braucht passende Candidate SHA und konkrete Evidence-Referenz.

Nach finalem Candidate-Test darf nur die Approval-Datei fortgeschrieben werden. Jede andere Produkt-/Releaseänderung verlangt einen neuen Kandidaten und Retest.

Detail: `docs/RELEASE_EVIDENCE.md`.

---

## G11 – Legal, Privacy & Support

Vor Store-Einreichung:

- reale Entwickler-/Verantwortlichenangaben;
- verifizierte Support-Mailbox;
- öffentliche Privacy URL;
- App-interner Privacy-Zugang;
- Daten-/Permission-Erklärungen;
- keine Platzhalter;
- finale Angaben gegen signierten Build prüfen.

---

## G12 – Store / Google Play Review

Benötigt:

- Store Listing/Assets;
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

Play-Regeln sind zeitabhängig und werden vor jedem Release erneut gegen offizielle Quellen geprüft.

---

## G13 – Signing, AAB, Internal & Closed Testing

- Keystore niemals committen;
- sichere Backups;
- Play App Signing bewusst konfigurieren;
- Package-ID vor erstem öffentlichen Release endgültig bestätigen;
- finalen Manifest-/Dependency-/Permission-Snapshot archivieren.

Testtracks:

1. Internal Testing;
2. Closed Testing;
3. erst danach Production.

Kontoabhängige Play-Testanforderungen werden in der eigenen Console erneut bestätigt.

---

## G14 – Production Rollout & Operations

Nicht direkt 100 % ausrollen.

- kleiner Rollout;
- Android Vitals/Support beobachten;
- bei kritischer Verschlechterung pausieren;
- stufenweise erhöhen.

P0/P1 kann Rollout stoppen. Ein Hotfix ist ein neuer Kandidat mit neuer `versionCode`, Candidate SHA und passender Regression/Evidence.

Details:

- `docs/ROLLOUT_PLAN.md`
- `docs/INCIDENT_RESPONSE.md`

---

# 4. Definition of Done – einzelnes Feature

Ein Feature ist erst fertig, wenn:

- [ ] Produktanforderung/User Story oder bewusste Scope-Erweiterung dokumentiert ist.
- [ ] Akzeptanzkriterien definiert sind.
- [ ] Datenmodell/Default/Validierung definiert sind.
- [ ] Migrations-/Bestandsdatenwirkung geprüft ist.
- [ ] Happy Path und Fehler-/Busy-/Empty-Zustände funktionieren.
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
- [ ] Package-ID und Version Name/Code final sind.
- [ ] Requirements/Claims zum Build passen.
- [ ] `npm ci` und `npm run verify` vollständig erfolgreich sind.
- [ ] Android JUnit und `assembleDebug` erfolgreich sind.
- [ ] kritische Android-Instrumentation erfolgreich ist.
- [ ] Debug APK auf echter Hardware läuft.
- [ ] Physical Device Matrix vollständig ist.
- [ ] Lifecycle-/Commitment-/Adaptive-Fälle je aktivem Feature bestanden sind.
- [ ] V0.7-Migration und Export/Reset/Import real validiert sind.
- [ ] 12h-/Performance-/Reliability-Evidence vorliegt.
- [ ] Threat-Model-Blocker geschlossen sind.
- [ ] Dependency-/Manifest-/Supply-Chain-Audit vorliegt.
- [ ] Privacy Policy öffentlich erreichbar und final ist.
- [ ] Support-/Legal-Angaben final sind.
- [ ] Store Listing/Screenshots zum finalen Build passen.
- [ ] Data Safety und Permission-/FGS-Deklarationen gegen finalen Binary geprüft sind.
- [ ] Reviewer-Videos denselben Kandidaten zeigen.
- [ ] signierter AAB geprüft ist.
- [ ] erforderliche Play-Testtrack-Bedingungen erfüllt sind.
- [ ] Release Evidence kandidatgebunden vollständig ist.
- [ ] `npm run release:gate` erfolgreich ist.
- [ ] verantwortliche Person freigegeben hat.
- [ ] Incident-/Rollback-/Hotfix-Bereitschaft besteht.

---

# 6. Pflichtdokumente

## Master / Status

- `docs/APP_DEVELOPMENT_A_TO_Z.md`
- `docs/DEVELOPMENT_GATES_STATUS.md`

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

## Security / Privacy / Supply Chain

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

1. G0 Requirements formal halten und User-Research-Evidence vorbereiten.
2. G5 Security/Supply-Chain weiter schließen.
3. G8 Performance-/Retention-Vertrag in Source/Tests übersetzen.
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

> **Wir wissen, welche Funktionen im Build sind, welche Anforderungen sie erfüllen, welche Daten und Berechtigungen sie berühren, welche Risiken existieren, wie jede kritische Funktion getestet wurde und welcher konkrete Kandidat diese Nachweise bestanden hat.**

Erst dann ist ScrollShield ein veröffentlichbares und wartbares Produkt.
