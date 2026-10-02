// "Motion" mode: finds the official music video on YouTube and plays it muted, through YouTube's
// official embedded player, synced to the Spotify audio. Audio always comes from Spotify.
const KEY = import.meta.env.VITE_YOUTUBE_API_KEY as string | undefined;
export const youtubeEnabled = () => Boolean(KEY);

const cache = new Map<string, string | null>();

export async function findVideo(title: string, artist: string): Promise<string | null> {
  const k = `${artist}|${title}`;
  if (cache.has(k)) return cache.get(k)!;
  const q = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    maxResults: '1',
    videoEmbeddable: 'true',
    videoCategoryId: '10',
    q: `${artist} ${title} official video`,
    key: KEY!,
  });
  try {
    const r = await fetch(`https://www.googleapis.com/youtube/v3/search?${q}`);
    const j = await r.json();
    const id = j.items?.[0]?.id?.videoId ?? null;
    cache.set(k, id);
    return id;
  } catch {
    return null;
  }
}

type YTPlayer = {
  loadVideoById: (o: { videoId: string; startSeconds?: number }) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (s: number, allow: boolean) => void;
  getCurrentTime: () => number;
  mute: () => void;
  destroy: () => void;
};
declare global {
  interface Window {
    YT?: { Player: new (el: HTMLElement, o: object) => YTPlayer };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ready: Promise<void> | null = null;
export function loadYT() {
  ready ??= new Promise((res) => {
    if (window.YT?.Player) return res();
    window.onYouTubeIframeAPIReady = () => res();
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
  });
  return ready;
}

export async function createPlayer(el: HTMLElement): Promise<YTPlayer> {
  await loadYT();
  return new Promise((res) => {
    const p: YTPlayer = new window.YT!.Player(el, {
      playerVars: { controls: 0, modestbranding: 1, rel: 0, playsinline: 1, mute: 1, iv_load_policy: 3 },
      events: { onReady: () => (p.mute(), res(p)) },
    });
  });
}
