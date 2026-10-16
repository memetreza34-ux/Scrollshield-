import { useId, useState } from 'react';
import {
  Bell,
  Check,
  CircleHelp,
  ExternalLink,
  Info,
  Languages,
  Lock,
  MessageSquare,
  Shield,
  Smartphone,
  type LucideIcon,
} from 'lucide-react';
import { AppState, Screen } from '../types';
import {
  Header,
  List,
  OptionList,
  Page,
  PrimaryButton,
  ProBadge,
  Row,
  SecondaryButton,
  Section,
  Sheet,
  Switch,
  TextButton,
} from '../components/ui';
import { FOCUS_RING_INSET } from '../components/styles';
import { detectLanguage, LanguageSetting, MessageKey, t } from '../i18n';
import { FREE_LIMITS, hasPro, paywallFor, PRO_BENEFITS } from '../lib/entitlements';
import { formatHour } from '../lib/format';
import { SUMMARY_HOUR, usesNativeNotifications, WEEKLY_REVIEW_HOUR } from '../lib/notifications';
import { normalizePauseLine, PAUSE_LINE_MAX_LENGTH } from '../lib/state';
import { DevProSwitch } from './PaywallScreen';
import { manageSubscription, readProStatus } from '../lib/billing';

type ScreenProps = {
  state: AppState;
  updateState: (u: Partial<AppState>) => void;
  navigate: (s: Screen) => void;
};

const RowIcon = ({ icon: Icon }: { icon: LucideIcon }) => (
  <Icon size={24} strokeWidth={1.75} className="flex-shrink-0 text-ink" aria-hidden="true" />
);

/**
 * Einstellungen (docs/V1_MASTER_PLAN.md, 4.9): the Pro card on top, then three
 * groups – Schutz, Mitteilungen & Daten, Hilfe & Rechtliches. The language sits
 * on its own under the Pro card.
 */
export function SettingsScreen({ state, updateState, navigate }: ScreenProps) {
  const pro = hasPro(state);
  const [sheet, setSheet] = useState<'language' | 'pauseLine' | null>(null);
  const { notifications } = state.settings;
  // The weekly review only counts with Pro; in Free it never arrives.
  const enabledNotifications = [
    notifications.focusReminders,
    notifications.dailySummary,
    pro && notifications.weeklyReview,
  ].filter(Boolean).length;
  const permissionsText =
    state.operatingSystem === 'web'
      ? t('settings.permissionsWeb')
      : state.permissions.usageAccess && state.permissions.overlay
        ? t('settings.permissionsOk')
        : t('settings.permissionsMissing');
  const notificationsText =
    enabledNotifications === 0
      ? t('settings.notificationsOff')
      : enabledNotifications === 1 && notifications.focusReminders
        ? t('settings.notificationsFocus')
        : t('settings.notificationsCount', { count: enabledNotifications });
  const languageText = {
    system: t('language.system'),
    de: t('language.de'),
    en: t('language.en'),
  }[state.settings.language];

  return (
    <Page>
      <Header title={t('settings.title')} onBack={() => navigate('today')} />

      <Section>
        <List>
          <Row
            leading={<ProBadge />}
            label={t('pro.title')}
            description={pro ? t('settings.proActive') : t('settings.proFree')}
            strong
            onClick={() => navigate('pro_status')}
          />
        </List>
      </Section>

      <Section>
        <List>
          <Row
            leading={<RowIcon icon={Languages} />}
            label={t('language.title')}
            description={languageText}
            onClick={() => setSheet('language')}
          />
        </List>
      </Section>

      <Section title={t('settings.groupProtection')}>
        <List>
          <Row
            leading={<RowIcon icon={Smartphone} />}
            label={t('settings.permissions')}
            description={permissionsText}
            onClick={() => navigate('permissions')}
          />
          <Row
            leading={<RowIcon icon={MessageSquare} />}
            label={t('settings.pauseLine')}
            description={
              state.settings.pauseLine ? t('pauseLine.quoted', { line: state.settings.pauseLine }) : t('settings.off')
            }
            onClick={() => setSheet('pauseLine')}
          />
        </List>
      </Section>

      <Section title={t('settings.groupData')}>
        <List>
          <Row
            leading={<RowIcon icon={Bell} />}
            label={t('settings.notifications')}
            description={notificationsText}
            onClick={() => navigate('notifications')}
          />
          <Row
            leading={<RowIcon icon={Lock} />}
            label={t('settings.privacy')}
            description={t('settings.privacySub')}
            onClick={() => navigate('privacy')}
          />
        </List>
      </Section>

      <Section title={t('settings.groupHelp')}>
        <List>
          <Row
            leading={<RowIcon icon={CircleHelp} />}
            label={t('settings.help')}
            description={t('settings.helpSub')}
            onClick={() => navigate('support')}
          />
          <Row
            leading={<RowIcon icon={Info} />}
            label={t('settings.imprint')}
            description={t('settings.imprintSub')}
            onClick={() => navigate('imprint')}
          />
        </List>
      </Section>

      <p className="text-center text-caption text-muted">
        {t('settings.version', { version: __APP_VERSION__ })}
        {import.meta.env.DEV && ' · DEV'}
      </p>
      {import.meta.env.DEV && <TextButton onClick={() => navigate('debug')}>Debug</TextButton>}

      {sheet === 'language' && (
        <LanguageSheet
          value={state.settings.language}
          onChange={(language) => {
            updateState({ settings: { ...state.settings, language } });
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'pauseLine' && (
        <PauseLineSheet
          value={state.settings.pauseLine}
          onSave={(pauseLine) => {
            updateState({ settings: { ...state.settings, pauseLine } });
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      )}
    </Page>
  );
}

function LanguageSheet({
  value,
  onChange,
  onClose,
}: {
  value: LanguageSetting;
  onChange: (language: LanguageSetting) => void;
  onClose: () => void;
}) {
  return (
    <Sheet title={t('language.title')} onClose={onClose}>
      <div className="mt-4">
        <OptionList<LanguageSetting>
          label={t('language.title')}
          value={value}
          onChange={onChange}
          options={[
            {
              value: 'system',
              label: t('language.system'),
              description: detectLanguage() === 'de' ? t('language.de') : t('language.en'),
            },
            { value: 'de', label: t('language.de') },
            { value: 'en', label: t('language.en') },
          ]}
        />
      </div>
    </Sheet>
  );
}

/** One sentence of the user's own for every pause (docs/V1_MASTER_PLAN.md, 4.9). Off when empty. */
function PauseLineSheet({
  value,
  onSave,
  onClose,
}: {
  value: string;
  onSave: (line: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const inputId = useId();
  const countId = useId();

  return (
    <Sheet title={t('pauseLine.title')} onClose={onClose}>
      <p className="mt-1 text-body-s text-muted">{t('pauseLine.text')}</p>
      <label htmlFor={inputId} className="mt-5 block text-label-s text-muted">
        {t('pauseLine.label')}
      </label>
      <input
        id={inputId}
        type="text"
        value={draft}
        maxLength={PAUSE_LINE_MAX_LENGTH}
        placeholder={t('pauseLine.example')}
        aria-describedby={countId}
        onChange={(event) => setDraft(event.target.value)}
        className={`mt-2 min-h-12 w-full rounded-control border border-line bg-surface px-4 text-body text-ink placeholder:text-faint ${FOCUS_RING_INSET}`}
      />
      <p id={countId} className="mt-2 text-caption text-muted">
        {t('pauseLine.count', { count: draft.length, max: PAUSE_LINE_MAX_LENGTH })}
      </p>
      <div className="mt-5 flex flex-col gap-1">
        <PrimaryButton onClick={() => onSave(normalizePauseLine(draft))}>{t('pauseLine.save')}</PrimaryButton>
        {value && <TextButton onClick={() => onSave('')}>{t('pauseLine.remove')}</TextButton>}
      </div>
    </Sheet>
  );
}

/**
 * ScrollShield Pro in the settings: what you have, what Pro adds, and the
 * subscription in Google Play (src/lib/billing.ts).
 */
export function ProStatusScreen({ state, updateState, navigate }: ScreenProps) {
  const pro = hasPro(state);
  const [restoreMessage, setRestoreMessage] = useState<MessageKey | null>(null);

  // Restoring asks Google Play again; Pro then follows its answer.
  const restore = async () => {
    const status = await readProStatus();
    if (!status.available) {
      setRestoreMessage('pro.storeUnavailable');
      return;
    }
    updateState({ pro: { active: status.active } });
    setRestoreMessage(status.active ? 'pro.restored' : 'pro.nothingToRestore');
  };

  return (
    <Page>
      <Header title={t('pro.title')} onBack={() => navigate('settings')} />

      <div className="mb-6 flex flex-col gap-1 rounded-surface border border-line bg-surface p-4">
        <span className="text-label-s text-muted">{t('pro.yourPlan')}</span>
        <span className="flex items-center gap-2 text-title text-ink">
          {pro && <Check size={20} strokeWidth={2} aria-hidden="true" />}
          {pro ? t('pro.active') : t('pro.free')}
        </span>
        <span className="text-body-s text-muted">
          {pro
            ? t('pro.activeText')
            : t('pro.freeText', { apps: FREE_LIMITS.protectedApps, schedules: FREE_LIMITS.schedules })}
        </span>
      </div>

      {pro ? (
        <>
          <Section>
            <List>
              <Row
                label={t('pro.manage')}
                description={t('pro.manageSub')}
                trailing={
                  <ExternalLink size={20} strokeWidth={1.75} className="flex-shrink-0 text-muted" aria-hidden="true" />
                }
                onClick={() => void manageSubscription()}
              />
              <Row label={t('pro.restore')} onClick={() => void restore()} noChevron />
            </List>
          </Section>
          <div className="flex flex-col gap-3">
            <p className="flex items-start gap-3 text-body-s text-muted">
              <Info size={20} strokeWidth={1.75} className="flex-shrink-0" aria-hidden="true" />
              {t('pro.cancelNote')}
            </p>
            <p className="flex items-start gap-3 text-body-s text-muted">
              <Shield size={20} strokeWidth={1.75} className="flex-shrink-0" aria-hidden="true" />
              {t('pro.endsNote', { apps: FREE_LIMITS.protectedApps })}
            </p>
          </div>
        </>
      ) : (
        <>
          <Section title={t('pro.withPro')} kind="title">
            <ul className="flex flex-col gap-2">
              {PRO_BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3 text-body text-ink">
                  <Check size={20} strokeWidth={2} className="mt-0.5 flex-shrink-0 text-muted" aria-hidden="true" />
                  {t(benefit)}
                </li>
              ))}
            </ul>
          </Section>
          <SecondaryButton
            onClick={() => {
              updateState({ paywallReason: null });
              navigate('paywall');
            }}
          >
            {t('pro.seePrices')}
          </SecondaryButton>
          <TextButton onClick={() => void restore()}>{t('pro.restore')}</TextButton>
        </>
      )}
      {restoreMessage && (
        <p role="status" className="mt-2 px-1 text-body-s text-ink">
          {t(restoreMessage)}
        </p>
      )}
      <p className="mt-2 px-1 text-caption text-muted">{t('pro.billingNote')}</p>
      <DevProSwitch pro={pro} updateState={updateState} />
    </Page>
  );
}

/** The switch shape for a Pro row in Free: locked, the row leads to the paywall. */
const LockedSwitch = () => (
  <span
    aria-hidden="true"
    className="relative block h-8 w-[52px] flex-shrink-0 rounded-full border-2 border-faint bg-raised"
  >
    <span className="absolute left-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-line">
      <Lock size={14} strokeWidth={2} className="text-ink" />
    </span>
  </span>
);

/** Benachrichtigungen: three kinds, all quiet; nothing that only pulls back into the app. */
export function NotificationsScreen({ state, updateState, navigate }: ScreenProps) {
  const pro = hasPro(state);
  const notifications = state.settings.notifications;
  const set = (key: keyof typeof notifications, value: boolean) =>
    updateState({ settings: { ...state.settings, notifications: { ...notifications, [key]: value } } });

  const toggle = (key: keyof typeof notifications, label: string, description: string) => (
    <Row
      label={label}
      description={description}
      right={<Switch checked={notifications[key]} ariaLabel={label} onChange={(value) => set(key, value)} />}
    />
  );

  return (
    <Page>
      <Header title={t('notifications.title')} onBack={() => navigate('settings')} />

      <Section>
        <List>
          {toggle('focusReminders', t('notifications.focus'), t('notifications.focusText'))}
          {toggle(
            'dailySummary',
            t('notifications.daily'),
            t('notifications.dailyText', { time: formatHour(SUMMARY_HOUR) }),
          )}
          {pro ? (
            toggle(
              'weeklyReview',
              t('notifications.weekly'),
              t('notifications.weeklyText', { time: formatHour(WEEKLY_REVIEW_HOUR) }),
            )
          ) : (
            <Row
              label={t('notifications.weekly')}
              description={t('notifications.weeklyText', { time: formatHour(WEEKLY_REVIEW_HOUR) })}
              pro
              trailing={<LockedSwitch />}
              onClick={() => {
                updateState(paywallFor('insights_week'));
                navigate('paywall');
              }}
            />
          )}
        </List>
        <p className="mt-2 px-1 text-caption text-muted">
          {usesNativeNotifications() ? t('notifications.nativeNote') : t('notifications.webNote')}
        </p>
      </Section>

      <Section title={t('notifications.always')} kind="title">
        <div className="rounded-surface border border-line bg-surface p-4">
          <p className="text-body text-ink">{t('notifications.ongoing')}</p>
          <p className="mt-0.5 text-body-s text-muted">{t('notifications.ongoingText')}</p>
        </div>
      </Section>

      <p className="flex items-start gap-3 text-body-s text-muted">
        <Info size={20} strokeWidth={1.75} className="flex-shrink-0" aria-hidden="true" />
        {t('notifications.never')}
      </p>
    </Page>
  );
}
