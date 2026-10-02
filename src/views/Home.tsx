import { Card, Cover, Shelf } from '../components/common';
import { Icon } from '../components/icons';
import { art, artists, Spotify, type Track } from '../lib/api';
import { useState } from 'react';
import { playContext, playTracks, pref, savePref, useStore } from '../lib/store';
import { useLoad } from './hooks';

const greet = () => {
  const h = new Date().getHours();
  return h < 5 ? 'Late night session' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

function uniqueBy<T>(xs: T[], key: (x: T) => string) {
  const seen = new Set<string>();
  return xs.filter((x) => (seen.has(key(x)) ? false : (seen.add(key(x)), true)));
}

export function Home() {
  const go = useStore((s) => s.go);
  const me = useLoad('me', Spotify.me);
  const recent = useLoad('recent', Spotify.recent);
  const heavy = useLoad('top-short', () => Spotify.top('tracks', 'short_term'));
  const capsule = useLoad('top-long', () => Spotify.top('tracks', 'long_term'));
  const topArtists = useLoad('artists-medium', () => Spotify.top('artists', 'medium_term', 20));
  const playlists = useLoad('playlists', Spotify.playlists);

  const recentAlbums = uniqueBy(recent.data?.items.map((i) => i.track) ?? [], (t) => t.album.id).slice(0, 8);
  const mix = (name: string, tracks?: Track[]) =>
    tracks?.length ? (
      <button className="mix-tile" onClick={() => playTracks([...tracks].sort(() => Math.random() - 0.5))}>
        <div className="mix-mosaic">
          {tracks.slice(0, 4).map((t) => (
            <img key={t.id} src={art(t.album.images, 120)} alt="" />
          ))}
        </div>
        <div className="mix-label">
          <strong>{name}</strong>
          <small>{tracks.length} tracks · shuffled</small>
        </div>
        <span className="mix-play">
          <Icon name="play" size={20} />
        </span>
      </button>
    ) : null;

  return (
    <div className="view home">
      <div className="hero">
        <p className="eyebrow">{greet()}</p>
        <h1>{me.data?.display_name?.split(' ')[0] ?? 'Listener'}, let’s go live.</h1>
        {me.error && <p className="error">{me.error}</p>}
      </div>
      <FreeNotice />

      <div className="mix-grid">
        {mix('Heavy Rotation', heavy.data?.items)}
        {mix('Time Capsule', capsule.data?.items)}
        {mix('Recently Played', recent.data?.items.map((i) => i.track))}
      </div>

      {recentAlbums.length > 0 && (
        <Shelf title="Jump back in">
          {recentAlbums.map((t) => (
            <Card key={t.album.id} img={art(t.album.images)} title={t.album.name} sub={artists(t)} onClick={() => playContext(t.album.uri)} />
          ))}
        </Shelf>
      )}

      {topArtists.data && (
        <Shelf title="Your artists">
          {topArtists.data.items.map((a) => (
            <Card key={a.id} round img={art(a.images)} title={a.name} sub="Artist" onClick={() => go({ name: 'artist', id: a.id, title: a.name })} />
          ))}
        </Shelf>
      )}

      {playlists.data && (
        <Shelf title="Your playlists">
          {playlists.data.items.filter(Boolean).map((p) => (
            <Card key={p.id} img={art(p.images)} title={p.name} sub={p.owner.display_name} onClick={() => go({ name: 'playlist', id: p.id, title: p.name })} />
          ))}
        </Shelf>
      )}

      {heavy.data && (
        <section className="shelf">
          <header>
            <h2>On repeat this month</h2>
          </header>
          <div className="rank-grid">
            {heavy.data.items.slice(0, 9).map((t, i) => (
              <button key={t.id} className="rank" onClick={() => playTracks(heavy.data!.items, i)}>
                <span className="rank-n">{i + 1}</span>
                <Cover src={art(t.album.images, 64)} size={48} />
                <span className="meta">
                  <span className="title">{t.name}</span>
                  <span className="sub">{artists(t)}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function FreeNotice() {
  const free = useStore((s) => s.free);
  const [hidden, setHidden] = useState(() => pref('freeNoticeHidden', false));
  if (!free || hidden) return null;
  return (
    <div className="free-notice">
      <strong>Free mode</strong>
      <span>
        Songs play through Spotify’s own player, with Spotify’s ads. For full songs instead of 30-second previews, log in at{' '}
        <a href="https://open.spotify.com" target="_blank" rel="noreferrer">
          open.spotify.com
        </a>{' '}
        in this browser. Get Premium for ad-free play on any speaker, crossfade and volume control.
      </span>
      <button className="chip" onClick={() => (setHidden(true), savePref('freeNoticeHidden', true))}>
        Got it
      </button>
    </div>
  );
}
