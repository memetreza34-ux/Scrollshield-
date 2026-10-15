import { useEffect, useRef } from 'react';
import { Check, SquarePlay, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { MessageKey, t } from '../i18n';
import { SecondaryButton } from './ui';

const SEES: MessageKey[] = ['accessibility.sees.feed', 'accessibility.sees.swipes'];
const DOES_NOT_SEE: MessageKey[] = [
  'accessibility.notSees.text',
  'accessibility.notSees.media',
  'accessibility.notSees.leaves',
];

function Points({ title, items, icon: Icon }: { title: MessageKey; items: MessageKey[]; icon: LucideIcon }) {
  return (
    <section className="mt-6">
      <h3 className="text-label-s text-muted">{t(title)}</h3>
      <ul className="mt-2 flex flex-col gap-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-3 text-body text-ink">
            <Icon size={20} strokeWidth={2} className="mt-0.5 flex-shrink-0 text-muted" aria-hidden="true" />
            {t(item)}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Prominent disclosure in front of the accessibility settings. Google Play
 * requires it for apps that use the accessibility API without being an
 * accessibility tool: shown in the normal flow, stating what is read and what
 * happens with it, and ending in a real choice – both buttons the same size,
 * shape and colour. Only agreeing leads to the Android settings; closing it in
 * any other way is a no.
 */
export function AccessibilityDisclosure({ onAccept, onDecline }: { onAccept: () => void; onDecline: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="accessibility-disclosure-title"
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onDecline();
      }}
      className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-ground text-left focus:outline-none"
    >
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-6 pt-10">
        <span className="flex h-12 w-12 items-center justify-center rounded-control border border-line bg-surface">
          <SquarePlay size={24} strokeWidth={1.75} className="text-ink" aria-hidden="true" />
        </span>
        <h2 id="accessibility-disclosure-title" className="mt-6 text-headline text-ink">
          {t('accessibility.title')}
        </h2>
        <p className="mt-2 text-body text-muted">{t('accessibility.intro')}</p>

        <Points title="accessibility.sees" items={SEES} icon={Check} />
        <Points title="accessibility.notSees" items={DOES_NOT_SEE} icon={X} />

        <div className="mt-6 flex flex-col gap-2 text-body-s text-muted">
          <p>{t('accessibility.stored')}</p>
          <p>{t('accessibility.action')}</p>
          <p>{t('accessibility.footnote')}</p>
        </div>

        <div className="mt-auto flex flex-col gap-3 pt-8">
          <SecondaryButton onClick={onAccept}>{t('accessibility.accept')}</SecondaryButton>
          <SecondaryButton onClick={onDecline}>{t('accessibility.decline')}</SecondaryButton>
        </div>
      </div>
    </div>
  );
}
