import { useRef, useState } from 'react';
import { art, artists } from '../lib/api';
import { act, toggleLike, useStore } from '../lib/store';
import { Spotify } from '../lib/api';
import { Controls, DevicePicker, LikeButton, Progress, SleepTimer, Volume } from './common';
import { Icon } from './icons';
import { Queue } from './Queue';
import { Visualizer } from './Visualizer';
import { Motion } from './Motion';
import { youtubeEnabled } from '../lib/youtube';
import { shareTrack } from '../lib/share';
import { react, useParty } from '../lib/party';

/**
 * The "live" stage. Full-screen on mobile and TV, a hero panel on desktop.
 * Mobile gestures: swipe down to close, swipe art left/right to skip, double-tap art to like.
 */
export function NowPlaying({ mode }: { mode: 'sheet' | 'panel' | 'tv' }) {
  const pb = useStore((s) => s.playback);
  const sleepAt = useStore((s) => s.sleepAt);
  const set = useStore((s) => s.set);
  const [sheet, setSheet] = useState<null | 'devices' | 'sleep'>(null);
  const [tab, setTab] = useState<'live' | 'queue'>('live');
  const [motion, setMotion] = useState(false);
  const inParty = useParty((s) => Boolean(s.room));
  const reactions = useParty((s) => s.reactions);
  const notify = useStore((s) => s.notify);
  const [dy, setDy] = useState(0);
  const [dx, setDx] = useState(0);
  const start = useRef<{ x: number; y: number; t: number } | null>(null);
  const lastTap = useRef(0);
  const t = pb?.item;
  const cover = art(t?.album.images, 640);

  const onDown = (e: React.PointerEvent) => (start.current = { x: e.clientX, y: e.clientY, t: Date.now() });
  const onMove = (e: React.PointerEvent) => {
    if (!start.current || mode !== 'sheet') return;
    const ddx = e.clientX - start.current.x;
    const ddy = e.clientY - start.current.y;
    if (Math.abs(ddy) > Math.abs(ddx)) setDy(Math.max(0, ddy));
    else setDx(ddx);
  };
  const onUp = () => {
    if (!start.current) return;
    if (dy > 120) set({ nowPlayingOpen: false });
    else if (dx < -80) act(Spotify.next);
    else if (dx > 80) act(Spotify.prev);
    else if (Math.abs(dx) < 6 && Math.abs(dy) < 6) {
      if (Date.now() - lastTap.current < 300 && t) toggleLike(t);
      lastTap.current = Date.now();
    }
    if (Math.abs(dx) > 80) navigator.vibrate?.(8);
    start.current = null;
    setDx(0);
    setDy(0);
  };

  return (
    <div
      className={`np np-${mode}`}
      style={mode === 'sheet' ? { transform: `translateY(${dy}px)`, transition: dy ? 'none' : undefined } : undefined}
    >
      <div className="np-bg" style={{ backgroundImage: cover ? `url(${cover})` : undefined }} />
      <div className="np-aurora" />
      {mode === 'sheet' && (
        <header className="np-top">
          <button className="icon-btn" onClick={() => set({ nowPlayingOpen: false })} aria-label="Close">
            <Icon name="down" />
          </button>
          <div className="seg">
            <button className={tab === 'live' ? 'on' : ''} onClick={() => setTab('live')}>
              Live
            </button>
            <button className={tab === 'queue' ? 'on' : ''} onClick={() => setTab('queue')}>
              Queue
            </button>
          </div>
          <button className="icon-btn" onClick={() => setSheet('devices')} aria-label="Devices">
            <Icon name="devices" />
          </button>
        </header>
      )}

      {tab === 'queue' && mode === 'sheet' ? (
        <div className="np-queue">
          <Queue />
        </div>
      ) : (
        <>
          <div
            className="np-stage"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          >
            {motion ? (
              <Motion onMissing={() => (setMotion(false), notify('No music video found for this track'))} />
            ) : (
              <>
                <Visualizer variant="ring" />
                <div
                  className={`np-art ${pb?.is_playing ? 'playing' : ''}`}
                  style={{ transform: `translateX(${dx}px) rotate(${dx / 30}deg)` }}
                >
                  {cover ? <img src={cover} alt="" draggable={false} /> : <div className="cover-empty" />}
                </div>
              </>
            )}
            <div className="party-reactions" aria-hidden>
              {reactions.map((r) => (
                <span key={r.id} style={{ left: `${10 + ((r.id * 997) % 80)}%` }}>
                  {r.emoji}
                </span>
              ))}
            </div>
            {pb?.device && <div className="live-pill">● LIVE on {pb.device.name}</div>}
          </div>

          <div className="np-info">
            <div className="np-titles">
              <h1 className="marquee">
                <span>{t?.name ?? 'Nothing playing'}</span>
              </h1>
              <p>{t ? artists(t) : 'Pick something and press play'}</p>
            </div>
            {t && <LikeButton track={t} size={28} />}
          </div>
          <Progress />
          <Controls big />
          <div className="np-tools">
            <button className="icon-btn" onClick={() => setSheet('devices')} aria-label="Devices">
              <Icon name="devices" size={20} />
            </button>
            {youtubeEnabled() && (
              <button className={`icon-btn ${motion ? 'on' : ''}`} onClick={() => setMotion(!motion)} aria-label="Music video">
                <Icon name="video" size={20} />
              </button>
            )}
            <Volume />
            {inParty && (
              <button className="icon-btn" onClick={() => react('🔥')} aria-label="React">
                🔥
              </button>
            )}
            {t && (
              <button className="icon-btn" onClick={() => shareTrack(t)} aria-label="Share">
                <Icon name="share" size={20} />
              </button>
            )}
            <button className={`icon-btn ${sleepAt ? 'on' : ''}`} onClick={() => setSheet('sleep')} aria-label="Sleep timer">
              <Icon name="moon" size={20} />
            </button>
          </div>
          {mode === 'sheet' && <div className="hint">Swipe art to skip · double-tap to like · swipe down to close</div>}
        </>
      )}
      {sheet === 'devices' && <DevicePicker onClose={() => setSheet(null)} />}
      {sheet === 'sleep' && <SleepTimer onClose={() => setSheet(null)} />}
    </div>
  );
}
