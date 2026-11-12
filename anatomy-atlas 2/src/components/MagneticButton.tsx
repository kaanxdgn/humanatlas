import { useEffect, useRef, type ReactNode } from 'react';
import gsap from 'gsap';
import { useAtlasStore } from '@/store/useAtlasStore';

export interface MagneticButtonProps {
  children: ReactNode;
  onClick?: () => void;
  /** Verilirse <a>, verilmezse <button> çizilir */
  href?: string;
  variant?: 'solid' | 'ghost';
  /** İmleci takip kuvveti (0..1) */
  strength?: number;
  className?: string;
  ariaLabel?: string;
}

const BASE =
  'inline-flex items-center gap-2 rounded-full px-6 py-3 font-mono text-[11px] uppercase tracking-[0.22em] transition-colors duration-300';
const VARIANT: Record<NonNullable<MagneticButtonProps['variant']>, string> = {
  solid: 'bg-accent text-bg0 hover:bg-white',
  ghost: 'glass text-white hover:border-accent/60 hover:text-accent',
};

/**
 * Manyetik buton: imleç yaklaştıkça kap ve içerik farklı oranlarda imleci takip eder,
 * ayrılınca elastik şekilde yerine döner. Dokunmatik ve hareket azaltma tercihinde devre dışıdır.
 */
export default function MagneticButton({
  children,
  onClick,
  href,
  variant = 'ghost',
  strength = 0.35,
  className = '',
  ariaLabel,
}: MagneticButtonProps) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const innerRef = useRef<HTMLSpanElement>(null);
  const reduced = useAtlasStore((s) => s.reducedMotion);

  useEffect(() => {
    const wrap = wrapRef.current;
    const inner = innerRef.current;
    if (!wrap || !inner) return;
    if (reduced || window.matchMedia('(pointer: coarse)').matches) return;

    const wx = gsap.quickTo(wrap, 'x', { duration: 0.7, ease: 'elastic.out(1, 0.45)' });
    const wy = gsap.quickTo(wrap, 'y', { duration: 0.7, ease: 'elastic.out(1, 0.45)' });
    const ix = gsap.quickTo(inner, 'x', { duration: 0.5, ease: 'power3.out' });
    const iy = gsap.quickTo(inner, 'y', { duration: 0.5, ease: 'power3.out' });

    const onMove = (e: PointerEvent): void => {
      const r = wrap.getBoundingClientRect();
      // Kap kayık olduğundan merkezi, mevcut ötelemeyi çıkararak hesapla (titreşimi önler)
      const cx = r.left + r.width / 2 - Number(gsap.getProperty(wrap, 'x'));
      const cy = r.top + r.height / 2 - Number(gsap.getProperty(wrap, 'y'));
      const dx = (e.clientX - cx) * strength;
      const dy = (e.clientY - cy) * strength;
      wx(dx);
      wy(dy);
      ix(dx * 0.45);
      iy(dy * 0.45);
    };
    const onLeave = (): void => {
      wx(0);
      wy(0);
      ix(0);
      iy(0);
    };

    wrap.addEventListener('pointermove', onMove);
    wrap.addEventListener('pointerleave', onLeave);
    return () => {
      wrap.removeEventListener('pointermove', onMove);
      wrap.removeEventListener('pointerleave', onLeave);
      gsap.set([wrap, inner], { x: 0, y: 0 });
    };
  }, [reduced, strength]);

  const classes = `${BASE} ${VARIANT[variant]} ${className}`;
  const content = (
    <span ref={innerRef} className="inline-flex items-center gap-2 will-change-transform">
      {children}
    </span>
  );

  return (
    <span ref={wrapRef} className="pe-auto inline-block will-change-transform">
      {href ? (
        <a href={href} className={classes} aria-label={ariaLabel} onClick={onClick}>
          {content}
        </a>
      ) : (
        <button type="button" className={classes} aria-label={ariaLabel} onClick={onClick}>
          {content}
        </button>
      )}
    </span>
  );
}
