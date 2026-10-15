import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Battery, Bell, Check, Info, Layers, RotateCcw, Shield, Smartphone, SquarePlay } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AppPermissions, AppState, Screen, SUPPORTED_APPS } from '../types';
import { AppTile, IconButton, InlineButton, List, Notice, PrimaryButton, TextButton } from '../components/ui';
import { PausePreview } from '../components/PausePreview';
import { MessageKey, t } from '../i18n';
import { FREE_LIMITS } from '../lib/entitlements';
import { applyPreset } from '../lib/presets';
import { V1_SHORT_VIDEO_APP_IDS } from '../lib/shortVideoSignatures';
import { normalizeAppConfig } from '../lib/state';
import { usePermissionRequests } from '../lib/usePermissionRequests';

type UpdateState = (u: Partial<AppState> | ((previous: AppState) => Partial<AppState>)) => void;

// Keys, not texts: t() runs at render time so a language change shows at once.
const WELCOME_POINTS: { icon: LucideIcon; title: MessageKey; text: MessageKey }[] = [
  { icon: SquarePlay, title: 'welcome.shortVideo.title', text: 'welcome.shortVideo.text' },
  { icon: RotateCcw, title: 'welcome.reflex.title', text: 'welcome.reflex.text' },
  { icon: Smartphone, title: 'welcome.noAccount.title', text: 'welcome.noAccount.text' },
];

/** Willkommen (docs/V1_MASTER_PLAN.md, 4.1). */
export function Welcome({ navigate }: { navigate: (s: Screen) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-full flex-col px-4 pb-6 pt-10"
    >
      <div className="flex flex-1 flex-col">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-control border border-line bg-surface">
            <Shield size={28} strokeWidth={1.75} className="text-accent" aria-hidden="true" />
          </span>
          <span className="text-title-s text-ink">{t('app.name')}</span>
        </div>

        <h1 className="mt-6 text-number text-ink">{t('welcome.title')}</h1>

        <ul className="mt-6 flex flex-col gap-5">
          {WELCOME_POINTS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-4">
              <Icon size={24} strokeWidth={1.75} className="flex-shrink-0 text-ink" aria-hidden="true" />
              <span className="flex flex-col gap-0.5">
                <span className="text-body font-semibold text-ink">{t(title)}</span>
                <span className="text-body-s text-muted">{t(text)}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="flex flex-1 items-center justify-center py-3">
          <PausePreview />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <PrimaryButton onClick={() => navigate('onboarding')}>{t('welcome.start')}</PrimaryButton>
        <TextButton onClick={() => navigate('support')}>{t('welcome.learnMore')}</TextButton>
        <p className="text-center text-caption text-muted">{t('welcome.age')}</p>
      </div>
    </motion.div>
  );
}

/** What protection means for an app; only apps with checked detection get the short-video promise. */
const SHORT_VIDEO_HINTS: Record<string, MessageKey> = {
  instagram: 'onboarding.apps.hint.instagram',
  youtube: 'onboarding.apps.hint.youtube',
  tiktok: 'onboarding.apps.hint.tiktok',
};
const appHint = (appId: string) =>
  t((V1_SHORT_VIDEO_APP_IDS.includes(appId) && SHORT_VIDEO_HINTS[appId]) || 'onboarding.apps.hint.other');

/** "Instagram und TikTok sind dann geschützt." */
const protectedSentence = (names: string[]) =>
  names.length === 1
    ? t('onboarding.permissions.oneProtected', { name: names[0] })
    : t('onboarding.permissions.manyProtected', {
        names: names.slice(0, -1).join(', '),
        last: names[names.length - 1],
      });

const FOOTER = 'sticky bottom-0 flex flex-col gap-3 border-t border-line bg-ground px-4 pb-6 pt-3';

/**
 * Onboarding: choose apps, see how it works, then permissions. No paywall:
 * the free limit shows as a sentence, not as a sales screen.
 */
export function Onboarding({
  state,
  updateState,
  navigate,
}: {
  state: AppState;
  updateState: UpdateState;
  navigate: (s: Screen) => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const selectedNames = SUPPORTED_APPS.filter((app) => selectedApps.includes(app.id)).map((app) => app.name);

  const confirmApps = () => {
    const appsConfig = { ...state.appsConfig };
    selectedApps.forEach((id) => {
      appsConfig[id] = { ...applyPreset(normalizeAppConfig(id, appsConfig[id]), 'ausgewogen'), active: true };
    });
    updateState({ appsConfig });
    setStep(2);
  };

  const finish = () => {
    updateState({ hasCompletedOnboarding: true });
    navigate('today');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-full flex-col"
    >
      <div className="flex-shrink-0">
        <div className="flex h-14 items-center gap-1 pl-1 pr-4">
          <IconButton
            icon={ArrowLeft}
            label={t('common.back')}
            onClick={() => (step === 1 ? navigate('welcome') : setStep(step === 3 ? 2 : 1))}
          />
          <span className="text-label-s text-muted">{t('onboarding.step', { step })}</span>
        </div>
        <div aria-hidden="true" className="mx-4 grid grid-cols-3 gap-1">
          {[1, 2, 3].map((n) => (
            <span key={n} className={`h-1 rounded-full ${n <= step ? 'bg-accent' : 'bg-line'}`} />
          ))}
        </div>
      </div>

      {step === 1 && (
        <ChooseApps selected={selectedApps} names={selectedNames} onChange={setSelectedApps} onNext={confirmApps} />
      )}
      {step === 2 && <HowItWorks onNext={() => setStep(3)} />}
      {step === 3 && (
        <SetupPermissions state={state} updateState={updateState} appNames={selectedNames} onFinish={finish} />
      )}
    </motion.div>
  );
}

function ChooseApps({
  selected,
  names,
  onChange,
  onNext,
}: {
  selected: string[];
  names: string[];
  onChange: (ids: string[]) => void;
  onNext: () => void;
}) {
  const limit = FREE_LIMITS.protectedApps;
  const limitReached = selected.length >= limit;

  return (
    <>
      <div className="flex-1 px-4 pb-6 pt-6">
        <h1 className="text-headline text-ink">{t('onboarding.apps.title')}</h1>
        <p className="mb-4 mt-1 text-body-s text-muted">{t('onboarding.apps.subtitle', { limit })}</p>
        <fieldset>
          <legend className="sr-only">{t('onboarding.apps.legend')}</legend>
          <List>
            {SUPPORTED_APPS.map((app) => {
              const checked = selected.includes(app.id);
              const disabled = !checked && limitReached;
              return (
                <label
                  key={app.id}
                  className={`flex min-h-[72px] items-center gap-4 px-4 py-3 ${disabled ? 'opacity-[0.38]' : 'cursor-pointer active:bg-ink/[0.08]'}`}
                >
                  <AppTile app={app} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-title-s text-ink">{app.name}</span>
                    <span id={`app-hint-${app.id}`} className="block text-body-s text-muted">
                      {appHint(app.id)}
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    aria-label={app.name}
                    aria-describedby={`app-hint-${app.id}`}
                    className="peer sr-only"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => onChange(checked ? selected.filter((id) => id !== app.id) : [...selected, app.id])}
                  />
                  {/* 22 × 22 with radius 6, so it does not look like a single-choice option. */}
                  <span
                    aria-hidden="true"
                    className={`flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-[6px] peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface ${checked ? 'bg-accent text-ground' : 'border-2 border-muted'}`}
                  >
                    {checked && <Check size={16} strokeWidth={2.5} />}
                  </span>
                </label>
              );
            })}
          </List>
        </fieldset>
      </div>

      <div className={FOOTER}>
        {limitReached && (
          <Notice icon={Info} role="status">
            {t('onboarding.apps.limit', { limit })}
          </Notice>
        )}
        <p className="text-label-s text-muted" aria-live="polite">
          {t('onboarding.apps.count', { count: selected.length, limit })}
          {names.length > 0 ? ` · ${names.join(', ')}` : ''}
        </p>
        <PrimaryButton onClick={onNext} disabled={selected.length === 0}>
          {t('common.continue')}
        </PrimaryButton>
      </div>
    </>
  );
}

const HOW_IT_WORKS: [MessageKey, MessageKey][] = [
  ['onboarding.how.open.title', 'onboarding.how.open.text'],
  ['onboarding.how.decide.title', 'onboarding.how.decide.text'],
  ['onboarding.how.reopen.title', 'onboarding.how.reopen.text'],
  ['onboarding.how.shortVideo.title', 'onboarding.how.shortVideo.text'],
];

function HowItWorks({ onNext }: { onNext: () => void }) {
  return (
    <>
      <div className="flex-1 px-4 pb-6 pt-6">
        <h1 className="mb-6 text-headline text-ink">{t('onboarding.how.title')}</h1>
        <ol>
          {HOW_IT_WORKS.map(([title, text], index) => {
            const last = index === HOW_IT_WORKS.length - 1;
            return (
              <li key={title} className="grid grid-cols-[28px_minmax(0,1fr)] gap-x-4">
                <span aria-hidden="true" className="flex flex-col items-center">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-line bg-raised text-label-s font-semibold text-ink">
                    {index + 1}
                  </span>
                  {!last && <span className="my-1 w-px flex-1 bg-line" />}
                </span>
                <span className={`flex flex-col gap-0.5 pt-0.5 ${last ? '' : 'pb-5'}`}>
                  <span className="text-body font-semibold text-ink">{t(title)}</span>
                  <span className="text-body-s text-muted">{t(text)}</span>
                </span>
              </li>
            );
          })}
        </ol>

        <div className="mt-7 flex flex-col gap-1 rounded-surface border border-line bg-surface p-4">
          <p className="text-label text-ink">{t('onboarding.how.start.title')}</p>
          <p className="text-body-s text-muted">
            {t('preset.ausgewogen.summary')} {t('onboarding.how.start.change')}
          </p>
        </div>
      </div>

      <div className={FOOTER}>
        <PrimaryButton onClick={onNext}>{t('common.continue')}</PrimaryButton>
      </div>
    </>
  );
}

type PermissionItem = {
  key: Exclude<keyof AppPermissions, 'accessibility'>;
  icon: LucideIcon;
  title: MessageKey;
  why: MessageKey;
  /** Shown instead of `why` once the system screen was opened and nothing was granted. */
  missing?: MessageKey;
};

const REQUIRED_PERMISSIONS: PermissionItem[] = [
  {
    key: 'usageAccess',
    icon: Smartphone,
    title: 'permission.usageAccess.title',
    why: 'permission.usageAccess.why',
    missing: 'permission.usageAccess.missing',
  },
  {
    key: 'overlay',
    icon: Layers,
    title: 'permission.overlay.title',
    why: 'permission.overlay.why',
    missing: 'permission.overlay.missing',
  },
];

const BATTERY_PERMISSION: PermissionItem = {
  key: 'backgroundActivity',
  icon: Battery,
  title: 'permission.battery.title',
  why: 'permission.battery.why',
};

const NOTIFICATION_PERMISSION: PermissionItem = {
  key: 'notifications',
  icon: Bell,
  title: 'permission.notifications.title',
  why: 'permission.notifications.why',
};

/**
 * Step 3: only what protection needs, each with one sentence why. The
 * accessibility service is not asked here; it belongs to short-video
 * protection and comes with its own disclosure.
 */
function SetupPermissions({
  state,
  updateState,
  appNames,
  onFinish,
}: {
  state: AppState;
  updateState: UpdateState;
  appNames: string[];
  onFinish: () => void;
}) {
  const { permissions, operatingSystem } = state;
  const { requestPermission } = usePermissionRequests(updateState);
  // Which system screens were opened here, to tell "not yet" from "tried, still missing".
  const [asked, setAsked] = useState<ReadonlySet<PermissionItem['key']>>(new Set());
  const ask = (key: PermissionItem['key']) => {
    setAsked((previous) => new Set(previous).add(key));
    void requestPermission(key);
  };

  const isAndroid = operatingSystem === 'android';
  const required = isAndroid ? REQUIRED_PERMISSIONS : [];
  const recommended = isAndroid ? [BATTERY_PERMISSION, NOTIFICATION_PERMISSION] : [NOTIFICATION_PERMISSION];
  const requiredGranted = required.every((item) => permissions[item.key]);
  // At most one green button per screen: the next required permission, or "Schutz starten".
  const nextRequired = required.find((item) => !permissions[item.key])?.key;

  const rows = (items: PermissionItem[], isRequired: boolean) => (
    <div className="divide-y divide-line">
      {items.map((item) => (
        <PermissionRow
          key={item.key}
          item={item}
          granted={permissions[item.key]}
          asked={asked.has(item.key)}
          isRequired={isRequired}
          primary={item.key === nextRequired}
          onAsk={() => ask(item.key)}
        />
      ))}
    </div>
  );

  return (
    <>
      <div className="flex-1 px-4 pb-6 pt-6">
        <h1 className="text-headline text-ink">{t('onboarding.permissions.title')}</h1>
        <p className="mb-5 mt-1 text-body-s text-muted">{t('onboarding.permissions.subtitle')}</p>

        {!isAndroid && (
          <div className="mb-5">
            <Notice icon={Info}>{t('onboarding.permissions.preview')}</Notice>
          </div>
        )}

        {isAndroid && (
          <section aria-labelledby="setup-required" className="mb-4">
            <h2 id="setup-required" className="text-label-s text-muted">
              {t('onboarding.permissions.required')}
            </h2>
            {rows(required, true)}
          </section>
        )}

        <section aria-labelledby="setup-recommended">
          <h2 id="setup-recommended" className="text-label-s text-muted">
            {t(isAndroid ? 'onboarding.permissions.recommended' : 'onboarding.permissions.optional')}
          </h2>
          {rows(recommended, false)}
        </section>

        {isAndroid && (
          <p className="mt-4 flex items-start gap-3 text-body-s text-muted">
            <Info size={20} strokeWidth={1.75} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
            {t('onboarding.permissions.accessibilityNote')}
          </p>
        )}
      </div>

      <div className={FOOTER}>
        {!isAndroid && <PrimaryButton onClick={onFinish}>{t('onboarding.permissions.done')}</PrimaryButton>}
        {isAndroid && requiredGranted && (
          <>
            <p className="text-center text-body-s text-muted">{protectedSentence(appNames)}</p>
            <PrimaryButton onClick={onFinish}>{t('onboarding.permissions.start')}</PrimaryButton>
          </>
        )}
        {isAndroid && !requiredGranted && (
          <div className="flex flex-col gap-1">
            <TextButton onClick={onFinish}>
              {t(
                required.some((item) => permissions[item.key])
                  ? 'onboarding.permissions.withoutProtection'
                  : 'onboarding.permissions.withoutPermissions',
              )}
            </TextButton>
            <p className="text-center text-caption text-muted">{t('onboarding.permissions.later')}</p>
          </div>
        )}
      </div>
    </>
  );
}

function PermissionRow({
  item,
  granted,
  asked,
  isRequired,
  primary,
  onAsk,
}: {
  item: PermissionItem;
  granted: boolean;
  asked: boolean;
  isRequired: boolean;
  primary: boolean;
  onAsk: () => void;
}) {
  const missing = asked && !granted && isRequired;
  const action = t(missing ? 'permission.openAgain' : 'permission.allow');
  const title = t(item.title);

  return (
    <div className="py-4">
      <div className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-x-4">
        <item.icon size={24} strokeWidth={1.75} className="self-start text-ink" aria-hidden="true" />
        <div className="flex min-w-0 flex-col items-start gap-1">
          <h3 className="text-body font-semibold text-ink">{title}</h3>
          {missing && (
            <span className="inline-flex h-7 items-center gap-2 rounded-control bg-raised px-3 text-label-s text-ink">
              <span className="h-2 w-2 rounded-full bg-pause" aria-hidden="true" />
              {t('permission.notGranted')}
            </span>
          )}
          <p className="text-body-s text-muted">{t(missing && item.missing ? item.missing : item.why)}</p>
        </div>
        {granted ? (
          <span className="flex items-center gap-1.5 text-body-s font-medium text-ink">
            <Check size={20} strokeWidth={2} className="text-accent" aria-hidden="true" />
            {t('permission.granted')}
          </span>
        ) : (
          <InlineButton primary={primary} onClick={onAsk} ariaLabel={`${action}: ${title}`}>
            {action}
          </InlineButton>
        )}
      </div>
      {missing && <NotRecognizedHelp />}
    </div>
  );
}

/** Permission granted in Android but still shown as missing: the usual causes, without leaving the onboarding. */
function NotRecognizedHelp() {
  const [open, setOpen] = useState(false);
  return (
    <div className="ml-10">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="min-h-11 text-left text-body-s font-medium text-ink underline underline-offset-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {t('permission.notRecognised')}
      </button>
      {open && <p className="text-body-s text-muted">{t('permission.notRecognisedHelp')}</p>}
    </div>
  );
}
