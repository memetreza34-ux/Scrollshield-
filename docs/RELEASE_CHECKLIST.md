# ScrollShield – verbindliche Release-Checkliste

Diese Checkliste gilt für den ersten öffentlichen Android-Release. Ein Haken darf nur gesetzt werden, wenn Nachweise für exakt dieselbe Version und Build-Nummer vorliegen. Der technische Freigabestatus steht in `config/release-approval.json`.

## 1. Kandidat und Freigabe-Gate

- [x] `package.json`, Android `versionName` und Freigabemanifest verwenden dieselbe Version.
- [x] Android `versionCode` und `candidateVersionCode` stimmen überein.
- [x] `npm run check:release-approval` prüft Schema und Versionsgleichheit.
- [x] `npm run android:release` und `npm run android:bundle` rufen zuerst `npm run release:gate` auf.
- [ ] Alle Nachweise in `config/release-approval.json` sind für den aktuellen Kandidaten auf `true` gesetzt.
- [ ] `approvedBy` benennt die verantwortliche freigebende Person.
- [ ] `approvedAt` enthält den tatsächlichen Freigabezeitpunkt.

Solange ein Punkt offen ist, dürfen weder Release-APK noch AAB als veröffentlichungsbereit behandelt werden.

## 2. Automatische Verifikation und Android-Build

- [ ] `npm ci` läuft mit dem festgelegten Node- und npm-Bereich erfolgreich.
- [ ] `npm run verify` läuft vollständig ohne Fehler.
- [ ] TypeScript, ESLint und Prettier bestehen.
- [ ] Alle Vitest- und Accessibility-Prüfungen bestehen.
- [ ] `npm run check:lifecycle` besteht.
- [ ] `npm run check:migration` besteht.
- [ ] Alle Lifecycle-, Storage-, V0.7-, Export- und Import-Regressionstests bestehen.
- [ ] Android `testDebugUnitTest` besteht, einschließlich `ProtectionStopReasonPolicyTest`.
- [ ] Android `assembleDebug` erstellt eine installierbare Debug-APK.
- [ ] APK und Android-Testbericht wurden als Workflow-Artefakte oder lokal archiviert.
- [ ] Ein tatsächlicher Android-/Gradle-Build bestätigt die Kompilierbarkeit aller nativen Plugins und des Schutzdienstes.

GitHub Actions ist derzeit durch die Kontoabrechnung beziehungsweise das Spending-Limit blockiert. Ein Workflow mit `steps: []` ist kein bestandener oder fehlgeschlagener Code-Test.

## 3. Android-Projekt und Sicherheit

- [x] Paket-ID und Namespace sind `app.scrollshield.mobile`.
- [x] Cleartext-HTTP und Android-App-Backup sind deaktiviert.
- [x] Release-Minifizierung und Resource-Shrinking sind aktiviert.
- [x] Keystore, Signing-Dateien und Play-Zugangsdaten sind nicht eingecheckt.
- [x] Externe GitHub Actions sind auf unveränderliche Commit-SHAs gepinnt.
- [x] `QUERY_ALL_PACKAGES` wird nicht verwendet.
- [x] Unterstützte Ziel-Apps werden über begrenzte `<queries>` und bekannte Paketnamen geprüft.
- [ ] Die endgültige Paket-ID wurde vor dem ersten Play-Upload ausdrücklich bestätigt.
- [ ] Der signierte Release-Build wurde auf unerwartete SDKs, Tracker, Netzwerkziele und Berechtigungen untersucht.

## 4. Berechtigungen, Foreground Service und Lifecycle-Diagnose

- [x] Usage Access wird nur zur Erkennung einer vom Nutzer ausgewählten Vordergrund-App verwendet.
- [x] Overlay-Zugriff wird nur für die klar erkennbare ScrollShield-Unterbrechung verwendet.
- [x] Android 13+ verwendet den nativen `POST_NOTIFICATIONS`-Systemdialog.
- [x] Android 8+ kann direkt den Kanal `Aktiver App-Schutz` öffnen.
- [x] Android 7 verwendet einen sicheren App-Details-Fallback.
- [x] App-weite Benachrichtigungen und der einzelne Schutzkanal werden getrennt diagnostiziert.
- [x] Schutz startet nicht ohne Usage Access, Overlay, sichtbare Benachrichtigung und installierte aktive Ziel-App.
- [x] Die laufende Benachrichtigung zeigt den aktiven Schutz und enthält `Schutz stoppen`.
- [x] Der Dienst beendet sich bei Entzug von Benachrichtigungen, Schutzkanal, Usage Access oder Overlay.
- [x] Der Dienst beendet sich, wenn alle aktiven Regeln oder die letzte installierte Ziel-App verschwinden.
- [x] Beim Dienstende werden Overlay, Aktivierungsstatus und Foreground-Benachrichtigung entfernt und ein lokaler Warnhinweis gespeichert.
- [x] Native Einstellungen speichern `lastProtectionStartAt`, `lastProtectionStopAt`, `lastProtectionStopCode` und `lastProtectionStopMessage`.
- [x] Berechtigungs- und Konfigurationsabbrüche erhalten stabile Codes wie `notifications_missing`, `usage_access_missing`, `overlay_permission_missing`, `no_active_rules` und `target_app_missing`.
- [x] Ein blockierter V0.7-Recovery-Start stoppt den Dienst mit `migration_recovery`.
- [x] Fehlgeschlagene Boot-/App-Update-Wiederherstellung löscht den falschen Aktivstatus und speichert einen genauen `recovery_*`-Code.
- [x] Start-/Stoppzeit, Code und Grund erscheinen im Debug-Bericht und im kopierbaren Diagnose-JSON.
- [ ] Alle genannten Fälle wurden auf realen Geräten mit aktuellem Build nachgewiesen.
- [ ] Die Lifecycle-Werte bleiben nach Schließen und erneutem Öffnen von ScrollShield erhalten.

## 5. Schutzlogik

- [x] Der laufende Dienst verwendet dieselbe `ProtectionRulePolicy`, die durch lokale JUnit-Tests abgedeckt ist.
- [x] Standardverzögerung, Zurück-zum-Startbildschirm und bewusste temporäre Freigabe sind implementiert.
- [x] Strikter Modus und begrenzte Notfallfreigabe sind implementiert.
- [x] Tageslimit, Sitzungsdauer, Blockzeiten über Mitternacht und Fokusregeln sind implementiert.
- [x] Wiederkehrende Morgen-, Arbeits-/Schul-, Abend-, Nacht- und Wochenendregeln sind implementiert.
- [x] Anti-Binge-Warn- und Sperrschwellen sind implementiert.
- [x] Gemessene native Nutzung und Schutzereignisse werden lokal in Verlauf und Tagesstatistik importiert.
- [ ] Instrumentationstests decken Dienstlebenszyklus, Overlay, Countdown, Sitzungsende, Usage-Import und Boot-Recovery ab.
- [ ] Alle Regeln wurden nach `docs/ANDROID_DEVICE_TEST_MATRIX.md` auf realen Geräten geprüft.

## 6. Geräte-, Batterie-, Lifecycle- und Zeitmatrix

- [ ] Google Pixel oder ein anderes physisches Near-Stock-Gerät besteht.
- [ ] Samsung Galaxy besteht.
- [ ] Xiaomi/Redmi besteht.
- [ ] OnePlus besteht.
- [ ] Motorola besteht.
- [ ] Mindestens ein Android-Tablet besteht in Hoch- und Querformat.
- [ ] Android 7 / API 24 Legacy-Fallback besteht.
- [ ] Android 8 / API 26 Kanal- und Foreground-Service-Verhalten besteht.
- [ ] Android 13+ Runtime-Benachrichtigungsdialog besteht.
- [ ] Reboot, App-Update, Prozessende, Force-Stop und Herstellersparmodi sind dokumentiert.
- [ ] `LIFE-08` bestätigt manuelle, Migrations-, Berechtigungs-, Konfigurations- und Recovery-Stoppgründe.
- [ ] Ein mindestens zwölfstündiger Lauf zeigt keinen Benachrichtigungs-, Overlay-, Event- oder Batteriefehler.
- [ ] Mitternacht, Zeitzonenwechsel, Sommerzeit und manuelle Uhränderung bestehen.
- [ ] Für jeden Lauf liegen Version, Build, Diagnose-JSON, Ergebnis und Fehlernachweise vor.

## 7. Installation und Datenmigration

- [x] Lokale Daten bleiben offline und werden nicht an einen Entwickler-Server übertragen.
- [x] Export, validierter Import und lokaler Komplettreset sind vorhanden.
- [x] Aktuelle V3-Speicherung verwendet vollständig geprüfte `_pending`-Transaktionen.
- [x] Ein vollständiger unterbrochener Speichervorgang wird beim nächsten Start wieder aufgenommen.
- [x] Ein unvollständiger Pending-Satz ersetzt nicht den letzten vollständigen Zustand.
- [x] `scrollshield_state_v2` und der unversionierte Schlüssel `scrollshield_state` werden erkannt.
- [x] Die ehemaligen V0.7/PRO-Schlüssel für Brain State, Events, Regeln, Gamification, Installation und Backup werden erkannt.
- [x] Konvertierbare V0.7-Ereignisse und gespeicherte Zeit werden in aktuellen Verlauf und Statistik übernommen.
- [x] Alte generierte Regeln werden archiviert, aber nicht automatisch als heutige Schutzregeln aktiviert.
- [x] Vor einer Löschung werden alle Legacy-Werte bytegenau in `scrollshield_legacy_v07_archive_v1` archiviert.
- [x] Die normale JSON-Sicherung enthält das Legacy-Archiv und stellt es nach vollständiger Validierung wieder her.
- [x] Beschädigte oder nicht schreibbare Legacy-Daten bleiben für Wiederholung oder manuelle Rettung erhalten.
- [ ] Clean Install wurde mit dem aktuellen Kandidaten geprüft.
- [ ] `npm run check:migration` und sämtliche Migrationstests wurden im vollständigen Projektlauf ausgeführt.
- [ ] Repräsentative V0.7-WebView-Daten wurden auf einem physischen Android-Gerät aktualisiert.
- [ ] Migrierte Ereignisse, Zeitersparnis und Statistiken wurden mit dem Ausgangsbestand verglichen.
- [ ] Jedes archivierte Rohfeld wurde bytegenau mit seinem V0.7-Ausgangswert verglichen.
- [ ] Export → Reset → Import stellt dasselbe Legacy-Archiv wieder her.
- [ ] Ein simulierter Speicherfehler lässt die Legacy-Quelle unverändert bestehen.
- [ ] Upgrade vom vorherigen Release-Kandidaten wurde geprüft.
- [ ] App-Update bei aktivem Schutz wurde geprüft.
- [ ] Deinstallation und anschließende Neuinstallation wurden geprüft.

Die genaue Spezifikation steht in `docs/DATA_MIGRATION.md`. `migrationValidationPassed` bleibt bis zum physischen Nachweis für denselben Kandidaten auf `false`.

## 8. Datenschutz, Recht und Support

- [x] Version 1 enthält keinen Account, keine Cloud-Synchronisierung, keine Werbung, keine Analyse und kein Tracking.
- [x] Privacy- und Produktionsprüfungen suchen nach unerwarteten Netzwerk- und Tracker-Mustern.
- [ ] Echter rechtlicher Name beziehungsweise Unternehmen ist eingetragen.
- [ ] Vollständige ladungsfähige Adresse ist eingetragen.
- [ ] Verantwortliche Person ist eingetragen.
- [ ] `support@scrollshield.app` oder die endgültige Support-Adresse ist verifiziert und überwacht.
- [ ] Die finale Datenschutzdomain ist erreichbar und enthält die veröffentlichte Datenschutzerklärung.
- [ ] Alle Platzhalter in App, Store-Paket und Rechtstexten sind ersetzt.
- [ ] Die endgültigen Aussagen wurden gegen den signierten AAB geprüft.

## 9. Google Play Console

- [x] Vorbereitete Data-Safety-Antworten lauten für Entwicklererhebung und Weitergabe auf `Nein`, sofern der finale Build unverändert bleibt.
- [x] Erklärungen für `PACKAGE_USAGE_STATS`, `SYSTEM_ALERT_WINDOW`, Paket-Sichtbarkeit und `FOREGROUND_SERVICE_SPECIAL_USE` sind vorbereitet.
- [x] Version 1 verspricht nur zuverlässigen Whole-App-Schutz, keine garantierte Reels-/Shorts-Unterseiten-Erkennung.
- [x] Medizinische beziehungsweise ADHS-Behandlungsversprechen wurden entfernt.
- [ ] Data Safety wurde im Play Console Formular final bestätigt.
- [ ] Usage-Access- und Overlay-Deklarationen wurden final eingereicht.
- [ ] Foreground-Service-Special-Use-Deklaration wurde final eingereicht.
- [ ] USK-/PEGI-Fragebogen wurde final ausgefüllt.
- [ ] Reviewer-Video zeigt Runtime-Prompt, Schutzkanal, sichtbaren Dienst, direkte Stop-Aktion, Overlay und sicheren Entzug.
- [ ] Reviewer-Video zeigt den kopierten Diagnosebericht mit passendem Stoppcode nach einem sicheren Entzug.
- [ ] Reviewer-Video verwendet exakt denselben Build wie der hochgeladene AAB.
- [ ] Interner oder geschlossener Testtrack wurde vor Produktion erfolgreich abgeschlossen.

## 10. iOS-Status

- [ ] Family-Controls-Entitlement wurde genehmigt.
- [ ] Native Family Controls und Managed Settings sind implementiert.
- [ ] iOS-Berechtigung, Shielding und Wiederherstellung sind auf realen Geräten getestet.
- [ ] Apple-Review-Unterlagen und Video stimmen mit dem tatsächlichen iOS-Build überein.

Der aktuelle iOS-Stand ist nicht einreichbar. Eine Web-/PWA-Vorschau ersetzt keine native Screen-Time-Durchsetzung.

## 11. Endgültige Freigabe

- [ ] Keine offenen Blocker oder kritischen Defekte.
- [ ] Alle Herstellerabweichungen sind behoben oder ausdrücklich aus dem Release ausgeschlossen.
- [ ] Freigabemanifest ist vollständig und gehört zur exakten Version und Build-Nummer.
- [ ] Signierter AAB wurde installiert und erneut einem Smoke-Test unterzogen.
- [ ] Store-Texte, Screenshots, Reviewer-Video und Binärdatei zeigen dieselbe Funktionalität.
- [ ] Rollback-, Support- und Staged-Rollout-Verantwortung sind festgelegt.

Erst danach darf `npm run android:bundle` erfolgreich durch das Release-Gate laufen.
