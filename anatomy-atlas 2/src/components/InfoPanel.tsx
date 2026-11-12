import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  AnimatePresence,
  animate,
  motion,
  useDragControls,
  useMotionValue,
  type PanInfo,
  type Variants,
} from 'framer-motion';
import { ArrowUpRight, Compass, Lightbulb, LogIn, MapPin, X, Zap, type LucideIcon } from 'lucide-react';
import { hasInterior } from '@/interior/ids';
import { useExtrasStore } from '@/store/useExtrasStore';
import { getAnatomyItem, type AnatomyItem } from '@/data/anatomyData';
import { SYSTEM_BY_KEY } from '@/data/systemsConfig';
import { goToSection } from '@/hooks/useScrollSystemSync';
import { useAtlasStore } from '@/store/useAtlasStore';

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];
const FOCUSABLE = 'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])';

type Snap = 'peek' | 'full';

const closePanel = (): void => useAtlasStore.getState().clearSelection();
/** "Genel görünüme dön": seçimi kapatır ve Genel Bakış bölümüne döner. */
const goOverview = (): void => goToSection('skin');

/** İçerik kademeli (stagger) belirir; hareket azaltmada anında görünür. */
function makeVariants(reduced: boolean): { container: Variants; child: Variants } {
  return {
    container: {
      hidden: {},
      show: { transition: { staggerChildren: reduced ? 0 : 0.06, delayChildren: reduced ? 0 : 0.12 } },
    },
    child: {
      hidden: { opacity: reduced ? 1 : 0, y: reduced ? 0 : 14 },
      show: { opacity: 1, y: 0, transition: { duration: reduced ? 0 : 0.55, ease: EASE_OUT } },
    },
  };
}

/**
 * Erişilebilirlik: ESC ile kapatma, Tab odak tuzağı (odak panel dışındaysa içeri alır),
 * açılışta başlığa odak, kapanışta önceki odağı geri verme.
 */
function usePanelA11y(
  panelRef: RefObject<HTMLElement>,
  headingRef: RefObject<HTMLElement>,
  id: string,
): void {
  useEffect(() => {
    const prev = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => {
      if (prev && prev.isConnected) prev.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [id, headingRef]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.defaultPrevented) return;
      const st = useAtlasStore.getState();
      if (st.paletteOpen) return;
      if (e.key === 'Escape') {
        st.clearSelection();
        return;
      }
      if (e.key !== 'Tab') return;
      const root = panelRef.current;
      if (!root) return;
      const nodes = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (n) => n.offsetParent !== null,
      );
      if (nodes.length === 0) {
        e.preventDefault();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      const inside = active instanceof Node && root.contains(active);
      if (e.shiftKey && (!inside || active === first || active === headingRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (!inside || active === last)) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panelRef, headingRef]);
}

/* ───────── Ortak parçalar ───────── */

function PanelHeader({
  item,
  headingRef,
  reduced,
}: {
  item: AnatomyItem;
  headingRef: RefObject<HTMLHeadingElement>;
  reduced: boolean;
}) {
  const sys = SYSTEM_BY_KEY[item.system];
  return (
    <motion.div
      key={item.id}
      initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.45, ease: EASE_OUT }}
      className="px-6 pt-3"
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em]"
          style={{ color: sys.accent }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: sys.accent, boxShadow: `0 0 8px ${sys.accent}` }}
            aria-hidden="true"
          />
          {sys.labelTR}
        </span>
        <button
          type="button"
          aria-label="Paneli kapat"
          onClick={closePanel}
          className="rounded-full p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="mt-3 font-display text-3xl font-light leading-tight tracking-tight text-white outline-none"
      >
        {item.nameTR}
      </h2>
      <p className="mt-1 font-mono text-xs italic text-white/55">{item.nameLatin}</p>
    </motion.div>
  );
}

function Block({
  icon: Icon,
  label,
  color,
  children,
}: {
  icon: LucideIcon;
  label: string;
  color: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <span
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]"
        style={{ color }}
      >
        <Icon size={14} aria-hidden="true" />
      </span>
      <div>
        <dt className="mono-label">{label}</dt>
        <dd className="mt-1 text-sm leading-relaxed text-white/80">{children}</dd>
      </div>
    </div>
  );
}

function PanelBody({ item, reduced }: { item: AnatomyItem; reduced: boolean }) {
  const sys = SYSTEM_BY_KEY[item.system];
  const interiorId = hasInterior(item.id) ? item.id : null;
  const { container, child } = makeVariants(reduced);
  const related = item.related
    .map((rid) => getAnatomyItem(rid))
    .filter((r): r is AnatomyItem => r !== undefined);

  return (
    <div
      data-lenis-prevent
      data-sheet-body
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5"
    >
      <motion.div key={item.id} variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.p variants={child} className="text-[15px] font-light leading-relaxed text-white/80">
          {item.summary}
        </motion.p>

        <motion.dl variants={child} className="grid gap-4">
          <Block icon={Zap} label="Temel görevi" color={sys.accent}>
            {item.function}
          </Block>
          <Block icon={MapPin} label="Konumu" color={sys.accent}>
            {item.location}
          </Block>
        </motion.dl>

        <motion.section variants={child} aria-label="Hızlı bilgiler">
          <h3 className="mono-label flex items-center gap-2">
            <Lightbulb size={12} aria-hidden="true" style={{ color: sys.accent }} />
            Hızlı bilgiler
          </h3>
          <ol className="mt-3 space-y-3">
            {item.facts.map((fact, i) => (
              <li key={fact} className="flex gap-3 border-t border-white/10 pt-3">
                <span className="font-mono text-[11px] tabular-nums" style={{ color: sys.accent }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-sm leading-relaxed text-white/75">{fact}</span>
              </li>
            ))}
          </ol>
        </motion.section>

        {related.length > 0 && (
          <motion.section variants={child} aria-label="İlişkili yapılar">
            <h3 className="mono-label">İlişkili yapılar</h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {related.map((r) => {
                const rs = SYSTEM_BY_KEY[r.system];
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => useAtlasStore.getState().selectStructure(r.id)}
                      className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/80 transition-colors hover:border-white/30 hover:bg-white/10 hover:text-white"
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: rs.accent }}
                        aria-hidden="true"
                      />
                      {r.nameTR}
                      <ArrowUpRight
                        size={12}
                        aria-hidden="true"
                        className="opacity-50 transition-transform group-hover:-translate-y-px group-hover:translate-x-px group-hover:opacity-100"
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.section>
        )}

        <motion.div variants={child} className="flex flex-wrap gap-3 pt-2">
          {interiorId && (
            <button
              type="button"
              onClick={() => useExtrasStore.getState().enterInterior(interiorId)}
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-bg0 shadow-[0_0_24px_-4px_currentColor] transition-colors hover:bg-white"
              style={{ background: sys.accent }}
            >
              <LogIn size={13} aria-hidden="true" />
              İçine gir
            </button>
          )}
          <button
            type="button"
            onClick={closePanel}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-white/80 transition-colors hover:border-white/40 hover:text-white"
          >
            <X size={13} aria-hidden="true" />
            Kapat
          </button>
          <button
            type="button"
            onClick={goOverview}
            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-bg0 transition-colors hover:bg-white"
            style={{ background: sys.accent }}
          >
            <Compass size={13} aria-hidden="true" />
            Genel görünüme dön
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}

/* ───────── Masaüstü: sağdan kayan cam panel ───────── */

function DesktopPanel({ item, reduced }: { item: AnatomyItem; reduced: boolean }) {
  const panelRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  usePanelA11y(panelRef, headingRef, item.id);
  const sys = SYSTEM_BY_KEY[item.system];

  return (
    <motion.aside
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${item.nameTR} bilgi paneli`}
      initial={{ opacity: 0, x: reduced ? 0 : 48 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: reduced ? 0 : 32, transition: { duration: reduced ? 0 : 0.3 } }}
      transition={{ duration: reduced ? 0 : 0.7, ease: EASE_OUT }}
      className="glass-strong fixed bottom-28 right-4 top-20 z-40 flex w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl"
    >
      <div
        className="h-px w-full shrink-0"
        style={{ background: `linear-gradient(90deg, transparent, ${sys.accent}, transparent)` }}
        aria-hidden="true"
      />
      <div className="pt-3">
        <PanelHeader item={item} headingRef={headingRef} reduced={reduced} />
      </div>
      <PanelBody item={item} reduced={reduced} />
    </motion.aside>
  );
}

/* ───────── Mobil: sürüklenebilir bottom-sheet ───────── */

function MobileSheet({ item, reduced }: { item: AnatomyItem; reduced: boolean }) {
  const panelRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  usePanelA11y(panelRef, headingRef, item.id);

  const controls = useDragControls();
  const [vh, setVh] = useState(() => window.innerHeight);
  const [snap, setSnap] = useState<Snap>('peek');
  const sheetH = Math.round(vh * 0.82);
  const peekY = sheetH - 176;
  const y = useMotionValue(sheetH);

  useEffect(() => {
    const on = (): void => setVh(window.innerHeight);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  const settle = useCallback(
    (s: Snap) =>
      animate(
        y,
        s === 'full' ? 0 : peekY,
        reduced ? { duration: 0.01 } : { type: 'spring', stiffness: 280, damping: 34 },
      ),
    [y, peekY, reduced],
  );

  useEffect(() => {
    const c = settle(snap);
    return () => c.stop();
  }, [settle, snap]);

  const onDragEnd = (_e: unknown, info: PanInfo): void => {
    const down = info.offset.y > 60 || info.velocity.y > 450;
    const up = info.offset.y < -60 || info.velocity.y < -450;
    if (snap === 'full') {
      if (down) setSnap('peek');
      else settle('full');
    } else if (up) {
      setSnap('full');
    } else if (down) {
      closePanel();
    } else {
      settle('peek');
    }
  };

  return (
    <motion.aside
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${item.nameTR} bilgi paneli`}
      style={{ y, height: sheetH }}
      drag="y"
      dragControls={controls}
      dragListener={false}
      dragConstraints={{ top: 0, bottom: peekY }}
      dragElastic={{ top: 0.05, bottom: 0.35 }}
      onDragEnd={onDragEnd}
      exit={{ y: sheetH, transition: { duration: reduced ? 0 : 0.35, ease: [0.4, 0, 1, 1] } }}
      onFocusCapture={(e) => {
        // Gizli içeriğe Tab ile gelinirse sayfa genişlesin (başlığa odak sayılmaz)
        if (snap === 'peek' && (e.target as HTMLElement).closest('[data-sheet-body]')) setSnap('full');
      }}
      className="glass-strong fixed inset-x-0 bottom-0 z-[55] flex flex-col rounded-t-[28px]"
    >
      <div
        onPointerDown={(e) => controls.start(e)}
        style={{ touchAction: 'none' }}
        className="shrink-0 cursor-grab pb-3 active:cursor-grabbing"
      >
        <button
          type="button"
          aria-label={snap === 'full' ? 'Paneli daralt' : 'Paneli genişlet'}
          aria-expanded={snap === 'full'}
          onClick={() => setSnap((s) => (s === 'full' ? 'peek' : 'full'))}
          className="mx-auto block h-6 w-24"
        >
          <span className="mx-auto block h-1 w-10 rounded-full bg-white/30" />
        </button>
        <PanelHeader item={item} headingRef={headingRef} reduced={reduced} />
      </div>
      <PanelBody item={item} reduced={reduced} />
    </motion.aside>
  );
}

/** Seçili yapının bilgi paneli: masaüstünde sağda cam panel, mobilde bottom-sheet. */
export default function InfoPanel() {
  const selectedId = useAtlasStore((s) => s.selectedId);
  const mobile = useAtlasStore((s) => s.isMobile);
  const reduced = useAtlasStore((s) => s.reducedMotion);
  const cine = useExtrasStore((s) => s.cine !== null);
  const item = selectedId && !cine ? getAnatomyItem(selectedId) : undefined;

  return (
    <AnimatePresence>
      {item &&
        (mobile ? (
          <MobileSheet key="sheet" item={item} reduced={reduced} />
        ) : (
          <DesktopPanel key="panel" item={item} reduced={reduced} />
        ))}
    </AnimatePresence>
  );
}
