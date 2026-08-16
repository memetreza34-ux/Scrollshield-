# ScrollShield – Entwicklungs-Gates und Live-Status

Status: **lebende Projektsteuerung**

Letzte Aktualisierung: **16. August 2026**

Dieses Dokument beantwortet: **Wo steht ScrollShield jetzt, was ist belegt und was ist der nächste erlaubte Schritt?**

## Statusregeln

- **FERTIG** = Implementierung + passende Verifikation/Evidenz liegen für die Stufe ausreichend vor.
- **TEILWEISE** = wesentliche Arbeit existiert, aber mindestens ein Pflichtnachweis oder Teilbereich fehlt.
- **FEHLT** = die Stufe ist noch nicht ausreichend implementiert.
- **BLOCKIERT** = die Stufe kann aktuell nicht abgeschlossen werden, weil eine externe oder vorgelagerte Voraussetzung fehlt.

Ein grüner Source-Checker allein macht ein Gate nicht automatisch `FERTIG`, wenn reale Android-Ausführung gefordert ist.

## Gate-Übersicht

| Gate | Bereich | Status | Warum | Nächster konkreter Abschlussnachweis |
|---|---|---|---|---|
| G0 | Produktproblem & v1-Scope | **TEILWEISE** | `PRODUCT_REQUIREMENTS.md` formalisiert PR-01..18; `USER_RESEARCH.md` definiert echte Erstnutzungsaufgaben; reale Sessions fehlen | 5–8 beobachtete neue Nutzer + dokumentierte Ergebnisse |
| G1 | Architektur & Repo-Prozess | **FERTIG** | React/TS, lokale Daten, Capacitor/Native Android, Draft-PR-Prozess und Verantwortungsgrenzen sind dokumentiert | bei Architekturänderung erneut öffnen |
| G2 | Datenmodell & Migration | **TEILWEISE** | sehr starke transaktionale/V0.7-Migration im Source; reale Alt-Daten-Evidenz fehlt | echter V0.7-Upgrade-Test + bytegenauer Archivvergleich |
| G3 | Kern-UI/UX & Accessibility | **TEILWEISE** | Release-Screens und Source-A11y-Checks existieren; reale Usability-/Large-Font-/TalkBack-Evidenz fehlt | physische Accessibility- und User-Research-Sessions |
| G4 | Native Android Schutz | **TEILWEISE** | Usage Access, Overlay, FGS, Regeln, Recovery und Diagnostik sind implementiert; unnötige `INTERNET`-Permission wurde entfernt; Build/Instrumentation/Device-Evidenz fehlt | JUnit + `assembleDebug` + kritische Instrumentation + reale Geräte |
| G5 | Security / Privacy / Supply Chain | **TEILWEISE** | Threat Model, P0–P3, Supply-Chain-Vertrag, Offline-First-Manifest und Privacy-Guard existieren; finaler Dependency/SBOM/Binary-Audit fehlt | Dependency-/Manifest-Snapshot + finaler Binary-Audit + Threat-Review |
| G6 | Automatisierte Verifikation | **BLOCKIERT** | `npm run verify` und Android-Stufen sind vorbereitet; GitHub Runner stoppt vor Step 1 wegen Billing/Spending-Limit | kompletter echter Verify-Lauf auf exaktem Head |
| G7 | Android Instrumentation/E2E | **FEHLT** | `androidTest` besitzt überwiegend Grundstruktur; kritische Runtime-Flows sind noch nicht ausreichend automatisiert | Service-/Overlay-/Permission-/Recovery-Instrumentation |
| G8 | Performance & Batterie | **TEILWEISE** | Messvertrag + Native-Persistenz-Audit + pure Retention-Policy/JUnit existieren; Verdrahtung, Flush-Worker, CPU/Memory/12h-Evidenz fehlen | Android-JUnit/Build → Retention verdrahten → Flush-I/O härten → 12h-Baseline |
| G9 | Physical Device Matrix | **FEHLT** | Matrix ist definiert, aber nicht vollständig ausgeführt | Pflichtgeräte/Szenarien mit Build-ID/Evidenz vollständig dokumentieren |
| G10 | Release Candidate Freeze & Evidence | **BLOCKIERT** | Evidence-Schema v2 existiert; Candidate darf vor G6–G9 nicht final eingefroren werden | exakte Kandidaten-SHA + echte Referenzen |
| G11 | Legal / Privacy / Support | **TEILWEISE** | Dokumente/Struktur existieren; finale reale Identität, Support-Mailbox und öffentliche Privacy-Domain fehlen | keine Platzhalter + überprüfbare öffentliche Angaben |
| G12 | Store / Play Review | **TEILWEISE** | Submission Packet, Screenshots und Deklarationstexte vorbereitet; finaler AAB/Reviewer-Nachweis fehlt | gegen signierten AAB verifizierte Angaben + Videos |
| G13 | Signing / Binary / Internal & Closed Test | **BLOCKIERT** | Release-Gate blockiert bewusst; kein final signierter freigegebener Kandidat | Gate PASS → AAB → Internal/Closed Test |
| G14 | Production Rollout & Operations | **BLOCKIERT** | Rollout- und Incident-Response-Prozess existieren; Produktion darf vor G13 nicht beginnen | Produktionsfreigabe + gestaffelter Rollout + benannte Verantwortliche |

## In diesem Arbeitsblock bereits erledigt

- A–Z-Handbuch auf 15-Gate-System umgestellt.
- `PRODUCT_REQUIREMENTS.md` mit PR-01..PR-18 angelegt.
- `USER_RESEARCH.md` mit UR-01..UR-07 und objektiver Session-Auswertung angelegt.
- `THREAT_MODEL.md` mit Trust Boundaries und P0–P3 angelegt.
- `SUPPLY_CHAIN_SECURITY.md` angelegt und mit Offline-First-Entscheidung synchronisiert.
- `PERFORMANCE_RELIABILITY.md` angelegt.
- `NATIVE_PERSISTENCE_AUDIT.md` mit NP-01..NP-04 angelegt.
- `INCIDENT_RESPONSE.md` angelegt.
- veraltete `PERMISSION_MATRIX.md` an aktuellen Android-v1-Code angepasst.
- `android.permission.INTERNET` aus dem Android-v1-Manifest entfernt.
- `check-privacy-build.ts` blockiert Netzwerk-APIs/Tracker und eine stille Wiedereinführung der INTERNET-Permission.
- `NativeCounterRetentionPolicy.java` + JUnit-Grenztests vorbereitet; noch bewusst nicht an SharedPreferences-Cleanup verdrahtet.

## Aktueller Arbeitsfokus

### Jetzt aktiv

1. **G6 extern entsperren:** GitHub Actions Billing/Spending-Limit korrigieren; danach sofort vollständigen Verify-/Android-JUnit-/Debug-Build ausführen.
2. **G8 nach erfolgreichem Build:** Retention-Policy sicher an Native-Cleanup verdrahten und periodischen Usage-Flush vom blockierenden Main-Thread-I/O entkoppeln.
3. **G7:** kritische Android-Instrumentation für Service/Overlay/Permission/Recovery ausbauen.
4. **G0/G3:** reale User-Research-/Accessibility-Sessions durchführen, sobald ein installierbarer stabiler Debug-Kandidat existiert.

### Nicht jetzt anfangen

- kaufbares Pro-Abo;
- Cloud-Sync;
- iOS-Parität;
- Reels-only Accessibility Service;
- weitere große Produktblöcke, die G6–G9 weiter nach hinten schieben.

## Gate-Abhängigkeiten

```text
G0 Produkt
  ↓
G1 Architektur
  ↓
G2 Daten ──────────┐
G3 UX              │
G4 Native          │
G5 Security        │
  └──────┬─────────┘
         ↓
G6 Automatisierte Verifikation
         ↓
G7 Instrumentation
         ↓
G8 Performance/Batterie
         ↓
G9 Physical Device Matrix
         ↓
G10 Candidate Freeze + Evidence
         ↓
G11 Legal/Privacy/Support
         ↓
G12 Store/Play Review
         ↓
G13 Signing + Play Tests
         ↓
G14 Production + Operations
```

Parallelisierung ist möglich, aber ein späteres Gate darf kein fehlendes frühes Release-Gate umgehen.

## Änderungsregel

Nach jedem größeren Repo-Block:

1. Gate-Status neu bewerten;
2. nur mit realer Evidenz auf `FERTIG` setzen;
3. neue Blocker konkret eintragen;
4. nächsten Arbeitsblock aus dem frühesten sinnvoll bearbeitbaren offenen Gate wählen;
5. PR bleibt Draft, bis die Release-Gates erfüllt sind.
