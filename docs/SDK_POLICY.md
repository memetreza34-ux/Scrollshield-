# ScrollShield - Externe SDK & Service Richtlinie

Diese Richtlinie definiert den strikten Umgang mit externen Software Development Kits (SDKs) und Drittanbieter-Diensten in ScrollShield. Unser Ziel ist maximale Privatsphäre, Datensparsamkeit und eine schlanke, performante App.

## 1. Erlaubte SDK-Kategorien
Um die App schlank und sicher zu halten, sind nur folgende Kategorien von externen SDKs zulässig:
- **Core Frameworks:** React, Vite, TailwindCSS, Lucide Icons (bereits im Einsatz).
- **Backend/Auth (Optional/Premium):** Firebase (nur für Cloud-Sync & Auth, strikt getrennt von der Offline-Version).
- **Crash Reporting (Optional/Opt-in):** Z.B. Sentry oder Firebase Crashlytics (nur nach expliziter Zustimmung).
- **Analytics (Optional/Opt-in):** Z.B. PostHog oder TelemetryDeck (nur anonymisiert, nur nach expliziter Zustimmung).

*Verboten sind:* Werbenetzwerk-SDKs (AdMob, Facebook SDK), Datenbroker-SDKs, unregulierte Drittanbieter-Tracker.

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

*Regel:* Jedes SDK muss so konfiguriert werden, dass es standardmäßig **keine** PII sammelt. IP-Adressen müssen serverseitig maskiert werden.

## 4. Dokumentation der Nutzung
Jedes integrierte SDK muss in einer internen `SDK_REGISTRY.md` dokumentiert werden mit:
- Name und Version.
- Zweck der Integration.
- Erfasste Datenpunkte.
- Link zur Datenschutzerklärung des Anbieters.
- Opt-out/Opt-in Mechanismus im Code.

## 5. Auswirkungen auf App Store Privacy (Apple & Google)
Jedes SDK beeinflusst die "Privacy Nutrition Labels" (Apple) und "Data Safety" (Google Play).
- **Apple Privacy Details:** Wenn ein SDK Daten sammelt, müssen wir deklarieren, ob diese mit der Identität des Nutzers verknüpft sind ("Linked to You") oder für Tracking genutzt werden ("Tracking"). Unser Ziel: Keine Daten für Tracking, alle Daten "Data Not Linked to You".
- **Google Data Safety:** Wir müssen angeben, welche Daten geteilt werden und ob die Datenübertragung verschlüsselt ist.
- *Strategie:* Durch striktes Opt-in für Analytics/Crash-Reports können wir in den Stores deklarieren, dass die Datensammlung optional ist.

## 6. Vermeidung von Tracking-SDKs
- **Open Source bevorzugen:** SDKs, deren Quellcode einsehbar ist, sind zu bevorzugen.
- **Privacy-First Alternativen:** Statt Google Analytics nutzen wir datenschutzfreundliche Alternativen (z.B. PostHog, Plausible, TelemetryDeck), die ohne Cookies und PII auskommen.
- **Netzwerk-Analyse:** Vor jedem Release prüfen wir den Netzwerktraffic der App, um sicherzustellen, dass keine unerwarteten Daten abfließen.

## 7. Schlanke Offline-Version (Free Tier)
Die kostenlose Version von ScrollShield muss **vollständig offline** funktionieren können.
- **Code-Splitting:** Externe SDKs (wie Firebase oder Analytics) werden per dynamischem Import (`import()`) geladen. Wenn ein Nutzer Cloud-Features nicht nutzt oder Analytics ablehnt, wird der Code dafür gar nicht erst in den Speicher geladen.
- **Lokale Speicherung:** Standardmäßig wird alles lokal gespeichert.
- **Keine Zwangs-Verbindungen:** Die App darf beim Start keine zwingenden Netzwerkverbindungen aufbauen, es sei denn, der Nutzer hat Cloud-Sync explizit aktiviert.

## 8. Architektur: Saubere Trennung (Wrapper-Pattern)
Externe Dienste werden niemals direkt in den UI-Komponenten aufgerufen. Wir nutzen Wrapper-Services (siehe `src/lib/externalServices.ts`), die prüfen, ob der Nutzer zugestimmt hat, bevor sie das eigentliche SDK aufrufen. Dies garantiert, dass Opt-outs zu 100% respektiert werden.
