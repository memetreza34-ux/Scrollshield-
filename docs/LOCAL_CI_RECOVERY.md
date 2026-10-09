# ScrollShield – lokale Prüfungen bei ausgefallenen GitHub Actions

**Stand 2026-10-09.** Status: GitHub Actions führt im betroffenen Konto aktuell Jobs teilweise nur 1–3 Sekunden aus, ohne einen einzigen eigentlichen Workflow-Schritt. Das ist **kein Beweis**, dass der Code fehlerfrei oder fehlerhaft ist. Früher schlug zusätzlich der optionale APK-Artefakt-Upload wegen Speicherlimit fehl.

**Regel:** PR #20 und #21 bleiben ohne valide Prüfungen offen. Ein lokaler Build kann technische Fehler sichtbar machen, ersetzt aber nicht automatisch GitHub-CI plus echte Android-Tests.

## A. GitHub-Konto prüfen (nur Betreiber kann diese Einstellungen öffnen)

1. Auf GitHub **Settings → Billing and licensing → Actions** bzw. **Billing & plans → Usage** (Bezeichnungen können variieren) öffnen. Prüfen, ob Minuten, Spending Limit, Budget oder Rechnungsprobleme Jobs blockieren.
2. Im privaten Repository **Actions → Verify → aktueller Run** öffnen. Bei den Jobs `verify` und `android` kontrollieren, ob sie vor dem Schritt `Checkout` scheitern. Die Run-Anmerkungen und gegebenenfalls die Billing-Warnung in der Oberfläche überprüfen.
3. **Actions → Artifacts/Usage** und GitHub-Speicherbelegung prüfen; alte **nicht mehr benötigte** Workflow-Artefakte über die GitHub-Oberfläche löschen, nachdem wichtige Test-APKs/Protokolle gesichert wurden.
4. Nach Beseitigung einer Kontosperre den **fehlgeschlagenen Workflow erneut ausführen** oder einen neuen Run über Commit auslösen.
5. Erst nach einem wirklich grünen `verify` **und** `android` Job auf dem aktuellen PR-Head ist automatisches Zusammenführen erlaubt.

Wir können die privaten Abrechnungsdaten nicht aus dem Repository-Connector auslesen und löschen nichts willkürlich.

## B. Lokale TypeScript-/UI-Prüfung (Windows 11 / PowerShell)

Voraussetzung: Repository lokal vorhanden, **Node.js 24** gemäß `.github/workflows/verify.yml`, npm. In einem PowerShell-Terminal **im Repositoryordner**:

```powershell
git fetch origin
git switch chatgpt/main-runtime-integrity
npm ci
npm run verify
```

Der Befehl `npm run verify` führt unter anderem TypeScript, ESLint, Prettier, Unit-Tests, Secrets-, Store-, Privacy- und Produktions-Build-Checks aus. **Den ganzen Fehlertext notieren, nicht nur die letzte Zeile**. Die Node-/Dependency-Version nicht ohne Begründung von CI abweichen lassen.

Für den Dokumentations-PR separat:

```powershell
git switch chatgpt/v1-execution-blueprint
npm ci
npm run verify
```

Kein Blind-Merge eines roten PR, auch wenn nur die Dokumentation geändert wurde.

## C. Lokaler Android-JVM-Test + Debug-APK (Windows)

Voraussetzungen: Android Studio/Android SDK, Java **21**, nach `android/gradle` bzw. aktuellem Gradle-Wrapper.

```powershell
git switch chatgpt/main-runtime-integrity
npm ci
npm run android:configure
npm run android:doctor
npm run android:sync
cd android
.\gradlew.bat testDebugUnitTest assembleDebug --stacktrace
```

**APK:** `android/app/build/outputs/apk/debug/app-debug.apk`. Auf eigenes Android-Handy übertragen und installieren; nur selbst gebaute Debug-Artefakte verwenden. Das Test-APK ist **kein** Store-Release und enthält keine produktive Billing-Freigabe.

**Falls `android:configure` oder `android:doctor` abbricht:** JDK/SDK-Pfade anhand tatsächlicher Fehlermeldung berichtigen, keine improvisierten Gradle-/SDK-Upgrades in den Produktbranch committen.

## D. Was als Verifikation gilt

| Nachweis | Aussage, die erlaubt ist |
| --- | --- |
| TypeScript/Prettier/Unit-Tests lokal erfolgreich | UI-/JS-Quellcode lokal getestet |
| Kotlin-JVM-Tests + Debug-APK-Build lokal erfolgreich | Kotlin-Code kompiliert und Unit-Tests bestanden |
| GitHub `verify` und `android` grün auf aktueller Head-SHA | CI auf diesem Commit nachweisbar erfolgreich |
| Installations- und Gerätematrix mit Android-Version/Modell | Bestimmte echte Android-Flows auf genannten Geräten geprüft |
| Play Billing Lizenztests + externe Freigaben | Nur dann monetarisierungs-/releasereif |

Ein grün gebautes APK beweist weder Overlay-Zuverlässigkeit nach Reboot noch Play-Store-Zulassung.

## E. CI-Fehler eskalieren

Wenn nach Freigabe des GitHub-Accounts wieder Jobs starten, die dann **innerhalb** eines Workflow-Schritts scheitern: Job-Logs und konkrete Fehlermeldungen im Issue [SS-002](https://github.com/memetreza34-ux/Scrollshield-/issues/23) festhalten. Nur diese Fehler werden als Code-/Workflow-Probleme behoben. Wer keinen lokalen Rechner mit Android Studio hat, kann bis zur Account-Freigabe nur ein dokumentiertes Source-Review durchführen.
