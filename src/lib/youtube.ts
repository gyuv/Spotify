// "Motion" mode: finds the official music video on YouTube and plays it muted, through YouTube's
// official embedded player, synced to the Spotify audio. Audio always comes from Spotify.
import { useStore } from './store';

// The YouTube key stays on the server (api/yt.js). Web uses same-origin /api; native apps set
// VITE_API_BASE to the deployed site, e.g. https://ry-music.vercel.app.
const API = ((import.meta.env.VITE_API_BASE as string | undefined) ?? '').replace(/\/$/, '');

/** Asks the server whether Motion mode is configured; shows the video button only if so. */
export async function initYouTube() {
  try {
    const r = await fetch(`${API}/api/yt?ping=1`);
    if (r.ok) useStore.getState().set({ ytEnabled: Boolean((await r.json()).enabled) });
  } catch {
    /* no API (e.g. local dev without vercel) → Motion stays hidden */
  }
}

const cache = new Map<string, string | null>();

export async function findVideo(title: string, artist: string): Promise<string | null> {
  const k = `${artist}|${title}`;
  if (cache.has(k)) return cache.get(k)!;
  try {
    const r = await fetch(`${API}/api/yt?${new URLSearchParams({ q: `${artist} ${title}` })}`);
    const id = r.ok ? (((await r.json()).videoId as string | null) ?? null) : null;
    cache.set(k, id);
    return id;
  } catch {
    return null;
  }
}

type YTPlayer = {
  loadVideoById: (o: { videoId: string; startSeconds?: number }) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (s: number, allow: boolean) => void;
  getCurrentTime: () => number;
  mute: () => void;
  destroy: () => void;
};
declare global {
  interface Window {
    YT?: { Player: new (el: HTMLElement, o: object) => YTPlayer };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ready: Promise<void> | null = null;
export function loadYT() {
  ready ??= new Promise((res) => {
    if (window.YT?.Player) return res();
    window.onYouTubeIframeAPIReady = () => res();
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
  });
  return ready;
}

export async function createPlayer(el: HTMLElement): Promise<YTPlayer> {
  await loadYT();
  return new Promise((res) => {
    const p: YTPlayer = new window.YT!.Player(el, {
      playerVars: { controls: 0, modestbranding: 1, rel: 0, playsinline: 1, mute: 1, iv_load_policy: 3 },
      events: { onReady: () => (p.mute(), res(p)) },
    });
  });
}
