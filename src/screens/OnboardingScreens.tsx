import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Battery, Bell, Check, Info, Layers, RotateCcw, Shield, Smartphone, SquarePlay } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AppPermissions, AppState, Screen, SUPPORTED_APPS } from '../types';
import { AppTile, IconButton, InlineButton, List, Notice, PrimaryButton, TextButton } from '../components/ui';
import { FREE_LIMITS } from '../lib/entitlements';
import { applyPreset, getPreset } from '../lib/presets';
import { V1_SHORT_VIDEO_APP_IDS } from '../lib/shortVideoSignatures';
import { normalizeAppConfig } from '../lib/state';
import { usePermissionRequests } from '../lib/usePermissionRequests';

type UpdateState = (u: Partial<AppState> | ((previous: AppState) => Partial<AppState>)) => void;

const WELCOME_POINTS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: SquarePlay,
    title: 'Kurzvideos bremsen',
    text: 'Reels und Shorts sperren oder begrenzen. Der Rest der App bleibt frei.',
  },
  {
    icon: RotateCcw,
    title: 'Reflexhaftes Öffnen bremsen',
    text: 'Eine kurze Pause vor der App. Wer gleich wieder öffnet, wartet länger.',
  },
  { icon: Smartphone, title: 'Kein Konto', text: 'Alles bleibt auf deinem Handy. Keine Werbung.' },
];

/** Willkommen (docs/V1_MASTER_PLAN.md, 4.1). */
export function Welcome({ navigate }: { navigate: (s: Screen) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex min-h-full flex-col px-4 pb-6 pt-16"
    >
      <div className="flex flex-1 flex-col">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-control border border-line bg-surface">
            <Shield size={28} strokeWidth={1.75} className="text-accent" aria-hidden="true" />
          </span>
          <span className="text-title-s text-ink">ScrollShield</span>
        </div>

        <h1 className="mt-10 text-number text-ink">Instagram ja, Reels nein.</h1>

        <ul className="mt-10 flex flex-col gap-6">
          {WELCOME_POINTS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-4">
              <Icon size={24} strokeWidth={1.75} className="flex-shrink-0 text-ink" aria-hidden="true" />
              <span className="flex flex-col gap-0.5">
                <span className="text-body font-semibold text-ink">{title}</span>
                <span className="text-body-s text-muted">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-10 flex flex-col gap-1">
        <PrimaryButton onClick={() => navigate('onboarding')}>Loslegen</PrimaryButton>
        <TextButton onClick={() => navigate('help')}>Mehr erfahren</TextButton>
        <p className="text-center text-caption text-muted">Für Nutzer ab 16 Jahren.</p>
      </div>
    </motion.div>
  );
}

/** What protection means for an app; only apps with checked detection get the short-video promise. */
const SHORT_VIDEO_HINTS: Record<string, string> = {
  instagram: 'Reels sperren oder begrenzen',
  youtube: 'Shorts sperren oder begrenzen',
  tiktok: 'Feed sperren oder begrenzen',
};
const appHint = (appId: string) =>
  (V1_SHORT_VIDEO_APP_IDS.includes(appId) && SHORT_VIDEO_HINTS[appId]) || 'Pause beim Öffnen';

/** "Instagram und TikTok sind dann geschützt." */
const protectedSentence = (names: string[]) =>
  names.length === 1
    ? `${names[0]} ist dann geschützt.`
    : `${names.slice(0, -1).join(', ')} und ${names[names.length - 1]} sind dann geschützt.`;

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
            label="Zurück"
            onClick={() => (step === 1 ? navigate('welcome') : setStep(step === 3 ? 2 : 1))}
          />
          <span className="text-label-s text-muted">Schritt {step} von 3</span>
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
        <h1 className="text-headline text-ink">Welche Apps ziehen dich rein?</h1>
        <p className="mb-4 mt-1 text-body-s text-muted">
          Wähle bis zu {limit} Apps. Ändern geht jederzeit im Tab „Schutz“.
        </p>
        <fieldset>
          <legend className="sr-only">Apps zum Schützen</legend>
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
            In der kostenlosen Version {limit} Apps. Mehr mit Pro – später in den Einstellungen.
          </Notice>
        )}
        <p className="text-label-s text-muted" aria-live="polite">
          {selected.length} von {limit} gewählt{names.length > 0 ? ` · ${names.join(', ')}` : ''}
        </p>
        <PrimaryButton onClick={onNext} disabled={selected.length === 0}>
          Weiter
        </PrimaryButton>
      </div>
    </>
  );
}

const HOW_IT_WORKS = [
  ['Du öffnest eine geschützte App.', 'Vorher erscheint eine kurze Pause mit Countdown.'],
  ['Du entscheidest.', '„Zurück“ geht immer. „Weiter“ erst, wenn die Pause vorbei ist.'],
  ['Du öffnest sie gleich wieder.', 'Dann wird die Pause länger. Bei „Stark“ folgt danach eine Abkühlzeit.'],
  [
    'Kurzvideos bekommen eigene Regeln.',
    'Reels, Shorts und den TikTok-Feed sperrst oder begrenzt du pro App. Nachrichten und Profile bleiben frei.',
  ],
];

function HowItWorks({ onNext }: { onNext: () => void }) {
  return (
    <>
      <div className="flex-1 px-4 pb-6 pt-6">
        <h1 className="mb-6 text-headline text-ink">So funktioniert's</h1>
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
                  <span className="text-body font-semibold text-ink">{title}</span>
                  <span className="text-body-s text-muted">{text}</span>
                </span>
              </li>
            );
          })}
        </ol>

        <div className="mt-7 flex flex-col gap-1 rounded-surface border border-line bg-surface p-4">
          <p className="text-label text-ink">Gestartet wird mit „Ausgewogen“</p>
          <p className="text-body-s text-muted">{getPreset('ausgewogen')?.summary} Pro App änderbar im Tab „Schutz“.</p>
        </div>
      </div>

      <div className={FOOTER}>
        <PrimaryButton onClick={onNext}>Weiter</PrimaryButton>
      </div>
    </>
  );
}

type PermissionItem = {
  key: Exclude<keyof AppPermissions, 'accessibility'>;
  icon: LucideIcon;
  title: string;
  why: string;
  /** Shown instead of `why` once the system screen was opened and nothing was granted. */
  missing?: string;
};

const REQUIRED_PERMISSIONS: PermissionItem[] = [
  {
    key: 'usageAccess',
    icon: Smartphone,
    title: 'App-Nutzungszugriff',
    why: 'Merkt, wann du eine geschützte App öffnest.',
    missing: 'Ohne ihn sieht ScrollShield nicht, wann du eine App öffnest.',
  },
  {
    key: 'overlay',
    icon: Layers,
    title: 'Über anderen Apps einblenden',
    why: 'Damit die Pause über der App erscheint.',
    missing: 'Ohne sie erscheint keine Pause.',
  },
];

const BATTERY_PERMISSION: PermissionItem = {
  key: 'backgroundActivity',
  icon: Battery,
  title: 'Akku-Ausnahme',
  why: 'Damit Android den Schutz nicht im Hintergrund beendet.',
};

const NOTIFICATION_PERMISSION: PermissionItem = {
  key: 'notifications',
  icon: Bell,
  title: 'Benachrichtigungen',
  why: 'Optional. Standardmäßig nur für das Ende eines Fokus.',
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
        <h1 className="text-headline text-ink">Berechtigungen</h1>
        <p className="mb-5 mt-1 text-body-s text-muted">Nur was nötig ist. Jede mit einem Satz, wofür.</p>

        {!isAndroid && (
          <div className="mb-5">
            <Notice icon={Info}>Vorschau im Browser. Echte Sperren gibt es nur in der Android-App.</Notice>
          </div>
        )}

        {isAndroid && (
          <section aria-labelledby="setup-required" className="mb-4">
            <h2 id="setup-required" className="text-label-s text-muted">
              Nötig für den Schutz
            </h2>
            {rows(required, true)}
          </section>
        )}

        <section aria-labelledby="setup-recommended">
          <h2 id="setup-recommended" className="text-label-s text-muted">
            {isAndroid ? 'Empfohlen' : 'Optional'}
          </h2>
          {rows(recommended, false)}
        </section>

        {isAndroid && (
          <p className="mt-4 flex items-start gap-3 text-body-s text-muted">
            <Info size={20} strokeWidth={1.75} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
            Die Bedienungshilfe brauchst du nur für den Kurzvideo-Schutz. Darum fragen wir sie hier nicht ab.
          </p>
        )}
      </div>

      <div className={FOOTER}>
        {!isAndroid && <PrimaryButton onClick={onFinish}>Fertig</PrimaryButton>}
        {isAndroid && requiredGranted && (
          <>
            <p className="text-center text-body-s text-muted">{protectedSentence(appNames)}</p>
            <PrimaryButton onClick={onFinish}>Schutz starten</PrimaryButton>
          </>
        )}
        {isAndroid && !requiredGranted && (
          <div className="flex flex-col gap-1">
            <TextButton onClick={onFinish}>
              {required.some((item) => permissions[item.key]) ? 'Ohne Schutz weiter' : 'Ohne Berechtigungen weiter'}
            </TextButton>
            <p className="text-center text-caption text-muted">„Heute“ zeigt dann, was noch fehlt.</p>
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
  const action = missing ? 'Erneut öffnen' : 'Erlauben';

  return (
    <div className="py-4">
      <div className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-x-4">
        <item.icon size={24} strokeWidth={1.75} className="self-start text-ink" aria-hidden="true" />
        <div className="flex min-w-0 flex-col items-start gap-1">
          <h3 className="text-body font-semibold text-ink">{item.title}</h3>
          {missing && (
            <span className="inline-flex h-7 items-center gap-2 rounded-control bg-raised px-3 text-label-s text-ink">
              <span className="h-2 w-2 rounded-full bg-pause" aria-hidden="true" />
              Nicht erteilt
            </span>
          )}
          <p className="text-body-s text-muted">{missing && item.missing ? item.missing : item.why}</p>
        </div>
        {granted ? (
          <span className="flex items-center gap-1.5 text-body-s font-medium text-ink">
            <Check size={20} strokeWidth={2} className="text-accent" aria-hidden="true" />
            Erteilt
          </span>
        ) : (
          <InlineButton primary={primary} onClick={onAsk} ariaLabel={`${action}: ${item.title}`}>
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
        Schon erlaubt, aber nicht erkannt?
      </button>
      {open && (
        <p className="text-body-s text-muted">
          ScrollShield prüft das jedes Mal neu, wenn du in die App zurückkommst. Bei manchen Herstellern, etwa Xiaomi,
          gibt es eine zweite Erlaubnis wie „Pop-up-Fenster im Hintergrund anzeigen“. Du findest sie in den App-Infos
          von ScrollShield.
        </p>
      )}
    </div>
  );
}
