import { BufferGeometry, Float32BufferAttribute, SphereGeometry, Vector3 } from 'three';
import type { Vec3 } from '@/data/systemsConfig';
import { clamp, smoothstep } from '@/utils/math';
import { curveFrom, mergeAll, profileTube, smoothDisplace } from './geometry';
import { ORGAN_POS } from './layout';
import { fbm3, ridge3 } from './noise';
import { ellipsoid, keyframes, morph } from './shapes';

export interface OrganMesh {
  id: string;
  /** Kendi yerel orijini etrafında kurulmuş geometri */
  geometry: BufferGeometry;
  /** Dünya konumu (ölçek animasyonları bu orijin etrafında olur) */
  position: Vec3;
  doubleSide?: boolean;
}

const P = (v: readonly [number, number, number]): Vec3 => [v[0], v[1], v[2]];
const tmp = new Vector3();

/* ───────── Yardımcılar ───────── */

/** Gürültüyle yüzey pürüzü (organik görünüm). Kaynak geometriyi serbest bırakır. */
function rough(geo: BufferGeometry, amp: number, freq: number): BufferGeometry {
  const g = smoothDisplace(geo, (p) => (fbm3(p.x * freq + 7.3, p.y * freq - 2.1, p.z * freq + 4.7, 3) - 0.5) * amp);
  geo.dispose();
  return g;
}

/**
 * Birim küreden şekillendirilen "blob": shape(u) yarıçap çarpanı verir (u = birim yön),
 * post(p) dönüşüm sonrası ek biçimlendirme yapar.
 */
function blob(
  radii: Vec3,
  center: Vec3,
  shape: (u: Vector3) => number,
  seg = 32,
  post?: (p: Vector3) => void,
): BufferGeometry {
  return morph(new SphereGeometry(1, seg, Math.round(seg * 0.75)), (p) => {
    const u = tmp.copy(p).normalize();
    const s = shape(u);
    p.set(center[0] + u.x * radii[0] * s, center[1] + u.y * radii[1] * s, center[2] + u.z * radii[2] * s);
    post?.(p);
  });
}

const tb = (pts: readonly Vec3[], r0: number, r1: number, segs = 24, radial = 8): BufferGeometry =>
  profileTube(curveFrom(pts), (t) => r0 + (r1 - r0) * t, { tubularSegments: segs, radialSegments: radial, capLength: 0.04 });

/** Üçgenleri ağırlık merkezine göre kovalara böler; köşe tamponlarını paylaşır. */
function splitTriangles(geo: BufferGeometry, classify: (c: Vector3) => number, n: number): BufferGeometry[] {
  const idx = geo.index;
  if (!idx) throw new Error('splitTriangles indeksli geometri bekler');
  const pos = geo.attributes.position;
  const buckets: number[][] = Array.from({ length: n }, () => []);
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  const m = new Vector3();
  for (let i = 0; i < idx.count; i += 3) {
    const ia = idx.getX(i);
    const ib = idx.getX(i + 1);
    const ic = idx.getX(i + 2);
    a.fromBufferAttribute(pos, ia);
    b.fromBufferAttribute(pos, ib);
    c.fromBufferAttribute(pos, ic);
    m.copy(a).add(b).add(c).multiplyScalar(1 / 3);
    buckets[classify(m)].push(ia, ib, ic);
  }
  return buckets.map((arr) => {
    const g = new BufferGeometry();
    g.setAttribute('position', pos);
    g.setAttribute('normal', geo.attributes.normal);
    g.setIndex(arr);
    return g;
  });
}

/* ───────── Beyin ───────── */

interface BrainBase {
  cerebrum: BufferGeometry;
  cerebellum: BufferGeometry;
  brainstem: BufferGeometry;
}

function buildBrainBase(): BrainBase {
  // Büyük beyin: girus kıvrımları + longitudinal fissür + Sylvian oluğu + santral sulkus
  const cerebrum = blob(
    [0.062, 0.062, 0.082],
    [0, 0.012, 0],
    (u) => {
      const gyri = (ridge3(u.x * 2.6 + 11, u.y * 2.6 + 3, u.z * 2.6 - 5, 3) - 0.42) * 0.11;
      const fissure = Math.exp(-(u.x * u.x) / 0.006) * smoothstep(-0.2, 0.55, u.y);
      const sylv = Math.exp(-Math.pow(u.y + 0.05 - 0.15 * u.z, 2) / 0.004) * smoothstep(0.55, 0.9, Math.abs(u.x));
      const d = u.z - 0.2 + 0.25 * Math.abs(u.x);
      const central = Math.exp(-(d * d) / 0.003) * smoothstep(0.2, 0.7, u.y);
      return 1 + gyri - 0.09 * fissure - 0.07 * sylv - 0.05 * central;
    },
    96,
  );
  // Beyincik: yatay folia çizgileri
  const cerebellum = blob(
    [0.046, 0.027, 0.036],
    [0, -0.056, -0.07],
    (u) => 1 + 0.03 * Math.sin(u.y * 26) - 0.05 * Math.exp(-(u.x * u.x) / 0.008),
    48,
  );
  const brainstem = profileTube(
    curveFrom([[0, -0.02, -0.004], [0, -0.045, -0.016], [0, -0.075, -0.026], [0, -0.1, -0.03]]),
    (t) => 0.017 - 0.008 * t,
    { tubularSegments: 14, radialSegments: 12, capLength: 0.04 },
  );
  return { cerebrum, cerebellum, brainstem };
}

/** Lob parçaları (sinir katmanı): frontal, parietal, temporal, oksipital, beyincik, beyin sapı. */
export function createBrainParts(): OrganMesh[] {
  const { cerebrum, cerebellum, brainstem } = buildBrainBase();
  const [frontal, parietal, temporal, occipital] = splitTriangles(
    cerebrum,
    (c) => {
      if (c.y < 0.0 && c.z > -0.05 && c.z < 0.04 && Math.abs(c.x) > 0.02) return 2; // temporal
      if (c.z >= 0.03) return 0; // frontal
      if (c.z < -0.045) return 3; // oksipital
      return 1; // parietal
    },
    4,
  );
  const position = P(ORGAN_POS.brain);
  return [
    { id: 'frontal-lobe', geometry: frontal, position },
    { id: 'parietal-lobe', geometry: parietal, position },
    { id: 'temporal-lobe', geometry: temporal, position },
    { id: 'occipital-lobe', geometry: occipital, position },
    { id: 'cerebellum', geometry: cerebellum, position },
    { id: 'brainstem', geometry: brainstem, position },
  ];
}

function brainWhole(): BufferGeometry {
  const { cerebrum, cerebellum, brainstem } = buildBrainBase();
  const merged = mergeAll([cerebrum, cerebellum, brainstem]);
  cerebrum.dispose();
  cerebellum.dispose();
  brainstem.dispose();
  return merged;
}

/* ───────── Göğüs organları ───────── */

function heart(): BufferGeometry {
  const g = mergeAll([
    ellipsoid([0.034, 0.05, 0.03], [0.006, -0.008, 0], [0, 0, 0.5], 24), // ventriküller
    ellipsoid([0.022, 0.026, 0.02], [-0.024, 0.014, 0.004], [0, 0, 0], 14), // sağ atriyum
    ellipsoid([0.021, 0.014, 0.018], [0.012, 0.036, -0.016], [0, 0, 0], 14), // sol atriyum
    tb([[0, 0.02, 0.008], [-0.002, 0.04, 0.008], [0, 0.055, 0.0]], 0.011, 0.01, 10, 12), // aort kökü
    tb([[0.01, 0.02, 0.026], [0.008, 0.04, 0.02], [0.01, 0.05, 0.008]], 0.01, 0.009, 10, 12), // pulmoner gövde
  ]);
  return rough(g, 0.0018, 70);
}

const HEART_IN_LUNGS = new Vector3(0.03, -0.03, 0.02); // kalp merkezi, akciğer yerel uzayında

function lungs(): BufferGeometry {
  const make = (side: 1 | -1): BufferGeometry => {
    const cx = 0.088 * side;
    return blob(
      [0.052, 0.104, 0.062],
      [cx, -0.01, -0.008],
      (u) => {
        const oblique = Math.exp(-Math.pow(u.y + 0.9 * u.z - 0.05, 2) / 0.006);
        let s = 1 - 0.07 * oblique;
        if (side === -1) {
          // sağ akciğer: yatay fissür (3 lob)
          s -= 0.05 * Math.exp(-Math.pow(u.y - 0.25, 2) / 0.004) * smoothstep(0, 0.4, u.z);
        }
        s -= 0.15 * smoothstep(0.5, 1, -side * u.x); // iç (mediastinal) yüz düzleşir
        return s;
      },
      40,
      (p) => {
        const ty = clamp((p.y + 0.01) / 0.104, -1, 1);
        const k = 1 - 0.28 * (0.5 + 0.5 * ty); // tepe (apeks) dar, taban geniş
        p.x = cx + (p.x - cx) * k;
        p.z = -0.008 + (p.z + 0.008) * k;
        if (p.y < -0.085) p.y = -0.085 + (p.y + 0.085) * 0.3; // düz taban (diyafram üstü)
        // Kalp çentiği: kalbin içine girmesin
        const d = p.distanceTo(HEART_IN_LUNGS);
        if (d < 0.066) p.copy(HEART_IN_LUNGS).add(tmp.copy(p).sub(HEART_IN_LUNGS).normalize().multiplyScalar(0.066));
      },
    );
  };
  return mergeAll([make(1), make(-1)]);
}

function trachea(): BufferGeometry {
  const parts: BufferGeometry[] = [
    // Kıkırdak halkalı ana boru (hafif radyal dalgalanma)
    profileTube(
      curveFrom([[0, 1.52, 0.022], [0, 1.47, 0.022], [0, 1.41, 0.02], [0, 1.36, 0.012], [0, 1.345, 0.006]]),
      (t) => 0.0085 * (1 + 0.1 * Math.sin(t * Math.PI * 2 * 16)),
      { tubularSegments: 80, radialSegments: 12, capLength: 0.01 },
    ),
  ];
  for (const s of [1, -1]) {
    parts.push(
      tb([[0, 1.345, 0.006], [0.02 * s, 1.33, 0.01], [0.045 * s, 1.31, 0.016], [0.068 * s, 1.285, 0.02]], 0.0055, 0.003, 18),
      tb([[0.045 * s, 1.31, 0.016], [0.07 * s, 1.3, 0.02], [0.09 * s, 1.32, 0.02]], 0.0035, 0.002, 10, 6),
      tb([[0.055 * s, 1.3, 0.018], [0.08 * s, 1.25, 0.02], [0.095 * s, 1.2, 0.02]], 0.0035, 0.002, 12, 6),
    );
  }
  return mergeAll(parts);
}

function esophagus(): BufferGeometry {
  return tb(
    [[0, 1.46, 0.0], [0, 1.4, -0.012], [0, 1.3, -0.02], [0, 1.2, -0.015], [0.006, 1.14, 0.0], [0.016, 1.12, 0.012], [0.025, 1.11, 0.02]],
    0.0085,
    0.0085,
    60,
    10,
  );
}

function thyroid(): BufferGeometry {
  return mergeAll([
    ellipsoid([0.009, 0.016, 0.008], [0.016, 0, 0], [0, 0, 0.15], 12),
    ellipsoid([0.009, 0.016, 0.008], [-0.016, 0, 0], [0, 0, -0.15], 12),
    ellipsoid([0.012, 0.004, 0.005], [0, -0.005, 0.004], [0, 0, 0], 8),
  ]);
}

/* ───────── Üst karın ───────── */

function diaphragm(): BufferGeometry {
  const R = 14;
  const M = 48;
  const pos: number[] = [];
  for (let i = 0; i <= R; i++) {
    const rho = i / R;
    for (let j = 0; j <= M; j++) {
      const th = (j / M) * Math.PI * 2;
      const y = 0.048 * (1 - rho * rho) - 0.008 - 0.03 * Math.max(0, -Math.sin(th)) * rho * rho; // arkada daha aşağıda
      pos.push(Math.cos(th) * rho * 0.145, y, Math.sin(th) * rho * 0.098);
    }
  }
  const idx: number[] = [];
  for (let i = 0; i < R; i++) {
    for (let j = 0; j < M; j++) {
      const a = i * (M + 1) + j;
      const b = a + 1;
      const c = a + (M + 1);
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new BufferGeometry();
  g.setIndex(idx);
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

function liver(): BufferGeometry {
  return rough(
    mergeAll([
      ellipsoid([0.08, 0.046, 0.058], [-0.02, 0, 0], [0, 0, 0.05], 26), // sağ lob
      ellipsoid([0.045, 0.022, 0.04], [0.05, -0.005, 0.012], [0, 0, -0.2], 20), // sol lob
      ellipsoid([0.008, 0.016, 0.008], [-0.045, -0.04, 0.048], [0, 0, 0], 10), // safra kesesi
    ]),
    0.0025,
    50,
  );
}

function stomach(): BufferGeometry {
  const prof = keyframes([[0, 0.01], [0.2, 0.028], [0.5, 0.032], [0.8, 0.02], [1, 0.011]]);
  const g = profileTube(
    curveFrom([
      [-0.03, 0.04, -0.01], [0.0, 0.052, 0.0], [0.04, 0.03, 0.01], [0.055, -0.01, 0.015],
      [0.03, -0.04, 0.02], [-0.01, -0.04, 0.02], [-0.04, -0.02, 0.015],
    ]),
    prof,
    { tubularSegments: 56, radialSegments: 16, capLength: 0.06 },
  );
  return rough(g, 0.002, 60);
}

function pancreas(): BufferGeometry {
  return profileTube(
    curveFrom([[-0.03, -0.01, 0.01], [-0.005, 0, 0.005], [0.03, 0.01, 0.0], [0.06, 0.035, -0.015], [0.09, 0.05, -0.03]]),
    (t) => 0.014 - 0.007 * t,
    { tubularSegments: 30, radialSegments: 10, scaleB: 0.7, capLength: 0.08 },
  );
}

function spleen(): BufferGeometry {
  return rough(ellipsoid([0.02, 0.035, 0.014], [0, 0, 0], [0.15, 0.5, 0.2], 18), 0.0015, 60);
}

function kidneys(): BufferGeometry {
  const bean = (side: 1 | -1, y: number): BufferGeometry =>
    blob(
      [0.017, 0.05, 0.022],
      [0.075 * side, y, 0],
      (u) => {
        const medial = -side * u.x; // gövde orta hattına bakan yüz
        const hilum = Math.exp(-(u.y * u.y) / 0.15 - (u.z * u.z) / 0.3) * smoothstep(0.3, 1, medial);
        return 1 - 0.4 * hilum;
      },
      24,
    );
  return mergeAll([bean(1, 0.01), bean(-1, -0.01)]); // sağ böbrek biraz daha aşağıda
}

/* ───────── Bağırsaklar ve mesane ───────── */

function smallIntestine(): BufferGeometry {
  const pts: Vec3[] = [];
  const rows = 6;
  const cols = 9;
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) {
      const kk = r % 2 === 0 ? k : cols - 1 - k;
      pts.push([
        -0.062 + (0.124 * kk) / (cols - 1),
        0.07 - r * 0.026 + 0.009 * Math.sin(kk * 2.1 + r * 1.3),
        0.014 * Math.sin(kk * 1.7 + r * 2.1) + 0.008 * Math.cos(r * 1.1),
      ]);
    }
  }
  return profileTube(curveFrom(pts), (t) => 0.0095 - 0.0018 * t, {
    tubularSegments: 260,
    radialSegments: 8,
    capLength: 0.01,
  });
}

function largeIntestine(): BufferGeometry {
  const colon = profileTube(
    curveFrom([
      [-0.085, -0.075, 0.0], [-0.09, -0.04, 0.0], [-0.092, 0.0, 0.0], [-0.09, 0.04, 0.0], [-0.07, 0.065, 0.005],
      [-0.05, 0.062, 0.01], [-0.02, 0.045, 0.015], [0.02, 0.045, 0.015], [0.055, 0.06, 0.01], [0.09, 0.065, -0.005],
      [0.095, 0.03, -0.01], [0.095, -0.02, -0.01], [0.09, -0.06, -0.005], [0.07, -0.09, 0.0], [0.04, -0.105, 0.0],
      [0.015, -0.115, -0.01], [0, -0.125, -0.03],
    ]),
    (t) => 0.0145 * (1 - 0.24 * t) * (1 + 0.09 * Math.sin(t * Math.PI * 2 * 30)), // haustra
    { tubularSegments: 180, radialSegments: 10, capLength: 0.02 },
  );
  const appendix = tb([[-0.085, -0.075, 0.0], [-0.078, -0.095, 0.008], [-0.07, -0.108, 0.012]], 0.004, 0.0025, 8, 6);
  return mergeAll([colon, appendix]);
}

const bladder = (): BufferGeometry => rough(ellipsoid([0.028, 0.03, 0.025], [0, 0, 0], [0, 0, 0], 20), 0.001, 60);

/* ───────── Dışa aktarım ───────── */

/** 15 organ (anatomyData id'leriyle eşleşir). */
export function createOrgans(): OrganMesh[] {
  return [
    { id: 'brain', geometry: brainWhole(), position: P(ORGAN_POS.brain) },
    { id: 'heart', geometry: heart(), position: P(ORGAN_POS.heart) },
    { id: 'lungs', geometry: lungs(), position: P(ORGAN_POS.lungs) },
    { id: 'liver', geometry: liver(), position: P(ORGAN_POS.liver) },
    { id: 'stomach', geometry: stomach(), position: P(ORGAN_POS.stomach) },
    { id: 'pancreas', geometry: pancreas(), position: P(ORGAN_POS.pancreas) },
    { id: 'spleen', geometry: spleen(), position: P(ORGAN_POS.spleen) },
    { id: 'kidneys', geometry: kidneys(), position: [0, 1.055, -0.06] },
    { id: 'small-intestine', geometry: smallIntestine(), position: P(ORGAN_POS.smallIntestine) },
    { id: 'large-intestine', geometry: largeIntestine(), position: P(ORGAN_POS.largeIntestine) },
    { id: 'bladder', geometry: bladder(), position: P(ORGAN_POS.bladder) },
    { id: 'diaphragm', geometry: diaphragm(), position: P(ORGAN_POS.diaphragm), doubleSide: true },
    { id: 'thyroid', geometry: thyroid(), position: P(ORGAN_POS.thyroid) },
    { id: 'esophagus', geometry: esophagus(), position: [0, 0, 0] },
    { id: 'trachea', geometry: trachea(), position: [0, 0, 0] },
  ];
}
