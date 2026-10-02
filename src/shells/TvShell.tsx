import { useEffect, useRef } from 'react';
import { Icon } from '../components/icons';
import { NowPlaying } from '../components/NowPlaying';
import { Spotify } from '../lib/api';
import { act, useStore } from '../lib/store';
import { Content } from '../views/Content';
import { NAV } from './nav';

/**
 * Android TV / big screen: 10-foot UI. Left focus rail, oversized tiles, and spatial D-pad navigation
 * (arrow keys move focus to the nearest element in that direction). Media keys work everywhere.
 * Idle for 20s while playing → the Live stage takes over as an ambient screensaver.
 */
function moveFocus(dir: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight') {
  const els = [...document.querySelectorAll<HTMLElement>('button, [tabindex="0"], input, select')].filter(
    (e) => e.offsetParent !== null && !(e as HTMLButtonElement).disabled,
  );
  const cur = document.activeElement as HTMLElement | null;
  if (!cur || !els.includes(cur)) return els[0]?.focus();
  const a = cur.getBoundingClientRect();
  const ac = { x: a.left + a.width / 2, y: a.top + a.height / 2 };
  let best: HTMLElement | null = null;
  let bestD = Infinity;
  for (const e of els) {
    if (e === cur) continue;
    const b = e.getBoundingClientRect();
    const bc = { x: b.left + b.width / 2, y: b.top + b.height / 2 };
    const dx = bc.x - ac.x;
    const dy = bc.y - ac.y;
    const ok =
      (dir === 'ArrowRight' && dx > 4) || (dir === 'ArrowLeft' && dx < -4) || (dir === 'ArrowDown' && dy > 4) || (dir === 'ArrowUp' && dy < -4);
    if (!ok) continue;
    const primary = dir === 'ArrowLeft' || dir === 'ArrowRight' ? Math.abs(dx) : Math.abs(dy);
    const cross = dir === 'ArrowLeft' || dir === 'ArrowRight' ? Math.abs(dy) : Math.abs(dx);
    const d = primary + cross * 2.5;
    if (d < bestD) (bestD = d), (best = e);
  }
  best?.focus();
  best?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
}

export function TvShell() {
  const { view, go, back, nowPlayingOpen, set } = useStore();
  const idle = useRef(0);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      idle.current = Date.now();
      const pb = useStore.getState().playback;
      if (e.key.startsWith('Arrow') && !(document.activeElement instanceof HTMLInputElement && (e.key === 'ArrowLeft' || e.key === 'ArrowRight'))) {
        e.preventDefault();
        moveFocus(e.key as 'ArrowUp');
      } else if (e.key === 'MediaPlayPause') act(() => (pb?.is_playing ? Spotify.pause() : Spotify.play()));
      else if (e.key === 'MediaTrackNext' || e.key === 'MediaFastForward') act(Spotify.next);
      else if (e.key === 'MediaTrackPrevious' || e.key === 'MediaRewind') act(Spotify.prev);
      else if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'GoBack') {
        if (document.activeElement instanceof HTMLInputElement && e.key === 'Backspace') return;
        if (useStore.getState().nowPlayingOpen) set({ nowPlayingOpen: false });
        else back();
      }
    };
    addEventListener('keydown', k);
    const iv = setInterval(() => {
      const s = useStore.getState();
      if (s.playback?.is_playing && !s.nowPlayingOpen && Date.now() - idle.current > 20000) set({ nowPlayingOpen: true });
    }, 2000);
    idle.current = Date.now();
    setTimeout(() => document.querySelector<HTMLElement>('.tv-rail button')?.focus(), 300);
    return () => (removeEventListener('keydown', k), clearInterval(iv));
  }, [back, set]);

  return (
    <div className="tv">
      <nav className="tv-rail">
        <img src="/icon.svg" alt="RY Music" className="tv-logo" />
        {NAV.map((n) => (
          <button key={n.name} className={view.name === n.name ? 'on' : ''} onClick={() => go({ name: n.name } as never)}>
            <Icon name={n.icon} size={30} />
            <span>{n.label}</span>
          </button>
        ))}
        <button onClick={() => set({ nowPlayingOpen: true })}>
          <Icon name="play" size={30} />
          <span>Live</span>
        </button>
      </nav>
      <main className="tv-content">
        <Content />
      </main>
      {nowPlayingOpen && <NowPlaying mode="tv" />}
    </div>
  );
}
