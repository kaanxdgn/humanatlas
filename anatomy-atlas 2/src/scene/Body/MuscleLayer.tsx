import { useEffect, useMemo } from 'react';
import AnatomyMesh from './helpers/AnatomyMesh';
import LayerSource from './helpers/LayerSource';
import { createMuscles } from './helpers/createMuscle';
import { useLayerDrive, type LayerDrive } from './helpers/useAnatomyVisual';

/** Komşu kaslar birbirinden ayırt edilsin diye hafif ton farkları */
const TONES = ['#b5322c', '#c4433a', '#a62b30', '#cf5645'] as const;

function ProceduralMuscles({ drive }: { drive: LayerDrive }) {
  const muscles = useMemo(() => createMuscles(), []);

  useEffect(() => () => muscles.forEach((m) => m.geometry.dispose()), [muscles]);

  return (
    <>
      {muscles.map((m, i) => (
        <AnatomyMesh
          key={m.id}
          id={m.id}
          layer="muscular"
          drive={drive}
          geometry={m.geometry}
          color={TONES[i % TONES.length]}
          emissive="#ff4a3a"
          emissiveIntensity={0.045}
          roughness={0.48}
          clearcoat={0.45}
        />
      ))}
    </>
  );
}

export default function MuscleLayer() {
  const drive = useLayerDrive('muscular');
  return (
    <LayerSource file="muscles" drive={drive} glb={{ color: '#b5322c', emissive: '#ff4a3a', lensMask: true }}>
      <ProceduralMuscles drive={drive} />
    </LayerSource>
  );
}
