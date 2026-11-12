import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import {
  FOCUS_MODES,
  SYSTEMS,
  type FocusMode,
  type SectionId,
  type SystemConfig,
} from '@/data/systemsConfig';
import { goToSection } from '@/hooks/useScrollSystemSync';
import { useAtlasStore } from '@/store/useAtlasStore';

const MAX_SIZE = 74;
/** İmlecin etkisinin yayıldığı mesafe (px) */
const RANGE = 150;

type FocusKey = Exclude<FocusMode, 'none'>;
const FOCUS_KEYS: readonly FocusKey[] = ['respiratory', 'digestive'] as const;

interface DockItemProps {
  system: SystemConfig;
  mouseX: MotionValue<number>;
  base: number;
  active: boolean;
  tabIndex: 0 | -1;
  register: (el: HTMLButtonElement | null) => void;
  onFocus: () => void;
  onActivate: () => void;
}

/** macOS dock tarzı: imlece yakınlığa göre büyüyen buton. */
function DockItem({ system, mouseX, base, active, tabIndex, register, onFocus, onActivate }: DockItemProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const distance = useTransform(mouseX, (val) => {
    const r = wrapRef.current?.getBoundingClientRect();
    return r ? val - r.x - r.width / 2 : Infinity;
  });
  const raw = useTransform(distance, [-RANGE, 0, RANGE], [base, MAX_SIZE, base]);
  const size = useSpring(raw, { mass: 0.1, stiffness: 170, damping: 14 });
  const iconScale = useTransform(size, [base, MAX_SIZE], [1, 1.5]);
  const Icon = system.icon;

  return (
    <motion.div
      ref={wrapRef}
      style={{ width: size, height: size }}
      className="group relative flex items-center justify-center"
    >
      <button
        ref={register}
        type="button"
        aria-label={`${system.labelTR} (${system.labelLatin})`}
        aria-pressed={active}
        tabIndex={tabIndex}
        onFocus={onFocus}
        onClick={onActivate}
        className="flex h-full w-full items-center justify-center rounded-2xl border transition-colors duration-300"
        style={{
          borderColor: active ? `${system.accent}99` : 'rgba(255,255,255,0.1)',
          background: active ? `${system.accent}24` : 'rgba(255,255,255,0.04)',
          color: active ? system.accent : 'rgba(255,255,255,0.78)',
          boxShadow: active ? `0 0 24px -6px ${system.accent}` : undefined,
        }}
      >
        <motion.span style={{ scale: iconScale }} className="flex">
          <Icon size={22} strokeWidth={1.6} aria-hidden="true" />
        </motion.span>
      </button>

      <span
        aria-hidden="true"
        className="glass-strong pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        {system.labelTR}
      </span>

      {active && (
        <motion.span
          layoutId="dock-dot"
          aria-hidden="true"
          className="absolute -bottom-2 h-1 w-1 rounded-full"
          style={{ background: system.accent, boxShadow: `0 0 8px ${system.accent}` }}
        />
      )}
    </motion.div>
  );
}

/**
 * Ekranın altındaki cam sistem seçici.
 *  - Tıklama: ilgili bölüme Lenis ile kayar (+ sahne geçişi)
 *  - Klavye: ok tuşları / Home / End ile gezinme (roving tabindex)
 *  - Organ bölümünde Solunum / Sindirim odak modu düğmeleri belirir
 */
export default function SystemDock() {
  const activeSection = useAtlasStore((s) => s.activeSection);
  const focusMode = useAtlasStore((s) => s.focusMode);
  const setFocusMode = useAtlasStore((s) => s.setFocusMode);
  const loaderDone = useAtlasStore((s) => s.loaderDone);
  const selectedId = useAtlasStore((s) => s.selectedId);
  const mobile = useAtlasStore((s) => s.isMobile);
  const reduced = useAtlasStore((s) => s.reducedMotion);

  const mouseX = useMotionValue(Infinity);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const activeIdx = SYSTEMS.findIndex((s) => s.section === activeSection);
  const [focusIdx, setFocusIdx] = useState(0);

  const base = mobile ? 42 : 48;
  const magnify = !mobile && !reduced;
  // Mobilde bilgi paneli (bottom-sheet) açıkken dock gizlenir
  const hidden = !loaderDone || (mobile && selectedId !== null);
  const showFocus = !hidden && (activeSection === 'organs' || activeSection === 'final' || focusMode !== 'none');

  useEffect(() => {
    if (activeIdx >= 0) setFocusIdx(activeIdx);
  }, [activeIdx]);

  const onKeyDown = (e: KeyboardEvent<HTMLElement>): void => {
    const n = SYSTEMS.length;
    const current = itemRefs.current.findIndex((el) => el === document.activeElement);
    const from = current >= 0 ? current : focusIdx;
    let next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (from + 1) % n;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (from - 1 + n) % n;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    if (next >= 0) {
      e.preventDefault();
      setFocusIdx(next);
      itemRefs.current[next]?.focus();
    }
  };

  const activate = (section: SectionId): void => goToSection(section);

  return (
    <div className="pe-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <AnimatePresence>
        {showFocus && (
          <motion.div
            role="group"
            aria-label="Odak modu"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: reduced ? 0 : 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="pe-auto flex items-center gap-2"
          >
            <span className="mono-label mr-1 hidden sm:inline">Odak</span>
            {FOCUS_KEYS.map((key) => {
              const cfg = FOCUS_MODES[key];
              const on = focusMode === key;
              const Icon = cfg.icon;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setFocusMode(on ? 'none' : key)}
                  className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors"
                  style={{
                    color: on ? cfg.accent : 'rgba(255,255,255,0.75)',
                    borderColor: on ? `${cfg.accent}99` : undefined,
                    boxShadow: on ? `0 0 20px -6px ${cfg.accent}` : undefined,
                  }}
                >
                  <Icon size={13} aria-hidden="true" />
                  {cfg.labelTR}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.nav
        role="toolbar"
        aria-label="Sistem seçici"
        aria-orientation="horizontal"
        initial={{ y: 100, opacity: 0 }}
        animate={hidden ? { y: 100, opacity: 0 } : { y: 0, opacity: 1 }}
        transition={{ duration: reduced ? 0 : 0.9, ease: [0.16, 1, 0.3, 1], delay: hidden || reduced ? 0 : 0.25 }}
        onKeyDown={onKeyDown}
        onPointerMove={(e) => {
          if (magnify && e.pointerType === 'mouse') mouseX.set(e.clientX);
        }}
        onPointerLeave={() => mouseX.set(Infinity)}
        className="pe-auto glass-strong flex items-end gap-1.5 rounded-[26px] px-3 pb-4 pt-3 sm:gap-2"
        style={{ pointerEvents: hidden ? 'none' : 'auto' }}
      >
        {SYSTEMS.map((system, i) => (
          <DockItem
            key={system.key}
            system={system}
            mouseX={mouseX}
            base={base}
            active={i === activeIdx}
            tabIndex={i === focusIdx ? 0 : -1}
            register={(el) => {
              itemRefs.current[i] = el;
            }}
            onFocus={() => setFocusIdx(i)}
            onActivate={() => activate(system.section)}
          />
        ))}
      </motion.nav>
    </div>
  );
}
