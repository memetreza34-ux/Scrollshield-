import React from 'react';
import { Shield } from 'lucide-react';
import type { PlatformDefinition } from '../types';
import { MessageKey, t } from '../i18n';
import { AppTile, StatusChip } from './ui';
import { FOCUS_RING, PRESSED } from './styles';

/**
 * The interruption over a protected app (docs/V1_MASTER_PLAN.md, 4.7): app,
 * reason in one sentence, countdown if a pause runs, and "Zurück" always
 * there and highlighted. In the browser this is the preview of the native
 * screen, built from the same canvas.
 */
export function InterruptionScreen({
  app,
  chip,
  tone,
  title,
  text,
  children,
  footer,
}: {
  app: PlatformDefinition;
  chip: string;
  tone: 'accent' | 'pause' | 'lock';
  title: string;
  text?: string;
  children?: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col overflow-y-auto bg-ground text-ink">
      <div className="flex h-14 flex-shrink-0 items-center gap-2 px-4 text-label-s text-muted">
        <Shield size={16} strokeWidth={2} aria-hidden="true" />
        {t('app.name')}
      </div>
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <AppTile app={app} size="lg" />
        <StatusChip tone={tone}>{chip}</StatusChip>
        <h1 className="text-[1.5rem] font-semibold leading-8 tracking-[-0.01em] text-ink">{title}</h1>
        {text && <p className="text-body text-muted">{text}</p>}
        {children}
      </main>
      <footer className="flex flex-shrink-0 flex-col gap-3 px-4 pb-8 pt-4">{footer}</footer>
    </div>
  );
}

/** "Zurück": 56 high, green, always available. */
export function BackAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex min-h-14 w-full items-center justify-center rounded-control bg-accent px-4 text-[1rem] font-semibold leading-5 text-ground ${PRESSED} ${FOCUS_RING}`}
    >
      {label}
    </button>
  );
}

/** "Weiter": only after the pause, missing during a lock. */
export function ContinueAction({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-12 w-full items-center justify-center rounded-control border border-line bg-raised px-4 text-label text-ink disabled:opacity-[0.38] ${PRESSED} ${FOCUS_RING}`}
    >
      {label}
    </button>
  );
}

/** The emergency unlock is a small text link under "Zurück", never a button that competes with it. */
export function EmergencyLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mx-auto min-h-11 px-3 text-body-s font-medium text-ink underline underline-offset-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {t('interrupt.emergency')}
    </button>
  );
}

/** Seconds of a pause, large and calm: no ring that fills, no pulsing. */
export function Countdown({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="mt-4 flex flex-col items-center gap-1">
      <span role="timer" className="text-display text-ink">
        {value}
      </span>
      <span className="text-body-s text-muted">{label}</span>
    </div>
  );
}

const STAGES: MessageKey[] = ['interrupt.stage.pause', 'interrupt.stage.longer', 'interrupt.stage.cooldown'];

/** Where the reopen protection stands: pause, longer pause, cooldown (docs/V1_MASTER_PLAN.md, 7). */
export function ReopenStages({ stage }: { stage: 1 | 2 | 3 }) {
  return (
    <div
      role="img"
      aria-label={t('interrupt.stage.label', { stage, name: t(STAGES[stage - 1]) })}
      className="mt-4 grid w-full grid-cols-3 gap-1 text-left"
    >
      {STAGES.map((key, index) => (
        <span key={key} className="flex flex-col gap-1.5">
          <span className={`h-1 rounded-full ${index < stage ? 'bg-pause' : 'bg-line'}`} />
          <span className={`text-caption ${index === stage - 1 ? 'font-semibold text-ink' : 'font-medium text-muted'}`}>
            {t(key)}
          </span>
        </span>
      ))}
    </div>
  );
}
