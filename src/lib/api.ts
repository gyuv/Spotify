import { getToken } from './auth';

export type Image = { url: string; width?: number; height?: number };
export type Artist = { id: string; name: string; images?: Image[]; genres?: string[]; uri: string };
export type Album = { id: string; name: string; images: Image[]; uri: string; artists: Artist[]; release_date?: string };
export type Track = {
  id: string;
  name: string;
  uri: string;
  duration_ms: number;
  explicit: boolean;
  album: Album;
  artists: Artist[];
};
export type Playlist = {
  id: string;
  name: string;
  uri: string;
  images: Image[] | null;
  description: string;
  owner: { display_name: string; id: string };
  tracks?: { total: number };
  items?: { total: number };
};
export type Device = {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  volume_percent: number | null;
  supports_volume?: boolean;
};
export type PlaybackState = {
  is_playing: boolean;
  progress_ms: number;
  shuffle_state: boolean;
  repeat_state: 'off' | 'track' | 'context';
  item: Track | null;
  device: Device;
  context: { uri: string } | null;
};

const BASE = 'https://api.spotify.com/v1';

export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  if (!token) throw new Error('Not signed in');
  const res = await fetch(path.startsWith('http') ? path : BASE + path, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers },
  });
  if (res.status === 204 || res.status === 202) return undefined as T;
  if (res.status === 429) {
    const wait = Number(res.headers.get('Retry-After') ?? 1) * 1000;
    await new Promise((r) => setTimeout(r, wait));
    return api(path, init);
  }
  const text = await res.text();
  if (!res.ok) throw new Error(JSON.parse(text || '{}')?.error?.message ?? `HTTP ${res.status}`);
  return (text ? JSON.parse(text) : undefined) as T;
}

const q = (o: Record<string, string | number | undefined>) =>
  '?' + new URLSearchParams(Object.entries(o).filter(([, v]) => v !== undefined) as [string, string][]);

const put = (path: string, body?: unknown) => api(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined });
const post = (path: string, body?: unknown) => api(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });

export const Spotify = {
  me: () => api<{ id: string; display_name: string; images: Image[]; product: string; country: string }>('/me'),
  playback: () => api<PlaybackState | undefined>('/me/player?additional_types=track'),
  devices: () => api<{ devices: Device[] }>('/me/player/devices'),
  queue: () => api<{ currently_playing: Track | null; queue: Track[] }>('/me/player/queue'),
  recent: () => api<{ items: { track: Track; played_at: string }[] }>('/me/player/recently-played?limit=50'),
  top: <T extends 'tracks' | 'artists'>(type: T, range: 'short_term' | 'medium_term' | 'long_term', limit = 50) =>
    api<{ items: T extends 'tracks' ? Track[] : Artist[] }>(`/me/top/${type}${q({ time_range: range, limit })}`),
  playlists: () => api<{ items: Playlist[] }>('/me/playlists?limit=50'),
  saved: (offset = 0) => api<{ items: { track: Track; added_at: string }[]; total: number }>(`/me/tracks${q({ limit: 50, offset })}`),
  playlistTracks: async (id: string) => {
    const out: Track[] = [];
    let url: string | null = `/playlists/${id}/items?limit=100`;
    while (url) {
      // Newer API returns { item }, older returns { track }; accept both.
      const page: { items: { track?: Track; item?: Track }[]; next: string | null } = await api(url);
      for (const it of page.items) {
        const t = it.item ?? it.track;
        if (t?.id) out.push(t);
      }
      url = page.next;
    }
    return out;
  },
  search: (query: string) =>
    api<{ tracks: { items: Track[] }; artists: { items: Artist[] }; albums: { items: Album[] }; playlists: { items: (Playlist | null)[] } }>(
      `/search${q({ q: query, type: 'track,artist,album,playlist', limit: 10 })}`,
    ),
  artistTop: (id: string) => api<{ tracks: Track[] }>(`/artists/${id}/top-tracks`),
  albumTracks: (id: string) => api<Album & { tracks: { items: Omit<Track, 'album'>[] } }>(`/albums/${id}`),
  isSaved: (ids: string[]) => api<boolean[]>(`/me/library/contains${q({ uris: ids.map((i) => `spotify:track:${i}`).join(',') })}`)
    .catch(() => api<boolean[]>(`/me/tracks/contains${q({ ids: ids.join(',') })}`)),
  save: (id: string) => put(`/me/library${q({ uris: `spotify:track:${id}` })}`).catch(() => put(`/me/tracks${q({ ids: id })}`)),
  unsave: (id: string) =>
    api(`/me/library${q({ uris: `spotify:track:${id}` })}`, { method: 'DELETE' }).catch(() =>
      api(`/me/tracks${q({ ids: id })}`, { method: 'DELETE' }),
    ),
  createPlaylist: (name: string, description: string) =>
    post('/me/playlists', { name, description, public: false }) as Promise<Playlist>,
  addToPlaylist: async (id: string, uris: string[]) => {
    for (let i = 0; i < uris.length; i += 100) await post(`/playlists/${id}/items`, { uris: uris.slice(i, i + 100) });
  },
  removeFromPlaylist: (id: string, uris: string[]) =>
    api(`/playlists/${id}/items`, { method: 'DELETE', body: JSON.stringify({ items: uris.map((uri) => ({ uri })) }) }),

  play: (opts: { context_uri?: string; uris?: string[]; offset?: { uri: string } | { position: number }; position_ms?: number } = {}, device?: string) =>
    put(`/me/player/play${q({ device_id: device })}`, Object.keys(opts).length ? opts : undefined),
  pause: () => put('/me/player/pause'),
  next: () => post('/me/player/next'),
  prev: () => post('/me/player/previous'),
  seek: (ms: number) => put(`/me/player/seek${q({ position_ms: Math.round(ms) })}`),
  volume: (pct: number) => put(`/me/player/volume${q({ volume_percent: Math.round(pct) })}`),
  shuffle: (on: boolean) => put(`/me/player/shuffle${q({ state: String(on) })}`),
  repeat: (s: 'off' | 'track' | 'context') => put(`/me/player/repeat${q({ state: s })}`),
  enqueue: (uri: string) => post(`/me/player/queue${q({ uri })}`),
  transfer: (id: string, play = true) => put('/me/player', { device_ids: [id], play }),
};

export const art = (imgs: Image[] | null | undefined, min = 300) => {
  if (!imgs?.length) return '';
  const sorted = [...imgs].sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
  return (sorted.find((i) => (i.width ?? 640) >= min) ?? sorted[sorted.length - 1]).url;
};

export const fmt = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export const artists = (t: { artists: { name: string }[] }) => t.artists.map((a) => a.name).join(', ');
