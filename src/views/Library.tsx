import { useState } from 'react';
import { Card } from '../components/common';
import { art, Spotify } from '../lib/api';
import { useStore } from '../lib/store';
import { useLoad } from './hooks';

export function Library() {
  const go = useStore((s) => s.go);
  const [filter, setFilter] = useState('');
  const [mine, setMine] = useState(false);
  const me = useLoad('me', Spotify.me);
  const pl = useLoad('playlists', Spotify.playlists);
  const items = (pl.data?.items ?? [])
    .filter(Boolean)
    .filter((p) => p.name.toLowerCase().includes(filter.toLowerCase()))
    .filter((p) => !mine || p.owner.id === me.data?.id);
  return (
    <div className="view library">
      <h1>Your Library</h1>
      <div className="lib-bar">
        <input className="filter" placeholder="Filter playlists" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <button className={`chip ${mine ? 'on' : ''}`} onClick={() => setMine(!mine)}>
          Made by me
        </button>
      </div>
      <div className="grid">
        <button className="card liked-card" onClick={() => go({ name: 'playlist', id: 'liked', title: 'Liked Songs' })}>
          <div className="cover liked-cover">♥</div>
          <div className="card-title">Liked Songs</div>
        </button>
        {items.map((p) => (
          <Card
            key={p.id}
            img={art(p.images)}
            title={p.name}
            sub={`${(p.items ?? p.tracks)?.total ?? ''} tracks`}
            onClick={() => go({ name: 'playlist', id: p.id, title: p.name })}
          />
        ))}
      </div>
      {pl.error && <p className="error">{pl.error}</p>}
    </div>
  );
}
