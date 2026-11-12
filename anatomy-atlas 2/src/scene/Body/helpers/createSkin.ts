import { BufferGeometry, Float32BufferAttribute } from 'three';
import type { Vec3 } from '@/data/systemsConfig';
import { clamp } from '@/utils/math';
import { curveFrom, mergeAll, profileTube, withMirror } from './geometry';
import { JOINT, TORSO_PROFILE } from './layout';
import { ellipsoid, keyframes } from './shapes';

/** Sırt kasları ve omurga için gövdenin arkasına eklenen ekstra derinlik (m). */
export const BACK_EXTRA = 0.022;

/** Gövde profili + alt kapanış satırları (karın altı sivrilir). */
const ROWS: readonly (readonly [number, number, number, number])[] = [
  [0.74, 0.02, 0.012, 0],
  [0.76, 0.1, 0.06, 0],
  [0.8, 0.138, 0.08, 0],
  ...TORSO_PROFILE,
];

/** 1B Catmull-Rom ara değeri */
const cr = (p0: number, p1: number, p2: number, p3: number, t: number): number =>
  0.5 *
  (2 * p1 +
    (p2 - p0) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t +
    (3 * p1 - p0 - 3 * p2 + p3) * t * t * t);

function rowAt(y: number, col: 1 | 2 | 3): number {
  const n = ROWS.length;
  const yy = clamp(y, ROWS[0][0], ROWS[n - 1][0]);
  let i = 0;
  while (i < n - 2 && yy > ROWS[i + 1][0]) i++;
  const t = (yy - ROWS[i][0]) / (ROWS[i + 1][0] - ROWS[i][0]);
  return cr(
    ROWS[Math.max(i - 1, 0)][col],
    ROWS[i][col],
    ROWS[i + 1][col],
    ROWS[Math.min(i + 2, n - 1)][col],
    t,
  );
}

export interface TorsoSample {
  hx: number;
  zFront: number;
  zBack: number;
  zc: number;
  zr: number;
}

/** y yüksekliğinde gövde kesitini (elips) döndürür. */
export function sampleTorso(y: number): TorsoSample {
  const hx = Math.max(0.01, rowAt(y, 1));
  const hz = Math.max(0.01, rowAt(y, 2));
  const cz = rowAt(y, 3);
  const zFront = cz + hz;
  const zBack = cz - hz - BACK_EXTRA;
  return { hx, zFront, zBack, zc: (zFront + zBack) / 2, zr: (zFront - zBack) / 2 };
}

/** Gövde yüzeyinin (x, y) noktasındaki z değeri. front=true ön, false arka yüzey. */
export function torsoSurfaceZ(x: number, y: number, front: boolean): number {
  const s = sampleTorso(y);
  const u = Math.min(Math.abs(x) / s.hx, 0.995);
  const k = Math.sqrt(1 - u * u);
  return s.zc + (front ? 1 : -1) * s.zr * k;
}

/** Eliptik kesitli gövde (loft). Köşeler halka başına M adet, dikiş çift köşe içermez. */
function torsoGeometry(): BufferGeometry {
  const N = 72;
  const M = 40;
  const y0 = ROWS[0][0];
  const y1 = ROWS[ROWS.length - 1][0];
  const pos: number[] = [];
  for (let i = 0; i <= N; i++) {
    const y = y0 + ((y1 - y0) * i) / N;
    const s = sampleTorso(y);
    for (let j = 0; j < M; j++) {
      const a = (j / M) * Math.PI * 2;
      pos.push(Math.cos(a) * s.hx, y, s.zc + Math.sin(a) * s.zr);
    }
  }
  const idx: number[] = [];
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < M; j++) {
      const a = i * M + j;
      const b = i * M + ((j + 1) % M);
      const c = (i + 1) * M + j;
      const d = (i + 1) * M + ((j + 1) % M);
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new BufferGeometry();
  g.setIndex(idx);
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

const limbTube = (
  pts: readonly Vec3[],
  radius: (t: number) => number,
  tubular = 40,
): BufferGeometry =>
  profileTube(curveFrom(pts), radius, { tubularSegments: tubular, radialSegments: 16, capLength: 0.04 });

/** Tüm cilt/siluet geometrisi (tek mesh). */
export function createSkinGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [torsoGeometry()];

  /* Kafa: kafa, çene, burun */
  parts.push(
    ellipsoid([0.088, 0.112, 0.108], [0, 1.655, 0], [0, 0, 0], 30),
    ellipsoid([0.052, 0.042, 0.056], [0, 1.585, 0.045], [0, 0, 0], 18),
    ellipsoid([0.011, 0.02, 0.018], [0, 1.64, 0.105], [0.3, 0, 0], 10),
  );

  /* Sol taraf parçaları (sonra aynalanır) */
  const left: BufferGeometry[] = [];

  // Kol: omuz → dirsek → bilek
  const armR = keyframes([[0, 0.046], [0.12, 0.047], [0.45, 0.038], [0.54, 0.033], [0.7, 0.031], [1, 0.0215]]);
  left.push(limbTube([JOINT.shoulder, JOINT.elbow, JOINT.wrist], armR, 44));
  left.push(ellipsoid([0.052, 0.05, 0.05], [0.2, 1.395, 0], [0, 0, 0], 16)); // omuz başlığı
  left.push(ellipsoid([0.03, 0.085, 0.017], [0.312, 0.775, 0.025], [0, 0, 0.17], 14)); // el
  left.push(ellipsoid([0.011, 0.028, 0.02], [0.084, 1.66, -0.005], [0, 0, 0], 10)); // kulak

  // Bacak: kalça → diz → ayak bileği
  const legR = keyframes([[0, 0.083], [0.2, 0.081], [0.45, 0.058], [0.53, 0.05], [0.64, 0.052], [0.85, 0.034], [1, 0.029]]);
  left.push(limbTube([[0.088, 0.95, 0.0], [0.093, 0.5, 0.01], [0.088, 0.095, -0.005]], legR, 56));
  left.push(ellipsoid([0.04, 0.03, 0.1], [0.09, 0.03, 0.065], [0, 0, 0], 14)); // ayak

  parts.push(withMirror(mergeAll(left)));
  return mergeAll(parts);
}
