import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import gsap from 'gsap';
import { Vector3 } from 'three';
import { useAtlasStore } from '@/store/useAtlasStore';
import { scrollState, DOLLY_RANGE } from '@/utils/scrollState';
import { cameraApi, ZOOM_MAX, ZOOM_MIN } from '@/utils/cameraApi';

const ORIGIN = new Vector3(0, 0.95, 0);

/**
 * Kamera yönetimi:
 *  - store.cameraGoal değişince GSAP ile position + target tween'ler
 *  - OrbitControls: sınırlı zoom, damping, pan kapalı
 *  - scrollState.dolly → hero'daki yaklaşma (delta olarak uygulanır)
 *  - Hero/Genel bölümünde yavaş otomatik yörünge
 */
export default function CameraRig() {
  const controls = useRef<OrbitControlsImpl>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const prevDolly = useRef(0);

  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);

  const goal = useAtlasStore((s) => s.cameraGoal);
  const section = useAtlasStore((s) => s.activeSection);
  const selectedId = useAtlasStore((s) => s.selectedId);
  const freeExplore = useAtlasStore((s) => s.freeExplore);
  const reduced = useAtlasStore((s) => s.reducedMotion);

  /* Kamera uçuşu */
  useEffect(() => {
    const c = controls.current;
    if (!goal || !c) return;

    timeline.current?.kill();

    // Mevcut dolly çarpanıyla ölçekle; dolly sonradan delta olarak uygulanır
    const k = 1 + scrollState.dolly * DOLLY_RANGE;
    const tgt = new Vector3(...goal.target);
    const end = new Vector3(...goal.position).sub(tgt).multiplyScalar(k).add(tgt);
    const dur = reduced ? 0.01 : goal.duration;

    c.enabled = false; // uçuş sırasında kullanıcı sürüklemesi kapalı
    timeline.current = gsap
      .timeline({
        defaults: { duration: dur, ease: 'power3.inOut' },
        onUpdate: () => c.update(),
        onComplete: () => {
          c.enabled = true;
        },
      })
      .to(camera.position, { x: end.x, y: end.y, z: end.z }, 0)
      .to(c.target, { x: tgt.x, y: tgt.y, z: tgt.z }, 0);

    return () => {
      timeline.current?.kill();
      c.enabled = true;
    };
  }, [goal, camera, reduced]);

  /* Yaklaştırma çubuğu için köprü: mesafeyi okur / hedefe doğru ayarlar */
  useEffect(() => {
    cameraApi.getDistance = (): number => camera.position.distanceTo(controls.current?.target ?? ORIGIN);
    cameraApi.setDistance = (d: number): void => {
      const c = controls.current;
      if (!c) return;
      timeline.current?.kill();
      c.enabled = true;
      const dist = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, d));
      const dir = camera.position.clone().sub(c.target);
      if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1);
      camera.position.copy(c.target).add(dir.normalize().multiplyScalar(dist));
      c.update();
    };
  }, [camera]);

  /* Hero dolly: sayfa başında uzaktan başlar, scroll ile yaklaşır */
  useFrame(() => {
    const d = scrollState.dolly;
    if (d === prevDolly.current) return;
    const t = controls.current?.target ?? ORIGIN;
    const k = (1 + d * DOLLY_RANGE) / (1 + prevDolly.current * DOLLY_RANGE);
    camera.position.sub(t).multiplyScalar(k).add(t);
    prevDolly.current = d;
  });

  /* Dokunmatik: dikey kaydırma sayfaya, yatay sürükleme sahneye */
  useEffect(() => {
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const el = gl.domElement;
    const prev = el.style.touchAction;
    const apply = (): void => {
      el.style.touchAction = coarse ? 'pan-y' : 'none';
    };
    apply();
    const raf = requestAnimationFrame(apply);
    return () => {
      cancelAnimationFrame(raf);
      el.style.touchAction = prev;
    };
  }, [gl]);

  const idleOrbit = !selectedId && !freeExplore && !reduced && (section === 'hero' || section === 'skin');

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      target={[0, 0.95, 0]}
      enableDamping
      dampingFactor={0.07}
      enablePan={selectedId !== null}
      // Tekerlek zoom'u yalnızca serbest keşif/seçimde açık; aksi halde sayfa scroll'u bozulmasın
      enableZoom={freeExplore || selectedId !== null}
      zoomSpeed={0.6}
      rotateSpeed={0.6}
      minDistance={0.18}
      maxDistance={11}
      minPolarAngle={0.25}
      maxPolarAngle={Math.PI - 0.35}
      autoRotate={idleOrbit || selectedId !== null}
      autoRotateSpeed={selectedId !== null ? 1.1 : 0.55}
      regress
    />
  );
}
