// Audius: a free, open music network where artists publish tracks for anyone to stream, with no ads
// and no account. Tracks play through a plain <audio> element using Audius's public API, and take
// over the player (like free mode does) until you play something from Spotify again.
import type { Device, PlaybackState, Track } from './api';
import { freeTransport, remember, setFreeTransport, type Transport } from './mode';
import { useStore } from './store';

const API = 'https://api.audius.co/v1';
const APP = 'app_name=RYMusic';

type ATrack = {
  id: string;
  title: string;
  duration: number;
  artwork?: Record<string, string> | null;
  user: { id: string; name: string };
};

const DEVICE: Device = { id: 'ry-audius', name: 'RY Music · Audius', type: 'Computer', is_active: true, volume_percent: 100, supports_volume: true };

export const isAudius = (uri?: string | null) => Boolean(uri?.startsWith('audius:'));

export function toTrack(a: ATrack): Track {
  const img = a.artwork?.['480x480'] ?? a.artwork?.['150x150'] ?? '';
  const artist = { id: a.user.id, name: a.user.name, uri: `audius:user:${a.user.id}` };
  return {
    id: `audius-${a.id}`,
    name: a.title,
    uri: `audius:track:${a.id}`,
    duration_ms: a.duration * 1000,
    explicit: false,
    artists: [artist],
    album: { id: `audius-${a.id}`, name: 'Audius', uri: '', artists: [artist], images: img ? [{ url: img, width: 480, height: 480 }] : [] },
  };
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}${path.includes('?') ? '&' : '?'}${APP}`);
  if (!res.ok) throw new Error(`Audius: HTTP ${res.status}`);
  return ((await res.json()) as { data: T }).data;
}

export const Audius = {
  search: async (q: string) => (await get<ATrack[]>(`/tracks/search?query=${encodeURIComponent(q)}`)).map(toTrack),
  trending: async () => (await get<ATrack[]>('/tracks/trending?time=week')).slice(0, 30).map(toTrack),
};

const streamUrl = (t: Track) => `${API}/tracks/${t.uri.split(':')[2]}/stream?${APP}`;

let audio: HTMLAudioElement | null = null;
let queue: Track[] = [];
let index = 0;
let repeat: PlaybackState['repeat_state'] = 'off';
let shuffle = false;
let previous: Transport | null = null;
let active = false;

function state(): PlaybackState | undefined {
  const t = queue[index];
  if (!t || !audio) return undefined;
  return {
    is_playing: !audio.paused,
    progress_ms: audio.currentTime * 1000,
    shuffle_state: shuffle,
    repeat_state: repeat,
    item: audio.duration ? { ...t, duration_ms: audio.duration * 1000 } : t,
    device: DEVICE,
    context: null,
  };
}

function publish() {
  const pb = state() ?? null;
  useStore.getState().set({ playback: pb, position: pb?.progress_ms ?? 0 });
}

function el() {
  if (audio) return audio;
  audio = new Audio();
  audio.preload = 'auto';
  for (const ev of ['play', 'pause', 'seeked', 'loadedmetadata']) audio.addEventListener(ev, publish);
  audio.addEventListener('ended', () => advance(1));
  audio.addEventListener('error', () => useStore.getState().notify('This Audius track could not be streamed'));
  return audio;
}

function load(i: number) {
  index = Math.max(0, Math.min(queue.length - 1, i));
  const a = el();
  a.src = streamUrl(queue[index]);
  a.play().catch(() => {});
  publish();
}

function advance(dir: 1 | -1) {
  if (repeat === 'track' && dir === 1) return load(index);
  let i = index + dir;
  if (i >= queue.length) {
    if (repeat !== 'context') return publish();
    i = 0;
  }
  load(Math.max(0, i));
}

const transport: Transport = {
  playback: async () => state(),
  devices: async () => ({ devices: [DEVICE] }),
  queue: async () => ({ currently_playing: queue[index] ?? null, queue: queue.slice(index + 1) }),
  play: async (opts: { uris?: string[] } = {}) => {
    if (opts.uris?.length) throw new Error('Spotify item'); // handled by stopAudius() before this
    await el().play().catch(() => {});
    publish();
  },
  pause: async () => (el().pause(), publish()),
  next: async () => advance(1),
  prev: async () => (el().currentTime > 3 ? ((el().currentTime = 0), publish()) : advance(-1)),
  seek: async (ms: number) => ((el().currentTime = ms / 1000), publish()),
  volume: async (pct: number) => ((el().volume = Math.max(0, Math.min(1, pct / 100))), publish()),
  shuffle: async (on: boolean) => {
    shuffle = on;
    if (on) queue = [...queue.slice(0, index + 1), ...queue.slice(index + 1).sort(() => Math.random() - 0.5)];
    publish();
  },
  repeat: async (s: PlaybackState['repeat_state']) => ((repeat = s), publish()),
  enqueue: async (uri: string) => {
    if (!isAudius(uri)) throw new Error('Only Audius tracks can be queued while Audius is playing');
  },
  transfer: async () => useStore.getState().notify('Audius plays right here in RY Music'),
};

/** Plays Audius tracks, pausing whatever Spotify was playing. */
export async function playAudius(tracks: Track[], start = 0) {
  if (!active) {
    previous = freeTransport;
    // Pause Spotify (embed player or Connect device) before taking over.
    const { Spotify } = await import('./api');
    await Spotify.pause().catch(() => {});
    setFreeTransport(transport);
    active = true;
  }
  remember(tracks);
  queue = tracks;
  load(start);
}

/** Hands the player back to Spotify. Called before any Spotify playback starts. */
export function stopAudius() {
  if (!active) return;
  audio?.pause();
  active = false;
  setFreeTransport(previous);
  previous = null;
}
