// Time-synced lyrics from LRCLIB (https://lrclib.net), a free, open lyrics database with no API key.
// Set VITE_LYRICS_URL to point at a self-hosted LRCLIB instance instead.
import type { Track } from './api';

const BASE = ((import.meta.env.VITE_LYRICS_URL as string | undefined) ?? 'https://lrclib.net').replace(/\/$/, '');

export type Line = { t: number; text: string };
export type Lyrics =
  | { kind: 'synced'; lines: Line[] }
  | { kind: 'plain'; text: string }
  | { kind: 'instrumental' }
  | { kind: 'none' };

type LrclibRecord = {
  duration?: number;
  instrumental?: boolean;
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
};

/** Parses LRC text. Handles several timestamps per line and the [offset:±ms] tag. */
export function parseLRC(lrc: string): Line[] {
  let offset = 0;
  const out: Line[] = [];
  for (const raw of lrc.split(/\r?\n/)) {
    const off = raw.match(/^\[offset:\s*([+-]?\d+)\s*\]/i);
    if (off) {
      offset = Number(off[1]);
      continue;
    }
    const stamps = [...raw.matchAll(/\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g)];
    if (!stamps.length) continue;
    const text = raw.replace(/\[[^\]]*\]/g, '').trim();
    for (const m of stamps) {
      const frac = m[3] ? Number(m[3].padEnd(3, '0')) : 0;
      // LRC's offset tag shifts lyrics earlier when positive.
      out.push({ t: Math.max(0, Number(m[1]) * 60000 + Number(m[2]) * 1000 + frac - offset), text });
    }
  }
  return out.sort((a, b) => a.t - b.t);
}

/** Index of the line being sung at `ms` (-1 before the first line). Binary search. */
export function lineAt(lines: Line[], ms: number) {
  let lo = 0;
  let hi = lines.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].t <= ms) {
      ans = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans;
}

/** "Song - Remastered 2011" / "Song (feat. X)" → "Song", for the fuzzy search fallback. */
export const cleanTitle = (s: string) =>
  s
    .replace(/\s+-\s+.*$/, '')
    .replace(/\s*[([](feat|ft|with|from|remaster|live|radio edit|mono|stereo)[^)\]]*[)\]]/gi, '')
    .trim();

function toLyrics(r: LrclibRecord | null | undefined): Lyrics | null {
  if (!r) return null;
  if (r.syncedLyrics) {
    const lines = parseLRC(r.syncedLyrics);
    if (lines.length) return { kind: 'synced', lines };
  }
  if (r.instrumental) return { kind: 'instrumental' };
  if (r.plainLyrics?.trim()) return { kind: 'plain', text: r.plainLyrics.trim() };
  return null;
}

const cache = new Map<string, Promise<Lyrics>>();

export function getLyrics(t: Track): Promise<Lyrics> {
  let p = cache.get(t.id);
  if (!p) {
    p = load(t).catch(() => ({ kind: 'none' }) as Lyrics);
    cache.set(t.id, p);
    // Do not pin failures forever (network blips): drop them after a minute.
    p.then((l) => l.kind === 'none' && setTimeout(() => cache.delete(t.id), 60000));
  }
  return p;
}

async function load(t: Track): Promise<Lyrics> {
  const artist = t.artists[0]?.name ?? '';
  const exact = new URLSearchParams({
    track_name: t.name,
    artist_name: artist,
    album_name: t.album?.name ?? '',
    duration: String(Math.round(t.duration_ms / 1000)),
  });
  const r = await fetch(`${BASE}/api/get?${exact}`);
  if (r.ok) {
    const hit = toLyrics(await r.json());
    if (hit) return hit;
  }
  // Fuzzy fallback: search and prefer synced results whose length matches.
  const q = new URLSearchParams({ track_name: cleanTitle(t.name), artist_name: artist });
  const s = await fetch(`${BASE}/api/search?${q}`);
  if (!s.ok) return { kind: 'none' };
  const list = ((await s.json()) as LrclibRecord[]).filter((x) => Math.abs((x.duration ?? 0) - t.duration_ms / 1000) < 6);
  const best = list.find((x) => x.syncedLyrics) ?? list.find((x) => x.plainLyrics || x.instrumental);
  return toLyrics(best) ?? { kind: 'none' };
}
