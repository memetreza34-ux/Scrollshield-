import type { Messages } from './index';

/** English texts, same keys as de.ts. */
export const en: Messages = {
  // Shared building blocks
  'common.back': 'Back',
  'common.continue': 'Continue',
  'common.settings': 'Settings',
  'common.loading': 'Loading …',
  'common.turnOn': 'Turn on',
  'common.turnOff': 'Turn off',
  'common.minutesUnit': 'min',
  'common.custom': 'Custom',
  'common.off': 'Off',
  'common.chooseTime': 'Choose a time',
  'common.customValue': '{label}: custom value',
  'nav.main': 'Main navigation',
  'nav.today': 'Today',
  'nav.protect': 'Protection',
  'nav.focus': 'Focus',
  'nav.insights': 'Insights',

  // Language
  'language.title': 'Language',
  'language.system': 'Phone language',
  'language.de': 'Deutsch',
  'language.en': 'English',

  // Presets
  'preset.sanft.label': 'Gentle',
  'preset.sanft.summary': 'A short pause when opening. No extra resistance when you reopen.',
  'preset.ausgewogen.label': 'Balanced',
  'preset.ausgewogen.summary':
    '5 second pause. Open it again within 10 minutes and you wait 10 seconds longer each time.',
  'preset.stark.label': 'Strong',
  'preset.stark.summary':
    '10 second pause, 20 seconds more on every reopen. On the third open within 30 minutes a cooldown follows. After 10 minutes in a row, ScrollShield checks in.',
  'preset.eigene.label': 'Custom rules',
  'preset.eigene.summary': 'Set the pause, reopening, session and daily budget yourself.',

  // Pause screen (also its preview on the welcome screen)
  'pause.title': 'A short pause before {app}.',
  'pause.seconds': 'seconds',
  'pause.back': 'Back',
  'pause.continue': 'Continue',

  // Welcome
  'welcome.appName': 'ScrollShield',
  'welcome.title': 'Instagram yes, Reels no.',
  'welcome.shortVideo.title': 'Slow down short videos',
  'welcome.shortVideo.text': 'Block or limit Reels and Shorts. The rest of the app stays open.',
  'welcome.reflex.title': 'Slow down reflex opening',
  'welcome.reflex.text': 'A short pause before the app. Open it again right away and the pause gets longer.',
  'welcome.noAccount.title': 'No account',
  'welcome.noAccount.text': 'Everything stays on your phone. No ads.',
  'welcome.preview': 'Preview of the pause: a 5 second countdown, then “Continue” becomes available.',
  'welcome.start': 'Get started',
  'welcome.learnMore': 'Learn more',
  'welcome.age': 'For users aged 16 and over.',

  // Onboarding
  'onboarding.step': 'Step {step} of 3',
  'onboarding.apps.title': 'Which apps pull you in?',
  'onboarding.apps.subtitle': 'Choose up to {limit} apps. You can change this any time in the Protection tab.',
  'onboarding.apps.legend': 'Apps to protect',
  'onboarding.apps.hint.instagram': 'Block or limit Reels',
  'onboarding.apps.hint.youtube': 'Block or limit Shorts',
  'onboarding.apps.hint.tiktok': 'Block or limit the feed',
  'onboarding.apps.hint.other': 'Pause when opening',
  'onboarding.apps.limit': 'The free version protects {limit} apps. More with Pro – later in Settings.',
  'onboarding.apps.count': '{count} of {limit} selected',
  'onboarding.how.title': 'How it works',
  'onboarding.how.open.title': 'You open a protected app.',
  'onboarding.how.open.text': 'A short pause with a countdown comes first.',
  'onboarding.how.decide.title': 'You decide.',
  'onboarding.how.decide.text': '“Back” always works. “Continue” only once the pause is over.',
  'onboarding.how.reopen.title': 'You open it again right away.',
  'onboarding.how.reopen.text': 'Then the pause gets longer. With “Strong”, a cooldown follows.',
  'onboarding.how.shortVideo.title': 'Short videos get their own rules.',
  'onboarding.how.shortVideo.text':
    'You block or limit Reels, Shorts and the TikTok feed per app. Messages and profiles stay open.',
  'onboarding.how.start.title': 'You start with “Balanced”',
  'onboarding.how.start.change': 'Change it per app in the Protection tab.',
  'onboarding.permissions.title': 'Permissions',
  'onboarding.permissions.subtitle': 'Only what is needed, each with one sentence on why.',
  'onboarding.permissions.preview': 'Browser preview. Real blocking only works in the Android app.',
  'onboarding.permissions.required': 'Needed for protection',
  'onboarding.permissions.recommended': 'Recommended',
  'onboarding.permissions.optional': 'Optional',
  'onboarding.permissions.accessibilityNote':
    'You only need the accessibility service for short-video protection, so we don’t ask for it here.',
  'onboarding.permissions.oneProtected': '{name} will then be protected.',
  'onboarding.permissions.manyProtected': '{names} and {last} will then be protected.',
  'onboarding.permissions.start': 'Start protection',
  'onboarding.permissions.done': 'Done',
  'onboarding.permissions.withoutProtection': 'Continue without protection',
  'onboarding.permissions.withoutPermissions': 'Continue without permissions',
  'onboarding.permissions.later': '“Today” will then show what’s still missing.',

  // Permissions
  'permission.usageAccess.title': 'Usage access',
  'permission.usageAccess.why': 'Notices when you open a protected app.',
  'permission.usageAccess.missing': 'Without it, ScrollShield can’t see when you open an app.',
  'permission.overlay.title': 'Display over other apps',
  'permission.overlay.why': 'So the pause can appear on top of the app.',
  'permission.overlay.missing': 'Without it, no pause appears.',
  'permission.battery.title': 'Battery exception',
  'permission.battery.why': 'So Android doesn’t stop protection in the background.',
  'permission.notifications.title': 'Notifications',
  'permission.notifications.why': 'Optional. By default only for when a focus ends.',
  'permission.granted': 'Granted',
  'permission.notGranted': 'Not granted',
  'permission.allow': 'Allow',
  'permission.openAgain': 'Open again',
  'permission.notRecognised': 'Already allowed but not recognised?',
  'permission.notRecognisedHelp':
    'ScrollShield checks again every time you come back to the app. Some makers, such as Xiaomi, have a second permission like “Display pop-up windows while running in the background”. You’ll find it in ScrollShield’s app info.',
};
