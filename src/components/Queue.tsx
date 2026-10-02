import { useEffect, useState } from 'react';
import { Spotify, type Track } from '../lib/api';
import { playTracks, useStore } from '../lib/store';
import { TrackRow } from './common';

export function Queue({ compact }: { compact?: boolean }) {
  const current = useStore((s) => s.playback?.item?.id);
  const notify = useStore((s) => s.notify);
  const [q, setQ] = useState<Track[]>([]);
  useEffect(() => {
    Spotify.queue().then((r) => setQ(r.queue)).catch(() => setQ([]));
  }, [current]);
  const save = async () => {
    const all = [useStore.getState().playback?.item, ...q].filter(Boolean) as Track[];
    const uris = [...new Set(all.map((t) => t.uri))];
    try {
      const pl = await Spotify.createPlaylist(`RY Session · ${new Date().toLocaleDateString()}`, 'Saved from RY Music queue');
      await Spotify.addToPlaylist(pl.id, uris);
      notify(`Saved ${uris.length} tracks as a playlist`);
    } catch (e) {
      notify((e as Error).message);
    }
  };
  return (
    <div className="queue">
      <div className="queue-head">
        <h3>Up next</h3>
        {q.length > 0 && (
          <button className="chip" onClick={save}>
            Save as playlist
          </button>
        )}
      </div>
      {q.length === 0 && <div className="muted">Queue is empty</div>}
      {q.slice(0, compact ? 8 : 40).map((t, i) => (
        <TrackRow key={`${t.id}-${i}`} track={t} onPlay={() => playTracks(q, i)} />
      ))}
    </div>
  );
}
