# Claude Code – endgültiges ScrollShield-Design (Übergabe nach Funktionsfertigstellung)

**Entscheidung des Eigentümers:** ChatGPT arbeitet zuerst alle technischen V1-Funktionen inklusive Android, Abos, Daten, Safety, Tests und Release-Vorbereitung ab. **Erst danach** wird der finale hochwertige Design-Pass mit Claude Code / Claude Design gemacht. Dies ist eine verbindliche Aufgabenteilung, keine Verschiebung der Nutzerfreundlichkeit auf später.

## Vor dem Design-Pass: technische Übergabe-Gates

- [ ] Alle V1-Kernfunktionen haben tatsächliche Implementierung, unit/integration tests und dokumentierte reale Geräteszenarien.
- [ ] Screens mit benötigten Zuständen und echter Navigation existieren: Heute, Schutz, Einblicke, Onboarding/Permissions, App-Detail, Schedule, Focus, Active Focus, Rescue, Paywall, Settings, Support, Diagnostics.
- [ ] Android Overlay wird vom nativen Kotlin-Service gesteuert und funktioniert ohne geöffnete WebView.
- [ ] Pro-Status kommt aus vertrauenswürdiger Kaufprüfung; `pro.active` aus lokalem Speicher ist **kein** Zahlungsnachweis.
- [ ] Native Sync, Fokus, Zeitfenster, Notfall-Freigabe und Statistiken sind per Tests gegen Regressionen abgesichert.
- [ ] Bekannte offene Funktionen und die Zustände Free/Pro/Error/PermissionDenied/Offline sind im Ausführungsplan beschrieben.
- [ ] Ein stabiler **Design-Handoff-Branch** basiert auf einem geprüften und nach `main` integrierten Stand. Nicht von einem älteren experimentellen Branch starten.

Fehlen die Gates, darf Claude Layoutvorschläge entwickeln, aber **kein** Release-/Fertigstatus behaupten.

## Geltende Quellen in Prioritätsreihenfolge

1. `docs/V1_MASTER_PLAN.md` – Funktionsumfang, Free/Pro-Vertrag, Navigation.
2. `docs/V1_EXECUTION_PLAN.md` – Status und Akzeptanz.
3. `docs/V1_PRODUCT_EXPERIENCE.md` – tatsächliche User Journeys, Texte und Zustände.
4. `docs/V1_DESIGN_SYSTEM.md` – Ausgangsrichtung „Calm Control“, **Tokenwerte nur Vorschläge**.
5. Quellcode und echte Tests; keine produktionskritische Verhaltensänderung ohne Rücksprache.

## Was Claude gestalterisch verändern darf

- Farb- und Typografiesystem, Raster, Abstände, Buttons, Cards, Sections, Bottom Navigation, Modal-/Sheet-Animationen.
- Sämtliche Android-WebView-Screens und Zustände: Onboarding, Heute, Schutz, App-Detail, Zeitplan, Fokus, Rescue, Einblicke, Paywall, Einstellungen und Hilfe.
- Native Kotlin-Overlay-Oberfläche als **eigenen** Design-Baustein, sofern Verhalten, Fokus/Intervention, Notfallweg und Countdown beibehalten bleiben.
- Marken-Assets, Icon, App Splash, Store Screenshots und Text-Hierarchie nach finaler Namensentscheidung.
- Kleine UX-Texte und Informationshierarchie, soweit sie keine bestehenden Schutz-/Abo-Entscheidungen ändern.

**Ziel:** individuelle, elegante, professionelle App – keine generischen KI-Layouts, keine zufälligen Gradienten, übermäßige Glows oder dekorativen Statistiken.

## Was nicht unbemerkt verändert werden darf

- Kotlin-Regeln, Foreground-Übergänge, Reopen-/Session-Logik, Native Bridge Contract und gespeicherte Regelstruktur.
- Berechtigungen, Manifest, Zahlungsbelegprüfung, Pro-Feature-Gates, Datenschutz-/Sicherheitsverhalten.
- Drei Haupttabs **Heute / Schutz / Einblicke**. Fokus und Rescue sind separate Flows.
- Free: 2 geschützte Apps, 1 Zeitplan, Sanft/Ausgewogen, Standard-Fokus.
- Importe/Exporte, Emergency Unlock, strenger Fokus, Abbruchbedingungen und Konto-/Aboverwaltung.
- Fake-KPIs, Nutzerverhalten-Simulationen als echte Daten, Reels/Shorts-Blocking in V1, AccessibilityService-Versprechen.

Wenn eine visuelle Idee technischen Code berührt, separate PR und vollständigen Regressionstest anlegen.

## Arbeitsweise für Claude

1. Alle Screens und UI-Zustände **zuerst screenshotbasiert** aufnehmen (z. B. 360/412dp), inklusive Kotlin-Overlay.
2. Design-Brief aus Nutzererlebnis und Masterplan lesen; **drei unterschiedliche Varianten für Heute + Overlay** entwerfen und kurz begründen.
3. Ein konsistentes Token-/Komponentensystem definieren; Nutzer wählt das endgültige Erscheinungsbild.
4. Danach Screen für Screen implementieren, niemals alles blind ersetzen.
5. Pro Screen vor/nach Screenshots, Touch-Größen, Textskalierung, Kontrast, TalkBack und echte Free/Pro-/Error-Zustände prüfen.
6. Web-/TypeScript-/Android-CI und Gerätetests vor jedem Merge ausführen; keine Logikregression.
7. Finale App-Assets, Store-Screens und Design-Spec konsistent mit dem freigegebenen Marken-Namen.
8. Abnahme mit Besitzer anhand einer vollständigen Geräte-Tour, nicht nur Figma-/Browser-Mockups.

## Übergabeumfang vom technischen Entwickler

- `docs/V1_EXECUTION_PLAN.md` mit tatsächlichen erledigten Tasks und offenen bekannten Fehlern.
- Funktionaler Android-Build einschließlich APK/AAB-Testweg; CI-/Geräteergebnisse.
- Übersicht der Routen/Screens und Komponenten (`src/App.tsx`, `src/screens/`, `src/components/`, `src/lib/`).
- Native Overlay-Quellen (`android/app/src/main/java/app/scrollshield/mobile/AppMonitorService.kt`) und Farben/Style-Ressourcen.
- Screenshot-/State-Matrix je Bildschirm + Test-Daten unter klarer „Demo“-Kennzeichnung.
- Android-Manifest/Permissions und verbindliche Abo-/Privacy-/Entitlement-Grenzen.
- GitHub-Branch mit sauberem Basis-Commit; alle Designänderungen in nachvollziehbaren PRs.

## Definition „Design abgeschlossen“

Der Besitzer wählt das Erscheinungsbild ausdrücklich aus. Danach müssen alle Oberflächen konsistent sein und bei realen Android-Tests, großen Schriftgrößen und Fehler-/Free-/Pro-Zuständen funktionieren. Erst dann markiert der Execution Plan `DESIGN VERIFIED`.

**Wichtig:** Nicht warten, um offensichtliche UI-Bugs, fehlende Beschriftungen oder unbedienbare Buttons zu reparieren. Diese sind funktionale Fehler und gehören bereits zur technischen Fertigstellung.
