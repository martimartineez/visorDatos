import { useEffect, useState } from 'react';

const QUERY = '(prefers-color-scheme: dark)';

export function usePrefersDark(): boolean {
  const [dark, setDark] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(QUERY).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(QUERY);
    const handler = (event: MediaQueryListEvent) => setDark(event.matches);
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  return dark;
}
