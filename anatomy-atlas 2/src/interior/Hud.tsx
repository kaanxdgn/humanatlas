import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Lightbulb, LogOut } from 'lucide-react';
import { useExtrasStore } from '@/store/useExtrasStore';
import type { OrganDef } from './types';

/** Yürüme girdisi: düğmeler + klavye (Rig her karede okur). */
export const walk = { dir: 0, btn: 0, keys: new Set<string>() };
const syncWalk = (): void => {
  const f = walk.keys.has('fwd') ? 1 : 0;
  const b = walk.keys.has('back') ? 1 : 0;
  walk.dir = Math.max(-1, Math.min(1, f - b + walk.btn));
};

export default function Hud({ organ }: { organ: OrganDef }) {
  const it = useExtrasStore((s) => s.interior)!;
  const [hint, setHint] = useState(true);
  const total = organ.stops.length;
  const stop = organ.stops[it.stop]!;
  const multi = organ.chapters.length > 1;
  const tabs = organ.tabs ?? organ.chapters.map((c) => c.name);

  const go = (i: number): void => {
    const c = Math.max(0, Math.min(total - 1, i));
    useExtrasStore.getState().gotoStop(c, organ.stops[c]!.chapter);
    setHint(false);
  };
  const exit = (): void => useExtrasStore.getState().exitInterior();

  useEffect(() => {
    const idx = (): number => useExtrasStore.getState().interior?.stop ?? 0;
    const fwdKey = (k: string): boolean => k === 'ArrowUp' || k === 'w' || k === 'W';
    const backKey = (k: string): boolean => k === 'ArrowDown' || k === 's' || k === 'S';
    const down = (e: KeyboardEvent): void => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key;
      let used = true;
      if (k === 'Escape') exit();
      else if (k === 'ArrowRight' || k === ' ' || k === 'Enter') go(idx() + 1);
      else if (k === 'ArrowLeft') go(idx() - 1);
      else if (fwdKey(k)) { walk.keys.add('fwd'); syncWalk(); }
      else if (backKey(k)) { walk.keys.add('back'); syncWalk(); }
      else used = false;
      if (used) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const up = (e: KeyboardEvent): void => {
      if (fwdKey(e.key)) walk.keys.delete('fwd');
      else if (backKey(e.key)) walk.keys.delete('back');
      else return;
      syncWalk();
    };
    window.addEventListener('keydown', down, true);
    window.addEventListener('keyup', up, true);
    return () => {
      window.removeEventListener('keydown', down, true);
      window.removeEventListener('keyup', up, true);
      walk.keys.clear();
      walk.btn = 0;
      syncWalk();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organ]);

  useEffect(() => {
    const t = window.setTimeout(() => setHint(false), 9000);
    return () => window.clearTimeout(t);
  }, []);

  const hold = (v: number) => ({
    onPointerDown: (e: React.PointerEvent): void => {
      e.currentTarget.setPointerCapture(e.pointerId);
      walk.btn = v;
      syncWalk();
      setHint(false);
    },
    onPointerUp: (): void => { walk.btn = 0; syncWalk(); },
    onPointerCancel: (): void => { walk.btn = 0; syncWalk(); },
  });

  const chapterName = organ.chapters[stop.chapter]!.name;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] text-white">
      {/* Üst bar */}
      <div className="flex items-start justify-between gap-3 p-3 sm:p-5">
        <div className="glass-strong pointer-events-auto max-w-[70vw] rounded-2xl px-4 py-2.5">
          <p className="eyebrow" style={{ color: organ.accent }}>{organ.nameTR} · iç gezinti</p>
          <p className="mt-0.5 text-[13px] text-white/80">{chapterName}</p>
        </div>
        <button
          type="button"
          onClick={exit}
          className="glass-strong pointer-events-auto inline-flex items-center gap-2 rounded-full px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-white/85 hover:text-white"
        >
          <LogOut size={14} aria-hidden="true" />
          Dışarı çık <span className="hidden text-white/45 sm:inline">Esc</span>
        </button>
      </div>

      {/* Bölüm sekmeleri (kalp: sol / sağ) */}
      {multi && (
        <div className="pointer-events-auto absolute left-1/2 top-[76px] hidden -translate-x-1/2 gap-1 rounded-full bg-black/45 p-1 backdrop-blur-md sm:flex lg:top-5">
          {organ.chapters.map((c, ci) => {
            const first = organ.stops.findIndex((s) => s.chapter === ci);
            const active = stop.chapter === ci;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => go(first)}
                className="rounded-full px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] transition-colors"
                style={active ? { background: organ.accent, color: '#0a0c14' } : { color: 'rgba(255,255,255,.7)' }}
              >
                {tabs[ci]}
              </button>
            );
          })}
        </div>
      )}

      {/* Anlatım kartı */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-stretch gap-3 p-3 sm:flex-row sm:items-end sm:justify-between sm:p-5">
        <section
          className="glass-strong pointer-events-auto w-full max-w-[460px] rounded-3xl p-4 sm:p-5"
          aria-live="polite"
          aria-label="Bulunduğun yapı"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="eyebrow" style={{ color: organ.accent }}>
              Durak {it.stop + 1} / {total}
            </p>
            <div className="flex items-center gap-1.5" role="tablist" aria-label="Duraklar">
              {organ.stops.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={i === it.stop}
                  aria-label={s.title}
                  title={s.title}
                  onClick={() => go(i)}
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: i === it.stop ? 20 : 8,
                    background: i === it.stop ? organ.accent : 'rgba(255,255,255,.28)',
                  }}
                />
              ))}
            </div>
          </div>
          <h2 className="mt-2 font-display text-xl leading-tight sm:text-2xl">{stop.title}</h2>
          <p className="text-[12px] italic text-white/50" lang="la">{stop.latin}</p>
          <p className="mt-2.5 max-h-[24vh] overflow-y-auto pr-1 text-[13.5px] leading-relaxed text-white/85 sm:max-h-[30vh]">{stop.text}</p>
          <p className="mt-2.5 flex gap-2 text-[12px] leading-relaxed text-white/65">
            <Lightbulb size={14} className="mt-0.5 shrink-0" style={{ color: organ.accent }} aria-hidden="true" />
            <span>{stop.fact}</span>
          </p>
          <div className="mt-3.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => go(it.stop - 1)}
              disabled={it.stop === 0}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-white/85 transition-colors enabled:hover:border-white/50 disabled:opacity-30"
            >
              <ChevronLeft size={14} aria-hidden="true" /> Geri
            </button>
            {it.stop < total - 1 ? (
              <button
                type="button"
                onClick={() => go(it.stop + 1)}
                className="inline-flex items-center gap-1.5 rounded-full px-5 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[#0a0c14]"
                style={{ background: organ.accent }}
              >
                İlerle <ChevronRight size={14} aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={exit}
                className="inline-flex items-center gap-1.5 rounded-full px-5 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[#0a0c14]"
                style={{ background: organ.accent }}
              >
                Yolculuğu bitir
              </button>
            )}
          </div>
        </section>

        {/* Yürüme düğmeleri */}
        <div className="pointer-events-auto flex flex-col items-end gap-2 self-end">
          {hint && (
            <p className="glass-strong rounded-2xl px-3 py-2 text-right text-[11px] leading-snug text-white/75">
              Tekerlek / ↑ ↓ / W S: ilerle · Sürükle: etrafına bak<br />
              ← → : önceki / sonraki durak
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Geri yürü"
              className="glass-strong grid h-11 w-11 touch-none place-items-center rounded-full"
              {...hold(-1)}
            >
              <ArrowDown size={18} />
            </button>
            <button
              type="button"
              aria-label="İleri yürü"
              className="glass-strong grid h-11 w-11 touch-none place-items-center rounded-full"
              {...hold(1)}
            >
              <ArrowUp size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
