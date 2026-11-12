/** Küçük matematik yardımcıları (animasyon ve prosedürel üretim için). */

export const clamp = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v));

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Kare hızından bağımsız üstel yumuşatma. lambda ↑ → daha hızlı yakınsar. */
export const damp = (current: number, target: number, lambda: number, dt: number): number =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

export const mapRange = (
  v: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
  clampOutput = true,
): number => {
  const t = (v - inMin) / (inMax - inMin);
  const out = outMin + (outMax - outMin) * t;
  if (!clampOutput) return out;
  const lo = Math.min(outMin, outMax);
  const hi = Math.max(outMin, outMax);
  return clamp(out, lo, hi);
};

export const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

export const easeOutExpo = (t: number): number => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

export const easeInOutQuart = (t: number): number =>
  t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;

export const degToRad = (deg: number): number => (deg * Math.PI) / 180;

/** Tohumlu, tekrarlanabilir rastgele sayı üreteci (mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Türkçe sayı biçimi: 100000 → "100.000" */
export const formatNumberTR = (n: number, decimals = 0): string =>
  new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
