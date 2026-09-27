/**
 * Neutral stand-in for a platform's logo. The app used to embed the official
 * logos of Instagram, TikTok and the others; outside their brand guidelines
 * that invites trademark complaints and trouble in store review, above all on
 * screenshots. The platform name shown next to it identifies the app.
 */
export function PlatformBadge({ label }: { label: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-6 w-6 items-center justify-center text-[11px] font-black leading-none"
    >
      {label}
    </span>
  );
}
