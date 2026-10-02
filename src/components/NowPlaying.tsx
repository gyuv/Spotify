import { useRef, useState } from 'react';
import { art, artists, Spotify } from '../lib/api';
import { react, useParty } from '../lib/party';
import { shareTrack } from '../lib/share';
import { act, toggleLike, useStore } from '../lib/store';
import { Controls, DevicePicker, LikeButton, Progress, SleepTimer, Volume } from './common';
import { GlassCover } from './GlassCover';
import { Icon } from './icons';
import { Lyrics } from './Lyrics';
import { Motion } from './Motion';
import { Queue } from './Queue';
import { Settings } from './Settings';
import { Visualizer } from './Visualizer';

type Tab = 'live' | 'lyrics' | 'queue';
type Stage = 'art' | 'video' | 'lyrics';

/**
 * The "live" stage. Full-screen sheet on mobile (Live / Lyrics / Queue), a split hero on desktop
 * and TV where the left side switches between cover, music video and synced lyrics.
 * Mobile gestures: swipe down to close, swipe art left/right to skip, double-tap art to like.
 */
export function NowPlaying({ mode }: { mode: 'sheet' | 'panel' | 'tv' }) {
  const pb = useStore((s) => s.playback);
  const sleepAt = useStore((s) => s.sleepAt);
  const crossfade = useStore((s) => s.crossfade);
  const fading = useStore((s) => s.fading);
  const set = useStore((s) => s.set);
  const notify = useStore((s) => s.notify);
  const ytEnabled = useStore((s) => s.ytEnabled);
  const [sheet, setSheet] = useState<null | 'devices' | 'sleep' | 'settings'>(null);
  const [tab, setTab] = useState<Tab>('live');
  const [stage, setStage] = useState<Stage>('art');
  const inParty = useParty((s) => Boolean(s.room));
  const reactions = useParty((s) => s.reactions);
  const [dy, setDy] = useState(0);
  const [dx, setDx] = useState(0);
  const start = useRef<{ x: number; y: number } | null>(null);
  const lastTap = useRef(0);
  const t = pb?.item;
  const cover = art(t?.album.images, 640);
  const sheetMode = mode === 'sheet';

  const onDown = (e: React.PointerEvent) => (start.current = { x: e.clientX, y: e.clientY });
  const onMove = (e: React.PointerEvent) => {
    if (!start.current || !sheetMode) return;
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

  const toggleStage = (s: Stage) => setStage(stage === s ? 'art' : s);

  const tools = (
    <div className="np-tools">
      <button className="icon-btn" onClick={() => setSheet('devices')} aria-label="Devices">
        <Icon name="devices" size={20} />
      </button>
      {!sheetMode && (
        <button className={`icon-btn ${stage === 'lyrics' ? 'on' : ''}`} onClick={() => toggleStage('lyrics')} aria-label="Lyrics">
          <Icon name="lyrics" size={20} />
        </button>
      )}
      {ytEnabled && (
        <button className={`icon-btn ${stage === 'video' ? 'on' : ''}`} onClick={() => toggleStage('video')} aria-label="Music video">
          <Icon name="video" size={20} />
        </button>
      )}
      <button className={`icon-btn ${crossfade ? 'on' : ''}`} onClick={() => setSheet('settings')} aria-label={`Crossfade ${crossfade ? `${crossfade}s` : 'off'}`}>
        <Icon name="fade" size={20} />
        {crossfade > 0 && <span className="badge">{crossfade}</span>}
      </button>
      {!sheetMode && <Volume />}
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
  );

  const pill = pb?.device && (
    <div className={`live-pill ${fading ? 'fading' : ''}`}>
      {fading ? `⇄ Crossfading · ${crossfade}s` : `● LIVE on ${pb.device.name}`}
    </div>
  );

  const reactionLayer = (
    <div className="party-reactions" aria-hidden>
      {reactions.map((r) => (
        <span key={r.id} style={{ left: `${10 + ((r.id * 997) % 80)}%` }}>
          {r.emoji}
        </span>
      ))}
    </div>
  );

  const titles = (
    <div className="np-info">
      <div className="np-titles">
        <h1 className="marquee">
          <span>{t?.name ?? 'Nothing playing'}</span>
        </h1>
        <p>{t ? artists(t) : 'Pick something and press play'}</p>
      </div>
      {t && <LikeButton track={t} size={28} />}
    </div>
  );

  // Left/centre visual for panel + TV (and the Live tab on mobile).
  const visual =
    stage === 'video' ? (
      <Motion onMissing={() => (setStage('art'), notify('No music video found for this track'))} />
    ) : stage === 'lyrics' && t && !sheetMode ? (
      <Lyrics track={t} mode={mode === 'tv' ? 'tv' : 'panel'} interactive={mode !== 'tv'} />
    ) : (
      <>
        <Visualizer variant="ring" />
        <div className="np-art" style={{ transform: `translateX(${dx}px) rotate(${dx / 30}deg)` }}>
          <GlassCover src={cover} playing={pb?.is_playing} />
        </div>
      </>
    );

  return (
    <div
      className={`np np-${mode} ${stage === 'lyrics' && !sheetMode ? 'with-lyrics' : ''} tab-${tab}`}
      style={sheetMode ? { transform: `translateY(${dy}px)`, transition: dy ? 'none' : undefined } : undefined}
    >
      <div className="np-bg" style={{ backgroundImage: cover ? `url(${cover})` : undefined }} />
      <div className="np-aurora" />
      {sheetMode && (
        <header className="np-top">
          <button className="icon-btn" onClick={() => set({ nowPlayingOpen: false })} aria-label="Close">
            <Icon name="down" />
          </button>
          <div className="seg">
            {(['live', 'lyrics', 'queue'] as Tab[]).map((k) => (
              <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
                {{ live: 'Live', lyrics: 'Lyrics', queue: 'Queue' }[k]}
              </button>
            ))}
          </div>
          <button className="icon-btn" onClick={() => setSheet('settings')} aria-label="Settings">
            <Icon name="settings" />
          </button>
        </header>
      )}

      {sheetMode && tab === 'queue' && (
        <div className="np-queue">
          <Queue />
        </div>
      )}

      {sheetMode && tab === 'lyrics' && (
        <>
          <div className="np-lyrics-head">
            <img src={art(t?.album.images, 64)} alt="" />
            <div className="meta">
              <div className="title">{t?.name}</div>
              <div className="sub">{t && artists(t)}</div>
            </div>
            {t && <LikeButton track={t} />}
          </div>
          {t ? <Lyrics track={t} mode="sheet" /> : <div className="lyrics lyrics-empty">Nothing playing</div>}
          <Progress />
          <Controls />
        </>
      )}

      {(!sheetMode || tab === 'live') && (
        <>
          <div className="np-stage" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
            {visual}
            {reactionLayer}
            {stage !== 'lyrics' && pill}
          </div>
          {titles}
          <Progress />
          <Controls big />
          {tools}
          {sheetMode && <div className="hint">Swipe art to skip · double-tap to like · swipe down to close</div>}
        </>
      )}

      {sheet === 'devices' && <DevicePicker onClose={() => setSheet(null)} />}
      {sheet === 'sleep' && <SleepTimer onClose={() => setSheet(null)} />}
      {sheet === 'settings' && <Settings onClose={() => setSheet(null)} />}
    </div>
  );
}
