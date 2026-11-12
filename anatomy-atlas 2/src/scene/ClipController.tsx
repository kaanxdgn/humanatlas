import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Plane, Vector3 } from 'three';
import { useExtrasStore } from '@/store/useExtrasStore';

/** Beden sınırları (m): y 0..1.8, x ±0.45, z ±0.28 */
const RANGE = { y: [0.02, 1.78], x: [-0.45, 0.45], z: [-0.28, 0.28] } as const;

/** Kesit kaydırıcısı: seçilen eksende bedeni keser (tüm malzemelere global clipping plane). */
export default function ClipController() {
  const gl = useThree((s) => s.gl);
  const plane = useMemo(() => new Plane(new Vector3(0, -1, 0), 1), []);

  useEffect(() => {
    gl.localClippingEnabled = true;
    return () => {
      gl.clippingPlanes = [];
    };
  }, [gl]);

  useFrame(() => {
    const { on, axis, pos } = useExtrasStore.getState().cut;
    if (!on) {
      if (gl.clippingPlanes.length) gl.clippingPlanes = [];
      return;
    }
    const [lo, hi] = RANGE[axis];
    const v = lo + (hi - lo) * pos;
    // Ön (z) ve yan (x) kesitlerde gözlemciye yakın yarı atılır
    if (axis === 'y') plane.set(new Vector3(0, -1, 0), v);
    else if (axis === 'x') plane.set(new Vector3(-1, 0, 0), v);
    else plane.set(new Vector3(0, 0, -1), v);
    if (gl.clippingPlanes[0] !== plane) gl.clippingPlanes = [plane];
  });
  return null;
}
