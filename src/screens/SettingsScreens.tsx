import { Check } from 'lucide-react';
import { AppState, Screen } from '../types';
import { Header, List, Page, PrimaryButton, Row, SecondaryButton, Section, Switch } from '../components/ui';
import { hasPro, PRO_BENEFITS } from '../lib/entitlements';
import { FEATURE_FLAGS } from '../config/featureFlags';
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
export function SettingsScreen({ state, navigate }: ScreenProps) {
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

      <Section title="Schutz">
        <List>
          <Row
            label="Berechtigungen & Zustand"
            value={state.operatingSystem === 'web' ? 'Browser' : permissionsOk ? 'Alles da' : 'Fehlt etwas'}
            onClick={() => navigate('permissions')}
          />
          {FEATURE_FLAGS.enableShortVideoResearch && (
            <Row
              label="Kurzvideo-Erkennung prüfen"
              description="Post-V1 Forschung"
              onClick={() => navigate('diagnostics')}
            />
          )}
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
export function PaywallScreen({ state, updateState, navigate }: ScreenProps) {
  const pro = hasPro(state);
  const close = () => {
    updateState({ paywallReason: null });
    navigate('today');
  };

  return (
    <Page>
      <Header title="ScrollShield Pro" onBack={close} />

      {state.paywallReason && <p className="mb-6 text-lg leading-snug text-zinc-100">{state.paywallReason}</p>}

      <Section title={pro ? 'Pro ist aktiv' : 'Mit Pro bekommst du'}>
        <ul className="space-y-3 rounded-2xl bg-zinc-900 p-5">
          {PRO_BENEFITS.map((benefit) => (
            <li key={benefit} className="flex items-start gap-3 text-zinc-200">
              <Check size={18} className="mt-0.5 flex-shrink-0 text-emerald-400" aria-hidden="true" />
              {benefit}
            </li>
          ))}
        </ul>
        <p className="mt-3 px-1 text-sm text-zinc-500">
          Kostenlos bleiben: 2 Apps, Pause und Wiederöffnungs-Schutz, 1 Zeitplan, Fokus, Notfallfreigabe und die
          Zahlen von heute. Keine Werbung.
        </p>
      </Section>

      {!pro && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-emerald-500 p-4">
              <p className="text-sm text-zinc-400">Jährlich</p>
              <p className="mt-1 text-xl font-semibold text-zinc-50">24,99 €</p>
              <p className="mt-1 text-xs text-zinc-500">7 Tage gratis testen</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 p-4">
              <p className="text-sm text-zinc-400">Monatlich</p>
              <p className="mt-1 text-xl font-semibold text-zinc-50">3,99 €</p>
            </div>
          </div>
          <p className="px-1 text-xs text-zinc-500">
            Preise als Vorschau. Kaufen über Google Play kommt mit der Abrechnung (Roadmap Phase 4).
          </p>
          <PrimaryButton onClick={() => undefined} disabled>
            7 Tage gratis testen
          </PrimaryButton>
          <SecondaryButton onClick={close}>Später</SecondaryButton>
        </div>
      )}

      {import.meta.env.DEV && (
        <div className="mt-10">
          <Section title="Nur in der Entwicklung">
            <List>
              <Row
                label="Pro-Vorschau"
                description="Schaltet Pro ohne Kauf frei, damit du alle Seiten sehen kannst."
                right={
                  <Switch
                    checked={pro}
                    ariaLabel="Pro-Vorschau"
                    onChange={(active) => updateState({ pro: { active } })}
                  />
                }
              />
            </List>
          </Section>
        </div>
      )}
    </Page>
  );
}
