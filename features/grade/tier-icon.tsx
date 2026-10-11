import { useId, type CSSProperties } from 'react';
import { tierById, type TierId } from '@/lib/grades/model';
import styles from './tier-icon.module.css';

type Look = {
  /** Face gradient stops, light to dark, and the emblem color. */
  colors: [string, string, string];
  emblem: string;
  /** Outer frame and border points metal, light to dark (frame 2 and up). */
  rim?: [string, string];
  /** Accent for the inner bevel and the gems on the points. */
  accent: string;
  /**
   * How much the border carries the rank: 0 one metal frame, 1 with a strong inner bevel,
   * 2 inside an outer metal frame, 3 plus a top point and flared corners, 4 plus side and
   * bottom points.
   */
  frame: 0 | 1 | 2 | 3 | 4;
  /** A light sweeps across the badge (diamond and up). */
  shine?: boolean;
  /** A soft pulsing glow (challenger). */
  glow?: boolean;
};

/**
 * Original badges (not taken from any game): one shield shape with the lunch emblem, a rice bowl
 * with chopsticks; higher tiers get a richer border rather than extra ornaments. The colors
 * follow the familiar tier metals: dark iron, copper, steel, gold with green, teal platinum,
 * blue-violet diamond, purple master, black and red grandmaster, gold and blue challenger.
 */
const LOOKS: Record<TierId, Look> = {
  iron: {
    colors: ['#8f8782', '#5c5450', '#2f2a27'],
    emblem: '#e2dcd7',
    accent: '#b9b0a9',
    frame: 0,
  },
  bronze: {
    colors: ['#d9a275', '#93603d', '#4d2f1d'],
    emblem: '#fbe6d4',
    accent: '#f0c39c',
    frame: 0,
  },
  silver: {
    colors: ['#e3ebf0', '#95a6b1', '#4a5963'],
    emblem: '#ffffff',
    accent: '#ffffff',
    frame: 1,
  },
  gold: {
    colors: ['#fbe3a0', '#d4a43a', '#7a5514'],
    emblem: '#fff8e2',
    rim: ['#fff1b8', '#a8730e'],
    accent: '#4cc47a',
    frame: 2,
  },
  platinum: {
    colors: ['#b8e0da', '#4f9a92', '#1f4a46'],
    emblem: '#effffc',
    rim: ['#d8efec', '#3e6f6a'],
    accent: '#43e08f',
    frame: 2,
  },
  diamond: {
    colors: ['#c4c8ff', '#5d62d9', '#272a7c'],
    emblem: '#f2f3ff',
    rim: ['#dfe2ff', '#4b4f9e'],
    accent: '#8fb4ff',
    frame: 3,
    shine: true,
  },
  master: {
    colors: ['#eab3ff', '#9a3fd0', '#47136b'],
    emblem: '#fbefff',
    rim: ['#f3d6ff', '#6e2c9a'],
    accent: '#ff6ce6',
    frame: 3,
    shine: true,
  },
  grandmaster: {
    colors: ['#8c7f84', '#45393d', '#1c1315'],
    emblem: '#ffe9e9',
    rim: ['#b8adb1', '#2a2023'],
    accent: '#ff3b3b',
    frame: 4,
    shine: true,
  },
  challenger: {
    colors: ['#fff3cf', '#dcb662', '#8a6420'],
    emblem: '#fffdf4',
    rim: ['#fff6d6', '#a87a1c'],
    accent: '#3fbaff',
    frame: 4,
    shine: true,
    glow: true,
  },
};

/** The badge: a shield with cut top corners. */
const SHIELD = 'M21 9h22l9 9v19c0 10-9 16-20 20c-11-4-20-10-20-20V18Z';
const scaled = (factor: number) => `translate(32 33) scale(${factor}) translate(-32 -33)`;
// Border points, left side and center; the right side mirrors the left.
const TOP_POINT = 'M32 0l5 6h-10Z';
const CORNER_FLARE = 'M15 12l-6-7l9 3Z';
const SIDE_POINT = 'M9 29l-6 4l6 4Z';
const BOTTOM_POINT = 'M32 64l-4-5h8Z';

/** A tier's light, middle and dark colors as CSS variables, for the badge, ring and dialogs. */
export function tierColorVars(tier: TierId) {
  const [light, mid, dark] = LOOKS[tier].colors;
  return { '--tier-light': light, '--tier-mid': mid, '--tier-dark': dark } as CSSProperties;
}

export default function TierIcon({ tier, size = 64 }: { tier: TierId; size?: number }) {
  const look = LOOKS[tier];
  const { name } = tierById(tier);
  const id = useId().replaceAll(':', '');
  const [light, mid, dark] = look.colors;
  const [rimLight, rimDark] = look.rim ?? [light, dark];
  const rim = `url(#${id}-rim)`;
  const mirrored = (d: string) => (
    <>
      <path d={d} />
      <path d={d} transform="translate(64 0) scale(-1 1)" />
    </>
  );
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={`${name} 등급`}
      className={styles.icon}
      data-glow={look.glow || undefined}
    >
      <defs>
        <linearGradient id={`${id}-face`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={light} />
          <stop offset="0.55" stopColor={mid} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={rimLight} />
          <stop offset="1" stopColor={rimDark} />
        </linearGradient>
        <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.75" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <path d={SHIELD} />
        </clipPath>
      </defs>
      {look.frame >= 3 && (
        <g fill={rim} stroke={rimDark} strokeWidth="0.8" strokeLinejoin="round">
          <path d={TOP_POINT} />
          {mirrored(CORNER_FLARE)}
          {look.frame >= 4 && (
            <>
              {mirrored(SIDE_POINT)}
              <path d={BOTTOM_POINT} />
            </>
          )}
        </g>
      )}
      {look.frame >= 2 && (
        <path
          d={SHIELD}
          transform={scaled(1.16)}
          fill={rim}
          stroke={rimDark}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      )}
      <path
        d={SHIELD}
        fill={`url(#${id}-face)`}
        stroke={dark}
        strokeWidth={look.frame >= 2 ? 1.6 : 2.6}
        strokeLinejoin="round"
      />
      {/* Inner bevel: a light edge that makes the face look raised (stronger from silver). */}
      <path
        d={SHIELD}
        transform={scaled(0.84)}
        fill="none"
        stroke={look.frame >= 2 ? look.accent : light}
        strokeOpacity={look.frame >= 1 ? 0.95 : 0.6}
        strokeWidth={look.frame >= 1 ? 1.6 : 1}
        strokeLinejoin="round"
      />
      {/* The lunch emblem: a rice bowl with chopsticks. */}
      <g strokeLinecap="round" strokeLinejoin="round">
        <path d="M36 21l-5 13M40 23l-7 11" stroke={look.emblem} strokeWidth="2" />
        <path
          d="M20 33h24c0 7-5 11-12 11s-12-4-12-11Z"
          fill={look.emblem}
          stroke={dark}
          strokeWidth="0.9"
        />
        <path d="M24 37h16" stroke={mid} strokeOpacity="0.5" strokeWidth="1" />
      </g>
      {/* Accent gems on the border points. */}
      {look.frame >= 3 && (
        <g fill={look.accent} stroke={rimDark} strokeWidth="0.5">
          <circle cx="32" cy="4.6" r="1.6" />
          {look.frame >= 4 && (
            <>
              <circle cx="6.4" cy="33" r="1.3" />
              <circle cx="57.6" cy="33" r="1.3" />
            </>
          )}
        </g>
      )}
      {look.shine && (
        <g clipPath={`url(#${id}-clip)`}>
          <g transform="rotate(20 32 33)">
            <rect
              className={styles.shine}
              x="-24"
              y="-8"
              width="18"
              height="80"
              fill={`url(#${id}-shine)`}
            />
          </g>
        </g>
      )}
    </svg>
  );
}
