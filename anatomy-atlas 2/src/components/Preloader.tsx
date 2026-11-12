import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import gsap from 'gsap';
import { useAtlasStore } from '@/store/useAtlasStore';

/** ECG çizgisinin en az bu kadar görünür kalması (ms) */
const MIN_MS = 1800;
/** Sahne hiçbir şekilde hazır olmazsa perde yine de kalkar (ms) */
const FAILSAFE_MS = 12000;

type Phase = 'loading' | 'leaving' | 'gone';

/** İki kalp atışı olan ECG izi (viewBox 400×80) */
const ECG_PATH =
  'M0 40 H40 L48 40 L54 30 L60 40 H84 L92 40 L98 6 L106 74 L112 40 H128 L138 40 L146 28 L156 40 H236 L244 40 L250 30 L256 40 H280 L288 40 L294 6 L302 74 L308 40 H324 L334 40 L342 28 L352 40 H400';

/**
 * Yükleme ekranı: ECG animasyonu + yüzde sayacı.
 * Sahne ilk karelerini çizince (store.sceneReady) yüzde 100'e tamamlanır,
 * perde yukarı kayar ve loaderDone = true olur (hero metinleri bunu bekler).
 */
export default function Preloader() {
  const sceneReady = useAtlasStore((s) => s.sceneReady);
  const reduced = useAtlasStore((s) => s.reducedMotion);
  const setLoaderDone = useAtlasStore((s) => s.setLoaderDone);

  const [phase, setPhase] = useState<Phase>(() =>
    useAtlasStore.getState().loaderDone ? 'gone' : 'loading',
  );
  const progress = useRef({ v: 0 });
  const pctRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const startedAt = useRef(0);
  const gone = phase === 'gone';

  /** Yüzdeyi React render'ı olmadan boyar. */
  const paint = useCallback((): void => {
    const v = progress.current.v;
    if (pctRef.current) pctRef.current.textContent = String(Math.round(v)).padStart(3, '0');
    if (barRef.current) barRef.current.style.transform = `scaleX(${v / 100})`;
  }, []);

  /* Yükleme sürerken scroll kilitli ve sayfa başında */
  useEffect(() => {
    if (gone) return;
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prev;
    };
  }, [gone]);

  /* Sahne hazır olana dek %92'ye doğru yavaşça ilerle + güvenlik zamanlayıcısı */
  useEffect(() => {
    if (phase !== 'loading') return;
    startedAt.current = performance.now();
    const crawl = gsap.to(progress.current, {
      v: 92,
      duration: reduced ? 0.4 : 5,
      ease: 'power2.out',
      onUpdate: paint,
    });
    const failsafe = window.setTimeout(() => setPhase('leaving'), FAILSAFE_MS);
    return () => {
      crawl.kill();
      window.clearTimeout(failsafe);
    };
  }, [phase, reduced, paint]);

  /* Sahne hazır: en az MIN_MS geçtikten sonra %100'e tamamla ve perdeyi kaldır */
  useEffect(() => {
    if (phase !== 'loading' || !sceneReady) return;
    const elapsed = performance.now() - startedAt.current;
    const wait = reduced ? 0 : Math.max(0, MIN_MS - elapsed);
    let finish: gsap.core.Tween | undefined;
    const call = gsap.delayedCall(wait / 1000, () => {
      finish = gsap.to(progress.current, {
        v: 100,
        duration: reduced ? 0.01 : 0.55,
        ease: 'power2.out',
        overwrite: true,
        onUpdate: paint,
        onComplete: () => setPhase('leaving'),
      });
    });
    return () => {
      call.kill();
      finish?.kill();
    };
  }, [phase, sceneReady, reduced, paint]);

  /* Perde kalkmaya başlayınca, tamamlanmasını beklemeden hero metinleri başlasın */
  useEffect(() => {
    if (phase !== 'leaving') return;
    const t = window.setTimeout(() => setLoaderDone(true), reduced ? 0 : 650);
    return () => window.clearTimeout(t);
  }, [phase, reduced, setLoaderDone]);

  if (gone) return null;

  return (
    <>
      <div className="sr-only" role="status" aria-live="polite">
        {phase === 'loading' ? 'Atlas yükleniyor' : 'Atlas hazır'}
      </div>
      <AnimatePresence
        onExitComplete={() => {
          setPhase('gone');
          setLoaderDone(true);
        }}
      >
        {phase === 'loading' && (
          <motion.div
            key="preloader"
            aria-hidden="true"
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-bg0"
            style={{ background: 'radial-gradient(120% 90% at 50% 40%, #0B1220 0%, #05070D 70%)' }}
            exit={{ y: '-100%' }}
            transition={{ duration: reduced ? 0.01 : 1.1, ease: [0.76, 0, 0.24, 1] }}
          >
            <motion.div
              className="flex w-full max-w-md flex-col items-center px-8"
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0.01 : 0.35 }}
            >
              <p className="mono-label mb-10 tracking-[0.4em]">İnsan Anatomisi Atlası</p>

              {/* ECG: soluk iz + üstünde çizilerek ilerleyen parlak iz */}
              <svg viewBox="0 0 400 80" className="h-20 w-full" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d={ECG_PATH} stroke="rgb(138 180 255 / 0.16)" strokeWidth="1.5" />
                <path
                  d={ECG_PATH}
                  pathLength={400}
                  stroke="#8AB4FF"
                  strokeWidth="2"
                  style={{
                    strokeDasharray: 400,
                    filter: 'drop-shadow(0 0 6px rgb(138 180 255 / 0.9))',
                    animation: reduced ? 'none' : 'ecgDraw 2s cubic-bezier(0.45, 0, 0.2, 1) infinite',
                    strokeDashoffset: reduced ? 0 : undefined,
                  }}
                />
              </svg>

              <div className="mt-10 flex w-full items-end justify-between">
                <span className="mono-label">Sahne hazırlanıyor</span>
                <span className="font-display text-5xl font-light tabular-nums text-white">
                  <span ref={pctRef}>000</span>
                  <span className="ml-1 text-lg text-white/40">%</span>
                </span>
              </div>

              <div className="mt-4 h-px w-full overflow-hidden bg-white/10">
                <div
                  ref={barRef}
                  className="h-full origin-left bg-[#8AB4FF]"
                  style={{ transform: 'scaleX(0)', boxShadow: '0 0 12px #8AB4FF' }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
