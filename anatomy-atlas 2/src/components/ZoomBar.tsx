import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { Minus, Plus } from 'lucide-react';
import { useAtlasStore } from '@/store/useAtlasStore';
import { cameraApi, ZOOM_MAX, ZOOM_MIN } from '@/utils/cameraApi';
import { clamp } from '@/utils/math';

const LN_MIN = Math.log(ZOOM_MIN);
const LN_MAX = Math.log(ZOOM_MAX);

/** mesafe → 0 (uzak) … 1 (yakın) */
const toT = (d: number): number => clamp(1 - (Math.log(clamp(d, ZOOM_MIN, ZOOM_MAX)) - LN_MIN) / (LN_MAX - LN_MIN), 0, 1);
const toDist = (t: number): number => Math.exp(LN_MIN + (1 - clamp(t, 0, 1)) * (LN_MAX - LN_MIN));

/**
 * Yaklaştırma / uzaklaştırma çubuğu: + / − düğmeleri ve logaritmik dikey kaydırıcı.
 * Kamera başka yolla (sürükleme, bölüm geçişi) değişince çubuk kendiliğinden güncellenir.
 */
export default function ZoomBar() {
  const loaderDone = useAtlasStore((s) => s.loaderDone);
  const selectedId = useAtlasStore((s) => s.selectedId);
  const mobile = useAtlasStore((s) => s.isMobile);
  const [t, setT] = useState(0.4);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  // kameradan oku (sürüklerken kendi değerimizi koru)
  useEffect(() => {
    let raf = 0;
    const tick = (): void => {
      if (!dragging.current) {
        const next = toT(cameraApi.getDistance());
        setT((cur) => (Math.abs(cur - next) > 0.004 ? next : cur));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const apply = (next: number): void => {
    const v = clamp(next, 0, 1);
    setT(v);
    cameraApi.setDistance(toDist(v));
  };

  const fromY = (clientY: number): void => {
    const r = trackRef.current?.getBoundingClientRect();
    if (!r) return;
    apply(1 - (clientY - r.top) / r.height);
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>): void => {
    const step = e.shiftKey ? 0.15 : 0.05;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight' || e.key === '+') apply(t + step);
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === '-') apply(t - step);
    else if (e.key === 'Home') apply(1);
    else if (e.key === 'End') apply(0);
    else return;
    e.preventDefault();
  };

  const end = (e: ReactPointerEvent<HTMLDivElement>): void => {
    dragging.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  if (!loaderDone || (mobile && selectedId !== null)) return null;
  const pct = Math.round(t * 100);

  return (
    <div className="fixed left-2 top-1/2 z-30 -translate-y-1/2 sm:left-3">
      <div className="glass-strong flex w-11 flex-col items-center gap-2 rounded-full px-1 py-3">
        <button
          type="button"
          aria-label="Yaklaştır"
          onClick={() => apply(t + 0.1)}
          className="grid h-7 w-7 place-items-center rounded-full text-white/75 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Plus size={15} aria-hidden="true" />
        </button>
        <div
          ref={trackRef}
          role="slider"
          tabIndex={0}
          aria-label="Yakınlaştırma"
          aria-orientation="vertical"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          onKeyDown={onKey}
          onPointerDown={(e) => {
            dragging.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            fromY(e.clientY);
          }}
          onPointerMove={(e) => {
            if (dragging.current) fromY(e.clientY);
          }}
          onPointerUp={end}
          onPointerCancel={end}
          className="relative h-28 w-5 cursor-pointer touch-none rounded-full bg-white/10 outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <div
            className="absolute inset-x-1.5 bottom-0 rounded-full bg-accent"
            style={{ height: `${pct}%`, opacity: 0.8, boxShadow: '0 0 12px -2px var(--accent, #8AB4FF)' }}
          />
          <div
            className="absolute left-1/2 h-1.5 w-7 -translate-x-1/2 rounded-full bg-white shadow-md"
            style={{ bottom: `calc(${pct}% - 3px)` }}
          />
        </div>
        <button
          type="button"
          aria-label="Uzaklaştır"
          onClick={() => apply(t - 0.1)}
          className="grid h-7 w-7 place-items-center rounded-full text-white/75 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Minus size={15} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
