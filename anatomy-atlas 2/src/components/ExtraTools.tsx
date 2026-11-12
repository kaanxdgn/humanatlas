import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Clapperboard, Gamepad2, Keyboard, Pause, Play, Scissors, X } from 'lucide-react';
import { getAnatomyItem } from '@/data/anatomyData';
import { getStory } from '@/data/stories';
import { SECTION_CONFIG, SECTION_ORDER, type SectionId, type LayerKey } from '@/data/systemsConfig';
import { goToSection } from '@/hooks/useScrollSystemSync';
import { useAtlasStore } from '@/store/useAtlasStore';
import { useExtrasStore } from '@/store/useExtrasStore';
import { cameraApi } from '@/utils/cameraApi';

const TOUR_SECTIONS: readonly SectionId[] = ['skin', 'skeleton', 'muscular', 'organs', 'vascular', 'nervous', 'final'];
const TOUR_STEP_MS = 9000;
const ORGAN_TOUR = ['brain', 'lungs', 'heart', 'liver', 'stomach', 'pancreas', 'kidneys', 'small-intestine', 'large-intestine'];

/** Bir hikâyenin sahne listesi: [yapı id, altyazı metni | null]. */
function storySteps(storyId: string): { id: string; text: string | null }[] {
  const st = getStory(storyId);
  if (st.steps) return st.steps.filter((x) => getAnatomyItem(x.id)).map((x) => ({ id: x.id, text: x.text }));
  return ORGAN_TOUR.filter((id) => getAnatomyItem(id)).map((id) => ({ id, text: null }));
}

/** Sinematik tur / hikâye: yapı yapı uçar, yalnızca o yapıyı bırakır ve altyazıyla anlatır. */
function useCine(): void {
  const story = useExtrasStore((s) => s.cine?.story ?? null);
  useEffect(() => {
    if (!story) return;
    const steps = storySteps(story);
    const ms = getStory(story).stepMs ?? 9000;
    let i = 0;
    const show = (): void => {
      const step = steps[i % steps.length];
      if (!step) return;
      const a = useAtlasStore.getState();
      if (a.activeSection === 'hero' || a.activeSection === 'skin') goToSection('organs');
      window.setTimeout(() => {
        if (useExtrasStore.getState().cine) useAtlasStore.getState().selectStructure(step.id);
      }, 250);
      useExtrasStore.getState().setCineIndex(i % steps.length);
      i += 1;
    };
    show();
    const timer = window.setInterval(show, ms);
    const stop = (): void => useExtrasStore.getState().stopCine();
    window.addEventListener('wheel', stop, { passive: true });
    window.addEventListener('touchmove', stop, { passive: true });
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('wheel', stop);
      window.removeEventListener('touchmove', stop);
    };
  }, [story]);
}

/** Altta film altyazısı gibi organ anlatımı. */
function CineCaption() {
  const cine = useExtrasStore((s) => s.cine);
  if (!cine) return null;
  const steps = storySteps(cine.story);
  const step = steps[cine.index];
  const item = getAnatomyItem(step?.id ?? '');
  if (!item || !step) return null;
  const ids = steps.map((x) => x.id);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-28 z-40 flex justify-center px-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.6 }}
          className="max-w-xl text-center"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">{item.nameLatin}</p>
          <p className="mt-1 text-3xl font-light text-white drop-shadow-lg sm:text-4xl">{item.nameTR}</p>
          <p className="mt-2 text-sm leading-relaxed text-white/75 drop-shadow">{step.text ?? item.summary}</p>
          <div className="mt-3 flex justify-center gap-1.5">
            {ids.map((id, k) => (
              <span key={id} className={`h-1 rounded-full transition-all ${k === cine.index ? 'w-6 bg-accent' : 'w-2 bg-white/25'}`} />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** Kesit düzlemi paneli (alt orta). */
function CutPanel() {
  const cut = useExtrasStore((s) => s.cut);
  if (!cut.on) return null;
  const set = useExtrasStore.getState().setCut;
  const axes: readonly { k: 'y' | 'x' | 'z'; l: string }[] = [
    { k: 'y', l: 'Yatay' },
    { k: 'x', l: 'Yan' },
    { k: 'z', l: 'Ön-arka' },
  ];
  return (
    <div className="fixed bottom-28 left-1/2 z-40 w-[min(92vw,26rem)] -translate-x-1/2">
      <div className="glass-strong rounded-2xl px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/55">Kesit düzlemi</span>
          <div className="flex gap-1">
            {axes.map((a) => (
              <button
                key={a.k}
                type="button"
                onClick={() => set({ axis: a.k })}
                className={`rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] ${cut.axis === a.k ? 'bg-accent/90 text-black' : 'text-white/65 hover:text-white'}`}
              >
                {a.l}
              </button>
            ))}
            <button type="button" aria-label="Kesiti kapat" onClick={() => set({ on: false })} className="ml-1 text-white/55 hover:text-white">
              <X size={14} />
            </button>
          </div>
        </div>
        <input
          aria-label="Kesit konumu"
          type="range"
          min={0}
          max={1}
          step={0.005}
          value={cut.pos}
          onChange={(e) => set({ pos: Number(e.target.value) })}
          className="mt-3 w-full accent-[var(--accent,#7cf)]"
        />
      </div>
    </div>
  );
}

/** Bölümler arasında kendiliğinden gezen tur: yeni bir sinyal gelince (kaydırma, tuş, dokunma) durur. */
function useTour(): void {
  const tour = useExtrasStore((s) => s.tour);

  useEffect(() => {
    if (!tour) return;
    const stop = (): void => useExtrasStore.getState().setTour(false);
    const next = (): void => {
      const cur = useAtlasStore.getState().activeSection;
      const i = TOUR_SECTIONS.indexOf(cur);
      goToSection(TOUR_SECTIONS[(i + 1) % TOUR_SECTIONS.length] ?? 'skin');
    };
    const first = useAtlasStore.getState().activeSection;
    if (!TOUR_SECTIONS.includes(first)) goToSection('skin');
    const timer = window.setInterval(next, TOUR_STEP_MS);
    window.addEventListener('wheel', stop, { passive: true });
    window.addEventListener('touchmove', stop, { passive: true });
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('wheel', stop);
      window.removeEventListener('touchmove', stop);
    };
  }, [tour]);
}

/** Klavye kısayolları (yazı alanlarındayken devre dışı). */
function useShortcuts(startQuiz: () => void): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const atlas = useAtlasStore.getState();
      const ex = useExtrasStore.getState();
      if (atlas.paletteOpen || ex.interior) return;
      const step = (d: number): void => {
        const i = SECTION_ORDER.indexOf(atlas.activeSection);
        const n = SECTION_ORDER[Math.min(SECTION_ORDER.length - 1, Math.max(0, i + d))];
        if (n) goToSection(n);
      };
      if (e.key === 'Escape') {
        if (ex.helpOpen) ex.setHelpOpen(false);
        else if (ex.cine) ex.stopCine();
        else if (ex.quiz) ex.stopQuiz();
        else if (ex.tour) ex.setTour(false);
        return;
      }
      switch (e.key) {
        case 'ArrowRight': step(1); break;
        case 'ArrowLeft': step(-1); break;
        case '+': case '=': cameraApi.setDistance(cameraApi.getDistance() * 0.8); break;
        case '-': case '_': cameraApi.setDistance(cameraApi.getDistance() * 1.25); break;
        case 't': case 'T': ex.setTour(!ex.tour); break;
        case 'q': case 'Q': if (ex.quiz) ex.stopQuiz(); else startQuiz(); break;
        case 'c': case 'C': if (ex.cine) ex.stopCine(); else ex.startCine(); break;
        case 'x': case 'X': ex.setCut({ on: !ex.cut.on }); break;
        case '?': ex.setHelpOpen(!ex.helpOpen); break;
        default: return;
      }
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [startQuiz]);
}

const SHORTCUTS: readonly { keys: string; action: string }[] = [
  { keys: '← / →', action: 'Önceki / sonraki bölüm' },
  { keys: '+ / −', action: 'Yaklaştır / uzaklaştır' },
  { keys: 'C', action: 'Sinematik organ turu' },
  { keys: 'L', action: 'X-ray mercek' },
  { keys: 'M', action: 'Kalp ve nefes sesi' },
  { keys: 'P', action: 'Ekran görüntüsü' },
  { keys: 'X', action: 'Kesit düzlemi aç / kapat' },
  { keys: 'T', action: 'Otomatik tur aç / kapat' },
  { keys: 'Q', action: '“Bul ve tıkla” oyununu başlat / bitir' },
  { keys: 'Ctrl / ⌘ + K', action: 'Yapı ara' },
  { keys: '?', action: 'Bu yardım penceresi' },
  { keys: 'Esc', action: 'Pencere / oyun / turu kapat' },
];

function ToolButton({ label, active, onClick, children }: { label: string; active?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
      className={`grid h-9 w-9 place-items-center rounded-full border transition-colors ${
        active ? 'border-accent/70 bg-accent/20 text-accent' : 'border-transparent text-white/75 hover:bg-white/10 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

/** Üstte ortada: oyun ilerlemesi + soru + geri bildirim. */
function QuizHud() {
  const quiz = useExtrasStore((s) => s.quiz);
  if (!quiz) return null;
  const target = getAnatomyItem(quiz.ids[quiz.index] ?? '');
  const total = quiz.ids.length;

  if (quiz.finished) {
    const pct = Math.round((quiz.score / total) * 100);
    return (
      <div className="fixed inset-0 z-[70] grid place-items-center bg-black/55 px-4 backdrop-blur-sm">
        <div className="glass-strong w-full max-w-sm rounded-3xl p-7 text-center">
          <p className="eyebrow">Oyun bitti</p>
          <p className="mt-3 font-display text-5xl font-light text-white">{quiz.score}<span className="text-white/40"> / {total}</span></p>
          <p className="mt-2 text-sm text-white/65">
            {pct >= 85 ? 'Harika! Anatomi gözün keskin.' : pct >= 50 ? 'İyi gidiyorsun, bir tur daha?' : 'Katmanları biraz daha gez, sonra tekrar dene.'}
          </p>
          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={() => useExtrasStore.getState().startQuiz(quiz.system)}
              className="flex-1 rounded-full bg-accent py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-black"
            >
              Tekrar oyna
            </button>
            <button
              type="button"
              onClick={() => useExtrasStore.getState().stopQuiz()}
              className="flex-1 rounded-full border border-white/20 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-white/80 hover:text-white"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed left-1/2 top-[4.75rem] z-40 w-[min(92vw,30rem)] -translate-x-1/2" role="status" aria-live="polite">
      <div className="glass-strong rounded-2xl px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/55">
            Soru {quiz.index + 1}/{total} · Puan {quiz.score}
          </span>
          <button type="button" aria-label="Oyunu bitir" onClick={() => useExtrasStore.getState().stopQuiz()} className="text-white/55 hover:text-white">
            <X size={14} />
          </button>
        </div>
        <p className="mt-1.5 text-lg font-light text-white">
          <span className="text-accent">{target?.nameTR ?? '…'}</span> yapısını modelde bul ve tıkla
        </p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <AnimatePresence mode="wait">
            <motion.span
              key={quiz.feedback?.text ?? 'empty'}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`text-xs ${quiz.feedback?.kind === 'ok' ? 'text-emerald-300' : 'text-rose-300'}`}
            >
              {quiz.feedback?.text ?? ' '}
            </motion.span>
          </AnimatePresence>
          <span className="flex gap-3 font-mono text-[10px] uppercase tracking-[0.18em]">
            <button type="button" onClick={() => useExtrasStore.getState().hint()} className="text-white/60 hover:text-accent">İpucu</button>
            <button type="button" onClick={() => useExtrasStore.getState().skip()} className="text-white/60 hover:text-white">Geç</button>
          </span>
        </div>
      </div>
    </div>
  );
}

function HelpModal() {
  const open = useExtrasStore((s) => s.helpOpen);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] grid place-items-center bg-black/55 px-4 backdrop-blur-sm"
          onClick={() => useExtrasStore.getState().setHelpOpen(false)}
        >
          <div role="dialog" aria-label="Kısayollar" className="glass-strong w-full max-w-md rounded-3xl p-7" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="eyebrow">Kısayollar ve ipuçları</p>
              <button type="button" aria-label="Kapat" onClick={() => useExtrasStore.getState().setHelpOpen(false)} className="text-white/60 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <dl className="mt-5 space-y-2.5">
              {SHORTCUTS.map((s) => (
                <div key={s.keys} className="flex items-baseline justify-between gap-4 border-b border-white/10 pb-2">
                  <dt className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent">{s.keys}</dt>
                  <dd className="text-right text-sm text-white/70">{s.action}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs leading-relaxed text-white/45">
              Fare ile sürükleyerek bedeni döndür, bir yapıya tıklayınca bilgi kartı açılır. Katmanlar panelini istediğin yere taşıyabilirsin.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Üstte ortada küçük “Tur” etiketi. */
function TourBadge() {
  const tour = useExtrasStore((s) => s.tour);
  const section = useAtlasStore((s) => s.activeSection);
  const quiz = useExtrasStore((s) => s.quiz);
  if (!tour || quiz) return null;
  return (
    <div className="pointer-events-none fixed left-1/2 top-[4.5rem] z-40 -translate-x-1/2">
      <div className="glass-strong flex items-center gap-2 rounded-full px-3.5 py-1.5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/70">
          Otomatik tur · {SECTION_CONFIG[section].navLabel}
        </span>
      </div>
    </div>
  );
}

export default function ExtraTools() {
  const loaderDone = useAtlasStore((s) => s.loaderDone);
  const mobile = useAtlasStore((s) => s.isMobile);
  const selectedId = useAtlasStore((s) => s.selectedId);
  const tour = useExtrasStore((s) => s.tour);
  const quiz = useExtrasStore((s) => s.quiz);
  const cine = useExtrasStore((s) => s.cine !== null);
  const cutOn = useExtrasStore((s) => s.cut.on);

  const startQuiz = (): void => {
    const atlas = useAtlasStore.getState();
    let system: LayerKey = atlas.activeSystem;
    if (system === 'skin') {
      system = 'skeleton';
      goToSection('skeleton');
    }
    useExtrasStore.getState().startQuiz(system);
  };

  useTour();
  useCine();
  useShortcuts(startQuiz);

  return (
    <>
      <QuizHud />
      <TourBadge />
      <CineCaption />
      <CutPanel />
      <HelpModal />
      {loaderDone && !(mobile && selectedId !== null) && (
        <div className="fixed left-2 top-[calc(50%+118px)] z-30 max-[640px]:hidden sm:left-3 max-h-[calc(50vh-130px)]">
          <div className="glass-strong flex w-11 flex-col items-center gap-1 rounded-full px-1 py-2">
            <ToolButton label={tour ? 'Turu durdur (T)' : 'Otomatik tur (T)'} active={tour} onClick={() => useExtrasStore.getState().setTour(!tour)}>
              {tour ? <Pause size={15} /> : <Play size={15} />}
            </ToolButton>
            <ToolButton label={cine ? 'Sinematik turu durdur (C)' : 'Sinematik organ turu (C)'} active={cine} onClick={() => (cine ? useExtrasStore.getState().stopCine() : useExtrasStore.getState().startCine())}>
              <Clapperboard size={15} />
            </ToolButton>
            <ToolButton label={cutOn ? 'Kesiti kapat (X)' : 'Kesit düzlemi (X)'} active={cutOn} onClick={() => useExtrasStore.getState().setCut({ on: !cutOn })}>
              <Scissors size={15} />
            </ToolButton>
            <ToolButton
              label={quiz ? 'Oyunu bitir (Q)' : 'Bul ve tıkla oyunu (Q)'}
              active={!!quiz}
              onClick={() => (quiz ? useExtrasStore.getState().stopQuiz() : startQuiz())}
            >
              <Gamepad2 size={15} />
            </ToolButton>
            <ToolButton label="Kısayollar (?)" onClick={() => useExtrasStore.getState().setHelpOpen(true)}>
              <Keyboard size={15} />
            </ToolButton>
          </div>
        </div>
      )}
    </>
  );
}

