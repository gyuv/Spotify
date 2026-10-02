// Renders a 1080×1920 "story" image for a lyric line (blurred art, cover, gold serif quote) and
// hands it to the native share sheet, falling back to a download.
import { art, artists, type Track } from './api';
import { useStore } from './store';

function loadImg(src: string) {
  return new Promise<HTMLImageElement | null>((res) => {
    if (!src) return res(null);
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => res(i);
    i.onerror = () => res(null);
    i.src = src;
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const out: string[] = [];
  let line = '';
  for (const w of text.split(/\s+/)) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > max && line) {
      out.push(line);
      line = w;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}

export async function lyricCard(t: Track, lines: string[]): Promise<Blob | null> {
  const W = 1080;
  const H = 1920;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const img = await loadImg(art(t.album.images, 640));
  const gold = ctx.createLinearGradient(0, 0, W, H);
  gold.addColorStop(0, '#fff3c4');
  gold.addColorStop(0.35, '#f5c451');
  gold.addColorStop(0.7, '#c8902a');
  gold.addColorStop(1, '#ffe08a');

  ctx.fillStyle = '#0a0805';
  ctx.fillRect(0, 0, W, H);
  if (img) {
    ctx.save();
    ctx.filter = 'blur(80px) saturate(1.5) brightness(.45)';
    ctx.drawImage(img, -400, -200, H + 400, H + 400);
    ctx.restore();
    ctx.fillStyle = 'rgba(10,8,5,.45)'; // also darkens where canvas filters are unsupported (Safari)
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.6)';
    ctx.shadowBlur = 60;
    ctx.beginPath();
    ctx.roundRect(140, 220, 800, 800, 40);
    ctx.clip();
    ctx.drawImage(img, 140, 220, 800, 800);
    ctx.restore();
  }

  ctx.textAlign = 'left';
  ctx.fillStyle = gold;
  ctx.font = 'italic 800 76px "Playfair Display", Georgia, serif';
  const text = lines.join(' ').trim();
  const wrapped = wrap(ctx, `“${text}”`, W - 240).slice(0, 7);
  wrapped.forEach((l, i) => ctx.fillText(l, 120, 1160 + i * 96));

  const y = 1160 + wrapped.length * 96 + 40;
  ctx.fillStyle = '#f4f4f8';
  ctx.font = '700 44px Inter, system-ui, sans-serif';
  ctx.fillText(t.name.slice(0, 40), 120, y);
  ctx.fillStyle = 'rgba(244,244,248,.6)';
  ctx.font = '500 38px Inter, system-ui, sans-serif';
  ctx.fillText(artists(t).slice(0, 48), 120, y + 56);

  ctx.fillStyle = gold;
  ctx.font = '800 40px "Playfair Display", Georgia, serif';
  ctx.fillText('RY Music', 120, H - 120);
  ctx.fillRect(120, H - 100, 120, 4);

  return new Promise((res) => {
    try {
      c.toBlob((b) => res(b), 'image/png');
    } catch {
      res(null); // tainted canvas if the art host disallows CORS
    }
  });
}

export async function shareLyric(t: Track, lines: string[]) {
  const { notify } = useStore.getState();
  const blob = await lyricCard(t, lines);
  if (!blob) return notify('Could not create the lyric card');
  const file = new File([blob], `ry-lyric-${t.id}.png`, { type: 'image/png' });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: t.name, text: `${t.name} — ${artists(t)} · via RY Music` });
      return;
    }
  } catch {
    return; // user cancelled
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  notify('Lyric card saved');
}
