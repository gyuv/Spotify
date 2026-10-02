// Group listening ("Party Rooms"). The host's playback is mirrored to every guest's own Spotify
// player through a small relay (server/party.mjs). Guests can suggest tracks and send reactions.
import { create } from 'zustand';
import { Spotify, type Track } from './api';
import { act, useStore } from './store';

const URL_ = (import.meta.env.VITE_PARTY_URL as string | undefined) ?? 'ws://127.0.0.1:8787';

type Member = { id: string; name: string; host: boolean };
type HostState = { uri: string; position: number; playing: boolean; at: number; name: string; artist: string; art: string };
type Suggestion = { from: string; track: { uri: string; name: string; artist: string; art: string } };

type Party = {
  room: string | null;
  isHost: boolean;
  members: Member[];
  feed: string[];
  suggestions: Suggestion[];
  reactions: { id: number; emoji: string }[];
  autoAccept: boolean;
  playlist: { id: string; url: string; name: string } | null;
  set: (p: Partial<Party>) => void;
};

export const useParty = create<Party>((set) => ({
  room: null,
  isHost: false,
  members: [],
  feed: [],
  suggestions: [],
  reactions: [],
  autoAccept: true,
  playlist: null,
  set: (p) => set(p),
}));

let ws: WebSocket | null = null;
let unsub: (() => void) | null = null;
const send = (m: unknown) => ws?.readyState === 1 && ws.send(JSON.stringify(m));
const log = (t: string) => useParty.setState((s) => ({ feed: [t, ...s.feed].slice(0, 30) }));

export const newCode = () => Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');

export function joinParty(code: string, name: string) {
  leaveParty();
  ws = new WebSocket(URL_);
  ws.onopen = () => send({ type: 'join', room: code, name });
  ws.onerror = () => useStore.getState().notify('Party server unreachable — see README › Party Rooms');
  ws.onclose = () => useParty.setState({ room: null, members: [] });
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    const p = useParty.getState();
    if (m.type === 'welcome') {
      p.set({ room: m.room, isHost: m.isHost, playlist: m.playlist, feed: [`Joined room ${m.room}`] });
      if (m.isHost) startHosting();
      else if (m.state) follow(m.state);
    } else if (m.type === 'members') p.set({ members: m.members });
    else if (m.type === 'state') follow(m.state);
    else if (m.type === 'promoted') (p.set({ isHost: true }), log('You are now the host'), startHosting());
    else if (m.type === 'feed') log(m.text);
    else if (m.type === 'playlist') (p.set({ playlist: m.playlist }), log(`Shared playlist: ${m.playlist.name}`));
    else if (m.type === 'react') {
      const id = Math.random();
      p.set({ reactions: [...p.reactions, { id, emoji: m.emoji }] });
      setTimeout(() => useParty.setState((s) => ({ reactions: s.reactions.filter((r) => r.id !== id) })), 2500);
    } else if (m.type === 'suggest') {
      if (p.autoAccept) {
        act(() => Spotify.enqueue(m.track.uri));
        log(`Queued ${m.track.name} from ${m.from}`);
      } else p.set({ suggestions: [...p.suggestions, { from: m.from, track: m.track }] });
    }
  };
}

export function leaveParty() {
  unsub?.();
  unsub = null;
  ws?.close();
  ws = null;
  useParty.setState({ room: null, isHost: false, members: [], suggestions: [], playlist: null });
}

function startHosting() {
  unsub?.();
  let last = '';
  const push = () => {
    const { playback, position } = useStore.getState();
    const t = playback?.item;
    if (!t) return;
    const key = `${t.uri}|${playback.is_playing}|${Math.round(position / 5000)}`;
    if (key === last) return;
    last = key;
    send({
      type: 'state',
      state: { uri: t.uri, position, playing: playback.is_playing, name: t.name, artist: t.artists[0]?.name, art: t.album.images[0]?.url },
    });
  };
  unsub = useStore.subscribe(push);
  push();
}

let lastFollow = 0;
function follow(s: HostState) {
  const { playback, position, sdkDeviceId } = useStore.getState();
  const target = s.position + (s.playing ? Date.now() - s.at : 0);
  if (Date.now() - lastFollow < 1500) return; // debounce bursts
  lastFollow = Date.now();
  const device = playback?.device?.id ? undefined : sdkDeviceId ?? undefined;
  if (playback?.item?.uri !== s.uri) {
    log(`Now playing: ${s.name} — ${s.artist}`);
    act(() => Spotify.play({ uris: [s.uri], position_ms: Math.round(target) }, device).then(() => (s.playing ? undefined : Spotify.pause())));
  } else if (s.playing !== playback?.is_playing) {
    act(() => (s.playing ? Spotify.play() : Spotify.pause()), { is_playing: s.playing });
  } else if (Math.abs(position - target) > 3000) {
    act(() => Spotify.seek(target));
  }
}

export function suggest(t: Track) {
  send({ type: 'suggest', track: { uri: t.uri, name: t.name, artist: t.artists[0]?.name, art: t.album.images[0]?.url } });
  useStore.getState().notify('Suggested to the host');
}

export const react = (emoji: string) => {
  send({ type: 'react', emoji });
  const id = Math.random();
  useParty.setState((s) => ({ reactions: [...s.reactions, { id, emoji }] }));
  setTimeout(() => useParty.setState((s) => ({ reactions: s.reactions.filter((r) => r.id !== id) })), 2500);
};

export async function createSharedPlaylist() {
  const { room } = useParty.getState();
  const pl = await Spotify.createPlaylist(`RY Party · ${room}`, 'Group playlist made in an RY Music Party Room');
  // Collaborative playlists let every guest add tracks from their own Spotify app.
  await (await import('./api')).api(`/playlists/${pl.id}`, { method: 'PUT', body: JSON.stringify({ collaborative: true, public: false }) }).catch(() => {});
  const playlist = { id: pl.id, name: pl.name, url: `https://open.spotify.com/playlist/${pl.id}` };
  useParty.setState({ playlist });
  send({ type: 'playlist', playlist });
  return playlist;
}
