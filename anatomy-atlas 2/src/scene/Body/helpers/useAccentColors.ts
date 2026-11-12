import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color } from 'three';
import { useAtlasStore } from '@/store/useAtlasStore';

/**
 * Store'daki accent renklerine yumuşakça yaklaşan (lerp) Color nesneleri döndürür.
 * Re-render üretmez; ışık, shader ve materyaller bunları her karede okuyabilir.
 */
export function useAccentColors(): { accent: Color; accent2: Color } {
  const accent = useMemo(() => new Color('#8AB4FF'), []);
  const accent2 = useMemo(() => new Color('#C7D8FF'), []);
  const t1 = useMemo(() => new Color(), []);
  const t2 = useMemo(() => new Color(), []);

  useFrame((_, dt) => {
    const s = useAtlasStore.getState();
    t1.set(s.accent);
    t2.set(s.accent2);
    const k = 1 - Math.exp(-3 * dt);
    accent.lerp(t1, k);
    accent2.lerp(t2, k);
  });

  return { accent, accent2 };
}
