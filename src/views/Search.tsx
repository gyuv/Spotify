import { useEffect, useState } from 'react';
import { Card, TrackRow } from '../components/common';
import { Icon } from '../components/icons';
import { art, Spotify } from '../lib/api';
import { playContext, playTracks, pref, savePref, useStore } from '../lib/store';

type Res = Awaited<ReturnType<typeof Spotify.search>>;
const MOODS = ['chill', 'workout', 'focus', 'party', 'sleep', 'lofi', 'throwback', 'acoustic', 'night drive', 'rainy day'];

export function Search() {
  const go = useStore((s) => s.go);
  const [q, setQ] = useState('');
  const [res, setRes] = useState<Res | null>(null);
  const [recent, setRecent] = useState<string[]>(() => pref<string[]>('searches', []));

  useEffect(() => {
    if (q.trim().length < 2) return setRes(null);
    const id = setTimeout(() => {
      Spotify.search(q).then(setRes).catch(() => {});
      const next = [q, ...recent.filter((r) => r !== q)].slice(0, 8);
      setRecent(next);
      savePref('searches', next);
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="view search">
      <label className="search-box">
        <Icon name="search" />
        <input autoFocus placeholder="Songs, artists, albums, vibes…" value={q} onChange={(e) => setQ(e.target.value)} />
        {q && (
          <button className="icon-btn" onClick={() => setQ('')} aria-label="Clear">
            <Icon name="x" size={18} />
          </button>
        )}
      </label>

      {!res && (
        <>
          {recent.length > 0 && (
            <>
              <h2>Recent</h2>
              <div className="chips">
                {recent.map((r) => (
                  <button key={r} className="chip" onClick={() => setQ(r)}>
                    {r}
                  </button>
                ))}
              </div>
            </>
          )}
          <h2>Vibes</h2>
          <div className="mood-grid">
            {MOODS.map((m, i) => (
              <button key={m} className="mood" style={{ ['--h' as string]: `${(i * 37) % 360}` }} onClick={() => setQ(m)}>
                {m}
              </button>
            ))}
          </div>
        </>
      )}

      {res && (
        <div className="results">
          {res.tracks.items[0] && (
            <div className="top-result">
              <h2>Songs</h2>
              {res.tracks.items.slice(0, 6).map((t, i) => (
                <TrackRow key={t.id} track={t} onPlay={() => playTracks(res.tracks.items, i)} />
              ))}
            </div>
          )}
          <h2>Artists</h2>
          <div className="shelf-row">
            {res.artists.items.map((a) => (
              <Card key={a.id} round img={art(a.images)} title={a.name} onClick={() => go({ name: 'artist', id: a.id, title: a.name })} />
            ))}
          </div>
          <h2>Albums</h2>
          <div className="shelf-row">
            {res.albums.items.map((a) => (
              <Card key={a.id} img={art(a.images)} title={a.name} sub={a.artists[0]?.name} onClick={() => playContext(a.uri)} />
            ))}
          </div>
          <h2>Playlists</h2>
          <div className="shelf-row">
            {res.playlists.items.filter(Boolean).map((p) => (
              <Card key={p!.id} img={art(p!.images)} title={p!.name} onClick={() => go({ name: 'playlist', id: p!.id, title: p!.name })} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
