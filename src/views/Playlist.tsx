import { useMemo, useState } from 'react';
import { Cover, TrackRow } from '../components/common';
import { Icon } from '../components/icons';
import { art, fmt, Spotify, type Track } from '../lib/api';
import { playContext, playTracks, useStore } from '../lib/store';
import { useLoad } from './hooks';

async function loadLiked(): Promise<Track[]> {
  const out: Track[] = [];
  for (let off = 0; off < 500; off += 50) {
    const page = await Spotify.saved(off);
    out.push(...page.items.map((i) => i.track));
    if (out.length >= page.total) break;
  }
  return out;
}

export function PlaylistView({ id, title }: { id: string; title: string }) {
  const notify = useStore((s) => s.notify);
  const { data, error } = useLoad(`pl:${id}`, () => (id === 'liked' ? loadLiked() : Spotify.playlistTracks(id)));
  const [sort, setSort] = useState<'default' | 'title' | 'artist' | 'length'>('default');
  const [filter, setFilter] = useState('');
  const tracks = useMemo(() => {
    let t = (data ?? []).filter((x) => `${x.name} ${x.artists.map((a) => a.name).join(' ')}`.toLowerCase().includes(filter.toLowerCase()));
    if (sort === 'title') t = [...t].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'artist') t = [...t].sort((a, b) => a.artists[0].name.localeCompare(b.artists[0].name));
    if (sort === 'length') t = [...t].sort((a, b) => a.duration_ms - b.duration_ms);
    return t;
  }, [data, sort, filter]);
  const total = (data ?? []).reduce((s, t) => s + t.duration_ms, 0);
  const cover = data?.[0] ? art(data[0].album.images, 300) : '';
  const isDefault = sort === 'default' && !filter && id !== 'liked';

  const dupes = useMemo(() => {
    const seen = new Map<string, number>();
    const d: Track[] = [];
    for (const t of data ?? []) {
      const k = t.uri; // exact duplicates only, so cleanup never removes a different version
      if (seen.has(k)) d.push(t);
      seen.set(k, 1);
    }
    return d;
  }, [data]);

  const play = (i: number) =>
    isDefault ? playContext(`spotify:playlist:${id}`, i) : playTracks(tracks, i);

  return (
    <div className="view playlist">
      <div className="pl-head">
        {id === 'liked' ? <div className="cover liked-cover big">♥</div> : <Cover src={cover} className="big" />}
        <div>
          <p className="eyebrow">Playlist</p>
          <h1>{title}</h1>
          <p className="muted">
            {data?.length ?? '…'} tracks · {fmt(total).split(':')[0]} min
          </p>
          <div className="pl-actions">
            <button className="play-btn" onClick={() => play(0)} aria-label="Play">
              <Icon name="play" />
            </button>
            <button className="chip" onClick={() => playTracks([...tracks].sort(() => Math.random() - 0.5))}>
              <Icon name="shuffle" size={16} /> Shuffle
            </button>
            {dupes.length > 0 && id !== 'liked' && (
              <button
                className="chip warn"
                onClick={async () => {
                  if (!confirm(`Remove ${dupes.length} duplicate(s)? One copy of each song is kept (moved to the end).`)) return;
                  try {
                    const uris = [...new Set(dupes.map((d) => d.uri))];
                    await Spotify.removeFromPlaylist(id, uris);
                    await Spotify.addToPlaylist(id, uris);
                    notify('Duplicates cleaned');
                  } catch (e) {
                    notify((e as Error).message);
                  }
                }}
              >
                {dupes.length} duplicates
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="lib-bar">
        <input className="filter" placeholder="Find in playlist" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
          <option value="default">Custom order</option>
          <option value="title">Title</option>
          <option value="artist">Artist</option>
          <option value="length">Length</option>
        </select>
      </div>
      {error && <p className="error">{error}</p>}
      {!data && !error && <div className="skeleton-list" />}
      {tracks.map((t, i) => (
        <TrackRow key={`${t.id}-${i}`} track={t} index={i} onPlay={() => play(i)} />
      ))}
    </div>
  );
}
