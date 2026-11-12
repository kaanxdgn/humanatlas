import { useEffect, useLayoutEffect, useMemo, useRef, type Ref } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  Color,
  DoubleSide,
  FrontSide,
  MeshPhysicalMaterial,
  type BufferGeometry,
  type InstancedMesh,
  type Matrix4,
  type Mesh,
  type Object3D,
} from 'three';
import type { LayerKey, Vec3 } from '@/data/systemsConfig';
import { applyDissolve, createStdDissolveUniforms } from '../../shaders/dissolve';
import { useBodyShared } from './bodyContext';
import { createVisual, stepVisual, visualOpacity, type LayerDrive, type VisualState } from './useAnatomyVisual';

export interface AnatomyMeshProps {
  /** anatomyData.ts içindeki id → userData.anatomyId */
  id: string;
  layer: LayerKey;
  drive: LayerDrive;
  geometry: BufferGeometry;

  color?: string;
  emissive?: string;
  emissiveIntensity?: number;
  /** Taban opaklık (katman seviyesiyle çarpılır) */
  opacity?: number;
  roughness?: number;
  metalness?: number;
  clearcoat?: number;
  doubleSide?: boolean;

  position?: Vec3;
  rotation?: Vec3;
  scale?: number | Vec3;
  renderOrder?: number;

  /** Verilirse InstancedMesh çizilir (omurlar, kaburgalar). Tüm örnekler aynı id'ye aittir. */
  matrices?: readonly Matrix4[];

  /** Her karede çağrılır: kalp atışı, nefes gibi prosedürel animasyonlar için */
  onFrame?: (obj: Object3D, time: number, visual: VisualState) => void;
}

/**
 * Bir anatomik yapı için tek yapı taşı:
 *  - MeshPhysicalMaterial + tarama-dissolve + hover/seçim rim ışığı
 *  - userData.anatomyId / instanceIds (raycast eşlemesi)
 *  - opaklık, emissive ve soluklaşma her karede store'suz güncellenir
 */
export default function AnatomyMesh({
  id,
  layer: _layer,
  drive,
  geometry,
  color = '#d9d2c0',
  emissive = '#000000',
  emissiveIntensity = 0.05,
  opacity = 1,
  roughness = 0.55,
  metalness = 0.02,
  clearcoat = 0.25,
  doubleSide = false,
  position,
  rotation,
  scale,
  renderOrder,
  matrices,
  onFrame,
}: AnatomyMeshProps) {
  const shared = useBodyShared();
  const ref = useRef<Mesh>(null);
  const vis = useMemo(createVisual, []);
  const uniforms = useMemo(() => createStdDissolveUniforms(), []);

  const material = useMemo(() => {
    const m = new MeshPhysicalMaterial({
      color: new Color(color),
      emissive: new Color(emissive),
      emissiveIntensity,
      roughness,
      metalness,
      clearcoat,
      clearcoatRoughness: 0.45,
      transparent: true,
      side: doubleSide ? DoubleSide : FrontSide,
    });
    applyDissolve(m, uniforms);
    return m;
  }, [color, emissive, emissiveIntensity, roughness, metalness, clearcoat, doubleSide, uniforms]);

  useEffect(() => () => material.dispose(), [material]);

  const userData = useMemo(
    () => ({
      anatomyId: id,
      instanceIds: matrices ? Array.from({ length: matrices.length }, () => id) : undefined,
    }),
    [id, matrices],
  );

  /* Örnek matrisleri */
  useLayoutEffect(() => {
    const m = ref.current as unknown as InstancedMesh | null;
    if (!m || !matrices) return;
    matrices.forEach((mx, i) => m.setMatrixAt(i, mx));
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
    m.computeBoundingBox();
  }, [matrices]);

  useFrame(({ clock }, dt) => {
    const obj = ref.current;
    if (!obj) return;
    if (drive.opacity < 0.004) return; // gizli katman: iş yapma

    stepVisual(vis, id, shared, Math.min(dt, 0.05));

    obj.visible = vis.hide < 0.97;
    const op = visualOpacity(opacity, drive, vis);
    material.opacity = op;
    material.transparent = op < 0.995;
    material.depthWrite = op > 0.45;
    material.emissiveIntensity = emissiveIntensity + vis.hover * 0.22 + vis.sel * 0.1;

    uniforms.uDissLevel.value = drive.reveal;
    uniforms.uDissEdge.value.copy(drive.edge);
    uniforms.uRim.value = vis.hover * 0.45 + vis.sel * 0.2;

    onFrame?.(obj, clock.elapsedTime, vis);
  });

  if (matrices) {
    return (
      <instancedMesh
        ref={ref as unknown as Ref<InstancedMesh>}
        args={[geometry, material, matrices.length]}
        userData={userData}
        position={position}
        rotation={rotation}
        scale={scale}
        renderOrder={renderOrder}
        frustumCulled={false}
      />
    );
  }

  return (
    <mesh
      ref={ref}
      geometry={geometry}
      material={material}
      userData={userData}
      position={position}
      rotation={rotation}
      scale={scale}
      renderOrder={renderOrder}
    />
  );
}
