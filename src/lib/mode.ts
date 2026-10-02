// Free-mode switch. When a non-Premium account signs in, playback commands are routed to the
// Spotify embed player (lib/free.ts) instead of the Web API player endpoints, which need Premium.
import type { Track } from './api';

export type Transport = Record<string, (...args: any[]) => Promise<any>>;
export let freeTransport: Transport | null = null;
export const setFreeTransport = (t: Transport | null) => (freeTransport = t);

/** Track objects we've already seen, so free mode can show art/title for a bare URI. */
export const knownTracks = new Map<string, Track>();
export const remember = (ts: Track[]) => ts.forEach((t) => t?.uri && knownTracks.set(t.uri, t));
