import { useEffect, useState } from 'react';

export type Layout = 'mobile' | 'desktop' | 'tv';

function detect(): Layout {
  const forced = new URLSearchParams(location.search).get('layout');
  if (forced === 'tv' || forced === 'mobile' || forced === 'desktop') return forced;
  if (/RYMusicTV|Android TV|AFT|BRAVIA|SmartTV|GoogleTV|Tizen|Web0S/i.test(navigator.userAgent)) return 'tv';
  const coarse = matchMedia('(pointer: coarse)').matches;
  return innerWidth < 900 || (coarse && innerWidth < 1100) ? 'mobile' : 'desktop';
}

export function useLayout() {
  const [l, setL] = useState(detect);
  useEffect(() => {
    const on = () => setL(detect());
    addEventListener('resize', on);
    return () => removeEventListener('resize', on);
  }, []);
  return l;
}
