import type { ReactNode } from 'react';
import type { ChartType } from '../types';

const ICONS: Record<ChartType, ReactNode> = {
  bar: (
    <>
      <rect x="3" y="11" width="4.5" height="9" rx="1.2" />
      <rect x="9.8" y="5" width="4.5" height="15" rx="1.2" />
      <rect x="16.6" y="14" width="4.5" height="6" rx="1.2" />
    </>
  ),
  barHorizontal: (
    <>
      <rect x="3" y="4" width="16" height="4.5" rx="1.2" />
      <rect x="3" y="10.5" width="10" height="4.5" rx="1.2" />
      <rect x="3" y="17" width="13" height="4.5" rx="1.2" />
    </>
  ),
  line: (
    <path
      d="M3 16.5l5-5.5 4 3 4.5-7L21 9.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  area: (
    <>
      <path d="M3 18l5-6 4 3 4.5-7L21 11v7H3z" fill="currentColor" opacity="0.28" />
      <path
        d="M3 18l5-6 4 3 4.5-7L21 11"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  pie: (
    <>
      <path d="M12 2.5A9.5 9.5 0 1 0 21.5 12H12z" fill="currentColor" opacity="0.85" />
      <path d="M14.5 2.2A9.5 9.5 0 0 1 21.8 9.5H14.5z" fill="currentColor" opacity="0.45" />
    </>
  ),
  donut: (
    <>
      <circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" strokeWidth="4.4" opacity="0.28" />
      <path
        d="M12 4.5a7.5 7.5 0 0 1 7.5 7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="4.4"
        strokeLinecap="round"
      />
    </>
  ),
  scatter: (
    <>
      <circle cx="6.5" cy="16" r="1.9" />
      <circle cx="10.5" cy="9.5" r="1.9" />
      <circle cx="14.5" cy="13.5" r="1.9" />
      <circle cx="18" cy="6.5" r="1.9" />
      <circle cx="4.5" cy="7.5" r="1.9" />
      <circle cx="16.5" cy="19" r="1.9" />
    </>
  ),
};

interface Props {
  type: ChartType;
  size?: number;
}

export default function ChartIcon({ type, size = 18 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[type]}
    </svg>
  );
}
