import { useEffect } from 'react';
import { addAfterEffect, useFrame, useThree } from '@react-three/fiber';
import { Vector2 } from 'three';
import { useExtrasStore } from '@/store/useExtrasStore';
import { tickVitals } from './Body/helpers/heartbeat';
import { lensUniforms } from './shaders/dissolve';

const size = new Vector2();

/** Sahne içi yardımcılar: yaşamsal değer saati, X-ray mercek konumu ve ekran görüntüsü. */
export default function SceneExtras() {
  const gl = useThree((s) => s.gl);

  useFrame((state, dt) => {
    const ex = useExtrasStore.getState();
    tickVitals(Math.min(dt, 0.1), ex.effort);
    const L = lensUniforms.uLens.value;
    L.w = ex.lens ? 1 : 0;
    if (ex.lens) {
      L.x = (state.pointer.x + 1) / 2;
      L.y = (state.pointer.y + 1) / 2;
      gl.getDrawingBufferSize(size);
      lensUniforms.uLensRes.value.copy(size);
    }
  });

  // Ekran görüntüsü: render bittikten hemen sonra tuvalden okunur (preserveDrawingBuffer gerekmez)
  useEffect(() => {
    let last = useExtrasStore.getState().shot;
    const off = addAfterEffect(() => {
      const cur = useExtrasStore.getState().shot;
      if (cur === last) return;
      last = cur;
      gl.domElement.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'anatomi-atlasi.png';
        a.click();
        window.setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      }, 'image/png');
    });
    return off;
  }, [gl]);

  return null;
}
