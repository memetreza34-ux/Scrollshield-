/**
 * German texts. The keys are the contract: en.ts has exactly the same ones,
 * the type checker makes sure of it. {name} marks a value filled in by t().
 */
export const de = {
  // Shared building blocks
  'common.back': 'Zurück',
  'common.continue': 'Weiter',
  'common.settings': 'Einstellungen',
  'common.loading': 'Laden …',
  'common.turnOn': 'Aktivieren',
  'common.turnOff': 'Deaktivieren',
  'common.minutesUnit': 'Min.',
  'common.custom': 'Eigene',
  'common.off': 'Aus',
  'common.chooseTime': 'Zeitwert auswählen',
  'common.customValue': '{label}: eigener Wert',
  'nav.main': 'Hauptnavigation',
  'nav.today': 'Heute',
  'nav.protect': 'Schutz',
  'nav.focus': 'Fokus',
  'nav.insights': 'Einblicke',

  // Language
  'language.title': 'Sprache',
  'language.system': 'Handysprache',
  'language.de': 'Deutsch',
  'language.en': 'English',

  // Presets
  'preset.sanft.label': 'Sanft',
  'preset.sanft.summary': 'Kurze Pause beim Öffnen. Kein zusätzlicher Widerstand beim Wiederöffnen.',
  'preset.ausgewogen.label': 'Ausgewogen',
  'preset.ausgewogen.summary':
    '5 Sekunden Pause. Wer innerhalb von 10 Minuten wieder öffnet, wartet jedes Mal 10 Sekunden länger.',
  'preset.stark.label': 'Stark',
  'preset.stark.summary':
    '10 Sekunden Pause, bei jedem Wiederöffnen 20 Sekunden mehr. Beim dritten Öffnen in 30 Minuten folgt eine Abkühlzeit. Nach 10 Minuten am Stück fragt ScrollShield nach.',
  'preset.eigene.label': 'Eigene Regeln',
  'preset.eigene.summary': 'Pause, Wiederöffnen, Sitzung und Tagesbudget frei einstellen.',

  // Pause screen (also its preview on the welcome screen)
  'pause.title': 'Kurze Pause vor {app}.',
  'pause.seconds': 'Sekunden',
  'pause.back': 'Zurück',
  'pause.continue': 'Weiter',

  // Welcome
  'welcome.appName': 'ScrollShield',
  'welcome.title': 'Instagram ja, Reels nein.',
  'welcome.shortVideo.title': 'Kurzvideos bremsen',
  'welcome.shortVideo.text': 'Reels und Shorts sperren oder begrenzen. Der Rest der App bleibt frei.',
  'welcome.reflex.title': 'Reflexhaftes Öffnen bremsen',
  'welcome.reflex.text': 'Eine kurze Pause vor der App. Wer gleich wieder öffnet, wartet länger.',
  'welcome.noAccount.title': 'Kein Konto',
  'welcome.noAccount.text': 'Alles bleibt auf deinem Handy. Keine Werbung.',
  'welcome.preview': 'Vorschau der Pause: Countdown von 5 Sekunden, danach wird „Weiter“ aktiv.',
  'welcome.start': 'Loslegen',
  'welcome.learnMore': 'Mehr erfahren',
  'welcome.age': 'Für Nutzer ab 16 Jahren.',

  // Onboarding
  'onboarding.step': 'Schritt {step} von 3',
  'onboarding.apps.title': 'Welche Apps ziehen dich rein?',
  'onboarding.apps.subtitle': 'Wähle bis zu {limit} Apps. Ändern geht jederzeit im Tab „Schutz“.',
  'onboarding.apps.legend': 'Apps zum Schützen',
  'onboarding.apps.hint.instagram': 'Reels sperren oder begrenzen',
  'onboarding.apps.hint.youtube': 'Shorts sperren oder begrenzen',
  'onboarding.apps.hint.tiktok': 'Feed sperren oder begrenzen',
  'onboarding.apps.hint.other': 'Pause beim Öffnen',
  'onboarding.apps.limit': 'In der kostenlosen Version {limit} Apps. Mehr mit Pro – später in den Einstellungen.',
  'onboarding.apps.count': '{count} von {limit} gewählt',
  'onboarding.how.title': "So funktioniert's",
  'onboarding.how.open.title': 'Du öffnest eine geschützte App.',
  'onboarding.how.open.text': 'Vorher erscheint eine kurze Pause mit Countdown.',
  'onboarding.how.decide.title': 'Du entscheidest.',
  'onboarding.how.decide.text': '„Zurück“ geht immer. „Weiter“ erst, wenn die Pause vorbei ist.',
  'onboarding.how.reopen.title': 'Du öffnest sie gleich wieder.',
  'onboarding.how.reopen.text': 'Dann wird die Pause länger. Bei „Stark“ folgt danach eine Abkühlzeit.',
  'onboarding.how.shortVideo.title': 'Kurzvideos bekommen eigene Regeln.',
  'onboarding.how.shortVideo.text':
    'Reels, Shorts und den TikTok-Feed sperrst oder begrenzt du pro App. Nachrichten und Profile bleiben frei.',
  'onboarding.how.start.title': 'Gestartet wird mit „Ausgewogen“',
  'onboarding.how.start.change': 'Pro App änderbar im Tab „Schutz“.',
  'onboarding.permissions.title': 'Berechtigungen',
  'onboarding.permissions.subtitle': 'Nur was nötig ist. Jede mit einem Satz, wofür.',
  'onboarding.permissions.preview': 'Vorschau im Browser. Echte Sperren gibt es nur in der Android-App.',
  'onboarding.permissions.required': 'Nötig für den Schutz',
  'onboarding.permissions.recommended': 'Empfohlen',
  'onboarding.permissions.optional': 'Optional',
  'onboarding.permissions.accessibilityNote':
    'Die Bedienungshilfe brauchst du nur für den Kurzvideo-Schutz. Darum fragen wir sie hier nicht ab.',
  'onboarding.permissions.oneProtected': '{name} ist dann geschützt.',
  'onboarding.permissions.manyProtected': '{names} und {last} sind dann geschützt.',
  'onboarding.permissions.start': 'Schutz starten',
  'onboarding.permissions.done': 'Fertig',
  'onboarding.permissions.withoutProtection': 'Ohne Schutz weiter',
  'onboarding.permissions.withoutPermissions': 'Ohne Berechtigungen weiter',
  'onboarding.permissions.later': '„Heute“ zeigt dann, was noch fehlt.',

  // Permissions
  'permission.usageAccess.title': 'App-Nutzungszugriff',
  'permission.usageAccess.why': 'Merkt, wann du eine geschützte App öffnest.',
  'permission.usageAccess.missing': 'Ohne ihn sieht ScrollShield nicht, wann du eine App öffnest.',
  'permission.overlay.title': 'Über anderen Apps einblenden',
  'permission.overlay.why': 'Damit die Pause über der App erscheint.',
  'permission.overlay.missing': 'Ohne sie erscheint keine Pause.',
  'permission.battery.title': 'Akku-Ausnahme',
  'permission.battery.why': 'Damit Android den Schutz nicht im Hintergrund beendet.',
  'permission.notifications.title': 'Benachrichtigungen',
  'permission.notifications.why': 'Optional. Standardmäßig nur für das Ende eines Fokus.',
  'permission.granted': 'Erteilt',
  'permission.notGranted': 'Nicht erteilt',
  'permission.allow': 'Erlauben',
  'permission.openAgain': 'Erneut öffnen',
  'permission.notRecognised': 'Schon erlaubt, aber nicht erkannt?',
  'permission.notRecognisedHelp':
    'ScrollShield prüft das jedes Mal neu, wenn du in die App zurückkommst. Bei manchen Herstellern, etwa Xiaomi, gibt es eine zweite Erlaubnis wie „Pop-up-Fenster im Hintergrund anzeigen“. Du findest sie in den App-Infos von ScrollShield.',
} as const;
