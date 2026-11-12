import { useCallback } from 'react';
import { useAtlasStore } from '@/store/useAtlasStore';
import { SECTION_CONFIG, type Vec3 } from '@/data/systemsConfig';

/**
 * UI bileşenlerinin kamerayı yönetmesi için ince bir arayüz.
 * (Gerçek tween CameraRig.tsx içinde, store'daki cameraGoal üzerinden yapılır.)
 */
export function useCameraRig() {
  const flyToStore = useAtlasStore((s) => s.flyTo);
  const selectStructure = useAtlasStore((s) => s.selectStructure);
  const clearSelection = useAtlasStore((s) => s.clearSelection);

  const flyTo = useCallback(
    (position: Vec3, target: Vec3, duration = 1.4) => flyToStore(position, target, duration),
    [flyToStore],
  );

  /** Aktif bölümün varsayılan kamera açısına dön. */
  const flyHome = useCallback(() => {
    const cam = SECTION_CONFIG[useAtlasStore.getState().activeSection].camera;
    flyToStore(cam.position, cam.target, 1.4);
  }, [flyToStore]);

  /** Bir yapıya odaklan (bilgi paneli de açılır). */
  const focusStructure = useCallback((id: string) => selectStructure(id), [selectStructure]);

  return { flyTo, flyHome, focusStructure, resetSelection: clearSelection };
}
