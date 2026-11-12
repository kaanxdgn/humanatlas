import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Camera, Dumbbell, HeartPulse, ScanSearch, Volume2, VolumeX, X } from 'lucide-react';
import { PATHOLOGIES, STORIES } from '@/data/stories';
import { vitals } from '@/scene/Body/helpers/heartbeat';
import { useAtlasStore } from '@/store/useAtlasStore';
import { useExtrasStore } from '@/store/useExtrasStore';
import { setSoundOn } from '@/utils/sound';

type Panel = 'exercise' | 'patho' | null;

function Btn({ label, active, onClick, children }: { label: string; active?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`grid h-9 w-9 place-items-center rounded-full transition-colors ${active ? 'bg-accent/90 text-black' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
    >
      {children}
    </button>
  );
}

function Bpm() {
  const [v, setV] = useState({ bpm: 72, rpm: 15 });
  useEffect(() => {
    const t = window.setInterval(() => setV({ bpm: Math.round(vitals.bpm), rpm: Math.round(vitals.rpm) }), 250);
    return () => window.clearInterval(t);
  }, []);
  return (
    <div className="mt-3 flex gap-6 font-mono text-[11px] uppercase tracking-[0.16em] text-white/70">
      <span>
        <b className="text-lg font-light text-white">{v.bpm}</b> nabız/dk
      </span>
      <span>
        <b className="text-lg font-light text-white">{v.rpm}</b> nefes/dk
      </span>
    </div>
  );
}

function ExercisePanel() {
  const effort = useExtrasStore((s) => s.effort);
  const label = effort < 0.15 ? 'Dinlenme' : effort < 0.5 ? 'Yürüyüş' : effort < 0.85 ? 'Koşu' : 'Sprint';
  return (
    <div>
      <p className="eyebrow">Egzersiz modu · {label}</p>
      <input
        aria-label="Efor düzeyi"
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={effort}
        onChange={(e) => useExtrasStore.getState().setEffort(Number(e.target.value))}
        className="mt-3 w-full accent-[var(--accent,#7cf)]"
      />
      <Bpm />
      <p className="mt-2 text-xs leading-relaxed text-white/50">
        Efor arttıkça kalp ve solunum hızlanır, kaslar ısınıp parlar. Kas ve damar katmanlarını açarak izle.
      </p>
    </div>
  );
}

function PathoPanel() {
  const patho = useExtrasStore((s) => s.patho);
  const cur = PATHOLOGIES.find((p) => p.id === patho.id) ?? null;
  const pick = (id: string | null): void => {
    useExtrasStore.getState().setPatho({ id });
    const p = PATHOLOGIES.find((x) => x.id === id);
    if (p) {
      const a = useAtlasStore.getState();
      a.selectStructure(p.organ);
    }
  };
  return (
    <div>
      <p className="eyebrow">Sağlıklı ↔ hastalıklı</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {PATHOLOGIES.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => pick(patho.id === p.id ? null : p.id)}
            className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] ${patho.id === p.id ? 'bg-accent/90 text-black' : 'border border-white/20 text-white/70 hover:text-white'}`}
          >
            {p.title}
          </button>
        ))}
      </div>
      {cur && (
        <>
          <div className="mt-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white/55">
            <span>Sağlıklı</span>
            <input
              aria-label="Hastalık düzeyi"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={patho.amount}
              onChange={(e) => useExtrasStore.getState().setPatho({ amount: Number(e.target.value) })}
              className="flex-1 accent-[var(--accent,#7cf)]"
            />
            <span>Hasarlı</span>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-white/75">{patho.amount < 0.4 ? cur.healthy : cur.sick}</p>
          <p className="mt-2 text-[10px] leading-relaxed text-white/40">Eğitim amaçlı basitleştirilmiş görseldir; tıbbi tavsiye değildir.</p>
        </>
      )}
    </div>
  );
}

function StoriesModal() {
  const open = useExtrasStore((s) => s.storiesOpen);
  const close = (): void => useExtrasStore.getState().setStoriesOpen(false);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] grid place-items-center bg-black/55 px-4 backdrop-blur-sm"
          onClick={close}
        >
          <div role="dialog" aria-label="Hikâyeler" className="glass-strong w-full max-w-md rounded-3xl p-7" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="eyebrow">Yolculuklar</p>
              <button type="button" aria-label="Kapat" onClick={close} className="text-white/60 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <ul className="mt-5 space-y-2.5">
              {STORIES.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => useExtrasStore.getState().startCine(s.id)}
                    className="w-full rounded-2xl border border-white/10 px-4 py-3 text-left transition-colors hover:border-accent/60 hover:bg-white/5"
                  >
                    <span className="block text-base text-white">{s.title}</span>
                    <span className="mt-0.5 block text-xs text-white/55">{s.blurb}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Sol altta ikinci araç şeridi: mercek, egzersiz, patoloji, hikâyeler, ses, ekran görüntüsü. */
export default function MoreTools() {
  const loaderDone = useAtlasStore((s) => s.loaderDone);
  const lens = useExtrasStore((s) => s.lens);
  const sound = useExtrasStore((s) => s.sound);
  const effort = useExtrasStore((s) => s.effort);
  const inside = useExtrasStore((s) => s.interior !== null);
  const patho = useExtrasStore((s) => s.patho.id);
  const [panel, setPanel] = useState<Panel>(null);

  const toggleSound = (): void => {
    const next = !useExtrasStore.getState().sound;
    useExtrasStore.getState().setSound(next);
    setSoundOn(next);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const ex = useExtrasStore.getState();
      if (ex.interior || useAtlasStore.getState().paletteOpen) return;
      if (e.key === 'l' || e.key === 'L') ex.setLens(!ex.lens);
      else if (e.key === 'p' || e.key === 'P') ex.takeShot();
      else if (e.key === 'm' || e.key === 'M') toggleSound();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!loaderDone || inside) return null;
  const x = useExtrasStore.getState();

  return (
    <>
      <StoriesModal />
      <div className="fixed bottom-4 right-2 z-30 flex flex-col items-end gap-2 max-[640px]:hidden sm:right-3">
        <AnimatePresence>
          {panel && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="glass-strong w-[min(88vw,19rem)] rounded-2xl p-4"
            >
              <div className="mb-1 flex justify-end">
                <button type="button" aria-label="Paneli kapat" onClick={() => setPanel(null)} className="text-white/50 hover:text-white">
                  <X size={13} />
                </button>
              </div>
              {panel === 'exercise' ? <ExercisePanel /> : <PathoPanel />}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="glass-strong flex items-center gap-0.5 rounded-full px-1.5 py-1">
          <Btn label={lens ? 'X-ray merceği kapat (L)' : 'X-ray merceği (L)'} active={lens} onClick={() => x.setLens(!lens)}>
            <ScanSearch size={16} />
          </Btn>
          <Btn label="Egzersiz modu" active={panel === 'exercise' || effort > 0.02} onClick={() => setPanel(panel === 'exercise' ? null : 'exercise')}>
            <Dumbbell size={16} />
          </Btn>
          <Btn label="Sağlıklı ↔ hastalıklı" active={panel === 'patho' || patho !== null} onClick={() => setPanel(panel === 'patho' ? null : 'patho')}>
            <HeartPulse size={16} />
          </Btn>
          <Btn label="Yolculuk hikâyeleri" onClick={() => x.setStoriesOpen(true)}>
            <BookOpen size={16} />
          </Btn>
          <Btn label={sound ? 'Sesi kapat (M)' : 'Kalp ve nefes sesi (M)'} active={sound} onClick={toggleSound}>
            {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </Btn>
          <Btn label="Ekran görüntüsü al (P)" onClick={() => x.takeShot()}>
            <Camera size={16} />
          </Btn>
        </div>
      </div>
    </>
  );
}
