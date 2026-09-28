import { useEffect, useRef } from 'react';
import { Film } from 'lucide-react';

/**
 * Prominent disclosure in front of the accessibility settings. Google Play
 * requires it for apps that use the accessibility API without being an
 * accessibility tool: shown in the normal flow, stating what is read and what
 * happens with it, and ending in an explicit choice. Only "Zustimmen" leads to
 * the Android settings; closing the dialog in any other way is a no.
 */
export function AccessibilityDisclosure({ onAccept, onDecline }: { onAccept: () => void; onDecline: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="accessibility-disclosure-title"
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onDecline();
        }}
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6 text-left shadow-2xl focus:outline-none"
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
          <Film size={24} aria-hidden="true" />
        </div>
        <h2 id="accessibility-disclosure-title" className="mb-3 text-xl font-bold text-zinc-100">
          Bedienungshilfe für die Kurzvideo-Erkennung
        </h2>
        <p className="mb-4 text-sm leading-relaxed text-zinc-300">
          ScrollShield nutzt die Bedienungshilfe-Schnittstelle von Android, um zu erkennen, ob in einer von dir
          geschützten App gerade ein Kurzvideo-Feed wie Reels, Shorts oder TikTok offen ist, und um deine
          Wischbewegungen darin zu zählen. Nur so können deine Feed-Limits greifen.
        </p>
        <ul className="mb-4 space-y-3 text-sm leading-relaxed text-zinc-400">
          <li>
            <span className="font-semibold text-zinc-200">Was gelesen wird:</span> technische Kennungen der
            Bildschirmelemente und Scroll-Ereignisse. Ausgewertet werden nur Apps, die du in ScrollShield schützt.
          </li>
          <li>
            <span className="font-semibold text-zinc-200">Was nicht gelesen wird:</span> keine Texte, Nachrichten,
            Passwörter, Eingaben oder sonstigen Bildschirminhalte.
          </li>
          <li>
            <span className="font-semibold text-zinc-200">Was gespeichert wird:</span> die Zeit im Feed pro App und Tag
            und die letzten 20 Beobachtungen für die Diagnose – verschlüsselt und nur auf deinem Gerät. Nichts davon
            wird übertragen oder weitergegeben.
          </li>
          <li>
            <span className="font-semibold text-zinc-200">Was der Dienst auslöst:</span> nur „Zurück“, wenn du eine
            harte Unterbrechung eingestellt hast. Er tippt und wischt nie in anderen Apps.
          </li>
        </ul>
        <p className="mb-6 text-xs leading-relaxed text-zinc-500">
          Nach deiner Zustimmung öffnen sich die Android-Einstellungen. Wähle dort „ScrollShield Kurzvideo-Erkennung“.
          Du kannst den Dienst jederzeit wieder abschalten.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onDecline}
            className="min-h-[48px] flex-1 rounded-[1.25rem] border border-zinc-800 bg-zinc-900 py-3 text-sm font-semibold text-zinc-300"
          >
            Ablehnen
          </button>
          <button
            onClick={onAccept}
            className="min-h-[48px] flex-1 rounded-[1.25rem] bg-zinc-100 py-3 text-sm font-bold text-zinc-950"
          >
            Zustimmen
          </button>
        </div>
      </div>
    </div>
  );
}
