# Protection Runtime Config State

Status: **verbindlicher Source-/Evidence-Vertrag**

Diese Spezifikation ergänzt `PROTECTION_CONFIG_DURABILITY.md`. Sie beschreibt, welche bereits laufenden In-Memory-Zustände an eine veröffentlichte Config-Generation gebunden sind.

## Grundregel

Eine erfolgreiche neue Config-Generation darf alte Laufzeitzustände nicht still weiterverwenden.

```text
G1 veröffentlicht
→ temporäre Freigabe / sichtbares Overlay / laufende Runtime-Regeln
→ G2 wird durable gespeichert und veröffentlicht
→ G1-Laufzeitzustand wird invalidiert
```

## Generation-scoped Runtime State

Bei einem echten Wechsel von `cachedConfigGeneration` zu einer anderen nichtleeren Generation gilt:

```text
temporaryAccessUntil.clear()
hideOverlay()
rulesByPackage = G2
publishedConfigGeneration = G2
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

## Usage-Grenze

Die Usage-Zählung über einen Generationwechsel ist ein eigener Evidence-Punkt. Die Zeit vor dem Publish von G2 darf nicht fälschlich als Nutzung einer in G2 neu zugeordneten Regel oder App-ID verbucht werden.

Dieser Punkt ist derzeit als reale/weiter zu härtende Grenze dokumentiert und darf nicht allein aus dem Runtime-State-Source-Guard als bestanden gelten.

## Reale Device-/E2E-Evidence

### RUNTIME-01 — Temporary access revoked on config generation change

Erzeuge unter G1 eine aktive normale oder Emergency-Freigabe. Ändere anschließend eine relevante Regel und synchronisiere G2. Die alte Freigabe muss sofort ungültig sein; beim nächsten geschützten Foreground-Zustand muss G2 gelten.

### RUNTIME-02 — Stale overlay action cannot authorize after G2

Lasse ein G1-Overlay sichtbar, veröffentliche G2 und versuche anschließend die alte G1-Aktion auszulösen. Es darf keine Freigabe, kein `open`-/`emergency`-Event und keine neue temporäre Session entstehen. Das alte Overlay muss entfernt werden.

### RUNTIME-03 — Uncertain write keeps last published runtime only

Erzwinge Candidate-Commit `false` und Rollback-Commit `false`. Diagnose muss `Config-Schreibzustand = UNSICHER` zeigen. Der laufende Dienst darf nur die zuletzt veröffentlichte bestätigte Generation nutzen; Candidate-Regeln dürfen nicht aktiv werden. Ein späterer erfolgreicher Sync muss wieder `SICHER` herstellen.

### RUNTIME-04 — Usage boundary across generation switch

Erzeuge messbare Nutzung unter G1, veröffentliche während derselben Foreground-Session G2 und prüfe die gespeicherten Usage-Buckets. Nutzungszeit vor dem Generationwechsel darf nicht einer ausschließlich in G2 neu eingeführten oder neu zugeordneten Rule/App-ID zugerechnet werden. Dieser Fall benötigt reale Android-Evidence und bleibt bis zur Ausführung offen.

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
- Verdrahtung in `verify` und `readiness`.

Der Check ist **keine** reale Android-Evidence für RUNTIME-01 bis RUNTIME-04.
