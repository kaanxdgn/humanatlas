import { lazy, Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei';
import { ACESFilmicToneMapping } from 'three';
import { useAtlasStore, type PerfTier } from '@/store/useAtlasStore';
import { useExtrasStore } from '@/store/useExtrasStore';
import { SECTION_CONFIG } from '@/data/systemsConfig';
import CameraRig from './CameraRig';
import Lighting from './Lighting';
import Effects from './Effects';
import SceneEnvironment from './Environment';
import ClipController from './ClipController';
import SceneExtras from './SceneExtras';

const HumanBody = lazy(() => import('./Body/HumanBody'));

const TIER_DPR: Record<PerfTier, [number, number]> = {
  high: [1, 1.5],
  medium: [1, 1.25],
  low: [0.85, 1],
};

/** İlk karelerden sonra sahnenin hazır olduğunu bildirir (preloader perdesi için). */
function SceneReady() {
  const frames = useRef(0);
  const setSceneReady = useAtlasStore((s) => s.setSceneReady);
  useFrame(() => {
    if (frames.current < 40) {
      frames.current += 1;
      if (frames.current === 40) setSceneReady(true);
    }
  });
  return null;
}

/** Sayfanın arkasında sabit duran tek 3B sahne. */
export default function AtlasCanvas() {
  const tier = useAtlasStore((s) => s.perfTier);
  const degradePerf = useAtlasStore((s) => s.degradePerf);
  const upgradePerf = useAtlasStore((s) => s.upgradePerf);
  const heroCam = SECTION_CONFIG.hero.camera;
  const inside = useExtrasStore((s) => s.interior !== null);

  return (
    <div className="fixed inset-0 z-0" data-atlas-canvas>
      <Canvas
        frameloop={inside ? 'never' : 'always'}
        dpr={TIER_DPR[tier]}
        camera={{ fov: 32, near: 0.05, far: 80, position: heroCam.position }}
        gl={{ antialias: true, powerPreference: 'high-performance', stencil: false }}
        onCreated={({ gl }) => {
          gl.toneMapping = ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
        onPointerMissed={() => {
          // Boş alana tıklama → seçimi kapat
          const s = useAtlasStore.getState();
          if (s.selectedId) s.clearSelection();
        }}
      >
        <color attach="background" args={['#05070D']} />
        {/* FPS düşerse kalite kademesi otomatik azalır, toparlanırsa artar */}
        <PerformanceMonitor
          flipflops={3}
          onDecline={degradePerf}
          onIncline={upgradePerf}
          onFallback={degradePerf}
        />
        <AdaptiveDpr pixelated={false} />

        <Suspense fallback={null}>
          <SceneEnvironment />
          <Lighting />
          <CameraRig />
          <HumanBody />
          <Effects />
          <ClipController />
          <SceneExtras />
        </Suspense>
        <SceneReady />
      </Canvas>
    </div>
  );
}
