# ScrollShield – verpflichtender Agenten- und Entwicklungsworkflow

**Gilt für:** ChatGPT, Claude, Google AI Build/Codex und alle anderen Agents, die an diesem Repository arbeiten.

## 1. Reihenfolge der Wahrheit

1. **`docs/V1_MASTER_PLAN.md`:** Produktentscheidungen und Funktionsumfang.
2. **`docs/V1_EXECUTION_PLAN.md`:** Aufgaben-IDs, Phasen, Abhängigkeiten, Qualität, Status.
3. **`docs/COMPETITOR_BASELINE.md`:** externer Vergleich, kein zusätzlicher V1-Scope.
4. **Aktueller `main` + laufende PRs + echte Tests:** Was technisch tatsächlich existiert.
5. Historische ROADMAPs, PWA-Checklisten und Agentenantworten sind nur Kontext.

**Kein Agent darf ohne dokumentierte Entscheidung diese Reihenfolge umdrehen.**

## 2. Jede Änderung muss eine Task-ID haben

Vor der Bearbeitung:

- Task-ID aus `V1_EXECUTION_PLAN.md` nennen.
- Exakten Ist-Zustand im aktuellen GitHub-Head lesen.
- Existierende PRs/andere Agents prüfen, die dieselben Dateien bearbeiten.
- Ursache und gewünschtes Verhalten mit konkretem Akzeptanztest definieren.
- Den kleinsten sinnvollen zusammenhängenden Patch auswählen.

**Nach der Bearbeitung:**

- Änderung, Test und Ergebnis dokumentieren.
- Commit-SHA / PR / betroffene Dateien festhalten.
- Taskstatus nur anhand realer Nachweise ändern.
- Die nächsten Aufgaben anhand der Abhängigkeiten priorisieren, **nicht** anhand dessen, was am einfachsten zu generieren ist.

## 3. Fester Batch-Zyklus

Maximal **drei gezielte Aufgaben** in einem Arbeitspaket, dann:

1. GitHub-Code der drei Aufgaben erneut unabhängig durchlesen.
2. Tests + TypeScript + Kotlin-Build / CI anhand des tatsächlichen Head prüfen.
3. Produktdrift, unnötige Komplexität, Risiken und Regressionen erfassen.
4. Plan aktualisieren und nächste drei Aufgaben anhand des Produktziels auswählen.

Nicht in einer Schleife ständig visuelle Kleinigkeiten verändern, solange der native Kern oder Billing ungeprüft bleibt.

## 4. Pull-Requests und Nachweise

- `main` ist Integrationsbranch, kein Experimentierplatz.
- Pro Aufgabe oder eng zusammengehörigem Batch ein Branch/PR.
- Keine stillen force-pushes, Reverts, Fremdarbeiten überschreiben oder fremde Branches zusammenführen, solange deren Status unklar ist.
- PR-Beschreibung: Task-IDs, Problem, Änderung, Screens/UX, Migrationswirkung, Tests, Risiken, bekannte Lücken.
- **Keine automatischen Merges** bei roten, fehlenden, veralteten oder vom falschen SHA stammenden Checks.
- Wenn GitHub Actions wegen Kontingent oder Runner ausfällt: als `BLOCKED:EXTERNAL` kennzeichnen, lokale Reproduktion anbieten, **nicht** Teststatus schönreden.
- Wenn ein SDK, eine Permission oder ein Datentransfer hinzukommt: explizite Datenschutz-/Store-Policy-Prüfung.

## 5. Android ist nicht nur die React-Vorschau

Für alle systemweiten Schutzfunktionen:

```
React State → versionierter Native Contract → Kotlin Parser/Store
→ Foreground-Erkennung → Rule Engine → Android Overlay
→ Ereignisprotokoll → echte Metrik → UI
```

Jede Ebene ist separat zu prüfen. Ein UI-Slider ohne tatsächlich geändertes Kotlin-Verhalten ist **keine fertiggestellte Funktion**.

Prüfklassen:

- `CODE PRESENT`: Code existiert.
- `TESTED IN CI`: passende Checks laufen tatsächlich grün auf diesem Commit.
- `DEVICE VERIFIED`: Modell/Android-Version/Szenario/Testresultat dokumentiert.
- `RELEASE READY`: zusätzlich Play-/Datenschutz-/Support-/Billing-Anforderungen erfüllt.

## 6. Designqualität ist ein Abnahmekriterium

Calm-Control-Richtung aus Masterplan gilt für React **und** native Overlay-Screens:

- begrenzte Tokens statt komponentenspezifischer Zufallswerte
- lesbare Typografie, sinnvolle Hierarchie und Leerflächen
- Status/Fehler/Leerzustände
- harmonische Interaktionsflächen und Motion
- geprüfte große Schrift, TalkBack und Android-Zurück-Geste
- reale Screenshots auf mindestens zwei Displaygrößen
- keine erfundenen statistischen Zahlen, Fake-Demos, „vollständig blockiert“-Behauptungen

Eine funktionierende Funktion mit unfertigem, verwirrendem UI bleibt `QA OPEN`.

## 7. Kosten, Sicherheit und Nutzervertrauen

- Keine zusätzlichen kostenpflichtigen Services ohne dokumentierten Nutzen und Betreiberentscheidung.
- Keine neuen Cloud-/Tracker-/SDK-Abhängigkeiten nur um Entwicklungszeit zu sparen.
- Keine API-Keys, Keystores, Secrets, Testkonten oder Belege committen.
- Paywall/Pro nie über lokal editierbares `pro.active` in Produktion freischalten.
- Store-basierte Preise/Trials nur aus echten Store-Produkten, nie aus einem Mock live anzeigen.
- Emergency Unlock nicht aus Paywall-Gründen verstecken.
- Alles, was auf einem Gerät nicht funktioniert, wird als begrenzt/offen beschrieben.

## 8. Bericht am Ende jedes Batches

Ein kompakter Bericht:

```
Batch: [SS-...]
GitHub: [Branch/PR, Head-SHA]
Geändert: [Dateien und funktionaler Grund]
Verifiziert: [exakte Tests/CI-Run/Geräte]
Noch offen: [konkrete Risiken und Blocker]
Planstatus: [welche Task-IDs geändert]
Nächste 3 Aufgaben: [IDs nach Abhängigkeiten]
Entscheidung vom Betreiber nötig: [nur wenn zwingend]
```

Keine unbewiesenen Aussagen wie „App komplett fertig“, „Android getestet“ oder „Play Store bereit“, wenn lediglich ein Build vorhanden ist.
