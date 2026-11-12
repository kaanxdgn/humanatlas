import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Euler,
  Float32BufferAttribute,
  Matrix4,
  Quaternion,
  Vector3,
  type Curve,
} from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Vec3 } from '@/data/systemsConfig';

export const v3 = (t: Vec3): Vector3 => new Vector3(t[0], t[1], t[2]);

/** Noktalardan yumuşak eğri (centripetal: aşırı taşma yapmaz). */
export const curveFrom = (points: readonly Vec3[], closed = false): CatmullRomCurve3 =>
  new CatmullRomCurve3(points.map(v3), closed, 'centripetal');

/* ───────── Yarıçap profili olan tüp ───────── */

export interface ProfileTubeOptions {
  tubularSegments?: number;
  radialSegments?: number;
  /** Kesit elips ölçekleri (normal / binormal yönünde) */
  scaleN?: number;
  scaleB?: number;
  /** Uçların yuvarlatıldığı uzunluk oranı (0 = açık uç) */
  capLength?: number;
}

/**
 * Eğri boyunca değişen yarıçaplı tüp (kemik, kas, damar, sinir).
 * UV: x = eğri boyunca 0..1, y = çevre boyunca 0..1 (flowLine shader'ı bunu bekler).
 */
export function profileTube(
  curve: Curve<Vector3>,
  radiusAt: (t: number) => number,
  opts: ProfileTubeOptions = {},
): BufferGeometry {
  const ts = opts.tubularSegments ?? 24;
  const rs = opts.radialSegments ?? 10;
  const sn = opts.scaleN ?? 1;
  const sb = opts.scaleB ?? 1;
  const cap = opts.capLength ?? 0.05;

  const frames = curve.computeFrenetFrames(ts, false);
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const P = new Vector3();
  const nrm = new Vector3();

  for (let i = 0; i <= ts; i++) {
    const t = i / ts;
    curve.getPointAt(t, P);
    const edge = Math.min(t, 1 - t);
    const capK = cap > 0 && edge < cap ? Math.sqrt(1 - Math.pow(1 - edge / cap, 2)) : 1;
    const r = radiusAt(t) * capK;
    const fn = frames.normals[i];
    const fb = frames.binormals[i];

    for (let j = 0; j <= rs; j++) {
      const v = (j / rs) * Math.PI * 2;
      const sin = Math.sin(v);
      const cos = -Math.cos(v);
      nrm
        .set(
          (cos / sn) * fn.x + (sin / sb) * fb.x,
          (cos / sn) * fn.y + (sin / sb) * fb.y,
          (cos / sn) * fn.z + (sin / sb) * fb.z,
        )
        .normalize();
      normals.push(nrm.x, nrm.y, nrm.z);
      positions.push(
        P.x + r * (cos * sn * fn.x + sin * sb * fb.x),
        P.y + r * (cos * sn * fn.y + sin * sb * fb.y),
        P.z + r * (cos * sn * fn.z + sin * sb * fb.z),
      );
      uvs.push(t, j / rs);
    }
  }

  for (let j = 1; j <= ts; j++) {
    for (let k = 1; k <= rs; k++) {
      const a = (rs + 1) * (j - 1) + (k - 1);
      const b = (rs + 1) * j + (k - 1);
      const c = (rs + 1) * j + k;
      const d = (rs + 1) * (j - 1) + k;
      indices.push(a, b, d, b, c, d);
    }
  }

  const g = new BufferGeometry();
  g.setIndex(indices);
  g.setAttribute('position', new Float32BufferAttribute(positions, 3));
  g.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  return g;
}

/** Sabit yarıçaplı tüp kısayolu. */
export const tubeGeo = (
  points: readonly Vec3[],
  radius: number,
  tubularSegments = 32,
  radialSegments = 6,
): BufferGeometry =>
  profileTube(curveFrom(points), () => radius, { tubularSegments, radialSegments, capLength: 0.03 });

/** Basit konik yarıçap: r0'dan r1'e doğrusal. */
export const taper = (r0: number, r1: number) => (t: number): number => r0 + (r1 - r0) * t;

/**
 * Kas karnı profili (fusiform): uçlarda `end`, tepe noktasında 1 çarpanı.
 * peak: şişkinliğin konumu (0..1), power: sivrilik.
 */
export function fusiform(peak = 0.45, end = 0.3, power = 0.8) {
  return (t: number): number => {
    const u = t < peak ? (t / peak) * 0.5 : 0.5 + ((t - peak) / (1 - peak)) * 0.5;
    const s = Math.pow(Math.sin(Math.PI * u), power);
    return end + (1 - end) * s;
  };
}

/** Uzun kemik profili: gövde yarıçapı r, iki ucu `bulge` kadar şişkin. */
export function boneProfile(r: number, bulge = 0.7, endWidth = 0.14) {
  const g = (x: number): number => Math.exp(-(x * x) / (endWidth * endWidth));
  return (t: number): number => r * (1 + bulge * (g(t) + g(1 - t)));
}

/* ───────── Geometri dönüşümleri ───────── */

export interface XformOptions {
  p?: Vec3;
  /** Euler (radyan, XYZ) */
  r?: Vec3;
  s?: number | Vec3;
}

/** Geometriyi yerinde dönüştürür ve aynısını döndürür. */
export function xform(geo: BufferGeometry, o: XformOptions = {}): BufferGeometry {
  const q = new Quaternion().setFromEuler(new Euler(o.r?.[0] ?? 0, o.r?.[1] ?? 0, o.r?.[2] ?? 0));
  const s =
    typeof o.s === 'number' ? new Vector3(o.s, o.s, o.s) : o.s ? v3(o.s) : new Vector3(1, 1, 1);
  const m = new Matrix4().compose(o.p ? v3(o.p) : new Vector3(), q, s);
  geo.applyMatrix4(m);
  return geo;
}

/**
 * Y ekseninde merkezlenmiş, boyu 1 olan geometriyi (kapsül/silindir) a→b arasına yerleştirir.
 * radial: X/Z ölçeği.
 */
export function placeBetween(geo: BufferGeometry, a: Vec3, b: Vec3, radial = 1): BufferGeometry {
  const A = v3(a);
  const B = v3(b);
  const dir = B.clone().sub(A);
  const len = dir.length();
  const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.clone().normalize());
  const mid = A.clone().add(B).multiplyScalar(0.5);
  geo.applyMatrix4(new Matrix4().compose(mid, q, new Vector3(radial, len, radial)));
  return geo;
}

/** X ekseninde aynalar (sağ/sol simetri) ve yüz yönünü düzeltir. Kopya döndürür. */
export function mirrorGeometry(geo: BufferGeometry): BufferGeometry {
  const g = geo.clone();
  g.applyMatrix4(new Matrix4().makeScale(-1, 1, 1));
  if (!g.index) {
    const n = g.attributes.position.count;
    g.setIndex(Array.from({ length: n }, (_, i) => i));
  }
  const idx = g.index as BufferAttribute;
  for (let i = 0; i < idx.count; i += 3) {
    const b = idx.getX(i + 1);
    idx.setX(i + 1, idx.getX(i + 2));
    idx.setX(i + 2, b);
  }
  idx.needsUpdate = true;
  return g;
}

/** Geometri + aynası tek geometri olarak. */
export const withMirror = (geo: BufferGeometry): BufferGeometry => mergeAll([geo, mirrorGeometry(geo)]);

/**
 * Birden çok geometriyi tek geometride birleştirir (draw call azaltır).
 * Yalnızca position/normal/uv tutulur; eksikler tamamlanır, indeksli olmayanlar kaynaklanır.
 */
export function mergeAll(list: readonly BufferGeometry[]): BufferGeometry {
  const prepared = list.map((src) => {
    let g = src.clone();
    for (const name of Object.keys(g.attributes)) {
      if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
    }
    if (!g.index) g = mergeVertices(g);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) {
      g.setAttribute('uv', new Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    }
    return g;
  });
  const merged = mergeGeometries(prepared, false);
  prepared.forEach((g) => g.dispose());
  if (!merged) throw new Error('Geometriler birleştirilemedi (öznitelik uyuşmazlığı).');
  return merged;
}

/** Geometriyi sınırlayıcı kutusunun merkezine taşır; eski merkezi döndürür. */
export function centerGeometry(geo: BufferGeometry): Vec3 {
  geo.computeBoundingBox();
  const c = new Vector3();
  geo.boundingBox?.getCenter(c);
  geo.translate(-c.x, -c.y, -c.z);
  return [c.x, c.y, c.z];
}

/**
 * Yüzey noktalarını normal boyunca kaydırır (gürültüyle kıvrım, düzensizlik).
 * Dikişleri kaynaklar ki delik oluşmasın.
 */
export function smoothDisplace(
  geo: BufferGeometry,
  fn: (p: Vector3, n: Vector3) => number,
): BufferGeometry {
  let g = geo.clone();
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g, 1e-4);
  g.computeVertexNormals();
  const pos = g.attributes.position as BufferAttribute;
  const nor = g.attributes.normal as BufferAttribute;
  const p = new Vector3();
  const n = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(nor, i);
    const d = fn(p, n);
    pos.setXYZ(i, p.x + n.x * d, p.y + n.y * d, p.z + n.z * d);
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

export function disposeGeometries(list: readonly BufferGeometry[]): void {
  list.forEach((g) => g.dispose());
}
