import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import type { DirectionalLight, PointLight } from 'three';
import { useAccentColors } from './Body/helpers/useAccentColors';

/**
 * Stüdyo tarzı ışıklandırma:
 *  - Soğuk ambient + hemisfer
 *  - Beyaz ana ışık, arkadan accent renkli rim ışıkları (sistem rengine uyar)
 *  - Harici HDR gerektirmeyen prosedürel Environment (cam/transmission için yansıma)
 */
export default function Lighting() {
  const { accent, accent2 } = useAccentColors();
  const rimA = useRef<DirectionalLight>(null);
  const rimB = useRef<PointLight>(null);
  const fill = useRef<PointLight>(null);

  useFrame(() => {
    rimA.current?.color.copy(accent);
    rimB.current?.color.copy(accent2);
    fill.current?.color.copy(accent);
  });

  return (
    <>
      <ambientLight intensity={0.3} color="#9bb4ff" />
      <hemisphereLight args={['#bcd0ff', '#1a1020', 0.4]} />
      <directionalLight position={[3, 5, 4]} intensity={1.5} color="#ffffff" />
      <directionalLight ref={rimA} position={[-4, 2.5, -3]} intensity={2.4} />
      <pointLight ref={rimB} position={[3, 0.6, -2.5]} intensity={7} distance={12} decay={2} />
      <pointLight ref={fill} position={[0, 1.2, 2.4]} intensity={1.6} distance={8} decay={2} />

      {/* Prosedürel ortam haritası — ağ isteği yok */}
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.2} position={[0, 5, -5]} scale={[10, 2, 1]} color="#dfe8ff" />
        <Lightformer form="rect" intensity={1.4} position={[-5, 1, 2]} scale={[2, 6, 1]} color="#8ab4ff" />
        <Lightformer form="rect" intensity={1.2} position={[5, 1, 2]} scale={[2, 6, 1]} color="#ffffff" />
        <Lightformer form="ring" intensity={1.0} position={[0, 0.5, 6]} scale={4} color="#b8c8ff" />
      </Environment>
    </>
  );
}
