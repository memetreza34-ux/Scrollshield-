import React from 'react';
import { motion } from 'motion/react';
import { BarChart3, ChevronRight, Settings, Shield, Sun } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PlatformDefinition, Screen } from '../types';

export function Switch({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (c: boolean) => void;
  ariaLabel?: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel || (checked ? 'Deaktivieren' : 'Aktivieren')}
      onClick={() => onChange(!checked)}
      className="w-12 h-11 relative flex items-center flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 rounded-full"
    >
      <span
        className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ease-in-out ${checked ? 'bg-zinc-200' : 'bg-zinc-800'}`}
        aria-hidden="true"
      >
        <motion.span
          layout
          className={`block w-5 h-5 rounded-full shadow-sm ${checked ? 'bg-zinc-900' : 'bg-zinc-400'}`}
          animate={{ x: checked ? 20 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </span>
    </button>
  );
}

const TAB_SCREENS: Record<'today' | 'protect' | 'insights', Screen[]> = {
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
  insights: ['insights'],
};

export function BottomNav({ currentScreen, navigate }: { currentScreen: Screen; navigate: (s: Screen) => void }) {
  const navItems: { id: keyof typeof TAB_SCREENS; icon: LucideIcon; label: string }[] = [
    { id: 'today', icon: Sun, label: 'Heute' },
    { id: 'protect', icon: Shield, label: 'Schutz' },
    { id: 'insights', icon: BarChart3, label: 'Einblicke' },
  ];

  return (
    <nav
      aria-label="Hauptnavigation"
      className="absolute bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-zinc-950"
    >
      <div className="flex items-stretch justify-around px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2">
        {navItems.map((item) => {
          const active = TAB_SCREENS[item.id].includes(currentScreen);
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${active ? 'text-zinc-50' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <item.icon size={22} strokeWidth={active ? 2.4 : 1.8} aria-hidden="true" />
              <span className={`text-[11px] ${active ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/** Page frame for every screen above the tab bar. */
export function Page({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-5 pb-32 pt-6">
      {children}
    </motion.div>
  );
}

/** Title of a tab, with the settings gear on the right. */
export function TabHeader({ title, navigate }: { title: string; navigate: (s: Screen) => void }) {
  return (
    <header className="mb-6 flex items-center justify-between">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">{title}</h1>
      <button
        onClick={() => navigate('settings')}
        aria-label="Einstellungen"
        className="flex h-11 w-11 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      >
        <Settings size={22} aria-hidden="true" />
      </button>
    </header>
  );
}

export function Section({
  title,
  children,
  action,
}: {
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      {(title || action) && (
        <div className="mb-2 flex items-center justify-between px-1">
          {title && <h2 className="text-sm font-semibold text-zinc-400">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** A group of rows with dividers. */
export function List({ children }: { children: React.ReactNode }) {
  return <div className="divide-y divide-zinc-800/80 overflow-hidden rounded-2xl bg-zinc-900">{children}</div>;
}

export function ProBadge() {
  return (
    <span className="rounded-md border border-emerald-500/40 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400">
      Pro
    </span>
  );
}

/**
 * A list row. `right` is a separate control (a switch) and sits next to the
 * row's own button, never inside it; `trailing` is decoration inside it.
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
}) {
  const content = (
    <>
      {leading}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="font-medium text-zinc-100">{label}</span>
          {pro && <ProBadge />}
        </span>
        {description && (
          <span className="mt-0.5 block whitespace-pre-line text-sm leading-snug text-zinc-500">{description}</span>
        )}
      </span>
      {value && <span className="flex-shrink-0 text-sm text-zinc-400">{value}</span>}
      {trailing}
      {onClick && !right && !trailing && (
        <ChevronRight size={18} className="flex-shrink-0 text-zinc-600" aria-hidden="true" />
      )}
    </>
  );
  const layout = 'flex min-h-[56px] items-center gap-3 py-3 text-left';
  const dimmed = disabled ? 'opacity-50' : '';
  const button = onClick && (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${layout} ${dimmed} ${right ? 'min-w-0 flex-1 pl-4' : 'w-full px-4'} hover:bg-zinc-800/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500`}
    >
      {content}
    </button>
  );

  if (button && right) {
    return (
      <div className="flex items-center gap-2 pr-3">
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
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-[52px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-emerald-500 px-3 font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
    >
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
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-[52px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-zinc-800 px-3 font-semibold text-zinc-100 hover:bg-zinc-700 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
    >
      {children}
    </button>
  );
}

/** Choice chips for a single value, e.g. 15 / 30 / 60 minutes. */
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
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={String(option.value)}
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`flex min-h-[44px] items-center gap-2 rounded-xl border px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${selected ? 'border-emerald-500 bg-emerald-500/10 text-zinc-50' : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700'}`}
          >
            {option.label}
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
    sm: 'h-8 w-8 rounded-lg text-[10px]',
    md: 'h-11 w-11 rounded-xl text-xs',
    lg: 'h-20 w-20 rounded-3xl text-lg',
  }[size];
  return (
    <span
      aria-hidden="true"
      className={`flex flex-shrink-0 items-center justify-center overflow-hidden ${sizeClass} ${app.color}`}
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
    <div className="flex gap-2 items-center">
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
        className="bg-zinc-800 text-zinc-200 py-2 px-3 rounded-xl text-sm border border-zinc-700 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 font-medium"
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
        <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-xl px-2">
          <input
            aria-label={`${ariaLabel}: eigener Wert`}
            type="number"
            min={allowDisabled ? 0 : 1}
            value={value}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val)) onChange(val);
            }}
            className="bg-transparent text-zinc-200 outline-none w-14 py-2 text-sm text-center font-mono"
            autoFocus
          />
          <span className="text-zinc-500 text-xs pr-2">{unit}</span>
        </div>
      )}
    </div>
  );
}

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
    <header className="flex items-start justify-between gap-3 mb-8 mt-2">
      <div className="flex min-w-0 items-start gap-4">
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Zurück"
            className="p-3 -ml-3 bg-zinc-900/50 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-zinc-100 transition-colors border border-zinc-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <svg
              aria-hidden="true"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
        )}
        <h1 className="min-w-0 pt-2 text-2xl font-semibold leading-tight tracking-tight text-zinc-50">{title}</h1>
      </div>
      {rightAction && <div className="flex-shrink-0">{rightAction}</div>}
    </header>
  );
}
