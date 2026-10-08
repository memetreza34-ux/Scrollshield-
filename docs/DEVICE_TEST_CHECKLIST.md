# ScrollShield V1 – echter Android-Gerätetest

**Stand: 8. Oktober 2026.** Diese Checkliste gilt für die Android-first-V1 gemäß
[`V1_MASTER_PLAN.md`](V1_MASTER_PLAN.md). GitHub CI kompiliert den Android-Code und
führt Tests aus; das ersetzt **keine** Prüfung auf einem echten Gerät.

## 0. Test-APK beziehen und installieren

Am einfachsten geht das ohne Android Studio:

1. Im privaten GitHub-Repo `memetreza34-ux/Scrollshield-` den Tab **Actions** öffnen.
2. Den neuesten **erfolgreichen** `Verify`-Workflow auf dem getesteten Commit öffnen.
3. Unten bei **Artifacts** die Datei `scrollshield-android-debug` herunterladen.
4. ZIP entpacken, `app-debug.apk` auf ein Android-Handy übertragen und installieren.
   Falls Android nachfragt, die Installation aus der verwendeten Datei-App
   ausdrücklich erlauben; danach die Freigabe wieder deaktivieren.
5. **Nur selbst erzeugte APKs aus diesem Repo verwenden.** Das Debug-APK ist
   nicht für Play Store, öffentliche Verteilung oder echte Kaufabwicklung gedacht.

Alternative für Entwickler: `npm ci`, `npm run android:sync`,
danach `npm run android:open` beziehungsweise `npm run android:build` mit
funktionierendem Android SDK und Java.

**Testprotokoll:** für jeden Fehler Handy-Modell, Android-Version,
App-Version/Commit-SHA, genaue Schritte, erwartetes und tatsächliches
Verhalten sowie gegebenenfalls Screenshot notieren.

## 1. Installation, Navigation und Berechtigungen

- [ ] App startet ohne Absturz, Onboarding verständlich und vollständig.
- [ ] Genau drei Haupttabs: **Heute**, **Schutz**, **Einblicke**.
- [ ] Fokus startet von **Heute**, ist aber kein vierter Haupttab.
- [ ] Android-App-Nutzungszugriff anfragen und aktivieren; Rückkehr zeigt den
      tatsächlich erteilten Status.
- [ ] „Über anderen Apps einblenden“ erteilen; danach eine geschützte App öffnen.
- [ ] Berechtigungen verweigern und erneut erteilen; ohne notwendige
      Berechtigungen darf kein zuverlässiger aktiver Schutz behauptet werden.
- [ ] **Kein** AccessibilityService und **keine** spezielle Reels-/Shorts-
      Erkennung als notwendige V1-Berechtigung.
- [ ] Optional Benachrichtigungen erlauben und wieder entziehen.
- [ ] Nach Rückkehr aus Android-Einstellungen funktionieren Navigation und
      Monitordienst weiterhin; kein UI-Absturz.

## 2. Grundschutz und Free-Grenze

- [ ] Instagram auswählen und mit **Sanft** schützen.
- [ ] Beim Öffnen erscheint die native Unterbrechung; **Zurück** führt aus
      der Ablenkung heraus, **Weiter** ermöglicht bewusstes Öffnen.
- [ ] **Ausgewogen** aktivieren; bei neuem Öffnen wird die konfigurierte
      Pause tatsächlich abgewartet.
- [ ] Innerhalb derselben ununterbrochenen Sitzung erscheint die
      Öffnungs-Unterbrechung nicht fortlaufend erneut.
- [ ] TikTok mit anderen Regeln schützen; die Apps dürfen einander nicht
      überschreiben.
- [ ] Als Free-Nutzer dritte App schützen: erklärter Pro-Paywall erscheint,
      die dritte App wird ohne Pro nicht heimlich aktiv.
- [ ] Geschützte App deaktivieren: zugehörige Unterbrechung entfällt.

## 3. Adaptive Reopen Protection — wichtigste V1-Funktion

- [ ] Instagram öffnen, Pause abwarten und bewusst **Weiter** auswählen.
- [ ] Instagram verlassen und unmittelbar erneut öffnen:
      echter Reopen wird neu bewertet — kein 5-Minuten-Freipass.
- [ ] Wiederholtes Zurückkehren erhöht bei aktiviertem Reopen-Schutz die
      konfigurierte Reibung bis zur Obergrenze.
- [ ] Bei Erreichen des konfigurierten Cooldown-Limits ist eine
      entsprechende native Intervention sichtbar.
- [ ] Instagram schnell verlassen und stattdessen YouTube öffnen:
      **keine verspätete Instagram-Überlagerung auf YouTube**.
- [ ] Beim Wechsel auf den Android-Startbildschirm oder Sperrbildschirm
      darf keine veraltete Unterbrechung hängen bleiben.
- [ ] Handy-Uhr manuell einige Minuten zurückstellen und ursprüngliche
      Einstellung wiederherstellen: zukünftige Reopen-Zeitstempel dürfen
      keine sofortige falsche Eskalation verursachen.
- [ ] Test mit zwei unterschiedlichen geschützten Apps: Reopen-Zähler
      bleiben voneinander getrennt.

## 4. Session Guard und Tagesbudget (Pro-Testmodus)

- [ ] Session Guard für Instagram einschalten, **Weiter** wählen;
      die Sitzung startet **ab dieser Entscheidung**.
- [ ] Bei einer kurzen Test-Sitzungsgrenze erscheint die Unterbrechung
      während Instagram noch im Vordergrund ist.
- [ ] Nach erneutem **Weiter** startet die Sitzungsfrist von vorne.
- [ ] Display während einer Sitzung ausschalten; keine unerwartete
      Sofort-Unterbrechung beim Einschalten.
- [ ] Testweise Uhrzeit verändern: Session Guard orientiert sich an
      Androids monotonic clock, nicht an der verstellbaren Uhrzeit.
- [ ] Tagesbudget erreichen und Instagram nach Überschreiten erneut
      öffnen: das Tageslimit wird zuverlässig geprüft.
- [ ] Limits für zwei Apps getrennt testen; Messwerte entsprechen ungefähr
      den tatsächlichen Android-Nutzungsdaten.

## 5. Zeitpläne, Fokus und Notfallfreigabe

- [ ] Zeitplan 21:00–07:00 prüfen: ab 21 Uhr geschützt, nach 07 Uhr
      nicht mehr durch dieses Fenster gesperrt.
- [ ] Zeitfenster tagsüber und Wochenendregel unabhängig testen.
- [ ] Fokus 15, 30 und 60 Minuten starten; die ausgewählten Apps
      bleiben während des aktiven Fokus geschützt.
- [ ] Fokus endet auch dann, wenn der ScrollShield-Bildschirm geschlossen ist.
- [ ] **Emergency Unlock:** Countdown und begrenzte Dauer prüfen,
      Tageskontingent darf nicht unbemerkt überschritten werden.
- [ ] Strenge Selbstverpflichtung darf das Notfallkontingent
      entsprechend der V1-Regel vorübergehend einschränken.
- [ ] Pro-only Rescue, eigene Fokusdauer und starke Regeln
      nur im Testmodus beziehungsweise mit echter gültiger Pro-Berechtigung
      prüfen; kein Testkauf in der unfertigen Paywall.

## 6. Statistiken, Persistenz und Bedienbarkeit

- [ ] Heute zählt nur nachvollziehbare, native Unterbrechungsereignisse;
      erneutes Öffnen von ScrollShield verdoppelt keine Einträge.
- [ ] Einblicke zeigen keine erfundenen „gesparten Minuten“.
- [ ] Reopen-Beobachtungen, akzeptierte Öffnungen und abgebrochene
      Öffnungen sind logisch unterscheidbar.
- [ ] Große Android-Schriftgrößen, Anzeigevergrößerung und
      Screenreader testen: Beschriftungen dürfen nicht abgeschnitten werden.
- [ ] Android-Zurück-Taste/Geste navigiert korrekt.
- [ ] App schließen und neu starten: Schutzregeln bleiben erhalten.
- [ ] App-Daten zurücksetzen: nativer Monitordienst und Historie werden
      tatsächlich zurückgesetzt.

## 7. Zuverlässigkeit auf mehreren Handys

Nach den Kurztests auf einem Gerät zusätzlich:

- [ ] Nach Android-Neustart ist der Schutz ohne erneutes Öffnen
      von ScrollShield wieder aktiv, sofern Berechtigungen vorliegen.
- [ ] App-Update über bestehende Installation testen; Regeln bleiben korrekt.
- [ ] Entzug von Usage Access/Overlay im laufenden Betrieb: keine
      falsche Schutzanzeige, nach Erneuerung wieder funktionstüchtig.
- [ ] Pixel/AOSP, Samsung One UI und Xiaomi/HyperOS separat prüfen.
- [ ] Längeren Betrieb im Hintergrund, Bildschirm aus/an und Akkuverbrauch
      dokumentieren; OEM-Energiesparverhalten ehrlich als Einschränkung erfassen.
- [ ] Keine Abstürze, ANRs oder offensichtliche Batterie-/Datenschutzprobleme.

## Veröffentlichungskriterien

**Nicht freigeben**, solange native Eingriffe nur in CI und nicht auf
repräsentativen Geräten geprüft sind. Die Test-APK beweist keine Store-Freigabe
und aktiviert keine Play-Käufe. Abonnements, Marke/App-Name,
Datenschutztexte und Play-Console-Deklarationen werden gesondert in
[`OFFENE_PUNKTE.md`](../OFFENE_PUNKTE.md) verfolgt.
