import { AppState, Screen } from '../types';
import { Choice, Header, List, Page, Row, Section, Switch } from '../components/ui';
import { LanguageSetting, t } from '../i18n';
import { hasPro } from '../lib/entitlements';
import {
  EVENING_REMINDER_HOUR,
  RELAPSE_BLOCK_THRESHOLD,
  RELAPSE_WINDOW_MINUTES,
  SUMMARY_HOUR,
  usesNativeNotifications,
} from '../lib/notifications';

type ScreenProps = {
  state: AppState;
  updateState: (u: Partial<AppState>) => void;
  navigate: (s: Screen) => void;
};

/** Einstellungen (docs/V1_MASTER_PLAN.md, 4.9), reached through the gear on every tab. */
export function SettingsScreen({ state, updateState, navigate }: ScreenProps) {
  const pro = hasPro(state);
  const permissionsOk = state.permissions.usageAccess && state.permissions.overlay;

  return (
    <Page>
      <Header title="Einstellungen" onBack={() => navigate('today')} />

      <Section>
        <List>
          <Row label="ScrollShield Pro" value={pro ? 'Aktiv' : 'Kostenlos'} onClick={() => navigate('paywall')} />
        </List>
      </Section>

      <Section title={t('language.title')}>
        <Choice<LanguageSetting>
          label={t('language.title')}
          value={state.settings.language}
          onChange={(language) => updateState({ settings: { ...state.settings, language } })}
          options={[
            { value: 'system', label: t('language.system') },
            { value: 'de', label: t('language.de') },
            { value: 'en', label: t('language.en') },
          ]}
        />
      </Section>

      <Section title="Schutz">
        <List>
          <Row
            label="Berechtigungen & Zustand"
            value={state.operatingSystem === 'web' ? 'Browser' : permissionsOk ? 'Alles da' : 'Fehlt etwas'}
            onClick={() => navigate('permissions')}
          />
          <Row
            label="Kurzvideo-Erkennung prüfen"
            description="Zeigt, ob Reels und Shorts erkannt werden"
            onClick={() => navigate('diagnostics')}
          />
          <Row label="Benachrichtigungen" onClick={() => navigate('notifications')} />
        </List>
      </Section>

      <Section title="Daten">
        <List>
          <Row
            label="Datenschutz & Daten"
            description="Alles bleibt auf dem Gerät. Exportieren oder löschen."
            onClick={() => navigate('privacy')}
          />
        </List>
      </Section>

      <Section title="Hilfe">
        <List>
          <Row label="Hilfe & Support" onClick={() => navigate('support')} />
          <Row label="Impressum & Lizenzen" onClick={() => navigate('imprint')} />
          <Row
            label="Version"
            value={`${__APP_VERSION__}${import.meta.env.DEV ? ' (Entwicklung)' : ''}`}
            onClick={import.meta.env.DEV ? () => navigate('debug') : undefined}
          />
        </List>
      </Section>
    </Page>
  );
}

export function NotificationsScreen({ state, updateState, navigate }: ScreenProps) {
  const notifications = state.settings.notifications;
  const set = (key: keyof typeof notifications, value: boolean) =>
    updateState({ settings: { ...state.settings, notifications: { ...notifications, [key]: value } } });

  const toggle = (key: keyof typeof notifications, label: string, description: string, pro = false) => (
    <Row
      label={label}
      description={description}
      pro={pro && !hasPro(state)}
      right={<Switch checked={notifications[key]} ariaLabel={label} onChange={(value) => set(key, value)} />}
    />
  );

  return (
    <Page>
      <Header title="Benachrichtigungen" onBack={() => navigate('settings')} />
      <p className="mb-6 text-sm leading-relaxed text-zinc-400">
        {usesNativeNotifications()
          ? 'Fokus- und Abend-Erinnerung kommen auch, wenn ScrollShield geschlossen ist. Zusammenfassungen und Warnungen brauchen die laufende App.'
          : 'Im Browser kommen Erinnerungen nur, solange ScrollShield geöffnet ist.'}
      </p>
      <List>
        {toggle('focusReminders', 'Fokus-Ende', 'Wenn ein Fokus vorbei ist')}
        {toggle('eveningReminder', 'Abend-Erinnerung', `Um ${EVENING_REMINDER_HOUR} Uhr`)}
        {toggle('dailySummary', 'Tageszusammenfassung', `Ab ${SUMMARY_HOUR} Uhr, dein Tag in Zahlen`)}
        {toggle('weeklyReview', 'Wochenrückblick', `Sonntags ab ${SUMMARY_HOUR} Uhr`, true)}
        {toggle(
          'relapseWarning',
          'Häufige Sperren',
          `Bei ${RELAPSE_BLOCK_THRESHOLD} Sperren in ${RELAPSE_WINDOW_MINUTES} Minuten`,
        )}
      </List>
    </Page>
  );
}

/**
 * The paywall (docs/V1_MASTER_PLAN.md, 4.10 and 10). Billing comes in roadmap
 * phase 4; until then the development build can switch Pro on as a preview so
 * every screen can be seen.
 */
