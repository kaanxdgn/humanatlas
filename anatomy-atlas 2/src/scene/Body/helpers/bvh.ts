import type { Mesh } from 'three';
import { acceleratedRaycast, computeBoundsTree } from 'three-mesh-bvh';

/**
 * Yüz binlerce üçgenli GLB mesh'lerinde fare raycast'ini hızlandırır (three-mesh-bvh).
 * Geometri paylaşıldığında (clone) ağaç yalnızca bir kez kurulur.
 */
export function accelerateRaycast(mesh: Mesh): void {
  const geo = mesh.geometry as Mesh['geometry'] & { boundsTree?: unknown };
  if (!geo.boundsTree) {
    (computeBoundsTree as unknown as (this: unknown, o: { maxLeafTris: number }) => void).call(geo, { maxLeafTris: 14 });
  }
  mesh.raycast = acceleratedRaycast as unknown as Mesh['raycast'];
}
