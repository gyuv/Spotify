import { useEffect, useMemo, useRef, useState } from 'react';
import { Spotify, type Track } from '../lib/api';
import { shareLyric } from '../lib/lyricCard';
import { getLyrics, lineAt, type Line, type Lyrics as L } from '../lib/lyrics';
import { act, useStore } from '../lib/store';
import { Icon } from './icons';

/** Gaps longer than this between lines show an animated "♪ • • •" interlude. */
const INTERLUDE_MS = 6000;

/**
 * Time-synced lyrics. The current line fills with a gold sweep as it is sung, the view follows the
 * song (pausing while you scroll), tapping a line seeks there, and long-pressing / the share button
 * turns a line into a story card. Falls back to plain lyrics when only unsynced text exists.
 */
export function Lyrics({ track, mode, interactive = true }: { track: Track; mode: 'sheet' | 'panel' | 'tv' | 'deck'; interactive?: boolean }) {
  const [data, setData] = useState<L | null>(null);
  const [nudge, setNudge] = useState(0);
  const size = useStore((s) => s.lyricsSize);

  useEffect(() => {
    let live = true;
    setData(null);
    setNudge(0);
    getLyrics(track).then((l) => live && setData(l));
    return () => {
      live = false;
    };
  }, [track.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const cls = `lyrics lyrics-${mode} size-${size}`;
  if (!data) return <div className={`${cls} lyrics-empty`}><span className="lyrics-loading" /></div>;
  if (data.kind === 'none')
    return (
      <div className={`${cls} lyrics-empty`}>
        <p>No lyrics found for this one.</p>
        <small>Enjoy the music ✨</small>
      </div>
    );
  if (data.kind === 'instrumental')
    return (
      <div className={`${cls} lyrics-empty`}>
        <p className="interlude on">
          ♪ <i /> <i /> <i />
        </p>
        <small>Instrumental</small>
      </div>
    );
  if (data.kind === 'plain')
    return (
      <div className={cls}>
        <div className="lyrics-scroll">
          <p className="lyrics-note">These lyrics aren’t time-synced yet</p>
          {data.text.split('\n').map((l, i) => (
            <p key={i} className="lyric plain">
              {l || ' '}
            </p>
          ))}
          <Credit />
        </div>
      </div>
    );
  return <Synced track={track} lines={data.lines} mode={mode} cls={cls} nudge={nudge} setNudge={setNudge} interactive={interactive} />;
}

function Synced({
  track,
  lines,
  mode,
  cls,
  nudge,
  setNudge,
  interactive,
}: {
  track: Track;
  lines: Line[];
  mode: string;
  cls: string;
  nudge: number;
  setNudge: (n: number) => void;
  interactive: boolean;
}) {
  const idx = useStore((s) => lineAt(lines, s.position + nudge));
  const scroller = useRef<HTMLDivElement>(null);
  const [follow, setFollow] = useState(true);
  const userScrollUntil = useRef(0);
  const press = useRef<number>(0);
  const longPressed = useRef(false);

  // Show an interlude marker inside long instrumental gaps (and before the first line).
  const rows = useMemo(() => {
    const out: ({ kind: 'line'; i: number } | { kind: 'gap'; i: number; from: number; to: number })[] = [];
    if (lines[0] && lines[0].t > INTERLUDE_MS) out.push({ kind: 'gap', i: -1, from: 0, to: lines[0].t });
    lines.forEach((l, i) => {
      out.push({ kind: 'line', i });
      const next = lines[i + 1];
      if (!l.text && next && next.t - l.t > INTERLUDE_MS) out.push({ kind: 'gap', i, from: l.t, to: next.t });
    });
    return out;
  }, [lines]);

  useEffect(() => {
    if (!follow || Date.now() < userScrollUntil.current) return;
    const box = scroller.current;
    const el = box?.querySelector<HTMLElement>('.lyric.active, .interlude.on');
    if (!box) return;
    if (!el) {
      // Before the first line: rewind. On a blank (short-gap) line: hold position.
      if (idx === -1) box.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    box.scrollTo({ top: el.offsetTop - box.clientHeight * (mode === 'deck' ? 0.3 : 0.38), behavior: 'smooth' });
  }, [idx, follow, mode]);

  const onUserScroll = () => {
    userScrollUntil.current = Date.now() + 4000;
    setFollow(false);
  };

  const seek = (l: Line) => {
    useStore.getState().set({ position: l.t - nudge });
    act(() => Spotify.seek(Math.max(0, l.t - nudge)));
    userScrollUntil.current = 0;
    setFollow(true);
  };

  return (
    <div className={cls}>
      <div className="lyrics-scroll" ref={scroller} onWheel={onUserScroll} onTouchMove={onUserScroll}>
        {rows.map((r) => {
          if (r.kind === 'gap') {
            const on = idx === r.i && !(lines[r.i]?.text ?? '');
            return <Interlude key={`g${r.i}`} on={on || (r.i === -1 && idx === -1)} from={r.from} to={r.to} nudge={nudge} />;
          }
          const l = lines[r.i];
          if (!l.text) return null;
          const state = r.i === idx ? 'active' : r.i < idx ? 'past' : 'future';
          const Tag = interactive ? 'button' : 'div';
          return (
            <Tag
              key={r.i}
              className={`lyric ${state}`}
              onClick={interactive ? () => (longPressed.current ? (longPressed.current = false) : seek(l)) : undefined}
              onPointerDown={() => {
                longPressed.current = false;
                press.current = window.setTimeout(() => {
                  longPressed.current = true;
                  shareLyric(track, [l.text]);
                }, 600);
              }}
              onPointerUp={() => clearTimeout(press.current)}
              onPointerLeave={() => clearTimeout(press.current)}
              tabIndex={interactive ? 0 : -1}
            >
              {state === 'active' ? <ActiveFill line={l} next={lines[r.i + 1]} nudge={nudge} /> : l.text}
            </Tag>
          );
        })}
        <Credit />
      </div>
      {!follow && (
        <button className="chip lyrics-resume" onClick={() => ((userScrollUntil.current = 0), setFollow(true))}>
          <Icon name="down" size={14} /> Back to live
        </button>
      )}
      {interactive && (
        <div className="lyrics-tools">
          <button className="chip" onClick={() => setNudge(nudge - 250)} title="Lyrics are late? Make them earlier">
            −¼s
          </button>
          <span className="muted">{nudge ? `${nudge > 0 ? '+' : ''}${(nudge / 1000).toFixed(2)}s` : 'In sync'}</span>
          <button className="chip" onClick={() => setNudge(nudge + 250)} title="Lyrics are early? Make them later">
            +¼s
          </button>
          {idx >= 0 && lines[idx]?.text && (
            <button className="chip" onClick={() => shareLyric(track, [lines[idx].text])}>
              <Icon name="share" size={14} /> Share line
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** The sung line: a gold gradient sweeps across it in time with the vocal. */
function ActiveFill({ line, next, nudge }: { line: Line; next?: Line; nudge: number }) {
  const pos = useStore((s) => s.position + nudge);
  const span = Math.max(400, (next?.t ?? line.t + 4000) - line.t);
  const p = Math.min(1, Math.max(0, (pos - line.t) / span));
  return (
    <span className="fill" style={{ ['--p' as string]: `${(p * 100).toFixed(1)}%` }}>
      {line.text}
    </span>
  );
}

function Interlude({ on, from, to, nudge }: { on: boolean; from: number; to: number; nudge: number }) {
  const pos = useStore((s) => (on ? s.position + nudge : 0));
  const p = on ? Math.min(1, Math.max(0, (pos - from) / (to - from))) : 0;
  return (
    <div className={`interlude ${on ? 'on' : ''}`} style={{ ['--p' as string]: p }}>
      ♪ <i /> <i /> <i />
    </div>
  );
}

const Credit = () => (
  <a className="lyrics-credit" href="https://lrclib.net" target="_blank" rel="noreferrer">
    Lyrics via LRCLIB
  </a>
);
