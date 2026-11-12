import type { Vec3 } from '@/data/systemsConfig';

/**
 * Tüm anatomik yerleşimin TEK kaynağı. Geometri üreticiler ve katmanlar buradan okur;
 * konumları ince ayarlamak için yalnızca bu dosyayı değiştirmek yeterlidir.
 * Koordinatlar: 1 birim = 1 m, ayak y=0, beden +Z'ye bakar, SOL = +X, SAĞ = −X.
 */

/** +1 = anatomik sol (+X), −1 = anatomik sağ (−X) */
export type Side = 1 | -1;
export const SIDES: readonly Side[] = [1, -1] as const;

export const mirrorV = (v: Vec3, s: Side): Vec3 => [v[0] * s, v[1], v[2]];

export type JointName =
  | 'shoulder'
  | 'elbow'
  | 'wrist'
  | 'handTip'
  | 'hip'
  | 'knee'
  | 'ankle'
  | 'toe';

/** Sol taraf eklem merkezleri (sağ taraf mirrorV ile elde edilir). */
export const JOINT: Record<JointName, Vec3> = {
  shoulder: [0.195, 1.4, 0.0],
  elbow: [0.255, 1.12, -0.005],
  wrist: [0.295, 0.88, 0.015],
  handTip: [0.325, 0.7, 0.03],
  hip: [0.088, 0.92, 0.0],
  knee: [0.093, 0.5, 0.01],
  ankle: [0.088, 0.085, -0.005],
  toe: [0.092, 0.025, 0.15],
};

/** Omurga orta hattı: sakrum tepesinden kafatası tabanına (S eğrisi). */
export const SPINE_POINTS: readonly Vec3[] = [
  [0, 0.97, -0.062],
  [0, 1.08, -0.058],
  [0, 1.2, -0.072],
  [0, 1.33, -0.085],
  [0, 1.44, -0.065],
  [0, 1.53, -0.04],
  [0, 1.585, -0.02],
];

/** Omurga eğrisi üzerindeki bölge aralıkları (eğri uzunluğuna göre 0..1). */
export const SPINE_RANGES = {
  lumbar: { from: 0.07, to: 0.33, count: 5 },
  thoracic: { from: 0.33, to: 0.78, count: 12 },
  cervical: { from: 0.78, to: 1.0, count: 7 },
} as const;

export const SACRUM_CENTER: Vec3 = [0, 0.94, -0.065];

/** Organ merkezleri (anatomyData.ts kamera hedefleriyle uyumlu). */
export const ORGAN_POS = {
  brain: [0, 1.668, 0.0],
  thyroid: [0, 1.47, 0.035],
  trachea: [0, 1.43, 0.025],
  esophagus: [0, 1.3, -0.01],
  heart: [0.03, 1.24, 0.04],
  lungs: [0, 1.27, 0.02],
  diaphragm: [0, 1.14, 0.0],
  liver: [-0.055, 1.12, 0.04],
  stomach: [0.055, 1.07, 0.03],
  spleen: [0.115, 1.11, -0.045],
  pancreas: [0.01, 1.055, -0.01],
  kidney: [0.075, 1.065, -0.06], // sol; sağ için mirrorV (sağ biraz daha aşağıda)
  smallIntestine: [0, 0.98, 0.045],
  largeIntestine: [0, 0.99, 0.04],
  bladder: [0, 0.878, 0.045],
} as const satisfies Record<string, readonly [number, number, number]>;

/**
 * Gövde kesit profili: [y, yarı genişlik X, yarı derinlik Z, merkez Z].
 * Cilt, kaburga kafesi ve organ çerçevesi bu eğriden türetilir.
 */
export const TORSO_PROFILE: readonly [number, number, number, number][] = [
  [0.86, 0.15, 0.092, 0.0],
  [0.96, 0.17, 0.105, 0.0],
  [1.05, 0.152, 0.098, 0.004],
  [1.15, 0.158, 0.1, 0.006],
  [1.25, 0.172, 0.108, 0.008],
  [1.34, 0.178, 0.108, 0.004],
  [1.42, 0.165, 0.085, -0.004],
  [1.47, 0.085, 0.07, 0.0],
  [1.5, 0.055, 0.056, 0.005],
  [1.58, 0.052, 0.054, 0.01],
];

/** Kafa (kafatası + cilt) */
export const HEAD = { center: [0, 1.66, 0.0] as Vec3, radius: 0.095, depth: 1.12, height: 1.1 } as const;

/** a ile b arasında doğrusal ara değer */
export const lerpV = (a: Vec3, b: Vec3, t: number): Vec3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
