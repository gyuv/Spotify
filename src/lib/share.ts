import type { Track } from './api';
import { useStore } from './store';

/** Native share sheet on phones (Web Share API works in Capacitor WebViews too), clipboard elsewhere. */
export async function share(title: string, text: string, url: string) {
  try {
    if (navigator.share) return await navigator.share({ title, text, url });
    await navigator.clipboard.writeText(url);
    useStore.getState().notify('Link copied');
  } catch {
    /* user cancelled */
  }
}

export const shareTrack = (t: Track) =>
  share(t.name, `🎧 ${t.name} — ${t.artists.map((a) => a.name).join(', ')} · via RY Music`, `https://open.spotify.com/track/${t.id}`);
