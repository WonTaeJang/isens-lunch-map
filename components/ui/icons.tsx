import type { ReactNode, SVGProps } from 'react';

export type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & { size?: number };

function Icon({ size = 24, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function MapIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m9 3 6 3 6-3v15l-6 3-6-3-6 3V6l6-3Z" />
      <path d="M9 3v15M15 6v15" />
    </Icon>
  );
}

export function TrophyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 3h8v5a4 4 0 0 1-8 0V3ZM8 5H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4M12 12v6m-4 3h8m-7 0v-3h6v3" />
    </Icon>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="7" r="3.5" />
      <path d="M5 20v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2" />
    </Icon>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m9.5 3-.6 2.2-1.4.8-2.2-.6-2.5 4.2 1.6 1.6v1.6l-1.6 1.6 2.5 4.2 2.2-.6 1.4.8.6 2.2h5l.6-2.2 1.4-.8 2.2.6 2.5-4.2-1.6-1.6v-1.6l1.6-1.6-2.5-4.2-2.2.6-1.4-.8-.6-2.2z" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  );
}

export function CalendarCheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="5" width="16" height="16" rx="3" />
      <path d="M8 3v4m8-4v4M4 11h16m-11 5 2 2 4-4" />
    </Icon>
  );
}

export function BookmarkIcon(props: IconProps) {
  return (
    <Icon
      viewBox="0 0 18 22"
      width={18}
      height={20}
      strokeWidth="1.6"
      strokeLinecap="butt"
      strokeLinejoin="miter"
      {...props}
    >
      <path d="M3 2h12v18l-6-4-6 4z" />
    </Icon>
  );
}

export function BowlChopsticksIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 12h18a9 7.5 0 0 1-18 0Z" />
      <path d="M9 21h6M11 12l7-9m-3 9 5.5-7" />
    </Icon>
  );
}

export function DirectionsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m12 2 10 10-10 10L2 12 12 2Z" />
      <path d="M8 15v-4h8m-3-3 3 3-3 3" />
    </Icon>
  );
}

const THUMB_PATH =
  'M7 10H3v11h4V10Zm0 0 5-8a3 3 0 0 1 3 3l-1 5h5a2 2 0 0 1 2 2l-2 7a3 3 0 0 1-3 2H7';

export function ThumbsUpIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d={THUMB_PATH} />
    </Icon>
  );
}

export function ThumbsDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <g transform="rotate(180 12 12)">
        <path d={THUMB_PATH} />
      </g>
    </Icon>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m16 3 5 5L9 20l-6 1 1-6L16 3Zm-2 2 5 5" />
    </Icon>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" />
    </Icon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon viewBox="0 0 16 16" strokeWidth="2" {...props}>
      <path d="m3 8 3 3 7-7" />
    </Icon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon strokeWidth="2" {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </Icon>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Icon strokeWidth="2" {...props}>
      <path d="m15 18-6-6 6-6" />
    </Icon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Icon strokeWidth="2" {...props}>
      <path d="m9 18 6-6-6-6" />
    </Icon>
  );
}

export function CrosshairIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </Icon>
  );
}

export function DiceIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01" strokeWidth="3" />
    </Icon>
  );
}
