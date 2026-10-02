import { useEffect, useState } from 'react';
import { CommandPalette } from './components/CommandPalette';
import { Toast } from './components/common';
import { art } from './lib/api';
import { getToken, handleCallback, isConfigured, login } from './lib/auth';
import { dominant } from './lib/color';
import { startEngine } from './lib/engine';
import { useLayout } from './lib/layout';
import { useStore } from './lib/store';
import { DesktopShell } from './shells/DesktopShell';
import { MobileShell } from './shells/MobileShell';
import { TvShell } from './shells/TvShell';

const THEME_ACCENT = { gold: [245, 196, 81], neon: [0, 229, 255], sunset: [255, 112, 87] } as const;

function useAccent() {
  const cover = useStore((s) => art(s.playback?.item?.album.images, 64));
  const theme = useStore((s) => s.theme);
  const accent = useStore((s) => s.accent);
  const set = useStore((s) => s.set);
  useEffect(() => {
    if (theme === 'gold' || theme === 'neon' || theme === 'sunset') return set({ accent: [...THEME_ACCENT[theme]] as [number, number, number] });
    dominant(cover).then((c) => c && set({ accent: c }));
  }, [cover, theme, set]);
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--accent', accent.join(','));
    root.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'amoled' ? '#000000' : theme === 'gold' ? '#0a0805' : '#05050a');
  }, [accent, theme]);
}

export function App() {
  const [state, setState] = useState<'loading' | 'out' | 'in'>('loading');
  const layout = useLayout();
  const free = useStore((s) => s.free);
  useAccent();

  useEffect(() => {
    (async () => {
      if (location.pathname === '/callback') {
        try {
          await handleCallback(location.href);
        } catch (e) {
          console.error(e);
        }
        history.replaceState(null, '', '/');
      }
      setState((await getToken().catch(() => null)) ? 'in' : 'out');
    })();
    // Native: OAuth returns via the pulse:// deep link.
    import('@capacitor/core').then(async ({ Capacitor }) => {
      if (!Capacitor.isNativePlatform()) return;
      const { App: CapApp } = await import('@capacitor/app');
      const { Browser } = await import('@capacitor/browser');
      CapApp.addListener('appUrlOpen', async ({ url }) => {
        if (url.includes('callback') && (await handleCallback(url))) {
          await Browser.close().catch(() => {});
          setState('in');
        }
      });
    });
  }, []);

  useEffect(() => {
    if (state !== 'in') return;
    startEngine();
    if (new URLSearchParams(location.search).get('party')) useStore.getState().go({ name: 'party' });
  }, [state]);

  if (state === 'loading') return <div className="splash"><img src="/icon.svg" alt="" /></div>;
  if (state === 'out') return <Welcome layout={layout} />;

  return (
    <div className={`app layout-${layout} ${free ? 'free' : ''}`}>
      <div className="ambient" />
      {layout === 'desktop' && <DesktopShell />}
      {layout === 'mobile' && <MobileShell />}
      {layout === 'tv' && <TvShell />}
      <CommandPalette />
      <Toast />
    </div>
  );
}

function Welcome({ layout }: { layout: string }) {
  return (
    <div className={`welcome layout-${layout}`}>
      <div className="ambient" />
      <div className="welcome-card">
        <img src="/icon.svg" alt="" className="welcome-logo" />
        <h1>
          Music, <span>live.</span>
        </h1>
        <p>A premium stage for your Spotify — dynamic colour, live visuals, stats, sleep timer, and control of every speaker in the house.</p>
        {isConfigured() ? (
          <button className="cta" onClick={login} autoFocus>
            Connect Spotify
          </button>
        ) : (
          <p className="error">
            Almost there: add <code>VITE_SPOTIFY_CLIENT_ID</code> (in <code>.env</code> locally, or Vercel → Settings → Environment
            Variables) and redeploy. See docs/DEPLOY.md.
          </p>
        )}
        <small>Uses Spotify’s official API. Playback needs Spotify Premium.</small>
      </div>
    </div>
  );
}
