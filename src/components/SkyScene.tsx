import { useId } from 'react';

export type DayPart = 'morning' | 'day' | 'evening' | 'night';

/** Morning 5–11, day 11–17, evening 17–22, night 22–5. */
export function dayPartAt(date: Date): DayPart {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'day';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

const SKIES: Record<DayPart, { top: string; middle: string; horizon: string; far: string; near: string }> = {
  morning: { top: '#1d2a55', middle: '#4a5a8f', horizon: '#e8b894', far: '#2a3566', near: '#18213f' },
  day: { top: '#1f3a6b', middle: '#3f6a9e', horizon: '#9cc0dc', far: '#26406e', near: '#162447' },
  evening: { top: '#141b3d', middle: '#3b3270', horizon: '#e39a72', far: '#262356', near: '#141a38' },
  night: { top: '#0d1430', middle: '#121b3d', horizon: '#1e2a55', far: '#151f45', near: '#0f1734' },
};

const STARS = [
  [34, 22, 1.2, 0],
  [72, 48, 0.9, 1.4],
  [118, 16, 1.4, 0.6],
  [160, 40, 1, 2.1],
  [214, 24, 1.2, 1],
  [258, 58, 0.9, 2.6],
  [300, 14, 1.3, 0.3],
  [340, 44, 1, 1.8],
  [372, 26, 0.9, 2.3],
  [20, 70, 0.8, 1.1],
] as const;

/**
 * The quiet landscape at the top of "Start", drawn in code so it is sharp on
 * every screen and needs no download. It follows the time of day: stars and a
 * crescent at night, a low sun in the morning and evening, slow clouds by day.
 * The lower edge fades into the page. Decorative, so hidden from screen
 * readers; the motion stops with "reduce motion".
 */
export function SkyScene({ part }: { part: DayPart }) {
  const id = useId().replace(/:/g, '');
  const sky = SKIES[part];
  const starry = part === 'night' || part === 'evening';

  return (
    <svg
      viewBox="0 0 390 210"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`sky-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky.top} />
          <stop offset="0.55" stopColor={sky.middle} />
          <stop offset="0.85" stopColor={sky.horizon} />
        </linearGradient>
        <linearGradient id={`fade-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b1020" stopOpacity="0" />
          <stop offset="0.8" stopColor="#0b1020" />
        </linearGradient>
        <radialGradient id={`glow-${id}`}>
          <stop offset="0" stopColor="#fff3d6" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff3d6" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="390" height="210" fill={`url(#sky-${id})`} />

      {starry &&
        STARS.slice(0, part === 'night' ? STARS.length : 5).map(([x, y, r, delay]) => (
          <circle
            key={`${x}-${y}`}
            cx={x}
            cy={y}
            r={r}
            fill="#dbe3ff"
            style={{ animation: `twinkle 3.6s ease-in-out ${delay}s infinite` }}
          />
        ))}

      {part === 'night' && (
        <g style={{ animation: 'float 7s ease-in-out infinite' }}>
          <circle cx="306" cy="56" r="34" fill={`url(#glow-${id})`} />
          <circle cx="306" cy="56" r="17" fill="#f4e7c3" />
          <circle cx="313" cy="50" r="15" fill={sky.middle} />
        </g>
      )}

      {part !== 'night' && (
        <g style={{ animation: 'float 8s ease-in-out infinite' }}>
          <circle cx="300" cy={part === 'day' ? 50 : 112} r="44" fill={`url(#glow-${id})`} />
          <circle
            cx="300"
            cy={part === 'day' ? 50 : 112}
            r="19"
            fill={part === 'day' ? '#fff1c9' : part === 'morning' ? '#f8c98f' : '#f2a46f'}
          />
        </g>
      )}

      {part === 'day' && (
        <g opacity="0.55" style={{ animation: 'drift 70s linear infinite' }}>
          <ellipse cx="40" cy="44" rx="34" ry="8" fill="#dfe9f5" />
          <ellipse cx="62" cy="38" rx="20" ry="8" fill="#dfe9f5" />
        </g>
      )}

      <path d="M0 128 C70 102 130 116 190 124 C250 132 300 108 390 116 L390 210 L0 210 Z" fill={sky.far} />
      <path d="M0 150 C80 132 150 154 220 146 C280 140 330 144 390 138 L390 210 L0 210 Z" fill={sky.near} />
      <rect y="110" width="390" height="101" fill={`url(#fade-${id})`} />
    </svg>
  );
}
