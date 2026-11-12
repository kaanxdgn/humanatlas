import { useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GripVertical, Layers, RotateCcw, ScanLine } from 'lucide-react';
import { LAYER_KEYS, LAYER_LABELS, SECTION_CONFIG, SYSTEM_BY_KEY, type LayerKey } from '@/data/systemsConfig';
import { useAtlasStore } from '@/store/useAtlasStore';
import { clamp } from '@/utils/math';

/** Masaüstünde bilgi paneli açıldığında kaydırıcı bankası bu kadar sola kayar (panel 420 + boşluk). */
const PANEL_SHIFT = 444;

const POS_KEY = 'atlas.layerPanelPos';
interface Offset { x: number; y: number }
const loadOffset = (): Offset => {
  try {
    const v = JSON.parse(localStorage.getItem(POS_KEY) ?? 'null') as Offset | null;
    if (v && Number.isFinite(v.x) && Number.isFinite(v.y)) return v;
  } catch { /* yoksay */ }
  return { x: 0, y: 0 };
};

interface VSliderProps {
  label: string;
  value: number;
  color: string;
  icon: (typeof SYSTEM_BY_KEY)[LayerKey]['icon'];
  onChange: (v: number) => void;
}

/** Erişilebilir dikey kaydırıcı: işaretçi sürükleme + klavye (oklar, PageUp/Down, Home/End). */
function VSlider({ label, value, color, icon: Icon, onChange }: VSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const pct = Math.round(value * 100);

  const fromY = (clientY: number): void => {
    const r = trackRef.current?.getBoundingClientRect();
    if (!r) return;
    onChange(Math.round(clamp(1 - (clientY - r.top) / r.height, 0, 1) * 100) / 100);
  };

  const end = (e: ReactPointerEvent<HTMLDivElement>): void => {
    dragging.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    let next: number | null = null;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') next = value + 0.05;
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') next = value - 0.05;
    else if (e.key === 'PageUp') next = value + 0.25;
    else if (e.key === 'PageDown') next = value - 0.25;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = 1;
    if (next !== null) {
      e.preventDefault();
      onChange(Math.round(clamp(next, 0, 1) * 100) / 100);
    }
  };

  return (
    <div className="flex w-11 flex-col items-center gap-2">
      <span className="font-mono text-[10px] tabular-nums text-white/60">{pct}</span>
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label={`${label} katmanı görünürlüğü`}
        aria-orientation="vertical"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={`${label} yüzde ${pct}`}
        onKeyDown={onKeyDown}
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
        className="relative h-36 w-6 cursor-pointer touch-none rounded-full bg-white/10 outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-white/60"
      >
        <div
          className="absolute inset-x-0 bottom-0 rounded-full"
          style={{ height: `${pct}%`, background: color, opacity: 0.85, boxShadow: `0 0 14px -2px ${color}` }}
        />
        <div
          className="absolute left-1/2 h-1.5 w-8 -translate-x-1/2 rounded-full bg-white shadow-md"
          style={{ bottom: `calc(${pct}% - 3px)` }}
        />
      </div>
      <Icon size={14} aria-hidden="true" style={{ color }} />
      <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-white/50">{label}</span>
    </div>
  );
}

/**
 * X-ray katman kaydırıcıları: Cilt → Kas → Organ → İskelet (+ Damar, Sinir).
 * Dokunulunca bölüm manuel moda geçer (enterManualLayers); bölüm değişince senaryo geri gelir.
 */
export default function LayerSlider() {
  const layerOpacity = useAtlasStore((s) => s.layerOpacity);
  const freeExplore = useAtlasStore((s) => s.freeExplore);
  const section = useAtlasStore((s) => s.activeSection);
  const loaderDone = useAtlasStore((s) => s.loaderDone);
  const selectedId = useAtlasStore((s) => s.selectedId);
  const mobile = useAtlasStore((s) => s.isMobile);
  const reduced = useAtlasStore((s) => s.reducedMotion);
  const [open, setOpen] = useState(() => !useAtlasStore.getState().isMobile);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState<Offset>(loadOffset);
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number; r: DOMRect } | null>(null);
  const [dragging, setDragging] = useState(false);

  const onGripDown = (e: ReactPointerEvent<HTMLDivElement>): void => {
    const el = wrapRef.current;
    if (!el) return;
    // kaydırıcılara ve düğmelere basınca sürükleme başlamasın; panelin geri kalanı tutamaç sayılır
    if ((e.target as HTMLElement).closest('[role="slider"], button, a, input')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { sx: e.clientX, sy: e.clientY, ox: offset.x, oy: offset.y, r: el.getBoundingClientRect() };
    setDragging(true);
  };
  const onGripMove = (e: ReactPointerEvent<HTMLDivElement>): void => {
    const d = drag.current;
    if (!d) return;
    const m = 8;
    const dx = clamp(e.clientX - d.sx, m - d.r.left, window.innerWidth - m - d.r.right);
    const dy = clamp(e.clientY - d.sy, m - d.r.top, window.innerHeight - m - d.r.bottom);
    setOffset({ x: d.ox + dx, y: d.oy + dy });
  };
  const onGripUp = (): void => {
    if (!drag.current) return;
    drag.current = null;
    setDragging(false);
    try { localStorage.setItem(POS_KEY, JSON.stringify(offset)); } catch { /* yoksay */ }
  };
  const resetPos = (): void => {
    setOffset({ x: 0, y: 0 });
    try { localStorage.removeItem(POS_KEY); } catch { /* yoksay */ }
  };

  const show = loaderDone && !(mobile && selectedId !== null);
  const panelOpen = selectedId !== null && !mobile;
  const base = SECTION_CONFIG[section].layers;

  const effective = (key: LayerKey): number =>
    freeExplore ? layerOpacity[key] : base[key] * layerOpacity[key];

  const setLevel = (key: LayerKey, v: number): void => {
    const st = useAtlasStore.getState();
    st.enterManualLayers();
    st.setLayerOpacity(key, v);
  };

  const xray = (): void => {
    const st = useAtlasStore.getState();
    st.enterManualLayers();
    for (const key of LAYER_KEYS) st.setLayerOpacity(key, SECTION_CONFIG.final.layers[key]);
  };

  return (
    <AnimatePresence>
      {show && (
        <div
          key="layer-slider"
          className={
            mobile
              ? 'pe-none fixed right-3 top-[4.5rem] z-30'
              : 'pe-none fixed right-4 top-1/2 z-30 -translate-y-1/2 max-[1179px]:data-[panel=true]:hidden'
          }
          data-panel={panelOpen}
          ref={wrapRef}
          style={{ translate: `${offset.x}px ${offset.y}px` }}
        >
          <motion.div
            initial={{ opacity: 0, x: reduced ? 0 : 40 }}
            animate={{ opacity: 1, x: panelOpen ? -PANEL_SHIFT : 0 }}
            exit={{ opacity: 0, x: reduced ? 0 : 40 }}
            transition={{ duration: reduced ? 0 : 0.8, ease: [0.16, 1, 0.3, 1] }}
            title="Panelin boş bir yerinden tutup istediğin yere sürükle · çift tıkla: eski yerine al"
            onPointerDown={onGripDown}
            onPointerMove={onGripMove}
            onPointerUp={onGripUp}
            onPointerCancel={onGripUp}
            onDoubleClick={(e) => {
              if (!(e.target as HTMLElement).closest('[role="slider"], button')) resetPos();
            }}
            className={`pe-auto glass-strong touch-none select-none rounded-3xl p-3 ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          >
            <div
              role="presentation"
              className="-mt-1 mb-1 flex items-center justify-center rounded-lg py-1 text-white/35 transition-colors hover:text-white/70"
            >
              <GripVertical size={14} aria-hidden="true" className="rotate-90" />
            </div>
            <button
              type="button"
              aria-expanded={open}
              aria-controls="layer-slider-body"
              onClick={() => setOpen((o) => !o)}
              className="flex w-full items-center justify-between gap-6 rounded-xl px-1 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-white/70 transition-colors hover:text-white"
            >
              <span className="inline-flex items-center gap-2">
                <Layers size={14} aria-hidden="true" className="text-accent" />
                Katmanlar
              </span>
              <span aria-hidden="true">{open ? '–' : '+'}</span>
            </button>

            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  id="layer-slider-body"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: reduced ? 0 : 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div role="group" aria-label="Katman görünürlüğü" className="flex items-end gap-1 px-1 pb-2 pt-4">
                    {LAYER_KEYS.map((key) => {
                      const sys = SYSTEM_BY_KEY[key];
                      return (
                        <VSlider
                          key={key}
                          label={LAYER_LABELS[key]}
                          value={effective(key)}
                          color={sys.accent}
                          icon={sys.icon}
                          onChange={(v) => setLevel(key, v)}
                        />
                      );
                    })}
                  </div>
                  <div className="mt-1 flex gap-2 border-t border-white/10 pt-3">
                    <button
                      type="button"
                      onClick={xray}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-white/15 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/80 transition-colors hover:border-accent/60 hover:text-accent"
                    >
                      <ScanLine size={12} aria-hidden="true" />
                      X-Ray
                    </button>
                    <button
                      type="button"
                      onClick={() => useAtlasStore.getState().resetLayers()}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-white/15 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/80 transition-colors hover:border-white/40 hover:text-white"
                    >
                      <RotateCcw size={12} aria-hidden="true" />
                      Sıfırla
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
