import { TrackRow } from '../components/common';
import { Icon } from '../components/icons';
import { Spotify } from '../lib/api';
import { playContext, playTracks } from '../lib/store';
import { useLoad } from './hooks';

export function ArtistView({ id, title }: { id: string; title: string }) {
  const { data, error } = useLoad(`artist:${id}`, () => Spotify.artistTop(id));
  return (
    <div className="view artist">
      <div className="artist-hero">
        <p className="eyebrow">Artist</p>
        <h1>{title}</h1>
        <div className="pl-actions">
          <button className="play-btn" onClick={() => playContext(`spotify:artist:${id}`)} aria-label="Play">
            <Icon name="play" />
          </button>
        </div>
      </div>
      <h2>Popular</h2>
      {error && <p className="error">{error}</p>}
      {data?.tracks.map((t, i) => <TrackRow key={t.id} track={t} index={i} onPlay={() => playTracks(data.tracks, i)} />)}
    </div>
  );
}
