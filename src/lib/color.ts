// Pulls a vivid accent from album art so the whole UI breathes with the record that's playing.
const cache = new Map<string, [number, number, number]>();

export async function dominant(url: string): Promise<[number, number, number] | null> {
  if (!url) return null;
  if (cache.has(url)) return cache.get(url)!;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = url;
  try {
    await img.decode();
  } catch {
    return null;
  }
  const c = document.createElement('canvas');
  c.width = c.height = 24;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, 24, 24);
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, 24, 24).data;
  } catch {
    return null; // tainted canvas
  }
  let best: [number, number, number] = [124, 77, 255];
  let bestScore = -1;
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    const score = sat * 2 + max / 255 - (max < 50 ? 2 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = [r, g, b];
    }
  }
  // Lift dark picks so text and glows stay legible on the dark canvas.
  const lift = Math.max(...best) < 140 ? 140 / Math.max(1, ...best) : 1;
  const out = best.map((v) => Math.min(255, Math.round(v * lift))) as [number, number, number];
  cache.set(url, out);
  return out;
}
