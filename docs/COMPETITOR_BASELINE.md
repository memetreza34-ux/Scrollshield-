# Konkurrenzanalyse und Positionierung – ScrollShield Android V1

**Recherche:** 9. Oktober 2026. Diese Notizen sind eine externe Marktsicht, **keine** Änderung des autoritativen [V1-Produktumfangs](V1_MASTER_PLAN.md). Anbieter können ihre Funktionen nach diesem Datum ändern; vor Store-Veröffentlichung erneut verifizieren.

## 1. Relevante etablierte Alternativen

| Produkt | Durch Anbieterbelege bestätigte Stärken | Konsequenz für ScrollShield |
| --- | --- | --- |
| **one sec** | Bewusste Intervention beim Öffnen, konfigurierbare Pausen, Re-Intervention während einer Sitzung; absichtliche schnelle App-Wechsel; Android Free laut Hersteller auf **eine App** begrenzt | Öffnungspause **allein** reicht nicht als Wettbewerbsvorteil. ScrollShield bietet in Free zwei Apps und setzt den Schwerpunkt auf progressive Reopen-Eskalation |
| **AppBlock** | App-/Websperren, Zeit-/Nutzungspläne, Strict Mode, Cooldown und Blockier-Bedingungen | Eine weitere Liste von Sperrregeln reicht nicht. ScrollShield sollte schneller eingerichtet sein und primär impulsives **Wiederöffnen** verständlich unterbrechen |
| **Opal (Android)** | Fokus-Sitzungen, Zeitpläne, Tageslimits, Wochenberichte, Pomodoro, Streaks; Android-Eintrag beschreibt AccessibilityService-Nutzung auf Android 14+ | Fokus-Timer, Limits und Trends sind erwartbare Kategorien. ScrollShield konkurriert mit Klarheit, messbarem Reopen-Verhalten und einem sehr einfachen Kernflow, nicht mit der Menge an Gamification-Features |

### Primärquellen

- one sec, Android Intervention: https://feedback.one-sec.app/help/articles/7507890-customize-the-intervention-android
- one sec, Android Re-Intervention: https://feedback.one-sec.app/help/articles/9849242-re-intervention-android
- one sec, absichtlicher App-Wechsel: https://feedback.one-sec.app/help/articles/6268013-intentional-app-switching-android
- one sec, aktueller Free/Pro-Umfang: https://tutorials.one-sec.app/en/articles/3036418
- AppBlock, Zeitpläne: https://appblock.app/help/android/schedules/
- AppBlock, Strict Mode: https://appblock.app/android/
- Opal, Android-Eintrag: https://play.google.com/store/apps/details?id=com.withopal.opal

## 2. Differenzierung ohne unhaltbare Alleinstellungsbehauptung

**Nicht sagen:** „Die erste App, die Reopen erkennt“, „wissenschaftlich bewiesene optimale 5/10/20-Sekunden-Pause“ oder „100 % blockierbar“. Die Konkurrenz bietet bereits Interventionen, Re-Interventionen, Cooldowns und Fokusfunktionen.

**Wirkliche Produktthese zum Testen:**

> Wenn ein Nutzer eine Ablenkungs-App nach kurzem Verlassen mehrfach neu öffnet, erhält er eine stärker werdende, bewusst wahrnehmbare Unterbrechung, statt dieselbe statische Pause.

Das soll sich in **weniger impulsiv akzeptierten Reopens** und einer höheren Quote bewusst abgebrochener Öffnungen zeigen – sofern reale Nutzer-/Messdaten es bestätigen. Nicht als belegte Wirkung behaupten, bevor es einen Test gibt.

**Drei für V1 zentrale Qualitätsvorteile:**

1. **Schneller verstehen:** Auf dem Heute-Screen sofort sehen, ob Schutz arbeitet, und welche Apps geschützt sind.
2. **Nicht dem Nutzer misstrauen:** Free ist dauerhaft brauchbar (2 Apps, Basis-Reopen, 1 Zeitplan, Fokus), keine Werbung, keine manipulative Paywall.
3. **Hohe Vertrauensqualität:** Messbare Ereignisse statt ausgedachter Zeitersparnis; klare Berechtigungen und nachvollziehbare Android-Einschränkungen.

## 3. Konsequenzen für UX und Prioritäten

| Erwartung aus Marktvergleich | Unsere überprüfbare Umsetzung | Entsprechendes Arbeitspaket |
| --- | --- | --- |
| Sofortige Wirkung | Onboarding → zwei Apps wählen → reale Android-Pause funktioniert | SS-101/102, SS-302 |
| Einfache Regeln | Sanft/Ausgewogen zuerst, Stark/Eigene unter Details | SS-304 |
| Adaptive statt statische Unterbrechung | Mehrfache App-Rückkehr → sichtbare Eskalation mit Grenze/Cooldown | SS-201 |
| Keine Session entgleist | Session Guard greift auch ohne erneutes Öffnen | SS-202 |
| Vertrauenswürdige Kennzahlen | Heute zeigt reale Events, Pro zeigt belastbare Trends | SS-206/307 |
| Wertiger Auftritt | Gemeinsames Calm-Control-System für alle Screens **und natives Overlay** | SS-301/309/310 |
| Fairer Kauf | Dritte App → Kontext-Paywall; echte Store-Preise; Restore | SS-402–406 |
| Zuverlässiger Hintergrundschutz | Berechtigungen, Boot, Android-OEM-Testmatrix | SS-104/105/502 |

## 4. Was wir bewusst nicht nachbauen

- Reels-/Shorts-Erkennung oder Produktions-Accessibility-Service nur deshalb aufnehmen, weil andere Apps damit werben.
- Kalender, Standort, externe Konten, Cloud-Sync, Partnerfreigaben, Streaks, XP oder KI-Coach zur vermeintlichen Feature-Parität.
- Ungetestete „XX % weniger Bildschirmzeit“-Erfolgsaussagen.
- Ein überkomplexes Dashboard, das das Hauptproblem (impulsives Wiederöffnen) verdeckt.

**Trade-off:** Ein kleiner, spürbar zuverlässiger Android-Schutz mit eigenständiger Reopen-Mechanik ist für V1 wichtiger als die Anzahl der Checkboxen.

## 5. Konkurrenz- und Markenrisiken

- **ScrollShield** als Name ist nicht automatisch frei. Ähnliche/gleichnamige Apps in derselben Kategorie müssen vor Store-Launch in Google Play sowie bei DPMA/EUIPO überprüft werden.
- Review-Bewertungen, Preise, App-Screenshots und Zahl der Features sind dynamisch. Keine aktuellen Werte ohne erneute externe Verifikation übernehmen.
- Bewertungsmaßstab ist nicht das reine Feature-Zählen, sondern: Einrichtung, native Durchsetzung, Fehltrigger, Stabilität, Transparenz und Pro-Wert.

## 6. Testhypothesen für die Beta

- Nutzer können Schutz für zwei Apps **ohne Erklärung durch den Entwickler** einrichten.
- Nutzer verstehen nach der ersten Unterbrechung, was „Zurück“ und „Weiter“ bedeuten.
- Nach mindestens drei zeitnahen Reopens wird die Eskalation sichtbar, ohne andere Apps unbeabsichtigt zu überlagern.
- Free-Nutzer verstehen den Unterschied zwischen Basis- und Pro-Reopen.
- Nutzer können aus einer Auswertung erkennen, **was gemessen** wurde und was nicht verfügbar ist.
- Große Schrift und TalkBack erhalten die wesentliche Bedienbarkeit.

Die Beta dokumentiert die Ergebnisse auch dann, wenn die Hypothese widerlegt wird. Kein KPI aus bloßen Schätzungen.

## 7. Google-Play-Policy und Billing als reale Constraints

- Aktuelle Foreground-Service-Erklärungen: https://support.google.com/googleplay/android-developer/answer/13392821
- Android Foreground-Service-Typen: https://developer.android.com/develop/background-work/services/fgs/declare
- Play Billing empfiehlt Kaufprüfung vor Entitlement, Pending ohne Freischaltung und korrektes Acknowledgement: https://developer.android.com/google/play/billing/integrate

Vor Veröffentlichung die aktuell geltenden Richtlinien erneut prüfen. Diese Recherche ist kein Beleg, dass Play ScrollShields Overlay- oder `specialUse`-Einsatz genehmigt.
