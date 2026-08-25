# Protection Config Durability

Status: **verbindlicher Source-/Evidence-Vertrag**

Diese Spezifikation ergänzt `PROTECTION_START_HANDSHAKE.md`. Sie definiert die persistente Grenze zwischen einer neuen Schutzkonfiguration und einem Android-Service-Start.

## 1. Problem

`SharedPreferences.apply()` aktualisiert den In-Memory-Zustand sofort, bestätigt aber keinen synchron abgeschlossenen Disk-Write. Ein Prozessabbruch unmittelbar nach Config-Sync darf deshalb nicht dazu führen, dass ein späterer Start oder Boot-Recovery mit einer älteren Schutzkonfiguration arbeitet.

Auch `SharedPreferences.commit()` kann fehlschlagen. Ein fehlgeschlagener Candidate darf deshalb weder als erfolgreich synchronisiert gelten noch vom bereits laufenden Service als neue Regelbasis übernommen werden.

Zusätzlich darf ein konkurrierender zweiter Config-Sync nicht unbemerkt mit einem Startrequest der vorherigen Konfiguration vermischt werden.

## 2. Durable Config Commit

`ProtectionConfigDurabilityStore.commitConfig(...)` persistiert in **einem synchronen `commit()`**:

```text
protection_config
unavailable_app_ids
unavailable_active_app_ids
protection_config_generation
```

`protection_config_generation` ist eine neue UUID pro erfolgreichem Sync.

`syncProtectionConfig()` darf erst erfolgreich nach TypeScript zurückkehren, wenn dieser Commit `true` geliefert hat.

`SharedPreferences.apply()` ist für diesen Vertrag verboten.

## 3. Fehlgeschlagener Candidate-Commit

Vor jedem Candidate-Write wird der komplette vorherige Config-Tupelzustand gesichert, inklusive der Information, ob die einzelnen Keys vorher überhaupt existierten.

Liefert der Candidate-`commit()` `false`, wird vor dem Verlassen von `ProtectionServiceDispatchGuard.LOCK` der vorherige Zustand wiederhergestellt:

```text
alte protection_config
alte unavailable_app_ids
alte unavailable_active_app_ids
alte protection_config_generation
```

Ein fehlgeschlagener neuer Sync wird anschließend an TypeScript abgelehnt.

Für einen bereits laufenden Schutz gilt bewusst **fail-safe statt Schutz-Abschaltung**:

```text
neue Candidate-Config nicht durable
→ Candidate ablehnen
→ letzte durable Config/Generation behalten
→ laufender Schutz arbeitet mit letzter bestätigter Regelbasis weiter
```

Bei einem ersten Setup ohne vorherige durable Config kann anschließend kein generationgebundener Service-Start erfolgen.

Der Rollback ist selbst ein synchroner Best-Effort-Disk-Write. Falls das Speichermedium generell keine Writes mehr akzeptiert, darf daraus keine falsche erfolgreiche Persistenzbehauptung entstehen; der fehlgeschlagene Candidate bleibt abgelehnt und reale Device-/Storage-Failure-Evidence ist weiterhin erforderlich.

## 4. Laufender Service veröffentlicht nur stabile Snapshots

`ScrollShieldProtectionService.refreshConfiguration()` liest `configJson` und `configGeneration` zuerst unter:

```text
ProtectionServiceDispatchGuard.LOCK
```

Danach wird die Config in einen lokalen Rule-Snapshot geparst. Bevor dieser Snapshot in `rulesByPackage`, `focusMode` und `hasActiveConfiguredRule` veröffentlicht wird, liest der Service unter demselben Lock erneut die aktuelle Config und Generation.

Nur wenn beide Grenzen identisch sind:

```text
parsedConfigJson == latestConfigJson
UND
parsedConfigGeneration == latestConfigGeneration
```

wird der Snapshot veröffentlicht.

Ändert sich die Config während des Parsens oder wird ein fehlgeschlagener Candidate zurückgerollt, wird dieser Parse verworfen und der nächste Poll beginnt mit der aktuellen durable Generation.

Auch der periodische Target-App-Health-Check darf die Config nicht parallel zu Candidate-Commit/Rollback bewerten.

## 5. App-Start bindet die Generation

TypeScript erhält nach erfolgreichem Sync:

```text
configGeneration
```

und startet anschließend ausschließlich mit:

```text
startProtectionService({ expectedConfigGeneration })
```

Native akzeptiert den Start nur, wenn:

```text
expectedConfigGeneration == protection_config_generation
```

Fehlt die Generation oder ist sie inzwischen veraltet, wird kein neuer Startrequest akzeptiert. Der Pfad endet fail-closed mit `start_failed`.

## 6. Startrequest bindet die Config dauerhaft

`recordProtectionStartRequested(...)` persistiert atomar:

```text
enabled=true
lastStartRequestAt
startRequestConfigGeneration
```

`startRequestConfigGeneration` muss exakt der aktuell durable gespeicherten `protectionConfigGeneration` entsprechen.

Damit ist nach Prozessverlust rekonstruierbar, welche Config-Generation den Start ausgelöst hat.

Ein noch frischer Pending-Request ist nur idempotent, wenn seine gebundene Config-Generation weiterhin aktuell ist:

```text
frischer Request + gleiche Config → weiter pending
frischer Request + neue Config   → nicht mehr current
```

Der App-Start endet im zweiten Fall fail-closed; Boot-/App-Update-Recovery verwendet `recovery_start_failed`.

## 7. Foreground-Confirmation prüft erneut

`recordProtectionServiceStarted(...)` darf `lastStartAt` nur schreiben, wenn:

```text
startRequestConfigGeneration == protectionConfigGeneration
```

Ändert sich die Config zwischen Request und Confirmation:

```text
Config A committed
→ Request bindet A
→ Config B committed
→ verspätete Confirmation von A
```

muss die Confirmation `FAILED_CLOSED` liefern, `enabled=false` persistieren und `start_failed` als Stop-Evidence hinterlassen. `lastStartAt` darf für A nicht fortgeschrieben werden.

## 8. Boot-/App-Update-Kompatibilität

Ältere Installationen können bereits ein dauerhaft gespeichertes `protection_config`, aber noch keine Config-Generation besitzen.

Der Boot-/App-Update-Pfad darf deshalb einmalig eine Generation nachrüsten, aber nur wenn:

- eine Config bereits persistent vorhanden ist;
- die Config nativ als JSON validiert werden kann;
- ein `apps`-Array vorhanden ist;
- die neue Generation selbst erfolgreich per `commit()` persistiert wurde.

Fehlt oder scheitert eine dieser Bedingungen, bleibt Recovery fail-closed.

Ein frischer Boot-/Update-Pending-Request aus einer inzwischen veralteten Config-Generation darf nicht als laufender aktueller Start akzeptiert werden.

## 9. Laufende Config-Updates

Nach einem bereits bestätigten Start dürfen normale Config-Syncs weiterhin neue Generationen erzeugen. Der laufende Service übernimmt jedoch nur einen Snapshot, dessen JSON und Generation beim zweiten locked Check noch aktuell sind.

Die Generation-Bindung schützt damit sowohl die Grenze **vor der Startbestätigung** als auch die Veröffentlichung neuer Regeln in einen bereits laufenden Dienst.

## 10. Diagnose

Der Native-Snapshot muss mindestens enthalten:

```text
protectionConfigGeneration
startRequestConfigGeneration
lastProtectionStartRequestAt
lastProtectionStartAt
lastProtectionStopAt
lastProtectionStopCode
lastProtectionStopMessage
```

Für einen bestätigten Start müssen die beiden Config-Generationen übereinstimmen.

## 11. Automatisierte Verträge

Pflichtcheck:

```text
npm run check:config-durability
```

Er ist Teil von:

```text
npm run verify
npm run readiness
```

Der Checker schützt zusätzlich:

- vollständigen Pre-Commit-Snapshot;
- synchronen Rollback bei Candidate-Commit-Fehler;
- kein `apply()` im Durability-Store;
- zweistufige Config-/Generation-Prüfung vor Service-Publish;
- generationgebundene Pending-/Start-/Confirmation-Pfade.

Pure-Java-Vertrag:

```text
ProtectionConfigDurabilityStoreTest
```

Android-Instrumentation:

```text
ProtectionConfigDurabilityInstrumentedTest.durableConfigGenerationBindsStartRequestAndConfirmation
ProtectionConfigDurabilityInstrumentedTest.staleConfigGenerationCannotCreateStartRequest
ProtectionConfigDurabilityInstrumentedTest.freshPendingRequestFromPreviousConfigIsNotCurrent
ProtectionConfigDurabilityInstrumentedTest.configChangeBeforeConfirmationFailsClosedWithoutConfirmingOldRequest
ProtectionConfigDurabilityInstrumentedTest.legacyDurableConfigReceivesGenerationBeforeBootStyleStartRequest
```

Diese Verträge sind erst dann Execution-Evidence, wenn sie auf dem exakten Candidate tatsächlich ausgeführt wurden.

## 12. Reale Device-Evidence

### APP-07 — Durable config sync before protection start / write failure

Ändere Regeln oder aktive Ziel-Apps und starte Schutz unmittelbar danach. Der native Sync muss vor dem Start eine neue `protectionConfigGeneration` dauerhaft bestätigt haben. `startRequestConfigGeneration` muss exakt gleich sein.

Bei simuliertem/erzwungenem Candidate-Commit-Fehler gilt:

```text
kein erfolgreicher Sync
kein Startdispatch mit Candidate-Generation
vorherige durable configGeneration bleibt maßgeblich
laufender Service übernimmt keine Candidate-Regel
```

Existiert bereits ein laufender Schutz, muss er mit der vorherigen bestätigten Regelbasis weiterarbeiten. Existiert noch keine durable Config, muss der Start blockiert bleiben.

### APP-08 — Config change before foreground confirmation

Pausiere einen Start nach persistiertem Startrequest, aber vor bestätigtem Foreground-Start. Synchronisiere eine andere Config. Danach die alte Confirmation fortsetzen.

Erwartung:

```text
FAILED_CLOSED
enabled=false
lastStartAt unverändert für alte Generation
lastStopCode=start_failed
```

## 13. Gate-Regel

G4/G7/G9 bleiben unvollständig, bis JUnit/Instrumentation sowie APP-07 und APP-08 auf dem exakten Kandidaten real ausgeführt und dokumentiert wurden.
