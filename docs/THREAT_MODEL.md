# ScrollShield – Threat Model v1

Status: **verbindliche Sicherheitsanalyse für Android v1**

Letzte Aktualisierung: **16. August 2026**

Dieses Threat Model betrachtet reale Risiken der aktuellen Architektur. Ziel ist nicht, ScrollShield als manipulationssicher darzustellen, sondern kritische Sicherheits-, Daten- und Statusfehler systematisch zu verhindern.

## 1. Schutzgüter

Besonders schützenswert sind:

1. lokale Nutzereinstellungen und Regeln;
2. V0.7-/Legacy-Daten und deren Archiv;
3. lokale Historie/Statistik;
4. tatsächlicher Android-Schutzstatus;
5. Permission-/Lifecycle-Diagnostik;
6. Export-/Import-Dateien;
7. Release-Signing und Store-Credentials;
8. Vertrauen, dass UI und tatsächlicher Systemzustand übereinstimmen.

## 2. Vertrauensgrenzen

```text
Nutzer
  |
  v
React / WebView UI
  |
  +---- lokale Web-Persistenz
  |
  v
Capacitor Bridge
  |
  v
Native Android
  |---- SharedPreferences / lokale Native-Daten
  |---- UsageStatsManager
  |---- Overlay
  |---- Foreground Service
  |---- Android Settings / Permissions
  |
  v
Fremd-App / Android OS
```

Jeder Übergang zwischen React, Bridge, Native Android und Android-Systemzustand ist eine Vertrauensgrenze.

## 3. Relevante Angreifer-/Fehlermodelle

### TM-01 Versehentliche Datenkorruption

Risiko: App-Update, Teil-Write, Prozessende oder fehlerhafte Migration beschädigt lokale Daten.

Gegenmaßnahmen:

- transaktionales `_pending`-Staging;
- bytegenaues Legacy-Archiv;
- keine Quelllöschung vor verifizierter Zielpersistenz;
- Recovery-Screen;
- Export/Import-Validierung.

Rest-Risiko: reale OEM-/WebView-/Storage-Edge-Cases müssen physisch getestet werden.

### TM-02 Manipuliertes Backup / Import

Risiko: Nutzer importiert beschädigte oder absichtlich manipulierte JSON-Daten.

Gegenmaßnahmen:

- Größenlimit;
- strukturelle Validierung;
- Normalisierung;
- atomare Ablehnung inkompatibler Vollzustände während Commitment;
- keine direkte Ausführung beliebiger importierter Inhalte.

Pflicht: Import-Fuzzer/Boundary-Tests für besonders tiefe oder große Strukturen ergänzen, falls Parser-Komplexität steigt.

### TM-03 Falsche Aktiv-Anzeige

Risiko: UI zeigt Schutz als aktiv, obwohl der native Service gestoppt ist oder Voraussetzungen fehlen.

Gegenmaßnahmen:

- `running` und `enabled` getrennt;
- Live-Statusabfrage;
- stale/inconsistent Zustände sichtbar;
- Safe-Shutdown bei Permission-/Target-/Rule-Verlust;
- Commitment prüft reale Native-Readiness.

Release-kritisch: Dieser Fehler ist P0/P1, weil er das Kernversprechen verletzt.

### TM-04 Heimlicher/unsichtbarer Foreground Service

Risiko: Schutz läuft ohne sichtbare Nutzerkontrolle.

Gegenmaßnahmen:

- Notification Permission/Channel als Startvoraussetzung;
- sichtbare Dauerbenachrichtigung;
- direkter System-Stop;
- automatische Abschaltung, wenn Notification-Sichtbarkeit verloren geht.

### TM-05 Overlay-Trap / unerreichbarer Exit

Risiko: Overlay blockiert Aktionen oder erzeugt eine Schleife.

Gegenmaßnahmen:

- Home-Rückweg;
- begrenzter Emergency Flow;
- keine manipulationssichere Behauptung;
- maximale Schrift/Tastatur/TalkBack physisch testen;
- vollständiger Reset als Safety-Ausgang.

### TM-06 Commitment wird als Device Lock missverstanden

Risiko: Nutzer erwartet unüberwindbare Sperre oder kann Recovery nicht erreichen.

Gegenmaßnahmen:

- Commitment als freiwillige Anti-Impuls-Funktion beschreiben;
- Android-Systemkontrollen als bekannte Bypass-Grenze dokumentieren;
- normale Konfigurationsänderungen einfrieren, aber Recovery/Permissions/Reset erreichbar lassen;
- kein Parental-Control-/Device-Owner-Versprechen.

### TM-07 Uhr-/Zeitzonenmanipulation

Risiko: wall-clock-basierte Commitment-/Schedule-Regeln können durch Uhränderung beeinflusst werden.

Aktuelle Behandlung:

- als bekannte Grenze dokumentieren;
- Zeitwechsel/Zeitzone/DST physisch testen.

Spätere Härtung:

- native boot-/monotonic-aware Zeitreferenz für stärkere freiwillige Locks prüfen, ohne Safety-Exit zu entfernen.

### TM-08 Fremd-App-/Package-Verwechslung

Risiko: nicht installierte oder unerwartete Package-ID wird geschützt/angezeigt.

Gegenmaßnahmen:

- scoped `<queries>`;
- bekannte Package-Mappings;
- native Availability-Prüfung;
- keine `QUERY_ALL_PACKAGES`-Inventarisierung.

Offen: Work Profiles, Clone Apps, regionale Varianten physisch prüfen.

### TM-09 Unnötige Netzwerkfähigkeit

Risiko: Offline-First-App besitzt `INTERNET`-Permission und könnte durch neue SDKs unerwartet kommunizieren.

Gegenmaßnahmen:

- keine Analytics/Ads/Backend in v1;
- CSP/Privacy-Build-Checks;
- Secret-/SDK-/Notices-Checks;
- finaler Binary-/Dependency-Audit.

Offen: vor Release begründen, ob `INTERNET` für Capacitor/PWA/Runtime zwingend bleiben muss. Falls nicht benötigt, Entfernung prüfen.

### TM-10 Supply-Chain-Angriff

Risiko: kompromittierte npm-/Gradle-/GitHub-Action-Abhängigkeit.

Gegenmaßnahmen:

- Lockfile;
- `npm ci`;
- GitHub Actions auf immutable SHA gepinnt;
- Dependabot;
- minimaler SDK-Umfang;
- Third-Party Notices.

Offen: SBOM/Dependency-Audit als Release-Artefakt ergänzen.

### TM-11 Signing-/Credential-Leak

Risiko: Keystore, Tokens oder Play-Credentials gelangen ins Repo.

Gegenmaßnahmen:

- `signing.properties`/Keystore ignoriert;
- Secret-Checker;
- keine realen Credentials in `.env`;
- Release-Signing außerhalb des Repos.

Pflicht: Keystore-Backup und Verantwortlichkeit außerhalb des Git-Repos dokumentieren.

### TM-12 Diagnose enthält unerwartete Daten

Risiko: Support-Diagnose speichert oder teilt unnötig persönliche Inhalte.

Gegenmaßnahmen:

- Diagnose auf Build/Device/Permission/Service/Lifecycle begrenzen;
- keine Nachrichten-/Bildschirm-/Tastaturinhalte;
- Stop-Code/-Message normalisieren und begrenzen;
- Nutzer kopiert Diagnose bewusst.

### TM-13 Foreground-Service-Prozess wird unerwartet beendet

Risiko: OEM/Android beendet Service; UI oder persisted activation bleibt stale.

Gegenmaßnahmen:

- Lifecycle-Diagnostik;
- `unexpected_service_destroy`;
- Recovery nur bei erfüllten Voraussetzungen;
- physische OEM-Matrix;
- Batterie-/Prozesskiller-Tests.

### TM-14 Missbrauch als heimliches Überwachungswerkzeug

Risiko: zukünftige Features erweitern Zugriff auf Accessibility/Screen Content und verändern Produktcharakter.

Regel:

- kein Accessibility Service nur für Feature-Bequemlichkeit;
- keine Nachrichten, Passwörter, Tastatureingaben oder fremde Inhalte erfassen;
- Reels-only nur als separat geprüfte Beta mit eigener Disclosure/Consent/Play-Erklärung.

## 4. Security Severity

### P0 – Release sofort stoppen

- Datenverlust/irreversible Legacy-Korruption;
- Schutz erscheint aktiv, ist aber nachweislich nicht aktiv;
- Overlay verhindert sicheren Exit;
- unerwartete Übertragung sensibler lokaler Daten;
- Signing-/Credential-Leak;
- Store-Deklaration widerspricht finalem Binary bei sensiblen Zugriffsrechten.

### P1 – Release blockieren

- reproduzierbarer Service-/Permission-Lifecycle-Fehler;
- Commitment blockiert legitime Recovery;
- falsche Tages-/Session-/Emergency-Grenzen;
- kritische Accessibility-Aktion unerreichbar;
- signifikanter Batterie-/ANR-Fehler.

### P2 – vor breitem Rollout beheben oder bewusst akzeptieren

- nicht-kritische UX-Verwirrung;
- Hersteller-Sonderfall mit dokumentiertem Workaround;
- kosmetische Diagnose-/Statusdarstellung ohne Sicherheitswirkung.

### P3 – normaler Backlog

- reine Polish-/Copy-/Animation-Themen ohne Funktions- oder Vertrauensrisiko.

## 5. Security Definition of Done pro Feature

Vor Merge eines Features mit Daten-, Native-, Permission- oder Store-Auswirkung beantworten:

- Welches Schutzgut wird berührt?
- Welche neue Trust Boundary entsteht?
- Welche Eingaben sind untrusted?
- Was passiert bei malformed/fehlenden Daten?
- Was passiert bei Prozessende?
- Was passiert bei Permission-Entzug?
- Kann die UI einen falschen Sicherheitszustand anzeigen?
- Bleibt ein sicherer Exit?
- Ändert sich Data Safety/Privacy/Store-Deklaration?
- Welche Unit-/Integration-/Device-Tests belegen die Gegenmaßnahmen?

## 6. Offene Security-Aufgaben vor v1

1. `INTERNET`-Permission technisch auditieren.
2. Dependency-/SBOM-Report für finalen Kandidaten archivieren.
3. Android-Instrumentation für Service/Overlay/Permission-Lifecycle ausbauen.
4. Work-Profile/Clone-/regionale Package-Varianten testen.
5. physische Overlay-Exit-/Accessibility-Tests abschließen.
6. final signierten AAB gegen Permissions, SDKs und Netzwerkfähigkeit prüfen.
7. Threat Model erneut prüfen, sobald Billing, Cloud, Account oder Accessibility Service eingeführt werden.
