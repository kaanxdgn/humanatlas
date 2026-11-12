import { useEffect, useMemo } from 'react';
import type { BufferGeometry } from 'three';
import AnatomyMesh from './helpers/AnatomyMesh';
import LayerSource from './helpers/LayerSource';
import { createBones } from './helpers/createBone';
import { useLayerDrive, type LayerDrive } from './helpers/useAnatomyVisual';

const BONE = '#e8e2d0';
const VERTEBRA = '#ddd5bf';

function ProceduralSkeleton({ drive }: { drive: LayerDrive }) {
  const set = useMemo(() => createBones(), []);

  useEffect(
    () => () => {
      const all = new Set<BufferGeometry>();
      set.meshes.forEach((m) => all.add(m.geometry));
      set.instanced.forEach((m) => all.add(m.geometry)); // 3 omur grubu aynı geometriyi paylaşır
      all.forEach((g) => g.dispose());
    },
    [set],
  );

  return (
    <>
      {set.meshes.map((m) => (
        <AnatomyMesh
          key={m.id}
          id={m.id}
          layer="skeleton"
          drive={drive}
          geometry={m.geometry}
          color={BONE}
          emissive={BONE}
          emissiveIntensity={0.06}
          roughness={0.62}
          clearcoat={0.2}
        />
      ))}
      {set.instanced.map((m) => (
        <AnatomyMesh
          key={m.id}
          id={m.id}
          layer="skeleton"
          drive={drive}
          geometry={m.geometry}
          matrices={m.matrices}
          color={VERTEBRA}
          emissive={BONE}
          emissiveIntensity={0.06}
          roughness={0.65}
          clearcoat={0.15}
        />
      ))}
    </>
  );
}

export default function SkeletonLayer() {
  const drive = useLayerDrive('skeleton');
  return (
    <LayerSource file="skeleton" drive={drive} glb={{ color: BONE, emissive: BONE }}>
      <ProceduralSkeleton drive={drive} />
    </LayerSource>
  );
}
