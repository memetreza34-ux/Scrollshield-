# ScrollShield – verbindliche Release-Checkliste

Diese Checkliste gilt für den ersten öffentlichen Android-Release. **Source-Code ist keine ausgeführte Evidence.** Ein realer Haken darf nur gesetzt werden, wenn der Nachweis zur exakt selben Source-Candidate-SHA, Version und Build-Nummer gehört.

Der maschinenlesbare Freigabestatus steht in `config/release-approval.json`. Der genaue Evidence-Vertrag steht in `docs/RELEASE_EVIDENCE.md`.

## 1. Source Candidate einfrieren

- [x] `package.json`, Android `versionName` und `candidateVersion` verwenden denselben Versionsvertrag.
- [x] Android `versionCode` und `candidateVersionCode` werden gegeneinander geprüft.
- [x] `check:release-approval` validiert Schema, Versionen und Candidate-Evidence-Bindung.
- [ ] Exakte 40-stellige `candidateCommitSha` für den real zu testenden Kandidaten festlegen.
- [ ] Ab diesem Freeze keine Produkt-, Android-, Build-, Store- oder Release-Dokumente mehr ändern; nur `config/release-approval.json` darf Evidence nachtragen.

Jede release-affektierende Änderung nach dem Freeze erzeugt einen **neuen Kandidaten** und erfordert passende neue Evidence.

## 2. Source-/Web-/Debug-Verifikation vor signiertem Kandidaten

- [x] Dependency-freier Lockfile-Preflight existiert und läuft in CI vor `npm ci`.
- [x] `npm run verify` enthält TypeScript, ESLint, Prettier, Vitest, PWA, Privacy, Store, Supply-Chain, Android-Source- und Release-Checks.
- [x] `npm run verify:android` ist für Android JUnit + `assembleDebug` vorbereitet.
- [x] `npm run verify:local-evidence` erzeugt SHA-gebundene lokale Logs/Reports als Fallback für blockierte Hosted Runner.
- [ ] `npm ci` für exakt den Kandidaten erfolgreich ausführen.
- [ ] `npm run verify` für exakt den Kandidaten vollständig erfolgreich ausführen.
- [ ] Android `testDebugUnitTest` erfolgreich ausführen.
- [ ] `assembleDebug` erfolgreich ausführen und installierbare Debug-APK archivieren.
- [ ] `webVerificationPassed`, `androidUnitTestsPassed` und `debugApkCompiled` nur mit echten Candidate-SHA-gebundenen Referenzen auf `true` setzen.

GitHub Actions mit `steps: []`/`steps: null` ist **keine** ausgeführte Test-Evidence.

## 3. Signierten Kandidaten erzeugen – noch keine Produktionsfreigabe

- [x] `release:candidate-gate` ist vom finalen Release-Gate getrennt.
- [x] Candidate-Gate verlangt Source/Web-, Android-Unit- und Debug-APK-Evidence sowie einen sauberen Candidate-Stand.
- [x] Release-Signing-Preflight verlangt lokale `signing.properties` und vorhandenen Keystore.
- [x] Keystore, Signing-Passwörter und `signing.properties` bleiben aus Git ausgeschlossen.
- [x] `android:candidate:release` baut einen signierten APK-Kandidaten und zeichnet seine Identität auf.
- [x] `android:candidate:bundle` baut einen signierten AAB-Kandidaten und zeichnet seine Identität auf.
- [x] Candidate-Recorder speichert Source-SHA, Build-HEAD, Version, VersionCode, Größe und SHA-256 unter `.scrollshield-release-candidate/`.
- [ ] `npm run release:candidate-gate` auf dem eingefrorenen Kandidaten erfolgreich ausführen.
- [ ] Signierten AAB-Kandidaten mit `npm run android:candidate:bundle` real bauen.
- [ ] Optional signierten APK-Kandidaten mit `npm run android:candidate:release` real bauen.
- [ ] Aufgezeichnete SHA-256 und Candidate-Metadaten zusammen mit dem Binärartefakt sicher aufbewahren.

**Ab jetzt den geprüften Kandidaten nicht mehr neu bauen.** Ein Rebuild erzeugt andere Binärbytes und invalidiert binärgebundene Evidence.

## 4. Android-Projekt- und Privacy-Härtung

- [x] Paket-ID/Namespace ist `app.scrollshield.mobile`.
- [x] `INTERNET` ist im Android-v1-Manifest absichtlich nicht vorhanden.
- [x] Cleartext-Traffic ist deaktiviert.
- [x] `allowBackup=false` ist gesetzt.
- [x] Android-12+-Cloud-Backup und Device-to-Device-Transfer werden durch `data_extraction_rules.xml` ausgeschlossen.
- [x] Android-11−-Auto-Backup wird durch `backup_rules.xml` ausgeschlossen.
- [x] FileProvider ist nicht exportiert und besitzt keine breite öffentliche `<external-path>`-Freigabe.
- [x] FileProvider ist auf ScrollShield-eigene interne/app-spezifische Files/Cache-Pfade begrenzt.
- [x] Capacitor lädt die gepackten `dist`-Assets und besitzt keine produktive Remote-Server-URL/`allowNavigation`-Freigabe.
- [x] Release-Minifizierung (`minifyEnabled`) und Resource-Shrinking sind aktiviert.
- [x] Unbenutzter Google-Services/Firebase-Gradle-Hook wurde aus dem offline v1 Build entfernt.
- [x] Google Play Billing und Play Integrity bleiben als getrennte, bewusst verwendete Abhängigkeiten erhalten.
- [x] `QUERY_ALL_PACKAGES` wird nicht verwendet; Sichtbarkeit bleibt auf bekannte unterstützte Packages begrenzt.
- [ ] Finale Paket-ID vor erstem Play-Upload ausdrücklich bestätigen.
- [ ] Signierten Kandidaten auf tatsächliche Manifest-Permissions, eingebettete SDKs, Tracker, URLs und Netzwerkziele untersuchen.

## 5. Berechtigungen, FGS und Schutz-Lifecycle

Source-Vertrag vorhanden:

- [x] Usage Access wird für die gewählten Vordergrund-Apps verwendet.
- [x] Overlay dient der sichtbaren ScrollShield-Unterbrechung.
- [x] Android 13+ Runtime-Notification-Permission ist berücksichtigt.
- [x] Schutz startet fail-closed ohne Usage Access, Overlay, sichtbare Notification, aktive Regel oder installierte Ziel-App.
- [x] Foreground-Service-Notification enthält direkten Stop-Weg.
- [x] Permission-/Notification-/Target-/Config-Verlust kann den Dienst kontrolliert stoppen.
- [x] stabile Stop-Codes und Lifecycle-Zeitpunkte werden persistiert.
- [x] Boot-/App-Update-Recovery ist an vorherige Aktivierung und Voraussetzungen gebunden.

Reale Candidate-Evidence fehlt bis zur Ausführung:

- [ ] APP-07..10 real nachweisen.
- [ ] RUNTIME-01..06 real nachweisen.
- [ ] DISPATCH-01..05 real nachweisen.
- [ ] LIFE-08: alle manuellen/System-/Migration-/Permission-/Config-/Recovery-Stoppgründe real nachweisen.
- [ ] LIFE-09: inkonsistente `enabled/running`-Zustände und Recovery-Anzeigen real nachweisen.
- [ ] LIFE-10: Notification-Stop, unerwartete Service-Zerstörung und Erhalt kontrollierter Stop-Codes real nachweisen.
- [ ] LIFE-12..16 inklusive generation-/snapshot-gebundener Recovery real nachweisen.

`terminalLifecycleValidationPassed` bleibt bis zu diesen realen Candidate-Nachweisen `false`.

## 6. Schutzlogik und Instrumentation

- [x] Tageslimit, Sitzungsdauer, Zeitfenster über Mitternacht, wiederkehrende Regeln und Fokuslogik sind source-seitig implementiert.
- [x] Anti-Binge, adaptive Friction, Emergency und Commitment sind source-seitig implementiert.
- [x] Native Nutzungs-/Schutzereignisse können in lokale Statistik/History übernommen werden.
- [ ] Instrumentation für Service-Lifecycle, Overlay, Countdown, Sitzungsende, Usage-Import und Boot-Recovery real ausführen.
- [ ] Keine Source-Checker als Ersatz für Instrumentation oder physische Geräte-Evidence behandeln.

## 7. Physische Android-Gerätematrix

Mindestens:

- [ ] Pixel oder anderes physisches Near-Stock-Gerät.
- [ ] Samsung Galaxy / One UI.
- [ ] Xiaomi/Redmi / HyperOS bzw. MIUI.
- [ ] OnePlus / OxygenOS.
- [ ] Motorola oder weitere Near-Stock-Variante.
- [ ] Android-Tablet in Hoch- und Querformat.
- [ ] Android 7 / API 24 Legacy-Verhalten.
- [ ] Android 8 / API 26 Foreground-Service-/Notification-Channel-Verhalten.
- [ ] Android 13+ Runtime-Notification-Permission.

Zusätzlich für denselben Kandidaten:

- [ ] Reboot.
- [ ] App-Update bei aktivem Schutz.
- [ ] Prozessende.
- [ ] Force-Stop.
- [ ] OEM-Batteriespar-/Background-Restriktionen.
- [ ] Mitternacht und Tageswechsel.
- [ ] Zeitzonenwechsel.
- [ ] Sommerzeit.
- [ ] manuelle Uhränderung.

Für jeden Testlauf Evidence mit Gerät, Hersteller, Modell, Android/OEM-Version, ScrollShield-Version/Build, Candidate-SHA, Diagnose-JSON und PASS/FAIL/BLOCKED sichern.

## 8. Batterie und Zuverlässigkeit

- [ ] Baseline ohne laufenden Schutz messen.
- [ ] Schutz aktiv ohne typische geschützte Nutzung messen.
- [ ] Schutz aktiv mit typischer Nutzung messen.
- [ ] mindestens 12-Stunden-Lauf durchführen.
- [ ] CPU, Batterie, Wakeups, Speicher, Service-Restarts, Overlay-Churn und UsageStats-Verhalten dokumentieren.
- [ ] Kein kritischer Lifecycle-/Notification-/Overlay-/Usage-Fehler im Langlauf.

`batteryReliabilityPassed` bleibt bis zur realen Candidate-Evidence `false`.

## 9. Datenmigration und Recovery

- [x] V3-Transaktionen, Pending-Recovery, ältere V2/unversionierte States und V0.7/PRO-Schlüssel sind source-seitig berücksichtigt.
- [x] Legacy-Rohdaten werden vor Löschung archiviert; Export/Import kann das Archiv transportieren.
- [ ] Clean Install mit aktuellem Kandidaten prüfen.
- [ ] echte repräsentative V0.7-Daten auf physischem Android-Gerät migrieren.
- [ ] archivierte Rohwerte bytegenau mit Ausgangsdaten vergleichen.
- [ ] migrierte Events/Statistiken mit Ausgangsbestand vergleichen.
- [ ] Export → Reset → Import prüfen.
- [ ] simulierten Storage-Fehler und Wiederholbarkeit prüfen.
- [ ] Upgrade vom vorherigen Release-Kandidaten prüfen.

`migrationValidationPassed` bleibt bis zum realen Nachweis `false`.

## 10. Accessibility und Usability

- [ ] TalkBack auf realem Android-Gerät prüfen.
- [ ] große Schrift/Display-Skalierung prüfen.
- [ ] Tastatur-/Focus-Reihenfolge prüfen, soweit relevant.
- [ ] Tablet-Layout real prüfen.
- [ ] Onboarding und Permission-Flow mit neuen Nutzern testen.
- [ ] mindestens mehrere reale Erstnutzer ohne Entwicklerhilfe durch Kernflow führen.

## 11. Recht, Privacy und Support

- [x] Android-v1 bleibt source-seitig ohne Account, Werbung und allgemeines Tracking.
- [x] Privacy-Build-Checks suchen nach nicht erlaubten Netzwerk-/Tracker-Mustern.
- [ ] rechtlichen Namen/Unternehmen final eintragen.
- [ ] ladungsfähige Adresse final eintragen.
- [ ] verantwortliche Person final eintragen.
- [ ] endgültige Support-Adresse verifizieren und überwachen.
- [ ] veröffentlichte Privacy-Domain/Datenschutzerklärung final erreichbar machen.
- [ ] alle Platzhalter entfernen.
- [ ] Aussagen gegen den **signierten retained AAB** prüfen.

## 12. Google Play / Store Review

- [x] Whole-App-Schutz wird nicht als Reels-/Shorts-Unterseiten-Erkennung überverkauft.
- [x] medizinische/ADHS-Behandlungsversprechen gehören nicht zum v1-Claim.
- [x] Usage Access, Overlay, Package Visibility und `FOREGROUND_SERVICE_SPECIAL_USE` sind als sensible Review-Flächen erkannt.
- [ ] Data Safety im Play Console final gegen den realen Kandidaten bestätigen.
- [ ] Usage-Access-/Overlay-Deklarationen final einreichen.
- [ ] Special-Use-FGS-Deklaration final einreichen.
- [ ] Content-Rating/USK-/PEGI-Fragen final ausfüllen.
- [ ] Reviewer-Video mit exakt retained Candidate aufnehmen.
- [ ] Reviewer-Video zeigt Onboarding, Permissions, App-Auswahl, Schutzintervention, Home/Stop, Permission-Entzug und passende Diagnosecodes.
- [ ] internen/geschlossenen Track erfolgreich durchführen.

## 13. Signed Binary Inspection

Für den **bereits gebauten und aufgezeichneten** signierten Kandidaten:

- [ ] SHA-256 aus `.scrollshield-release-candidate/bundle.json` sichern.
- [ ] tatsächliche Permissions und Manifest prüfen.
- [ ] unerwartete SDKs/Tracker/URLs prüfen.
- [ ] Signing/Package/Version/VersionCode prüfen.
- [ ] AAB/APK-Größe und Hash mit aufgezeichneter Candidate-Metadatei vergleichen.
- [ ] `evidence.signedBinary.reference` enthält den exakten SHA-256 des geprüften retained Artefakts.
- [ ] `signedBinaryInspected=true` erst danach setzen.

**Kein Gradle-Rebuild nach dieser Inspection.**

## 14. Finales Release-Gate und Artefaktidentität

- [ ] Alle verpflichtenden Evidence-Flags für denselben `candidateCommitSha` real bestanden.
- [ ] `approvedBy` gesetzt.
- [ ] `approvedAt` gesetzt.
- [ ] `npm run release:gate` besteht.
- [ ] `npm run android:bundle` besteht und validiert den retained AAB gegen SHA-256/Größe/Version/Candidate-SHA.
- [ ] Finales `android:bundle` baut **kein neues AAB**.
- [ ] Exakt dieser validierte retained AAB wird in Play Console hochgeladen.
- [ ] Nach Upload interner/geschlossener Smoke-Test weiterhin bestanden.

## 15. Rollout und Betrieb

- [ ] Keine offenen P0/P1-Releaseblocker.
- [ ] Rollback-/Staged-Rollout-Plan final.
- [ ] Support- und Incident-Verantwortung final.
- [ ] Monitoring erfolgt ohne die v1-Privacy-Versprechen heimlich zu erweitern.
- [ ] Produktion erst nach G14-Freigabe.

## iOS

Android-v1-Freigabe bedeutet **keine** iOS-Produktionsreife. Für iOS bleiben Family-Controls-Entitlement, Managed Settings, native Durchsetzung, reale Geräte-Evidence und Apple-Review-Unterlagen separat erforderlich.

---

**Grundregel:** Kein Source-Haken, kein boolesches Feld und kein vorbereiteter Test ersetzt eine tatsächlich ausgeführte, Candidate-gebundene Evidence. Fehlende Evidence bleibt `false`/offen.
