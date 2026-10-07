import { useAppIcon } from '../lib/appIcons';

/**
 * The icon in a platform's tile. ScrollShield ships no third-party logos:
 * outside their brand guidelines that invites trademark complaints and
 * trouble in store review. In the Android app the tile shows the icon the
 * user's own launcher shows for the installed app; everywhere else, and for
 * apps that are not installed, neutral initials. The platform name next to
 * the tile identifies the app either way.
 */
export function PlatformBadge({ label, packages = [] }: { label: string; packages?: string[] }) {
  const icon = useAppIcon(packages);

  if (icon) {
    // Fills the tile and takes its rounded corners, covering the tile colour.
    return (
      <img
        src={icon}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="h-full w-full rounded-[inherit] bg-zinc-900 object-cover"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="inline-flex h-6 w-6 items-center justify-center text-[11px] font-black leading-none"
    >
      {label}
    </span>
  );
}
