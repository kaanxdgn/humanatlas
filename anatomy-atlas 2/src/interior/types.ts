export type V3 = [number, number, number];
export type OrganKey = 'heart' | 'lungs' | 'stomach';
/** Valf/sfinkter hangi evrede açılır: sistol, diyastol ya da yavaş ritim. */
export type Phase = 'sys' | 'dia' | 'slow';

/** Duvarda bir nokta: yol üzerindeki mesafe d + açı (ang) ya da dünya yönü (toward). */
export interface Spot {
  d: number;
  /** Dünya koordinatı (cm, model uzayı); verilirse d/ang yerine kullanılır. */
  at?: V3;
  ang?: number;
  toward?: V3;
}

export interface ValveDef {
  d: number;
  kind: 'semilunar' | 'av';
  leaflets: 2 | 3;
  phase: Phase;
  /** Akış yönü: +1 = yol yönünde, -1 = yola ters. */
  flow: 1 | -1;
  /** Kapak halkası yarıçapı çarpanı (varsayılan 1). */
  rk?: number;
  color?: string;
  chordae?: { papD: number; toward: V3[]; len: number; count: number };
}

export interface StudDef {
  d0: number;
  d1: number;
  count: number;
  shape: 'sphere' | 'cone' | 'ridge' | 'hair' | 'finger';
  /** [genişlik, uzunluk] */
  size: [number, number];
  color: string;
  colorVar?: number;
  sway?: boolean;
  /** Yalnız bu açı aralığında (radyan). */
  angMin?: number;
  angMax?: number;
}

export interface RingDef {
  ds: number[];
  tube: number;
  arc: number;
  gap: number;
  color: string;
  k?: number;
}

export interface CellDef {
  d0: number;
  d1: number;
  count: number;
  size: number;
  color: string;
  speed: number;
  mode: 'flow' | 'breath';
  flow?: 1 | -1;
  spread?: number;
  glow?: number;
}

export interface OpeningDef extends Spot {
  r: number;
  color?: string;
  rim?: string;
}

export interface BeamDef {
  a: Spot;
  b: Spot;
  r: number;
  color: string;
}

export interface StrandDef {
  d0: number;
  d1: number;
  count: number;
  r: number;
  color: string;
}

export interface SphincterDef {
  d: number;
  tube: number;
  color: string;
  phase: Phase;
  closedK?: number;
}

/** Gerçek (Z-Anatomy) geometri: GLB'deki parçalar ıslak doku malzemesiyle çizilir. */
export interface RealDef {
  url: string;
  /** Parça adına göre renk. */
  color: (name: string) => string;
  /** Büyük ölçekli kıvrım (rugae) şiddeti, 0–1. */
  fold?: (name: string) => number;
  /** Kalp atışında büzülen parçalar (ad regex'i). */
  squeeze?: RegExp;
}

export interface Chapter {
  id: string;
  /** Lümen yarıçapı ölçeği: ışık gücü (r/rScale)² ile değişir. */
  rScale?: number;
  /** Yürüme hızı çarpanı. */
  speed?: number;
  real?: RealDef;
  name: string;
  path: V3[];
  up?: V3;
  radius: [number, number][];
  colors: [number, string][];
  bump?: (d: number, a: number) => number;
  noise: number;
  noiseFreq?: number;
  fog: { color: string; density: number };
  light: { color: string; intensity: number };
  pulse: 'heart' | 'breath' | 'none';
  valves?: ValveDef[];
  studs?: StudDef[];
  rings?: RingDef[];
  cells?: CellDef[];
  openings?: OpeningDef[];
  beams?: BeamDef[];
  strands?: StrandDef[];
  sphincters?: SphincterDef[];
}

export interface Pose {
  yaw: number;
  pitch: number;
  n: number;
  b: number;
}

export interface Mark extends Spot {
  text: string;
}

export interface Stop {
  id: string;
  chapter: number;
  d: number;
  title: string;
  latin: string;
  text: string;
  fact: string;
  pose?: Partial<Pose>;
  marks?: Mark[];
}

export interface OrganDef {
  id: OrganKey;
  nameTR: string;
  accent: string;
  intro: string;
  /** Bölüm sekmesi etiketleri (birden fazla bölüm varsa). */
  tabs?: string[];
  chapters: Chapter[];
  stops: Stop[];
}
