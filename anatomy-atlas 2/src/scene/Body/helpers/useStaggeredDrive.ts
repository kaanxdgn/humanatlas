import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { clamp } from '@/utils/math';
import type { LayerDrive } from './useAnatomyVisual';

/**
 * Katman sürücüsünden, her öğe için gecikmeli birer türev sürücü üretir.
 * delay ∈ [0, 1 - window]: öğe, katman reveal'ı delay'e ulaşınca belirmeye başlar
 * ve `window` genişliğinde bir aralıkta tamamlanır (sırayla belirme efekti).
 */
export function useStaggeredDrives(drive: LayerDrive, delays: readonly number[], window = 0.5): LayerDrive[] {
  const key = delays.join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const list = useMemo<LayerDrive[]>(
    () => delays.map(() => ({ rawReveal: 0, reveal: 0, opacity: 0, edge: drive.edge })),
    [drive, key],
  );

  useFrame(() => {
    for (let i = 0; i < list.length; i++) {
      const d = list[i];
      d.opacity = drive.opacity;
      d.rawReveal = drive.rawReveal;
      d.reveal = clamp((drive.reveal - delays[i]) / window, 0, 1);
    }
  });

  return list;
}
