import { useEffect, useMemo, useState } from 'react';
import { art, artists, Spotify, type Track } from '../lib/api';
import { act, playTracks, useStore } from '../lib/store';
import { Cover } from './common';

type Cmd = { label: string; hint?: string; run: () => void; img?: string };

/** Ctrl/⌘+K: search tracks and run any action without leaving the keyboard. */
export function CommandPalette() {
  const { paletteOpen, set, go, notify } = useStore();
  const [q, setQ] = useState('');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [sel, setSel] = useState(0);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        set({ paletteOpen: !useStore.getState().paletteOpen });
      }
    };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [set]);

  useEffect(() => {
    if (q.length < 2) return setTracks([]);
    const id = setTimeout(() => Spotify.search(q).then((r) => setTracks(r.tracks.items)).catch(() => {}), 220);
    return () => clearTimeout(id);
  }, [q]);

  const close = () => (set({ paletteOpen: false }), setQ(''));
  const actions: Cmd[] = useMemo(
    () => [
      { label: 'Play / Pause', hint: 'Space', run: () => act(() => (useStore.getState().playback?.is_playing ? Spotify.pause() : Spotify.play())) },
      { label: 'Next track', hint: '→', run: () => act(Spotify.next) },
      { label: 'Previous track', hint: '←', run: () => act(Spotify.prev) },
      { label: 'Go to Home', run: () => go({ name: 'home' }) },
      { label: 'Go to Library', run: () => go({ name: 'library' }) },
      { label: 'Open Stats', run: () => go({ name: 'stats' }) },
      { label: 'Open Live view', hint: 'F', run: () => set({ nowPlayingOpen: true }) },
      { label: 'Sleep in 30 minutes', run: () => (set({ sleepAt: Date.now() + 1800000 }), notify('Pausing in 30 min')) },
    ],
    [go, set, notify],
  );
  const list: Cmd[] = [
    ...tracks.map((t, i) => ({ label: t.name, hint: artists(t), img: art(t.album.images, 64), run: () => playTracks(tracks, i) })),
    ...actions.filter((a) => a.label.toLowerCase().includes(q.toLowerCase())),
  ];

  if (!paletteOpen) return null;
  return (
    <div className="sheet-backdrop palette-backdrop" onClick={close}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          placeholder="Search songs or type a command…"
          value={q}
          onChange={(e) => (setQ(e.target.value), setSel(0))}
          onKeyDown={(e) => {
            if (e.key === 'Escape') close();
            if (e.key === 'ArrowDown') setSel((s) => Math.min(list.length - 1, s + 1));
            if (e.key === 'ArrowUp') setSel((s) => Math.max(0, s - 1));
            if (e.key === 'Enter' && list[sel]) (list[sel].run(), close());
          }}
        />
        <div className="palette-list">
          {list.map((c, i) => (
            <button key={i} className={i === sel ? 'sel' : ''} onMouseEnter={() => setSel(i)} onClick={() => (c.run(), close())}>
              {c.img && <Cover src={c.img} size={32} />}
              <span>{c.label}</span>
              {c.hint && <small>{c.hint}</small>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
