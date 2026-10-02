import { useEffect, useRef } from 'react';
import { useStore } from '../lib/store';

/**
 * Ambient reactive visualizer. Spotify does not expose raw audio to third-party apps, so this is a
 * generative animation that tracks play/pause, track changes and the album accent — it "feels" live
 * without pretending to be a real FFT.
 */
export function Visualizer({ variant = 'ring', className = '' }: { variant?: 'ring' | 'bars'; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext('2d')!;
    let raf = 0;
    let energy = 0;
    let seed = 1;
    let lastTrack = '';
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const draw = (t: number) => {
      const s = useStore.getState();
      const id = s.playback?.item?.id ?? '';
      if (id !== lastTrack) {
        lastTrack = id;
        seed = [...id].reduce((a, ch) => a + ch.charCodeAt(0), 7);
        energy = Math.max(energy, 0.4); // little burst on track change
      }
      const target = s.playback?.is_playing && !reduced ? 1 : 0.06;
      energy += (target - energy) * 0.05;
      const dpr = devicePixelRatio || 1;
      const w = c.clientWidth;
      const h = c.clientHeight;
      if (c.width !== w * dpr) {
        c.width = w * dpr;
        c.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const [r, g, b] = s.accent;
      const time = t / 1000;
      const beat = Math.pow(Math.max(0, Math.sin(time * Math.PI * 2 * (1.6 + (seed % 7) / 10))), 6);
      const N = variant === 'ring' ? 96 : 48;
      for (let i = 0; i < N; i++) {
        const n =
          0.5 +
          0.25 * Math.sin(time * 2.1 + i * 0.37 + seed) +
          0.15 * Math.sin(time * 5.3 + i * 1.7) +
          0.1 * Math.sin(time * 9.7 + i * 0.13 * seed);
        const amp = Math.max(0.04, n * energy * (0.7 + beat * 0.5));
        ctx.fillStyle = `rgba(${r},${g},${b},${0.35 + amp * 0.6})`;
        if (variant === 'ring') {
          const R = Math.min(w, h) / 2 - 40;
          const a = (i / N) * Math.PI * 2 - Math.PI / 2;
          const len = 6 + amp * 34;
          ctx.save();
          ctx.translate(w / 2 + Math.cos(a) * R, h / 2 + Math.sin(a) * R);
          ctx.rotate(a);
          ctx.beginPath();
          ctx.roundRect(0, -1.5, len, 3, 1.5);
          ctx.fill();
          ctx.restore();
        } else {
          const bw = w / N;
          const bh = amp * h;
          ctx.beginPath();
          ctx.roundRect(i * bw + 1, h - bh, bw - 2, bh, 2);
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [variant]);
  return <canvas ref={ref} className={`viz ${variant} ${className}`} aria-hidden />;
}
