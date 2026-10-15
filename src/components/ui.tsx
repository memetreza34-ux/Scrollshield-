import React, { useEffect, useId, useRef } from 'react';
import { ArrowLeft, CalendarDays, ChartNoAxesColumn, Check, ChevronRight, Settings, Shield, Timer } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PlatformDefinition, Screen } from '../types';
import { MessageKey, t } from '../i18n';
import { FOCUS_RING, FOCUS_RING_INSET, PRESSED } from './styles';

/** 52 × 32 inside a 48 px tall target. Off has a visible border, not just a darker fill. */
export function Switch({
  checked,
  onChange,
  ariaLabel,
  disabled,
}: {
  checked: boolean;
  onChange: (c: boolean) => void;
  ariaLabel?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel || t(checked ? 'common.turnOff' : 'common.turnOn')}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="group flex h-12 w-[52px] flex-shrink-0 items-center justify-center rounded-full focus-visible:outline-none disabled:opacity-[0.38]"
    >
      <span
        aria-hidden="true"
        className={`relative block h-8 w-[52px] rounded-full transition-colors duration-150 group-focus-visible:ring-2 group-focus-visible:ring-accent group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-ground ${checked ? 'bg-accent' : 'border-2 border-faint bg-raised'}`}
      >
        <span
          className={`absolute top-1 rounded-full transition-all duration-150 ${checked ? 'left-6 h-6 w-6 bg-ground' : 'left-1 h-4 w-4 bg-muted'}`}
        />
      </span>
    </button>
  );
}

const TAB_SCREENS: Record<'today' | 'protect' | 'focus' | 'insights', Screen[]> = {
  today: [
    'today',
    'rescue',
    'settings',
    'pro_status',
    'notifications',
    'privacy',
    'support',
    'imprint',
    'diagnostics',
    'paywall',
  ],
  protect: ['protect', 'app_detail', 'schedule_edit', 'commitment'],
  focus: ['focus'],
  insights: ['insights'],
};

/** 80 px, always visible. Active tab: tinted pill, green icon, bright 600 label. */
export function BottomNav({ currentScreen, navigate }: { currentScreen: Screen; navigate: (s: Screen) => void }) {
  const navItems: { id: keyof typeof TAB_SCREENS; icon: LucideIcon; label: MessageKey }[] = [
    { id: 'today', icon: CalendarDays, label: 'nav.today' },
    { id: 'protect', icon: Shield, label: 'nav.protect' },
    { id: 'focus', icon: Timer, label: 'nav.focus' },
    { id: 'insights', icon: ChartNoAxesColumn, label: 'nav.insights' },
  ];

  return (
    <nav
      aria-label={t('nav.main')}
      className="absolute bottom-0 left-0 right-0 z-50 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid h-20 grid-cols-4">
        {navItems.map((item) => {
          const active = TAB_SCREENS[item.id].includes(currentScreen);
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-1 ${FOCUS_RING_INSET}`}
            >
              <span
                className={`flex h-8 w-14 items-center justify-center rounded-full ${active ? 'bg-accent/10 text-accent' : 'text-muted'}`}
              >
                <item.icon size={24} strokeWidth={1.75} aria-hidden="true" />
              </span>
              <span className={`text-caption ${active ? 'font-semibold text-ink' : 'text-muted'}`}>
                {t(item.label)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/** Page frame for every screen above the tab bar: 16 px side margin. */
export function Page({ children }: { children: React.ReactNode }) {
  return <div className="fade-in px-4 pb-28">{children}</div>;
}

const iconButtonClass = `flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-ink ${PRESSED} ${FOCUS_RING}`;

/** Icon 24 in a 48 × 48 target, always with a label for TalkBack. */
export function IconButton({
  icon: Icon,
  label,
  onClick,
  className = '',
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button onClick={onClick} aria-label={label} className={`${iconButtonClass} ${className}`}>
      <Icon size={24} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
}

/** Title of a tab, with the settings gear on the right. 64 px high. */
export function TabHeader({ title, navigate }: { title: string; navigate: (s: Screen) => void }) {
  return (
    <header className="mb-2 flex h-16 items-center justify-between gap-2">
      <h1 className="min-w-0 text-headline text-ink">{title}</h1>
      <button
        onClick={() => navigate('settings')}
        aria-label={t('common.settings')}
        className={`-mr-3 ${iconButtonClass}`}
      >
        <Settings size={24} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </header>
  );
}

/**
 * A titled block. `label` is the small grey group heading (settings groups),
 * `title` the 20 px section heading ("Apps heute", "Zeitpläne").
 */
export function Section({
  title,
  children,
  action,
  kind = 'label',
}: {
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  kind?: 'label' | 'title';
}) {
  return (
    <section className="mb-6">
      {(title || action) && (
        <div className={`flex items-center justify-between gap-2 ${kind === 'label' ? 'mb-2 px-4' : 'mb-3'}`}>
          {title && <h2 className={kind === 'label' ? 'text-label-s text-muted' : 'text-title text-ink'}>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** A card of rows: surface, 1 px line, radius 16; rows are split by an inset line. */
export function List({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-surface border border-line bg-surface [&>*+*]:relative [&>*+*]:before:pointer-events-none [&>*+*]:before:absolute [&>*+*]:before:inset-x-4 [&>*+*]:before:top-0 [&>*+*]:before:h-px [&>*+*]:before:bg-line">
      {children}
    </div>
  );
}

/** Neutral and small, behind the word: "belongs to Pro", not "buy me". */
export function ProBadge() {
  return (
    <span className="inline-flex h-5 flex-shrink-0 items-center rounded-control bg-line px-1.5 text-[0.6875rem] leading-3 font-semibold tracking-[0.06em] text-ink uppercase">
      Pro
    </span>
  );
}

/**
 * A list row. `right` is a separate control (a switch) and sits next to the
 * row's own button, never inside it; `trailing` is decoration inside it.
 * `strong` is for app names (17 / 600); settings rows stay at body weight.
 */
export function Row({
  label,
  value,
  description,
  onClick,
  right,
  trailing,
  leading,
  pro,
  disabled,
  strong,
  noChevron,
}: {
  label: string;
  value?: string;
  description?: string;
  onClick?: () => void;
  right?: React.ReactNode;
  trailing?: React.ReactNode;
  leading?: React.ReactNode;
  pro?: boolean;
  disabled?: boolean;
  strong?: boolean;
  /** For rows that add something ("+ Zeitplan") rather than open a page. */
  noChevron?: boolean;
}) {
  const content = (
    <>
      {leading}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className={strong ? 'text-title-s text-ink' : 'text-body text-ink'}>{label}</span>
          {pro && <ProBadge />}
        </span>
        {description && <span className="mt-0.5 block whitespace-pre-line text-body-s text-muted">{description}</span>}
      </span>
      {value && <span className="flex-shrink-0 text-body-s text-muted">{value}</span>}
      {trailing}
      {onClick && !right && !trailing && !noChevron && (
        <ChevronRight size={20} strokeWidth={1.75} className="flex-shrink-0 text-muted" aria-hidden="true" />
      )}
    </>
  );
  const layout = 'flex min-h-14 items-center gap-4 py-3 text-left';
  const dimmed = disabled ? 'opacity-[0.38]' : '';
  const button = onClick && (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${layout} ${dimmed} ${right ? 'min-w-0 flex-1 pl-4' : 'w-full px-4'} ${PRESSED} ${FOCUS_RING_INSET}`}
    >
      {content}
    </button>
  );

  if (button && right) {
    return (
      <div className="flex items-center gap-2 pr-4">
        {button}
        {right}
      </div>
    );
  }
  if (button) return button;
  return (
    <div className={`${layout} w-full px-4 ${dimmed}`}>
      {content}
      {right}
    </div>
  );
}

const buttonBase = `flex min-h-12 w-full items-center justify-center gap-2 rounded-control px-4 py-3.5 text-center text-label disabled:opacity-[0.38] ${PRESSED} ${FOCUS_RING}`;

/** The one main action of a screen. At most one green button per screen. */
export function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} className={`${buttonBase} bg-accent text-ground`}>
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} className={`${buttonBase} border border-line bg-raised text-ink`}>
      {children}
    </button>
  );
}

/** Steps aside or cancels ("Später", "Ohne Schutz weiter"). Never green. */
export function TextButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} className={`${buttonBase} text-ink`}>
      {children}
    </button>
  );
}

/** A compact button at the end of a row ("Erlauben"). `primary` only for the screen's one main action. */
export function InlineButton({
  children,
  onClick,
  primary,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className={`flex min-h-12 flex-shrink-0 items-center rounded-control px-3.5 text-label ${primary ? 'bg-accent text-ground' : 'border border-line bg-raised text-ink'} ${PRESSED} ${FOCUS_RING}`}
    >
      {children}
    </button>
  );
}

const NOTICE_TONES = {
  neutral: { box: 'bg-raised', icon: 'text-muted' },
  pause: { box: 'bg-pause/10', icon: 'text-pause' },
  lock: { box: 'bg-lock/10', icon: 'text-lock' },
  calm: { box: 'bg-accent/10', icon: 'text-accent' },
};

/**
 * A notice: what is going on and what can be done. Radius 12, 10 % tint, the
 * icon in the signal colour, the text always bright. At most one per screen.
 */
export function Notice({
  tone = 'neutral',
  icon: Icon,
  title,
  children,
  action,
  role,
}: {
  tone?: keyof typeof NOTICE_TONES;
  icon: LucideIcon;
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  role?: 'status' | 'alert';
}) {
  const colors = NOTICE_TONES[tone];
  return (
    <div role={role} className={`flex items-start gap-3 rounded-control px-4 py-3 ${colors.box}`}>
      <Icon size={20} strokeWidth={1.75} className={`mt-0.5 flex-shrink-0 ${colors.icon}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="text-label text-ink">{title}</p>}
        <div className="text-body-s text-ink">{children}</div>
        {action && <div className="mt-1">{action}</div>}
      </div>
    </div>
  );
}

/**
 * One value out of a few. Up to four short options (eight characters at most)
 * become a segmented control; anything longer wraps as single chips. The
 * check mark carries the selection, not the colour.
 */
export function Choice<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string; pro?: boolean }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  const segmented = options.length <= 4 && options.every((option) => option.label.length <= 8);

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={
        segmented ? 'flex overflow-hidden rounded-control border border-line bg-surface' : 'flex flex-wrap gap-2'
      }
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        const shape = segmented
          ? `flex-auto justify-center px-2 text-center ${index > 0 ? 'border-l border-line' : ''} ${FOCUS_RING_INSET}`
          : `rounded-control border px-4 ${selected ? 'border-accent' : 'border-line bg-surface'} ${FOCUS_RING}`;
        return (
          <button
            key={String(option.value)}
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`flex min-h-12 items-center gap-1.5 text-label text-ink ${shape} ${selected ? 'bg-accent/10' : 'font-normal'} ${PRESSED}`}
          >
            {selected && <Check size={16} strokeWidth={2.5} className="flex-shrink-0 text-accent" aria-hidden="true" />}
            <span className={segmented ? '[overflow-wrap:normal]' : 'min-w-0'}>{option.label}</span>
            {option.pro && <ProBadge />}
          </button>
        );
      })}
    </div>
  );
}

/** The app's icon in a tile: launcher icon on Android, initials elsewhere. */
export function AppTile({ app, size = 'md' }: { app: PlatformDefinition; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = {
    sm: 'h-8 w-8 rounded-control text-[0.6875rem]',
    md: 'h-10 w-10 rounded-control text-[0.9375rem]',
    lg: 'h-16 w-16 rounded-surface text-[1.375rem]',
  }[size];
  return (
    <span
      aria-hidden="true"
      className={`flex flex-shrink-0 items-center justify-center overflow-hidden font-semibold ${sizeClass} ${app.color}`}
    >
      {app.icon}
    </span>
  );
}

export function TimeSelector({
  value,
  onChange,
  options,
  unit = t('common.minutesUnit'),
  customLabel = t('common.custom'),
  allowDisabled = false,
  disabledLabel = t('common.off'),
  ariaLabel = t('common.chooseTime'),
}: {
  value: number;
  onChange: (v: number) => void;
  options: number[];
  unit?: string;
  customLabel?: string;
  allowDisabled?: boolean;
  disabledLabel?: string;
  ariaLabel?: string;
}) {
  const [isCustom, setIsCustom] = React.useState(!options.includes(value) && (value !== 0 || !allowDisabled));
  const selectValue = isCustom ? 'custom' : value.toString();

  return (
    <div className="flex items-center gap-2">
      <select
        aria-label={ariaLabel}
        value={selectValue}
        onChange={(e) => {
          if (e.target.value === 'custom') {
            setIsCustom(true);
            onChange(options[0] || 1); // default to first option when switching to custom
          } else {
            setIsCustom(false);
            onChange(Number(e.target.value));
          }
        }}
        className={`min-h-12 rounded-control border border-line bg-raised px-3 text-body-s font-medium text-ink ${FOCUS_RING}`}
      >
        {allowDisabled && <option value="0">{disabledLabel}</option>}
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt} {unit}
          </option>
        ))}
        <option value="custom">{customLabel} ...</option>
      </select>

      {isCustom && (
        <div className="flex items-center gap-2 rounded-control border border-line bg-raised px-2">
          <input
            aria-label={t('common.customValue', { label: ariaLabel })}
            type="number"
            min={allowDisabled ? 0 : 1}
            value={value}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val)) onChange(val);
            }}
            className="w-14 bg-transparent py-2 text-center text-body-s text-ink outline-none"
            autoFocus
          />
          <span className="pr-2 text-caption text-muted">{unit}</span>
        </div>
      )}
    </div>
  );
}

/** Header of a sub page: back arrow, 20 px title. Without a back arrow the title is a page title. */
export function Header({
  title,
  onBack,
  rightAction,
}: {
  title: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}) {
  return (
    <header className="mb-2 flex min-h-16 items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-1">
        {onBack && (
          <button onClick={onBack} aria-label={t('common.back')} className={`-ml-3 ${iconButtonClass}`}>
            <ArrowLeft size={24} strokeWidth={1.75} aria-hidden="true" />
          </button>
        )}
        <h1 className={`min-w-0 text-ink ${onBack ? 'text-title' : 'text-headline'}`}>{title}</h1>
      </div>
      {rightAction && <div className="flex-shrink-0">{rightAction}</div>}
    </header>
  );
}

/** A state in one line under a name: "Gesperrt bis 07:00 · Abend". The dot carries the signal colour. */
export function StatusChip({ tone, children }: { tone: 'accent' | 'pause' | 'lock'; children: React.ReactNode }) {
  const dot = { accent: 'bg-accent', pause: 'bg-pause', lock: 'bg-lock' }[tone];
  return (
    <span className="inline-flex min-h-7 items-center gap-2 rounded-control bg-raised px-3 py-1 text-label-s text-ink">
      <span className={`h-2 w-2 flex-shrink-0 rounded-full ${dot}`} aria-hidden="true" />
      {children}
    </span>
  );
}

/** Why nothing is here: one icon, one sentence, one explanation, at most one button. No illustrations. */
export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-surface border border-line bg-surface px-6 py-8 text-center">
      <Icon size={40} strokeWidth={1.5} className="text-muted" aria-hidden="true" />
      <p className="mt-2 text-title-s text-ink">{title}</p>
      <p className="text-body-s text-muted">{text}</p>
      {action && <div className="mt-3 w-full">{action}</div>}
    </div>
  );
}

/**
 * One option out of a list where each option needs a sentence: presets,
 * short-video modes, commitment times. The name is the label; the sentence is
 * its description.
 */
export function OptionList<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; description?: string; tag?: string; pro?: boolean }[];
  onChange: (value: T) => void;
}) {
  const id = useId();
  return (
    <div role="radiogroup" aria-label={label}>
      <List>
        {options.map((option, index) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              role="radio"
              aria-checked={selected}
              aria-labelledby={`${id}-${index}`}
              aria-describedby={option.description ? `${id}-${index}-text` : undefined}
              onClick={() => onChange(option.value)}
              className={`flex w-full items-start gap-4 px-4 py-3.5 text-left ${PRESSED} ${FOCUS_RING_INSET}`}
            >
              <span
                aria-hidden="true"
                className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${selected ? 'bg-accent' : 'border-2 border-muted'}`}
              >
                {selected && <span className="h-2 w-2 rounded-full bg-ground" />}
              </span>
              <span className="min-w-0 flex-1">
                <span id={`${id}-${index}`} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-body font-semibold text-ink">{option.label}</span>
                  {option.tag && <span className="text-body-s text-muted">· {option.tag}</span>}
                  {option.pro && <ProBadge />}
                </span>
                {option.description && (
                  <span id={`${id}-${index}-text`} className="mt-0.5 block text-body-s text-muted">
                    {option.description}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </List>
    </div>
  );
}

/** A question from below: raised surface, rounded on top, closes with Escape. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 sm:items-center sm:p-4">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose();
        }}
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-surface border border-line bg-raised px-5 pb-6 pt-3 focus:outline-none sm:rounded-surface"
      >
        <span aria-hidden="true" className="mx-auto mb-4 block h-1 w-10 rounded-full bg-faint" />
        <h2 id={titleId} className="text-title text-ink">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
