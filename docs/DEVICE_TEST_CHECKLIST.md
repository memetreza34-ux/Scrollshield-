# Test auf dem Android-Handy

Stand: 24. September 2026. Der Android-Teil von ScrollShield ist bisher nur gelesen, nie gebaut oder ausgeführt worden.
Diese Liste prüft ihn auf einem echten Gerät. Hake jeden Punkt ab. Weicht etwas von „Erwartet“ ab, notiere: was du
gemacht hast, was passiert ist, Handy-Modell und Android-Version. Ein Screenshot hilft fast immer.

## 0. Vorbereitung (einmalig)

- [ ] Android Studio installieren. Beim ersten Start die Standard-Einrichtung wählen; sie bringt Java und das Android-SDK
      mit.
- [ ] Im Projektordner ausführen: `npm run android:configure`, danach `npm run android:doctor`. Der zweite Befehl muss
      ohne Fehler durchlaufen.
- [ ] Handy: Einstellungen → Über das Telefon → sieben Mal auf „Build-Nummer“ tippen. Dann in den Entwickleroptionen
      „USB-Debugging“ einschalten und das Handy per Kabel verbinden.
- [ ] `npm run android:sync`, dann `npm run android:open`. In Android Studio oben dein Handy auswählen und auf „Run“
      klicken.
- [ ] Schlägt das Bauen fehl: die komplette Fehlermeldung kopieren. Das ist dann der erste Fehler, den wir beheben.

## 1. Start und Berechtigungen

- [ ] Onboarding durchlaufen. **Erwartet:** keine Abstürze, am Ende das Dashboard.
- [ ] Berechtigungen → „App-Nutzungszugriff“ aktivieren. **Erwartet:** die Android-Einstellung öffnet sich; nach der
      Rückkehr steht die Karte auf „AKTIV“.
- [ ] Gleiches für „Über anderen Apps einblenden“.
- [ ] „Benachrichtigungen“ aktivieren. **Erwartet:** Android fragt nach (ab Android 13), danach „AKTIV“.
- [ ] „Kurzvideo-Erkennung (Bedienungshilfe)“ aktivieren, in den Android-Einstellungen den ScrollShield-Dienst
      einschalten. **Erwartet:** nach der Rückkehr „AKTIV“.
- [ ] Einen Schalter umlegen, der nur in ScrollShield existiert (z. B. „Zuverlässiger Schutz im Hintergrund“), dann kurz
      in eine andere App und zurück. **Erwartet:** der Schalter bleibt, wie du ihn gesetzt hast.
- [ ] Instagram als geschützte App aktivieren. **Erwartet:** eine dauerhafte Benachrichtigung „ScrollShield ist aktiv“.

## 2. App-Sperre

Teste mit Instagram; jede andere geschützte App geht auch.

- [ ] Modus „Soft“: Instagram öffnen. **Erwartet:** innerhalb von etwa 2 Sekunden erscheint der Schutzbildschirm,
      „Weiter“ geht sofort.
- [ ] Modus „Standard“ mit 15 Sekunden Verzögerung. **Erwartet:** Countdown von 15, danach „Weiter“. Nach „Weiter“
      erscheint der Schutzbildschirm 5 Minuten lang nicht erneut.
- [ ] Modus „Strict“. **Erwartet:** kein „Weiter“, nur „Zurück zum Startbildschirm“.
- [ ] Auf dem Schutzbildschirm die Zurück-Taste drücken. **Erwartet:** du landest auf dem Startbildschirm.
- [ ] Den Modus in ScrollShield ändern, ohne das Handy neu zu starten. **Erwartet:** beim nächsten Öffnen von Instagram
      gilt der neue Modus.

## 3. Zeitfenster

- [ ] Instagram → „Nach Tageszeit“ einschalten und das Fenster, in dem du gerade bist (z. B. „Arbeitszeit“), auf
      „Gesperrt“ stellen. ScrollShield schließen, Instagram öffnen. **Erwartet:** gesperrt, mit dem Text „In diesem
      Zeitfenster ist die App gesperrt“.
- [ ] Modus „Standard“, „Weiter“ drücken, dann das aktuelle Zeitfenster auf „Gesperrt“ stellen und Instagram erneut
      öffnen. **Erwartet:** trotzdem gesperrt; die 5 Minuten nach „Weiter“ gelten hier nicht.
- [ ] Das Fenster wieder auf „Normal“ stellen. **Erwartet:** wieder der eingestellte Modus.

## 4. Kurzvideo-Erkennung

- [ ] Reels-Schutz für Instagram an, „Swipe-Unterbrecher“ an (alle 10 Wischer).
- [ ] Einstellungen → „Erkennung prüfen“, dann Instagram-Reels öffnen und zurück zu ScrollShield. **Erwartet:** es
      erscheinen Beobachtungen für Instagram. Wenn Reels nicht als erkannt gelten, einen Screenshot dieses Bildschirms
      machen – dann passt die Erkennung nicht zu deiner Instagram-Version.
- [ ] In Reels 10 Mal wischen. **Erwartet:** nach dem 10. Wischer die Unterbrechung.
- [ ] Beim Wischen zwischendurch die Benachrichtigungsleiste herunterziehen und die Tastatur öffnen (z. B. Kommentar).
      **Erwartet:** der Zähler läuft weiter und fängt nicht von vorn an.
- [ ] Im normalen Instagram-Feed (nicht Reels) scrollen. **Erwartet:** keine Kurzvideo-Unterbrechung.
- [ ] Tageslimit für Kurzvideos auf „Blockiert“ stellen, Reels öffnen. **Erwartet:** sofort unterbrochen.
- [ ] App-Nutzungszugriff ausschalten, nur die Bedienungshilfe an lassen. Die Wischer-Zahl ändern. **Erwartet:** die neue
      Zahl gilt sofort, ohne Neustart.
- [ ] TikTok schützen und öffnen. **Erwartet:** die ganze App zählt als Feed.
- [ ] 3 Minuten Reels schauen, dann ScrollShield öffnen. **Erwartet:** spätestens nach einer Minute zeigen Dashboard und
      „Kurzvideo-Schutz“ die Minuten.

## 5. Fokus

- [ ] Bei Instagram „Fokus-Modus Verhalten“ auf „Blockieren“ stellen, 15 Minuten Fokus starten. **Erwartet:**
      Instagram ist gesperrt.
- [ ] ScrollShield aus der App-Übersicht wegwischen und das Ende abwarten. **Erwartet:** Benachrichtigung
      „Fokuszeit beendet“, eventuell ein paar Minuten später.
- [ ] Fokus starten und vorzeitig beenden. **Erwartet:** zum geplanten Ende kommt keine Benachrichtigung.
- [ ] „Fokus-Erinnerungen“ ausschalten, Fokus bis zum Ende laufen lassen. **Erwartet:** keine Benachrichtigung.

## 6. Erinnerungen

Zum Testen darfst du die Uhrzeit des Handys vorstellen (automatische Zeit aus). Danach wieder einschalten.

- [ ] „Abend-Erinnerung“ an, ScrollShield schließen, Uhrzeit auf 21:58 stellen. **Erwartet:** gegen 22 Uhr „Zeit zum
      Abschalten“, eventuell ein paar Minuten später.
- [ ] „Abend-Erinnerung“ aus, gleicher Test. **Erwartet:** nichts.
- [ ] „Tageszusammenfassung“ an, nach 20 Uhr ScrollShield geöffnet lassen. **Erwartet:** „Dein Tag mit ScrollShield“,
      wenn es an dem Tag Aktivität gab.

## 7. Dauerbetrieb

- [ ] Handy eine Stunde liegen lassen (Bildschirm aus), dann Instagram öffnen. **Erwartet:** der Schutz greift noch.
- [ ] Samsung, Xiaomi, Huawei und ähnliche: in den Akku-Einstellungen prüfen, ob ScrollShield „eingeschränkt“ ist. Den
      Test einmal mit und einmal ohne Einschränkung machen.
- [ ] Handy neu starten und entsperren, **ohne** ScrollShield zu öffnen, dann Instagram öffnen. **Erwartet:** der
      Schutzbildschirm erscheint (die dauerhafte Benachrichtigung ist nach dem Hochfahren wieder da).
- [ ] ScrollShield über Android Studio neu installieren (Update), danach Instagram öffnen. **Erwartet:** der Schutz
      greift, ohne ScrollShield zu öffnen.

## 8. Tageslimit und Anti-Binge

- [ ] Bei Instagram ein Tageslimit von 5 Minuten setzen, Modus „Soft“. Instagram 5 Minuten nutzen („Weiter“), schließen
      und erneut öffnen. **Erwartet:** gesperrt mit „Tageslimit erreicht: heute 5 von 5 Minuten“.
- [ ] ScrollShield öffnen. **Erwartet:** die Instagram-Minuten im Dashboard passen ungefähr zur echten Nutzung.
- [ ] Tageslimit aus, Anti-Binge an (z. B. Warnung ab 2 Öffnungen in 10 Minuten, Sperre ab 4 in 20 Minuten). Instagram
      mehrmals öffnen und jeweils „Weiter“ wählen. **Erwartet:** ab der 3. Öffnung der Hinweis „Du hast Instagram in den
      letzten 10 Minuten schon 2-mal geöffnet“; ab der 5. gesperrt mit „Zu oft geöffnet“.
- [ ] Anti-Binge-Warnung erreichen und zusätzlich das aktuelle Zeitfenster auf „Gesperrt“ stellen. **Erwartet:**
      gesperrt, nicht nur gewarnt.

## 9. Verlauf und Statistik

- [ ] Instagram im Modus „Strict“ zweimal öffnen, im Modus „Standard“ einmal „Weiter“ und einmal „Zurück zum
      Startbildschirm“ wählen. Dann ScrollShield öffnen. **Erwartet:** spätestens nach einer Minute steht im Dashboard
      „3 unbewusste Impulse heute gestoppt.“; im Verlauf stehen die Einträge mit „Auf dem Handy gesperrt“, „Unterbrochen
      und nicht geöffnet“ und „Nach der Unterbrechung geöffnet“.
- [ ] ScrollShield schließen und wieder öffnen. **Erwartet:** die Zahl bleibt 3, nichts wird doppelt gezählt.
- [ ] Eine Kurzvideo-Unterbrechung auslösen (Abschnitt 4). **Erwartet:** sie erscheint im Verlauf als „Kurzvideo: …“.

## Bekannte Lücken – nicht als Fehler melden

Diese Punkte sind bekannt und dokumentiert. Notiere trotzdem, wie sehr sie im Alltag stören:

- **Geprüft wird beim Öffnen.** Wer über das Tageslimit hinaus in der App bleibt, wird erst beim nächsten Öffnen
  gesperrt.
- **Keine Notfallfreigabe auf dem Handy.** Eine Sperre lässt sich dort nicht vorzeitig aufheben.
- **Fokus-Ende bei geschlossener App:** Die Sperre bleibt, bis ScrollShield wieder geöffnet wird.
- **Erinnerungen** kommen oft ein paar Minuten später.
