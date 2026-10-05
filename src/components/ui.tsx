import React from 'react';
import { motion } from 'motion/react';
import { Home, Settings, Clock, List } from 'lucide-react';
import { Screen } from '../types';

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

export function BottomNav({ currentScreen, navigate }: { currentScreen: Screen; navigate: (s: Screen) => void }) {
  const navItems = [
    { id: 'dashboard', icon: Home, label: 'Home' },
    { id: 'apps', icon: List, label: 'Apps' },
    { id: 'focus', icon: Clock, label: 'Fokus' },
    { id: 'settings', icon: Settings, label: 'Optionen' },
  ];

  const isActive = (id: string) => {
    if (currentScreen === id) return true;
    if (id === 'dashboard' && ['history'].includes(currentScreen)) return true;
    if (id === 'apps' && ['app_detail', 'rules'].includes(currentScreen)) return true;
    if (id === 'settings' && ['help', 'privacy'].includes(currentScreen)) return true;
    return false;
  };

  return (
    <nav
      aria-label="Hauptnavigation"
      className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-sm z-50"
    >
      <div className="flex items-center justify-between rounded-3xl border border-[#34473c] bg-[#1b2621]/95 p-2 shadow-2xl shadow-black/50 backdrop-blur-2xl">
        {navItems.map((item) => {
          const active = isActive(item.id);
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id as Screen)}
              aria-current={active ? 'page' : undefined}
              aria-label={item.label}
              className={`relative flex min-h-[48px] min-w-[48px] flex-1 flex-col items-center justify-center rounded-2xl p-2.5 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b9e5c9] ${active ? 'text-[#eaf5e9]' : 'text-[#aab9af] hover:text-[#eaf5e9]'}`}
            >
              {active && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-0 -z-10 rounded-2xl bg-[#344c3e]"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <item.icon size={22} strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
              <span className="mt-1 text-[11px] font-medium tracking-wide">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
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
