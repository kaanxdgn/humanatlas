import type { Vec3 } from '@/data/systemsConfig';
import { ribPath } from './createBone';

export type NetKind = 'artery' | 'vein' | 'nerve';

/** Damar/sinir yolu. Arter: kalpten uca; ven: uçtan kalbe (akış yönü = nokta sırası). */
export interface NetPath {
  /** anatomyData.ts id'si */
  id: string;
  kind: NetKind;
  points: Vec3[];
  r0: number;
  r1: number;
}

interface Def {
  id: string;
  kind: NetKind;
  pts: Vec3[];
  r0: number;
  r1: number;
  mirror?: boolean;
  /** Sağ taraf simetrik değilse açık yol */
  right?: Vec3[];
}

const mir = (pts: readonly Vec3[]): Vec3[] => pts.map((p): Vec3 => [-p[0], p[1], p[2]]);
const rev = (pts: readonly Vec3[], off: Vec3 = [0, 0, 0]): Vec3[] =>
  [...pts].reverse().map((p): Vec3 => [p[0] + off[0], p[1] + off[1], p[2] + off[2]]);

function expand(defs: readonly Def[]): NetPath[] {
  const out: NetPath[] = [];
  for (const d of defs) {
    out.push({ id: d.id, kind: d.kind, points: d.pts, r0: d.r0, r1: d.r1 });
    if (d.mirror) out.push({ id: d.id, kind: d.kind, points: d.right ?? mir(d.pts), r0: d.r0, r1: d.r1 });
  }
  return out;
}

/* ═══════════════ DAMARLAR ═══════════════ */

const CAROTID_L: Vec3[] = [
  [0.02, 1.343, 0.016], [0.028, 1.4, 0.014], [0.03, 1.46, 0.01], [0.031, 1.52, 0.004],
  [0.03, 1.57, -0.004], [0.026, 1.615, -0.012], [0.02, 1.645, -0.01],
];
const BRACHIAL_A: Vec3[] = [
  [0.03, 1.35, 0.012], [0.075, 1.415, 0.032], [0.135, 1.43, 0.03], [0.168, 1.385, 0.025],
  [0.186, 1.34, 0.01], [0.198, 1.3, 0.0], [0.224, 1.2, -0.002], [0.245, 1.12, 0.012],
  [0.268, 1.02, 0.028], [0.288, 0.9, 0.03], [0.3, 0.85, 0.034],
];
const FEMORAL_A: Vec3[] = [
  [0.005, 0.96, -0.038], [0.04, 0.93, -0.02], [0.07, 0.9, 0.0], [0.075, 0.85, 0.03], [0.08, 0.72, 0.025],
  [0.078, 0.6, 0.012], [0.082, 0.52, -0.01], [0.088, 0.46, -0.03], [0.09, 0.3, -0.02], [0.09, 0.1, -0.01],
];

export function createVessels(): NetPath[] {
  return expand([
    /* Aort: kökten çatala */
    {
      id: 'aorta', kind: 'artery', r0: 0.0125, r1: 0.0075,
      pts: [
        [0.015, 1.262, 0.036], [0.012, 1.3, 0.03], [0.018, 1.338, 0.016], [0.04, 1.345, -0.012], [0.04, 1.315, -0.042],
        [0.028, 1.26, -0.055], [0.02, 1.15, -0.05], [0.014, 1.05, -0.045], [0.008, 0.975, -0.04], [0.005, 0.96, -0.038],
      ],
    },
    /* Karotis (sağ taraf brakiyosefalik gövdeden başlar) */
    {
      id: 'carotid-arteries', kind: 'artery', r0: 0.0048, r1: 0.0035, pts: CAROTID_L, mirror: true,
      right: [[-0.01, 1.335, 0.024], [-0.022, 1.37, 0.02], ...mir(CAROTID_L).slice(1)],
    },
    /* Juguler venler (baştan kalbe) */
    {
      id: 'jugular-veins', kind: 'vein', r0: 0.0062, r1: 0.0075, mirror: true,
      pts: [[0.034, 1.6, -0.025], [0.04, 1.55, -0.01], [0.042, 1.48, 0.003], [0.04, 1.42, 0.014], [0.032, 1.385, 0.026], [0.012, 1.36, 0.03]],
    },
    /* Üst ve alt vena kava */
    {
      id: 'vena-cava', kind: 'vein', r0: 0.0085, r1: 0.0085,
      pts: [[-0.012, 1.36, 0.03], [-0.014, 1.32, 0.033], [-0.012, 1.285, 0.04], [-0.002, 1.268, 0.044]],
    },
    {
      id: 'vena-cava', kind: 'vein', r0: 0.0095, r1: 0.011,
      pts: [[-0.01, 0.962, -0.034], [-0.016, 1.04, -0.032], [-0.02, 1.1, -0.018], [-0.016, 1.17, 0.0], [-0.006, 1.225, 0.03], [0.002, 1.245, 0.044]],
    },
    /* Pulmoner arterler */
    { id: 'pulmonary-arteries', kind: 'artery', r0: 0.0085, r1: 0.0085, pts: [[0.016, 1.268, 0.058], [0.016, 1.3, 0.046]] },
    {
      id: 'pulmonary-arteries', kind: 'artery', r0: 0.0072, r1: 0.0045,
      pts: [[0.016, 1.3, 0.046], [0.034, 1.318, 0.022], [0.066, 1.298, 0.014], [0.096, 1.275, 0.02]],
    },
    {
      id: 'pulmonary-arteries', kind: 'artery', r0: 0.0072, r1: 0.0045,
      pts: [[0.016, 1.3, 0.046], [-0.02, 1.318, 0.022], [-0.06, 1.3, 0.014], [-0.096, 1.275, 0.02]],
    },
    { id: 'pulmonary-arteries', kind: 'artery', r0: 0.0045, r1: 0.002, pts: [[0.096, 1.275, 0.02], [0.112, 1.3, 0.022], [0.12, 1.33, 0.02]], mirror: true },
    { id: 'pulmonary-arteries', kind: 'artery', r0: 0.0045, r1: 0.002, pts: [[0.096, 1.275, 0.02], [0.11, 1.24, 0.02], [0.118, 1.2, 0.02]], mirror: true },
    /* Pulmoner venler: dördü de sol atriyuma (≈ x 0.045) açılır */
    { id: 'pulmonary-veins', kind: 'vein', r0: 0.004, r1: 0.0055, pts: [[0.112, 1.31, 0.02], [0.085, 1.3, 0.012], [0.06, 1.292, 0.02], [0.046, 1.286, 0.026]] },
    { id: 'pulmonary-veins', kind: 'vein', r0: 0.004, r1: 0.0055, pts: [[0.108, 1.22, 0.018], [0.085, 1.25, 0.008], [0.06, 1.275, 0.014], [0.046, 1.283, 0.022]] },
    { id: 'pulmonary-veins', kind: 'vein', r0: 0.004, r1: 0.0055, pts: [[-0.112, 1.31, 0.02], [-0.08, 1.305, 0.01], [-0.03, 1.298, 0.01], [0, 1.292, 0.016], [0.044, 1.288, 0.024]] },
    { id: 'pulmonary-veins', kind: 'vein', r0: 0.004, r1: 0.0055, pts: [[-0.108, 1.22, 0.018], [-0.08, 1.25, 0.004], [-0.03, 1.28, 0.008], [0, 1.286, 0.014], [0.044, 1.284, 0.022]] },
    /* Koroner arterler: kalp yüzeyinde */
    { id: 'coronary-arteries', kind: 'artery', r0: 0.0028, r1: 0.0012, pts: [[0.018, 1.27, 0.06], [0.03, 1.255, 0.07], [0.036, 1.23, 0.073], [0.042, 1.2, 0.068], [0.048, 1.185, 0.055]] },
    { id: 'coronary-arteries', kind: 'artery', r0: 0.0026, r1: 0.0012, pts: [[0.02, 1.268, 0.05], [0.05, 1.265, 0.05], [0.07, 1.25, 0.035], [0.07, 1.23, 0.01]] },
    { id: 'coronary-arteries', kind: 'artery', r0: 0.0026, r1: 0.0012, pts: [[0.01, 1.268, 0.055], [-0.005, 1.255, 0.065], [-0.02, 1.235, 0.065], [-0.02, 1.21, 0.055], [0, 1.195, 0.04]] },
    /* Böbrek damarları */
    { id: 'renal-vessels', kind: 'artery', r0: 0.004, r1: 0.003, pts: [[0.02, 1.07, -0.05], [0.045, 1.07, -0.055], [0.06, 1.065, -0.06]] },
    { id: 'renal-vessels', kind: 'artery', r0: 0.004, r1: 0.003, pts: [[0.015, 1.07, -0.05], [-0.03, 1.07, -0.058], [-0.06, 1.045, -0.06]] },
    { id: 'renal-vessels', kind: 'vein', r0: 0.0042, r1: 0.005, pts: [[0.06, 1.055, -0.058], [0.04, 1.058, -0.045], [-0.02, 1.06, -0.03]] },
    { id: 'renal-vessels', kind: 'vein', r0: 0.0042, r1: 0.005, pts: [[-0.06, 1.045, -0.058], [-0.04, 1.052, -0.04], [-0.02, 1.06, -0.03]] },
    /* Femoral arter ve ven (iliak çatallanmadan ayak bileğine) */
    { id: 'femoral-vessels', kind: 'artery', r0: 0.007, r1: 0.003, pts: FEMORAL_A, mirror: true },
    { id: 'femoral-vessels', kind: 'vein', r0: 0.003, r1: 0.008, pts: rev(FEMORAL_A, [-0.01, 0, -0.006]), mirror: true },
    /* Portal ven + splenik ven */
    {
      id: 'portal-vein', kind: 'vein', r0: 0.004, r1: 0.0075,
      pts: [[0, 0.98, 0.05], [-0.005, 1.03, 0.03], [-0.015, 1.06, 0.015], [-0.04, 1.1, 0.02], [-0.08, 1.12, 0.04]],
    },
    { id: 'portal-vein', kind: 'vein', r0: 0.0035, r1: 0.0045, pts: [[-0.04, 1.1, 0.02], [-0.02, 1.12, 0.05]] },
    { id: 'portal-vein', kind: 'vein', r0: 0.004, r1: 0.0055, pts: [[0.1, 1.1, -0.04], [0.06, 1.07, -0.02], [0, 1.062, 0], [-0.015, 1.062, 0.015]] },
    /* Kol damarları: subklavian → brakiyal → radyal / ulnar; venler kalbe döner */
    { id: 'brachial-vessels', kind: 'artery', r0: 0.0062, r1: 0.0025, pts: BRACHIAL_A, mirror: true },
    {
      id: 'brachial-vessels', kind: 'artery', r0: 0.003, r1: 0.002, mirror: true,
      pts: [[0.245, 1.12, 0.012], [0.255, 1.05, -0.008], [0.27, 0.97, -0.004], [0.285, 0.9, 0.0]],
    },
    { id: 'brachial-vessels', kind: 'vein', r0: 0.0025, r1: 0.0062, pts: rev(BRACHIAL_A, [0, 0, -0.008]), mirror: true },
  ]);
}

/* ═══════════════ SİNİRLER ═══════════════ */

/** Omurilik kanalının [y, z] profili (omurga eğrisinin 1,4 cm arkası). */
const CORD: readonly (readonly [number, number])[] = [
  [1.585, -0.034], [1.53, -0.054], [1.44, -0.079], [1.33, -0.099], [1.2, -0.086], [1.15, -0.076],
];

function cordZ(y: number): number {
  if (y >= CORD[0][0]) return CORD[0][1];
  for (let i = 1; i < CORD.length; i++) {
    if (y >= CORD[i][0]) {
      const t = (y - CORD[i][0]) / (CORD[i - 1][0] - CORD[i][0]);
      return CORD[i][1] + (CORD[i - 1][1] - CORD[i][1]) * t;
    }
  }
  return CORD[CORD.length - 1][1];
}

const AXILLA: Vec3 = [0.185, 1.37, 0.0];

export function createNerves(): NetPath[] {
  const defs: Def[] = [
    /* Omurilik + at kuyruğu (cauda equina) */
    { id: 'spinal-cord', kind: 'nerve', r0: 0.0065, r1: 0.004, pts: CORD.map(([y, z]): Vec3 => [0, y, z]) },
  ];

  for (const [xe, ye] of [[0.01, 0.99], [0.02, 0.96], [0.032, 0.94]] as const) {
    defs.push({
      id: 'spinal-cord', kind: 'nerve', r0: 0.0013, r1: 0.001, mirror: true,
      pts: [[0, 1.15, -0.076], [0.002, 1.08, -0.07], [xe * 0.5, 1.02, -0.07], [xe, ye, -0.068]],
    });
  }

  /* İnterkostal sinirler: omurilikten başlayıp kaburgaları iç yüzden izler */
  for (let l = 0; l < 12; l++) {
    const rp = ribPath(l, 0.01);
    defs.push({
      id: 'spinal-cord', kind: 'nerve', r0: 0.0012, r1: 0.0009, mirror: true,
      pts: [[0, rp[0][1], cordZ(rp[0][1])], ...rp.slice(0, 9)],
    });
  }

  /* Brakiyal pleksus: 5 kök → gövde → kol sinirleri */
  const TRUNK: Vec3 = [0.075, 1.445, -0.002];
  [1.5, 1.48, 1.46, 1.44, 1.42].forEach((y, i) => {
    defs.push({
      id: 'brachial-plexus', kind: 'nerve', r0: 0.0018, r1: 0.0022, mirror: true,
      pts: [[0, y, cordZ(y)], [0.025, y - 0.003, cordZ(y) + 0.025 + i * 0.004], [0.05, 1.45 - i * 0.002, -0.01 + i * 0.002], TRUNK],
    });
  });
  defs.push(
    { id: 'brachial-plexus', kind: 'nerve', r0: 0.0042, r1: 0.0035, mirror: true, pts: [TRUNK, [0.13, 1.41, 0.0], AXILLA] },
    { // median sinir
      id: 'brachial-plexus', kind: 'nerve', r0: 0.0026, r1: 0.0013, mirror: true,
      pts: [AXILLA, [0.21, 1.3, 0.002], [0.235, 1.2, 0.0], [0.25, 1.12, 0.012], [0.275, 1.0, 0.03], [0.29, 0.89, 0.028], [0.31, 0.82, 0.04], [0.325, 0.76, 0.05]],
    },
    { // radyal sinir (humerusun arkasından dolanır)
      id: 'brachial-plexus', kind: 'nerve', r0: 0.0028, r1: 0.0014, mirror: true,
      pts: [[0.185, 1.37, -0.01], [0.21, 1.31, -0.025], [0.24, 1.22, -0.02], [0.262, 1.13, 0.0], [0.285, 1.0, 0.0], [0.3, 0.9, 0.004]],
    },
    { // ulnar sinir
      id: 'brachial-plexus', kind: 'nerve', r0: 0.0025, r1: 0.0013, mirror: true,
      pts: [[0.185, 1.37, -0.005], [0.215, 1.3, -0.012], [0.24, 1.2, -0.015], [0.248, 1.13, -0.022], [0.27, 1.0, -0.005], [0.288, 0.9, 0.006], [0.3, 0.82, 0.02]],
    },
  );

  /* Siyatik sinir → tibial + ortak peroneal dallar */
  defs.push(
    {
      id: 'sciatic-nerve', kind: 'nerve', r0: 0.0065, r1: 0.004, mirror: true,
      pts: [[0.01, 0.96, -0.07], [0.05, 0.93, -0.07], [0.075, 0.9, -0.05], [0.085, 0.85, -0.045], [0.09, 0.74, -0.03], [0.09, 0.62, -0.025], [0.09, 0.54, -0.022]],
    },
    {
      id: 'sciatic-nerve', kind: 'nerve', r0: 0.004, r1: 0.0022, mirror: true,
      pts: [[0.09, 0.54, -0.022], [0.088, 0.46, -0.03], [0.088, 0.3, -0.02], [0.088, 0.12, -0.015], [0.09, 0.06, 0.0], [0.09, 0.03, 0.05]],
    },
    {
      id: 'sciatic-nerve', kind: 'nerve', r0: 0.0032, r1: 0.002, mirror: true,
      pts: [[0.09, 0.54, -0.022], [0.11, 0.5, -0.01], [0.125, 0.46, 0.0], [0.118, 0.35, 0.03], [0.108, 0.2, 0.04], [0.1, 0.1, 0.05]],
    },
  );

  /* Vagus: beyin sapından boyun ve göğüs boyunca mideye (sağ vagus yemek borusunun arkasından) */
  const VAGUS_TOP: Vec3[] = [[0.01, 1.6, -0.03], [0.03, 1.55, -0.005], [0.037, 1.5, 0.0], [0.04, 1.44, 0.008], [0.04, 1.38, 0.0]];
  defs.push({
    id: 'vagus-nerve', kind: 'nerve', r0: 0.0024, r1: 0.0016, mirror: true,
    pts: [...VAGUS_TOP, [0.045, 1.3, -0.03], [0.02, 1.2, -0.025], [0.03, 1.12, 0.01], [0.045, 1.1, 0.03]],
    right: [...mir(VAGUS_TOP), [-0.04, 1.3, -0.03], [-0.01, 1.2, -0.03], [0.03, 1.11, -0.005]],
  });

  return expand(defs);
}
