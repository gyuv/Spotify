import { logout } from '../lib/auth';
import { savePref, useStore, type LyricsSize, type ThemeMode } from '../lib/store';
import { Sheet } from './common';

const THEMES: [ThemeMode, string][] = [
  ['gold', 'Gold'],
  ['dynamic', 'Dynamic'],
  ['amoled', 'AMOLED'],
  ['neon', 'Neon'],
  ['sunset', 'Sunset'],
];

export function Settings({ onClose }: { onClose: () => void }) {
  const { crossfade, lyricsSize, theme, set } = useStore();
  const setCf = (n: number) => (set({ crossfade: n }), savePref('crossfade', n));
  const setSize = (n: LyricsSize) => (set({ lyricsSize: n }), savePref('lyricsSize', n));
  return (
    <Sheet title="Settings" onClose={onClose}>
      <section className="setting">
        <div className="setting-head">
          <strong>Crossfade</strong>
          <span className="setting-val">{crossfade ? `${crossfade}s` : 'Off'}</span>
        </div>
        <input
          className="range"
          type="range"
          min={0}
          max={12}
          step={1}
          value={crossfade}
          onChange={(e) => setCf(Number(e.target.value))}
          aria-label="Crossfade seconds"
        />
        <div className="chips">
          {[0, 3, 6, 9, 12].map((n) => (
            <button key={n} className={`chip ${crossfade === n ? 'on' : ''}`} onClick={() => setCf(n)}>
              {n ? `${n}s` : 'Off'}
            </button>
          ))}
        </div>
        <p className="muted small">
          Smoothly fades each song out and the next one in. Works with this browser’s player and any Spotify Connect device that allows
          volume control. On your phone, also turn on <em>Settings → Playback → Crossfade</em> in the Spotify app for overlapping mixes.
        </p>
      </section>

      <section className="setting">
        <div className="setting-head">
          <strong>Lyrics size</strong>
        </div>
        <div className="seg">
          {(['s', 'm', 'l'] as LyricsSize[]).map((k) => (
            <button key={k} className={lyricsSize === k ? 'on' : ''} onClick={() => setSize(k)}>
              {{ s: 'Small', m: 'Medium', l: 'Large' }[k]}
            </button>
          ))}
        </div>
      </section>

      <section className="setting">
        <div className="setting-head">
          <strong>Theme</strong>
        </div>
        <div className="chips">
          {THEMES.map(([k, label]) => (
            <button
              key={k}
              className={`chip ${theme === k ? 'on' : ''}`}
              onClick={() => (set({ theme: k }), savePref('theme', k))}
            >
              <span className={`swatch sm ${k}`} /> {label}
            </button>
          ))}
        </div>
      </section>

      <button className="chip danger" onClick={logout}>
        Sign out
      </button>
    </Sheet>
  );
}
