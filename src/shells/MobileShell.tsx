import { useRef, useState } from 'react';
import { Cover, EqBars, ThemePicker } from '../components/common';
import { Icon } from '../components/icons';
import { NowPlaying } from '../components/NowPlaying';
import { Settings } from '../components/Settings';
import { art, artists, Spotify } from '../lib/api';
import { act, useStore } from '../lib/store';
import { Content } from '../views/Content';
import { NAV } from './nav';

/**
 * Mobile: thumb-zone first. Big collapsing title header, edge-to-edge content, a floating glass
 * mini-player with a live progress hairline, and a pill tab bar. Everything important is reachable
 * one-handed; the full-screen Live player slides up over it with gesture controls.
 */
export function MobileShell() {
  const { view, go, back, history, nowPlayingOpen, set } = useStore();
  const pb = useStore((s) => s.playback);
  const pos = useStore((s) => s.position);
  const [theme, setTheme] = useState(false);
  const [settings, setSettings] = useState(false);
  const t = pb?.item;
  const sx = useRef(0);
  const title = 'title' in view ? view.title : NAV.find((n) => n.name === view.name)?.label;

  return (
    <div className="mobile">
      <header className="m-top">
        {history.length > 0 && view.name !== 'home' ? (
          <button className="icon-btn" onClick={back} aria-label="Back">
            <Icon name="back" />
          </button>
        ) : (
          <img className="m-logo" src="/icon.svg" alt="" />
        )}
        <span className="m-title">{title}</span>
        <button className="icon-btn" onClick={() => setTheme(true)} aria-label="Theme">
          <Icon name="palette" />
        </button>
        <button className="icon-btn" onClick={() => setSettings(true)} aria-label="Settings">
          <Icon name="settings" />
        </button>
      </header>

      <main className="m-content">
        <Content />
      </main>

      {t && (
        <div
          className="mini"
          onClick={() => set({ nowPlayingOpen: true })}
          onTouchStart={(e) => (sx.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            const dx = e.changedTouches[0].clientX - sx.current;
            if (dx < -60) act(Spotify.next);
            if (dx > 60) act(Spotify.prev);
          }}
        >
          <Cover src={art(t.album.images, 64)} size={42} />
          <div className="meta">
            <div className="title">{t.name}</div>
            <div className="sub">
              {pb?.is_playing && <EqBars />} {artists(t)} {pb?.device && <em>· {pb.device.name}</em>}
            </div>
          </div>
          <button
            className="icon-btn"
            onClick={(e) => {
              e.stopPropagation();
              act(() => (pb?.is_playing ? Spotify.pause() : Spotify.play()), { is_playing: !pb?.is_playing });
            }}
            aria-label="Play/Pause"
          >
            <Icon name={pb?.is_playing ? 'pause' : 'play'} size={26} />
          </button>
          <div className="mini-progress" style={{ width: `${(pos / t.duration_ms) * 100}%` }} />
        </div>
      )}

      <nav className="tabbar">
        {NAV.map((n) => (
          <button key={n.name} className={view.name === n.name ? 'on' : ''} onClick={() => (navigator.vibrate?.(6), go({ name: n.name } as never))}>
            <Icon name={n.icon} />
            <span>{n.label}</span>
          </button>
        ))}
      </nav>

      {nowPlayingOpen && <NowPlaying mode="sheet" />}
      {theme && <ThemePicker onClose={() => setTheme(false)} />}
      {settings && <Settings onClose={() => setSettings(false)} />}
    </div>
  );
}
