# ScrollShield – Berechtigungs-Matrix (Permission Strategy)

Diese Matrix definiert die strikte Berechtigungsstrategie für ScrollShield. Das Ziel ist **"Privacy by Design"**: Wir fordern nur an, was technisch absolut notwendig ist, um den Kernwert der App zu liefern. Jede Berechtigung muss im App Store / Google Play Store sauber begründet werden können.

---

## 1. Screen Time API (Family Controls / Managed Settings)
* **Plattform:** iOS (ab iOS 15/16)
* **Wofür gebraucht:** Erkennung der App-Nutzung und Einblendung der nativen Apple-Schilder (Shields) zur Blockierung oder Verzögerung.
* **Status:** **Zwingend erforderlich**
* **Was ohne funktioniert:** Nichts. Auf iOS ist dies der einzige von Apple erlaubte Weg, andere Apps zu blockieren.
* **Nutzer-Erklärung:** *"ScrollShield benötigt Zugriff auf die Bildschirmzeit, um ausgewählte Apps für dich pausieren zu können. Wir sehen keine Inhalte, sondern nur, ob eine geschützte App geöffnet wird."*
* **Fallback-Logik:** Ohne diese Berechtigung bleibt der Nutzer im Onboarding hängen. Ein klarer "Warum brauchen wir das?"-Screen erklärt, dass die App sonst nutzlos ist.

---

## 2. Nutzungsdatenzugriff (`PACKAGE_USAGE_STATS`)
* **Plattform:** Android
* **Wofür gebraucht:** Um zu erkennen, welche App sich aktuell im Vordergrund befindet (z. B. Erkennung, dass TikTok gerade gestartet wurde).
* **Status:** **Zwingend erforderlich**
* **Was ohne funktioniert:** Nichts. Die Blockier-Logik kann nicht auslösen.
* **Nutzer-Erklärung:** *"Damit ScrollShield eingreifen kann, wenn du Instagram & Co. öffnest, müssen wir erkennen können, welche App gerade aktiv ist."*
* **Fallback-Logik:** Harter Blocker im Onboarding. Ohne dieses Recht kann die App nicht aktiviert werden.

---

## 3. Über anderen Apps einblenden (`SYSTEM_ALERT_WINDOW` / Overlay)
* **Plattform:** Android
* **Wofür gebraucht:** Um den "Verzögerungs-Timer" (z. B. 5 Sekunden) oder den Blockier-Bildschirm direkt über der geöffneten Social-Media-App anzuzeigen.
* **Status:** **Dringend empfohlen (Kern-UX)**
* **Was ohne funktioniert:** Die App kann den Nutzer zwar aus der Social-Media-App werfen (zurück zum Homescreen leiten), aber keinen schönen Timer oder Erklärungs-Screen darüberlegen.
* **Nutzer-Erklärung:** *"Um dir den Verzögerungs-Timer anzuzeigen, bevor sich eine App öffnet, muss ScrollShield diesen über der jeweiligen App einblenden dürfen."*
* **Fallback-Logik:** Wenn verweigert, greift das System auf eine aggressive Benachrichtigung zurück ("Du hast TikTok geöffnet! Klicke hier.") oder leitet den Nutzer sofort zurück auf den Homescreen (Intent to Home), was funktional ist, aber weniger elegant. Das Dashboard zeigt einen gelben Warn-Banner (bereits implementiert).

---

## 4. Hintergrundaktivität (Akku-Optimierung ignorieren / `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`)
* **Plattform:** Android
* **Wofür gebraucht:** Verhindert, dass das Android-Betriebssystem ScrollShield nach ein paar Stunden Inaktivität im Hintergrund "killt", was den Schutz deaktivieren würde.
* **Status:** **Dringend empfohlen**
* **Was ohne funktioniert:** Die App funktioniert initial perfekt, der Schutz fällt aber unvorhersehbar aus, wenn das System RAM leert.
* **Nutzer-Erklärung:** *"Damit dein Schutz nicht plötzlich vom System beendet wird, muss ScrollShield im Hintergrund aktiv bleiben dürfen."*
* **Fallback-Logik:** Die App funktioniert, aber das Dashboard zeigt einen Warn-Banner ("Hintergrundschutz eingeschränkt"), der den Nutzer bittet, die Akku-Einstellungen anzupassen.

---

## 5. Benachrichtigungen (`POST_NOTIFICATIONS`)
* **Plattform:** iOS & Android
* **Wofür gebraucht:** Erinnerungen an ablaufende Fokus-Sitzungen, tägliche Zusammenfassungen, Warnungen bei fast erreichten Limits.
* **Status:** **Optional**
* **Was ohne funktioniert:** Der komplette Kernschutz (Verzögerung, Blockieren, Fokus-Modus) funktioniert einwandfrei. Die App ist nur "stiller".
* **Nutzer-Erklärung:** *"Wir erinnern dich, wenn dein Fokus-Modus abgelaufen ist oder du dein Tageslimit fast erreicht hast."*
* **Fallback-Logik:** Die App arbeitet komplett lautlos. Alle Informationen müssen aktiv im Dashboard abgelesen werden.

---

## 6. Bedienungshilfen (Accessibility Service) – *Sonderfall*
* **Plattform:** Android
* **Wofür gebraucht:** Könnte genutzt werden, um das Scrollen physisch zu unterbinden oder extrem schnell auf App-Öffnungen zu reagieren.
* **Status:** **VERZICHTEN (für MVP)**
* **Warum verzichten:** Google Play lehnt Apps extrem schnell ab, die Accessibility Services nutzen, ohne primär für Menschen mit Behinderungen gedacht zu sein. Es erfordert komplexe Video-Beweise beim App-Review.
* **Strategie:** Für das MVP nutzen wir ausschließlich `PACKAGE_USAGE_STATS` (Nutzungsdaten). Das ist zu 100 % Store-konform. Accessibility wird nur als "Hardcore-Modus" in einer späteren Premium-Version evaluiert, falls Nutzer die Standard-Sperre zu leicht umgehen.

---

## App Store & Google Play Review Strategie

Um die App problemlos durch den Review-Prozess zu bekommen, gelten folgende Regeln:

1. **Keine Berechtigung beim ersten Start:** Berechtigungen werden nicht direkt beim App-Start abgefragt. Der Nutzer sieht zuerst das Onboarding, versteht den Wert der App und wird dann auf einen dedizierten "Berechtigungs-Erklärungs-Screen" geleitet.
2. **Klare Sprache:** Wir verwenden keine technischen Begriffe wie "System Alert Window", sondern "Bildschirm-Überlagerung für den Timer".
3. **Datenschutz-Link:** Auf dem Berechtigungs-Screen muss ein direkter Link zur Datenschutzerklärung vorhanden sein, der bestätigt, dass diese Daten das Gerät nicht verlassen.
4. **Graceful Degradation:** Wenn ein Nutzer optionale Rechte (Benachrichtigungen) ablehnt, darf die App nicht abstürzen oder nerven. Ein dezenter Hinweis in den Einstellungen ("Benachrichtigungen aktivieren für Erinnerungen") reicht aus.
