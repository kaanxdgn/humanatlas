import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import gsap from 'gsap';
import { Activity, Search } from 'lucide-react';
import { SECTION_CONFIG, SECTION_ORDER } from '@/data/systemsConfig';
import { goToSection } from '@/hooks/useScrollSystemSync';
import { useAtlasStore } from '@/store/useAtlasStore';
import { scrollState } from '@/utils/scrollState';

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.userAgent);

/**
 * Üst çubuk: logo (başa dön), bölüm ilerlemesi (tıklanabilir) ve arama düğmesi.
 * İnce bir scroll ilerleme çizgisi her karede doğrudan DOM'a yazılır (React render'ı yok).
 */
export default function Navbar() {
  const activeSection = useAtlasStore((s) => s.activeSection);
  const loaderDone = useAtlasStore((s) => s.loaderDone);
  const reduced = useAtlasStore((s) => s.reducedMotion);
  const togglePalette = useAtlasStore((s) => s.togglePalette);
  const barRef = useRef<HTMLDivElement>(null);

  const activeIdx = SECTION_ORDER.indexOf(activeSection);
  const cfg = SECTION_CONFIG[activeSection];

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const tick = (): void => {
      bar.style.transform = `scaleX(${scrollState.progress})`;
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
    };
  }, []);

  return (
    <motion.header
      initial={{ opacity: 0, y: -24 }}
      animate={loaderDone ? { opacity: 1, y: 0 } : { opacity: 0, y: -24 }}
      transition={{ duration: reduced ? 0 : 0.9, ease: [0.16, 1, 0.3, 1], delay: loaderDone && !reduced ? 0.3 : 0 }}
      className="pe-none fixed inset-x-0 top-0 z-50"
    >
      <div className="flex items-center justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-8">
        {/* Logo */}
        <button
          type="button"
          aria-label="Atlas başlangıcına dön"
          onClick={() => goToSection('hero')}
          className="pe-auto glass inline-flex items-center gap-2.5 rounded-full py-2 pl-3 pr-4 transition-colors hover:border-accent/50"
        >
          <Activity size={16} aria-hidden="true" className="text-accent" />
          <span className="font-display text-sm font-medium tracking-tight text-white">Anatomi Atlası</span>
        </button>

        {/* Bölüm ilerlemesi */}
        <nav aria-label="Bölümler" className="pe-auto glass hidden items-center gap-3 rounded-full px-4 py-1.5 md:flex">
          <ul className="flex items-center">
            {SECTION_ORDER.map((id, i) => {
              const active = i === activeIdx;
              return (
                <li key={id}>
                  <button
                    type="button"
                    aria-label={`${SECTION_CONFIG[id].navLabel} bölümüne git`}
                    aria-current={active ? 'true' : undefined}
                    onClick={() => goToSection(id)}
                    className="group flex h-8 items-center px-1"
                  >
                    <span
                      className={`block h-[3px] rounded-full transition-all duration-500 ${
                        active
                          ? 'w-7 bg-accent shadow-[0_0_10px_rgb(var(--accent-rgb)/0.8)]'
                          : i < activeIdx
                            ? 'w-3.5 bg-white/50 group-hover:bg-white/80'
                            : 'w-3.5 bg-white/20 group-hover:bg-white/50'
                      }`}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
          <span className="h-4 w-px bg-white/15" aria-hidden="true" />
          <AnimatePresence mode="wait">
            <motion.span
              key={activeSection}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: reduced ? 0 : 0.25 }}
              className="mono-label w-28 text-white/70"
            >
              {cfg.navLabel}
            </motion.span>
          </AnimatePresence>
        </nav>

        {/* Küçük ekranlarda kompakt bölüm göstergesi */}
        <p className="mono-label glass rounded-full px-3 py-2 md:hidden" aria-live="polite">
          {String(activeIdx + 1).padStart(2, '0')} / {String(SECTION_ORDER.length).padStart(2, '0')} · {cfg.navLabel}
        </p>

        {/* Arama */}
        <button
          type="button"
          aria-label={`Yapı ara (${IS_MAC ? '⌘' : 'Ctrl'} + K)`}
          onClick={togglePalette}
          className="pe-auto glass inline-flex items-center gap-2.5 rounded-full py-2 pl-3.5 pr-3 text-white/75 transition-colors hover:border-accent/50 hover:text-white"
        >
          <Search size={15} aria-hidden="true" />
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] sm:inline">Ara</span>
          <kbd className="hidden rounded-md border border-white/15 px-1.5 py-0.5 font-mono text-[10px] text-white/50 sm:inline">
            {IS_MAC ? '⌘K' : 'Ctrl K'}
          </kbd>
        </button>
      </div>

      {/* Scroll ilerleme çizgisi */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-transparent" aria-hidden="true">
        <div
          ref={barRef}
          className="h-full origin-left bg-accent"
          style={{ transform: 'scaleX(0)', boxShadow: '0 0 10px rgb(var(--accent-rgb) / 0.8)' }}
        />
      </div>
    </motion.header>
  );
}
