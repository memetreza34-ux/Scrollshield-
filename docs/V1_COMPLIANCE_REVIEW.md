# V1 Compliance & Security — Release-Audit

**Stand: 2026-10-09.** Dies ist eine technische Prüfmatrix, keine Rechtsberatung oder Bescheinigung. Zu verwenden mit [V1_MASTER_PLAN](V1_MASTER_PLAN.md), [V1_EXECUTION_PLAN](V1_EXECUTION_PLAN.md) und [V1_PRODUCT_EXPERIENCE](V1_PRODUCT_EXPERIENCE.md).

## 1. Vertrauensprinzipien

ScrollShield darf Nutzer nie über den Schutzstatus, die gemessenen Zahlen oder ihr Abo täuschen. Die App darf grundlegende Android-Funktionen, Systemdialoge oder die Nutzung anderer Apps nicht versehentlich behindern. Die tatsächliche Durchsetzung muss auf realen Geräten nachgewiesen sein.

**Release-Stopps:** unzuverlässiger Notfallzugang; fehlerhaftes Overlay nach App-Wechsel; falscher Status „aktiv“; unberechtigte Pro-Freischaltung; ungeklärte Datenflüsse; geheime Schlüssel im Repository; irreführende Abo-Bedingungen; ungenehmigter Einsatz sensibler Berechtigungen.

## 2. Dateninventar und Datenschutz

Für jeden Datenpunkt Pflichtspalten: `Quelle | Zweck | Speicherort | Verschlüsselung | Aufbewahrung | Export | Löschung | Empfänger | Netzwerk | rechtliche Bewertung`.

| Kategorie | Prüfen |
| --- | --- |
| Geschützte Apps, Paketnamen, Regeln, Zeitpläne | lokal notwendige Felder, Retention, Android Backup/Restore |
| Zeitstempel für Reopen, Sessions, Notfallfreigabe | Aufbewahrungsdauer, Logcat, Ereignis-Deduplizierung |
| Android Usage Access und Nutzungsminuten | Datenminimierung und korrekte Datenschutzbeschreibung |
| JSON-Export/Import | Hinweis auf externe Dateispeicherung; Importlimits und Validierung |
| Optionale Textgründe | sensible Eingaben vermeiden bzw. gezielt schützen |
| Support-Anfragen | Empfangende Stellen, externe Verarbeitung, Speicherfristen |
| Google-Play-Käufe | Kauf-/Abo-Metadaten, eventueller Verifikationsdienst, Drittanbieter-Privacy |
| Crash-/Diagnostics-Daten | keine unbewusste Übertragung und keine sensiblen Inhalte in Logs |

**DSGVO:** Art. 5, 25 und 32 prüfen: Datenminimierung, Privacy by Design/Default, angemessener Schutz. Die Frage, welche Verarbeitung rein auf dem Endgerät unter welchen Rollen und Rechtsgrundlagen fällt, muss anhand der tatsächlichen Architektur beurteilt werden. Quelle: https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/obligations_en

**TDDDG §25:** Speicherung/Zugriff auf Endgeräte und mögliche Ausnahme für unbedingt erforderliche Funktionen beurteilen. Nicht pauschal mit „alles lokal“ abtun. https://www.gesetze-im-internet.de/ttdsg/__25.html

**Google Play Data safety:** Antworten müssen reale SDKs und Netzwerkwege abbilden. Google Play Billing bedeutet nicht automatisch, dass die App selbst Bankkartendaten erhält; Kaufhistorie, Support und Verifikationsdienste sind separat zu bewerten. https://support.google.com/googleplay/android-developer/answer/10787469

**Speicherprüfung:** Native verschlüsselte Preferences, React-WebView-Speicher, Datei-Exporte und Android-Backups getrennt dokumentieren; nicht ohne Nachweis behaupten, alle Daten seien verschlüsselt. Reset muss React **und** Native Daten löschen.

## 3. EU AI Act — expliziter Entscheidungsbaum

**Stand V1:** V1-Schutzlogik basiert auf menschlich programmierten Schwellen, Zeiten und Zählregeln. Ein KI-Coach, trainiertes ML-Modell und externe Modell-API sind nicht Teil des geplanten Produkts. Die Nutzung von KI **als Entwicklungswerkzeug** macht diese Endnutzer-App allein noch nicht zu einem KI-System.

**Vorläufiges Audit-Ergebnis:** Die V1 ist nach gegenwärtiger Beschreibung **voraussichtlich kein KI-System** nach Art. 3(1). Kein pauschales „EU-AI-Act zertifiziert“ oder „rechtlich irrelevant“ behaupten. Vor Release die tatsächlichen Dependencies und alle Vorschlags-/Suggestion-Algorithmen überprüfen.

Wird später ein ML-Modell, AI-Coach, selbstadaptives Empfehlungssystem oder Chatbot integriert, ist **vorher** ein neues Produkt-/Compliance-Gate nötig: Systemdefinition, Rollen, Risiko, Zweck, Datennutzung, Transparenz, Evaluierung und die dann geltenden Umsetzungsfristen.

Quellen:
- https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-3
- https://ai-act-service-desk.ec.europa.eu/en/ai-act/recital-12
- https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai

## 4. Android und Google Play

| Bereich | Verifikation |
| --- | --- |
| Usage Access | Nachvollziehbarer Zweck, echte OS-Einwilligung und fehlgeschlagenen Zugang erkennen |
| Display-over-other-apps | Nur gewählter Schutz, nicht über fremde App oder kritischer Systemoberfläche, sofort beendbar |
| `foregroundServiceType=specialUse` | Android-Manifest plus konkrete Play-Erklärung und tatsächliche Nutzerkontrolle |
| Benachrichtigungen | System-Permission und Verhalten ab Android 13 testen |
| Produktions-AccessibilityService | **Nicht** registrieren oder als V1-Zusage erwähnen |
| App-Start/Boot/Update | OEM-Einschränkungen nachvollziehbar testen; keine „100 % zuverlässig“-Behauptung |
| Store-Listing | Nur echte getestete Fähigkeiten und Screenshots; keine Heilversprechen |
| App-Name und Paketkennung | Verwechslungs-/Markenprüfung vor erstem Upload; Änderungen technisch konsistent |

Google-Quellen:
- https://support.google.com/googleplay/android-developer/answer/13392821
- https://support.google.com/googleplay/android-developer/answer/18258653

Eine Berechtigung im Manifest ist **keine** Play-Store-Zulassung.

## 5. Mobile-App-Sicherheit

**Prüfbasis:** https://mas.owasp.org/MASVS/ – Kategorien STORAGE, CRYPTO, AUTH, NETWORK, PLATFORM, CODE, RESILIENCE, PRIVACY.

- Native Bridge: gültiges Schema, Bereichsprüfungen, versionierter Vertrag; kein automatischer Pro-Grant durch lokale Daten.
- Schutz-Overlay: Foreground-Neubewertung bei tatsächlichem Anzeigen; sauberes Dismissal nach App-Wechsel, Lockscreen, Permission-Entzug und Monitor-Stopp.
- Persistenz: korrupte/zu große Imports, unbekannte Versionen, Atomicität, Geräte-Uhrzeitänderung und Rollback testen.
- Release-Build: keine Debug-Endpunkte, keine ungewollten sensitive Logs; R8/Minification und signierte Android-Bundles.
- Supply Chain: Node/npm- und Gradle-Dependencies, Lizenzverzeichnis, SDK Registry, Geheimnis-Scan, Release-Rechte.
- Schon entfernte Firebase-/Google-Schlüssel aus früherer Git-Historie auf Gültigkeit prüfen und bei Bedarf rotieren.
- Keystore/Play-Service-Credentials niemals commiten; Freigaben und Wiederherstellungsprozess dokumentieren.

## 6. Abonnement und Verbraucherschutz

Vollständige verifizierte Kaufzustände gehören zu [Billing-Spezifikation](V1_BILLING_EXPERIENCE.md). Kaufprüfung vor Pro, Pending ohne Benefits, echtes Restore, Downgrade, Kündigung und faire Trial-Information sind Release-Gates.

Google Play verlangt klar verständliche Angaben zu Leistungsumfang, Preis, Zeitraum, automatischer Verlängerung und Trial-Umwandlung sowie leicht zugängliche Aboverwaltung: https://support.google.com/googleplay/android-developer/answer/9900533

Weitere **juristisch zu klärende** Punkte: §5 DDG/Impressum, EU-Verbraucher- und Vertragsinformationen, ggf. in Deutschland geltende Kündigungsanforderungen, DSA-Händlerangabe, Abgaben/Steuern, Datenschutzerklärung und reale Anbieteridentität.

## 7. BFSG / Accessibility

Prüfen, ob der entgeltliche App-/Online-Abschluss unter „Dienstleistungen im elektronischen Geschäftsverkehr“ des BFSG fällt und ob für den konkreten Anbieter Ausnahmen gelten. Keine pauschale Befreiung behaupten.

Quellen: https://www.gesetze-im-internet.de/bfsg/ und https://www.bundesfachstelle-barrierefreiheit.de/DE/Barrierefreiheitsstaerkungsgesetz/FAQ-elektronischer-Geschaeftsverkehr/faq-elektronischer-Geschaeftsverkehr_node

Unabhängig von der rechtlichen Einordnung: Tapziele 48dp, TalkBack, große Schrift, Kontraste, Text-Alternativen, dialogfreie Notfallwege und zugänglicher Kauf-/Kündigungsflow testen.

## 8. Jüngere und verletzliche Nutzer

Bisherige Zielgruppe 16+ als zu bestätigende Produktentscheidung, **nicht** als vollständig geprüfte juristische Maßnahme. Altersrecht, DSGVO Art. 8 und Play Target Audience erst anhand finaler Berechtigungen/Kaufarchitektur bewerten.

Keine medizinischen Heilversprechen, keine beschämenden Interventionssätze, kein Zwang zur Angabe privater Gründe, keine manipulative Paywall und keine nicht absehbaren dauerhaften Sperren.

## 9. Nachweis- und Verantwortungsmatrix

| ID | Arbeit | Nachweis / Freigabe |
| --- | --- | --- |
| SC-01 | Dateninventar und tatsächliche Datenflüsse | Quellcode/Netzwerkprüfung + veröffentlichte Policy |
| SC-02 | Android Overlay/Foreground/Notfall | Gerätetest-Protokolle und Manifest-/Play-Check |
| SC-03 | Play Billing / Kaufprüfung / Refund/Expiry | Lizenztester, geprüfter Entitlement-Flow |
| SC-04 | Build-/Dependencies-/Secrets-/Storage-Prüfung | CI-Run, Review und Restore/Reset-Test |
| SC-05 | DSGVO/TDDDG/DDG/DSA/BFSG | Betreiber- und qualifizierte Rechtsprüfung |
| SC-06 | EU AI Act Produktklassifikation | Dokumentierter Code-/Dependency-Audit |
| SC-07 | Play-Console-Compliance | Store-Deklaration, Demo und aktuelles Policy-Review |
| SC-08 | Accessibility und Nutzer-Sicherheit | echte Gerätetests, UX-Abnahme, kritische Flows |
| SC-09 | Branding, Anbieterangaben und Geschäftssetup | Freigabe Eigentümer vor Store-Upload |

Keine Checkbox ohne überprüfbaren Beleg abhaken. Erst nach Abschluss der relevanten SC-Punkte kann „rechtlich/releasetechnisch geprüft“ berichtet werden.
