# ScrollShield – Engineering Checks

Status: **verbindlicher technischer Verifikationsvertrag**

Letzte Aktualisierung: **16. August 2026**

ScrollShield verwendet einen zentralen Source-/Web-Verifikationsbefehl:

```bash
npm run verify
```

Dieser Befehl ist notwendig, aber nicht hinreichend für einen Release. Android-JUnit, Instrumentation, echte APK-Builds und physische Geräte-Evidence bleiben separate reale Nachweise.

## 1. Grundregel

Es gibt drei unterschiedliche Ebenen:

1. **Source Contract** – ein Checker bestätigt, dass ein verlangter Vertrag im Repository vorhanden ist.
2. **Executed Test** – ein Test/Build wurde tatsächlich auf dem exakten Commit ausgeführt.
3. **Release Evidence** – das Ergebnis ist eindeutig dem finalen Candidate-SHA, Version Name und Version Code zugeordnet.

Ein Source-Checker darf niemals als ausgeführter Android-Test dargestellt werden.

## 2. Aktuelle `verify`-Kette

`npm run verify` umfasst derzeit unter anderem:

- Runtime-Versionen;
- TypeScript;
- ESLint;
- Prettier;
- Version-Konsistenz;
- Android-Projektvertrag;
- Android-Instrumentation-Source-Vertrag;
- Supply-Chain-Integrität;
- Device-Matrix-Vertrag;
- Lifecycle-Diagnostik;
- Diagnose-Normalisierung;
- Overlay-Accessibility;
- Native Usage Accounting;
- Protection Config;
- Release Surface;
- Commitment;
- Subscription Safety;
- V0.7-/Storage-Migration;
- Release Approval;
- Protection Transparency;
- SDK Registry;
- Third-Party Notices;
- Secret Scan;
- Store Assets/Copy;
- Release Readiness;
- Vitest;
- Accessibility Source Checks;
- Vite Production Build;
- PWA Output;
- Privacy-/Network-Build-Check;
- Bundle Budget.

## 3. Android Project Check

```bash
npm run check:android
```

Schützt unter anderem:

- SDK-Untergrenzen und Package-ID;
- Release-Minification und Resource Shrinking;
- Signing-Konfiguration;
- `allowBackup=false`;
- Cleartext-Verbot;
- Foreground-Service-Registrierung und `specialUse`;
- Boot Receiver;
- scoped Package Visibility;
- Native Protection-/Diagnostics-Bridge;
- explizite Nutzeraktivierung;
- Safe-Shutdown bei Permission-/Rule-/Target-Verlust;
- Schedule-/Daily-Limit-/Anti-Binge-/Emergency-Policy-Verknüpfung;
- Boot-/Update-Recovery-Vertrag;
- gepinnte externe GitHub Actions;
- Android Unit-Test-/Debug-Build-Schritte im Workflow.

Die tatsächliche Permission-Wahrheit wird zusätzlich durch `check:privacy` und die On-Device-Manifest-Instrumentation geschützt. Android v1 darf derzeit keine `android.permission.INTERNET` besitzen.

## 4. Android Instrumentation Contract

```bash
npm run check:android-instrumentation
```

Dieser Source-Checker verhindert, dass die Android-Instrumentation wieder auf den früheren Android-Studio-Platzhaltertest reduziert wird.

Verbindlich vorhanden sind derzeit:

### `ProtectionStateInstrumentedTest.java`

Prüft auf einem Android-Testgerät bzw. Emulator:

- Protection ist nach sauberem Test-State standardmäßig deaktiviert;
- `lastProtectionStartAt` entsteht erst durch den tatsächlichen Service-Start-Record;
- Deaktivierung persistiert Lifecycle-Wahrheit;
- Stop-Code/-Message werden normalisiert und persistiert;
- aktive Ziel-App-Konfiguration gilt nur, wenn wenigstens ein Package tatsächlich installiert/sichtbar ist.

### `ManifestSecurityInstrumentedTest.java`

Prüft das **tatsächlich installierte/zusammengeführte Manifest**, nicht nur die handgeschriebene XML-Datei:

- nur der freigegebene Android-v1-Permission-Satz ist vorhanden;
- `android.permission.INTERNET` fehlt;
- Android Backup bleibt deaktiviert;
- Protection Service ist registriert, aktiviert und nicht exportiert;
- Boot Receiver ist registriert und für die vorgesehenen System-Recovery-Broadcasts erreichbar.

### `BootRecoveryInstrumentedTest.java`

Prüft deterministische Recovery-Grenzen:

- fremde Broadcasts verändern die Aktivierung nicht;
- `BOOT_COMPLETED` ohne verfügbare aktive Ziel-App endet fail-closed;
- `MY_PACKAGE_REPLACED` ohne verfügbare aktive Ziel-App endet fail-closed;
- der stabile Diagnosecode `recovery_target_app_missing` bleibt erhalten.

Der frühere `ExampleInstrumentedTest.java`, der nur die Package-ID prüfte, wurde entfernt.

### Noch nicht durch Instrumentation abgedeckt

G7 bleibt deshalb **TEILWEISE**. Offen sind insbesondere:

- echter Service-Start mit erfüllten System-Permissions;
- Overlay-Rendering und Aktionen;
- Permission-Verlust während laufendem Schutz;
- Notification-Channel-Entzug;
- Countdown-/Session-Ende;
- Native Usage Drain/ACK;
- komplette Boot-Recovery mit realem Foreground-Service-Start;
- OEM-/Prozesskiller-Verhalten.

Und vor allem: Die neuen `androidTest`-Klassen wurden wegen des GitHub-Runner-Blockers noch nicht real ausgeführt.

## 5. Supply-Chain Check

```bash
npm run check:supply-chain
```

Schützt derzeit:

- Vorhandensein von `package.json` und `package-lock.json`;
- npm Lockfile-Version mindestens 3;
- keine direkten ungebundenen bzw. nicht bewusst freigegebenen Dependency-Specifier wie `*`, `latest`, `next`, Git-/HTTP-/File-/Link-Quellen;
- keine Plain-HTTP-Paketauflösungen im npm Lockfile;
- keine Git-/SSH-Lockfile-Auflösungen ohne bewusste Review;
- Gradle Wrapper nur über den offiziellen HTTPS-Distributionshost;
- vorhandenen SHA-256 für die Gradle-Distribution;
- für `gradle-8.14.3-all.zip` den aktuell erwarteten offiziellen SHA-256;
- keine dynamischen Gradle-Versionen mit `+` oder `latest.release`;
- keine Plain-HTTP-Gradle-Repository-/Dependency-URLs.

Aktuell ist die Gradle-8.14.3-Distribution gepinnt auf:

```text
ed1a8d686605fd7c23bdf62c7fc7add1c5b23b2bbc3721e661934ef4a4911d7c
```

Das ersetzt **nicht**:

- echten `npm ci`;
- Vulnerability-/Advisory-Bewertung;
- Gradle Dependency Report;
- finalen SBOM-/Dependency Snapshot;
- finalen Binary Audit.

Details: `docs/SUPPLY_CHAIN_SECURITY.md`.

## 6. Storage Migration Check

```bash
npm run check:migration
```

Schützt die besonders kritische V0.7-/Legacy-Datenmigration:

- bekannte monolithische und V0.7-Keys;
- `_pending`-Staging;
- exakte Read-Back-Verifikation;
- Recovery vollständiger Pending-Transaktionen;
- Verwerfen unvollständiger Pending-Sets;
- bytegenaues Legacy-Archiv vor Quelllöschung;
- keine Aktivierung alter generierter Regeln;
- sichere Konvertierung deterministischer Alt-Ereignisse und Saved-Time-Werte;
- Export/Import des Legacy-Archivs;
- Blockierung normaler Saves bei ungelöster Legacy-Migration;
- Recovery-UI.

Reale V0.7-Geräte-Evidence bleibt trotzdem Pflicht.

## 7. Lifecycle Diagnostics

```bash
npm run check:lifecycle
npm run check:diagnostic-normalization
```

Schützt:

- `lastProtectionStartAt` erst nach erfolgreichem Foreground-Service-Start;
- letzte Stop-Zeit, Code und Message;
- stabile Stop-/Recovery-Codes;
- `unexpected_service_destroy` nur für tatsächlich unerwartete Zerstörung;
- `migration_recovery`;
- `notification_action_stop`;
- Recovery-Fehlercodes;
- Normalisierung fremder Diagnosewerte;
- Bounds 64 Zeichen für Code / 500 für Message;
- React-Health-Klassifikation wie `active`, `stale-activation`, `running-without-activation` usw.;
- ehrliche UI-Darstellung des realen Native-Zustands.

## 8. Device Matrix Contract

```bash
npm run check:device-matrix
```

Schützt den manuellen Testvertrag für:

- Pixel/Near Stock;
- Samsung;
- Xiaomi/Redmi;
- OnePlus;
- Motorola;
- Tablet;
- API 24;
- API 26;
- Android 13+;
- Reboot/App-Update;
- Permission-/Notification-Verlust;
- Lifecycle-Diagnostik;
- Zeitgrenzen;
- Batterie/12h;
- Font Scaling;
- TalkBack;
- Commitment- und Adaptive-Friction-Matrix.

Der Checker beweist die Existenz des Testplans, nicht dessen reale Durchführung.

## 9. Privacy / Offline-First

```bash
npm run check:privacy
```

Die aktuelle Android-v1-Architektur ist offline-first. Der Checker blockiert unter anderem:

- bekannte Analytics-/Tracking-SDKs;
- `fetch`;
- `XMLHttpRequest`;
- `WebSocket`;
- `EventSource`;
- `sendBeacon`;
- bekannte Tracker-Marker im Production Bundle;
- Wiedereinführung von `android.permission.INTERNET` ohne bewusste Architekturänderung.

Neue Cloud-/Analytics-/Remote-Funktionen erfordern zuerst eine Revision von Product Requirements, Threat Model, Privacy/Data Safety und Permission Strategy.

## 10. Native Persistence / Usage Accounting

```bash
npm run check:usage-accounting
```

Die aktuelle Source-Basis schützt Datumssplitting und lokale Usage-Semantik. Zusätzlich existieren:

- `NativeCounterRetentionPolicy.java`;
- `NativeCounterRetentionPolicyTest.java`;
- `docs/NATIVE_PERSISTENCE_AUDIT.md`.

Aktuell bekannte G8-Grenze:

```text
Native Drain markiert Daten konsumiert
→ React übernimmt in State
→ separater Storage-Save folgt später
```

Deshalb wird historische Usage noch nicht allein anhand des heutigen `exported_*`-Markers gelöscht. Ziel ist ein persistenter Batch-ID-/ACK-Pfad, bei dem React die Batch-ID im selben transaktionalen State wie Statistik/History speichert und erst danach Native bestätigt.

## 11. Release Approval Gate

```bash
npm run check:release-approval
npm run release:gate
```

Schema v2 verlangt kandidatgebundene Evidence.

Strikter Release-Gate benötigt unter anderem:

- Web Verification;
- Android Unit Tests;
- Debug APK;
- Device Matrix;
- Lifecycle;
- Battery Reliability;
- Migration;
- Play Declarations;
- Legal Fields;
- Reviewer Videos;
- Signed Binary;
- Approver + Approval Time;
- exakte Candidate-SHA.

Nach Candidate Freeze darf nur die Evidence-Datei geändert werden; Produkt-/Build-/Release-Codeänderungen erzwingen einen neuen Kandidaten und neue Tests.

## 12. Android CI Stage

Der bestehende Verify-Workflow soll nach `npm run verify` ausführen:

```bash
cd android
./gradlew testDebugUnitTest assembleDebug --no-daemon --stacktrace
```

Bei Erfolg werden Debug APK und Unit-Test-Report als Artifact vorgesehen.

Die neue `androidTest`-Suite benötigt zusätzlich eine reale Android-Instrumentation-Ausführung auf Emulator/Gerät. Sie wird nicht dadurch als bestanden betrachtet, dass `assembleDebug` kompiliert.

## 13. Aktuelle Ausführungsgrenze

GitHub-hosted Actions starten für dieses Repository derzeit wegen Billing-/Spending-Limit nicht. Wiederholte Runs enden vor Step 1 mit `steps: null`.

Deshalb sind derzeit **nicht als bestanden belegt**:

- `npm run verify` auf aktuellem Head;
- `check:android-instrumentation`;
- `check:supply-chain`;
- TypeScript/Lint/Prettier;
- Vitest;
- Vite/PWA;
- Android JUnit;
- Android Instrumentation;
- Gradle Debug Build;
- APK;
- physische Geräte-Matrix.

Ein nicht gestarteter Runner ist ein Infrastrukturblocker und weder ein Code-Pass noch ein Code-Fail.

## 14. Verbindliche Reihenfolge nach Entsperrung

1. sauberer Checkout;
2. `npm ci`;
3. `npm run verify`;
4. Fehler beheben und wiederholen;
5. `./gradlew testDebugUnitTest assembleDebug`;
6. Android Instrumentation auf Emulator/Gerät;
7. Debug APK auf physischer Device Matrix;
8. erst danach Release-Evidence hochstufen.

Weitere Prozessreihenfolge: `docs/APP_DEVELOPMENT_A_TO_Z.md` und `docs/DEVELOPMENT_GATES_STATUS.md`.
