import { Component, lazy, Suspense, useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import gsap from 'gsap';
import { getItemsBySystem } from '@/data/anatomyData';
import { SYSTEMS } from '@/data/systemsConfig';
import { useLenis } from '@/hooks/useLenis';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useScrollSystemSync } from '@/hooks/useScrollSystemSync';
import { useAtlasStore } from '@/store/useAtlasStore';
import { useExtrasStore } from '@/store/useExtrasStore';
import { tweenAccent } from '@/utils/gsapSetup';
import { scrollState } from '@/utils/scrollState';
import CommandPalette from '@/components/CommandPalette';
import ExtraTools from '@/components/ExtraTools';
import MoreTools from '@/components/MoreTools';
import Footer from '@/components/Footer';
import InfoPanel from '@/components/InfoPanel';
import LayerSlider from '@/components/LayerSlider';
import Navbar from '@/components/Navbar';
import Preloader from '@/components/Preloader';
import ScrollSections from '@/components/ScrollSections';
import SystemDock from '@/components/SystemDock';
import Tooltip3D from '@/components/Tooltip3D';
import ZoomBar from '@/components/ZoomBar';

// 3B sahne ayrı chunk: Canvas dışı arayüz hemen açılır
const AtlasCanvas = lazy(() => import('@/scene/AtlasCanvas'));
const InteriorOverlay = lazy(() => import('@/interior/InteriorOverlay'));

/** Sahne çökerse (WebGL yok vb.) uygulamanın kalanı ve preloader çalışmaya devam eder. */
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override componentDidCatch(err: Error): void {
    console.error('[atlas] 3B sahne başlatılamadı:', err);
    useAtlasStore.getState().setSceneReady(true); // preloader takılmasın
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="fixed inset-x-4 top-24 z-20 mx-auto max-w-md">
        <div className="glass-strong rounded-2xl p-5 text-center">
          <p className="eyebrow">3B sahne kullanılamıyor</p>
          <p className="mt-2 text-sm text-white/70">
            Tarayıcınız WebGL’i başlatamadı. Sayfa metinleri çalışır, ancak 3B model görüntülenemez.
          </p>
        </div>
      </div>
    );
  }
}

/** Scroll ilerlemesine ve zamana göre süzülen, sistem rengine uyan blur'lu ışık küreleri. */
function Aurora() {
  const reduced = useAtlasStore((s) => s.reducedMotion);
  const a = useRef<HTMLDivElement>(null);
  const b = useRef<HTMLDivElement>(null);
  const c = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduced) return;
    let p = 0;
    const tick = (time: number): void => {
      p += (scrollState.progress - p) * 0.05;
      if (a.current) {
        a.current.style.transform = `translate3d(${-12 + p * 55 + Math.sin(time * 0.12) * 4}vw, ${-8 + p * 70 + Math.cos(time * 0.1) * 3}vh, 0)`;
      }
      if (b.current) {
        b.current.style.transform = `translate3d(${10 - p * 50 + Math.cos(time * 0.09) * 4}vw, ${12 - p * 60 + Math.sin(time * 0.11) * 3}vh, 0)`;
      }
      if (c.current) {
        c.current.style.transform = `translate3d(${Math.sin(time * 0.07) * 8}vw, ${20 - p * 40}vh, 0)`;
      }
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
    };
  }, [reduced]);

  const blob = (rgbVar: string): CSSProperties => ({
    background: `radial-gradient(closest-side, rgb(var(${rgbVar}) / 0.85), transparent)`,
    opacity: 0.17,
  });

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[1] overflow-hidden"
      style={{ mixBlendMode: 'screen' }}
    >
      <div ref={a} className="aurora-blob -left-[15vmax] -top-[12vmax] h-[60vmax] w-[60vmax]" style={blob('--accent-rgb')} />
      <div ref={b} className="aurora-blob -bottom-[18vmax] -right-[15vmax] h-[65vmax] w-[65vmax]" style={blob('--accent-2-rgb')} />
      <div ref={c} className="aurora-blob left-1/3 top-1/3 h-[36vmax] w-[36vmax]" style={blob('--accent-rgb')} />
    </div>
  );
}

/**
 * Ekran okuyucular için 3B sahnenin metinsel karşılığı: tüm yapılar, adları ve açıklamalarıyla.
 * Etkileşimli öğe içermez (73 gizli düğmeyi Tab ile gezmek yerine Ctrl/⌘+K paleti kullanılır).
 */
function ScreenReaderStructures() {
  return (
    <section className="sr-only" aria-label="Anatomik yapılar listesi">
      <h2>Atlastaki anatomik yapılar</h2>
      <p>
        Bu liste 3B sahnenin metin karşılığıdır. Bir yapıyı seçip ayrıntılı bilgi panelini açmak için Ctrl veya Komut
        tuşu ile K’ya basarak arama kutusunu kullanabilirsiniz.
      </p>
      {SYSTEMS.map((sys) => (
        <div key={sys.key}>
          <h3>
            {sys.labelTR} (<span lang="la">{sys.labelLatin}</span>)
          </h3>
          <ul>
            {getItemsBySystem(sys.key).map((it) => (
              <li key={it.id}>
                <strong>{it.nameTR}</strong> (<span lang="la">{it.nameLatin}</span>): {it.summary}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__extras = useExtrasStore;
if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__atlas = useAtlasStore;

export default function App() {
  const reduced = useReducedMotion();
  const accent = useAtlasStore((s) => s.accent);
  const accent2 = useAtlasStore((s) => s.accent2);
  const inside = useExtrasStore((s) => s.interior !== null);

  useLenis();
  // ScrollSections'ın trigger'ları (çocuk efektleri) önce kurulur; bu hook sonra çalışır
  useScrollSystemSync(true);

  /* Arayüz vurgu rengi: aktif sisteme göre yumuşakça değişir */
  useEffect(() => {
    tweenAccent(accent, accent2, reduced ? 0.01 : 1.2);
  }, [accent, accent2, reduced]);

  /* Görünüm alanı mobil eşiğini geçerse (tablet döndürme vb.) bilgi paneli türü güncellenir */
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 819px), (pointer: coarse)');
    const apply = (): void => useAtlasStore.setState({ isMobile: mq.matches });
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  return (
    <>
      <a
        href="#content"
        className="glass-strong sr-only rounded-full px-4 py-2 text-sm text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[110]"
      >
        İçeriğe geç
      </a>

      <Preloader />

      {/* Arka plan katmanları: 3B sahne → ızgara → aurora → vinyet */}
      <SceneBoundary>
        <Suspense fallback={null}>
          <AtlasCanvas />
        </Suspense>
      </SceneBoundary>
      <div className="hologram-grid" aria-hidden="true" />
      <Aurora />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[2]"
        style={{ background: 'radial-gradient(120% 100% at 50% 45%, transparent 55%, rgba(5,7,13,0.65) 100%)' }}
      />

      <Navbar />

      {/* İçerik katmanı sahneye olayları geçirir (yalnızca etkileşimli öğeler pe-auto) */}
      <main id="content" className="pe-none relative z-10">
        <ScrollSections />
      </main>
      <Footer />

      <SystemDock />
      <LayerSlider />
      <ZoomBar />
      <ExtraTools />
      <MoreTools />
      <InfoPanel />
      <CommandPalette />
      <Tooltip3D />
      <ScreenReaderStructures />
      {inside && (
        <SceneBoundary>
          <Suspense fallback={null}>
            <InteriorOverlay />
          </Suspense>
        </SceneBoundary>
      )}

      <div className="film-grain" aria-hidden="true" />
    </>
  );
}
