import * as THREE from 'three';
import type { Chapter, Spot } from './types';

export function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hash3 = (x: number, y: number, z: number): number => {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

const fade = (t: number): number => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export function vnoise(x: number, y: number, z: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = fade(x - xi), yf = fade(y - yi), zf = fade(z - zi);
  const c = (dx: number, dy: number, dz: number): number => hash3(xi + dx, yi + dy, zi + dz);
  return lerp(
    lerp(lerp(c(0, 0, 0), c(1, 0, 0), xf), lerp(c(0, 1, 0), c(1, 1, 0), xf), yf),
    lerp(lerp(c(0, 0, 1), c(1, 0, 1), xf), lerp(c(0, 1, 1), c(1, 1, 1), xf), yf),
    zf,
  );
}

export function fbm(x: number, y: number, z: number, oct = 3): number {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) {
    s += a * vnoise(x * f, y * f, z * f);
    n += a;
    a *= 0.5;
    f *= 2.03;
  }
  return s / n;
}

const smoother = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10);
export const smoothstep = (t: number): number => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

export interface Frame {
  p: THREE.Vector3;
  t: THREE.Vector3;
  n: THREE.Vector3;
  b: THREE.Vector3;
}

const newFrame = (): Frame => ({
  p: new THREE.Vector3(),
  t: new THREE.Vector3(),
  n: new THREE.Vector3(),
  b: new THREE.Vector3(),
});

/** Bir bölümün (kanal) merkez çizgisi, çerçeveleri ve yarıçap profili. */
export class ChapterGeo {
  readonly length: number;
  readonly seg: number;
  private P: THREE.Vector3[] = [];
  private T: THREE.Vector3[] = [];
  private Nn: THREE.Vector3[] = [];
  private col: [number, THREE.Color][];
  private _f = newFrame();

  constructor(readonly ch: Chapter) {
    const curve = new THREE.CatmullRomCurve3(
      ch.path.map((p) => new THREE.Vector3(...p)),
      false,
      'centripetal',
    );
    curve.arcLengthDivisions = 2000;
    this.length = curve.getLength();
    this.seg = Math.ceil(this.length * 16);
    for (let i = 0; i <= this.seg; i++) {
      const u = i / this.seg;
      this.P.push(curve.getPointAt(u));
      this.T.push(curve.getTangentAt(u).normalize());
    }
    const up = new THREE.Vector3(...(ch.up ?? [0, 0, 1]));
    const n0 = up.clone().sub(this.T[0]!.clone().multiplyScalar(up.dot(this.T[0]!))).normalize();
    this.Nn.push(n0);
    const axis = new THREE.Vector3();
    for (let i = 1; i <= this.seg; i++) {
      const prev = this.Nn[i - 1]!;
      const t0 = this.T[i - 1]!;
      const t1 = this.T[i]!;
      axis.crossVectors(t0, t1);
      const s = axis.length();
      const n = prev.clone();
      if (s > 1e-7) {
        axis.divideScalar(s);
        n.applyAxisAngle(axis, Math.acos(Math.min(1, Math.max(-1, t0.dot(t1)))));
      }
      // numerik sapmaya karşı dikleştir
      n.sub(t1.clone().multiplyScalar(n.dot(t1))).normalize();
      this.Nn.push(n);
    }
    this.col = ch.colors.map(([d, c]) => [d, new THREE.Color(c)]);
  }

  frameAt(d: number, out: Frame = this._f): Frame {
    const x = Math.min(this.seg, Math.max(0, (d / this.length) * this.seg));
    const i = Math.min(this.seg - 1, Math.floor(x));
    const f = x - i;
    out.p.lerpVectors(this.P[i]!, this.P[i + 1]!, f);
    out.t.lerpVectors(this.T[i]!, this.T[i + 1]!, f).normalize();
    out.n.lerpVectors(this.Nn[i]!, this.Nn[i + 1]!, f);
    out.n.sub(this._tmp.copy(out.t).multiplyScalar(out.n.dot(out.t))).normalize();
    out.b.crossVectors(out.t, out.n);
    return out;
  }
  private _tmp = new THREE.Vector3();

  radiusAt(d: number): number {
    const k = this.ch.radius;
    if (d <= k[0]![0]) return k[0]![1];
    for (let i = 0; i < k.length - 1; i++) {
      const a = k[i]!, b = k[i + 1]!;
      if (d <= b[0]) return lerp(a[1], b[1], smoother((d - a[0]) / (b[0] - a[0])));
    }
    return k[k.length - 1]![1];
  }

  /** Duvarın o noktadaki yarıçapı (kıvrım + gürültü dahil). */
  wallR(d: number, a: number): number {
    const base = this.radiusAt(d);
    const bump = this.ch.bump ? this.ch.bump(d, a) : 0;
    const nf = this.ch.noiseFreq ?? 0.9;
    const nz = (fbm(d * nf, Math.cos(a) * 1.6, Math.sin(a) * 1.6, 3) - 0.5) * 2 * this.ch.noise;
    return base * (1 + bump + nz);
  }

  /** Spot → açı (toward verilmişse o yöne en yakın duvar açısı). */
  angleOf(s: Spot): number {
    if (s.ang !== undefined) return s.ang;
    if (s.toward) {
      const f = this.frameAt(s.d);
      const w = new THREE.Vector3(...s.toward);
      return Math.atan2(w.dot(f.b), w.dot(f.n));
    }
    return 0;
  }

  wallPoint(d: number, a: number, inset = 0, out = new THREE.Vector3()): THREE.Vector3 {
    const f = this.frameAt(d);
    const r = this.wallR(d, a) - inset;
    return out.copy(f.p).addScaledVector(f.n, Math.cos(a) * r).addScaledVector(f.b, Math.sin(a) * r);
  }

  /** Duvardan eksene doğru birim vektör. */
  inward(d: number, a: number, out = new THREE.Vector3()): THREE.Vector3 {
    const f = this.frameAt(d);
    return out.set(0, 0, 0).addScaledVector(f.n, -Math.cos(a)).addScaledVector(f.b, -Math.sin(a));
  }

  colorAt(d: number, out = new THREE.Color()): THREE.Color {
    const k = this.col;
    if (d <= k[0]![0]) return out.copy(k[0]![1]);
    for (let i = 0; i < k.length - 1; i++) {
      const a = k[i]!, b = k[i + 1]!;
      if (d <= b[0]) return out.copy(a[1]).lerp(b[1], smoothstep((d - a[0]) / (b[0] - a[0])));
    }
    return out.copy(k[k.length - 1]![1]);
  }
}

/** Boşluk (lümen) geometrisi: iç yüzeyler öne bakar, normaller içe doğrudur. */
export function buildTubeGeometry(g: ChapterGeo): THREE.BufferGeometry {
  const M = 72;
  const S = g.seg;
  const pos = new Float32Array((S + 1) * (M + 1) * 3);
  const col = new Float32Array((S + 1) * (M + 1) * 3);
  const uv = new Float32Array((S + 1) * (M + 1) * 2);
  const c = new THREE.Color();
  let k = 0, k2 = 0;
  for (let i = 0; i <= S; i++) {
    const d = (i / S) * g.length;
    const f = g.frameAt(d);
    g.colorAt(d, c);
    for (let j = 0; j <= M; j++) {
      const a = ((j % M) / M) * Math.PI * 2;
      const r = g.wallR(d, a);
      pos[k] = f.p.x + (f.n.x * Math.cos(a) + f.b.x * Math.sin(a)) * r;
      pos[k + 1] = f.p.y + (f.n.y * Math.cos(a) + f.b.y * Math.sin(a)) * r;
      pos[k + 2] = f.p.z + (f.n.z * Math.cos(a) + f.b.z * Math.sin(a)) * r;
      const v = 0.78 + fbm(d * 2.1, Math.cos(a) * 2.4, Math.sin(a) * 2.4, 3) * 0.5;
      col[k] = c.r * v;
      col[k + 1] = c.g * v;
      col[k + 2] = c.b * v;
      uv[k2] = (j / M) * 5;
      uv[k2 + 1] = d * 0.7;
      k += 3;
      k2 += 2;
    }
  }
  const idx: number[] = [];
  for (let i = 0; i < S; i++) {
    for (let j = 0; j < M; j++) {
      const a = i * (M + 1) + j;
      const b = a + M + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  // dikişte normalleri eşitle
  const nr = geo.getAttribute('normal') as THREE.BufferAttribute;
  for (let i = 0; i <= S; i++) {
    const a = i * (M + 1);
    const b = a + M;
    const x = nr.getX(a) + nr.getX(b), y = nr.getY(a) + nr.getY(b), z = nr.getZ(a) + nr.getZ(b);
    const l = Math.hypot(x, y, z) || 1;
    nr.setXYZ(a, x / l, y / l, z / l);
    nr.setXYZ(b, x / l, y / l, z / l);
  }
  geo.computeBoundingSphere();
  return geo;
}

let wallTex: THREE.CanvasTexture | null = null;

/** Islak doku görünümü için küçük bir bump/kabarcık deseni (bir kez üretilir). */
export function getWallTexture(): THREE.CanvasTexture {
  if (wallTex) return wallTex;
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(S, S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      // dikişsiz: torus üzerinde örnekle
      const ax = (x / S) * Math.PI * 2, ay = (y / S) * Math.PI * 2;
      const nx = Math.cos(ax) * 1.8, ny = Math.sin(ax) * 1.8, nz = Math.cos(ay) * 1.8, nw = Math.sin(ay) * 1.8;
      const v = fbm(nx + nz * 0.7, ny + nw * 0.7, nz - nw * 0.3, 4);
      const ridge = 1 - Math.abs(vnoise(nx * 2.6 + 9, ny * 2.6, nz * 2.6 + nw) * 2 - 1);
      const h = Math.min(1, Math.max(0, v * 0.65 + ridge * ridge * 0.35));
      const o = (y * S + x) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = Math.round(h * 255);
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  wallTex = t;
  return t;
}
