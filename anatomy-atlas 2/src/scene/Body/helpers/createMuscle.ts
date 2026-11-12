import type { BufferGeometry } from 'three';
import type { Vec3 } from '@/data/systemsConfig';
import { lerp } from '@/utils/math';
import { sampleTorso, torsoSurfaceZ } from './createSkin';
import { curveFrom, fusiform, mergeAll, profileTube, withMirror } from './geometry';
import { JOINT } from './layout';
import { along, bar, ellipsoid } from './shapes';

export interface MuscleMesh {
  id: string;
  geometry: BufferGeometry;
}

type XY = readonly [number, number];

/* ───────── Yardımcılar ───────── */

/** Karnı şişkin (fusiform) kas lifi: noktalar boyunca, r yarıçaplı. */
function fibre(pts: readonly Vec3[], r: number, peak = 0.45, end = 0.35): BufferGeometry {
  const prof = fusiform(peak, end, 0.6);
  return profileTube(curveFrom(pts), (t) => r * prof(t), {
    tubularSegments: 22,
    radialSegments: 8,
    capLength: 0.06,
  });
}

/** (x,y) uçları arasında gövde yüzeyine yapışık noktalar (inset: yüzeyden içeri mesafe). */
function wrapPts(a: XY, b: XY, front: boolean, inset: number, n = 6): Vec3[] {
  const pts: Vec3[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = lerp(a[0], b[0], t);
    const y = lerp(a[1], b[1], t);
    pts.push([x, y, torsoSurfaceZ(x, y, front) + (front ? -inset : inset)]);
  }
  return pts;
}

/** Kırık çizgi üzerinde u (0..1) konumundaki nokta. */
function polyAt(keys: readonly XY[], u: number): XY {
  const f = u * (keys.length - 1);
  const i = Math.min(keys.length - 2, Math.floor(f));
  const t = f - i;
  return [lerp(keys[i][0], keys[i + 1][0], t), lerp(keys[i][1], keys[i + 1][1], t)];
}

/** İki uç arasındaki eksen boyunca (ofsetli) kas karnı. */
const limb = (
  a: Vec3,
  b: Vec3,
  ts: readonly number[],
  off: Vec3,
  r: number,
  peak = 0.45,
  end = 0.25,
): BufferGeometry => fibre(along(a, b, ts, off), r, peak, end);

const SH = JOINT.shoulder;
const EL = JOINT.elbow;
const WR = JOINT.wrist;
const HIP: Vec3 = [0.09, 0.95, 0.005];
const KNEE = JOINT.knee;
const ANKLE = JOINT.ankle;

/* ───────── Gövde kasları ───────── */

function pectoralis(): BufferGeometry[] {
  const r = 0.0135;
  const out: BufferGeometry[] = [];
  for (let i = 0; i < 8; i++) {
    const y0 = 1.415 - i * 0.026;
    const pts = wrapPts([0.024, y0], [0.155, 1.345 + (i - 3.5) * 0.004], true, r + 0.004, 5);
    pts.push([0.205, 1.325, 0.034]); // humerus ön yüzüne tutunma
    out.push(fibre(pts, r, 0.4, 0.4));
  }
  return out;
}

function deltoid(): BufferGeometry[] {
  return [
    fibre([[0.14, 1.43, 0.045], [0.19, 1.41, 0.04], [0.232, 1.3, 0.022]], 0.015), // ön
    fibre([[0.2, 1.425, 0.0], [0.228, 1.4, 0.0], [0.238, 1.29, 0.0]], 0.017), // orta
    fibre([[0.14, 1.405, -0.09], [0.2, 1.405, -0.055], [0.232, 1.3, -0.022]], 0.015), // arka
  ];
}

function rectus(): BufferGeometry[] {
  // Tendinöz bantlarla bölünmüş 5 segment ("six-pack" görünümü)
  const ys = [1.205, 1.15, 1.095, 1.04, 0.985, 0.935];
  const out: BufferGeometry[] = [];
  for (let i = 0; i < ys.length - 1; i++) {
    const ym = (ys[i] + ys[i + 1]) / 2;
    const z = torsoSurfaceZ(0.028, ym, true) - 0.011;
    out.push(ellipsoid([0.0245, ((ys[i] - ys[i + 1]) / 2) * 1.04, 0.0105], [0.029, ym, z], [0, 0, 0], 12));
  }
  return out;
}

function externalOblique(): BufferGeometry[] {
  const r = 0.0125;
  const out: BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const y0 = 1.3 - 0.035 * i;
    const x0 = sampleTorso(y0).hx * 0.93;
    out.push(fibre(wrapPts([x0, y0], [0.07 - 0.003 * i, y0 - 0.15], true, r + 0.004, 6), r, 0.5, 0.4));
  }
  return out;
}

function trapezius(): BufferGeometry[] {
  const r = 0.0145;
  const ends: readonly XY[] = [[0.125, 1.435], [0.17, 1.42], [0.185, 1.4], [0.16, 1.385], [0.09, 1.36], [0.055, 1.355]];
  const out: BufferGeometry[] = [];
  for (let i = 0; i < 12; i++) {
    const start: XY = [0.006, 1.56 - 0.03 * i]; // kafatası tabanından T12'ye
    out.push(fibre(wrapPts(start, polyAt(ends, i / 11), false, r + 0.004, 6), r, 0.5, 0.45));
  }
  return out;
}

function latissimus(): BufferGeometry[] {
  const r = 0.014;
  const out: BufferGeometry[] = [];
  for (let i = 0; i < 10; i++) {
    const pts = wrapPts([0.012, 1.285 - 0.03 * i], [0.15, 1.29 + 0.002 * i], false, r + 0.016, 6);
    pts.push([0.205, 1.31, -0.03]); // humerusa tutunma
    out.push(fibre(pts, r, 0.45, 0.4));
  }
  return out;
}

function gluteus(): BufferGeometry[] {
  const r = 0.02;
  const out: BufferGeometry[] = [];
  for (let i = 0; i < 7; i++) {
    const u = i / 6;
    const start: XY = [lerp(0.014, 0.1, u), lerp(0.935, 1.0, u)]; // sakrum → iliak kret
    const pts = wrapPts(start, [0.1, 0.9], false, r + 0.004, 4);
    pts.push([0.105, 0.855 - 0.006 * i, -0.052]); // femur arka üstü
    out.push(fibre(pts, r, 0.4, 0.4));
  }
  return out;
}

/* ───────── Üst ekstremite ───────── */

const biceps = (): BufferGeometry[] => [
  limb(SH, EL, [0.1, 0.35, 0.65, 0.95], [-0.004, 0, 0.024], 0.0165, 0.4, 0.22), // uzun baş
  limb(SH, EL, [0.12, 0.4, 0.7, 0.95], [0.01, 0, 0.021], 0.013, 0.4, 0.22), // kısa baş
];

const triceps = (): BufferGeometry[] => [
  limb(SH, EL, [0.1, 0.4, 0.7, 0.97], [-0.004, 0, -0.024], 0.017, 0.4, 0.2), // uzun baş
  limb(SH, EL, [0.14, 0.45, 0.75, 0.97], [0.012, 0, -0.02], 0.014, 0.4, 0.2), // lateral baş
];

const forearmFlexors = (): BufferGeometry[] => [
  limb(EL, WR, [0.1, 0.35, 0.65, 0.95], [-0.002, 0, 0.012], 0.0145, 0.3, 0.15),
  limb(EL, WR, [0.12, 0.4, 0.7, 0.96], [0.01, 0, 0.015], 0.011, 0.3, 0.15),
];

/* ───────── Alt ekstremite ───────── */

const quadriceps = (): BufferGeometry[] => [
  limb(HIP, KNEE, [0.02, 0.3, 0.62, 0.97], [0, 0, 0.036], 0.024, 0.4, 0.2), // rektus femoris
  limb(HIP, KNEE, [0.05, 0.35, 0.7, 0.97], [0.03, 0, 0.018], 0.026, 0.4, 0.25), // vastus lateralis
  limb(HIP, KNEE, [0.35, 0.62, 0.85, 0.99], [-0.03, 0, 0.02], 0.023, 0.7, 0.35), // vastus medialis
  bar([0.095, 0.545, 0.046], [0.093, 0.512, 0.046], 0.008), // kuadriseps tendonu
];

const hamstrings = (): BufferGeometry[] => [
  limb(HIP, KNEE, [0.04, 0.3, 0.65, 0.95], [0.022, 0, -0.036], 0.022, 0.4, 0.2), // biseps femoris
  limb(HIP, KNEE, [0.04, 0.3, 0.65, 0.95], [-0.01, 0, -0.04], 0.018, 0.4, 0.2), // semitendinosus
  limb(HIP, KNEE, [0.04, 0.3, 0.65, 0.95], [-0.03, 0, -0.03], 0.02, 0.4, 0.2), // semimembranosus
];

const gastrocnemius = (): BufferGeometry[] => [
  limb(KNEE, ANKLE, [-0.04, 0.18, 0.45, 0.7], [-0.015, 0, -0.022], 0.02, 0.35, 0.15), // medial baş
  limb(KNEE, ANKLE, [-0.04, 0.18, 0.45, 0.7], [0.018, 0, -0.022], 0.019, 0.35, 0.15), // lateral baş
  bar([0.088, 0.24, -0.02], [0.088, 0.075, -0.024], 0.007, 10), // aşil tendonu
];

const sartorius = (): BufferGeometry[] => [
  fibre(
    [[0.115, 0.98, 0.05], [0.1, 0.85, 0.07], [0.09, 0.72, 0.068], [0.077, 0.58, 0.055], [0.075, 0.48, 0.045]],
    0.0085,
    0.5,
    0.7,
  ),
];

const tibialisAnterior = (): BufferGeometry[] => [
  limb(KNEE, ANKLE, [0.08, 0.3, 0.6, 0.88], [0.018, 0, 0.02], 0.011, 0.3, 0.2),
  bar([0.098, 0.1, 0.034], [0.082, 0.05, 0.05], 0.004, 8), // tendon
];

const adductors = (): BufferGeometry[] => [
  limb(HIP, KNEE, [0.02, 0.25, 0.55, 0.8], [-0.04, 0, 0.004], 0.024, 0.35, 0.2),
  limb(HIP, KNEE, [0.02, 0.25, 0.55, 0.8], [-0.036, 0, -0.02], 0.02, 0.35, 0.2),
  limb(HIP, KNEE, [0.0, 0.3, 0.7, 1.0], [-0.052, 0, -0.005], 0.0075, 0.5, 0.7), // grasilis
];

const sternocleidomastoid = (): BufferGeometry[] => [
  fibre([[0.014, 1.405, 0.068], [0.035, 1.47, 0.045], [0.047, 1.53, 0.008], [0.062, 1.58, -0.03]], 0.0095, 0.45, 0.4),
];

/* ───────── Dışa aktarım ───────── */

/** 17 kas grubu (sol taraf üretilip aynalanır). anatomyData id'leriyle eşleşir. */
export function createMuscles(): MuscleMesh[] {
  const make = (id: string, parts: BufferGeometry[]): MuscleMesh => ({
    id,
    geometry: withMirror(mergeAll(parts)),
  });
  return [
    make('pectoralis-major', pectoralis()),
    make('deltoid', deltoid()),
    make('biceps-brachii', biceps()),
    make('triceps-brachii', triceps()),
    make('rectus-abdominis', rectus()),
    make('external-oblique', externalOblique()),
    make('trapezius', trapezius()),
    make('latissimus-dorsi', latissimus()),
    make('gluteus-maximus', gluteus()),
    make('quadriceps', quadriceps()),
    make('hamstrings', hamstrings()),
    make('gastrocnemius', gastrocnemius()),
    make('sartorius', sartorius()),
    make('sternocleidomastoid', sternocleidomastoid()),
    make('forearm-flexors', forearmFlexors()),
    make('tibialis-anterior', tibialisAnterior()),
    make('adductors', adductors()),
  ];
}
