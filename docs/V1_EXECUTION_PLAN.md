# ScrollShield — verbindlicher V1-Ausführungsplan

**Plan-Version:** 1.0 · **Stand:** 2026-10-09 · **Ziel:** veröffentlichungsfähige, hochwertige Android-V1

**Produktumfang / Priorität 1:** [`V1_MASTER_PLAN.md`](V1_MASTER_PLAN.md) (der verbindliche Product Contract).  
**Operative Umsetzung / Priorität 2:** dieses Dokument (Aufgaben, Reihenfolge, Qualitätsschranken).  
**Technische Details:** tatsächlicher Code, reproduzierbare Tests und dokumentierte Gerätemessungen.  
**Übersicht:** [`ROADMAP.md`](../ROADMAP.md).  
**Vergleich:** [`COMPETITOR_BASELINE.md`](COMPETITOR_BASELINE.md).  
**Agentenregeln:** [`ENGINEERING_WORKFLOW.md`](ENGINEERING_WORKFLOW.md).

Bei Widersprüchen **nicht stillschweigend neu erfinden**, sondern die betroffenen Aussagen mit Datei/Zeile dokumentieren, eine Entscheidung treffen und erst danach Plan + Code angleichen.

## 0. Fertig-Definition (Definition of Done)

**Ziel ist eine echte, nutzbare Android-App, nicht die höchste Commit-Zahl.**

V1 = fertig, wenn:

1. Die drei Tabs **Heute, Schutz, Einblicke** und alle definierten Free-/Pro-Flows konsistent, visuell hochwertig, barrierearm und vollständig bedienbar sind.
2. Native App-Pause, Zurück/Weiter, Adaptive Reopen, Session Guard, Zeitpläne, Fokus, Rescue, Tagesbudget, Notfallfreigabe und vertrauenswürdige Statistiken auf realen Android-Geräten entsprechend ihrem Entitlement nachweisbar funktionieren.
3. Free = **zwei Apps**, ein Zeitplan, Sanft/Ausgewogen und Fokus 15/30/60. Pro = genau der in `V1_MASTER_PLAN.md` definierte Leistungsumfang; **kein lokales `pro.active` als Zahlungsnachweis**.
4. Google-Play-Käufe, Probephase, Restore, Pending, Kündigung, Ablauf und Widerruf in einem echten Play-Testkanal end-to-end geprüft sind; Preise/Angebote kommen aus dem Store.
5. CI (TypeScript, Lint, Formatierung, Tests, Produktions-Build, Android Debug-Compile/JVM-Tests) grün **und** die physischen Gerätetests dokumentiert sind.
6. Keine falschen Messwerte, unrealistischen Erfolgsgarantien, unerlaubten Berechtigungsversprechen oder nicht verfügbaren Features in App, Website und Store.
7. Marke, App-ID, Play Console, Supportkontakt, Datenschutz-/Anbietertexte, Signierung, Store-Deklarationen, Beta und Release-Freigaben abgeschlossen sind.

**Kein Release**, nur weil TypeScript kompiliert oder GitHub einen Android-Build erzeugt. Ein Feature kann in der UI vorhanden und trotzdem auf echten Geräten defekt sein.

## 1. Eingefrorener Produktumfang

| Free | Pro |
| --- | --- |
| 2 geschützte Apps | Unbegrenzt Apps |
| Startpause + Zurück/Weiter | Individuelle Startpause (5–60 s) |
| Basis-Reopen-Schutz | Erweiterte Reopen-Parameter, Eskalation, Cooldown |
| Sanft, Ausgewogen | Stark, Eigene Regeln |
| 1 Zeitplan | Unbegrenzte Zeitpläne |
| Fokus 15/30/60 | Eigene Fokusdauer + strenger Fokus/Commitment |
| Emergency Unlock | Session Guard, Tagesbudget, Rescue |
| Heute-Metriken | Woche, Vergleich, Reopen-Muster und Trends |
| Lokale Daten, Berechtigungs-/Servicegesundheit, keine Werbung | Enthält alle Free-Funktionen |

**Preisrichtung:** 3,99 €/Monat, 24,99 €/Jahr, 7 Tage Trial für das Jahresangebot; **Anzeige nur aus verifizierter Store-Konfiguration**.

**Außerhalb V1:** Instagram-Reels-/YouTube-Shorts-Feed-Blockierung, produktiver AccessibilityService, iOS, Cloud-Synchronisation, Familien-/Partnerkontrolle, KI-Coach, Gamification, Standortprofile, PDF/CSV-Produktfeatures. Keine Aufwertung von Research-Code zu Produktionsfunktion ohne explizite Produktentscheidung.

## 2. Faktischer Repository-Stand (Audit 2026-10-09)

**Verifiziert anhand von GitHub-Dateien (keine Geräteaussage):**

- `main` enthält die integrierte Android-V1-Codebasis aus PR #16; `docs/V1_MASTER_PLAN.md` v2.1 ist die gültige Spezifikation.
- Drei Tabs und separate Fokus-/Rescue-Screens sind im React-Code vorhanden.
- Native Kotlin-Komponenten enthalten `AppMonitorService.kt`, `ScrollShieldBridgePlugin.kt`, `ReopenPolicy.kt`, `NativeRuntimePolicy.kt`, `InterruptionLog.kt`, `ForegroundUsage.kt`, `BootReceiver.kt`, `SecurePrefs.kt`.
- CI hat Web und Android-JVM/Debug-Kompilierung für den integrativen PR erfolgreich ausgeführt; **kein echter Android-Gerätetest liegt als bestanden vor**.
- Es gibt noch **keine produktive Play-Billing-Abwicklung**; der Paywall-Kaufknopf ist deaktiviert, Pro-Vorschau nur Entwicklungsfunktion.
- PR #20 (`chatgpt/main-runtime-integrity`) ist noch **offen** und beinhaltet u. a. Stale-Overlay-/Reopen-Uhrzeitkorrekturen, Free/Pro-Native-Sicherung, Testfälle und APK-Workflow; **diese Änderungen sind nicht Teil von `main`**.
- GitHub Actions kann zurzeit durch Kontingent-/Runner-Probleme blockiert sein; zuletzt trat zudem ein Speicherlimit beim APK-Artefakt-Upload auf. Fehlende CI-Ausführung ist **nicht** als grün zu deklarieren.
- Einige alte Dokumente (z. B. `docs/RELEASE_CHECKLIST.md`, der `main`-Stand von `OFFENE_PUNKTE.md`) beschreiben noch PWA-first oder Reels als V1. Sie sind **LEGACY, nicht produktentscheidend**. Sie werden aufgeräumt, statt als neue Anforderungen übernommen zu werden.

**Nicht bestätigt:** echte Android-Zuverlässigkeit, visuelle Qualität auf repräsentativen Handys, Play-Store-Abnahme, Zahlungen, Abo-Restore, Nutzermesswerte, OEM-Reboot-Verhalten. Dafür ist eine Abnahme erforderlich.

## 3. Entwicklungsreihenfolge: Priorisierte Arbeitspakete

Statuswerte: `DONE (evidenced)`, `IN REVIEW`, `IN PROGRESS`, `OPEN`, `BLOCKED:OWNER`, `BLOCKED:EXTERNAL`. Nur nach Nachweis ändern; keine groben %-Schätzungen.

### P0 — Wahrheit, sichere Arbeitsbasis und CI (muss zuerst stabil sein)

| ID | Aufgabe / konkreter Codebereich | Status | Abnahme |
| --- | --- | --- | --- |
| [SS-001](https://github.com/memetreza34-ux/Scrollshield-/issues/22) | PR #20 gegen `main` nach echten Checks prüfen, Fehler korrigieren, ggf. mergen | IN REVIEW | TypeScript/UI/JVM/Android-Build nachweisbar grün auf *demselben* Head; keine UI-/Native-Regression |
| [SS-002](https://github.com/memetreza34-ux/Scrollshield-/issues/23) | GitHub Actions Budget/Runner-/Artefaktprobleme diagnostizieren, Debug-APK als optionalen Download oder lokalen Build-Weg bereitstellen | BLOCKED:EXTERNAL | CI führt wieder aus; Kotlin-Build-Erfolg getrennt von Artifact-Upload; dokumentierter lokaler APK-Pfad |
| [SS-003](https://github.com/memetreza34-ux/Scrollshield-/issues/24) | Veraltete Dokumente/Store-Kopien gezielt an den V1-Masterplan angleichen | OPEN | Keine produktionswirksame Reels-/PWA-first-/4-Tab-Aussage mehr; Legacy-Dokumente klar markiert |
| [SS-004](https://github.com/memetreza34-ux/Scrollshield-/issues/24) | Integritätsmatrix für lokale/importierte Pro-Daten und Native Sync abschließen | IN REVIEW | Gespeichertes `pro.active` gewährt in Produktion kein Pro; Free-Limits server-/Store-unabhängig vor Native Sync begrenzt; Tests |
| SS-005 | Sicherheits-/Policy-Audit von Manifest, Overlay, FGS, Berechtigungen und Paketlisten | OPEN | Keine V1-Accessibility-Registrierung; nur notwendige Berechtigungen; dokumentierte aktuelle Google-Play-Anforderungen |

### P1 — Android-Schutz: zuverlässig, schnell, vorhersehbar

| ID | Aufgabe | Status | Abnahme |
| --- | --- | --- | --- |
| SS-101 | Native Contract v1, Update-/Migrationsverhalten und Fehlerkommunikation zwischen TS und Kotlin | CODE PRESENT / NOT DEVICE-VERIFIED | Zwei Apps mit unterschiedlichen Regeln; unbekannte Version sicher behandelt; Neustart |
| SS-102 | Foreground-Transition: echte Öffnung, Back/Home, App-Wechsel, Lockscreen, Multiwindow | CODE PRESENT / NOT DEVICE-VERIFIED | Keine veralteten Overlays, kein Doppeltrigger in derselben Sitzung; reproduzierbare Szenarien |
| SS-103 | Pause-Zurück/Weiter-Overlay: Countdown, Fokus, Navigation, Notfallfreigabe | CODE PRESENT / NOT DEVICE-VERIFIED | Android 12–16 wo verfügbar; Buttons nachweisbar erreichbar; großes Textlayout und TalkBack |
| SS-104 | Berechtigungs- und Dienstzustand als eindeutiges Modell (fehlt/aktiv/gestoppt/eingeschränkt) | OPEN | UI behauptet nie „Schutz aktiv“, wenn Usage Access/Overlay/Service fehlt; Entzug/Regrant getestet |
| SS-105 | Boot/Update/Prozess-Kill/Batterie: Wiederanlauf und Zustandskonsistenz | OPEN | Schutz funktioniert ohne erneutes manuelles Öffnen nach Reboot/Update gemäß dokumentierter OS-Grenzen |
| SS-106 | Performance/Batterie des Monitor-Services und Android-16-Regressionen | OPEN | Protokollierter längerer OEM-Test, keine ANRs und kein unvertretbarer Akkuverbrauch |

### P2 — Signature Engine und korrekte Daten

| ID | Aufgabe | Status | Abnahme |
| --- | --- | --- | --- |
| SS-201 | Adaptive Reopen: persistierter Ledger, Fenster, Eskalation, Obergrenze, Cooldown | CODE PRESENT / NOT DEVICE-VERIFIED | Wiederöffnen erhöht Friktion deterministisch; Uhrzeitänderung/Future Events verursachen keine Fehlsperre |
| SS-202 | Session Guard: zählt ab „Weiter“, re-interveniert während aktiver Sitzung | CODE PRESENT / NOT DEVICE-VERIFIED | Grenzzeit, Bildschirmwechsel, Start/Reset und Uhrzeitänderung getestet |
| SS-203 | Zeitpläne, Wochenende, Mitternacht, DST, Überlappungen, Vorrang | CODE PRESENT / NOT DEVICE-VERIFIED | Regeln wirken ohne WebView im Vordergrund; 21–07, Wochenende, Sommerzeit getestet |
| SS-204 | Emergency Unlock: echte Nutzbarkeit + sichere Tagesgrenzen und Commitment-Regeln | CODE PRESENT / NOT DEVICE-VERIFIED | Countdown, Kontingent, Reset, Sperrprioritäten und sichere Abbruchpfade getestet |
| SS-205 | Focus/Rescue: Laufzeit ohne UI, Strict-Schutz, Sessions über App-Neustart | CODE PRESENT / NOT DEVICE-VERIFIED | 15/30/60, Pro-Sondersitzung, Ablauf, Reboot und Early-Stop je Modus korrekt |
| SS-206 | Ereignisledger & Metrik-Vertrauensklassen (`MEASURED/DERIVED/UNAVAILABLE`) | OPEN | Kein `blockedOpens × x Minuten`; keine Doppelerfassung nach Reopen/Sync/Import; Offline-/Berechtigungszustände |

### P3 — Komplettes Calm-Control-Produktdesign (nicht nur kosmetisch)

Designannahmen aus Masterplan: nahe Schwarzwerte, Zink/Grau/Weiß, **ein** zurückhaltender Emerald-Akzent, saubere Typohierarchie, viel Platz, sparsame Animation. Keine überladenen Karten, Neon, Glows oder Motivations-Gamification.

| ID | Screen / Interaktion | Status | Abnahme |
| --- | --- | --- | --- |
| SS-301 | Designsystem: Farb-/Spacing-/Typo-/Radius-/Motion-Tokens, Buttons/Rows/Sheets | OPEN | Einheitliche Komponenten + belastbare Hell-/Dunkel-Kontraste im festgelegten Dark-first-System; 44–48dp Touchflächen |
| SS-302 | Onboarding und Berechtigungs-Wizard | UI PRESENT / QA OPEN | Verständlicher Nutzen in 30–60 s; echte Permission-Zustände; kein Fake-Setup |
| SS-303 | Heute: Schutzstatus, Hauptkennzahl, Fokus/Rescue, Reopens, nächster Zeitplan | UI PRESENT / QA OPEN | Kernnutzen oberhalb des Folds; metrisch ehrlich; Zustände leer/aktiv/eingeschränkt |
| SS-304 | Schutz: App-Auswahl, 2-App-Grenze, Presets, progressive App-Details | UI PRESENT / QA OPEN | 3.-App-Paywall; einfache Default-Ansicht; technische Regeln sekundär |
| SS-305 | Zeitplan-Editor: Erstellen, Bearbeiten, Überschneidungen und Free-Limit | UI PRESENT / QA OPEN | Keine ungespeicherte oder widersprüchliche Regel; Live-Feedback |
| SS-306 | Fokus-Fullscreen, aktive Sitzung, strenger Fokus, Rescue-Sheet | UI PRESENT / QA OPEN | Start/Laufzeit/Ende/Abbruch, Free/Pro, Zurück/Gesten, Rotation |
| SS-307 | Einblicke: Heute/Woche, Reopen-Trends, korrekte Datenquellen/Leerzustände | UI PRESENT / QA OPEN | Nichts Simuliertes, Pro-Ansicht mit echter Vergleichslogik |
| SS-308 | Einstellungen: Servicegesundheit, Datenschutz, Export/Import, Support, Paywall | UI PRESENT / QA OPEN | Alle Aktionen funktionieren, lokale Daten/Reset konsistent, keine toten Bedienelemente |
| SS-309 | Native Overlay als eigener Design-Teil der Markenwelt | OPEN | Optisch konsistent mit React; Countdown lesbar; Back/Continue eindeutig; Notfallzugang |
| SS-310 | Visuelle QA aller Screens und Zustände auf 360dp/412dp, große Schrift, TalkBack | OPEN | Screenshots/kurze Aufnahmen, kein abgeschnittener Text, Fokus-/Kontrast-/A11y-Checks |

**Design-Freeze-Gate:** erst nach SS-301 + SS-302–310 mit Vergleichsbildern/QA-Notizen. Kein spontanes Wechseln der Farbwelt während der Entwicklung.

### P4 — Vollständige Abonnements (alleiniger zahlungskritischer Pfad)

| ID | Aufgabe | Status | Abnahme |
| --- | --- | --- | --- |
| SS-401 | Billing-Entscheidung: native Google Play Billing + vertrauenswürdige Verifikation oder überprüfter Entitlement-Anbieter | OPEN / OWNER ACCOUNT | Dokumentierte Kosten, Datenschutz, Offline-/Refund-Strategie und SDK/Play-Policy-Folgen |
| SS-402 | Angebotsabfrage: Monats-/Jahresplan, Trial und lokalisierte Store-Preise | OPEN | Kein hardcodierter Live-Preis; fehlende Angebote zeigen klaren Fehlerzustand |
| SS-403 | Kaufen, bestätigen, Pending, abgebrochen, Restore, Manage | OPEN | Lizenztester-Matrix bestanden; Kauf nicht mehrfach ausgelöst; guter Fehler-UX |
| SS-404 | Verifizierte Entitlement-Quelle und Revocation/Expiry/Offline-Grace | OPEN | Kein lokaler Flag als Kaufnachweis; kein Pro bei Pending; nach Erstattung/Ablauf entzogen |
| SS-405 | Einheitliches `FeatureAccessService` für React **und Native Rule Sync** | OPEN | UI/Native zeigen denselben bezahlten Umfang; Downgrade entsperrt safely |
| SS-406 | Kontext-Paywall und endgültige Copy | UI PRESENT / BILLING OPEN | Erst beim 3.-App-Versuch oder Pro-Feature; niemals bei Permission/Emergency Unlock; echte Store-Angaben |

**Bis SS-402–405 fertig sind, bleibt der Kaufbutton deaktiviert.**

### P5 — Abnahme auf Geräten, Policy und Release

| ID | Aufgabe | Status | Abnahme |
| --- | --- | --- | --- |
| SS-501 | Debug-APK/Play-Internal-Test-Installationspfad + Testprotokoll | OPEN | Installierbarer Build, Commit-SHA, schriftliche Reproduktionsschritte |
| SS-502 | Gerätematrix Pixel, Samsung One UI, Xiaomi/HyperOS | BLOCKED:DEVICES | Öffnen/Reopen/Session/Overlay/Permissions/Reboot auf repräsentativen Geräten protokolliert |
| SS-503 | 12–24h-OS-Lifecycle-/Akku-/Crash-Test | OPEN | Auffälligkeiten, Energieverbrauch und bekannte Einschränkungen dokumentiert |
| SS-504 | Datenschutz-/Rechtstexte, Data Safety, Usage/Overlay/FGS-Play-Erklärung | BLOCKED:OWNER | Tatsächliche Anbieterangaben/öffentliche URLs; ggf. Play-Demovideo; juristische Prüfung |
| SS-505 | Name/Marke/Application ID, App-Icon, Splash, Store-Screens und Tonalität | BLOCKED:OWNER | Marken-/Verwechslungsrisiko geprüft; ein konsistenter Name in App + Metadaten |
| SS-506 | Signierung, Play Console, interner/geschlossener Test, Crash-/Feedback-Schleife | BLOCKED:OWNER | Kein Leak von Keystores; Testerberichte bearbeitet, Retest grün |
| SS-507 | Finale Releaseprüfung `npm run verify`, Android Release Build, Strict-Readiness | OPEN | Grüner Nachweis auf Release-Commit und alle P0-/P1-Risiken geschlossen |

## 4. Verbindliche Reihenfolge und Abhängigkeiten

```
JETZT
SS-001/002 (PR und CI stabilisieren)
       ↓
SS-003/004/005 (eine Produktwahrheit + Native-/Free-Sicherheit)
       ↓
SS-101–106 + SS-201–206 (echter Android-Kern beweisen)
       ↓
SS-301–310 (alle Screens/States mit echten Daten designfinalisieren)
       ↓
SS-401–406 (Store Billing, Pro-Entitlements, End-to-End-Test)
       ↓
SS-501–507 (Devices, Policy, Beta, Store)
       ↓
ANDROID V1 RELEASE
```

**Parallel erlaubt:** Nach grundlegendem CI können UI-Design und Billing-Adapter vorbereitet werden; Merge nur, wenn dieselbe verifizierte Regelquelle und Testbasis bestehen. Externe Betreiberentscheidungen (Name, Play Konto, Support) möglichst früh klären, dürfen aber Codearbeit an Free, UI und Native nicht stoppen.

## 5. Unmittelbar nächste drei Entwicklungsaufgaben

**Batch A (nicht durch neue Feature-Ideen ersetzen):**

1. **SS-001:** PR #20 und CI-Risikostatus überprüfen; bekannte Web-/Android-Probleme reproduzieren, gezielt beheben, erst dann mergen.
2. **SS-002:** Falls GitHub Actions vor Runnerstart ausfällt, Blocker sauber trennen; Artefakt-Quota von Kompilierung trennen und lokalen reproduzierbaren Prüfpfad dokumentieren. Nicht grün fälschen.
3. **SS-003/004:** Legacy-/Store-Widersprüche und Free/Pro-Native-Lücken durch konkrete Tests schließen; nach den drei Aufgaben Review + Planstatus aktualisieren.

**Danach:** Batch B mit SS-101/102/104 (zwei App-Regeln, schnelle Übergänge, Gesundheitszustand), dann Geräteabnahme statt kosmetischem Umbau.

## 6. Qualitäts- und Arbeitsregeln

- Jede Tätigkeit beginnt mit **Task-ID → Ist-Zustand → Ursache → kleine Änderung → Test → Nachweis**.
- Maximal **drei zusammenhängende Implementierungsaufgaben**, danach unabhängige Prüfung von Code, Tests und GitHub-Head; keine willkürlichen Commits.
- PRs klein und thematisch; keine gleichzeitige Änderung von Billing, UI, Android und Design ohne zwingenden technischen Zusammenhang.
- Vor Änderungen an identischen Dateien prüfen, ob andere Agents/PRs bereits daran arbeiten. Konflikte werden explizit aufgelöst, nicht überschrieben.
- Jeden Task mit Referenzen zu Dateien, Testfällen, PR/Commit, CI-Run und (bei Android) Testgerät dokumentieren.
- Stale CI oder Runner-Fehler ≠ Code-Fehler; grüne Kompilierung ≠ Device-Verified; eine Web-Demo ≠ Android-Schutz.
- Kein neues V1-Feature, keine Preis-/Tier-Änderung, kein neues SDK/Permission, kein Daten-Tracking ohne dokumentierte Produktentscheidung.
- Keine öffentlichen Store-Aussagen ohne QA- und Policy-Nachweis. Keine sensiblen Play-, Firebase- oder Signierungsschlüssel ins Repo.

## 7. Offene Entscheidungen des Eigentümers

Nur diese Entscheidungen/Aktionen erfordern zwingend den Betreiber, **nicht jetzt zum Start des Plans**:

1. Endgültiger rechtlich geprüft(er) App-Name und Android Application ID **vor erstem Play-Upload**.
2. Google-Play-Entwicklerkonto, Store-Abonnements, Lizenztester und ggf. Entitlement-Anbieter/Konto.
3. Kontrollierte öffentliche Support-E-Mail, Anbieter-/Datenschutzangaben, Signier-/Play-Zugang.
4. Zugang zu mindestens einem echten Android-Gerät für Testlogs; besser Pixel/Samsung/Xiaomi.
5. Freigabe der finalen Branding-/Preis-/Store-Texte, sofern vom Masterplan abweichend.

**Grundsatz:** Diese Lücken werden in der Release-Liste geführt. Bis dahin entwickeln und testen wir alle unabhängigen Teile weiter.

## 8. Änderungsprotokoll

| Datum | Änderung | Evidenz |
| --- | --- | --- |
| 2026-10-09 | Erste gemeinsame Umsetzungsbasis aus Masterplan, aktuellem `main`, PR #20 und Konkurrenzrecherche erstellt | Repo-Audit; `COMPETITOR_BASELINE.md` |
