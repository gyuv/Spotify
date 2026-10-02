import { create } from 'zustand';
import { Spotify, type PlaybackState, type Track } from './api';
import { remember } from './mode';

export type View =
  | { name: 'home' }
  | { name: 'search' }
  | { name: 'library' }
  | { name: 'stats' }
  | { name: 'party' }
  | { name: 'playlist'; id: string; title: string }
  | { name: 'artist'; id: string; title: string };

export type ThemeMode = 'gold' | 'dynamic' | 'amoled' | 'neon' | 'sunset';

type State = {
  playback: PlaybackState | null;
  /** Local estimate of position, advanced between polls for a smooth progress bar. */
  position: number;
  sdkDeviceId: string | null;
  liked: Record<string, boolean>;
  accent: [number, number, number];
  view: View;
  history: View[];
  nowPlayingOpen: boolean;
  paletteOpen: boolean;
  theme: ThemeMode;
  sleepAt: number | null;
  /** Crossfade length in seconds; 0 = off. */
  crossfade: number;
  /** True while a crossfade transition is running (drives the UI badge). */
  fading: boolean;
  lyricsSize: LyricsSize;
  /** Motion (music video) mode is configured on the server. */
  ytEnabled: boolean;
  /** Signed in with a free account: playback runs through Spotify's embed player (with Spotify's ads). */
  free: boolean;
  toast: string | null;
  set: (p: Partial<State>) => void;
  go: (v: View) => void;
  back: () => void;
  notify: (msg: string) => void;
};

export type LyricsSize = 's' | 'm' | 'l';

/** Per-device preferences in localStorage (wrapped: private mode can throw). */
export function pref<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(`ry.${key}`);
    return v === null ? fallback : (JSON.parse(v) as T);
  } catch {
    return fallback;
  }
}
export function savePref(key: string, value: unknown) {
  try {
    localStorage.setItem(`ry.${key}`, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

const savedTheme = pref<ThemeMode>('theme', 'gold');

export const useStore = create<State>((set, get) => ({
  playback: null,
  position: 0,
  sdkDeviceId: null,
  liked: {},
  accent: [245, 196, 81],
  view: { name: 'home' },
  history: [],
  nowPlayingOpen: false,
  paletteOpen: false,
  theme: savedTheme,
  sleepAt: null,
  crossfade: pref('crossfade', 6),
  fading: false,
  lyricsSize: pref<LyricsSize>('lyricsSize', 'm'),
  ytEnabled: false,
  free: false,
  toast: null,
  set: (p) => set(p),
  go: (v) => set({ history: [...get().history, get().view].slice(-30), view: v }),
  back: () => {
    const h = get().history;
    if (h.length) set({ view: h[h.length - 1], history: h.slice(0, -1) });
  },
  notify: (msg) => {
    set({ toast: msg });
    setTimeout(() => get().toast === msg && set({ toast: null }), 2600);
  },
}));

/** Runs a playback action with optimistic UI and friendly errors. */
export async function act(fn: () => Promise<unknown>, optimistic?: Partial<PlaybackState>) {
  const { playback, set, notify } = useStore.getState();
  if (optimistic && playback) set({ playback: { ...playback, ...optimistic } });
  try {
    await fn();
    setTimeout(refresh, 350);
  } catch (e) {
    const msg = (e as Error).message;
    notify(/NO_ACTIVE_DEVICE|No active device/i.test(msg) ? 'Pick a device first — tap the speaker icon' : msg);
    refresh();
  }
}

export async function refresh() {
  try {
    const pb = (await Spotify.playback()) ?? null;
    const { liked, set } = useStore.getState();
    set({ playback: pb, position: pb?.progress_ms ?? 0 });
    const id = pb?.item?.id;
    if (id && !(id in liked)) {
      const [saved] = await Spotify.isSaved([id]);
      set({ liked: { ...useStore.getState().liked, [id]: saved } });
    }
  } catch {
    /* transient; next poll retries */
  }
}

export async function toggleLike(t: Track) {
  const { liked, set, notify } = useStore.getState();
  const now = !liked[t.id];
  set({ liked: { ...liked, [t.id]: now } });
  if ('vibrate' in navigator) navigator.vibrate?.(12);
  try {
    await (now ? Spotify.save(t.id) : Spotify.unsave(t.id));
    notify(now ? 'Added to Liked Songs' : 'Removed from Liked Songs');
  } catch (e) {
    set({ liked: { ...useStore.getState().liked, [t.id]: !now } });
    notify((e as Error).message);
  }
}

export function playTracks(tracks: Track[], start = 0) {
  remember(tracks);
  const { sdkDeviceId, playback } = useStore.getState();
  const device = playback?.device?.id ? undefined : sdkDeviceId ?? undefined;
  return act(() => Spotify.play({ uris: tracks.slice(start, start + 100).map((t) => t.uri) }, device));
}

export function playContext(uri: string, offset?: number | string) {
  const { sdkDeviceId, playback } = useStore.getState();
  const device = playback?.device?.id ? undefined : sdkDeviceId ?? undefined;
  const off = offset === undefined ? {} : { offset: typeof offset === 'string' ? { uri: offset } : { position: offset } };
  return act(() => Spotify.play({ context_uri: uri, ...off }, device));
}
