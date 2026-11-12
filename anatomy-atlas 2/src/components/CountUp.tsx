import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import '@/utils/gsapSetup';
import { useAtlasStore } from '@/store/useAtlasStore';
import { formatNumberTR } from '@/utils/math';

export interface CountUpProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
  /**
   * Verilirse sayaç kendi scroll konumunu değil bu değeri izler (pin'li bölüm içindeki
   * öğeler için). true → sayar, false → sıfırlanır; her girişte yeniden oynar.
   */
  active?: boolean;
}

/**
 * Scroll ile tetiklenen sayaç (Türkçe sayı biçimi). Yalnızca sayı animasyona girer,
 * ön/son ek sabit kalır. Ekran okuyucular animasyon yerine nihai değeri okur.
 */
export default function CountUp({
  value,
  prefix,
  suffix,
  decimals = 0,
  duration = 2.2,
  className,
  active,
}: CountUpProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const reduced = useAtlasStore((s) => s.reducedMotion);
  const finalText = formatNumberTR(value, decimals);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const num = numRef.current;
    if (!root || !num) return;

    if (reduced) {
      num.textContent = finalText;
      return;
    }

    const state = { v: 0 };
    const paint = (): void => {
      num.textContent = formatNumberTR(state.v, decimals);
    };
    const reset = (): void => {
      state.v = 0;
      paint();
    };
    reset();

    const tween = gsap.to(state, {
      v: value,
      duration,
      ease: 'power3.out',
      paused: true,
      onUpdate: paint,
    });

    let st: ScrollTrigger | undefined;
    if (active === undefined) {
      st = ScrollTrigger.create({
        trigger: root,
        start: 'top 88%',
        end: 'bottom 6%',
        onEnter: () => tween.restart(),
        onEnterBack: () => tween.restart(),
        onLeave: () => {
          tween.pause(0);
          reset();
        },
        onLeaveBack: () => {
          tween.pause(0);
          reset();
        },
      });
    } else if (active) {
      tween.play();
    }

    return () => {
      st?.kill();
      tween.kill();
    };
  }, [value, decimals, duration, reduced, active, finalText]);

  return (
    <span ref={rootRef} className={className}>
      <span className="sr-only">{`${prefix ?? ''}${finalText}${suffix ?? ''}`}</span>
      <span aria-hidden="true" className="tabular-nums">
        {prefix && <span>{prefix}</span>}
        <span ref={numRef}>{finalText}</span>
        {suffix && <span>{suffix}</span>}
      </span>
    </span>
  );
}
