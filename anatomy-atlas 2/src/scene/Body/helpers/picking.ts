import type { ThreeEvent } from '@react-three/fiber';
import type { Object3D } from 'three';
import type { LayerKey } from '@/data/systemsConfig';

/** Mesh'lerin userData'sında beklenen alanlar. */
export interface PickUserData {
  /** Tekil mesh için anatomi id'si */
  anatomyId?: string;
  /** InstancedMesh için: instanceId → anatomi id'si */
  instanceIds?: readonly string[];
  /** Katman grubunun anahtarı (LayerGate koyar) */
  layer?: LayerKey;
}

export interface PickResult {
  id: string;
  layer: LayerKey;
}

/**
 * Raycast olayından anatomi id'sini ve ait olduğu katmanı çıkarır.
 * Nesne zincirini yukarı doğru gezer; ilk bulunan id kazanır.
 */
export function resolvePick(e: ThreeEvent<MouseEvent>): PickResult | null {
  let id: string | null = null;
  let layer: LayerKey | null = null;
  let obj: Object3D | null = e.object;

  while (obj) {
    const ud = obj.userData as PickUserData;
    if (id === null) {
      if (ud.instanceIds && e.instanceId !== undefined) {
        id = ud.instanceIds[e.instanceId] ?? null;
      } else if (ud.anatomyId) {
        id = ud.anatomyId;
      }
    }
    if (ud.layer) {
      layer = ud.layer;
      break;
    }
    obj = obj.parent;
  }

  return id !== null && layer !== null ? { id, layer } : null;
}
