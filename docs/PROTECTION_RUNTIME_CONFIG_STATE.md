# Protection Runtime Config State

Status: **verbindlicher Source-/Evidence-Vertrag**

Diese Spezifikation ergänzt `PROTECTION_CONFIG_DURABILITY.md`. Sie beschreibt, welche bereits laufenden In-Memory-Zustände an eine veröffentlichte Config-Generation gebunden sind.

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
- Verdrahtung in `verify` und `readiness`.

Der Check ist **keine** reale Android-Evidence für RUNTIME-01 bis RUNTIME-04.
