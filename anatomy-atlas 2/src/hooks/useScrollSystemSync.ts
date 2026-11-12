import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import '@/utils/gsapSetup';
import { SECTION_ORDER, type SectionId } from '@/data/systemsConfig';
import { useAtlasStore } from '@/store/useAtlasStore';
import { scrollState } from '@/utils/scrollState';
import { clamp, easeInOutQuart } from '@/utils/math';
import { getLenis } from '@/hooks/useLenis';

/** Bölümün üstü viewport yüksekliğinin bu oranına gelince bölüm "aktif" olur. */
const ACTIVATE_LINE = 0.6;

/* Modül düzeyi durum: dock ve palet, hook dışından goToSection çağırabilsin */
const triggers = new Map<SectionId, ScrollTrigger>();
const sectionTops = new Map<SectionId, number>();
let navLock = false;
let lockTimer: number | undefined;

function isSectionId(v: string | undefined): v is SectionId {
  return v !== undefined && (SECTION_ORDER as readonly string[]).includes(v);
}

/** Scroll kaynaklı bölüm değişimi; programatik gezinme sürerken yok sayılır. */
function activate(id: SectionId): void {
  if (navLock) return;
  useAtlasStore.getState().setActiveSection(id);
}

/** Şu an hangi bölümün trigger'ı aktifse onu store'a yazar. */
function evaluateActive(): void {
  for (const id of SECTION_ORDER) {
    if (triggers.get(id)?.isActive) {
      useAtlasStore.getState().setActiveSection(id);
      return;
    }
  }
}

function releaseLock(): void {
  if (!navLock) return;
  navLock = false;
  window.clearTimeout(lockTimer);
  evaluateActive();
}

/**
 * Bir bölüme gider (iki yönlü senkronun "dock → scroll" yönü).
 * Sahne geçişi hemen başlar, scroll Lenis ile yumuşakça kayar.
 */
export function goToSection(id: SectionId): void {
  const store = useAtlasStore.getState();
  const el = document.getElementById(`section-${id}`);
  const top = sectionTops.get(id) ?? (el ? el.getBoundingClientRect().top + window.scrollY : 0);

  if (store.activeSection === id && store.selectedId) store.clearSelection();
  store.setActiveSection(id);

  const distance = Math.abs(top - window.scrollY);
  const reduced = store.reducedMotion;
  const duration = reduced ? 0.01 : clamp((distance / window.innerHeight) * 0.35, 1.2, 2.6);

  navLock = true;
  window.clearTimeout(lockTimer);
  lockTimer = window.setTimeout(releaseLock, duration * 1000 + 700); // güvenlik ağı

  const lenis = getLenis();
  if (lenis) {
    lenis.scrollTo(top, { duration, easing: easeInOutQuart, onComplete: releaseLock });
  } else {
    window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
  }
}

/**
 * Scroll ↔ sahne senkronu:
 *  - her [data-section] için bir ScrollTrigger → aktif bölümü store'a yazar
 *  - hero boyunca kamera dolly'si (scrollState.dolly: 1 → 0)
 *  - bölüm başlangıç konumlarını (pin boşlukları dahil) goToSection için saklar
 */
export function useScrollSystemSync(enabled: boolean): void {
  const reduced = useAtlasStore((s) => s.reducedMotion);

  useEffect(() => {
    if (!enabled) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-section]'));
    if (els.length === 0) return;

    const line = `${ACTIVATE_LINE * 100}%`;
    let cancelled = false;

    const ctx = gsap.context(() => {
      for (const el of els) {
        const id = el.dataset.section;
        if (!isSectionId(id)) continue;
        const st = ScrollTrigger.create({
          trigger: el,
          start: `top ${line}`,
          end: `bottom ${line}`,
          onEnter: () => activate(id),
          onEnterBack: () => activate(id),
          // start = elTop − 0.6·vh olduğundan bölüm başı geri hesaplanır
          onRefresh: (self) => {
            sectionTops.set(id, Math.round(self.start + window.innerHeight * ACTIVATE_LINE));
          },
        });
        triggers.set(id, st);
        sectionTops.set(id, Math.round(st.start + window.innerHeight * ACTIVATE_LINE));
      }

      /* Hero dolly: sayfa başında uzak (1), hero bitince normal mesafe (0) */
      const hero = els.find((e) => e.dataset.section === 'hero');
      if (hero && !reduced) {
        const apply = (p: number): void => {
          scrollState.dolly = Math.pow(1 - clamp(p, 0, 1), 1.6);
        };
        const st = ScrollTrigger.create({
          trigger: hero,
          start: 'top top',
          end: 'bottom top',
          onUpdate: (self) => apply(self.progress),
          onRefresh: (self) => apply(self.progress),
        });
        apply(st.progress);
      } else {
        scrollState.dolly = 0;
      }
    });

    ScrollTrigger.refresh();
    evaluateActive();

    // Web fontları yerleşince yükseklikler değişir
    void document.fonts?.ready.then(() => {
      if (cancelled) return;
      ScrollTrigger.refresh();
      if (!navLock) evaluateActive();
    });

    return () => {
      cancelled = true;
      ctx.revert(); // içeride oluşturulan tüm trigger'ları öldürür
      triggers.clear();
      sectionTops.clear();
      window.clearTimeout(lockTimer);
      navLock = false;
      scrollState.dolly = 0;
    };
  }, [enabled, reduced]);
}
