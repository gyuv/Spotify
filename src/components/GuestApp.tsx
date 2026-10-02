import { useEffect, useRef, useState } from 'react';
import { pref, savePref, useStore } from '../lib/store';
import { GlassCover } from './GlassCover';
import { Icon } from './icons';
import { Visualizer } from './Visualizer';

/**
 * Guest mode: no login, no developer app, no Premium anywhere. Plays through Spotify's public
 * embed player (with Spotify's ads). Full songs for listeners logged in at open.spotify.com in this
 * browser, 30-second previews otherwise. RY Music wraps it in the gold live-player experience.
 */

type Item = { uri: string; title: string; sub: string; art?: string };

const CURATED: Item[] = [
  { uri: 'spotify:playlist:37i9dQZF1DXcBWIGoYBM5M', title: "Today's Top Hits", sub: 'Global chart-toppers' },
  { uri: 'spotify:playlist:37i9dQZF1DX0XUfTFmNBRM', title: 'Hot Hits Hindi', sub: 'Biggest Bollywood songs' },
  { uri: 'spotify:playlist:37i9dQZF1DX0XUsuxWHRQd', title: 'RapCaviar', sub: 'Hip-hop heat' },
  { uri: 'spotify:playlist:37i9dQZF1DWWQRwui0ExPn', title: 'lofi beats', sub: 'Chill to study to' },
  { uri: 'spotify:playlist:37i9dQZF1DX4WYpdgoIcn6', title: 'Chill Hits', sub: 'Kick back' },
  { uri: 'spotify:playlist:37i9dQZF1DWXRqgorJj26U', title: 'Rock Classics', sub: 'Legends only' },
  { uri: 'spotify:playlist:37i9dQZF1DX10zKzsJ2jva', title: 'Viva Latino', sub: 'Latin hits' },
  { uri: 'spotify:playlist:37i9dQZF1DX4sWSpwq3LiO', title: 'Peaceful Piano', sub: 'Calm keys' },
];

/** open.spotify.com/{type}/{id} (any locale/intl path, query) or spotify:type:id → spotify URI. */
export function toUri(input: string): string | null {
  const s = input.trim();
  const m = s.match(/(?:spotify:|open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(?:embed\/)?)(track|album|playlist|artist|episode|show)[/:]([A-Za-z0-9]{22})/);
  return m ? `spotify:${m[1]}:${m[2]}` : null;
}

const webUrl = (uri: string) => `https://open.spotify.com/${uri.split(':')[1]}/${uri.split(':')[2]}`;

/** Public oEmbed: title + cover art without any login. */
async function oembed(uri: string): Promise<{ title?: string; thumbnail_url?: string }> {
  try {
    const r = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(webUrl(uri))}`);
    return r.ok ? await r.json() : {};
  } catch {
    return {};
  }
}

type Controller = {
  loadUri: (uri: string) => void;
  play: () => void;
  togglePlay: () => void;
  seek: (s: number) => void;
  addListener: (ev: string, cb: (e: any) => void) => void;
};

export function GuestApp({ onConnect }: { onConnect: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const ctl = useRef<Controller | null>(null);
  const autoplay = useRef(false);
  const [items, setItems] = useState<Item[]>(() => [...pref<Item[]>('guestRecent', []), ...CURATED]);
  const [now, setNow] = useState<Item | null>(null);
  const [link, setLink] = useState('');
  const [st, setSt] = useState({ paused: true, pos: 0, dur: 0 });
  const set = useStore((s) => s.set);
  const notify = useStore((s) => s.notify);

  // Fill in real cover art for the curated list.
  useEffect(() => {
    items.forEach((it, i) => {
      if (it.art) return;
      oembed(it.uri).then((o) => o.thumbnail_url && setItems((cur) => cur.map((x, j) => (j === i ? { ...x, art: o.thumbnail_url } : x))));
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Spotify's iFrame API drives the visible embed; we mirror its state into the gold UI.
  useEffect(() => {
    window.onSpotifyIframeApiReady = (api) => {
      if (!host.current) return;
      const el = document.createElement('div');
      host.current.appendChild(el);
      api.createController(el, { width: '100%', height: 352, uri: CURATED[0].uri }, (c) => {
        ctl.current = c as Controller;
        c.addListener('ready', () => {
          if (autoplay.current) {
            autoplay.current = false;
            c.play();
          }
        });
        c.addListener('playback_update', (e) => {
          const d = e.data ?? {};
          setSt({ paused: Boolean(d.isPaused), pos: d.position ?? 0, dur: d.duration ?? 0 });
          const pb = useStore.getState().playback;
          // Feed the visualizer / ambient glow, which listen to the global playback state.
          set({ playback: pb ? { ...pb, is_playing: !d.isPaused } : ({ is_playing: !d.isPaused } as never) });
        });
      });
    };
    if (!document.getElementById('spotify-iframe-api')) {
      const s = document.createElement('script');
      s.id = 'spotify-iframe-api';
      s.src = 'https://open.spotify.com/embed/iframe-api/v1';
      s.async = true;
      document.body.appendChild(s);
    }
  }, [set]);

  // Tint the whole app with the playing cover.
  useEffect(() => {
    if (!now?.art) return;
    import('../lib/color').then(({ dominant }) => dominant(now.art!).then((c) => c && set({ accent: c })));
  }, [now?.art, set]);

  const play = (it: Item) => {
    setNow(it);
    autoplay.current = true;
    ctl.current?.loadUri(it.uri);
    navigator.vibrate?.(8);
    document.querySelector('.guest-stage')?.scrollIntoView({ behavior: 'smooth' });
  };

  const addLink = async () => {
    const uri = toUri(link);
    if (!uri) return notify('Paste a Spotify link to a song, album, playlist or artist');
    const o = await oembed(uri);
    const it: Item = { uri, title: o.title ?? 'Spotify ' + uri.split(':')[1], sub: uri.split(':')[1], art: o.thumbnail_url };
    const recent = [it, ...pref<Item[]>('guestRecent', []).filter((x) => x.uri !== uri)].slice(0, 8);
    savePref('guestRecent', recent);
    setItems([...recent, ...CURATED.filter((c) => !recent.some((r) => r.uri === c.uri))]);
    setLink('');
    play(it);
  };

  const fmt = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;

  return (
    <div className="guest">
      <header className="guest-top">
        <img src="/icon.svg" alt="RY Music" />
        <span>RY Music</span>
        <em>Guest</em>
        <button className="chip" onClick={onConnect}>
          Connect Spotify
        </button>
      </header>

      <section className="guest-stage">
        <div className="guest-art">
          <Visualizer variant="ring" />
          <div className="np-art">
            <GlassCover src={now?.art ?? ''} playing={!st.paused} />
          </div>
        </div>
        <div className="guest-meta">
          <p className="eyebrow">{st.paused ? 'Ready' : '● Live'}</p>
          <h1>{now?.title ?? 'Pick a vibe'}</h1>
          <p className="muted">{now ? now.sub : 'Tap a playlist below or paste any Spotify link'}</p>
          {st.dur > 0 && (
            <div className="guest-progress">
              <div>
                <i style={{ width: `${(st.pos / st.dur) * 100}%` }} />
              </div>
              <span>
                {fmt(st.pos)} / {fmt(st.dur)}
              </span>
            </div>
          )}
          <div className="guest-controls">
            <button className="icon-btn" onClick={() => ctl.current?.seek(Math.max(0, st.pos / 1000 - 15))} aria-label="Back 15 seconds">
              <Icon name="prev" />
            </button>
            <button className="play-btn" onClick={() => (now ? ctl.current?.togglePlay() : play(items[0]))} aria-label="Play/Pause">
              <Icon name={st.paused ? 'play' : 'pause'} size={30} />
            </button>
            <button className="icon-btn" onClick={() => ctl.current?.seek(st.pos / 1000 + 15)} aria-label="Forward 15 seconds">
              <Icon name="next" />
            </button>
          </div>
        </div>
        {/* Spotify's own player: choose songs inside playlists, skip, and ads all happen here. */}
        <div className="guest-embed" ref={host} />
      </section>

      <form
        className="guest-link"
        onSubmit={(e) => {
          e.preventDefault();
          addLink();
        }}
      >
        <Icon name="search" />
        <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Paste a Spotify link (song, album, playlist, artist)…" />
        <button className="chip on" type="submit">
          Play
        </button>
      </form>

      <h2>Picked for you</h2>
      <div className="grid guest-grid">
        {items.map((it) => (
          <button key={it.uri} className={`card ${now?.uri === it.uri ? 'on' : ''}`} onClick={() => play(it)}>
            <div className="cover">{it.art ? <img src={it.art} alt="" loading="lazy" /> : <div className="cover-empty" />}</div>
            <div className="card-title">{it.title}</div>
            <div className="card-sub">{it.sub}</div>
          </button>
        ))}
      </div>

      <p className="guest-foot muted small">
        Plays through Spotify’s official player, including Spotify’s ads. Log in at{' '}
        <a href="https://open.spotify.com" target="_blank" rel="noreferrer">
          open.spotify.com
        </a>{' '}
        in this browser for full songs; otherwise Spotify plays 30-second previews. Connect a Spotify account (when the app owner has
        Premium) for search, your library, lyrics, stats and Party Rooms.
      </p>
    </div>
  );
}
