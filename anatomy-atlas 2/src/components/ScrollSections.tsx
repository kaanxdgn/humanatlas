import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ArrowDown } from 'lucide-react';
import '@/utils/gsapSetup';
import {
  SECTION_CONFIG,
  SECTION_ORDER,
  type SectionConfig,
  type SectionId,
} from '@/data/systemsConfig';
import { goToSection } from '@/hooks/useScrollSystemSync';
import { useAtlasStore } from '@/store/useAtlasStore';
import CountUp from './CountUp';
import MagneticButton from './MagneticButton';
import TextReveal from './TextReveal';

/** Her bölümün kapladığı scroll uzunluğu (viewport yüksekliği cinsinden). */
const SECTION_VH: Record<SectionId, number> = {
  hero: 200,
  skin: 190,
  skeleton: 230,
  muscular: 210,
  organs: 230,
  vascular: 210,
  nervous: 230,
  final: 170,
};

const isSectionId = (v: string | undefined): v is SectionId =>
  v !== undefined && (SECTION_ORDER as readonly string[]).includes(v);

/** Mobilde metnin okunabilirliği için alttan gelen koyu gradient (copy ile birlikte solar). */
function MobileScrim() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-bg0/90 via-bg0/55 to-transparent md:hidden"
    />
  );
}

/** Bölüm ilerleme çizgisi: scroll ile scrub edilir (ScrollTrigger tarafından scaleX'lenir). */
function ProgressHairline({ right = false }: { right?: boolean }) {
  return (
    <div className={`mt-4 h-px w-40 bg-white/10 ${right ? 'md:ml-auto' : ''}`} aria-hidden="true">
      <div data-progress className="h-full origin-left bg-accent" style={{ transform: 'scaleX(0)' }} />
    </div>
  );
}

function Stats({ cfg, active, center = false }: { cfg: SectionConfig; active: boolean; center?: boolean }) {
  if (cfg.stats.length === 0) return null;
  return (
    <dl
      className={`grid grid-cols-3 gap-4 border-t border-white/10 pt-6 transition-opacity duration-700 ${
        active ? 'opacity-100 delay-500' : 'opacity-0'
      } ${center ? 'w-full max-w-3xl text-center' : ''}`}
    >
      {cfg.stats.map((s) => (
        <div key={s.label}>
          <dd className="font-display text-2xl font-light text-white sm:text-4xl">
            <CountUp
              value={s.value}
              prefix={s.prefix}
              suffix={s.suffix}
              decimals={s.decimals}
              active={active}
            />
          </dd>
          <dt className="mono-label mt-2 text-[9px] leading-snug sm:text-[10px]">{s.label}</dt>
        </div>
      ))}
    </dl>
  );
}

/* ───────── Yan (sol / sağ) bölüm metni ───────── */

function SideCopy({ cfg, active }: { cfg: SectionConfig; active: boolean }) {
  const right = cfg.align === 'right';
  return (
    <div
      data-copy
      className={`pe-none absolute inset-0 flex items-end px-6 pb-40 pt-24 sm:px-12 md:items-center md:pb-24 lg:px-20 ${
        right ? 'md:justify-end' : 'md:justify-start'
      }`}
    >
      <MobileScrim />
      <div className={`relative w-full max-w-xl ${right ? 'md:text-right' : ''}`}>
        <p className="eyebrow">{cfg.eyebrow}</p>
        <ProgressHairline right={right} />

        <TextReveal
          as="h2"
          lines={cfg.titleLines}
          gradient
          active={active}
          className="mt-6 font-display text-headline font-light"
        />
        <TextReveal
          as="div"
          lines={cfg.body}
          active={active}
          delay={0.35}
          stagger={0.14}
          className="mt-6 text-base font-light leading-relaxed text-white/70 sm:text-lg [&>.mask-line+.mask-line]:mt-3"
        />
        <div className="mt-8 sm:mt-10">
          <Stats cfg={cfg} active={active} />
        </div>
      </div>
    </div>
  );
}

/* ───────── Ortalı bölümler: hero ve final ───────── */

function CenterCopy({ cfg, active, hero }: { cfg: SectionConfig; active: boolean; hero: boolean }) {
  return (
    <div data-copy className="pe-none absolute inset-0 flex flex-col items-center px-6 pt-[15vh] text-center sm:px-12">
      <p className="eyebrow">{cfg.eyebrow}</p>
      <ProgressHairline />

      <TextReveal
        as={hero ? 'h1' : 'h2'}
        lines={cfg.titleLines}
        gradient
        active={active}
        className={`mt-6 font-display font-light ${hero ? 'text-display' : 'text-headline'}`}
      />
      <TextReveal
        as="div"
        lines={cfg.body}
        active={active}
        delay={0.4}
        stagger={0.14}
        className={`mt-6 text-base font-light leading-relaxed text-white/70 sm:text-lg [&>.mask-line+.mask-line]:mt-2 ${
          hero ? 'max-w-xl' : 'max-w-lg'
        }`}
      />

      {hero ? (
        <div
          className={`absolute inset-x-0 bottom-32 flex flex-col items-center gap-8 transition-all duration-1000 ${
            active ? 'translate-y-0 opacity-100 delay-1000' : 'translate-y-4 opacity-0'
          }`}
        >
          <MagneticButton variant="solid" onClick={() => goToSection('skin')}>
            Keşfetmeye başla
            <ArrowDown size={14} aria-hidden="true" />
          </MagneticButton>
          <div className="flex flex-col items-center gap-3" aria-hidden="true">
            <span className="mono-label">Aşağı kaydır</span>
            <span
              className="block h-10 w-px bg-gradient-to-b from-accent to-transparent"
              style={{ animation: 'floatY 2.4s ease-in-out infinite' }}
            />
          </div>
        </div>
      ) : (
        <div className="absolute inset-x-0 bottom-36 flex justify-center px-6 sm:px-12">
          <Stats cfg={cfg} active={active} center />
        </div>
      )}
    </div>
  );
}

/**
 * Sayfanın sinematik gövdesi. Her bölüm uzun bir kap + 100svh yapışkan (sticky) iç sahnedir.
 * Aktif bölüm useScrollSystemSync tarafından, metin/sayaç animasyonları buradan yönetilir.
 */
export default function ScrollSections() {
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = useAtlasStore((s) => s.reducedMotion);
  const activeSection = useAtlasStore((s) => s.activeSection);
  const loaderDone = useAtlasStore((s) => s.loaderDone);

  /* Scrub zaman çizelgeleri: ilerleme çizgisi + metin bloğunun paralaksı ve solması */
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      root.querySelectorAll<HTMLElement>('[data-section]').forEach((section) => {
        const id = section.dataset.section;
        if (!isSectionId(id)) return;
        const hero = id === 'hero';
        const progress = section.querySelector('[data-progress]');
        const copy = section.querySelector('[data-copy]');

        if (progress) {
          gsap.fromTo(
            progress,
            { scaleX: 0 },
            {
              scaleX: 1,
              ease: 'none',
              scrollTrigger: { trigger: section, start: 'top top', end: 'bottom bottom', scrub: true },
            },
          );
        }

        if (copy && !reduced) {
          const tl = gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: {
              trigger: section,
              start: hero ? 'top top' : 'top 70%',
              end: 'bottom bottom',
              scrub: 1,
            },
          });
          if (!hero) tl.fromTo(copy, { opacity: 0 }, { opacity: 1, duration: 0.1 }, 0);
          tl.to(copy, { y: hero ? -50 : -70, duration: 1 }, 0);
          tl.to(copy, { opacity: 0, ease: 'power2.in', duration: hero ? 0.45 : 0.22 }, hero ? 0.55 : 0.78);
        }
      });
    }, root);

    return () => ctx.revert();
  }, [reduced]);

  return (
    <div ref={rootRef}>
      {SECTION_ORDER.map((id) => {
        const cfg = SECTION_CONFIG[id];
        const active = loaderDone && activeSection === id;
        return (
          <section
            key={id}
            id={`section-${id}`}
            data-section={id}
            aria-label={cfg.navLabel}
            className="relative"
            style={{ height: `${SECTION_VH[id]}vh` }}
          >
            <div className="sticky top-0 h-[100svh] overflow-hidden">
              {cfg.align === 'center' ? (
                <CenterCopy cfg={cfg} active={active} hero={id === 'hero'} />
              ) : (
                <SideCopy cfg={cfg} active={active} />
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
