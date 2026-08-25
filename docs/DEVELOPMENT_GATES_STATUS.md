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
| G4 | Native Android Schutz | **TEILWEISE** | atomare System-/Terminal-Stopps, persistenter Start-Handshake, logisch geordnete Lifecycle-Grenzen, serialisierte Start-/Stop-Dispatches, bounded controlled-destroy Token und generationgebundene Notification-Stop-Aktionen sind im Source implementiert; reale Ausführung fehlt | Android JUnit + Instrumentation + `assembleDebug` + LIFE-12..15/DISPATCH-01..05/Process-Kill real |
| G5 | Security / Privacy / Supply Chain | **TEILWEISE** | Threat Model, Offline-First-Manifest, Privacy-Guard, gepinnter Gradle-SHA256 und `check:supply-chain` existieren; finaler Dependency/SBOM/Binary-Audit fehlt | echter Supply-Chain-Check + Dependency-/Manifest-Snapshot + finaler Binary-Audit + Threat-Review |
| G6 | Automatisierte Verifikation | **BLOCKIERT** | `npm run verify` inklusive `check:native-stop-atomicity`, `check:start-handshake`, `check:lifecycle` und `check:android-instrumentation` ist vorbereitet; GitHub Runner liefert weiterhin keine ausgeführten Steps | kompletter echter Verify-Lauf auf exaktem Head |
| G7 | Android Instrumentation/E2E | **TEILWEISE** | App-/Notification-, Prerequisite-, Boot/Update-, Start-/Destroy-, Process-Loss-, Start↔Stop-, Service-Dispatch- und stale-PendingIntent-Verträge existieren; echte Android-Ausführung fehlt | `connectedDebugAndroidTest` + LIFE-12..15 + DISPATCH-01..05 + Pre-/Post-Confirmation-Process-Kill real |
| G8 | Performance & Batterie | **TEILWEISE** | Worker/Coordinator-Architektur und Shutdown-Drain im Source; reale JUnit-/Instrumentation-/Gradle-/Device-Evidenz fehlt | Worker-/Coordinator-JUnit + Usage-Flush-Instrumentation real ausführen + `assembleDebug` + 12h-Baseline |
| G9 | Physical Device Matrix | **FEHLT** | Matrix inklusive LIFE-12..15 ist definiert; DISPATCH-01..05 sind spezifiziert, aber reale Geräte-Evidence fehlt | Pflichtgeräte/Szenarien mit Build-ID, Diagnose-JSON, Logcat und Screenrecord vollständig dokumentieren |
| G10 | Release Candidate Freeze & Evidence | **BLOCKIERT** | Evidence-Schema v2 existiert; Candidate darf vor G6–G9 nicht final eingefroren werden | exakte Kandidaten-SHA + echte Referenzen |
| G11 | Legal / Privacy / Support | **TEILWEISE** | Dokumente/Struktur existieren; finale reale Identität, Support-Mailbox und öffentliche Privacy-Domain fehlen | keine Platzhalter + überprüfbare öffentliche Angaben |
| G12 | Store / Play Review | **TEILWEISE** | Submission Packet, Screenshots und Deklarationstexte vorbereitet; finaler AAB/Reviewer-Nachweis fehlt | gegen signierten AAB verifizierte Angaben + Videos |
| G13 | Signing / Binary / Internal & Closed Test | **BLOCKIERT** | Release-Gate blockiert bewusst; kein final signierter freigegebener Kandidat | Gate PASS → AAB → Internal/Closed Test |
| G14 | Production Rollout & Operations | **BLOCKIERT** | Rollout- und Incident-Response-Prozess existieren; Produktion darf vor G13 nicht beginnen | Produktionsfreigabe + gestaffelter Rollout + benannte Verantwortliche |

## Aktueller Lifecycle-/Dispatch-Vertrag

- System-/Terminal-Stopps bleiben atomar und source-guarded.
- `recordProtectionStartRequested(...)` persistiert `enabled=true + lastStartRequestAt` gemeinsam.
- `recordProtectionServiceStarted(...)` liefert `CONFIRMED`, `SUPERSEDED_BY_STOP` oder `FAILED_CLOSED`; nur `CONFIRMED` darf `RUNNING=true` erreichen.
- Lifecycle-Grenzen werden logisch monoton geordnet; Material Clock Rollback kann `start-pending` nicht dauerhaft festhalten.
- Globale Dispatch-Reihenfolge: `ProtectionServiceDispatchGuard.LOCK → EVENT_LOCK`.
- Startpersistenz und Android-Startdispatch sowie Stop-Persistenz und `stopService()` werden gemeinsam serialisiert.
- Controlled-stop Destroy-Suppression ist process-lokal, one-shot und auf 30 Sekunden `System.nanoTime()` begrenzt.
- Same-Instance-Restart überträgt die aktuelle Request-Generation auf die lebende Service-Instanz.
- Ein altes `explicitStopRequested=true` darf einen späteren echten Destroy einer neu bestätigten Generation nicht maskieren.

### Generationgebundene Notification-Aktion

Die Foreground-Notification trägt im Stop-`PendingIntent`:

```text
EXTRA_STOP_START_REQUEST_AT = serviceStartRequestAtOnCreate
```

Ein `ACTION_STOP` ist nur gültig, wenn:

```text
actionStartRequestAt > 0
UND
actionStartRequestAt == serviceStartRequestAtOnCreate
UND
actionStartRequestAt == latestStartRequestAt
```

Fehlende oder alte Generationen werden vor jeder `notification_action_stop`-Persistenz ignoriert. Nach Same-Instance-Restart wird die Notification auf die neue Generation aktualisiert.

Source-/JUnit-Schutz:

- `check:start-handshake`;
- `check:lifecycle`;
- `ProtectionServiceLifecyclePolicyTest.notificationStopIsAcceptedOnlyForCurrentLifecycleGeneration`;
- `docs/PROTECTION_SERVICE_DISPATCH_RACES.md` mit `DISPATCH-05`;
- `docs/ANDROID_DEVICE_TEST_MATRIX.md` mit `LIFE-15`.

## Aktueller Arbeitsfokus

1. G6 extern entsperren und `npm run verify` auf exaktem Head ausführen.
2. Android JUnit + `assembleDebug`.
3. `connectedDebugAndroidTest`.
4. LIFE-12 bis LIFE-15 real ausführen.
5. DISPATCH-01 bis DISPATCH-05 real ausführen.
6. Pre-/Post-Confirmation Process Loss real prüfen.
7. App-/aktuelle Notification-/Start-/Destroy-/Boot-/Permission-/Target-App-Pfade real prüfen.
8. G8 Worker/Coordinator/Usage-Flush + 12h-Baseline.
9. G9 vollständige Physical Device Matrix.
10. G2/G5/G0/G3: Migration, Security-Audit, User Research und Accessibility-Evidence.

## Aktuelle CI-Grenze

GitHub Actions liefert auf diesem Draft-Branch weiterhin auf den zuletzt geprüften Heads einen `verify`-Job ohne ausgeführte Steps. **Exakte mutable Head-/Run-/Job-IDs werden ausschließlich in PR #8 geführt**, damit committed Statusdokumente nicht durch ihren eigenen Commit sofort veralten.

Damit sind insbesondere **nicht als bestanden belegt**:

- `npm run verify`;
- `check:native-stop-atomicity`;
- `check:start-handshake`;
- `check:lifecycle`;
- `check:android-instrumentation`;
- Android JUnit;
- Android Instrumentation;
- Gradle Debug Build / APK;
- LIFE-12 bis LIFE-15;
- DISPATCH-01 bis DISPATCH-05;
- reale `start-pending`-/`start-interrupted`-/`unclean-process-stop`-/PendingIntent-Evidence.

## Änderungsregel

Nach jedem größeren Repo-Block:

1. Gate-Status neu bewerten;
2. nur mit realer Evidenz auf `FERTIG` setzen;
3. neue Blocker konkret eintragen;
4. nächsten Arbeitsblock aus dem frühesten sinnvoll bearbeitbaren offenen Gate wählen;
5. PR bleibt Draft, bis die Release-Gates erfüllt sind.
