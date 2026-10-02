// Crossfade. Spotify's API exposes no crossfade control, so RY Music performs the transition itself:
// an equal-power fade-out over the last N seconds of a track, then a fade-in as the next one starts.
// In-browser playback ramps the Web Playback SDK's local volume every frame; Connect devices
// (phones, speakers, TVs) get rate-limited volume steps through the Web API.
// Safety: pausing or seeking back cancels the fade and restores volume immediately, the pre-fade
// volume is saved so a crash/close mid-fade is repaired on next launch, and closing the page
// mid-fade restores it with a keepalive request.
import { Spotify } from './api';
import { peekToken } from './auth';
import { sdkSetVolume } from './engine';
import { pref, refresh, savePref, useStore } from './store';

type Phase = 'idle' | 'out' | 'in';

/** Fade-out gain at progress p (0..1). Equal-power: perceived loudness drops evenly. */
export const fadeOutGain = (p: number) => Math.cos((Math.min(1, Math.max(0, p)) * Math.PI) / 2);
/** Fade-in gain at progress p (0..1). */
export const fadeInGain = (p: number) => Math.sin((Math.min(1, Math.max(0, p)) * Math.PI) / 2);
/** Fade-in length for a crossfade of `cf` ms: a bit shorter than the fade-out so the next song arrives with energy. */
export const fadeInLength = (cf: number) => Math.min(Math.max(cf * 0.6, 1200), 4000);

/** Should a fade-out start now? Pure, so it is unit-testable. */
export function shouldStartFade(o: {
  crossfadeMs: number;
  playing: boolean;
  repeatTrack: boolean;
  supportsVolume: boolean;
  alreadyFaded: boolean;
  durationMs: number;
  positionMs: number;
  volume: number;
}) {
  const remaining = o.durationMs - o.positionMs;
  return (
    o.crossfadeMs > 0 &&
    o.playing &&
    !o.repeatTrack &&
    o.supportsVolume &&
    !o.alreadyFaded &&
    o.volume > 5 &&
    o.durationMs >= o.crossfadeMs * 3 && // skip very short tracks
    remaining <= o.crossfadeMs &&
    remaining > 400
  );
}

let phase: Phase = 'idle';
let base = 0;
let deviceId = '';
let trackAtStart = '';
let fadedTrack = '';
let phaseStart = 0;
let phaseLen = 0;
let lastSent = -1;
let lastSentAt = 0;

function isLocal() {
  const s = useStore.getState();
  return Boolean(s.sdkDeviceId) && s.playback?.device?.id === s.sdkDeviceId;
}

function setVol(v: number, force = false) {
  const pct = Math.round(Math.min(100, Math.max(0, v)));
  if (isLocal()) {
    sdkSetVolume(pct / 100);
    lastSent = pct;
    return;
  }
  const now = performance.now();
  if (!force && (Math.abs(pct - lastSent) < 3 || now - lastSentAt < 300)) return;
  lastSent = pct;
  lastSentAt = now;
  Spotify.volume(pct).catch(() => {});
}

function finish() {
  phase = 'idle';
  savePref('cfRestore', null);
  useStore.getState().set({ fading: false });
}

function restore() {
  setVol(base, true);
  finish();
}

function tick() {
  const s = useStore.getState();
  const pb = s.playback;
  const t = pb?.item;
  const cf = s.crossfade * 1000;
  const now = performance.now();

  if (phase === 'idle') {
    if (!pb || !t) return;
    const ok = shouldStartFade({
      crossfadeMs: cf,
      playing: pb.is_playing,
      repeatTrack: pb.repeat_state === 'track',
      supportsVolume: pb.device?.supports_volume !== false && pb.device?.volume_percent != null,
      alreadyFaded: fadedTrack === t.id,
      durationMs: t.duration_ms,
      positionMs: s.position,
      volume: pb.device?.volume_percent ?? 0,
    });
    if (!ok) return;
    base = pb.device.volume_percent ?? 0;
    deviceId = pb.device.id;
    trackAtStart = fadedTrack = t.id;
    phase = 'out';
    phaseStart = now;
    phaseLen = t.duration_ms - s.position;
    lastSent = base;
    savePref('cfRestore', { device: deviceId, volume: base });
    s.set({ fading: true });
    return;
  }

  if (phase === 'out') {
    if (!pb?.is_playing || pb.device?.id !== deviceId) return restore(); // paused or moved device
    if (t?.id === trackAtStart && t.duration_ms - s.position > cf + 1500) {
      fadedTrack = ''; // user seeked back: allow a fresh fade later
      return restore();
    }
    const p = (now - phaseStart) / phaseLen;
    setVol(base * fadeOutGain(p));
    if (p >= 1 || (t && t.id !== trackAtStart)) {
      phase = 'in';
      phaseStart = now;
      phaseLen = fadeInLength(cf);
      setTimeout(refresh, 300); // pick up the next track quickly
    }
    return;
  }

  // phase === 'in'
  const p = (now - phaseStart) / phaseLen;
  setVol(base * fadeInGain(p), p >= 1);
  if (p >= 1) finish();
}

let started = false;
export function startCrossfade() {
  if (started) return;
  started = true;

  // Repair a fade that was interrupted by a crash or a closed tab.
  const leftover = pref<{ device: string; volume: number } | null>('cfRestore', null);
  if (leftover) {
    savePref('cfRestore', null);
    const once = useStore.subscribe((st) => {
      if (!st.playback) return;
      once();
      if (st.playback.device?.id === leftover.device) Spotify.volume(leftover.volume).catch(() => {});
    });
  }

  addEventListener('pagehide', () => {
    if (phase === 'idle' || isLocal()) return;
    const token = peekToken();
    if (!token) return;
    fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${Math.round(base)}`, {
      method: 'PUT',
      keepalive: true,
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  });

  setInterval(tick, 80);
}
