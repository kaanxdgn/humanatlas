import { useLayoutEffect, useRef, type ElementType } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import '@/utils/gsapSetup';
import { useAtlasStore } from '@/store/useAtlasStore';

export interface TextRevealProps {
  /** Her eleman ayrı bir satırdır (maske içinde yukarıdan kayarak belirir) */
  lines: readonly string[];
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'div' | 'span';
  className?: string;
  /** Yatay hareketli gradient metin (başlıklar için) */
  gradient?: boolean;
  /** Satırlar arası gecikme (sn) */
  stagger?: number;
  duration?: number;
  /** Başlangıç gecikmesi (sn) */
  delay?: number;
  /**
   * Verilirse kendi scroll konumunu değil bu değeri izler (pin'li bölümler için).
   * true → belirir, false → geri kapanır. Verilmezse ScrollTrigger kullanılır.
   */
  active?: boolean;
}

/** Apple tarzı satır satır "mask reveal". Hareket azaltma tercihinde animasyonsuz görünür. */
export default function TextReveal({
  lines,
  as = 'div',
  className,
  gradient = false,
  stagger = 0.12,
  duration = 1.2,
  delay = 0,
  active,
}: TextRevealProps) {
  const Tag = as as ElementType;
  const rootRef = useRef<HTMLElement | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const reduced = useAtlasStore((s) => s.reducedMotion);
  const linesKey = lines.join('\n');

  /* Zaman çizelgesini kur (başlangıç durumu: satırlar maskenin altında) */
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const inners = root.querySelectorAll<HTMLElement>('[data-line]');
    if (reduced) {
      gsap.set(inners, { yPercent: 0 });
      return;
    }

    gsap.set(inners, { yPercent: 115 });
    const tl = gsap
      .timeline({ paused: true })
      .to(inners, { yPercent: 0, duration, ease: 'expo.out', stagger }, delay);
    tlRef.current = tl;

    let st: ScrollTrigger | undefined;
    if (active === undefined) {
      st = ScrollTrigger.create({
        trigger: root,
        start: 'top 88%',
        onEnter: () => {
          tl.timeScale(1).play();
        },
        onLeaveBack: () => {
          tl.timeScale(1.6).reverse();
        },
      });
    }

    return () => {
      st?.kill();
      tl.kill();
      tlRef.current = null;
      gsap.set(inners, { clearProps: 'transform' });
    };
    // `active` bilerek dışarıda: değişimi aşağıdaki efekt yönetir (zaman çizelgesi yeniden kurulmaz)
  }, [reduced, linesKey, stagger, duration, delay]);

  /* Kontrollü mod: aktif bölüm değişince oynat / geri sar */
  useLayoutEffect(() => {
    if (active === undefined) return;
    const tl = tlRef.current;
    if (!tl) return;
    if (active) tl.timeScale(1).play();
    else tl.timeScale(1.8).reverse();
  }, [active, reduced, linesKey, stagger, duration, delay]);

  return (
    <Tag
      ref={(node: HTMLElement | null) => {
        rootRef.current = node;
      }}
      className={className}
    >
      <span className="sr-only">{lines.join(' ')}</span>
      {lines.map((line, i) => (
        <span key={`${i}-${line}`} className="mask-line" aria-hidden="true">
          <span data-line className={gradient ? 'text-gradient-move' : undefined}>
            {line}
          </span>
        </span>
      ))}
    </Tag>
  );
}
