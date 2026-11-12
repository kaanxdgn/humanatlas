import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { beat, phaseOpen } from './beat';
import { buildTubeGeometry, getWallTexture, mulberry32, type ChapterGeo } from './core';
import type { BeamDef, CellDef, OpeningDef, RingDef, SphincterDef, StrandDef, StudDef, ValveDef, Mark } from './types';

const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
const dummy = new THREE.Object3D();
const q = new THREE.Quaternion();
const v1 = new THREE.Vector3();
const v2 = new THREE.Vector3();
const v3 = new THREE.Vector3();
const col = new THREE.Color();

/* ───────── Duvar (lümen) ───────── */

export function Wall({ geo, glow }: { geo: ChapterGeo; glow: string }) {
  const g = useMemo(() => buildTubeGeometry(geo), [geo]);
  const tex = useMemo(() => getWallTexture(), []);
  const mat = useRef<THREE.MeshPhysicalMaterial>(null);
  useEffect(() => () => g.dispose(), [g]);
  useFrame(() => {
    if (!mat.current) return;
    const p = geo.ch.pulse === 'heart' ? beat.pulse : geo.ch.pulse === 'breath' ? (beat.breath + 1) * 0.5 * 0.6 : 0;
    mat.current.emissiveIntensity = 0.14 + p * 0.22;
  });
  return (
    <mesh geometry={g}>
      <meshPhysicalMaterial
        ref={mat}
        vertexColors
        roughness={0.6}
        metalness={0}
        clearcoat={0.3}
        clearcoatRoughness={0.32}
        bumpMap={tex}
        bumpScale={2.4}
        emissive={glow}
        emissiveIntensity={0.14}
      />
    </mesh>
  );
}

/* ───────── Kapaklar (yaprakçıklar kalp atışıyla açılıp kapanır) ───────── */

const NA = 10;
const NS = 8;

export function Valve({ geo, def }: { geo: ChapterGeo; def: ValveDef }) {
  const frame = useMemo(() => geo.frameAt(def.d, { p: new THREE.Vector3(), t: new THREE.Vector3(), n: new THREE.Vector3(), b: new THREE.Vector3() }), [geo, def.d]);
  const R = useMemo(() => geo.radiusAt(def.d) * (def.rk ?? 1), [geo, def]);
  const state = useRef({ open: 0, drawn: -1 });
  const n = def.leaflets;

  const { g, chord, cones } = useMemo(() => {
    const per = (NA + 1) * (NS + 1);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(per * n * 3), 3));
    const idx: number[] = [];
    for (let l = 0; l < n; l++) {
      for (let s = 0; s < NS; s++) {
        for (let a = 0; a < NA; a++) {
          const i0 = l * per + s * (NA + 1) + a;
          idx.push(i0, i0 + 1, i0 + NA + 1, i0 + 1, i0 + NA + 2, i0 + NA + 1);
        }
      }
    }
    g.setIndex(idx);
    const rnd = mulberry32(def.d * 1000 + 7);
    const chord: { li: number; a: number; pap: THREE.Vector3 }[] = [];
    const cones: { pos: THREE.Vector3; dir: THREE.Vector3; len: number }[] = [];
    if (def.chordae) {
      const c = def.chordae;
      c.toward.forEach((w) => {
        const ang = geo.angleOf({ d: c.papD, toward: w });
        const base = geo.wallPoint(c.papD, ang, 0.05);
        const dir = geo.inward(c.papD, ang);
        cones.push({ pos: base, dir, len: c.len });
      });
      for (let i = 0; i < c.count; i++) {
        const cone = cones[i % cones.length]!;
        chord.push({
          li: i % n,
          a: (rnd() - 0.5) * 1.3,
          pap: cone.pos.clone().addScaledVector(cone.dir, cone.len * 0.95),
        });
      }
    }
    return { g, chord, cones };
  }, [geo, def, n]);

  const leafPt = (li: number, a: number, s: number, o: number, out: THREE.Vector3): THREE.Vector3 => {
    const w = (Math.PI * 2) / n;
    const th = li * w + 0.4 + a * w * 0.5 * 0.97;
    const f = def.flow;
    let rho: number, ax: number;
    if (def.kind === 'semilunar') {
      const rc = 1 - s * 0.97;
      const ro = 1 - s * 0.16;
      const axc = 0.5 * s * (1 - 0.45 * (1 - s) * a * a);
      const axo = 0.95 * s;
      rho = rc + (ro - rc) * o;
      ax = axc + (axo - axc) * o;
    } else {
      const rc = 1 - s * 0.97;
      const ro = 1 - s * 0.34;
      const axc = -0.1 * s * (1 - 0.5 * a * a) + 0.12 * Math.sin(s * Math.PI) * (1 - a * a);
      const axo = 1.15 * s;
      rho = rc + (ro - rc) * o;
      ax = axc + (axo - axc) * o;
    }
    rho *= R * 0.99;
    return out
      .copy(frame.p)
      .addScaledVector(frame.n, Math.cos(th) * rho)
      .addScaledVector(frame.b, Math.sin(th) * rho)
      .addScaledVector(frame.t, f * ax * R);
  };

  const chordMesh = useRef<THREE.InstancedMesh>(null);

  const rebuild = (o: number): void => {
    const p = g.getAttribute('position') as THREE.BufferAttribute;
    let k = 0;
    for (let l = 0; l < n; l++) {
      for (let s = 0; s <= NS; s++) {
        for (let a = 0; a <= NA; a++) {
          leafPt(l, (a / NA) * 2 - 1, s / NS, o, v1);
          p.setXYZ(k++, v1.x, v1.y, v1.z);
        }
      }
    }
    p.needsUpdate = true;
    g.computeVertexNormals();
    g.computeBoundingSphere();
    const m = chordMesh.current;
    if (m) {
      chord.forEach((c, i) => {
        leafPt(c.li, c.a, 0.93, o, v1);
        v2.copy(c.pap);
        v3.subVectors(v1, v2);
        const len = v3.length();
        dummy.position.copy(v2).addScaledVector(v3, 0.5);
        dummy.quaternion.setFromUnitVectors(Y, v3.normalize());
        dummy.scale.set(1, len, 1);
        dummy.updateMatrix();
        m.setMatrixAt(i, dummy.matrix);
      });
      m.instanceMatrix.needsUpdate = true;
    }
  };

  useFrame((_, dt) => {
    const s = state.current;
    const target = phaseOpen(def.phase);
    s.open += (target - s.open) * (1 - Math.exp(-dt * 14));
    if (Math.abs(s.open - s.drawn) > 0.004) {
      rebuild(s.open);
      s.drawn = s.open;
    }
  });

  return (
    <group>
      <mesh geometry={g}>
        <meshPhysicalMaterial
          color={def.color ?? '#e7c7bd'}
          side={THREE.DoubleSide}
          roughness={0.38}
          clearcoat={0.25}
          clearcoatRoughness={0.25}
          emissive="#3b1215"
          emissiveIntensity={0.2}
        />
      </mesh>
      {cones.map((c, i) => (
        <mesh
          key={i}
          position={c.pos.clone().addScaledVector(c.dir, c.len * 0.5)}
          quaternion={new THREE.Quaternion().setFromUnitVectors(Y, c.dir.clone().multiplyScalar(-1))}
        >
          <coneGeometry args={[c.len * 0.3, c.len, 10]} />
          <meshStandardMaterial color="#6b2a2a" roughness={0.55} />
        </mesh>
      ))}
      {chord.length > 0 && (
        <instancedMesh ref={chordMesh} args={[undefined, undefined, chord.length]} frustumCulled={false}>
          <cylinderGeometry args={[0.011, 0.011, 1, 5]} />
          <meshStandardMaterial color="#efe3d6" roughness={0.5} emissive="#4a3d34" emissiveIntensity={0.5} />
        </instancedMesh>
      )}
    </group>
  );
}

/* ───────── Küçük yapılar: papilla, kıvrım, kirpik, villus ───────── */

export function Studs({ geo, def, seed }: { geo: ChapterGeo; def: StudDef; seed: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(() => {
    const rnd = mulberry32(seed);
    return Array.from({ length: def.count }, () => {
      const d = def.d0 + rnd() * (def.d1 - def.d0);
      const a = (def.angMin ?? 0) + rnd() * ((def.angMax ?? Math.PI * 2) - (def.angMin ?? 0));
      const sc = 0.7 + rnd() * 0.6;
      return { d, a, sc, ph: rnd() * 6.28, tw: rnd() * 6.28 };
    });
  }, [geo, def, seed]);

  const geom = useMemo(() => {
    if (def.shape === 'cone' || def.shape === 'hair') {
      const g = new THREE.ConeGeometry(1, 1, def.shape === 'hair' ? 5 : 8);
      g.translate(0, 0.5, 0);
      return g;
    }
    if (def.shape === 'finger') {
      const g = new THREE.SphereGeometry(1, 8, 6);
      g.translate(0, 1, 0);
      g.scale(1, 0.5, 1);
      return g;
    }
    return new THREE.SphereGeometry(1, 8, 6);
  }, [def.shape]);

  const place = (t: number): void => {
    const m = ref.current;
    if (!m) return;
    const [w, l] = def.size;
    data.forEach((s, i) => {
      const f = geo.frameAt(s.d);
      const wp = geo.wallPoint(s.d, s.a, def.shape === 'sphere' ? w * s.sc * 0.35 : def.shape === 'ridge' ? w * 0.3 : 0.02, v1);
      const inw = geo.inward(s.d, s.a, v2);
      if (def.shape === 'ridge') q.setFromUnitVectors(Y, f.t);
      else q.setFromUnitVectors(Y, inw);
      if (def.sway) {
        const sw = Math.sin(t * 2.6 + s.ph) * 0.38;
        v3.copy(f.t).multiplyScalar(sw);
        const tilted = inw.clone().add(v3).normalize();
        q.setFromUnitVectors(Y, tilted);
      }
      dummy.position.copy(wp);
      dummy.quaternion.copy(q);
      if (def.shape === 'sphere') dummy.scale.setScalar(w * s.sc);
      else if (def.shape === 'ridge') dummy.scale.set(w * s.sc, l * s.sc, w * s.sc);
      else dummy.scale.set(w * s.sc, l * s.sc, w * s.sc);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  };

  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const base = new THREE.Color(def.color);
    const rnd = mulberry32(seed + 3);
    data.forEach((_, i) => {
      const k = 1 - (def.colorVar ?? 0.2) * rnd();
      m.setColorAt(i, col.copy(base).multiplyScalar(k));
    });
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    place(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, def]);

  useFrame(({ clock }) => {
    if (def.sway) place(clock.elapsedTime);
  });

  return (
    <instancedMesh ref={ref} args={[geom, undefined, def.count]} frustumCulled={false}>
      <meshStandardMaterial roughness={0.45} emissive={def.color} emissiveIntensity={0.08} />
    </instancedMesh>
  );
}

/* ───────── Kıkırdak halkaları ───────── */

export function Rings({ geo, def }: { geo: ChapterGeo; def: RingDef }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const mat = new THREE.Matrix4();
    const rz = new THREE.Matrix4();
    def.ds.forEach((d, i) => {
      const f = geo.frameAt(d);
      // torus yerelinde X→n, Y→b, Z→t (n×b = t)
      mat.makeBasis(f.n, f.b, f.t);
      const th0 = def.gap - Math.PI - def.arc / 2;
      rz.makeRotationZ(th0);
      mat.multiply(rz);
      const r = geo.radiusAt(d) * (def.k ?? 0.985);
      mat.scale(v1.set(r, r, r));
      mat.setPosition(f.p);
      m.setMatrixAt(i, mat);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [geo, def]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, def.ds.length]} frustumCulled={false}>
      <torusGeometry args={[1, def.tube, 8, 36, def.arc]} />
      <meshStandardMaterial color={def.color} roughness={0.35} emissive={def.color} emissiveIntensity={0.1} />
    </instancedMesh>
  );
}

/* ───────── Kan hücresi / hava / asit parçacıkları ───────── */

let rbc: THREE.LatheGeometry | null = null;
/** Çukurlu (bikonkav) disk: gerçek alyuvar profili, yarıçap 1. */
function rbcGeometry(): THREE.LatheGeometry {
  if (rbc) return rbc;
  const top: [number, number][] = [[0, 0.1], [0.18, 0.13], [0.38, 0.26], [0.6, 0.36], [0.8, 0.33], [0.93, 0.22], [1, 0.1]];
  const pts = [...top.map(([r, y]) => new THREE.Vector2(r, y)), new THREE.Vector2(0.995, 0), ...[...top].reverse().map(([r, y]) => new THREE.Vector2(r, -y))];
  rbc = new THREE.LatheGeometry(pts, 18);
  rbc.computeVertexNormals();
  return rbc;
}

/** Kameranın çevresinde süzülen çok küçük parçacıklar (mukus, hücre kalıntısı, sıvı içindeki asılı maddeler). */
export function Motes({ color = '#ffd2c0', count = 160 }: { color?: string; count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const { camera } = useThree();
  const { geo, seeds } = useMemo(() => {
    const rnd = mulberry32(77);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3).fill(1), 3));
    return { geo: g, seeds: Array.from({ length: count }, () => [rnd(), rnd(), rnd(), rnd() * 6.28] as const) };
  }, [count]);
  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    m.position.copy(camera.position);
    const t = beat.t;
    const arr = geo.attributes.position as THREE.BufferAttribute;
    const S = 14;
    const col = geo.attributes.color as THREE.BufferAttribute;
    seeds.forEach(([a, b, c, w], i) => {
      const x = ((a * S + t * 0.35 + Math.sin(t * 0.5 + w) * 0.6) % S) - S / 2;
      const y = ((b * S + Math.sin(t * 0.3 + w) * 0.8) % S) - S / 2;
      const z = ((c * S + t * 0.2) % S) - S / 2;
      arr.setXYZ(i, x, y, z);
      // Kameraya çok yakın parçacıklar sönük: büyük parlak lekeler oluşmasın
      const k = THREE.MathUtils.smoothstep(Math.hypot(x, y, z), 2, 5);
      col.setXYZ(i, k, k, k);
    });
    arr.needsUpdate = true;
    col.needsUpdate = true;
  });
  return (
    <points ref={ref} geometry={geo} frustumCulled={false}>
      <pointsMaterial color={color} vertexColors size={0.07} sizeAttenuation transparent opacity={0.45} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

export function Cells({ geo, def, seed }: { geo: ChapterGeo; def: CellDef; seed: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(() => {
    const rnd = mulberry32(seed);
    return Array.from({ length: def.count }, () => ({
      ph: rnd(),
      a: rnd() * Math.PI * 2,
      rho: Math.sqrt(rnd()) * (def.spread ?? 0.8),
      qx: rnd() * 6.28,
      qy: rnd() * 6.28,
      sc: 0.7 + rnd() * 0.6,
      w: rnd() * 6.28,
    }));
  }, [def, seed]);

  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    const span = def.d1 - def.d0;
    const t = beat.t;
    data.forEach((c, i) => {
      let f: number;
      if (def.mode === 'flow') f = (c.ph + (def.flow ?? 1) * def.speed * t * 0.1) % 1;
      else f = (c.ph + beat.breath * def.speed * 0.5 + Math.sin(t * 0.7 + c.w) * 0.01 + 8) % 1;
      if (f < 0) f += 1;
      const d = def.d0 + f * span;
      const fr = geo.frameAt(d);
      const R = geo.radiusAt(d) * c.rho;
      const a = c.a + Math.sin(t * 0.6 + c.w) * 0.2;
      v1.copy(fr.p).addScaledVector(fr.n, Math.cos(a) * R).addScaledVector(fr.b, Math.sin(a) * R);
      dummy.position.copy(v1);
      dummy.rotation.set(c.qx + t * 0.6, c.qy + t * 0.4, 0);
      const sz = def.size * c.sc * (0.3 + 0.7 * Math.min(1, geo.radiusAt(d)));
      if (def.mode === 'flow') dummy.scale.setScalar(sz * 0.8);
      else dummy.scale.set(sz, sz * 0.42, sz);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, def.count]} frustumCulled={false}>
      {def.mode === 'flow' ? <primitive object={rbcGeometry()} attach="geometry" /> : <sphereGeometry args={[1, 10, 8]} />}
      <meshStandardMaterial
        color={def.color}
        roughness={0.35}
        emissive={def.color}
        emissiveIntensity={def.glow ?? 0.35}
        transparent={def.mode === 'breath'}
        opacity={def.mode === 'breath' ? 0.75 : 1}
      />
    </instancedMesh>
  );
}

/* ───────── Duvardaki ağızlar (ostium, dal girişi) ───────── */

export function Openings({ geo, defs }: { geo: ChapterGeo; defs: OpeningDef[] }) {
  const items = useMemo(
    () =>
      defs.map((o) => {
        const a = geo.angleOf(o);
        const pos = geo.wallPoint(o.d, a, 0.015);
        const inw = geo.inward(o.d, a);
        const quat = new THREE.Quaternion().setFromUnitVectors(Z, inw);
        return { o, pos, quat };
      }),
    [geo, defs],
  );
  return (
    <>
      {items.map(({ o, pos, quat }, i) => (
        <group key={i} position={pos} quaternion={quat}>
          <mesh>
            <circleGeometry args={[o.r, 28]} />
            <meshBasicMaterial color={o.color ?? '#060102'} />
          </mesh>
          <mesh position={[0, 0, 0.004]}>
            <torusGeometry args={[o.r, o.r * 0.16, 8, 32]} />
            <meshStandardMaterial color={o.rim ?? '#b86a66'} roughness={0.4} emissive={o.rim ?? '#b86a66'} emissiveIntensity={0.12} />
          </mesh>
        </group>
      ))}
    </>
  );
}

/* ───────── Kirişler (moderatör bant gibi lümeni geçen kaslar) ───────── */

export function Beams({ geo, defs }: { geo: ChapterGeo; defs: BeamDef[] }) {
  const items = useMemo(
    () =>
      defs.map((b) => {
        const A = geo.wallPoint(b.a.d, geo.angleOf(b.a), 0.1);
        const B = geo.wallPoint(b.b.d, geo.angleOf(b.b), 0.1);
        const dir = B.clone().sub(A);
        const len = dir.length();
        return {
          b,
          pos: A.clone().addScaledVector(dir, 0.5),
          quat: new THREE.Quaternion().setFromUnitVectors(Y, dir.normalize()),
          len,
        };
      }),
    [geo, defs],
  );
  return (
    <>
      {items.map((it, i) => (
        <mesh key={i} position={it.pos} quaternion={it.quat}>
          <cylinderGeometry args={[it.b.r, it.b.r * 1.15, it.len, 10]} />
          <meshStandardMaterial color={it.b.color} roughness={0.5} emissive={it.b.color} emissiveIntensity={0.1} />
        </mesh>
      ))}
    </>
  );
}

/* ───────── Kılcal damar ağı (alveol duvarında) ───────── */

export function Strands({ geo, def, seed }: { geo: ChapterGeo; def: StrandDef; seed: number }) {
  const curves = useMemo(() => {
    const rnd = mulberry32(seed);
    return Array.from({ length: def.count }, () => {
      let d = def.d0 + rnd() * (def.d1 - def.d0);
      let a = rnd() * Math.PI * 2;
      const pts: THREE.Vector3[] = [];
      const ad = (rnd() - 0.5) * 1.2;
      const aa = (rnd() - 0.5) * 1.6;
      for (let i = 0; i < 9; i++) {
        pts.push(geo.wallPoint(Math.min(def.d1, Math.max(def.d0, d)), a, 0.012));
        d += ad * 0.5 + (rnd() - 0.5) * 0.3;
        a += aa * 0.5 + (rnd() - 0.5) * 0.4;
      }
      return new THREE.CatmullRomCurve3(pts);
    });
  }, [geo, def, seed]);
  return (
    <>
      {curves.map((c, i) => (
        <mesh key={i}>
          <tubeGeometry args={[c, 24, def.r, 6, false]} />
          <meshStandardMaterial color={def.color} roughness={0.4} emissive={def.color} emissiveIntensity={0.3} />
        </mesh>
      ))}
    </>
  );
}

/* ───────── Sfinkterler (alt özofagus, pilor) ───────── */

export function Sphincter({ geo, def }: { geo: ChapterGeo; def: SphincterDef }) {
  const ref = useRef<THREE.Mesh>(null);
  const R = geo.radiusAt(def.d);
  const f = useMemo(() => geo.frameAt(def.d, { p: new THREE.Vector3(), t: new THREE.Vector3(), n: new THREE.Vector3(), b: new THREE.Vector3() }), [geo, def.d]);
  const quat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(Z, f.t), [f]);
  const k = useRef(1);
  useFrame((_, dt) => {
    const target = phaseOpen(def.phase) > 0.5 ? 1 : def.closedK ?? 0.62;
    k.current += (target - k.current) * (1 - Math.exp(-dt * 4));
    ref.current?.scale.set(k.current, k.current, 1);
  });
  return (
    <mesh ref={ref} position={f.p} quaternion={quat}>
      <torusGeometry args={[R * 1.12, def.tube, 12, 40]} />
      <meshStandardMaterial color={def.color} roughness={0.4} emissive={def.color} emissiveIntensity={0.12} />
    </mesh>
  );
}

/* ───────── Etiketler ───────── */

export function Labels({ geo, marks }: { geo: ChapterGeo; marks: Mark[] }) {
  const pts = useMemo(
    () =>
      marks.map((m) => {
        if (m.at) return { m, p: new THREE.Vector3(...m.at) };
        const a = geo.angleOf(m);
        return { m, p: geo.wallPoint(m.d, a, geo.radiusAt(m.d) * 0.12) };
      }),
    [geo, marks],
  );
  return (
    <>
      {pts.map(({ m, p }, i) => (
        <Html key={`${m.text}${i}`} position={p} center zIndexRange={[56, 50]} style={{ pointerEvents: 'none' }}>
          <div className="int-label">
            <span className="int-dot" />
            <span className="int-text">{m.text}</span>
          </div>
        </Html>
      ))}
    </>
  );
}
