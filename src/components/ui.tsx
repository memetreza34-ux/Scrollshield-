import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, CalendarDays, ChartNoAxesColumn, Check, ChevronRight, Settings, Shield, Timer } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PlatformDefinition, Screen } from '../types';

/** Pressed state of every control: an 8 % lighter layer over whatever fill it has. */
const PRESSED = 'active:shadow-[inset_0_0_0_100vmax_rgb(244_244_245/0.08)]';
/** Keyboard and TalkBack focus: a green ring with a gap. */
const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ground';
const FOCUS_RING_INSET =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent';

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
      aria-label={ariaLabel || (checked ? 'Deaktivieren' : 'Aktivieren')}
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
    'notifications',
    'privacy',
    'support',
    'help',
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
  const navItems: { id: keyof typeof TAB_SCREENS; icon: LucideIcon; label: string }[] = [
    { id: 'today', icon: CalendarDays, label: 'Heute' },
    { id: 'protect', icon: Shield, label: 'Schutz' },
    { id: 'focus', icon: Timer, label: 'Fokus' },
    { id: 'insights', icon: ChartNoAxesColumn, label: 'Einblicke' },
  ];

  return (
    <nav
      aria-label="Hauptnavigation"
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
              <span className={`text-caption ${active ? 'font-semibold text-ink' : 'text-muted'}`}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/** Page frame for every screen above the tab bar: 16 px side margin. */
export function Page({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="px-4 pb-28"
    >
      {children}
    </motion.div>
  );
}

const iconButtonClass = `flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-ink ${PRESSED} ${FOCUS_RING}`;

/** Title of a tab, with the settings gear on the right. 64 px high. */
export function TabHeader({ title, navigate }: { title: string; navigate: (s: Screen) => void }) {
  return (
    <header className="mb-2 flex h-16 items-center justify-between gap-2">
      <h1 className="min-w-0 text-headline text-ink">{title}</h1>
      <button onClick={() => navigate('settings')} aria-label="Einstellungen" className={`-mr-3 ${iconButtonClass}`}>
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
      {onClick && !right && !trailing && (
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
          ? `min-w-0 flex-1 justify-center px-2 ${index > 0 ? 'border-l border-line' : ''} ${FOCUS_RING_INSET}`
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
            <span className="min-w-0">{option.label}</span>
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
  unit = 'Min',
  customLabel = 'Eigene',
  allowDisabled = false,
  disabledLabel = 'Aus',
  ariaLabel = 'Zeitwert auswählen',
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
            aria-label={`${ariaLabel}: eigener Wert`}
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
          <button onClick={onBack} aria-label="Zurück" className={`-ml-3 ${iconButtonClass}`}>
            <ArrowLeft size={24} strokeWidth={1.75} aria-hidden="true" />
          </button>
        )}
        <h1 className={`min-w-0 text-ink ${onBack ? 'text-title' : 'text-headline'}`}>{title}</h1>
      </div>
      {rightAction && <div className="flex-shrink-0">{rightAction}</div>}
    </header>
  );
}
