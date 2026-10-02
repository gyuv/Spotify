import { useEffect, useRef, useState } from 'react';
import { createPlayer, findVideo } from '../lib/youtube';
import { useStore } from '../lib/store';

/** Muted official music video behind/instead of the cover, kept in sync with Spotify playback. */
export function Motion({ onMissing }: { onMissing: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<Awaited<ReturnType<typeof createPlayer>> | null>(null);
  const t = useStore((s) => s.playback?.item);
  const playing = useStore((s) => s.playback?.is_playing);
  const [status, setStatus] = useState('Finding the music video…');

  useEffect(() => {
    let alive = true;
    const el = document.createElement('div');
    host.current!.appendChild(el);
    createPlayer(el).then((p) => (alive ? (player.current = p) : p.destroy()));
    return () => {
      alive = false;
      player.current?.destroy();
      player.current = null;
      el.remove();
    };
  }, []);

  useEffect(() => {
    if (!t) return;
    let live = true;
    setStatus('Finding the music video…');
    (async () => {
      const id = await findVideo(t.name, t.artists[0]?.name ?? '');
      if (!live) return;
      if (!id) return (setStatus(''), onMissing());
      for (let i = 0; i < 40 && !player.current; i++) await new Promise((r) => setTimeout(r, 100));
      player.current?.loadVideoById({ videoId: id, startSeconds: useStore.getState().position / 1000 });
      setStatus('');
    })();
    return () => {
      live = false;
    };
  }, [t?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const p = player.current;
    if (!p) return;
    if (playing) p.playVideo();
    else p.pauseVideo();
  }, [playing]);

  // Drift correction every 4s.
  useEffect(() => {
    const iv = setInterval(() => {
      const p = player.current;
      if (!p?.getCurrentTime) return;
      const want = useStore.getState().position / 1000;
      if (Math.abs(p.getCurrentTime() - want) > 1.5) p.seekTo(want, true);
    }, 4000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="motion">
      <div ref={host} className="motion-frame" />
      {status && <div className="motion-status">{status}</div>}
    </div>
  );
}
