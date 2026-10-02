// Server-side YouTube search for Motion mode. The key lives only in the Vercel env var
// YOUTUBE_API_KEY (no VITE_ prefix), so it never reaches the browser.
//   GET /api/yt?ping=1           -> { enabled }
//   GET /api/yt?q=artist%20title -> { videoId }
export async function GET(request) {
  const key = process.env.YOUTUBE_API_KEY;
  const url = new URL(request.url);
  const headers = { 'content-type': 'application/json', 'access-control-allow-origin': '*' };
  if (url.searchParams.has('ping')) return new Response(JSON.stringify({ enabled: Boolean(key) }), { headers });
  const q = (url.searchParams.get('q') ?? '').slice(0, 200).trim();
  if (!key || !q) return new Response(JSON.stringify({ videoId: null }), { status: key ? 400 : 503, headers });
  const params = new URLSearchParams({
    part: 'snippet', type: 'video', maxResults: '1', videoEmbeddable: 'true', videoCategoryId: '10',
    q: `${q} official video`, key,
  });
  try {
    const r = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
    const j = await r.json();
    const videoId = j.items?.[0]?.id?.videoId ?? null;
    // Cache at the edge for a day: the same song is looked up by many listeners.
    return new Response(JSON.stringify({ videoId }), {
      headers: { ...headers, 'cache-control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
    });
  } catch {
    return new Response(JSON.stringify({ videoId: null }), { status: 502, headers });
  }
}
