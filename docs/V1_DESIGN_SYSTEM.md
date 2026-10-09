# Calm Control – visuelle Design-Spezifikation für ScrollShield V1

**Stand:** 2026-10-09 · **Ziel:** eigenständige, hochwertige Android-UI mit visueller und funktionaler Konsistenz.  
**Kein fertiges Design:** Dies ist die **verbindliche Entwurfshypothese**. Exakte Tokenwerte sind Vorschläge und müssen gegen Screenshots, reale Displays, Kontrast, Accessibility und Nutzerverständnis getestet werden. Masterplan bleibt vorrangig.

## 1. Wie die App sich anfühlen soll

**Ruhig. Bewusst. Präzise. Vertrauenswürdig.**

- Ruhig wie ein gutes Android-Systemwerkzeug, nicht wie eine farbige Gamification-App.
- Premium durch Typografie, Raum, durchdachte Interaktionen und haptische Rückmeldung; nicht durch künstliche Glows oder Glaseffekte.
- Der Nutzer fühlt **Kontrolle**, nicht Schuld.
- Daten sind lesbar, niemals Deko.
- Android-Native-Overlay und React-UI wirken wie **eine** App, ohne Android-Systemdialoge zu imitieren.

**Hauptsatz auf dem Welcome-Screen:** „Weniger automatisch öffnen. Bewusster entscheiden.“

### Anti-AI-Slop-Designregeln

Keine generischen Gradient-Hintergründe, keine allgegenwärtigen „Glow Cards“, keine riesigen violetten Radien, keine achtfarbigen Akzente, keine riesigen Shadow-Drops, keine zufälligen Emojis, keine künstlichen „Gesundheits-Scores“, keine unscharfen Placeholder-Charts. Gute UI entsteht aus präzisem Raster, sinnvoller Hierarchie und echten Zuständen.

## 2. Design Tokens – initialer Vorschlag (noch per QA zu bestätigen)

| Token | Vorschlag | Anwendung |
| --- | --- | --- |
| `color.bg` | `#090D0C` | Hauptfläche, nie vollschwarz ohne Not |
| `color.surface` | `#141A18` | einzelne gruppierte Abschnitte |
| `color.surfaceRaised` | `#1C2420` | Modals/Bottombereiche, sparsam |
| `color.border` | `#2B3631` | 1px Trennlinien, nur bei Bedarf |
| `color.textPrimary` | `#F2F7F3` | Titel, Zahlen, Buttons |
| `color.textSecondary` | `#ABBAB0` | Beschreibungen, Meta |
| `color.emerald` | `#65D5A0` | aktive, positive **Interaktion**, nicht jedes Element |
| `color.warning` | `#F0C778` | eingeschränkter Schutz |
| `color.danger` | `#F09A90` | Löschung / echte Fehler, nicht Nutzerscham |
| `radius.card` | 16 dp | Gruppen, nicht alles als Karte |
| `radius.button` | 12–14 dp | CTA und sekundäre Buttons |
| `radius.sheet` | 20 dp | Sheets/Dialoge |
| `spacing.scale` | 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 dp | konsistent ohne Zufallswerte |
| `content.padding` | 20–24 dp | auf typischen 360–412dp-Geräten |
| `touch.minimum` | **48 × 48 dp** | Android-Mindestziel für UX-Zertifizierung |
| `motion.standard` | 160–240 ms | sanftes Screen-Feedback, nicht Pflichtanimation |
| `motion.emphasis` | 240–320 ms | selten bei wichtigen Übergängen |

Die aktuell verwendeten Farben/Classes müssen nicht blind durch diese Werte ersetzt werden. **Zuerst Token-Audit, dann Varianten-Screenshots, dann Freigabe.**

### Typografie

- Android-taugliche gut lesbare Sans; **kein unkontrollierter Schriftmix**.
- Große Tageszahl 30–36sp semibold, wenn eine echte Zahl vorliegt.
- Seitentitel 26–28sp, semibold.
- Gruppentitel 18–20sp.
- Normaltext 15–16sp; sekundärer Text idealerweise **mindestens 14sp**.
- Button 15–16sp medium/semibold, keine Vollversalien.
- Zahlen tabellarisch, damit Countdown/Minuten nicht springen.
- Zeilenhöhe 1.3–1.5; lange Texte dürfen umbrechen.
- dynamische Systemschriftgrößen respektieren; kein `text-overflow:ellipsis` an wichtigen Status- oder Aktionstexten.

### Kontrast und Zielgrößen

- WCAG AA als Mindestziel für normalen Text, kritische Information zusätzlich in **Text** (nicht nur Farbe).
- Tapflächen mindestens **48dp** je Richtung, Abstand zwischen konkurrierenden gefährlichen Aktionen.
- TalkBack: vollständige Namen, Status, Rolle, Live-Region für echte Statusänderungen; Countdown nicht sekündlich laut vorlesen.
- Reduce Motion: keine notwendigen Animationen, kein notwendiger Blink-/Haptic-Kanal.
- System-Navigation, Statusbar, Insets und Keyboard sauber einpassen; nichts hinter Gesture-Bar.

## 3. Layout-Raster und Hierarchie

**Referenzgeräte:** 360 × 800 dp, 393 × 852 dp, 412 × 915 dp sowie Landscape/Tablet-Zustände. Richtwerte nur für den Entwurf, nicht feste Gerätevorgaben.

- Maximal eine dominante Primäraktion je Screen.
- Titel und Inhalt statt verschachtelter Card-in-Card-Ketten.
- 8pt-Rhythmus mit 4pt-Ausnahmen.
- Abschnitte mit 24–32dp vertikalem Abstand klar trennen.
- Bottom-Nav drei Tabs mit Text + Icon; 48dp+ Ziel, lesbar bei großer Schrift.
- Einstellungen über sichtbares Zahnrad; keine versteckte Side-Drawer-Navigation.
- Liste statt sinnlos vieler Cards; stattdessen sparsame Container für echte semantische Gruppen.
- Charts nur, wenn sie einer konkreten Frage dienen („Wie oft habe ich neu geöffnet?“).
- Floating CTA nur, wenn sie Inhalte nicht verdeckt; sonst Standardbutton im Content.

## 4. Wie jede der drei Hauptseiten aussehen soll

### Heute – empfohlene Faltung

```
[Heute                                  Einstellungen]
 Schutz aktiv • 2 Apps                  [leiser Status]

 Fokus für heute
 [ 30 Minuten Fokus starten           → ]  < Hauptaktion
 [ Rescue                            PRO ] < sekundär

 DEIN TAG
 4 bewusste Unterbrechungen              < echte Kernzahl
 2-mal „Zurück“ gewählt                   < nur wenn gemessen

 DEIN SCHUTZ
 Instagram                Ausgewogen   ✓
 YouTube                  Sanft        ✓

 Nächster Zeitplan: 21:00–07:00
```

Kein dekorativer Ringdiagramm-Hero, der ohne Daten „82 % Fokus“ behauptet. Statusbereich darf fehlende Usage-/Overlay-Permission nicht verstecken.

### Schutz – Liste mit Schwerpunkten

```
[Schutz                                 Einstellungen]
 Geschützte Apps                        2 von 2 (Free)

 [Instagram   aktiv       Ausgewogen        >]
 [YouTube     aktiv       Sanft             >]
 [App hinzufügen                       +  ]

 Zeitpläne
 [Abends 21:00–07:00                aktiv >]

 Wie funktioniert Wiederöffnen?
 [kleine aufklappbare Erklärung]
```

**App-Detail:** App-Name → Status → vier Preset-Optionen mit zwei Free und zwei Pro (Pro transparent) → 1–2 Sätze Beispiel → erweiterte Bereiche. Nicht sofort 15 Slider präsentieren.

### Einblicke – echte Zahlen statt Dashboard-Deko

```
[Einblicke                             Einstellungen]
 [Heute]  [Woche • Pro]

  ÖFFNUNGSVERSUCHE      BEWUSST ZURÜCK
         8                     3

  Apps mit den meisten Wiederöffnungen
  Instagram        4    (nur echte Events)

  Wann greift der Schutz?
  [Zeitverlauf nur bei vorhandenen echten Daten]

  „Noch nicht genügend Daten“          < legitimer Zustand
```

Free-Metriken sollen attraktiv genug sein, dass man den Nutzen ohne Abo versteht; kein Grauschleier über allen Statistiken.

## 5. Overlay-Design, die wichtigste Markeninteraktion

Das native Kotlin-Overlay muss eigenständig gestaltet werden; nicht einfach WebCSS „ungefähr nachbauen“.

```
        [ScrollShield-Schild]
        Einen Moment.

        Instagram öffnen?

        [ 05 ] Sekunden                 < gut lesbarer Countdown
        ━━━━━━━━━░░░░░                 < echte Fortschrittsanzeige

        „Du warst gerade erst hier.“
        (nur bei echtem Reopen)

        [ Zurück                           ]
        [ Trotzdem öffnen – nach Ablauf   ]

        [ Notfallfreigabe ]             < nur falls zulässig
```

**Hierarchie und Sicherheit:** Keine echte OS-Systemdialog-Optik, keine aggressive rote Bestrafung, keine komplette Sperre ohne erlaubten Rückweg. Countdown muss real sein und beim Wechsel der Vordergrund-App korrekt verschwinden. Buttons per TalkBack erreichbar und 48dp hoch. Erhöhte Reopen-Pause zeigt einen sachlichen Grund („Du hast diese App in kurzer Zeit mehrfach geöffnet“), ohne Schuldvorwurf.

Overlay-Farbwerte identisch zum React-Tokenvertrag; CI sollte Konstanten/Style-Ressourcen oder eine überprüfte Mapping-Tabelle validieren.

## 6. Standardkomponenten (Komponenten-Contract)

| Komponente | Varianten | Pflicht |
| --- | --- | --- |
| `PrimaryButton` | ready/loading/disabled | immer eindeutige Aktion, Tapzone 48dp, Doppeltap-Schutz |
| `SecondaryButton` | normal/danger/text | Zurück/Abbrechen nicht optisch verstecken |
| `ProtectionStatus` | active/limited/off/unknown | Status mit Icon + Text + Aktion |
| `AppRow` | installed/not-installed/active/inactive/locked | Name, Preset, visuelles und A11y-Label |
| `PresetSelector` | Sanft/Ausgewogen/Stark/Eigene | kurze Wirkungszusammenfassung, Free/Pro-Markierung |
| `StatTile` | measured/derived/unavailable/empty | Quelle und Zeitraum nie implizit falsch |
| `ScheduleRow` | active/inactive/conflict | Zeitformat + Wochentags-Regel |
| `FocusTimer` | idle/running/finished/paused? | Monotonic/absolute Laufzeit korrekt, UI folgt Native-Status |
| `OfferCard` | monthly/annual/trial/unavailable | voll lokalisierte Store-Preise und Verlängerung |
| `PermissionRow` | granted/denied/unknown | echte OS-Zustandsabfrage |
| `ConfirmDialog` | destructive/strict/info | klarer Ausgang ohne irreversibles Überraschungsverhalten |

## 7. Motion, Haptik, Sounds

- Standard-Seitenwechsel: zurückhaltend, einheitlich, kein Bounce an jedem Element.
- Countdown: ruhige Änderung, kein nervöses Pulsieren/Glühen.
- Erfolg: dezente Zustandsänderung und **optionale** Haptik, kein Konfetti.
- Fehler: sichtbare Textursache + echte Retry-Aktion; keine unspezifische rote Toast-Flut.
- Hintergrund- und Akkuverbrauch der Animationen prüfen.
- Respektiert Systemvorgaben zu Bewegung und Benachrichtigungen.

## 8. Visuelle QA / Review-Protokoll

Vor Design-Freeze:

1. Screenshotvergleich auf 360dp und 412dp für Welcome, Permissions, Heute, Schutz, App-Detail, Time Schedule, Focus, Rescue, Einblicke, Settings, Paywall, Overlay.
2. **Alle** Hauptscreens in den Zuständen Empty/Active/PermissionDenied/Failure/Free/Pro.
3. Schrift auf 100 %, 150 %, 200 % (soweit Android-System erlaubt); Buttons nicht abgeschnitten.
4. Dark-Kontrast, Android-Navigation, Tastatur, Insets, TalkBack, Touchflächen.
5. Fünf echte Testpersonen ohne Erklärung: Schutz einrichten, Reopen verstehen, Fokus starten, Fehler korrigieren, Abo-Preis/Kündigung finden.
6. UI-Review vergleicht die **eigene** App mit one sec, AppBlock, Opal nur für erwartete Funktionalität und Verständlichkeit, nicht durch Kopieren fremder Marken-UI.
7. Jede Abweichung erhält eine Task-ID und einen Vorher-/Nachher-Screenshot.

**Fertig heißt:** kein Platzhalterdesign, keine zufällig gestylten Komponenten, nachvollziehbare Schutzzustände und konsistente native Intervention. Dieser Entwurf ist kein bereits bestätigtes fertiges Layout.

## 9. Mögliche Agenten-Implementierungsfolge (SS-301–310)

- SS-301: Tokens + Komponenten-Audit, Design-Varianten, Screenshots; **kein sofortiger globaler Austausch**.
- SS-303/304: Heute/Schutz klar strukturieren, funktional testen.
- SS-309: Native Overlay konsistent gestalten und UI-Grenzfälle testen.
- SS-302/305/306/307/308: weitere Hauptflows und Hilfsscreens inklusive Empty/Error States.
- SS-310: A11y/Screen-Größen/Designer-Freeze anhand tatsächlicher Aufnahmen.

**Referenz:** Android Accessibility empfiehlt mindestens 48dp Tapflächen (https://developer.android.com/guide/topics/ui/accessibility/views/apps-views).
