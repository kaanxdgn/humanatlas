import { create } from 'zustand';
import {
  FOCUS_MODES,
  LAYER_KEYS,
  SECTION_CONFIG,
  SYSTEM_BY_KEY,
  type FocusMode,
  type LayerKey,
  type SectionId,
  type Vec3,
} from '@/data/systemsConfig';
import { getAnatomyItem } from '@/data/anatomyData';
import { clamp } from '@/utils/math';

/** Görsel kalite kademeleri (PerformanceMonitor ile otomatik değişir). */
export type PerfTier = 'high' | 'medium' | 'low';
const TIER_ORDER: readonly PerfTier[] = ['low', 'medium', 'high'] as const;

/** Kameranın uçacağı hedef; CameraRig bunu GSAP ile oynatır. */
export interface CameraGoal {
  id: number;
  position: Vec3;
  target: Vec3;
  duration: number;
}

const allOnes = (): Record<LayerKey, number> => ({
  skin: 1,
  skeleton: 1,
  muscular: 1,
  organs: 1,
  vascular: 1,
  nervous: 1,
});

/* Cihaz tespiti: mobil veya zayıf cihazlarda efektler azaltılır */
const isBrowser = typeof window !== 'undefined';
const detectMobile = (): boolean =>
  isBrowser && (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 820);
const detectLowCores = (): boolean =>
  isBrowser && (navigator.hardwareConcurrency ?? 8) <= 4;

const MOBILE = detectMobile();
const MAX_TIER: PerfTier = MOBILE || detectLowCores() ? 'medium' : 'high';

interface AtlasState {
  /* Yükleme */
  sceneReady: boolean;
  loaderDone: boolean;

  /* Bölüm / sistem */
  activeSection: SectionId;
  activeSystem: LayerKey;
  accent: string;
  accent2: string;

  /* Etkileşim */
  selectedId: string | null;
  hoveredId: string | null;
  focusMode: FocusMode;
  freeExplore: boolean;
  paletteOpen: boolean;

  /* Katman kaydırıcıları (non-free modda çarpan, free modda doğrudan hedef) */
  layerOpacity: Record<LayerKey, number>;

  /* Performans / erişilebilirlik */
  perfTier: PerfTier;
  maxTier: PerfTier;
  isMobile: boolean;
  reducedMotion: boolean;

  /* Kamera */
  cameraGoal: CameraGoal | null;

  /* Aksiyonlar */
  setSceneReady: (v: boolean) => void;
  setLoaderDone: (v: boolean) => void;
  setActiveSection: (section: SectionId) => void;
  selectStructure: (id: string) => void;
  clearSelection: () => void;
  setHovered: (id: string | null) => void;
  setFocusMode: (mode: FocusMode) => void;
  setLayerOpacity: (key: LayerKey, value: number) => void;
  resetLayers: () => void;
  enterManualLayers: () => void;
  setPaletteOpen: (open: boolean) => void;
  togglePalette: () => void;
  flyTo: (position: Vec3, target: Vec3, duration?: number) => void;
  degradePerf: () => void;
  upgradePerf: () => void;
  setReducedMotion: (v: boolean) => void;
}

let goalSeq = 0;

export const useAtlasStore = create<AtlasState>((set, get) => ({
  sceneReady: false,
  loaderDone: false,

  activeSection: 'hero',
  activeSystem: 'skin',
  accent: SECTION_CONFIG.hero.accent,
  accent2: SECTION_CONFIG.hero.accent2,

  selectedId: null,
  hoveredId: null,
  focusMode: 'none',
  freeExplore: false,
  paletteOpen: false,

  layerOpacity: allOnes(),

  perfTier: MAX_TIER === 'high' ? 'medium' : MAX_TIER,
  maxTier: MAX_TIER,
  isMobile: MOBILE,
  reducedMotion: false,

  cameraGoal: null,

  setSceneReady: (v) => set({ sceneReady: v }),
  setLoaderDone: (v) => set({ loaderDone: v }),

  setActiveSection: (section) => {
    const state = get();
    if (state.activeSection === section) return;
    const cfg = SECTION_CONFIG[section];
    const enteringFinal = section === 'final';
    set({
      activeSection: section,
      activeSystem: cfg.system,
      accent: cfg.accent,
      accent2: cfg.accent2,
      selectedId: null,
      hoveredId: null,
      focusMode: 'none',
      // Final bölümünde serbest keşif: slider değerleri doğrudan hedef olur
      freeExplore: enteringFinal,
      layerOpacity: enteringFinal ? { ...cfg.layers } : allOnes(),
    });
    get().flyTo(cfg.camera.position, cfg.camera.target, 1.6);
  },

  selectStructure: (id) => {
    const item = getAnatomyItem(id);
    if (!item) return;
    const sys = SYSTEM_BY_KEY[item.system];
    set({
      selectedId: id,
      hoveredId: null,
      paletteOpen: false,
      accent: sys.accent,
      accent2: sys.accent2,
    });
    get().flyTo(item.cameraPosition, item.cameraTarget, 1.5);
  },

  clearSelection: () => {
    const cfg = SECTION_CONFIG[get().activeSection];
    set({ selectedId: null, hoveredId: null, accent: cfg.accent, accent2: cfg.accent2 });
    get().flyTo(cfg.camera.position, cfg.camera.target, 1.4);
  },

  setHovered: (id) => {
    if (get().hoveredId !== id) set({ hoveredId: id });
  },

  setFocusMode: (mode) => {
    const section = SECTION_CONFIG[get().activeSection];
    if (mode === 'none') {
      set({ focusMode: 'none', accent: section.accent, accent2: section.accent2 });
      get().flyTo(section.camera.position, section.camera.target, 1.3);
      return;
    }
    const cfg = FOCUS_MODES[mode];
    const organsCam = SECTION_CONFIG.organs.camera;
    set({
      focusMode: mode,
      selectedId: null,
      hoveredId: null,
      accent: cfg.accent,
      accent2: SECTION_CONFIG.organs.accent2,
    });
    get().flyTo(organsCam.position, organsCam.target, 1.5);
  },

  setLayerOpacity: (key, value) =>
    set((s) => ({ layerOpacity: { ...s.layerOpacity, [key]: clamp(value, 0, 1) } })),

  resetLayers: () =>
    set((s) => {
      const final = s.activeSection === 'final';
      return {
        freeExplore: final,
        layerOpacity: final ? { ...SECTION_CONFIG.final.layers } : allOnes(),
      };
    }),

  /** Kaydırıcıya dokunulunca: bölümün güncel seviyelerini doğrudan hedef yapıp serbest moda geçer. */
  enterManualLayers: () => {
    const s = get();
    if (s.freeExplore) return;
    const base = SECTION_CONFIG[s.activeSection].layers;
    const next = {} as Record<LayerKey, number>;
    for (const key of LAYER_KEYS) next[key] = base[key] * s.layerOpacity[key];
    set({ freeExplore: true, layerOpacity: next });
  },

  setPaletteOpen: (open) => set({ paletteOpen: open }),
  togglePalette: () => set((s) => ({ paletteOpen: !s.paletteOpen })),

  flyTo: (position, target, duration = 1.4) =>
    set({ cameraGoal: { id: ++goalSeq, position, target, duration } }),

  degradePerf: () => {
    const { perfTier } = get();
    const i = TIER_ORDER.indexOf(perfTier);
    if (i > 0) set({ perfTier: TIER_ORDER[i - 1] });
  },

  upgradePerf: () => {
    const { perfTier, maxTier } = get();
    const i = TIER_ORDER.indexOf(perfTier);
    if (i < TIER_ORDER.indexOf(maxTier)) set({ perfTier: TIER_ORDER[i + 1] });
  },

  setReducedMotion: (v) => set({ reducedMotion: v }),
}));
