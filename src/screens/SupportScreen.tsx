import { useId, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { Screen } from '../types';
import { Header, List, Page, Row, Section, Sheet } from '../components/ui';
import { FOCUS_RING_INSET, PRESSED } from '../components/styles';
import { MessageKey, t } from '../i18n';
import { FREE_LIMITS } from '../lib/entitlements';
import { createSupportMailto } from '../lib/contact';

const GUIDES: { title: MessageKey; text: MessageKey }[] = [
  { title: 'help.guide.pause', text: 'help.guide.pauseText' },
  { title: 'help.guide.reopen', text: 'help.guide.reopenText' },
  { title: 'help.guide.shortVideo', text: 'help.guide.shortVideoText' },
  { title: 'help.guide.plans', text: 'help.guide.plansText' },
];

/** Phone makers that stop apps in the background, each with its own section. Brand names stay as they are. */
const MAKERS: { id: string; name: string | MessageKey; text: MessageKey }[] = [
  { id: 'samsung', name: 'Samsung', text: 'help.maker.samsung' },
  { id: 'xiaomi', name: 'Xiaomi, Redmi, POCO', text: 'help.maker.xiaomi' },
  { id: 'huawei', name: 'Huawei, Honor', text: 'help.maker.huawei' },
  { id: 'oneplus', name: 'OnePlus, OPPO, realme', text: 'help.maker.oneplus' },
  { id: 'pixel', name: 'Google Pixel', text: 'help.maker.pixel' },
  { id: 'other', name: 'help.maker.other', text: 'help.maker.otherText' },
];

const makerName = (name: string) => (name === 'help.maker.other' ? t('help.maker.other') : name);

/** What the problem mail carries, visible in the mail app before anything is sent. */
const deviceDetails = () =>
  [
    '',
    '',
    '---',
    t('help.deviceData'),
    `ScrollShield ${__APP_VERSION__}`,
    Capacitor.getPlatform(),
    typeof navigator === 'undefined' ? '' : navigator.userAgent,
  ].join('\n');

/**
 * Hilfe & Support (docs/V1_MASTER_PLAN.md, 4.9): a short guide, what to do
 * when a phone maker stops the protection, and contact. Readable before the
 * onboarding, so `backTo` is the welcome screen there.
 */
export function SupportScreen({ navigate, backTo = 'settings' }: { navigate: (s: Screen) => void; backTo?: Screen }) {
  const [guide, setGuide] = useState<(typeof GUIDES)[number] | null>(null);
  const [openMaker, setOpenMaker] = useState<string | null>(null);
  const baseId = useId();

  return (
    <Page>
      <Header title={t('help.title')} onBack={() => navigate(backTo)} />

      <Section title={t('help.guides')} kind="title">
        <List>
          {GUIDES.map((item) => (
            <Row key={item.title} label={t(item.title)} onClick={() => setGuide(item)} />
          ))}
        </List>
      </Section>

      <Section title={t('help.makers')} kind="title">
        <p className="-mt-1 mb-3 text-body-s text-muted">{t('help.makersText')}</p>
        <List>
          {MAKERS.map((maker) => {
            const open = openMaker === maker.id;
            const panelId = `${baseId}-${maker.id}`;
            return (
              <div key={maker.id}>
                <button
                  onClick={() => setOpenMaker(open ? null : maker.id)}
                  aria-expanded={open}
                  aria-controls={panelId}
                  className={`flex min-h-14 w-full items-center gap-4 px-4 py-3 text-left ${PRESSED} ${FOCUS_RING_INSET}`}
                >
                  <span className="flex-1 text-body text-ink">{makerName(maker.name)}</span>
                  <ChevronDown
                    size={20}
                    strokeWidth={1.75}
                    className={`flex-shrink-0 text-muted transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                </button>
                {open && (
                  <div id={panelId} className="px-4 pb-4">
                    <p className="whitespace-pre-line text-body-s text-ink">{t(maker.text)}</p>
                  </div>
                )}
              </div>
            );
          })}
        </List>
      </Section>

      <Section title={t('help.contact')} kind="title">
        <List>
          <Row
            label={t('help.report')}
            description={t('help.reportSub')}
            trailing={
              <ExternalLink size={20} strokeWidth={1.75} className="flex-shrink-0 text-muted" aria-hidden="true" />
            }
            onClick={() => window.location.assign(createSupportMailto(t('help.reportSubject'), deviceDetails()))}
          />
          <Row
            label={t('help.feedback')}
            trailing={
              <ExternalLink size={20} strokeWidth={1.75} className="flex-shrink-0 text-muted" aria-hidden="true" />
            }
            onClick={() => window.location.assign(createSupportMailto(t('help.feedbackSubject')))}
          />
        </List>
      </Section>

      {guide && (
        <Sheet title={t(guide.title)} onClose={() => setGuide(null)}>
          <p className="mt-3 text-body text-ink">{t(guide.text, { apps: FREE_LIMITS.protectedApps })}</p>
        </Sheet>
      )}
    </Page>
  );
}

/**
 * The provider's details, filled in before the release; until then the
 * placeholders show what is missing.
 */
const PROVIDER = {
  name: '[NAME DES ANBIETERS]',
  street: '[STRASSE UND HAUSNUMMER]',
  city: '[PLZ ORT]',
  email: '[KONTAKT-E-MAIL]',
};

/** Impressum & Lizenzen (docs/V1_MASTER_PLAN.md, 4.9). */
export function ImprintScreen({ navigate }: { navigate: (s: Screen) => void }) {
  const link = (href: string, label: string) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex min-h-14 w-full items-center gap-4 px-4 py-3 text-left ${PRESSED} ${FOCUS_RING_INSET}`}
    >
      <span className="flex-1 text-body text-ink">{label}</span>
      <ExternalLink size={20} strokeWidth={1.75} className="flex-shrink-0 text-muted" aria-hidden="true" />
    </a>
  );

  return (
    <Page>
      <Header title={t('imprint.title')} onBack={() => navigate('settings')} />

      <Section title={t('imprint.provider')}>
        <address className="flex flex-col gap-0.5 rounded-surface border border-line bg-surface p-4 text-body not-italic text-ink">
          <span>{PROVIDER.name}</span>
          <span>{PROVIDER.street}</span>
          <span>
            {PROVIDER.city}, {t('imprint.country')}
          </span>
          <span>{PROVIDER.email}</span>
        </address>
      </Section>

      <Section>
        <List>
          {link('/privacy.html', t('privacy.policy'))}
          {link('/third-party-licenses.txt', t('imprint.licenses'))}
        </List>
      </Section>

      <p className="mb-4 text-body-s text-muted">{t('imprint.trademarks')}</p>
      <p className="text-caption text-muted">{t('imprint.version', { version: __APP_VERSION__ })}</p>
    </Page>
  );
}
