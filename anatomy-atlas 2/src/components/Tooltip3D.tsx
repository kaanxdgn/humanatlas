import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import gsap from 'gsap';
import { getAnatomyItem } from '@/data/anatomyData';
import { SYSTEM_BY_KEY } from '@/data/systemsConfig';
import { useAtlasStore } from '@/store/useAtlasStore';
import { useExtrasStore } from '@/store/useExtrasStore';

/** İmleci yumuşakça takip eden, 3B yapının adını gösteren küçük ipucu (yalnızca imleçli cihazlarda). */
export default function Tooltip3D() {
  const hoveredId = useAtlasStore((s) => s.hoveredId);
  const mobile = useAtlasStore((s) => s.isMobile);
  const boxRef = useRef<HTMLDivElement>(null);
  const quizOn = useExtrasStore((s) => s.quiz !== null); // oyunda ad ipucu cevabı ele vermesin
  const item = hoveredId && !quizOn ? getAnatomyItem(hoveredId) : undefined;
  const system = item ? SYSTEM_BY_KEY[item.system] : undefined;

  /* İmleç her zaman izlenir; ipucu belirdiğinde konumu hazırdır */
  useEffect(() => {
    const box = boxRef.current;
    if (!box || mobile) return;

    const xTo = gsap.quickTo(box, 'x', { duration: 0.28, ease: 'power3.out' });
    const yTo = gsap.quickTo(box, 'y', { duration: 0.28, ease: 'power3.out' });
    let flipped = false;

    const onMove = (e: PointerEvent): void => {
      // Sağ kenara yakınsa ipucu imlecin soluna açılır
      const flip = e.clientX > window.innerWidth - 260;
      if (flip !== flipped) {
        flipped = flip;
        gsap.set(box, { xPercent: flip ? -100 : 0 });
      }
      xTo(e.clientX + (flip ? -16 : 16));
      yTo(e.clientY + 18);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [mobile]);

  if (mobile) return null;

  return (
    <div ref={boxRef} className="pointer-events-none fixed left-0 top-0 z-[60]" aria-hidden="true">
      <AnimatePresence mode="wait">
        {item && system && (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="glass-strong max-w-[240px] rounded-xl px-3.5 py-2.5"
          >
            <div className="flex items-center gap-2">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: system.accent, boxShadow: `0 0 8px ${system.accent}` }}
              />
              <span className="font-mono text-[9px] uppercase tracking-[0.24em] text-white/55">
                {system.labelTR}
              </span>
            </div>
            <p className="mt-1.5 text-sm font-normal leading-tight text-white">{item.nameTR}</p>
            <p className="mt-0.5 text-[11px] italic text-white/55">{item.nameLatin}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
