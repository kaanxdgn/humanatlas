import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Bloom, DepthOfField, EffectComposer, Vignette } from '@react-three/postprocessing';
import { Vector3 } from 'three';
import { getAnatomyItem } from '@/data/anatomyData';
import { useAtlasStore } from '@/store/useAtlasStore';

const focus = new Vector3();

/** Seçili yapı netken arka plan/önplan hafifçe bulanıklaşır (sinematik odak). */
function Focus() {
  const selectedId = useAtlasStore((s) => s.selectedId);
  const ref = useRef<{ bokehScale: number; target: Vector3 | null } | null>(null);
  const amount = useRef(0);

  useEffect(() => {
    const it = selectedId ? getAnatomyItem(selectedId) : undefined;
    if (it) focus.set(...it.cameraTarget);
  }, [selectedId]);

  useFrame((_, dt) => {
    const e = ref.current;
    if (!e) return;
    amount.current += ((selectedId ? 1 : 0) - amount.current) * Math.min(1, dt * 3);
    e.bokehScale = amount.current * 2.6;
  });

  return (
    <DepthOfField
      ref={ref as never}
      target={focus as never}
      focalLength={0.07}
      bokehScale={0}
      height={360}
    />
  );
}

/**
 * Postprocessing kademeleri:
 *  - high   : Bloom + Vignette + odak bulanıklığı (2x MSAA)
 *  - medium : Bloom + Vignette
 *  - low    : composer yok (CSS vignette/grain devrede)
 */
export default function Effects() {
  const tier = useAtlasStore((s) => s.perfTier);

  if (tier === 'low') return null;

  if (tier === 'high') {
    return (
      <EffectComposer multisampling={2}>
        <Focus />
        <Bloom intensity={0.7} luminanceThreshold={0.4} luminanceSmoothing={0.2} mipmapBlur radius={0.65} />
        <Vignette eskil={false} offset={0.25} darkness={0.85} />
      </EffectComposer>
    );
  }

  return (
    <EffectComposer multisampling={0}>
      <Bloom intensity={0.6} luminanceThreshold={0.4} luminanceSmoothing={0.2} mipmapBlur radius={0.6} />
      <Vignette eskil={false} offset={0.25} darkness={0.8} />
    </EffectComposer>
  );
}
