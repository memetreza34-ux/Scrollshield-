# ScrollShield – Entwicklungs-Gates und Live-Status

Status: **lebende Projektsteuerung**

Letzte Aktualisierung: **25. August 2026**

Dieses Dokument beantwortet: **Wo steht ScrollShield jetzt, was ist belegt und was ist der nächste erlaubte Schritt?**

## Statusregeln

- **FERTIG** = Implementierung + passende Verifikation/Evidenz liegen für die Stufe ausreichend vor.
- **TEILWEISE** = wesentliche Arbeit existiert, aber mindestens ein Pflichtnachweis oder Teilbereich fehlt.
- **FEHLT** = die Stufe ist noch nicht ausreichend implementiert.
- **BLOCKIERT** = die Stufe kann aktuell nicht abgeschlossen werden, weil eine externe oder vorgelagerte Voraussetzung fehlt.

Ein Source-Checker oder vorbereiteter Test allein macht ein Gate nicht `FERTIG`, wenn reale Android-Ausführung gefordert ist.

## Gate-Übersicht

| Gate | Bereich | Status | Warum | Nächster konkreter Abschlussnachweis |
|---|---|---|---|---|
| G0 | Produktproblem & v1-Scope | **TEILWEISE** | `PRODUCT_REQUIREMENTS.md` formalisiert PR-01..18; `USER_RESEARCH.md` definiert echte Erstnutzungsaufgaben; reale Sessions fehlen | 5–8 beobachtete neue Nutzer + dokumentierte Ergebnisse |
| G1 | Architektur & Repo-Prozess | **FERTIG** | React/TS, lokale Daten, Capacitor/Native Android, Draft-PR-Prozess und Verantwortungsgrenzen sind dokumentiert | bei Architekturänderung erneut öffnen |
| G2 | Datenmodell & Migration | **TEILWEISE** | starke transaktionale/V0.7-Migration im Source; reale Alt-Daten-Evidenz fehlt | echter V0.7-Upgrade-Test + bytegenauer Archivvergleich |
| G3 | Kern-UI/UX & Accessibility | **TEILWEISE** | Release-Screens und Source-A11y-Checks existieren; reale Usability-/Large-Font-/TalkBack-Evidenz fehlt | physische Accessibility- und User-Research-Sessions |
| G4 | Native Android Schutz | **TEILWEISE** | atomare System-Stops mit Warn-Event, atomare explizite Terminal-Stopps ohne Warn-Event und repo-weiter Native-Stop-Atomicity-Guard sind im Source implementiert; reale Ausführung fehlt | Android JUnit + Instrumentation + `assembleDebug` + reale Geräte |
| G5 | Security / Privacy / Supply Chain | **TEILWEISE** | Threat Model, Offline-First-Manifest, Privacy-Guard, gepinnter Gradle-SHA256 und `check:supply-chain` existieren; finaler Dependency/SBOM/Binary-Audit fehlt | echter Supply-Chain-Check + Dependency-/Manifest-Snapshot + finaler Binary-Audit + Threat-Review |
| G6 | Automatisierte Verifikation | **BLOCKIERT** | `npm run verify` inklusive `check:native-stop-atomicity` ist vorbereitet; GitHub Runner stoppt vor Step 1 | kompletter echter Verify-Lauf auf exaktem Head |
| G7 | Android Instrumentation/E2E | **TEILWEISE** | App-/Notification-, Process-Kill-, Permission-, Target-App-, Start-/Destroy- und Boot-/Update-Verträge vorhanden; direkte produktive Stop-Writes außerhalb der zentralen Wrapper werden nun repo-weit durch Source-Guard verhindert; echte Android-Ausführung fehlt | `connectedDebugAndroidTest` real ausführen + App-/Notification-Stopp + Boot/Update-/Prozesskill-/Start-/Destroy-Pfade + Permissions + Ziel-App-Verlust bestätigen |
| G8 | Performance & Batterie | **TEILWEISE** | Worker/Coordinator-Architektur und Shutdown-Drain im Source; reale JUnit-/Instrumentation-/Gradle-/Device-Evidenz fehlt | Worker-/Coordinator-JUnit + Usage-Flush-Instrumentation real ausführen + `assembleDebug` + 12h-Baseline |
| G9 | Physical Device Matrix | **FEHLT** | Matrix ist definiert, aber nicht vollständig ausgeführt | Pflichtgeräte/Szenarien mit Build-ID/Evidenz vollständig dokumentieren |
| G10 | Release Candidate Freeze & Evidence | **BLOCKIERT** | Evidence-Schema v2 existiert; Candidate darf vor G6–G9 nicht final eingefroren werden | exakte Kandidaten-SHA + echte Referenzen |
| G11 | Legal / Privacy / Support | **TEILWEISE** | Dokumente/Struktur existieren; finale reale Identität, Support-Mailbox und öffentliche Privacy-Domain fehlen | keine Platzhalter + überprüfbare öffentliche Angaben |
| G12 | Store / Play Review | **TEILWEISE** | Submission Packet, Screenshots und Deklarationstexte vorbereitet; finaler AAB/Reviewer-Nachweis fehlt | gegen signierten AAB verifizierte Angaben + Videos |
| G13 | Signing / Binary / Internal & Closed Test | **BLOCKIERT** | Release-Gate blockiert bewusst; kein final signierter freigegebener Kandidat | Gate PASS → AAB → Internal/Closed Test |
| G14 | Production Rollout & Operations | **BLOCKIERT** | Rollout- und Incident-Response-Prozess existieren; Produktion darf vor G13 nicht beginnen | Produktionsfreigabe + gestaffelter Rollout + benannte Verantwortliche |

## Aktueller Native-Stop-Vertrag

- `recordProtectionSystemStop(...)`: atomar `enabled=false + warning/system + timestamp + code + message`.
- `recordProtectionTerminalStop(...)`: atomar `enabled=false + timestamp + code + message`, ohne Event-Queue-Änderung.
- `persistProtectionSystemStopWithFallback(...)` und `persistProtectionTerminalStopWithFallback(...)` sind die einzigen erlaubten Atomic-First-Fallback-Wrapper.
- Direkte `setProtectionEnabled(...false)`-/`recordProtectionStop(...)`-Kombinationen sind außerhalb dieser beiden Commit-Failure-Fallbacks produktiv nicht erlaubt.
- `scripts/check-native-stop-atomicity.ts` scannt rekursiv alle produktiven Java-Dateien und erzwingt diesen Vertrag repo-weit.
- Der Checker ist Bestandteil von `npm run verify` und `npm run readiness`.
- Detaillierte Spezifikation: `docs/NATIVE_STOP_ATOMICITY.md`.

## Aktueller Arbeitsfokus

1. **G6 extern entsperren:** vollständigen Verify-Lauf auf dem exakten Head ausführen.
2. **G7 App-/Notification-Stopp real prüfen:** `manual_app_stop` / `notification_action_stop`, `enabled=false`, exakte Nachricht, kein neues `warning/system`-Event.
3. **G7 technische Start-/Destroy-Fehler real prüfen:** `start_failed` bzw. `unexpected_service_destroy` mit Warn-Event und ohne Diagnose-Overwrite.
4. **G7 Process-Kill-/Recovery-Evidence:** `unclean-process-stop` → `Schutz wiederherstellen` → `active`.
5. **G7 Boot/App-Update, First-Start-Preflight, Permission-Loss und Target-App-Verlust real ausführen.**
6. **G8:** Worker-/Coordinator-JUnit, Usage-Flush-Instrumentation, Build und 12h-Baseline.
7. **G9:** Physical Device Matrix.
8. **G2:** reale V0.7-Migration.
9. **G5:** finaler Dependency-/SBOM-/Binary-Audit.
10. **G0/G3:** reale User-Research-/Accessibility-Sessions.

## Aktuelle CI-Grenze

Head: `143c130138e85cca11bac8ffda98df26e65f9249`

Verify **#1292** (`32807930008`) wurde registriert. Job `verify` (`97681544085`) endete mit `steps: null`.

Damit sind insbesondere **nicht als bestanden belegt**:

- `npm run verify`;
- `check:native-stop-atomicity`;
- `check:lifecycle`;
- `check:android-instrumentation`;
- Android JUnit;
- Android Instrumentation;
- Gradle Debug Build;
- APK.

## Änderungsregel

Nach jedem größeren Repo-Block:

1. Gate-Status neu bewerten;
2. nur mit realer Evidenz auf `FERTIG` setzen;
3. neue Blocker konkret eintragen;
4. nächsten Arbeitsblock aus dem frühesten sinnvoll bearbeitbaren offenen Gate wählen;
5. PR bleibt Draft, bis die Release-Gates erfüllt sind.
