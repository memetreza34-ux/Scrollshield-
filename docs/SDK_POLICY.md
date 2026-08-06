# ScrollShield - Externe SDK & Service Richtlinie

Diese Richtlinie definiert den strikten Umgang mit externen Software Development Kits (SDKs) und Drittanbieter-Diensten in ScrollShield. Unser Ziel ist maximale Privatsphäre, Datensparsamkeit und eine schlanke, performante App.

## 1. Erlaubte SDK-Kategorien

Um die App schlank und sicher zu halten, sind nur folgende Kategorien von externen SDKs zulässig:

- **Core Frameworks:** React, Vite, TailwindCSS, Lucide Icons (bereits im Einsatz).
- **Version 1.0:** Keine Backend-, Auth-, Analytics-, Werbe- oder Crash-Reporting-SDKs.
- **Spätere Online-Funktionen:** Nur nach separater Datenschutzprüfung, aktualisierten Store-Angaben und expliziter Zustimmung, sofern erforderlich.

_Verboten sind:_ Werbenetzwerk-SDKs (AdMob, Facebook SDK), Datenbroker-SDKs, unregulierte Drittanbieter-Tracker.

## 2. Risiken externer SDKs

- **Datenschutz:** Heimliches Sammeln von Nutzerdaten (z.B. Geräte-IDs, Standort, IP-Adressen).
- **Performance:** Erhöhter Akkuverbrauch, längere Ladezeiten, größere App-Größe (Bloatware).
- **Stabilität:** Abstürze durch fehlerhafte Drittanbieter-Code-Updates.
- **Sicherheit:** Schwachstellen im SDK können die gesamte App kompromittieren (Supply Chain Attacks).

## 3. Potenzielle Datensammlung

Selbst harmlose SDKs sammeln oft Metadaten. Wir müssen bei jeder Integration prüfen, ob ein SDK Folgendes erfasst:

- Geräteinformationen (Modell, OS-Version, freier Speicher).
- IP-Adressen (oft für Geo-IP genutzt).
- Nutzungsdaten (Klicks, Verweildauer, Navigation).
- Crash-Logs (können versehentlich PII - Personally Identifiable Information - wie Benutzernamen oder Eingaben enthalten).

_Regel:_ Jedes SDK muss so konfiguriert werden, dass es standardmäßig **keine** PII sammelt. IP-Adressen müssen serverseitig maskiert werden.

## 4. Dokumentation der Nutzung

Jedes integrierte SDK muss in `docs/SDK_REGISTRY.md` dokumentiert werden mit:

- Name und Version.
- Zweck der Integration.
- Erfasste Datenpunkte.
- Link zur Datenschutzerklärung des Anbieters.
- Opt-out/Opt-in Mechanismus im Code.

## 5. Auswirkungen auf App Store Privacy (Apple & Google)

Jedes SDK beeinflusst die "Privacy Nutrition Labels" (Apple) und "Data Safety" (Google Play).

- **Apple Privacy Details:** Wenn ein SDK Daten sammelt, müssen wir deklarieren, ob diese mit der Identität des Nutzers verknüpft sind ("Linked to You") oder für Tracking genutzt werden ("Tracking"). Unser Ziel: Keine Daten für Tracking, alle Daten "Data Not Linked to You".
- **Google Data Safety:** Wir müssen angeben, welche Daten geteilt werden und ob die Datenübertragung verschlüsselt ist.
- _Version 1.0:_ Da keine Analytics- oder Crash-Reporting-SDKs enthalten sind, werden dadurch keine Daten erhoben.

## 6. Vermeidung von Tracking-SDKs

- **Open Source bevorzugen:** SDKs, deren Quellcode einsehbar ist, sind zu bevorzugen.
- **Version 1.0 ohne Analytics:** Auch datenschutzfreundlich beworbene Analytics-Dienste bleiben aus dem Offline-Release ausgeschlossen.
- **Netzwerk-Analyse:** Vor jedem Release prüfen wir den Netzwerktraffic der App, um sicherzustellen, dass keine unerwarteten Daten abfließen.

## 7. Schlanke Offline-Version (Free Tier)

Die kostenlose Version von ScrollShield muss **vollständig offline** funktionieren können.

- **Keine Online-SDKs:** Firebase, Analytics und Crash-Reporting werden nicht mit dem Version-1.0-Bundle ausgeliefert.
- **Lokale Speicherung:** Standardmäßig wird alles lokal gespeichert.
- **Keine Zwangs-Verbindungen:** Die App darf beim Start keine zwingenden Netzwerkverbindungen aufbauen, es sei denn, der Nutzer hat Cloud-Sync explizit aktiviert.

## 8. Architektur: Saubere Trennung (Wrapper-Pattern)

Falls später externe Dienste ergänzt werden, dürfen UI-Komponenten sie nicht direkt aufrufen. Ein zentraler Service muss
Zustimmung, Fehlerbehandlung und Datenminimierung erzwingen und separat getestet werden.
