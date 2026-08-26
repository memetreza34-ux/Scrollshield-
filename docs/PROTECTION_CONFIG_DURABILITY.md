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

## 4. Doppelter Speicherfehler / Write Certainty

Auch der Rollback ist ein synchroner `commit()`. Deshalb gibt es einen process-lokalen Zustand:

```text
writeStateCertain
```

Die Policy lautet:

```text
Candidate commit=true                  → SICHER
Candidate commit=false, rollback=true  → SICHER
Candidate commit=false, rollback=false → UNSICHER
```

`UNSICHER` bedeutet nicht, dass ein bereits laufender Schutz sofort beendet wird. Seine bereits veröffentlichte letzte bestätigte Regelbasis darf weiterlaufen.

Aber im selben Prozess gilt anschließend:

```text
kein neuer App-Start
kein neuer Boot-/Update-Startrequest
kein Pending-Request als current
keine Foreground-Confirmation als current
```

bis ein späterer **erfolgreicher Config-Commit** `writeStateCertain` wieder auf `SICHER` setzt.

Damit wird ein doppelter Speicherfehler nicht als bestätigte Persistenz behandelt.

## 5. Laufender Service veröffentlicht nur stabile Snapshots

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

Ändert sich die Config während des Parsens oder wird ein fehlgeschlagener Candidate zurückgerollt, wird dieser Parse verworfen und der nächste Poll beginnt mit der aktuellen bestätigten Generation.

Auch der periodische Target-App-Health-Check darf die Config nicht parallel zu Candidate-Commit/Rollback bewerten.

## 6. App-Start bindet die Generation

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
writeStateCertain == true
UND
expectedConfigGeneration == protection_config_generation
```

Fehlt die Generation, ist sie veraltet oder ist der Schreibzustand `UNSICHER`, wird kein neuer Startrequest akzeptiert. Der Pfad endet fail-closed mit `start_failed`.

## 7. Startrequest bindet die Config dauerhaft

`recordProtectionStartRequested(...)` persistiert atomar:

```text
enabled=true
lastStartRequestAt
startRequestConfigGeneration
```

`startRequestConfigGeneration` muss exakt der aktuell bestätigten `protectionConfigGeneration` entsprechen und `writeStateCertain` muss `true` sein.

Ein noch frischer Pending-Request ist nur idempotent, wenn seine gebundene Config-Generation weiterhin aktuell und der Schreibzustand sicher ist.

## 8. Foreground-Confirmation prüft erneut

`recordProtectionServiceStarted(...)` darf `lastStartAt` nur schreiben, wenn:

```text
writeStateCertain == true
UND
startRequestConfigGeneration == protectionConfigGeneration
```

Ändert sich die Config zwischen Request und Confirmation oder wird der Schreibzustand unsicher, liefert die Confirmation `FAILED_CLOSED`, `enabled=false` wird persistiert und `start_failed` bleibt als Stop-Evidence zurück.

## 9. Boot-/App-Update-Kompatibilität

Ältere Installationen können bereits ein dauerhaft gespeichertes `protection_config`, aber noch keine Config-Generation besitzen.

Der Boot-/App-Update-Pfad darf deshalb einmalig eine Generation nachrüsten, aber nur wenn:

- der process-lokale Schreibzustand sicher ist;
- eine Config bereits persistent vorhanden ist;
- die Config nativ als JSON validiert werden kann;
- ein `apps`-Array vorhanden ist;
- die neue Generation selbst erfolgreich per `commit()` persistiert wurde.

Fehlt oder scheitert eine dieser Bedingungen, bleibt Recovery fail-closed.

## 10. Diagnose

Der Native-Snapshot muss mindestens enthalten:

```text
protectionConfigGeneration
protectionConfigWriteStateCertain
startRequestConfigGeneration
lastProtectionStartRequestAt
lastProtectionStartAt
lastProtectionStopAt
lastProtectionStopCode
lastProtectionStopMessage
```

Der Debug-Screen zeigt den Schreibzustand ausdrücklich als:

```text
SICHER
UNSICHER
```

## 11. Automatisierte Verträge

Pflichtcheck:

```text
npm run check:config-durability
```

Er ist Teil von `npm run verify` und `npm run readiness`.

Der Checker schützt insbesondere:

- synchronen Candidate-Commit;
- vollständigen Pre-Commit-Snapshot;
- synchronen Rollback;
- `ProtectionConfigWriteCertaintyPolicy`;
- Startblockade bei `UNSICHER`;
- kein `apply()` im Durability-Store;
- zweistufige Config-/Generation-Prüfung vor Service-Publish;
- generationgebundene Pending-/Start-/Confirmation-Pfade;
- Diagnose-/Debug-Evidence.

Pure-Java-Verträge:

```text
ProtectionConfigDurabilityStoreTest
ProtectionConfigWriteCertaintyPolicyTest
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

Bei simuliertem Candidate-Commit-Fehler darf kein Startdispatch mit Candidate-Generation erfolgen. Ein bereits laufender Schutz muss mit der vorherigen bestätigten Regelbasis weiterarbeiten.

### APP-08 — Config change before foreground confirmation

Pausiere einen Start nach persistiertem Startrequest, aber vor bestätigtem Foreground-Start. Synchronisiere eine andere Config und setze danach die alte Confirmation fort.

Erwartung:

```text
FAILED_CLOSED
enabled=false
lastStartAt unverändert für alte Generation
lastStopCode=start_failed
```

### APP-09 — Candidate-Commit und Rollback-Commit schlagen fehl

Erzwinge zuerst einen fehlgeschlagenen Candidate-Commit und anschließend auch einen fehlgeschlagenen Rollback-Commit.

Erwartung im selben Prozess:

```text
protectionConfigWriteStateCertain=false
Debug: Config-Schreibzustand = UNSICHER
kein neuer Startrequest
kein Boot-/Update-Recovery-Start
laufender Dienst veröffentlicht keine Candidate-Regel
```

Danach Storage-Bedingung wiederherstellen und einen neuen Config-Sync erfolgreich committen.

Erwartung:

```text
protectionConfigWriteStateCertain=true
Debug: Config-Schreibzustand = SICHER
neue Generation darf wieder normal gestartet werden
```

## 13. Gate-Regel

G4/G7/G9 bleiben unvollständig, bis JUnit/Instrumentation sowie APP-07, APP-08 und APP-09 auf dem exakten Kandidaten real ausgeführt und dokumentiert wurden.
