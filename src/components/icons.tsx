import type { SVGProps } from 'react';

const p = {
  play: 'M8 5.5v13l11-6.5z',
  pause: 'M7 5h4v14H7zM13 5h4v14h-4z',
  next: 'M6 6l8.5 6L6 18zM16 6h2v12h-2z',
  prev: 'M18 6l-8.5 6L18 18zM6 6h2v12H6z',
  shuffle: 'M4 7h3c4 0 6 10 10 10h3M17 14l3 3-3 3M4 17h3c1.6 0 2.8-1.6 3.8-3.6M13.2 9.6C14.2 8 15.4 7 17 7h3M17 4l3 3-3 3',
  repeat: 'M4 11V9a3 3 0 0 1 3-3h12l-3-3M20 13v2a3 3 0 0 1-3 3H5l3 3',
  heart: 'M12 20s-7-4.4-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.6-9 9-9 9z',
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  library: 'M5 4v16M10 4v16M15 4l5 16',
  stats: 'M5 20V10M12 20V4M19 20v-7',
  devices: 'M4 5h12v10H4zM8 19h4M18 9h2v10h-4',
  moon: 'M20 14A8 8 0 1 1 10 4a6.5 6.5 0 0 0 10 10z',
  queue: 'M4 6h12M4 11h12M4 16h7M17 14v6l4-3z',
  down: 'M6 9l6 6 6-6',
  back: 'M15 6l-6 6 6 6',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  bolt: 'M13 3L5 14h6l-1 7 8-11h-6z',
  palette: 'M12 3a9 9 0 1 0 0 18c1 0 1.5-.7 1.5-1.5 0-1.2-1-1.5-1-2.5 0-.8.7-1.5 1.5-1.5H17a4 4 0 0 0 4-4c0-4.7-4-8.5-9-8.5zM7.5 11h.01M10 7.5h.01M14.5 7.5h.01',
  volume: 'M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11',
  plus: 'M12 5v14M5 12h14',
  x: 'M6 6l12 12M18 6L6 18',
  party: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20a6 6 0 0 1 12 0M17 11a2.5 2.5 0 1 0 0-5M21 19a5 5 0 0 0-4-4.9',
  share: 'M12 15V3M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7',
  video: 'M3 6h12v12H3zM15 10l6-3v10l-6-3',
};

export type IconName = keyof typeof p;
const filled: IconName[] = ['play', 'pause', 'next', 'prev'];

export function Icon({ name, solid: s, size = 22, ...rest }: { name: IconName; solid?: boolean; size?: number } & Omit<SVGProps<SVGSVGElement>, "fill">) {
  const solid = s ?? filled.includes(name);
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={solid ? 'currentColor' : 'none'}
      stroke={solid && name !== 'heart' ? 'none' : 'currentColor'}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      <path d={p[name]} />
    </svg>
  );
}
