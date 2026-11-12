import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import '@/utils/gsapSetup';
import { scrollState } from '@/utils/scrollState';
import { easeInOutQuart, easeOutExpo } from '@/utils/math';
import { useAtlasStore } from '@/store/useAtlasStore';

let instance: Lenis | null = null;

/** Dock / palet gibi bileşenlerin Lenis'e erişmesi için. */
export const getLenis = (): Lenis | null => instance;

/**
 * Lenis'i kurar ve GSAP ScrollTrigger ile senkronlar.
 * - lenis.on('scroll') → ScrollTrigger.update
 * - lenis.raf, gsap.ticker üzerinden sürülür (tek rAF döngüsü)
 */
export function useLenis(): void {
  const reduced = useAtlasStore((s) => s.reducedMotion);

  useEffect(() => {
    const lenis = new Lenis({
      duration: reduced ? 0.01 : 1.15,
      easing: easeOutExpo,
      smoothWheel: !reduced,
      wheelMultiplier: 1,
      touchMultiplier: 1.2,
    });
    instance = lenis;

    const onScroll = (l: Lenis): void => {
      scrollState.velocity = l.velocity;
      scrollState.progress = l.progress;
      ScrollTrigger.update();
    };
    lenis.on('scroll', onScroll);

    const tick = (time: number): void => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.off('scroll', onScroll);
      gsap.ticker.remove(tick);
      lenis.destroy();
      if (instance === lenis) instance = null;
    };
  }, [reduced]);
}

interface ScrollToOptions {
  duration?: number;
  offset?: number;
  immediate?: boolean;
}

/** Bir elemana veya konuma yumuşakça kaydırır (Lenis yoksa native fallback). */
export function scrollToTarget(
  target: string | number | HTMLElement,
  opts: ScrollToOptions = {},
): void {
  const lenis = instance;
  if (lenis) {
    lenis.scrollTo(target, {
      duration: opts.duration ?? 1.8,
      easing: easeInOutQuart,
      offset: opts.offset ?? 0,
      immediate: opts.immediate ?? false,
    });
    return;
  }
  if (typeof target === 'number') {
    window.scrollTo({ top: target, behavior: 'smooth' });
  } else if (typeof target === 'string') {
    document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' });
  } else {
    target.scrollIntoView({ behavior: 'smooth' });
  }
}
