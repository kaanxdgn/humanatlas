import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

let registered = false;

/** GSAP eklentilerini yalnızca bir kez kaydeder ve varsayılanları ayarlar. */
export function setupGsap(): void {
  if (registered) return;
  gsap.registerPlugin(ScrollTrigger);
  gsap.config({ nullTargetWarn: false });
  gsap.defaults({ ease: 'power3.inOut', duration: 1 });
  ScrollTrigger.config({ ignoreMobileResize: true });
  registered = true;
}

setupGsap();

export const EASE = {
  inOut: 'power3.inOut',
  out: 'expo.out',
  soft: 'power2.out',
} as const;

/** "#RRGGBB" → "R G B" (Tailwind'in rgb(var(--x) / alpha) kullanımı için) */
export function hexToRgbTriplet(hex: string): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

/** Arayüz vurgu renklerini yumuşakça yeni sisteme geçirir. */
export function tweenAccent(accent: string, accent2: string, duration = 1.2): void {
  gsap.to(document.documentElement, {
    '--accent': accent,
    '--accent-2': accent2,
    '--accent-rgb': hexToRgbTriplet(accent),
    '--accent-2-rgb': hexToRgbTriplet(accent2),
    duration,
    ease: 'power2.inOut',
    overwrite: 'auto',
  });
}

export { gsap, ScrollTrigger };
