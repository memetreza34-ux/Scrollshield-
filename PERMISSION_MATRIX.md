# ScrollShield – Berechtigungs-Matrix (Permission Strategy)

Diese Matrix definiert die strikte Berechtigungsstrategie für ScrollShield. Das Ziel ist **"Privacy by Design"**: Wir fordern nur an, was technisch absolut notwendig ist, um den Kernwert der App zu liefern. Jede Berechtigung muss im App Store / Google Play Store sauber begründet werden können.

---

## 1. Screen Time API (Family Controls / Managed Settings)

- **Plattform:** iOS (ab iOS 15/16)
- **Wofür gebraucht:** Erkennung der App-Nutzung und Einblendung der nativen Apple-Schilder (Shields) zur Blockierung oder Verzögerung.
- **Status:** **Erforderlich für native App-Einschränkungen**
- **Was ohne funktioniert:** Onboarding, lokale Regeln, Fokus-Timer, Verlauf und Statistiken bleiben nutzbar. Andere Apps können auf iOS ohne diesen Zugriff nicht systemseitig eingeschränkt werden.
- **Nutzer-Erklärung:** _"ScrollShield benötigt Zugriff auf die Bildschirmzeit, um ausgewählte Apps für dich pausieren zu können. Wir sehen keine Inhalte, sondern nur, ob eine geschützte App geöffnet wird."_
- **Fallback-Logik:** Das Onboarding kann abgeschlossen werden. Dashboard und Berechtigungsseite zeigen transparent, dass der Systemschutz eingeschränkt ist.

---

## 2. Nutzungsdatenzugriff (`PACKAGE_USAGE_STATS`)

- **Plattform:** Android
- **Wofür gebraucht:** Um zu erkennen, welche App sich aktuell im Vordergrund befindet (z. B. Erkennung, dass TikTok gerade gestartet wurde).
- **Status:** **Erforderlich für automatische App-Erkennung auf Android**
- **Was ohne funktioniert:** Lokale Regeln, Fokus-Timer, Verlauf und manuelle Schutzabläufe bleiben nutzbar; automatische Erkennung anderer Apps fällt aus.
- **Nutzer-Erklärung:** _"Damit ScrollShield eingreifen kann, wenn du Instagram & Co. öffnest, müssen wir erkennen können, welche App gerade aktiv ist."_
- **Fallback-Logik:** Kein harter Onboarding-Blocker. Die App erklärt den eingeschränkten Schutz und bietet die Berechtigung später erneut an.

---

## 3. Über anderen Apps einblenden (`SYSTEM_ALERT_WINDOW` / Overlay)

- **Plattform:** Android
- **Wofür gebraucht:** Um den "Verzögerungs-Timer" (z. B. 5 Sekunden) oder den Blockier-Bildschirm direkt über der geöffneten Social-Media-App anzuzeigen.
- **Status:** **Dringend empfohlen (Kern-UX)**
- **Was ohne funktioniert:** Regeln und lokale Auswertung bleiben erhalten, aber ein eigener Schutzbildschirm kann nicht über einer anderen App erscheinen.
- **Nutzer-Erklärung:** _"Um dir den Verzögerungs-Timer anzuzeigen, bevor sich eine App öffnet, muss ScrollShield diesen über der jeweiligen App einblenden dürfen."_
- **Fallback-Logik:** ScrollShield bleibt bedienbar und kann optional Benachrichtigungen verwenden. Das Dashboard zeigt einen sachlichen Hinweis auf den eingeschränkten Systemschutz.

---

## 4. Hintergrundaktivität (Akku-Optimierung ignorieren)

> Umgesetzt ohne die Berechtigung `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`, die Google Play nur wenigen App-Arten erlaubt:
> ScrollShield öffnet die Liste der Akku-Ausnahmen, der Nutzer wählt ScrollShield dort selbst. Der Status kommt von
> Android (`PowerManager.isIgnoringBatteryOptimizations`). Optional; das Dashboard warnt deshalb nicht mehr ohne sie.

- **Plattform:** Android
- **Wofür gebraucht:** Verhindert, dass das Android-Betriebssystem ScrollShield nach ein paar Stunden Inaktivität im Hintergrund "killt", was den Schutz deaktivieren würde.
- **Status:** **Dringend empfohlen**
- **Was ohne funktioniert:** Die App funktioniert initial perfekt, der Schutz fällt aber unvorhersehbar aus, wenn das System RAM leert.
- **Nutzer-Erklärung:** _"Damit dein Schutz nicht plötzlich vom System beendet wird, muss ScrollShield im Hintergrund aktiv bleiben dürfen."_
- **Fallback-Logik:** Die App funktioniert; die Berechtigungsseite zeigt die Karte als optional mit einem Knopf zu den Akku-Einstellungen.

---

## 5. Benachrichtigungen (`POST_NOTIFICATIONS`)

- **Plattform:** iOS & Android
- **Wofür gebraucht:** Erinnerungen an ablaufende Fokus-Sitzungen, tägliche Zusammenfassungen, Warnungen bei fast erreichten Limits.
- **Status:** **Optional**
- **Was ohne funktioniert:** Der komplette Kernschutz (Verzögerung, Blockieren, Fokus-Modus) funktioniert einwandfrei. Die App ist nur "stiller".
- **Nutzer-Erklärung:** _"Wir erinnern dich, wenn dein Fokus-Modus abgelaufen ist oder du dein Tageslimit fast erreicht hast."_
- **Fallback-Logik:** Die App arbeitet komplett lautlos. Alle Informationen müssen aktiv im Dashboard abgelesen werden.

---

## 6. Bedienungshilfe (Accessibility Service) — Post-V1 Research

**V1-Entscheidung:** Die Production-V1 registriert und fordert **keinen AccessibilityService** an.

- `ShortVideoWatchService.kt` darf als experimenteller Forschungsstand im Repository bleiben.
- `enableShortVideoResearch` ist standardmäßig `false`.
- Das Production-Manifest registriert den Dienst nicht.
- Onboarding und V1-Berechtigungsseite fragen keine Bedienungshilfe an.
- V1-Store-Text verspricht kein Reels-/Shorts-spezifisches Blockieren.

Bevor eine spätere Version diese Fähigkeit aktiviert, sind erneut nötig:

1. aktuelle Google-Play-Policy-Prüfung,
2. genaue Play-Console-Deklaration,
3. prominente Offenlegung plus ausdrückliche Zustimmung,
4. reale Geräte-/App-Versions-Tests,
5. ein klarer Fallback, wenn Feed-Erkennung nicht zuverlässig ist.

## 7. Sichtbarkeit anderer Apps (`<queries>` im Manifest)

- **Plattform:** Android (ab Android 11 nötig)
- **Wofür gebraucht:** Ab Android 11 sieht eine App andere Apps nur, wenn sie im Manifest stehen. ScrollShield listet genau die 15 Paketnamen der unterstützten Plattformen (`androidPackages` in `src/types.tsx`). Damit zeigen die App-Kacheln das Symbol der installierten App und der Schutzbildschirm ihren Namen statt des Paketnamens.
- **Status:** **Keine Berechtigung, keine Nutzerfreigabe, keine Play-Console-Deklaration.** Bewusst kein `QUERY_ALL_PACKAGES`: das bräuchte eine Deklaration und sähe alle Apps des Nutzers.
- **Was ohne funktioniert:** Alles bis auf die Symbole (dann Kürzel) und den App-Namen auf dem Schutzbildschirm (dann Paketname).
- **Datenschutz-Grenze:** Ob eine der 15 Apps installiert ist, wird nur auf dem Gerät ausgewertet und nirgends gespeichert oder gesendet. `npm run check:android` prüft, dass die Liste im Manifest genau den Plattformen entspricht.

---

## App Store & Google Play Review Strategie

Um die App problemlos durch den Review-Prozess zu bekommen, gelten folgende Regeln:

1. **Keine Berechtigung beim ersten Start:** Berechtigungen werden nicht direkt beim App-Start abgefragt. Der Nutzer sieht zuerst das Onboarding, versteht den Wert der App und wird dann auf einen dedizierten "Berechtigungs-Erklärungs-Screen" geleitet.
2. **Klare Sprache:** Wir verwenden keine technischen Begriffe wie "System Alert Window", sondern "Bildschirm-Überlagerung für den Timer".
3. **Datenschutz-Link:** Auf dem Berechtigungs-Screen muss ein direkter Link zur Datenschutzerklärung vorhanden sein, der bestätigt, dass diese Daten das Gerät nicht verlassen.
4. **Graceful Degradation:** Wenn ein Nutzer optionale Rechte (Benachrichtigungen) ablehnt, darf die App nicht abstürzen oder nerven. Ein dezenter Hinweis in den Einstellungen ("Benachrichtigungen aktivieren für Erinnerungen") reicht aus.
