// Keeps playback state live: Web Playback SDK (desktop / TV browsers) + Connect polling (everywhere),
// a local position ticker, Media Session (lock screen / notification controls) and the sleep timer.
import { Spotify } from './api';
import { getToken } from './auth';
import { startCrossfade } from './crossfade';
import { initYouTube } from './youtube';
import { act, refresh, useStore } from './store';

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady?: () => void;
    Spotify?: { Player: new (o: { name: string; getOAuthToken: (cb: (t: string) => void) => void; volume?: number }) => SdkPlayer };
  }
}
type SdkPlayer = {
  connect: () => Promise<boolean>;
  addListener: (ev: string, cb: (arg: any) => void) => void;
  activateElement?: () => Promise<void>;
  setVolume: (v: number) => Promise<void>;
};

let sdk: SdkPlayer | null = null;
/** Instant local volume on the in-browser player (0..1). Used by crossfade for smooth ramps. */
export const sdkSetVolume = (v: number) => sdk?.setVolume(Math.min(1, Math.max(0, v))).catch(() => {});

const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

function loadSdk() {
  // Spotify's Web Playback SDK is desktop-browser only; on phones we act as a Connect remote instead.
  if (mobile || document.getElementById('spotify-sdk')) return;
  window.onSpotifyWebPlaybackSDKReady = () => {
    const player = new window.Spotify!.Player({
      name: 'RY Music',
      volume: 0.8,
      getOAuthToken: (cb) => getToken().then((t) => t && cb(t)),
    });
    player.addListener('ready', ({ device_id }) => useStore.getState().set({ sdkDeviceId: device_id }));
    player.addListener('player_state_changed', () => refresh());
    player.addListener('account_error', () => useStore.getState().notify('In-browser playback needs Spotify Premium'));
    player.connect();
    sdk = player;
    const unlock = () => player.activateElement?.();
    document.addEventListener('pointerdown', unlock, { once: true });
  };
  const s = document.createElement('script');
  s.id = 'spotify-sdk';
  s.src = 'https://sdk.scdn.co/spotify-player.js';
  document.body.appendChild(s);
}

function mediaSession() {
  if (!('mediaSession' in navigator)) return;
  const ms = navigator.mediaSession;
  ms.setActionHandler('play', () => act(() => Spotify.play(), { is_playing: true }));
  ms.setActionHandler('pause', () => act(() => Spotify.pause(), { is_playing: false }));
  ms.setActionHandler('nexttrack', () => act(Spotify.next));
  ms.setActionHandler('previoustrack', () => act(Spotify.prev));
  ms.setActionHandler('seekto', (d) => d.seekTime != null && act(() => Spotify.seek(d.seekTime! * 1000)));
  let last = '';
  useStore.subscribe((s) => {
    const t = s.playback?.item;
    if (!t || t.id === last) return;
    last = t.id;
    ms.metadata = new MediaMetadata({
      title: t.name,
      artist: t.artists.map((a) => a.name).join(', '),
      album: t.album.name,
      artwork: t.album.images.map((i) => ({ src: i.url, sizes: `${i.width}x${i.height}`, type: 'image/jpeg' })),
    });
  });
}

let started = false;

export function startEngine() {
  if (started) return;
  started = true;
  loadSdk();
  mediaSession();
  startCrossfade();
  initYouTube();
  refresh();
  let poll = window.setInterval(refresh, 3000);
  document.addEventListener('visibilitychange', () => {
    clearInterval(poll);
    poll = window.setInterval(refresh, document.hidden ? 15000 : 3000);
    if (!document.hidden) refresh();
  });
  // Smooth local progress between polls; also fires the sleep timer.
  let lastTick = performance.now();
  const tick = () => {
    const now = performance.now();
    const s = useStore.getState();
    const pb = s.playback;
    if (pb?.is_playing && pb.item) {
      const pos = Math.min(pb.item.duration_ms, s.position + (now - lastTick));
      s.set({ position: pos });
    }
    if (s.sleepAt && Date.now() >= s.sleepAt) {
      s.set({ sleepAt: null });
      act(() => Spotify.pause(), { is_playing: false });
      s.notify('Sleep timer — sweet dreams');
    }
    lastTick = now;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
