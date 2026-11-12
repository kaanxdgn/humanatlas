import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { getLenis } from '@/hooks/useLenis';
import { useExtrasStore } from '@/store/useExtrasStore';
import { updateBeat } from './beat';
import { ChapterGeo, smoothstep } from './core';
import Hud, { walk } from './Hud';
import { RealModel } from './RealModel';
import { ORGANS } from './organs';
import { Beams, Cells, Labels, Motes, Openings, Rings, Sphincter, Strands, Studs, Valve, Wall } from './Parts';
import type { OrganDef, Pose } from './types';

const ZERO: Pose = { yaw: 0, pitch: 0, n: 0, b: 0 };

function smoothDamp(cur: number, target: number, vel: { v: number }, smooth: number, dt: number): number {
  const omega = 2 / smooth;
  const x = omega * dt;
  const ex = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = cur - target;
  const temp = (vel.v + omega * change) * dt;
  vel.v = (vel.v - omega * temp) * ex;
  return target + (change + temp) * ex;
}

function Rig({ organ, chapter, geo }: { organ: OrganDef; chapter: number; geo: ChapterGeo }) {
  const { camera, gl } = useThree();
  const light = useRef<THREE.PointLight>(null);
  const ch = geo.ch;

  const track = useMemo(
    () =>
      organ.stops
        .map((s, i) => ({ s, i }))
        .filter((x) => x.s.chapter === chapter)
        .sort((a, b) => a.s.d - b.s.d)
        .map(({ s, i }) => ({ i, d: s.d, pose: { ...ZERO, ...s.pose } as Pose })),
    [organ, chapter],
  );

  const st = useRef({
    d: 0,
    target: 0,
    vel: { v: 0 },
    uy: 0,
    up: 0,
    drag: false,
    lx: 0,
    ly: 0,
    active: -1,
  });

  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__rig = st.current;
    const seek = useExtrasStore.getState().interior!.seek;
    const first = track[0]!;
    const goal = seek.chapter === chapter ? organ.stops[seek.stop]!.d : first.d;
    st.current.target = goal;
    st.current.d = seek.n === 0 ? 0 : Math.max(0, goal - 3);

    const unsub = useExtrasStore.subscribe((s, p) => {
      const sk = s.interior?.seek;
      if (sk && sk !== p.interior?.seek && sk.chapter === chapter) {
        st.current.target = organ.stops[sk.stop]!.d;
        st.current.uy = 0;
        st.current.up = 0;
      }
    });

    const el = gl.domElement;
    const onWheel = (e: WheelEvent): void => {
      e.preventDefault();
      st.current.target = Math.min(geo.length - 0.8, Math.max(0, st.current.target + e.deltaY * 0.012 * (ch.speed ?? 1)));
    };
    const onDown = (e: PointerEvent): void => {
      st.current.drag = true;
      st.current.lx = e.clientX;
      st.current.ly = e.clientY;
      el.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent): void => {
      const s = st.current;
      if (!s.drag) return;
      s.uy = Math.max(-2.6, Math.min(2.6, s.uy + (e.clientX - s.lx) * 0.005));
      s.up = Math.max(-1.2, Math.min(1.2, s.up + (e.clientY - s.ly) * 0.005));
      s.lx = e.clientX;
      s.ly = e.clientY;
    };
    const onUp = (): void => {
      st.current.drag = false;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    return () => {
      unsub();
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
    };
  }, [gl, geo, organ, chapter, track]);

  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const qy = useMemo(() => new THREE.Quaternion(), []);
  const qp = useMemo(() => new THREE.Quaternion(), []);
  const ay = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const ax = useMemo(() => new THREE.Vector3(1, 0, 0), []);
  const fwd = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    updateBeat(dt);
    const s = st.current;
    if (walk.dir !== 0) s.target = Math.min(geo.length - 0.8, Math.max(0, s.target + walk.dir * 2.6 * (ch.speed ?? 1) * dt));
    s.d = smoothDamp(s.d, s.target, s.vel, 0.6, dt);

    // pozu duraklar arasında yumuşakça karıştır
    let pose = track[0]!.pose;
    let a = track[0]!, b = track[0]!;
    for (let k = 0; k < track.length; k++) {
      if (s.d >= track[k]!.d) {
        a = track[k]!;
        b = track[Math.min(track.length - 1, k + 1)]!;
      }
    }
    if (s.d < track[0]!.d) a = b = track[0]!;
    const w = b.d > a.d ? smoothstep((s.d - a.d) / (b.d - a.d)) : 0;
    pose = {
      yaw: a.pose.yaw + (b.pose.yaw - a.pose.yaw) * w,
      pitch: a.pose.pitch + (b.pose.pitch - a.pose.pitch) * w,
      n: a.pose.n + (b.pose.n - a.pose.n) * w,
      b: a.pose.b + (b.pose.b - a.pose.b) * w,
    };

    const f = geo.frameAt(Math.min(s.d, geo.length - 0.3));
    const r = geo.radiusAt(s.d);
    camera.position.copy(f.p).addScaledVector(f.n, pose.n * r).addScaledVector(f.b, pose.b * r);
    m.makeBasis(f.b, f.n, fwd.copy(f.t).multiplyScalar(-1));
    q.setFromRotationMatrix(m);
    qy.setFromAxisAngle(ay, pose.yaw + s.uy);
    qp.setFromAxisAngle(ax, pose.pitch + s.up);
    camera.quaternion.copy(q).multiply(qy).multiply(qp);

    if (light.current) {
      const rr = r / (ch.rScale ?? 1);
      light.current.intensity = ch.light.intensity * Math.min(1.3, Math.max(0.03, rr * rr));
      light.current.position.copy(camera.position);
      light.current.position.addScaledVector(f.t, 0.15);
    }

    // en yakın durağı HUD'a bildir
    let best = track[0]!;
    for (const t of track) if (Math.abs(t.d - s.d) < Math.abs(best.d - s.d)) best = t;
    if (best.i !== s.active) {
      s.active = best.i;
      useExtrasStore.getState().setActiveStop(best.i);
    }
  });

  return <pointLight ref={light} color={ch.light.color} intensity={ch.light.intensity} distance={0} decay={1.6} />;
}

function Scene({ organ, chapter }: { organ: OrganDef; chapter: number }) {
  const ch = organ.chapters[chapter]!;
  const geo = useMemo(() => new ChapterGeo(ch), [ch]);
  const stop = useExtrasStore((s) => s.interior?.stop ?? 0);
  const marks = organ.stops[stop]?.chapter === chapter ? organ.stops[stop]!.marks ?? [] : [];

  return (
    <>
      <color attach="background" args={[ch.fog.color]} />
      <fogExp2 attach="fog" args={[ch.fog.color, ch.fog.density]} />
      <ambientLight intensity={0.22} color={ch.light.color} />
      <hemisphereLight args={[ch.light.color, '#200608', 0.12]} />
      <Rig organ={organ} chapter={chapter} geo={geo} />
      {ch.real ? <RealModel real={ch.real} /> : <Wall geo={geo} glow="#3a1418" />}
      {ch.valves?.map((v, i) => <Valve key={`v${i}`} geo={geo} def={v} />)}
      {ch.studs?.map((s, i) => <Studs key={`s${i}`} geo={geo} def={s} seed={11 + i * 13} />)}
      {ch.rings?.map((r, i) => <Rings key={`r${i}`} geo={geo} def={r} />)}
      {ch.cells?.map((c, i) => <Cells key={`c${i}`} geo={geo} def={c} seed={5 + i * 7} />)}
      <Motes />
      {ch.openings && <Openings geo={geo} defs={ch.openings} />}
      {ch.beams && <Beams geo={geo} defs={ch.beams} />}
      {ch.strands?.map((s, i) => <Strands key={`t${i}`} geo={geo} def={s} seed={21 + i} />)}
      {ch.sphincters?.map((s, i) => <Sphincter key={`p${i}`} geo={geo} def={s} />)}
      <Labels geo={geo} marks={marks} />
      <EffectComposer multisampling={0}>
        <Bloom intensity={0.45} luminanceThreshold={0.7} luminanceSmoothing={0.3} mipmapBlur />
        <Vignette eskil={false} offset={0.2} darkness={0.75} />
      </EffectComposer>
    </>
  );
}

export default function InteriorOverlay() {
  const it = useExtrasStore((s) => s.interior);
  const [veil, setVeil] = useState(true);
  const organKey = it?.organ;

  useEffect(() => {
    const lenis = getLenis();
    lenis?.stop();
    const t = window.setTimeout(() => setVeil(false), 120);
    return () => {
      window.clearTimeout(t);
      lenis?.start();
    };
  }, []);

  if (!it || !organKey) return null;
  const organ = ORGANS[organKey];

  return (
    <div className="fixed inset-0 z-[58] bg-black" role="dialog" aria-modal="true" aria-label={`${organ.nameTR} içi gezinti`}>
      <Canvas
        key={`${organKey}-${it.chapter}`}
        dpr={[1, 1.5]}
        camera={{ fov: 72, near: 0.03, far: 90 }}
        gl={{ antialias: true, powerPreference: 'high-performance', stencil: false }}
        style={{ touchAction: 'none' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.0;
        }}
      >
        <Scene organ={organ} chapter={it.chapter} />
      </Canvas>
      <Hud organ={organ} />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[70] bg-black transition-opacity duration-[900ms]"
        style={{ opacity: veil ? 1 : 0 }}
      />
    </div>
  );
}
