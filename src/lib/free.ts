// Free mode: plays through Spotify's official embed player (iFrame API). Free listeners logged in
// to Spotify in this browser hear full songs with Spotify's normal ads; otherwise Spotify plays
// 30-second previews. RY Music keeps its own queue so the whole UI (progress, lyrics, visualizer,
// party sync) works on top. Nothing here blocks or skips ads.
import { Spotify, type Device, type PlaybackState, type Track } from './api';
import { knownTracks, remember, setFreeTransport } from './mode';
import { useStore } from './store';

type Controller = {
  loadUri: (uri: string) => void;
  play: () => void;
  togglePlay: () => void;
  resume: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  addListener: (ev: string, cb: (e: any) => void) => void;
};
declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: { createController: (el: HTMLElement, o: object, cb: (c: Controller) => void) => void }) => void;
  }
}

const DEVICE: Device = { id: 'ry-free', name: 'RY Music', type: 'Computer', is_active: true, volume_percent: null, supports_volume: false };

let ctl: Controller | null = null;
let queue: Track[] = [];
let index = 0;
let paused = true;
let position = 0;
let duration = 0;
let shuffle = false;
let repeat: PlaybackState['repeat_state'] = 'off';
let pendingPlay = false;
let pendingSeek: number | null = null;
let advancedFor = '';

const current = () => queue[index] ?? null;

function state(): PlaybackState | undefined {
  const t = current();
  if (!t) return undefined;
  return {
    is_playing: !paused,
    progress_ms: position,
    shuffle_state: shuffle,
    repeat_state: repeat,
    item: duration ? { ...t, duration_ms: duration } : t,
    device: DEVICE,
    context: null,
  };
}

function publish() {
  const pb = state() ?? null;
  useStore.getState().set({ playback: pb, position: pb?.progress_ms ?? 0 });
}

function load(i: number, startMs = 0) {
  index = Math.max(0, Math.min(queue.length - 1, i));
  const t = current();
  if (!t || !ctl) return;
  position = startMs;
  duration = 0;
  advancedFor = '';
  pendingPlay = true;
  pendingSeek = startMs > 1500 ? startMs : null;
  ctl.loadUri(t.uri);
  publish();
}

function advance(dir: 1 | -1) {
  if (repeat === 'track' && dir === 1) return load(index);
  let i = index + dir;
  if (i >= queue.length) {
    if (repeat !== 'context') {
      paused = true;
      return publish();
    }
    i = 0;
  }
  load(Math.max(0, i));
}

async function resolve(opts: { context_uri?: string; uris?: string[]; offset?: { uri: string } | { position: number } }) {
  let tracks: Track[] = [];
  const [, type, id] = (opts.context_uri ?? '').split(':');
  if (type === 'playlist') tracks = await Spotify.playlistTracks(id);
  else if (type === 'album') {
    const a = await Spotify.albumTracks(id);
    tracks = a.tracks.items.map((t) => ({ ...t, album: a }) as Track);
  } else if (type === 'artist') tracks = (await Spotify.artistTop(id)).tracks;
  else if (opts.uris)
    tracks = await Promise.all(opts.uris.map(async (u) => knownTracks.get(u) ?? Spotify.track(u.split(':')[2])));
  remember(tracks);
  let start = 0;
  if (opts.offset && 'uri' in opts.offset) start = Math.max(0, tracks.findIndex((t) => t.uri === (opts.offset as { uri: string }).uri));
  else if (opts.offset) start = opts.offset.position;
  return { tracks, start };
}

const transport = {
  playback: async () => state(),
  devices: async () => ({ devices: [DEVICE] }),
  queue: async () => ({ currently_playing: current(), queue: queue.slice(index + 1) }),
  play: async (opts: { context_uri?: string; uris?: string[]; offset?: { uri: string } | { position: number }; position_ms?: number } = {}) => {
    if (!opts.context_uri && !opts.uris) {
      ctl?.resume();
      paused = false;
      return publish();
    }
    const { tracks, start } = await resolve(opts);
    if (!tracks.length) throw new Error('Nothing playable here');
    queue = shuffle ? [tracks[start], ...tracks.filter((_, i) => i !== start).sort(() => Math.random() - 0.5)] : tracks;
    load(shuffle ? 0 : start, opts.position_ms ?? 0);
  },
  pause: async () => {
    ctl?.pause();
    paused = true;
    publish();
  },
  next: async () => advance(1),
  prev: async () => (position > 3000 ? transport.seek(0) : advance(-1)),
  seek: async (ms: number) => {
    ctl?.seek(ms / 1000);
    position = ms;
    publish();
  },
  volume: async () => useStore.getState().notify('Use your device volume in free mode'),
  shuffle: async (on: boolean) => {
    shuffle = on;
    if (on) queue = [...queue.slice(0, index + 1), ...queue.slice(index + 1).sort(() => Math.random() - 0.5)];
    publish();
  },
  repeat: async (s: PlaybackState['repeat_state']) => {
    repeat = s;
    publish();
  },
  enqueue: async (uri: string) => {
    const t = knownTracks.get(uri) ?? (await Spotify.track(uri.split(':')[2]));
    queue.splice(index + 1, 0, t);
  },
  transfer: async () => useStore.getState().notify('Free mode plays right here in RY Music'),
};

export function startFreeMode() {
  if (document.getElementById('ry-embed')) return;
  setFreeTransport(transport);
  useStore.getState().set({ free: true });
  const host = document.createElement('div');
  host.id = 'ry-embed';
  host.className = 'embed-dock';
  const el = document.createElement('div');
  host.appendChild(el);
  document.body.appendChild(host);

  window.onSpotifyIframeApiReady = (IFrameAPI) => {
    IFrameAPI.createController(el, { width: '100%', height: 80, uri: 'spotify:playlist:37i9dQZF1DXcBWIGoYBM5M' }, (c) => {
      ctl = c;
      c.addListener('ready', () => {
        if (!pendingPlay) return;
        pendingPlay = false;
        c.play();
        paused = false;
        if (pendingSeek) {
          const s = pendingSeek;
          pendingSeek = null;
          setTimeout(() => c.seek(s / 1000), 600);
        }
        publish();
      });
      c.addListener('playback_update', (e) => {
        const d = e.data ?? {};
        paused = Boolean(d.isPaused);
        position = d.position ?? position;
        if (d.duration) duration = d.duration;
        publish();
        const t = current();
        // Auto-advance through RY Music's queue when a song (or Spotify's 30 s preview) ends.
        if (t && duration && !d.isBuffering && position >= duration - 400 && advancedFor !== t.uri) {
          advancedFor = t.uri;
          setTimeout(() => advance(1), 300);
        }
      });
    });
  };
  const s = document.createElement('script');
  s.src = 'https://open.spotify.com/embed/iframe-api/v1';
  s.async = true;
  document.body.appendChild(s);
}
