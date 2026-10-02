import { useRef } from 'react';

/**
 * Floating glass album art: feathered edges that dissolve into the backdrop (no borders), a glass
 * sheen with a slow sweeping glint, a soft colour glow underneath that breathes with the float,
 * and a gentle 3D tilt toward the mouse on desktop.
 */
export function GlassCover({ src, playing, className = '' }: { src: string; playing?: boolean; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const tilt = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    ref.current.style.setProperty('--ry', `${(x * 14).toFixed(2)}deg`);
    ref.current.style.setProperty('--rx', `${(-y * 14).toFixed(2)}deg`);
    ref.current.style.setProperty('--sx', `${(50 + x * 60).toFixed(1)}%`);
  };
  const reset = () => {
    ref.current?.style.removeProperty('--rx');
    ref.current?.style.removeProperty('--ry');
    ref.current?.style.removeProperty('--sx');
  };
  return (
    <div ref={ref} className={`glass ${playing ? 'playing' : ''} ${className}`} onPointerMove={tilt} onPointerLeave={reset}>
      {src && <img className="glass-glow" src={src} alt="" aria-hidden draggable={false} />}
      <div className="glass-body">
        {src ? <img className="glass-img" src={src} alt="" draggable={false} /> : <div className="cover-empty" />}
        <span className="glass-sheen" />
        <span className="glass-glint" />
      </div>
    </div>
  );
}
