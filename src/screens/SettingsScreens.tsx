import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { AppState, Screen } from '../types';
import { Header, List, Page, PrimaryButton, Row, SecondaryButton, Section, Switch } from '../components/ui';
import { hasPro, PRO_BENEFITS } from '../lib/entitlements';
import {
  describeOffer,
  describePurchaseOverview,
  getPlayCatalog,
  getPlayPurchaseOverview,
  isNativePlayBilling,
} from '../lib/billing';
import type { PlayCatalog } from '../lib/billing';
import {
  createBillingAccount,
  getBillingAccountStatus,
  refreshBillingAccountStatus,
  requestBillingPasswordReset,
  sendBillingVerificationEmail,
  signInBillingAccount,
  signOutBillingAccount,
} from '../lib/billingIdentity';
import type { BillingAccountStatus } from '../lib/billingIdentity';
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
  settingsReturnScreen?: Screen;
  paywallReturnScreen?: Screen;
  onBillingIdentityChange?: () => void;
};

/** Einstellungen (docs/V1_MASTER_PLAN.md, 4.9), reached through the gear on every tab. */
export function SettingsScreen({ state, navigate, settingsReturnScreen = 'today' }: ScreenProps) {
  const pro = hasPro(state);
  const permissionsOk = state.permissions.usageAccess && state.permissions.overlay;

  return (
    <Page>
      <Header title="Einstellungen" onBack={() => navigate(settingsReturnScreen)} />

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
              description="Experimenteller Forschungsmodus"
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
export function PaywallScreen({
  state,
  updateState,
  navigate,
  paywallReturnScreen = 'today',
  onBillingIdentityChange,
}: ScreenProps) {
  const pro = hasPro(state);
  const onAndroid = isNativePlayBilling();
  const [catalog, setCatalog] = useState<PlayCatalog | null>(null);
  const [catalogError, setCatalogError] = useState(false);
  const [checking, setChecking] = useState(false);
  const [restoreNote, setRestoreNote] = useState<string | null>(null);
  const [account, setAccount] = useState<BillingAccountStatus | null>(null);
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountMessage, setAccountMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!onAndroid || pro) return;
    let mounted = true;
    void getPlayCatalog()
      .then((response) => {
        if (mounted) setCatalog(response);
      })
      .catch(() => {
        if (mounted) setCatalogError(true);
      });
    return () => {
      mounted = false;
    };
  }, [onAndroid, pro]);

  useEffect(() => {
    if (!onAndroid) return;
    let active = true;
    void getBillingAccountStatus()
      .then((status) => {
        if (active) setAccount(status);
      })
      .catch(() => {
        if (active) setAccount(null);
      });
    return () => {
      active = false;
    };
  }, [onAndroid]);

  const runAccountAction = async (action: 'signIn' | 'create' | 'reset' | 'refresh' | 'resend' | 'signOut') => {
    if (accountBusy) return;
    setAccountBusy(true);
    setAccountMessage(null);
    try {
      if (action === 'reset') {
        await requestBillingPasswordReset(accountEmail.trim());
        setAccountMessage('Falls ein Konto zu dieser Adresse besteht, erhältst du eine E-Mail zum Zurücksetzen.');
      } else if (action === 'resend') {
        await sendBillingVerificationEmail();
        setAccountMessage('Die Bestätigungs-E-Mail wurde angefordert.');
      } else {
        const next = action === 'signIn'
          ? await signInBillingAccount(accountEmail.trim(), accountPassword)
          : action === 'create'
            ? await createBillingAccount(accountEmail.trim(), accountPassword)
            : action === 'signOut'
              ? await signOutBillingAccount()
              : await refreshBillingAccountStatus();
        setAccount(next);
        setAccountPassword('');
        onBillingIdentityChange?.();
        if (action === 'signOut') setAccountMessage('Du bist abgemeldet. Die lokale Pro-Berechtigung wurde entfernt.');
        else if (next.signedIn && !next.verified) {
          setAccountMessage('Bitte bestätige deine E-Mail-Adresse, bevor du Pro nutzen kannst.');
        } else if (next.verified) {
          setAccountMessage('Deine E-Mail-Adresse ist bestätigt. Vorhandene Play-Käufe können jetzt sicher geprüft werden.');
        }
      }
    } catch {
      setAccountMessage('Die Kontoaktion ist fehlgeschlagen. Bitte prüfe deine Angaben oder versuche es später.');
    } finally {
      setAccountPassword('');
      setAccountBusy(false);
    }
  };

  const checkPlaySubscriptions = async () => {
    setChecking(true);
    try {
      const overview = await getPlayPurchaseOverview();
      setRestoreNote(describePurchaseOverview(overview));
    } catch {
      setRestoreNote('Google Play konnte den Abo-Status gerade nicht abrufen. Bitte versuche es später erneut.');
    } finally {
      setChecking(false);
    }
  };

  const close = () => {
    updateState({ paywallReason: null });
    navigate(paywallReturnScreen);
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
          Kostenlos bleiben: 2 Apps, Pause und Basis-Wiederöffnungs-Schutz, 1 Zeitplan, Fokus, Notfallfreigabe und die
          Zahlen von heute. Keine Werbung.
        </p>
      </Section>

      {onAndroid && (
        <Section title="Google-Play-Konto">
          {!account ? (
            <p className="text-sm text-zinc-400">Kontostatus wird geladen …</p>
          ) : !account.configured ? (
            <p className="text-sm text-zinc-400">
              Die Kontoverbindung ist in dieser App-Version noch nicht eingerichtet.
              Ohne Firebase-Konfiguration bleiben Käufe deaktiviert.
            </p>
          ) : account.signedIn ? (
            <div className="space-y-3">
              <p className="text-sm text-zinc-200">
                Angemeldet: {account.email}
              </p>
              <p className="text-sm text-zinc-400">
                {account.verified
                  ? 'E-Mail bestätigt. Pro benötigt zusätzlich einen verifizierten Google-Play-Kauf.'
                  : 'E-Mail noch nicht bestätigt. Prüfe deinen Posteingang.'}
              </p>
              {!account.verified && (
                <SecondaryButton onClick={() => void runAccountAction('resend')} disabled={accountBusy}>
                  Bestätigungs-E-Mail erneut senden
                </SecondaryButton>
              )}
              <SecondaryButton onClick={() => void runAccountAction('refresh')} disabled={accountBusy}>
                Kontostatus aktualisieren
              </SecondaryButton>
              <SecondaryButton onClick={() => void runAccountAction('signOut')} disabled={accountBusy}>
                Abmelden
              </SecondaryButton>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-sm text-zinc-300">
                E-Mail-Adresse
                <input
                  className="mt-1 w-full rounded-xl bg-zinc-900 p-3 text-zinc-100"
                  autoComplete="email"
                  type="email"
                  value={accountEmail}
                  onChange={(event) => setAccountEmail(event.target.value)}
                />
              </label>
              <label className="block text-sm text-zinc-300">
                Passwort
                <input
                  className="mt-1 w-full rounded-xl bg-zinc-900 p-3 text-zinc-100"
                  autoComplete="current-password"
                  type="password"
                  value={accountPassword}
                  onChange={(event) => setAccountPassword(event.target.value)}
                />
              </label>
              <PrimaryButton onClick={() => void runAccountAction('signIn')} disabled={accountBusy}>
                Anmelden
              </PrimaryButton>
              <SecondaryButton onClick={() => void runAccountAction('create')} disabled={accountBusy}>
                Konto erstellen
              </SecondaryButton>
              <SecondaryButton onClick={() => void runAccountAction('reset')} disabled={accountBusy}>
                Passwort vergessen?
              </SecondaryButton>
            </div>
          )}
          {accountMessage && <p role="status" className="mt-3 text-sm text-zinc-300">{accountMessage}</p>}
        </Section>
      )}

      {!pro && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-zinc-800 p-4">
            <p className="text-sm font-medium text-zinc-200">Google Play-Abonnements</p>
            {catalog?.plans.length ? (
              <ul className="mt-3 space-y-3">
                {catalog.plans.map((offer, index) => (
                  <li key={`${offer.productId}-${offer.basePlanId}-${offer.offerId ?? 'base'}-${index}`}>
                    <p className="font-medium text-zinc-100">
                      {offer.basePlanId === 'monthly' ? 'Monatlich' : 'Jährlich'}
                      {offer.offerId ? ' · Angebot' : ''}
                    </p>
                    <p className="mt-1 text-sm text-zinc-400">{describeOffer(offer)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                {!onAndroid
                  ? 'Abonnements sind ausschließlich in der Android-App über Google Play verfügbar.'
                  : catalogError
                    ? 'Preise konnten gerade nicht geladen werden. Prüfe die Play-Store-Verbindung.'
                    : catalog
                      ? 'In Google Play sind derzeit keine kaufbaren ScrollShield-Angebote hinterlegt.'
                      : 'Preise werden direkt bei Google Play abgefragt …'}
              </p>
            )}
            <p className="mt-3 text-sm leading-relaxed text-zinc-500">
              Käufe sind bis zur sicheren serverseitigen Verifikation deaktiviert. Es wird keine Zahlung ausgelöst.
            </p>
          </div>
          <PrimaryButton onClick={() => undefined} disabled>
            Kaufen noch nicht verfügbar
          </PrimaryButton>
          {onAndroid && (
            <SecondaryButton onClick={() => void checkPlaySubscriptions()} disabled={checking}>
              {checking ? 'Prüfe Google Play …' : 'Bestehende Play-Abos prüfen'}
            </SecondaryButton>
          )}
          {restoreNote && (
            <p role="status" className="rounded-xl border border-zinc-800 p-3 text-sm text-zinc-300">
              {restoreNote}
            </p>
          )}
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
