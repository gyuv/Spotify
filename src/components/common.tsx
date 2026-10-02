import { useEffect, useRef, useState } from 'react';
import { art, artists, fmt, Spotify, type Device, type Track } from '../lib/api';
import { useParty, suggest } from '../lib/party';
import { act, toggleLike, useStore } from '../lib/store';
import { Icon } from './icons';

export function Cover({ src, size, round, className = '' }: { src: string; size?: number; round?: boolean; className?: string }) {
  return (
    <div className={`cover ${round ? 'round' : ''} ${className}`} style={size ? { width: size, height: size } : undefined}>
      {src ? <img src={src} alt="" loading="lazy" /> : <div className="cover-empty" />}
    </div>
  );
}

export function LikeButton({ track, size = 22 }: { track: Track; size?: number }) {
  const liked = useStore((s) => s.liked[track.id]);
  return (
    <button className={`icon-btn like ${liked ? 'on' : ''}`} onClick={() => toggleLike(track)} aria-label="Like">
      <Icon name="heart" solid={liked} size={size} />
    </button>
  );
}

export function Controls({ big }: { big?: boolean }) {
  const pb = useStore((s) => s.playback);
  const playing = pb?.is_playing;
  const repeatNext = { off: 'context', context: 'track', track: 'off' } as const;
  return (
    <div className={`controls ${big ? 'big' : ''}`}>
      <button
        className={`icon-btn ${pb?.shuffle_state ? 'on' : ''}`}
        onClick={() => act(() => Spotify.shuffle(!pb?.shuffle_state), { shuffle_state: !pb?.shuffle_state })}
        aria-label="Shuffle"
      >
        <Icon name="shuffle" size={big ? 22 : 18} />
      </button>
      <button className="icon-btn" onClick={() => act(Spotify.prev)} aria-label="Previous">
        <Icon name="prev" size={big ? 34 : 22} />
      </button>
      <button
        className="play-btn"
        onClick={() => act(() => (playing ? Spotify.pause() : Spotify.play()), { is_playing: !playing })}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        <Icon name={playing ? 'pause' : 'play'} size={big ? 38 : 22} />
      </button>
      <button className="icon-btn" onClick={() => act(Spotify.next)} aria-label="Next">
        <Icon name="next" size={big ? 34 : 22} />
      </button>
      <button
        className={`icon-btn ${pb && pb.repeat_state !== 'off' ? 'on' : ''}`}
        onClick={() => pb && act(() => Spotify.repeat(repeatNext[pb.repeat_state]), { repeat_state: repeatNext[pb.repeat_state] })}
        aria-label="Repeat"
      >
        <Icon name="repeat" size={big ? 22 : 18} />
        {pb?.repeat_state === 'track' && <span className="badge">1</span>}
      </button>
    </div>
  );
}

export function Progress() {
  const pos = useStore((s) => s.position);
  const dur = useStore((s) => s.playback?.item?.duration_ms ?? 0);
  const [drag, setDrag] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const val = drag ?? pos;
  const frac = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * dur;
  };
  return (
    <div className="progress">
      <div
        ref={ref}
        className="track"
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          setDrag(frac(e));
        }}
        onPointerMove={(e) => drag !== null && setDrag(frac(e))}
        onPointerUp={(e) => {
          const ms = frac(e);
          setDrag(null);
          useStore.getState().set({ position: ms });
          act(() => Spotify.seek(ms));
        }}
      >
        <div className="fill" style={{ width: `${dur ? (val / dur) * 100 : 0}%` }} />
        <div className="knob" style={{ left: `${dur ? (val / dur) * 100 : 0}%` }} />
      </div>
      <div className="times">
        <span>{fmt(val)}</span>
        <span>-{fmt(dur - val)}</span>
      </div>
    </div>
  );
}

export function Volume() {
  const v = useStore((s) => s.playback?.device?.volume_percent ?? 50);
  const [local, setLocal] = useState<number | null>(null);
  const t = useRef<number>(0);
  return (
    <label className="volume">
      <Icon name="volume" size={18} />
      <input
        type="range"
        min={0}
        max={100}
        value={local ?? v}
        onChange={(e) => {
          const n = Number(e.target.value);
          setLocal(n);
          clearTimeout(t.current);
          t.current = window.setTimeout(() => act(() => Spotify.volume(n)).then(() => setLocal(null)), 250);
        }}
      />
    </label>
  );
}

export function TrackRow({ track, index, onPlay, showArt = true }: { track: Track; index?: number; onPlay: () => void; showArt?: boolean }) {
  const current = useStore((s) => s.playback?.item?.id === track.id);
  const notify = useStore((s) => s.notify);
  const guest = useParty((s) => Boolean(s.room) && !s.isHost);
  return (
    <div className={`track-row ${current ? 'current' : ''}`} onClick={onPlay} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onPlay()}>
      {index !== undefined && <span className="idx">{current ? <EqBars /> : index + 1}</span>}
      {showArt && <Cover src={art(track.album?.images, 64)} size={44} />}
      <div className="meta">
        <div className="title">
          {track.explicit && <span className="e">E</span>}
          {track.name}
        </div>
        <div className="sub">{artists(track)}</div>
      </div>
      <span className="dur">{fmt(track.duration_ms)}</span>
      <button
        className="icon-btn"
        aria-label={guest ? 'Suggest to host' : 'Add to queue'}
        onClick={(e) => {
          e.stopPropagation();
          if (guest) suggest(track);
          else act(() => Spotify.enqueue(track.uri)).then(() => notify('Queued'));
        }}
      >
        <Icon name={guest ? 'party' : 'queue'} size={18} />
      </button>
    </div>
  );
}

export function EqBars() {
  const playing = useStore((s) => s.playback?.is_playing);
  return (
    <span className={`eq ${playing ? 'on' : ''}`}>
      <i />
      <i />
      <i />
    </span>
  );
}

export function DevicePicker({ onClose }: { onClose: () => void }) {
  const [devices, setDevices] = useState<Device[] | null>(null);
  useEffect(() => {
    Spotify.devices().then((d) => setDevices(d.devices)).catch(() => setDevices([]));
  }, []);
  return (
    <Sheet title="Play on" onClose={onClose}>
      {devices === null && <div className="muted">Looking for devices…</div>}
      {devices?.length === 0 && (
        <div className="muted">No devices found. Open Spotify on your phone, speaker or TV, then try again.</div>
      )}
      {devices?.map((d) => (
        <button
          key={d.id}
          className={`device ${d.is_active ? 'on' : ''}`}
          onClick={() => act(() => Spotify.transfer(d.id)).then(onClose)}
        >
          <Icon name="devices" />
          <span>
            {d.name}
            <small>{d.type}</small>
          </span>
        </button>
      ))}
    </Sheet>
  );
}

export function SleepTimer({ onClose }: { onClose: () => void }) {
  const { sleepAt, set, notify } = useStore();
  const pick = (min: number) => {
    set({ sleepAt: Date.now() + min * 60000 });
    notify(`Pausing in ${min} min`);
    onClose();
  };
  return (
    <Sheet title="Sleep timer" onClose={onClose}>
      <div className="chips">
        {[5, 15, 30, 45, 60, 90].map((m) => (
          <button key={m} className="chip" onClick={() => pick(m)}>
            {m} min
          </button>
        ))}
      </div>
      {sleepAt && (
        <button className="chip danger" onClick={() => (set({ sleepAt: null }), onClose())}>
          Cancel timer ({Math.ceil((sleepAt - Date.now()) / 60000)} min left)
        </button>
      )}
    </Sheet>
  );
}

export function ThemePicker({ onClose }: { onClose: () => void }) {
  const { theme, set } = useStore();
  const opts = [
    ['gold', 'Gold — the signature premium look'],
    ['dynamic', 'Dynamic — follows the album art'],
    ['amoled', 'AMOLED — true black, saves battery'],
    ['neon', 'Neon — electric cyan'],
    ['sunset', 'Sunset — warm coral'],
  ] as const;
  return (
    <Sheet title="Vibe" onClose={onClose}>
      {opts.map(([k, label]) => (
        <button
          key={k}
          className={`device ${theme === k ? 'on' : ''}`}
          onClick={() => {
            set({ theme: k });
            try {
              localStorage.setItem('pulse.theme', k);
            } catch {}
          }}
        >
          <span className={`swatch ${k}`} />
          <span>{label}</span>
        </button>
      ))}
    </Sheet>
  );
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="sheet-grip" />
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}

export function Toast() {
  const t = useStore((s) => s.toast);
  return t ? <div className="toast">{t}</div> : null;
}

export function Shelf({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="shelf">
      <header>
        <h2>{title}</h2>
        {action}
      </header>
      <div className="shelf-row">{children}</div>
    </section>
  );
}

export function Card({ img, title, sub, round, onClick }: { img: string; title: string; sub?: string; round?: boolean; onClick: () => void }) {
  return (
    <button className="card" onClick={onClick}>
      <Cover src={img} round={round} />
      <div className="card-title">{title}</div>
      {sub && <div className="card-sub">{sub}</div>}
    </button>
  );
}
