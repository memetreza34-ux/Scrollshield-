# ScrollShield – Supply Chain Security v1

Status: **verbindlicher Dependency-/Build-Sicherheitsvertrag**

Letzte Aktualisierung: **16. August 2026**

## 1. Ziel

ScrollShield soll nicht nur eigenen Code prüfen. Ein Release kann auch durch kompromittierte, unnötige oder falsch deklarierte Abhängigkeiten gefährdet werden. Dieses Dokument definiert deshalb den Umgang mit npm, Capacitor, Gradle, AndroidX und GitHub Actions.

## 2. Aktuelle Schutzmaßnahmen

Bereits vorhanden:

- `package-lock.json` und reproduzierbare Installation über `npm ci`;
- GitHub Actions auf immutable Commit-SHAs gepinnt;
- Dependabot für relevante Dependency-Gruppen;
- begrenzter Produktions-SDK-Umfang;
- Third-Party Notices;
- Secret-Check;
- Privacy-/SDK-/Store-Source-Checks;
- Release-Binary-Audit als Pflicht-Evidence;
- Android-v1-Manifest ohne `android.permission.INTERNET`;
- `check-privacy-build.ts` blockiert dokumentationslose Netzwerk-APIs, bekannte Tracker-Marker und eine stille Wiedereinführung der INTERNET-Permission.

## 3. Regeln für neue Dependencies

Eine neue Runtime-Dependency wird nur aufgenommen, wenn mindestens beantwortet ist:

1. Welches konkrete Problem löst sie?
2. Kann vorhandener Code dasselbe ohne zusätzliche Runtime-Abhängigkeit leisten?
3. Welche Berechtigungen/Netzwerkzugriffe/Transitiv-Abhängigkeiten bringt sie mit?
4. Verändert sie Data Safety oder Privacy Policy?
5. Wie aktiv wird sie gepflegt?
6. Wie groß ist der Bundle-/APK-Effekt?
7. Ist die Lizenz kompatibel?
8. Welche Tests schützen unsere Nutzung?

Keine Dependency nur für kosmetische Bequemlichkeit hinzufügen, wenn sie neue Privacy-/Store-/Security-Risiken erzeugt.

Eine künftige Netzwerk-, Cloud-, Analytics- oder Remote-Config-Dependency darf nicht einfach die Offline-First-Gates umgehen. Vor Integration müssen mindestens `PRODUCT_REQUIREMENTS.md`, `THREAT_MODEL.md`, Privacy/Data Safety und die Permission-Strategie bewusst neu bewertet werden.

## 4. GitHub Actions

Pflicht:

- externe Actions mit vollständiger Commit-SHA pinnen;
- Versionskommentar daneben beibehalten;
- Updates nur kontrolliert über Review;
- Actions keine weitergehenden Repository-Rechte geben als nötig.

Der aktuelle Verify-Workflow verwendet `contents: read`; das Prinzip minimaler Rechte bleibt verbindlich.

## 5. npm

Vor Kandidaten-Freeze:

- `npm ci` auf sauberem Checkout;
- Lockfile unverändert reproduzierbar;
- Dependency-Änderungen im PR bewusst prüfen;
- bekannte kritische Advisories bewerten;
- neue Postinstall-/Build-Skripte bewusst prüfen;
- unnötige Runtime-Dependencies entfernen;
- prüfen, ob eine neue Dependency Netzwerk-/Telemetry-Code in den finalen Bundlepfad bringt.

## 6. Gradle / Android

Vor Release prüfen:

- direkte Android-/Capacitor-Abhängigkeiten;
- transitive SDKs;
- Manifest-Merge-Ergebnis;
- tatsächlich enthaltene Permissions;
- tatsächlich enthaltene Services/Receiver/Provider;
- keine unerwarteten Tracker/Ads/Analytics SDKs;
- keine unerwartete Netzwerkfähigkeit;
- R8/Resource Shrinking für Release aktiv.

## 7. SBOM / Dependency Snapshot

Vor dem ersten Production Release soll für den finalen Kandidaten ein archivierter Dependency Snapshot existieren.

Mindestens enthalten:

- `package-lock.json`;
- npm Runtime-/Dev-Dependency-Liste;
- Gradle Dependency Report;
- finale Manifest-/Permission-Liste;
- Third-Party Notices;
- Candidate SHA;
- Version Name / Version Code.

Optional bevorzugt: maschinenlesbare SBOM, wenn sie ohne neue riskante Runtime-Abhängigkeit erzeugt werden kann.

## 8. Security Advisory Behandlung

### Kritisch/High und tatsächlich betroffen

- Release blockieren;
- Exploitability im ScrollShield-Kontext bewerten;
- Update/Fix;
- vollständige Regression;
- neue Kandidaten-SHA.

### Advisory nicht erreichbar/nicht betroffen

- Begründung dokumentieren;
- nicht nur aufgrund eines Namensmatches ignorieren.

## 9. Dependency Update Strategie

Nicht alle Major Updates gleichzeitig kurz vor Release.

Bevorzugt:

1. Sicherheitsfixes;
2. notwendige Plattform-Kompatibilität;
3. kleinere kontrollierte Updates;
4. Major-Framework-Updates separat mit eigener Regression.

## 10. Release-Evidence

Vor `signedBinaryInspected=true` muss belegt sein:

- finaler AAB stammt vom erwarteten Source-Kandidaten;
- keine unerwarteten SDKs/Permissions;
- das finale Manifest enthält weiterhin nur bewusst freigegebene Permissions;
- keine undokumentierte Netzwerk-/Telemetry-Fähigkeit wurde durch transitive Dependencies eingebracht;
- Dependency Snapshot archiviert;
- Privacy-/Data-Safety-Aussagen passen weiterhin;
- keine offenen kritischen Supply-Chain-Blocker.

## 11. Offene Aufgaben v1

- automatisierten Dependency-/SBOM-Snapshot für Release definieren;
- finalen Gradle Dependency Report als Evidence archivieren;
- finalen Manifest-Merge gegen Store-Deklaration prüfen;
- finalen AAB auf transitive netzwerkfähige SDKs und unerwartete Endpoints prüfen;
- Release-Signing- und Play-Credentials außerhalb des Repos organisatorisch absichern.
