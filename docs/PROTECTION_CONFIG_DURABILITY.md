# Protection Config Durability

Status: **verbindlicher Source-/Evidence-Vertrag**

Diese Spezifikation ergänzt `PROTECTION_START_HANDSHAKE.md`. Sie definiert die persistente Grenze zwischen einer neuen Schutzkonfiguration und einem Android-Service-Start.

## 1. Problem

`SharedPreferences.apply()` aktualisiert den In-Memory-Zustand sofort, bestätigt aber keinen synchron abgeschlossenen Disk-Write. Ein Prozessabbruch unmittelbar nach Config-Sync darf deshalb nicht dazu führen, dass ein späterer Start oder Boot-Recovery mit einer älteren Schutzkonfiguration arbeitet.

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

## 3. App-Start bindet die Generation

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

## 4. Startrequest bindet die Config dauerhaft

`recordProtectionStartRequested(...)` persistiert atomar:

```text
enabled=true
lastStartRequestAt
startRequestConfigGeneration
```

`startRequestConfigGeneration` muss exakt der aktuell durable gespeicherten `protectionConfigGeneration` entsprechen.

Damit ist nach Prozessverlust rekonstruierbar, welche Config-Generation den Start ausgelöst hat.

## 5. Frischer Pending-Start braucht dieselbe Config

Die bisherige 15-Sekunden-Idempotenz gilt nicht allein aufgrund eines frischen `lastStartRequestAt`.

Ein Pending-Start darf nur als derselbe noch laufende Start behandelt werden, wenn zusätzlich gilt:

```text
startRequestConfigGeneration == protectionConfigGeneration
```

Beispiel:

```text
Config A committed
→ Request A ist frisch/pending
→ Config B committed
→ zweiter Startversuch mit B
```

Der alte Request A darf jetzt **nicht** einfach als „bereits in Arbeit“ akzeptiert werden. App-Start endet sofort fail-closed mit `start_failed`. Boot/App-Update endet mit `recovery_start_failed`.

Damit wird ein Config-Mismatch bereits an der Pending-Grenze erkannt und nicht erst bei einer späteren Foreground-Confirmation.

## 6. Foreground-Confirmation prüft erneut

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

## 7. Boot-/App-Update-Kompatibilität

Ältere Installationen können bereits ein dauerhaft gespeichertes `protection_config`, aber noch keine Config-Generation besitzen.

Der Boot-/App-Update-Pfad darf deshalb einmalig eine Generation nachrüsten, aber nur wenn:

- eine Config bereits persistent vorhanden ist;
- die Config nativ als JSON validiert werden kann;
- ein `apps`-Array vorhanden ist;
- die neue Generation selbst erfolgreich per `commit()` persistiert wurde.

Fehlt oder scheitert eine dieser Bedingungen, bleibt Recovery fail-closed.

Ein bereits vorhandener frischer Pending-Request wird bei Recovery ebenfalls nur übernommen, wenn seine gebundene Config-Generation noch aktuell ist.

## 8. Laufende Config-Updates

Nach einem bereits bestätigten Start dürfen normale Config-Syncs weiterhin neue Generationen erzeugen. Der laufende Service lädt die aktuelle durable Config wie bisher nach.

Die Generation-Bindung schützt speziell die Grenze **vor der Startbestätigung**. Sie soll nicht verhindern, dass ein bereits laufender Schutzdienst später legitim neue Regeln übernimmt.

## 9. Diagnose

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

## 10. Automatisierte Verträge

Pflichtcheck:

```text
npm run check:config-durability
```

Er ist Teil von:

```text
npm run verify
npm run readiness
```

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

## 11. Reale Device-Evidence

### APP-07 — Durable config sync before protection start

Ändere Regeln oder aktive Ziel-Apps und starte Schutz unmittelbar danach. Der native Sync muss vor dem Start eine neue `protectionConfigGeneration` dauerhaft bestätigt haben. `startRequestConfigGeneration` muss exakt gleich sein.

Bei simuliertem/erzwungenem Commit-Fehler darf kein Service-Startdispatch erfolgen.

### APP-08 — Config change before foreground confirmation

Pausiere einen Start nach persistiertem Startrequest, aber vor bestätigtem Foreground-Start. Synchronisiere eine andere Config. Danach entweder erneut Start anfordern oder die alte Confirmation fortsetzen.

Erwartung für den erneuten Start während alter Request noch frisch ist:

```text
kein idempotentes Weiterlaufen des alten Requests
fail-closed
lastStopCode=start_failed
```

Erwartung für die verspätete alte Confirmation:

```text
FAILED_CLOSED
enabled=false
lastStartAt unverändert für alte Generation
lastStopCode=start_failed
```

## 12. Gate-Regel

G4/G7/G9 bleiben unvollständig, bis JUnit/Instrumentation sowie APP-07 und APP-08 auf dem exakten Kandidaten real ausgeführt und dokumentiert wurden.