import { create } from 'zustand';
import { getAnatomyItem, getItemsBySystem } from '@/data/anatomyData';
import type { LayerKey } from '@/data/systemsConfig';
import type { OrganKey } from '@/interior/types';
import { useAtlasStore } from './useAtlasStore';

export interface QuizFeedback {
  kind: 'ok' | 'no';
  text: string;
}

export interface QuizState {
  system: LayerKey;
  ids: string[];
  index: number;
  score: number;
  mistakes: number;
  feedback: QuizFeedback | null;
  finished: boolean;
}

export interface InteriorState {
  organ: OrganKey;
  chapter: number;
  stop: number;
  /** HUD'dan gelen "şu durağa git" isteği (n her istekte artar). */
  seek: { stop: number; chapter: number; n: number };
}

export type CutAxis = 'y' | 'x' | 'z';
export interface CutState {
  on: boolean;
  axis: CutAxis;
  /** 0..1: kesitin bedendeki konumu */
  pos: number;
}

interface ExtrasState {
  cut: CutState;
  setCut: (p: Partial<CutState>) => void;
  lens: boolean;
  setLens: (v: boolean) => void;
  effort: number;
  setEffort: (v: number) => void;
  sound: boolean;
  setSound: (v: boolean) => void;
  patho: { id: string | null; amount: number };
  setPatho: (p: Partial<{ id: string | null; amount: number }>) => void;
  shot: number;
  takeShot: () => void;
  storiesOpen: boolean;
  setStoriesOpen: (v: boolean) => void;
  cine: { index: number; story: string } | null;
  startCine: (story?: string) => void;
  stopCine: () => void;
  setCineIndex: (i: number) => void;
  interior: InteriorState | null;
  enterInterior: (organ: OrganKey) => void;
  exitInterior: () => void;
  gotoStop: (stop: number, chapter: number) => void;
  setActiveStop: (stop: number) => void;
  tour: boolean;
  helpOpen: boolean;
  quiz: QuizState | null;

  setTour: (v: boolean) => void;
  setHelpOpen: (v: boolean) => void;
  startQuiz: (system: LayerKey, count?: number) => void;
  stopQuiz: () => void;
  /** Oyun açıkken 3B'de tıklanan yapıyı değerlendirir. Tıklamayı tükettiyse true döner. */
  answer: (id: string) => boolean;
  skip: () => void;
  hint: () => void;
}

const shuffle = <T,>(a: readonly T[]): T[] => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j]!, r[i]!];
  }
  return r;
};

let advanceTimer = 0;

export const useExtrasStore = create<ExtrasState>((set, get) => ({
  cut: { on: false, axis: 'y', pos: 0.6 },
  setCut: (p) => set((s) => ({ cut: { ...s.cut, ...p } })),
  cine: null,
  lens: false,
  setLens: (v) => set({ lens: v }),
  effort: 0,
  setEffort: (v) => set({ effort: v }),
  sound: false,
  setSound: (v) => set({ sound: v }),
  patho: { id: null, amount: 0.8 },
  setPatho: (p) => set((s) => ({ patho: { ...s.patho, ...p } })),
  shot: 0,
  takeShot: () => set((s) => ({ shot: s.shot + 1 })),
  storiesOpen: false,
  setStoriesOpen: (v) => set({ storiesOpen: v }),
  startCine: (story = 'organs') => {
    get().stopQuiz();
    set({ tour: false, storiesOpen: false, cine: { index: 0, story } });
  },
  stopCine: () => {
    set({ cine: null });
    const a = useAtlasStore.getState();
    if (a.selectedId) a.clearSelection();
  },
  setCineIndex: (i) => set((s) => (s.cine ? { cine: { ...s.cine, index: i } } : s)),
  interior: null,
  enterInterior: (organ) => {
    get().stopQuiz();
    set({ tour: false, cine: null, interior: { organ, chapter: 0, stop: 0, seek: { stop: 0, chapter: 0, n: 0 } } });
  },
  exitInterior: () => set({ interior: null }),
  gotoStop: (stop, chapter) =>
    set((st) =>
      st.interior
        ? { interior: { ...st.interior, chapter, stop, seek: { stop, chapter, n: st.interior.seek.n + 1 } } }
        : st,
    ),
  setActiveStop: (stop) =>
    set((st) => (st.interior && st.interior.stop !== stop ? { interior: { ...st.interior, stop } } : st)),
  tour: false,
  helpOpen: false,
  quiz: null,

  setTour: (v) => set(v ? { tour: true, cine: null } : { tour: false }),
  setHelpOpen: (v) => set({ helpOpen: v }),

  startQuiz: (system, count = 8) => {
    const ids = shuffle(getItemsBySystem(system).map((i) => i.id)).slice(0, count);
    if (ids.length === 0) return;
    useAtlasStore.getState().clearSelection();
    set({ tour: false, quiz: { system, ids, index: 0, score: 0, mistakes: 0, feedback: null, finished: false } });
  },

  stopQuiz: () => {
    window.clearTimeout(advanceTimer);
    set({ quiz: null });
  },

  answer: (id) => {
    const q = get().quiz;
    if (!q || q.finished) return false;
    const target = q.ids[q.index];
    if (!target) return false;
    if (id === target) {
      const score = q.score + 1;
      const last = q.index + 1 >= q.ids.length;
      set({ quiz: { ...q, score, feedback: { kind: 'ok', text: 'Doğru!' } } });
      window.clearTimeout(advanceTimer);
      advanceTimer = window.setTimeout(() => {
        const cur = get().quiz;
        if (!cur) return;
        set({ quiz: { ...cur, index: cur.index + 1, mistakes: 0, feedback: null, finished: last } });
      }, 1100);
    } else {
      const item = getAnatomyItem(id);
      set({
        quiz: { ...q, mistakes: q.mistakes + 1, feedback: { kind: 'no', text: `Bu: ${item?.nameTR ?? 'başka bir yapı'}` } },
      });
    }
    return true;
  },

  skip: () => {
    const q = get().quiz;
    if (!q || q.finished) return;
    window.clearTimeout(advanceTimer);
    const last = q.index + 1 >= q.ids.length;
    set({ quiz: { ...q, index: q.index + 1, mistakes: 0, feedback: null, finished: last } });
  },

  hint: () => {
    const q = get().quiz;
    const target = q ? getAnatomyItem(q.ids[q.index] ?? '') : undefined;
    if (!q || !target) return;
    useAtlasStore.getState().flyTo(target.cameraPosition, target.cameraTarget, 1.3);
    set({ quiz: { ...q, feedback: { kind: 'no', text: 'Kamera bölgeye yaklaştı — şimdi yapıyı bul.' } } });
  },
}));
