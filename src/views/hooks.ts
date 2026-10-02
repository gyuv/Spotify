import { useEffect, useState } from 'react';

/** Tiny async loader with per-key in-memory cache so switching tabs feels instant. */
const cache = new Map<string, unknown>();
export function useLoad<T>(key: string, fn: () => Promise<T>): { data: T | undefined; error: string | null } {
  const [data, setData] = useState<T | undefined>(cache.get(key) as T | undefined);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setData(cache.get(key) as T | undefined);
    setError(null);
    fn()
      .then((d) => {
        cache.set(key, d);
        live && setData(d);
      })
      .catch((e) => live && setError((e as Error).message));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { data, error };
}
