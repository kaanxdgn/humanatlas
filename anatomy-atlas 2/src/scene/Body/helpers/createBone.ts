import {
  CylinderGeometry,
  Matrix4,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  type BufferGeometry,
} from 'three';
import type { Vec3 } from '@/data/systemsConfig';
import { sampleTorso } from './createSkin';
import {
  boneProfile,
  curveFrom,
  mergeAll,
  profileTube,
  withMirror,
  xform,
  type ProfileTubeOptions,
} from './geometry';
import { JOINT, SACRUM_CENTER, SPINE_POINTS, SPINE_RANGES } from './layout';
import { bar, ellipsoid, morph } from './shapes';

export interface BoneMesh {
  id: string;
  geometry: BufferGeometry;
}
export interface BoneInstanced {
  id: string;
  geometry: BufferGeometry;
  matrices: Matrix4[];
}
export interface BoneSet {
  /** Tekil (birleştirilmiş) mesh'ler */
  meshes: BoneMesh[];
  /** InstancedMesh olarak çizilecek omur grupları */
  instanced: BoneInstanced[];
}

const SPINE = curveFrom(SPINE_POINTS);
const UP = new Vector3(0, 1, 0);

const tube = (
  pts: readonly Vec3[],
  radius: (t: number) => number,
  o: ProfileTubeOptions = {},
): BufferGeometry =>
  profileTube(curveFrom(pts), radius, { tubularSegments: 24, radialSegments: 8, capLength: 0.06, ...o });

/* ───────── Omurga ───────── */

/** Tek omur (ölçek 1 ≈ torasik). Arka (spinöz çıkıntı) −Z yönündedir. */
function vertebraGeometry(): BufferGeometry {
  return mergeAll([
    new CylinderGeometry(0.012, 0.0125, 0.02, 14, 1),
    ellipsoid([0.011, 0.008, 0.007], [0, 0, -0.014], [0, 0, 0], 10), // arkus
    ellipsoid([0.0028, 0.007, 0.011], [0, -0.004, -0.024], [-0.45, 0, 0], 8), // spinöz çıkıntı
    ellipsoid([0.018, 0.0028, 0.004], [0, 0.002, -0.015], [0, 0, 0], 8), // transvers çıkıntılar
  ]);
}

/** Omurga eğrisi boyunca, teğete hizalı örnek matrisleri. */
function vertebraMatrices(from: number, to: number, count: number, scale: number): Matrix4[] {
  const out: Matrix4[] = [];
  const q = new Quaternion();
  const s = new Vector3(scale, scale, scale);
  for (let i = 0; i < count; i++) {
    const t = from + ((to - from) * (i + 0.5)) / count;
    const p = SPINE.getPointAt(t);
    q.setFromUnitVectors(UP, SPINE.getTangentAt(t).normalize());
    out.push(new Matrix4().compose(p, q, s));
  }
  return out;
}

/* ───────── Kaburgalar ───────── */

/**
 * Sol taraf kaburga yolu (level 0..11 = 1..12. kaburga). inset > 0 → içeri kaydırılmış
 * (interkostal sinirler için). 8-10 yalancı, 11-12 yüzen kaburga olduğundan daha kısa sarar.
 */
export function ribPath(level: number, inset = 0): Vec3[] {
  const { from, to } = SPINE_RANGES.thoracic;
  const t = to - ((to - from) * (level + 0.5)) / 12;
  const P = SPINE.getPointAt(t);
  const sweep = level < 7 ? 1 : level < 10 ? 0.86 : 0.58;
  const W = 0.068 + 0.082 * Math.sin((Math.PI * (level + 1.2)) / 12.6) - inset;
  const zFront = sampleTorso(P.y - 0.04).zFront - 0.016 - inset;
  const D = zFront - P.z;
  const drop = 0.02 + 0.006 * level;
  const N = 14;
  const pts: Vec3[] = [];
  for (let k = 0; k <= N; k++) {
    const th = (sweep * Math.PI * k) / N;
    pts.push([
      0.012 + W * Math.sin(th),
      P.y - drop * Math.pow(k / N, 1.2),
      P.z + (D * (1 - Math.cos(th))) / 2,
    ]);
  }
  return pts;
}

function ribs(): BufferGeometry {
  const list: BufferGeometry[] = [];
  for (let l = 0; l < 12; l++) {
    list.push(
      tube(ribPath(l), (t) => 0.0048 - 0.0008 * t, { tubularSegments: 26, radialSegments: 6, capLength: 0.04 }),
    );
  }
  return withMirror(mergeAll(list));
}

/* ───────── Kafatası, sternum, pelvis ───────── */

function skull(): BufferGeometry {
  const parts: BufferGeometry[] = [
    ellipsoid([0.075, 0.088, 0.1], [0, 1.675, -0.012], [0, 0, 0], 28), // kranyum
    ellipsoid([0.05, 0.05, 0.047], [0, 1.612, 0.05], [0, 0, 0], 20), // yüz kemikleri
    ellipsoid([0.008, 0.014, 0.012], [0, 1.622, 0.098], [0.3, 0, 0], 8), // burun açıklığı
  ];
  const half: BufferGeometry[] = [
    xform(new TorusGeometry(0.0145, 0.0035, 8, 22), { p: [0.033, 1.646, 0.088], r: [0, 0.25, 0] }), // orbita
    tube([[0.05, 1.626, 0.068], [0.072, 1.636, 0.04], [0.077, 1.64, 0.008]], () => 0.0042), // zigomatik kemer
    tube(
      [[0.049, 1.598, -0.006], [0.046, 1.572, 0.0], [0.036, 1.553, 0.04], [0.014, 1.546, 0.066], [0, 1.545, 0.07]],
      () => 0.0072,
      { capLength: 0.02 },
    ), // mandibula
  ];
  parts.push(withMirror(mergeAll(half)));
  return mergeAll(parts);
}

function sternum(): BufferGeometry {
  const z = (y: number): number => sampleTorso(y).zFront - 0.02;
  return mergeAll([
    ellipsoid([0.03, 0.022, 0.006], [0, 1.388, z(1.388)], [0, 0, 0], 12), // manubrium
    ellipsoid([0.018, 0.075, 0.006], [0, 1.29, z(1.29)], [0, 0, 0], 12), // gövde
    ellipsoid([0.007, 0.018, 0.004], [0, 1.2, z(1.2)], [0, 0, 0], 8), // ksifoid
  ]);
}

function sacrum(): BufferGeometry {
  const body = morph(new SphereGeometry(1, 18, 14), (p) => {
    const k = 0.4 + 0.6 * (p.y * 0.5 + 0.5); // üstte geniş, altta dar (üçgen)
    p.set(p.x * 0.052 * k, p.y * 0.055, p.z * 0.016 * (0.6 + 0.4 * k));
  });
  xform(body, { p: SACRUM_CENTER, r: [0.3, 0, 0] });
  const coccyx = tube([[0, 0.888, -0.082], [0, 0.868, -0.082], [0, 0.85, -0.072]], (t) => 0.007 * (1 - 0.7 * t));
  return mergeAll([body, coccyx]);
}

function pelvis(): BufferGeometry {
  const left: BufferGeometry[] = [
    ellipsoid([0.016, 0.052, 0.07], [0.105, 0.99, -0.005], [0, 0.5, -0.3], 16), // ilium kanadı
    tube([[0.1, 1.0, -0.045], [0.06, 0.975, -0.065], [0.03, 0.955, -0.066]], () => 0.01), // sakroiliyak
    tube([[0.088, 0.925, -0.01], [0.078, 0.885, -0.04], [0.062, 0.865, -0.035]], () => 0.011), // iskium
    tube([[0.088, 0.925, 0.0], [0.06, 0.905, 0.06], [0.012, 0.895, 0.082]], () => 0.008), // pubis
  ];
  return mergeAll([withMirror(mergeAll(left)), ellipsoid([0.012, 0.014, 0.007], [0, 0.896, 0.082], [0, 0, 0], 8)]);
}

/* ───────── Üst ekstremite (sol; aynalanır) ───────── */

function clavicle(): BufferGeometry {
  return withMirror(
    tube(
      [[0.012, 1.425, 0.062], [0.06, 1.44, 0.066], [0.12, 1.441, 0.046], [0.17, 1.428, 0.02], [0.197, 1.418, 0.004]],
      boneProfile(0.0058, 0.5, 0.12),
      { tubularSegments: 30 },
    ),
  );
}

function scapula(): BufferGeometry {
  const blade = morph(new SphereGeometry(1, 16, 12), (p) => {
    const k = 0.45 + 0.55 * (p.y * 0.5 + 0.5); // üstte geniş
    p.set(p.x * 0.045 * k, p.y * 0.062, p.z * 0.006);
  });
  xform(blade, { p: [0.1, 1.335, -0.096], r: [0, -0.35, 0] });
  const spine = tube(
    [[0.04, 1.365, -0.1], [0.11, 1.378, -0.108], [0.17, 1.405, -0.09], [0.195, 1.412, -0.045], [0.2, 1.41, -0.01]],
    () => 0.0055,
    { tubularSegments: 22 },
  );
  const glenoid = ellipsoid([0.012, 0.018, 0.012], [0.19, 1.385, -0.012], [0, 0, 0], 10);
  return withMirror(mergeAll([blade, spine, glenoid]));
}

function humerus(): BufferGeometry {
  const shaft = tube([JOINT.shoulder, [0.222, 1.265, 0.001], JOINT.elbow], boneProfile(0.0088, 0.55, 0.09), {
    tubularSegments: 28,
  });
  return withMirror(
    mergeAll([
      shaft,
      ellipsoid([0.019, 0.019, 0.019], [0.192, 1.397, 0.0], [0, 0, 0], 14), // humerus başı
      ellipsoid([0.022, 0.01, 0.012], [0.255, 1.115, -0.005], [0, 0, 0], 10), // kondiller
    ]),
  );
}

function radius(): BufferGeometry {
  return withMirror(
    tube([[0.262, 1.115, 0.012], [0.278, 1.0, 0.02], [0.3, 0.885, 0.02]], boneProfile(0.0058, 0.9, 0.12)),
  );
}

function ulna(): BufferGeometry {
  return withMirror(
    mergeAll([
      tube([[0.252, 1.125, -0.014], [0.272, 1.0, -0.002], [0.288, 0.89, 0.003]], boneProfile(0.0058, 0.8, 0.12)),
      ellipsoid([0.011, 0.014, 0.01], [0.25, 1.13, -0.022], [0, 0, 0], 10), // olekranon
    ]),
  );
}

function hand(): BufferGeometry {
  const hx = (y: number, off: number): number => 0.295 + off * (1 + 2.2 * (0.8 - y)) + 0.17 * (0.88 - y);
  const hz = (y: number): number => 0.016 + 0.08 * (0.88 - y);
  const parts: BufferGeometry[] = [];

  // Karpal kemikler (2 sıra × 4)
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 2; j++) {
      parts.push(ellipsoid([0.0068, 0.006, 0.006], [0.286 + i * 0.0095, 0.868 - j * 0.011 - (i % 2) * 0.002, 0.015], [0, 0, 0], 8));
    }
  }

  // Metakarpaller + parmaklar (işaret, orta, yüzük, serçe)
  const fingers = [
    { off: 0.018, mcp: 0.795, tip: 0.702, r: 0.0058 },
    { off: 0.004, mcp: 0.79, tip: 0.69, r: 0.006 },
    { off: -0.01, mcp: 0.797, tip: 0.7, r: 0.0055 },
    { off: -0.022, mcp: 0.81, tip: 0.726, r: 0.0048 },
  ];
  for (const f of fingers) {
    parts.push(bar([hx(0.855, f.off * 0.7), 0.855, hz(0.855)], [hx(f.mcp, f.off), f.mcp, hz(f.mcp)], 0.0052, 6));
    const ys = [f.mcp, f.mcp - (f.mcp - f.tip) * 0.4, f.mcp - (f.mcp - f.tip) * 0.72, f.tip];
    const pts = ys.map((y, k): Vec3 => [hx(y, f.off), y, hz(y) + 0.003 * k]);
    parts.push(tube(pts, (t) => f.r * (1 - 0.35 * t), { tubularSegments: 12, radialSegments: 6, capLength: 0.12 }));
  }

  // Başparmak
  parts.push(
    tube([[0.305, 0.87, 0.025], [0.325, 0.82, 0.04], [0.34, 0.78, 0.05], [0.348, 0.75, 0.058]], (t) => 0.0065 * (1 - 0.3 * t), {
      tubularSegments: 12,
      radialSegments: 6,
      capLength: 0.12,
    }),
  );
  return withMirror(mergeAll(parts));
}

/* ───────── Alt ekstremite (sol; aynalanır) ───────── */

function femur(): BufferGeometry {
  const neck = tube([JOINT.hip, [0.098, 0.905, 0.001], [0.108, 0.893, 0.002]], () => 0.0085, { tubularSegments: 8 });
  const shaft = tube(
    [[0.106, 0.88, 0.002], [0.1, 0.75, 0.01], [0.097, 0.62, 0.014], [0.094, 0.52, 0.01]],
    boneProfile(0.0105, 0.6, 0.1),
    { tubularSegments: 32 },
  );
  return withMirror(
    mergeAll([
      neck,
      shaft,
      ellipsoid([0.021, 0.021, 0.021], JOINT.hip, [0, 0, 0], 14), // femur başı
      ellipsoid([0.012, 0.018, 0.012], [0.112, 0.89, 0.0], [0, 0, 0], 10), // büyük trokanter
      ellipsoid([0.024, 0.016, 0.02], [0.093, 0.508, 0.008], [0, 0, 0], 12), // kondiller
    ]),
  );
}

function patella(): BufferGeometry {
  return withMirror(ellipsoid([0.017, 0.02, 0.007], [0.093, 0.505, 0.037], [0, 0, 0], 12));
}

function tibia(): BufferGeometry {
  const shaft = tube([[0.092, 0.48, 0.012], [0.09, 0.3, 0.012], [0.088, 0.1, -0.002]], boneProfile(0.0095, 0.55, 0.1), {
    tubularSegments: 32,
  });
  return withMirror(
    mergeAll([
      shaft,
      ellipsoid([0.026, 0.01, 0.022], [0.093, 0.487, 0.01], [0, 0, 0], 12), // tibial plato
      ellipsoid([0.01, 0.014, 0.01], [0.082, 0.082, -0.004], [0, 0, 0], 8), // medial malleol
    ]),
  );
}

function fibula(): BufferGeometry {
  return withMirror(
    mergeAll([
      tube([[0.12, 0.465, -0.004], [0.118, 0.3, -0.006], [0.112, 0.1, -0.014]], boneProfile(0.0045, 0.7, 0.08), {
        tubularSegments: 28,
      }),
      ellipsoid([0.008, 0.014, 0.01], [0.112, 0.08, -0.014], [0, 0, 0], 8), // lateral malleol
    ]),
  );
}

function foot(): BufferGeometry {
  const parts: BufferGeometry[] = [
    ellipsoid([0.017, 0.02, 0.035], [0.085, 0.03, -0.035], [0, 0, 0], 12), // kalkaneus
    ellipsoid([0.02, 0.015, 0.025], [0.088, 0.07, -0.005], [0, 0, 0], 10), // talus
    ellipsoid([0.03, 0.012, 0.03], [0.09, 0.035, 0.035], [0, 0, 0], 10), // tarsal blok
  ];
  const xs = [0.07, 0.082, 0.093, 0.103, 0.112];
  xs.forEach((x, i) => {
    parts.push(bar([x, 0.028, 0.05], [x + 0.001 * i, 0.016, 0.115], 0.0055, 6)); // metatarsal
    const tipZ = i === 0 ? 0.19 : 0.165 - 0.006 * i;
    parts.push(bar([x + 0.001 * i, 0.015, 0.12], [x + 0.002 * i, 0.012, tipZ], i === 0 ? 0.0072 : 0.0042, 6)); // parmak
  });
  return withMirror(mergeAll(parts));
}

/* ───────── Dışa aktarım ───────── */

/** Tüm iskelet geometrileri (sağ-sol simetrik, anatomyData id'leriyle eşleşir). */
export function createBones(): BoneSet {
  const meshes: BoneMesh[] = [
    { id: 'skull', geometry: skull() },
    { id: 'sacrum', geometry: sacrum() },
    { id: 'ribs', geometry: ribs() },
    { id: 'sternum', geometry: sternum() },
    { id: 'clavicle', geometry: clavicle() },
    { id: 'scapula', geometry: scapula() },
    { id: 'humerus', geometry: humerus() },
    { id: 'radius', geometry: radius() },
    { id: 'ulna', geometry: ulna() },
    { id: 'hand-bones', geometry: hand() },
    { id: 'pelvis', geometry: pelvis() },
    { id: 'femur', geometry: femur() },
    { id: 'patella', geometry: patella() },
    { id: 'tibia', geometry: tibia() },
    { id: 'fibula', geometry: fibula() },
    { id: 'foot-bones', geometry: foot() },
  ];
  const base = vertebraGeometry();
  const R = SPINE_RANGES;
  const instanced: BoneInstanced[] = [
    { id: 'lumbar-spine', geometry: base, matrices: vertebraMatrices(R.lumbar.from, R.lumbar.to, R.lumbar.count, 1.45) },
    { id: 'thoracic-spine', geometry: base, matrices: vertebraMatrices(R.thoracic.from, R.thoracic.to, R.thoracic.count, 1.0) },
    { id: 'cervical-spine', geometry: base, matrices: vertebraMatrices(R.cervical.from, R.cervical.to, R.cervical.count, 0.85) },
  ];
  return { meshes, instanced };
}
