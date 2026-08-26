# Protection Runtime Config State

Status: **verbindlicher Source-/Evidence-Vertrag**

Diese Spezifikation ergänzt `PROTECTION_CONFIG_DURABILITY.md`. Sie beschreibt, welche bereits laufenden In-Memory-Zustände an eine veröffentlichte Config-Generation gebunden sind und welche lokalen Schutzaktionen vor einer temporären Freigabe dauerhaft bestätigt sein müssen.

## Grundregel

Eine erfolgreiche neue Config-Generation darf alte Laufzeitzustände nicht still weiterverwenden.

```text
G1 veröffentlicht
→ temporäre Freigabe / sichtbares Overlay / laufende Runtime-Regeln / laufender Usage-Tick
→ G2 wird durable gespeichert
→ G1-Usage-Grenze schließen
→ G2 veröffentlichen
→ G1-Laufzeitzustand invalidieren
```

Zusätzlich gilt für jede neue temporäre Freigabe:

```text
Schutzentscheidung gültig
→ Enforcement-Zähler/History durable speichern
→ lokales Action-Event durable speichern
→ erst dann temporären Zugang gewähren
```

Ein Speicherfehler darf niemals zu Zugang ohne bestätigte Schutz-Evidence führen.

## Generation-scoped Runtime State

Bei einem echten Wechsel von `cachedConfigGeneration` zu einer anderen nichtleeren Generation gilt nach Abschluss der alten Usage-Grenze:

```text
cachedConfigGeneration = G2
rulesByPackage = G2
publishedConfigGeneration = G2
temporaryAccessUntil.clear()
hideOverlay()
```

Damit darf eine in G1 gewährte normale Session oder Notfallfreigabe nicht automatisch unter G2 weiterlaufen.

## Overlay-Aktionen

Beim Aufbau eines Overlays wird gespeichert:

```text
actionConfigGeneration = cachedConfigGeneration
```

Vor einer Freigabe muss die Aktion erneut prüfen:

```text
actionConfigGeneration ist noch aktuelle Runtime-Generation
UND
overlayPackage entspricht weiterhin dem geklickten Target
```

Ein alter Button aus G1 darf nach G2 keine neue `temporaryAccessUntil`-Freigabe, keinen Intentional-Open-Event und keine Emergency-Freigabe erzeugen.

## Uncertain Config Writes

Bei `protectionConfigWriteStateCertain=false` darf ein fehlgeschlagener Candidate nicht als neue Runtime-Generation veröffentlicht werden.

Der bereits laufende Dienst darf ausschließlich seine letzte bestätigte `publishedConfigGeneration` weiterverwenden. Neue Starts, neue generationgebundene Requests und neue persistente Config-Wahrheiten bleiben blockiert, bis ein späterer erfolgreicher Config-Sync den Zustand wieder auf `SICHER` setzt.

Bei `UNSICHER` wird deshalb auch **keine neue Usage-Generation veröffentlicht**. Der letzte bestätigte Runtime-Snapshot bleibt die einzige Regelbasis.

## Usage-Grenze

Die Zeit vor dem Publish von G2 darf nicht fälschlich als Nutzung einer in G2 neu eingeführten oder neu zugeordneten Rule/App-ID verbucht werden.

Der Service schließt deshalb bei einem echten bestätigten Generationwechsel den alten Tick **vor jeder Mutation der Runtime-Regeln**:

```text
invalidateRuntimeState = G1 != G2
↓
generationBoundaryAt = System.currentTimeMillis()
↓
recordAllowedUsage(null, generationBoundaryAt)
↓
erst danach:
  cachedConfigGeneration = G2
  rulesByPackage.clear()/putAll(G2)
  temporaryAccessUntil.clear()
  hideOverlay()
```

`recordAllowedUsage(...)` verwendet zu diesem Zeitpunkt noch:

```text
lastUsagePackage aus G1
rulesByPackage aus G1
temporaryAccessUntil aus G1
```

und schreibt die bis zur Grenze anrechenbare Zeit deshalb unter `previousRule.id` aus G1 in den Usage-Coordinator. Gleichzeitig setzt `foregroundPackage=null` die Tick-Grenze zurück. Der direkt folgende Enforcement-Pass startet die nächste Messperiode unter G2 frisch.

Damit ist `RUNTIME-04` **source-seitig gehärtet**. Das ersetzt nicht die reale Android-Evidence der gespeicherten Usage-Buckets.

## Durable Intentional Open

`recordIntentionalOpen(...)` ist eine Autorisierungsgrenze, weil seine History die spätere Anti-Binge-Entscheidung beeinflusst.

Darum gilt:

```text
countdown abgeschlossen
→ recordIntentionalOpen(...).commit() == true
→ appendProtectionEvent(type=open).commit() == true
→ temporaryAccessUntil.put(...)
```

`SharedPreferences.apply()` ist für diese Autorisierungs-Evidence verboten.

Schlägt der History-Commit oder der Event-Commit fehl, bleibt das Overlay aktiv und es wird **kein** temporärer Zugang erteilt.

## Durable Emergency Unlock

Der Emergency-Tageszähler ist enforcement-kritisch, weil `maxPerDay` sonst durch einen Prozesskill umgangen werden könnte.

Darum gilt:

```text
Emergency weiterhin berechtigt
→ incrementEmergencyCount(...).commit() == true
→ appendProtectionEvent(type=emergency).commit() == true
→ temporaryAccessUntil.put(...)
```

Auch hier ist `apply()` verboten. Ein fehlgeschlagener Commit erzeugt keinen temporären Zugang.

### Konservative Partial-Failure-Semantik

Counter/History und Event sind zwei synchrone persistente Schritte. Wenn der erste Commit erfolgreich war, der zweite aber fehlschlägt, wird **kein Zugang** erteilt. Der bereits bestätigte Counter/History-Schritt wird nicht zurückgedreht.

Das kann bei einem seltenen Storage-Fehler konservativ eine Öffnung bzw. Emergency-Nutzung zählen, obwohl der Zugang anschließend nicht gewährt wurde. Es kann aber nicht zu einem Schutz-Bypass führen.

Ebenso kann ein Prozesskill nach beiden erfolgreichen Commits, aber vor dem In-Memory-Grant, einen bestätigten Action-Count ohne tatsächliche Session hinterlassen. Auch das ist bewusst fail-closed statt fail-open.

## Reale Device-/E2E-Evidence

### RUNTIME-01 — Temporary access revoked on config generation change

Erzeuge unter G1 eine aktive normale oder Emergency-Freigabe. Ändere anschließend eine relevante Regel und synchronisiere G2. Die alte Freigabe muss sofort ungültig sein; beim nächsten geschützten Foreground-Zustand muss G2 gelten.

### RUNTIME-02 — Stale overlay action cannot authorize after G2

Lasse ein G1-Overlay sichtbar, veröffentliche G2 und versuche anschließend die alte G1-Aktion auszulösen. Es darf keine Freigabe, kein `open`-/`emergency`-Event und keine neue temporäre Session entstehen. Das alte Overlay muss entfernt werden.

### RUNTIME-03 — Uncertain write keeps last published runtime only

Erzwinge Candidate-Commit `false` und Rollback-Commit `false`. Diagnose muss `Config-Schreibzustand = UNSICHER` zeigen. Der laufende Dienst darf nur die zuletzt veröffentlichte bestätigte Generation nutzen; Candidate-Regeln dürfen nicht aktiv werden. Ein späterer erfolgreicher Sync muss wieder `SICHER` herstellen.

### RUNTIME-04 — Usage boundary across generation switch

1. Konfiguriere G1 so, dass Package P zu Rule-ID A gehört und erzeuge eine aktive temporäre Freigabe.
2. Halte P im Vordergrund und erzeuge messbare Usage unter G1.
3. Synchronisiere während derselben Foreground-Session G2, wobei P einer anderen Rule-ID B zugeordnet wird oder B ausschließlich in G2 existiert.
4. Lasse den Dienst G2 veröffentlichen und die Messung danach weiterlaufen.
5. Drain/flush die Usage-Evidence und prüfe die Buckets.

Erwartung:

```text
Zeit vor generationBoundaryAt → ausschließlich Rule-ID A
Zeit nach generationBoundaryAt → ausschließlich G2-Regel/Rule-ID B, sofern unter G2 freigegeben
keine Vor-G2-Zeit in einem ausschließlich G2 gehörenden Bucket
keine doppelte Zählung über der Grenze
```

Dieser Fall benötigt reale Android-Evidence und bleibt bis zur Ausführung offen.

### RUNTIME-05 — Intentional-open evidence survives process loss

1. Erzeuge eine normale `Bewusst öffnen`-Freigabe.
2. Prüfe unmittelbar danach, dass Open-History und lokales `open`-Event vorhanden sind.
3. Beende den Prozess unmittelbar nach der Aktion und starte ScrollShield erneut.
4. Prüfe erneut die Anti-Binge-History und Event-Evidence.

Erwartung:

```text
Open-History bleibt vorhanden
open-Event bleibt vorhanden
Anti-Binge berücksichtigt die bestätigte Öffnung weiterhin
kein Zugang wurde erteilt, bevor beide Commits bestätigt waren
```

### RUNTIME-06 — Emergency counter survives process loss

1. Konfiguriere einen kleinen `maxPerDay`-Wert.
2. Führe einen gültigen Emergency-Unlock aus.
3. Beende den Prozess unmittelbar danach und starte App/Schutz erneut.
4. Prüfe Tageszähler, lokales Emergency-Event und verbleibende Freigaben.

Erwartung:

```text
Emergency-Tageszähler bleibt konsumiert
emergency-Event bleibt vorhanden
maxPerDay kann durch Prozessneustart nicht zurückgesetzt werden
kein Emergency-Zugang ohne erfolgreich bestätigten Counter- und Event-Commit
```

## Automatisierter Source-Vertrag

```text
npm run check:runtime-config-state
```

Der Check schützt:

- `ProtectionConfigRuntimePolicy`;
- Pure-Java-Policy-Tests;
- generationgebundene `temporaryAccessUntil`-Invalidierung;
- Overlay-Entfernung bei Generationwechsel;
- `actionConfigGeneration`-Revalidierung beim Klick;
- `UNSICHER`-Semantik für zuletzt veröffentlichte Runtime-Regeln;
- die Reihenfolge `recordAllowedUsage(null, generationBoundaryAt)` **vor** G2-Rule-Publish/Grant-Invalidierung;
- Verwendung der noch aktuellen `previousRule.id` beim Abschluss des alten Usage-Ticks;
- synchrones `commit()` für Intentional-Open-History und Emergency-Tageszähler;
- `appendProtectionEvent(...)` als überprüfbaren synchronen Commit;
- keine temporäre Freigabe vor bestätigter History-/Counter- und Event-Persistenz;
- Verdrahtung in `verify` und `readiness`.

Der Check ist **keine** reale Android-Evidence für RUNTIME-01 bis RUNTIME-06.
