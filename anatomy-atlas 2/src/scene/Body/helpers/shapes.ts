import { BufferAttribute, BufferGeometry, SphereGeometry, Vector3 } from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Vec3 } from '@/data/systemsConfig';
import { lerp, smoothstep } from '@/utils/math';
import { curveFrom, profileTube, xform } from './geometry';
import { lerpV } from './layout';

/** Elipsoid: yarıçaplar (x,y,z), konum, Euler dönüşü. Normaller analitik olarak doğru kalır. */
export function ellipsoid(
  radii: Vec3,
  pos: Vec3 = [0, 0, 0],
  rot: Vec3 = [0, 0, 0],
  seg = 16,
): BufferGeometry {
  return xform(new SphereGeometry(1, seg, Math.max(6, Math.round(seg * 0.7))), {
    p: pos,
    r: rot,
    s: radii,
  });
}

/**
 * Köşe noktalarını yerinde yeniden şekillendirir (fn, p'yi değiştirir).
 * Dikişleri kaynaklar, normalleri yeniden hesaplar; uv düşer.
 */
export function morph(geo: BufferGeometry, fn: (p: Vector3) => void): BufferGeometry {
  geo.deleteAttribute('normal');
  geo.deleteAttribute('uv');
  const g = mergeVertices(geo, 1e-5);
  const pos = g.attributes.position as BufferAttribute;
  const p = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    fn(p);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  if (g !== geo) geo.dispose();
  return g;
}

/** Anahtar kareli yumuşak profil: [[t, değer], ...] → (t) => değer */
export function keyframes(kf: readonly (readonly [number, number])[]): (t: number) => number {
  return (t) => {
    if (t <= kf[0][0]) return kf[0][1];
    for (let i = 1; i < kf.length; i++) {
      if (t <= kf[i][0]) {
        const [t0, v0] = kf[i - 1];
        const [t1, v1] = kf[i];
        return lerp(v0, v1, smoothstep(t0, t1, t));
      }
    }
    return kf[kf.length - 1][1];
  };
}

/** İki nokta arasında uçları yuvarlak ince çubuk (metakarpal, falanks, tendon). */
export function bar(a: Vec3, b: Vec3, r: number, segs = 6): BufferGeometry {
  const m: Vec3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  return profileTube(curveFrom([a, m, b]), () => r, {
    tubularSegments: segs,
    radialSegments: 6,
    capLength: 0.25,
  });
}

/** a→b doğrusu üzerinde ts değerlerindeki noktalar (+ sabit ofset). t dışarı taşabilir. */
export function along(a: Vec3, b: Vec3, ts: readonly number[], off: Vec3 = [0, 0, 0]): Vec3[] {
  return ts.map((t) => {
    const p = lerpV(a, b, t);
    return [p[0] + off[0], p[1] + off[1], p[2] + off[2]];
  });
}
