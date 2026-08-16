# ScrollShield – Entwicklungs-Gates und Live-Status

Status: **lebende Projektsteuerung**

Letzte Aktualisierung: **16. August 2026**

Dieses Dokument beantwortet nicht „Was wäre irgendwann sinnvoll?“, sondern: **Wo steht ScrollShield jetzt, was ist belegt und was ist der nächste erlaubte Schritt?**

## Statusregeln

- **FERTIG** = Implementierung + passende Verifikation/Evidenz liegen für die Stufe ausreichend vor.
- **TEILWEISE** = wesentliche Arbeit existiert, aber mindestens ein Pflichtnachweis oder Teilbereich fehlt.
- **FEHLT** = die Stufe ist noch nicht ausreichend implementiert.
- **BLOCKIERT** = die Stufe kann aktuell nicht abgeschlossen werden, weil eine externe oder vorgelagerte Voraussetzung fehlt.

Ein grüner Source-Checker allein macht ein Gate nicht automatisch `FERTIG`, wenn reale Android-Ausführung gefordert ist.

## Gate-Übersicht

| Gate | Bereich | Status | Warum | Nächster konkreter Abschlussnachweis |
|---|---|---|---|---|
| G0 | Produktproblem & v1-Scope | **TEILWEISE** | Scope ist klar; formale Requirements wurden jetzt ergänzt; reale Nutzerforschung fehlt | 5–8 beobachtete neue Nutzer + dokumentierte Ergebnisse |
| G1 | Architektur & Repo-Prozess | **FERTIG** | React/TS, lokale Daten, Capacitor/Native Android, Draft-PR-Prozess und klare Verantwortungsgrenzen sind dokumentiert | bei Architekturänderung erneut öffnen |
| G2 | Datenmodell & Migration | **TEILWEISE** | sehr starke transaktionale/V0.7-Migration im Source; reale Alt-Daten-Evidenz fehlt | echter V0.7-Upgrade-Test + bytegenauer Archivvergleich |
| G3 | Kern-UI/UX & Accessibility | **TEILWEISE** | Release-Screens und Source-A11y-Checks existieren; reale Usability-/Large-Font-/TalkBack-Evidenz fehlt | physische Accessibility- und Nutzer-Tests |
| G4 | Native Android Schutz | **TEILWEISE** | Usage Access, Overlay, FGS, Regeln, Recovery und Diagnostik sind implementiert; Build/Instrumentation/Device-Evidenz fehlt | JUnit + `assembleDebug` + kritische Instrumentation + reale Geräte |
| G5 | Security / Threat Model / Privacy | **TEILWEISE** | Permissions, CSP, Secret-Checks, lokale Daten und Safe-Shutdown existieren; systematisches Threat Model/Supply-Chain-Gate wird ergänzt | Threat-Model-Review + Dependency/Binary-Audit |
| G6 | Automatisierte Verifikation | **BLOCKIERT** | `npm run verify` und Android-Stufen sind vorbereitet; GitHub Runner stoppt vor Step 1 wegen Billing/Spending-Limit | kompletter echter Verify-Lauf auf exaktem Head |
| G7 | Android Instrumentation/E2E | **FEHLT** | `androidTest` besitzt überwiegend Grundstruktur; kritische Runtime-Flows sind noch nicht ausreichend automatisiert | Service-/Overlay-/Permission-/Recovery-Instrumentation |
| G8 | Performance & Batterie | **TEILWEISE** | Bundle-Budget existiert; native CPU/Polling/Memory/12h-Batterie besitzen noch keine belastbare Grenzwert-Evidenz | Performance-Baseline + 12h OEM-Tests |
| G9 | Physical Device Matrix | **FEHLT** | Matrix ist definiert, aber nicht vollständig ausgeführt | Pflichtgeräte und Szenarien mit Build-ID/Evidenz vollständig PASS/BLOCKED dokumentieren |
| G10 | Release Candidate Freeze & Evidence | **BLOCKIERT** | Evidence-Schema v2 existiert; Candidate darf vor G6–G9 nicht als final getestet eingefroren werden | exakte Kandidaten-SHA + echte Referenzen |
| G11 | Legal / Privacy / Support | **TEILWEISE** | Dokumente/Struktur existieren; finale reale Identität, Support-Mailbox und öffentliche Privacy-Domain fehlen | keine Platzhalter + überprüfbare öffentliche Angaben |
| G12 | Store / Play Review | **TEILWEISE** | Submission Packet, Screenshots und Deklarationstexte vorbereitet; finaler AAB/Reviewer-Nachweis fehlt | gegen signierten AAB verifizierte Angaben + Videos |
| G13 | Signing / Binary / Internal & Closed Test | **BLOCKIERT** | Release-Gate blockiert bewusst; kein final signierter freigegebener Kandidat | Gate PASS → AAB → Internal/Closed Test |
| G14 | Production Rollout & Operations | **BLOCKIERT** | Rollout-/Hotfix-Plan existiert; Produktion darf vor G13 nicht beginnen | Produktionsfreigabe + gestaffelter Rollout + Incident-Bereitschaft |

## Aktueller Arbeitsfokus

### Jetzt aktiv

1. **G0 vervollständigen:** formale Produktanforderungen, User Stories, Akzeptanzkriterien und Nutzerforschungsplan.
2. **G5 vervollständigen:** Threat Model, Supply-Chain-Regeln und Security-Definition-of-Done.
3. **G8 definieren:** konkrete Performance-/Batterie-Messgrößen, bevor physische Tests beginnen.
4. **G6 extern entsperren:** GitHub Actions Billing/Spending-Limit korrigieren; danach sofort vollständigen Verify-Lauf wiederholen.

### Nicht jetzt anfangen

- kaufbares Pro-Abo;
- Cloud-Sync;
- iOS-Parität;
- Reels-only Accessibility Service;
- weitere große Produktblöcke, die G6–G9 noch weiter nach hinten schieben.

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
4. nächsten Arbeitsblock aus dem frühesten offenen Gate wählen;
5. PR bleibt Draft, bis die Release-Gates erfüllt sind.
