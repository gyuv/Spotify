import { useEffect, useState } from 'react';
import { Controls, Cover, DevicePicker, LikeButton, Progress, SleepTimer, ThemePicker, Volume } from '../components/common';
import { GlassCover } from '../components/GlassCover';
import { Icon } from '../components/icons';
import { NowPlaying } from '../components/NowPlaying';
import { Lyrics } from '../components/Lyrics';
import { Queue } from '../components/Queue';
import { Settings } from '../components/Settings';
import { Visualizer } from '../components/Visualizer';
import { art, artists, Spotify } from '../lib/api';
import { act, toggleLike, useStore } from '../lib/store';
import { Content } from '../views/Content';
import { NAV } from './nav';

/**
 * Desktop / web: a three-zone "studio" — slim icon rail, scrolling content canvas, and an always-on
 * Live Deck (art + visualizer + queue) on the right. A floating glass dock carries transport controls.
 * Press F (or click the art) for full-screen Stage mode.
 */
export function DesktopShell() {
  const { view, go, back, history, nowPlayingOpen, set, sleepAt } = useStore();
  const t = useStore((s) => s.playback?.item);
  const playing = useStore((s) => s.playback?.is_playing);
  const [sheet, setSheet] = useState<null | 'devices' | 'sleep' | 'theme' | 'settings'>(null);
  const [deck, setDeck] = useState(true);
  const [deckTab, setDeckTab] = useState<'queue' | 'lyrics'>('queue');
  const crossfade = useStore((s) => s.crossfade);
  const fading = useStore((s) => s.fading);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches('input, textarea, select')) return;
      const pb = useStore.getState().playback;
      if (e.code === 'Space') {
        e.preventDefault();
        act(() => (pb?.is_playing ? Spotify.pause() : Spotify.play()), { is_playing: !pb?.is_playing });
      } else if (e.key === 'ArrowRight' && e.shiftKey) act(Spotify.next);
      else if (e.key === 'ArrowLeft' && e.shiftKey) act(Spotify.prev);
      else if (e.key === 'f') set({ nowPlayingOpen: !useStore.getState().nowPlayingOpen });
      else if (e.key === 'Escape') set({ nowPlayingOpen: false });
      else if (e.key === 'l' && pb?.item) toggleLike(pb.item);
    };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [set]);

  return (
    <div className={`desktop ${deck ? 'with-deck' : ''}`}>
      <nav className="rail">
        <div className="logo">
          <img src="/icon.svg" alt="RY Music" />
        </div>
        {NAV.map((n) => (
          <button key={n.name} className={`rail-btn ${view.name === n.name ? 'on' : ''}`} onClick={() => go({ name: n.name } as never)} title={n.label}>
            <Icon name={n.icon} />
            <span>{n.label}</span>
          </button>
        ))}
        <div className="rail-spacer" />
        <button className="rail-btn" onClick={() => set({ paletteOpen: true })} title="Command palette (Ctrl+K)">
          <Icon name="bolt" />
          <span>⌘K</span>
        </button>
        <button className="rail-btn" onClick={() => setSheet('theme')} title="Theme">
          <Icon name="palette" />
          <span>Vibe</span>
        </button>
        <button className="rail-btn" onClick={() => setSheet('settings')} title="Settings">
          <Icon name="settings" />
          <span>Settings</span>
        </button>
      </nav>

      <main className="canvas">
        <div className="canvas-top">
          <button className="icon-btn" disabled={!history.length} onClick={back} aria-label="Back">
            <Icon name="back" />
          </button>
          <button className="search-trigger" onClick={() => set({ paletteOpen: true })}>
            <Icon name="search" size={18} /> Search or run a command <kbd>Ctrl K</kbd>
          </button>
          <button className={`icon-btn ${deck ? 'on' : ''}`} onClick={() => setDeck(!deck)} aria-label="Toggle Live Deck">
            <Icon name="queue" />
          </button>
        </div>
        <Content />
      </main>

      {deck && (
        <aside className="deck">
          <div className="deck-art" onClick={() => set({ nowPlayingOpen: true })} title="Open Stage (F)">
            <Visualizer variant="ring" />
            <GlassCover src={art(t?.album.images, 640)} playing={playing} />
          </div>
          <div className="deck-meta">
            <div>
              <h2>{t?.name ?? 'Nothing playing'}</h2>
              <p>{t ? artists(t) : 'Press play anywhere'}</p>
            </div>
            {t && <LikeButton track={t} />}
          </div>
          <div className="seg deck-tabs">
            <button className={deckTab === 'queue' ? 'on' : ''} onClick={() => setDeckTab('queue')}>
              Up next
            </button>
            <button className={deckTab === 'lyrics' ? 'on' : ''} onClick={() => setDeckTab('lyrics')}>
              Lyrics
            </button>
          </div>
          {deckTab === 'queue' ? <Queue compact /> : t ? <Lyrics track={t} mode="deck" /> : null}
        </aside>
      )}

      <footer className="dock">
        <div className="dock-now" onClick={() => set({ nowPlayingOpen: true })}>
          <Cover src={art(t?.album.images, 64)} size={48} />
          <div className="meta">
            <div className="title">{t?.name ?? '—'}</div>
            <div className="sub">{t ? artists(t) : ''}</div>
          </div>
        </div>
        <div className="dock-center">
          <Controls />
          <Progress />
        </div>
        <div className="dock-right">
          <Visualizer variant="bars" className="mini-viz" />
          <button
            className={`icon-btn ${crossfade ? 'on' : ''} ${fading ? 'pulse' : ''}`}
            onClick={() => setSheet('settings')}
            aria-label={`Crossfade ${crossfade ? `${crossfade}s` : 'off'}`}
            title={`Crossfade: ${crossfade ? `${crossfade}s` : 'off'}`}
          >
            <Icon name="fade" size={18} />
          </button>
          <button className={`icon-btn ${sleepAt ? 'on' : ''}`} onClick={() => setSheet('sleep')} aria-label="Sleep timer">
            <Icon name="moon" size={18} />
          </button>
          <button className="icon-btn" onClick={() => setSheet('devices')} aria-label="Devices">
            <Icon name="devices" size={18} />
          </button>
          <Volume />
        </div>
      </footer>

      {nowPlayingOpen && (
        <div className="stage-overlay">
          <button className="icon-btn stage-close" onClick={() => set({ nowPlayingOpen: false })} aria-label="Close stage">
            <Icon name="x" />
          </button>
          <NowPlaying mode="panel" />
        </div>
      )}
      {sheet === 'devices' && <DevicePicker onClose={() => setSheet(null)} />}
      {sheet === 'sleep' && <SleepTimer onClose={() => setSheet(null)} />}
      {sheet === 'theme' && <ThemePicker onClose={() => setSheet(null)} />}
      {sheet === 'settings' && <Settings onClose={() => setSheet(null)} />}
    </div>
  );
}
